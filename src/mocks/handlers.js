// msw handlers (humanized rewrite with descriptive names)
// NOTE: THE EXPORT NAME REMAINS `handlers`

import { rest } from 'msw';
import { db } from '../lib/db'; // DEXIE PERSISTENCE LAYER

/* THESE MOCK SERVICE WORKER HANDLERS INTERCEPT NETWORK CALLS DURING DEVELOPMENT
 * AND RETURN PREDICTABLE RESPONSES. THEY DO NOT RUN IN PRODUCTION. */

export const handlers = [
  /* GET /jobs
   * RETURNS A LIST OF JOBS. IN A REAL APP YOU’D SUPPORT SEARCH, FILTERS,
   * SORTING, AND PAGINATION. HERE WE KEEP IT SIMPLE BUT PRESERVE THE SHAPE. */
  rest.get('/jobs', async (_req, res, ctx) => {
    // READ ALL JOBS FROM THE LOCAL DEXIE DB
    const allJobRecords = await db.jobs.toArray();

    // PLACEHOLDER FOR WHERE PAGINATION/FILTERS/SORT WOULD BE APPLIED
    // (WE RETURN THE FULL COLLECTION FOR NOW TO KEEP BEHAVIOR IDENTICAL)
    const paginatedJobRecords = allJobRecords;

    // RESPOND WITH 200 OK AND A CONSISTENT JSON ENVELOPE
    return res(
      ctx.status(200),
      ctx.json({ data: paginatedJobRecords, total: allJobRecords.length })
    );
  }),

  /* POST /jobs
   * CREATES A NEW JOB RECORD. THIS MOCK ENDPOINT ASSIGNS A CLIENT-SIDE ID,
   * MARKS THE JOB ACTIVE BY DEFAULT, AND SIMULATES NETWORK LATENCY. */
  rest.post('/jobs', async (req, res, ctx) => {
    // PARSE INCOMING BODY (ASSUMED JSON)
    const incomingJobPayload = await req.json();

    // BUILD A NEW JOB OBJECT WITH DEFAULTS AND A TIMESTAMP-BASED ID
    const newlyCreatedJobRecord = {
      ...incomingJobPayload,
      id: Date.now(), // NOT FOR PRODUCTION; JUST STABLE ENOUGH FOR A MOCK
      status: 'active',
      order: 0,
    };

    // WRITE THE NEW RECORD INTO DEXIE
    await db.jobs.add(newlyCreatedJobRecord);

    // SIMULATE VARIABLE NETWORK DELAY (200–1200MS) TO MIMIC REAL CONDITIONS
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 1000 + 200)
    );

    // RESPOND WITH 201 CREATED AND THE PERSISTED RECORD
    return res(ctx.status(201), ctx.json(newlyCreatedJobRecord));
  }),

];
