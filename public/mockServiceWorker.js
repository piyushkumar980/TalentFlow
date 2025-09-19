/**
 * mock serveice worker
 * @see https://github.com/mswjs/msw
 * - no need to modify this file
 */

const PACKAGE_VERSION = "2.11.2";
const INTEGRITY_CHECKSUM = "4db4a41e972cec1b64cc569c66952d82";
const IS_MOCKED_RESPONSE = Symbol("isMockedResponse");
const activeClientIds = new Set();

addEventListener("install", function () {
  self.skipWaiting();
});

addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

addEventListener("message", async function (event) {
  const clientId = Reflect.get(event.source || {}, "id");

  if (!clientId || !self.clients) {
    return;
  }

  const client = await self.clients.get(clientId);

  if (!client) {
    return;
  }

  const allClients = await self.clients.matchAll({
    type: "window",
  });

  switch (event.data) {
    case "KEEPALIVE_REQUEST": {
      sendToClient(client, {
        type: "KEEPALIVE_RESPONSE",
      });
      break;
    }

    case "INTEGRITY_CHECK_REQUEST": {
      sendToClient(client, {
        type: "INTEGRITY_CHECK_RESPONSE",
        payload: {
          packageVersion: PACKAGE_VERSION,
          checksum: INTEGRITY_CHECKSUM,
        },
      });
      break;
    }

    case "MOCK_ACTIVATE": {
      activeClientIds.add(clientId);

      sendToClient(client, {
        type: "MOCKING_ENABLED",
        payload: {
          client: {
            id: client.id,
            frameType: client.frameType,
          },
        },
      });
      break;
    }

    case "CLIENT_CLOSED": {
      activeClientIds.delete(clientId);

      const remainingClients = allClients.filter((client) => {
        return client.id !== clientId;
      });

      // if no more clients will be there it will unregister itself
      if (remainingClients.length === 0) {
        self.registration.unregister();
      }

      break;
    }
  }
});

addEventListener("fetch", function (event) {
  const requestInterceptedAt = Date.now();

  // Bypass navigation requests.
  if (event.request.mode === "navigate") {
    return;
  }

  // WHEN DEVTOOLS IS OPEN, IT SOMETIMES SENDS A SPECIAL "ONLY-IF-CACHED" REQUEST
  // THAT OUR SERVICE WORKER CAN'T PROCESS. LET'S SKIP THESE REQUESTS ENTIRELY.
  if (
    event.request.cache === "only-if-cached" &&
    event.request.mode !== "same-origin"
  ) {
    return;
  }

  // IF THERE ARE NO ACTIVE PAGES USING THIS WORKER, IGNORE ALL REQUESTS.
  // THIS IS A SAFETY CHECK. THE WORKER MIGHT STILL BE TECHNICALLY RUNNING
  // AFTER IT'S BEEN UNREGISTERED, AND WE DON'T WANT IT TO TRY TO HANDLE
  // REQUESTS WHEN IT'S SUPPOSED TO BE SHUTTING DOWN.
  if (activeClientIds.size === 0) {
    return;
  }

  const requestId = crypto.randomUUID();
  event.respondWith(handleRequest(event, requestId, requestInterceptedAt));
});

/**
 * @param {FetchEvent} event
 * @param {string} requestId
 * @param {number} requestInterceptedAt
 */
async function handleRequest(event, requestId, requestInterceptedAt) {
  const client = await resolveMainClient(event);
  const requestCloneForEvents = event.request.clone();
  const response = await getResponse(
    event,
    client,
    requestId,
    requestInterceptedAt
  );

  // SEND BACK A COPY OF THE RESPONSE FOR ANY "RESPONSE:*" EVENTS.
  // BUT FIRST, WE MUST DOUBLE-CHECK THAT MSW IS ACTIVE AND READY TO RECEIVE IT.
  // IF IT'S NOT READY, THIS MESSAGE WILL GET STUCK FOREVER, WAITING FOR A REPLY THAT NEVER COMES.
  if (client && activeClientIds.has(client.id)) {
    const serializedRequest = await serializeRequest(requestCloneForEvents);

    // MAKE A COPY OF THE RESPONSE SO THAT BOTH THE CLIENT AND OUR LIBRARY CAN USE IT INDEPENDENTLY.
    const responseClone = response.clone();

    sendToClient(
      client,
      {
        type: "RESPONSE",
        payload: {
          isMockedResponse: IS_MOCKED_RESPONSE in response,
          request: {
            id: requestId,
            ...serializedRequest,
          },
          response: {
            type: responseClone.type,
            status: responseClone.status,
            statusText: responseClone.statusText,
            headers: Object.fromEntries(responseClone.headers.entries()),
            body: responseClone.body,
          },
        },
      },
      responseClone.body ? [serializedRequest.body, responseClone.body] : []
    );
  }

  return response;
}

/**
 * // FIND THE RIGHT CLIENT TO TALK TO FOR THIS EVENT.
// REMEMBER: THE CLIENT THAT MADE THE REQUEST AND THE CLIENT THAT
// REGISTERED THE WORKER MIGHT BE DIFFERENT. WE NEED TO COMMUNICATE
// BACK TO THE ONE THAT REGISTERED THE WORKER TO RESOLVE THE RESPONSE.
 * @param {FetchEvent} event
 * @returns {Promise<Client | undefined>}
 */
