// src/api/services/assessments.js
import { db as localDatabase } from "../../lib/db.js";
import { fetchJSON as fetchJsonOrThrow } from "../client.js";

/* GET AN ASSESSMENT DOCUMENT FOR A GIVEN JOB
   - FIRST, ATTEMPT A NETWORK FETCH
   - IF NETWORK FAILS, RETURN A LOCALLY-CACHED COPY (OR AN EMPTY SHELL)*/
export async function getAssessment(jobId) {
  const numericJobId = Number(jobId);

  try {
    // TRY SERVER FIRST FOR FRESHEST DATA
    return await fetchJsonOrThrow(`/assessments/${numericJobId}`);
  } catch (_networkError) {
    // ON FAILURE, FALL BACK TO LOCAL PERSISTENCE
    const existingLocalDoc =
      (await localDatabase.assessments.get(numericJobId)) || {
        jobId: numericJobId,
        sections: [],
      };
    return existingLocalDoc;
  }
}

/*SAVE (UPSERT) AN ASSESSMENT DOCUMENT
   - PREFER SERVER PERSISTENCE
   - IF OFFLINE/FAILED, CACHE TO LOCAL DB AND RETURN THAT VALUE*/
export async function saveAssessment(jobId, assessmentDocument) {
  const numericJobId = Number(jobId);

  try {
    // WRITE THROUGH TO THE API (SOURCE OF TRUTH WHEN ONLINE)
    return await fetchJsonOrThrow(`/assessments/${numericJobId}`, {
      method: "PUT",
      body: assessmentDocument,
    });
  } catch (_networkError) {
    // OFFLINE FALLBACK: UPSERT INTO LOCAL DB
    const locallyPersistedRecord = {
      jobId: numericJobId,
      ...(assessmentDocument || {}),
    };
    await localDatabase.assessments.put(locallyPersistedRecord);
    return locallyPersistedRecord;
  }
}

/*SUBMIT A COMPLETED ASSESSMENT
   - POST SUBMISSION TO THE SERVER
   - IF THE REQUEST FAILS, RECORD A LOCAL SUBMISSION ROW AND ACK */
export async function submitAssessment(jobId, { candidateId, data }) {
  const numericJobId = Number(jobId);
  const numericCandidateId =
    candidateId === undefined ? undefined : Number(candidateId);

  try {
    // PREFERRED PATH: SEND SUBMISSION TO SERVER
    return await fetchJsonOrThrow(`/assessments/${numericJobId}/submit`, {
      method: "POST",
      body: { candidateId: numericCandidateId, data },
    });
  } catch (_networkError) {
    // OFFLINE/ERROR PATH: CAPTURE A LOCAL SUBMISSION WITH TIMESTAMP
    const localSubmissionRecord = {
      jobId: numericJobId,
      candidateId: numericCandidateId,
      submittedAt: Date.now(),
      data,
    };
    const localId = await localDatabase.submissions.add(localSubmissionRecord);
    return { id: localId, ok: true };
  }
}
