// src/api/client.js

/**
 * FETCHJSON
 * A TINY, PREDICTABLE WRAPPER AROUND FETCH THAT:
 * - ALWAYS SENDS/EXPECTS JSON WHEN A BODY IS PROVIDED
 * - ALWAYS RETURNS THE PARSED RESPONSE (JSON WHEN POSSIBLE, RAW TEXT OTHERWISE)
 * - THROWS AN ERROR FOR NON-2XX RESPONSES WITH STATUS AND BODY ATTACHED
 */
export async function fetchJSON(
  requestUrl,
  { method: httpMethod = "GET", headers: customRequestHeaders, body: requestPayload } = {}
) {
  // ENSURE JSON HEADERS WHEN SENDING A BODY
  const mergedHeaders = {
    "Content-Type": "application/json",
    ...(customRequestHeaders || {}),
  };

  // SERIALIZE BODY TO JSON WHEN PRESENT
  const serializedBody =
    requestPayload !== undefined ? JSON.stringify(requestPayload) : undefined;

  // PERFORM THE HTTP REQUEST
  const response = await fetch(requestUrl, {
    method: httpMethod,
    headers: mergedHeaders,
    body: serializedBody,
  });

  // READ RAW TEXT FIRST SO WE CAN SAFELY ATTEMPT JSON PARSE
  const rawResponseText = await response.text();

  // ATTEMPT TO PARSE JSON; FALL BACK TO RAW TEXT WHEN NOT JSON
  let parsedResponseData;
  try {
    parsedResponseData = rawResponseText ? JSON.parse(rawResponseText) : null;
  } catch {
    parsedResponseData = rawResponseText;
  }

  // SURFACE NON-OK RESPONSES AS RICH ERRORS
  if (!response.ok) {
    // USE SERVER-PROVIDED MESSAGE WHEN AVAILABLE; OTHERWISE SHOW STATUS CODE
    const errorMessage =
      (parsedResponseData && parsedResponseData.message) ||
      `HTTP ${response.status}`;

    const httpError = new Error(errorMessage);
    // ATTACH USEFUL CONTEXT FOR CALLERS (STATUS + BODY)
    httpError.status = response.status;
    httpError.data = parsedResponseData;
    throw httpError;
  }

  // RETURN PARSED DATA (JSON WHEN POSSIBLE, OTHERWISE PLAIN TEXT/NULL)
  return parsedResponseData;
}