async function resolveMainClient(event) {
  const client = await self.clients.get(event.clientId);

  if (activeClientIds.has(event.clientId)) {
    return client;
  }

  if (client?.frameType === "top-level") {
    return client;
  }

  const allClients = await self.clients.matchAll({
    type: "window",
  });

  return allClients
    .filter((client) => {
      // ONLY GRAB THE CLIENTS THAT ARE VISIBLE TO THE USER RIGHT NOW.
      return client.visibilityState === "visible";
    })
    .find((client) => {
      // LOOK THROUGH THE LIST OF CLIENTS THAT HAVE REGISTERED THIS WORKER,
      // AND FIND THE ONE THAT MATCHES THIS CLIENT ID.
      return activeClientIds.has(client.id);
    });
}

/**
 * @param {FetchEvent} event
 * @param {Client | undefined} client
 * @param {string} requestId
 * @returns {Promise<Response>}
 */
async function getResponse(event, client, requestId, requestInterceptedAt) {
  // MAKE A COPY OF THE REQUEST BEFORE WE USE IT.
  // THE ORIGINAL REQUEST'S BODY MIGHT HAVE ALREADY BEEN READ AND SENT OFF,
  // LEAVING IT UNUSABLE. THE COPY ENSURES WE HAVE A FRESH ONE TO WORK WITH.
  const requestClone = event.request.clone();

  function passthrough() {
    // CONVERT THE REQUEST HEADERS INTO A NEW, MUTABLE HEADERS OBJECT.
    // THIS LETS US SAFELY ADD, REMOVE, OR MODIFY HEADERS WITHOUT AFFECTING THE ORIGINAL REQUEST.
    const headers = new Headers(requestClone.headers);

    // REMOVE THE SPECIAL "ACCEPT" HEADER THAT FLAGGED THIS REQUEST FOR PASSTHROUGH.
    // THIS PREVENTS ANY FURTHER MEDDLING WITH THE REQUEST AND ENSURES IT COMPLIES
    // WITH THE USER'S OWN CORS SETTINGS.
    const acceptHeader = headers.get("accept");
    if (acceptHeader) {
      const values = acceptHeader.split(",").map((value) => value.trim());
      const filteredValues = values.filter(
        (value) => value !== "msw/passthrough"
      );

      if (filteredValues.length > 0) {
        headers.set("accept", filteredValues.join(", "));
      } else {
        headers.delete("accept");
      }
    }

    return fetch(requestClone, { headers });
  }

  // IF THE CLIENT ISN'T ACTIVE, DON'T BOTHER WITH ANY MOCKING LOGIC.
  if (!client) {
    return passthrough();
  }

  // SKIP MOCKING FOR THE INITIAL PAGE LOAD (LIKE HTML, CSS, JAVASCRIPT FILES).
  // IF WE DON'T SEE THE MAIN CLIENT IN OUR LIST OF ACTIVE CLIENTS, IT MEANS
  // MSW ISN'T FULLY AWAKE YET AND CAN'T PROCESS REQUESTS. LET THESE REQUESTS
  // GO THROUGH NORMALLY UNTIL EVERYTHING IS READY.
  if (!activeClientIds.has(client.id)) {
    return passthrough();
  }

  // SEND A MESSAGE TO THE CLIENT TO LET IT KNOW WE'VE INTERCEPTED A REQUEST.
  const serializedRequest = await serializeRequest(event.request);
  const clientMessage = await sendToClient(
    client,
    {
      type: "REQUEST",
      payload: {
        id: requestId,
        interceptedAt: requestInterceptedAt,
        ...serializedRequest,
      },
    },
    [serializedRequest.body]
  );

  switch (clientMessage.type) {
    case "MOCK_RESPONSE": {
      return respondWithMock(clientMessage.data);
    }

    case "PASSTHROUGH": {
      return passthrough();
    }
  }

  return passthrough();
}

/**
 * @param {Client} client
 * @param {any} message
 * @param {Array<Transferable>} transferrables
 * @returns {Promise<any>}
 */
function sendToClient(client, message, transferrables = []) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();

    channel.port1.onmessage = (event) => {
      if (event.data && event.data.error) {
        return reject(event.data.error);
      }

      resolve(event.data);
    };

    client.postMessage(message, [
      channel.port2,
      ...transferrables.filter(Boolean),
    ]);
  });
}

/**
 * @param {Response} response
 * @returns {Response}
 */
function respondWithMock(response) {
  // SETTING THE STATUS CODE TO 0 BASICALLY DOES NOTHING.
  // BUT NOTE: USING `Response.error()` CREATES A RESPONSE WITH THAT USELESS 0 STATUS.
  // SINCE YOU CAN'T DELIBERATELY CREATE A RESPONSE WITH STATUS 0,
  // WE HAVE TO HANDLE THIS SPECIAL CASE ON ITS OWN.
  if (response.status === 0) {
    return Response.error();
  }

  const mockedResponse = new Response(response.body, response);

  Reflect.defineProperty(mockedResponse, IS_MOCKED_RESPONSE, {
    value: true,
    enumerable: true,
  });

  return mockedResponse;
}

/**
 * @param {Request} request
 */
async function serializeRequest(request) {
  return {
    url: request.url,
    mode: request.mode,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    cache: request.cache,
    credentials: request.credentials,
    destination: request.destination,
    integrity: request.integrity,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    body: await request.arrayBuffer(),
    keepalive: request.keepalive,
  };
}
