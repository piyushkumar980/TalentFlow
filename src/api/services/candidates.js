// src/api/services/candidates.js
import { db as localDb, rid as randomIdFragment } from "../../lib/db.js";
import { fetchJSON as fetchJsonOrThrow } from "../client.js";

/* DOMAIN CONSTANTS AND SMALL HELPERS
   - NORMALIZE/VALIDATE INPUTS
   - LEAVE BUSINESS LOGIC UNCHANGED*/
const CANONICAL_STAGES = ["applied", "screen", "tech", "offer", "hired", "rejected"];

const normalizeStageValue = (maybeStage) => {
  const lowered = String(maybeStage ?? "").toLowerCase();
  return CANONICAL_STAGES.includes(lowered) ? lowered : "applied";
};

const buildQueryString = (params = {}) => {
  // STRIP OUT EMPTY/UNDEFINED/NULL VALUES TO AVOID NOISY QUERIES
  const cleanPairs = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  return new URLSearchParams(Object.fromEntries(cleanPairs)).toString();
};

const paginateArray = (rows, page = 1, pageSize = 50) => {
  // RETURN A SIMPLE PAGINATION ENVELOPE FOR LOCAL-FALLBACK SCENARIOS
  const startIndex = (page - 1) * pageSize;
  return {
    items: rows.slice(startIndex, startIndex + pageSize),
    total: rows.length,
    page,
    pageSize,
  };
};

/*SHAPE/DEFAULT A CANDIDATE OBJECT
   - GENERATE MISSING FIELDS
   - COERCE TYPES
   - KEEP BEHAVIOR EQUIVALENT*/
function coerceCandidateLikePayload(raw = {}) {
  const normalizedStage = normalizeStageValue(raw.stage);

  const normalizedSkills = Array.isArray(raw.skills)
    ? raw.skills.map(String)
    : String(raw.skills || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  return {
    name: (raw.name || "New Candidate").trim(),
    email: (raw.email || `user-${randomIdFragment()}@mail.com`).trim().toLowerCase(),
    stage: normalizedStage,
    jobId: Number.isFinite(Number(raw.jobId)) ? Number(raw.jobId) : undefined,
    phone:
      raw.phone ||
      `(${100 + Math.floor(Math.random() * 800)}) ${100 + Math.floor(Math.random() * 900)}-${
        1000 + Math.floor(Math.random() * 9000)
      }`,
    location: raw.location || "Remote",
    position: raw.position || "Applicant",
    experience: raw.experience || `${1 + Math.floor(Math.random() * 9)} years`,
    skills: normalizedSkills.length ? normalizedSkills : ["Communication", "Teamwork"],
    education: raw.education || "BS (any)",
    status: raw.status || "New",
    lastContact: raw.lastContact || "Today",
    notes: raw.notes || "—",
  };
}

/* READ: LIST CANDIDATES
   - TRY NETWORK API (MSW-BACKED) FIRST
   - FALL BACK TO LOCAL DEXIE RESULTS WITH EQUIVALENT FILTERING/SORTING*/
export async function listCandidates({
  search = "",
  stage = "",
  page = 1,
  pageSize = 50,
} = {}) {
  try {
    // SERVER-FIRST FOR CONSISTENT, AUTHORITATIVE RESULTS
    const query = buildQueryString({
      search,
      stage: stage ? normalizeStageValue(stage) : "",
      page,
      pageSize,
    });
    return await fetchJsonOrThrow(`/candidates?${query}`);
  } catch {
    // LOCAL-FALLBACK: APPLY SAME FILTERING/ORDERING, THEN PAGE
    let rows = await localDb.candidates.toArray();

    const needle = search.trim().toLowerCase();
    if (needle) {
      rows = rows.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(needle) ||
          (c.email || "").toLowerCase().includes(needle)
      );
    }

    if (stage) {
      const desired = normalizeStageValue(stage);
      rows = rows.filter((c) => String(c.stage).toLowerCase() === desired);
    }

    rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return paginateArray(rows, page, pageSize);
  }
}

/*  READ: SINGLE CANDIDATE BY ID
   - VALIDATE ID
   - API-FIRST, THEN LOCAL FALLBACK*/
export async function getCandidate(id) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) throw new Error("Invalid candidate id");

  try {
    return await fetchJsonOrThrow(`/candidates/${numericId}`);
  } catch {
    const localDoc = await localDb.candidates.get(numericId);
    if (!localDoc) throw new Error(`Candidate ${numericId} not found`);
    return localDoc;
  }
}

/* READ: LOCAL-ONLY GETTER (BACKWARDS COMPAT)
   - STRICTLY USES DEXIE */
export async function getCandidateLocal(id) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) throw new Error("Invalid candidate id");

  const localDoc = await localDb.candidates.get(numericId);
  if (!localDoc) throw new Error(`Candidate ${numericId} not found`);
  return localDoc;
}

/*READ: CANDIDATE TIMELINE
   - API-FIRST FOR CONSISTENT ORDERING
   - LOCAL FALLBACK WITH ASCENDING SORT BY TIMESTAMP*/
export async function getTimeline(candidateId) {
  const numericId = Number(candidateId);
  if (!Number.isFinite(numericId)) throw new Error("Invalid candidate id");

  try {
    return await fetchJsonOrThrow(`/candidates/${numericId}/timeline`);
  } catch {
    const items = await localDb.timelines.where("candidateId").equals(numericId).toArray();
    items.sort((a, b) => a.ts - b.ts);
    return { candidateId: numericId, items };
  }
}

/* CREATE: NEW CANDIDATE
   - PREFER SERVER WRITE
   - IF OFFLINE, UPSERT LOCALLY AND SEED A MINIMAL TIMELINE ENTRY */
export async function createCandidate(payload) {
  try {
    return await fetchJsonOrThrow("/candidates", {
      method: "POST",
      body: payload,
    });
  } catch {
    const candidateDoc = coerceCandidateLikePayload(payload);

    // IF NO JOB ID PROVIDED, SELECT A RANDOM EXISTING JOB ID (IF ANY)
    if (!Number.isFinite(candidateDoc.jobId)) {
      const knownJobIds = await localDb.jobs.toCollection().primaryKeys();
      if (knownJobIds.length) {
        candidateDoc.jobId = knownJobIds[Math.floor(Math.random() * knownJobIds.length)];
      }
    }

    const newId = await localDb.candidates.add(candidateDoc);

    // APPEND AN INITIAL TIMELINE ENTRY TO REFLECT CURRENT STAGE
    await localDb.timelines.add({
      candidateId: newId,
      stage: candidateDoc.stage,
      ts: Date.now(),
      by: "System",
      note: `Stage set to ${candidateDoc.stage}`,
    });

    return { id: newId, ...candidateDoc };
  }
}

/* UPDATE: PATCH AN EXISTING CANDIDATE
   - API-FIRST
   - IF LOCAL, ALSO RECORD STAGE TRANSITIONS INTO THE TIMELINE */
export async function patchCandidate(id, patchBody) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) throw new Error("Invalid candidate id");

  try {
    return await fetchJsonOrThrow(`/candidates/${numericId}`, {
      method: "PATCH",
      body: patchBody,
    });
  } catch {
    const existing = await localDb.candidates.get(numericId);
    if (!existing) throw new Error(`Candidate ${numericId} not found`);

    const mutablePatch = { ...patchBody };

    // IF STAGE CHANGES LOCALLY, APPEND A TIMELINE ENTRY
    if (mutablePatch.stage) {
      const nextStage = normalizeStageValue(mutablePatch.stage);
      const previousStage = normalizeStageValue(existing.stage);

      if (nextStage !== previousStage) {
        await localDb.timelines.add({
          candidateId: numericId,
          stage: nextStage,
          ts: Date.now(),
          by: patchBody?.by || "System",
          note: patchBody?.note || `Stage set to ${nextStage}`,
        });
        mutablePatch.stage = nextStage;
      } else {
        // NO-OP—DON'T WRITE UNCHANGED STAGE FIELDS
        delete mutablePatch.stage;
      }
    }

    await localDb.candidates.update(numericId, mutablePatch);
    const updatedAfterWrite = await localDb.candidates.get(numericId);
    if (!updatedAfterWrite)
      throw new Error(`Candidate ${numericId} not found after update`);
    return updatedAfterWrite;
  }
}
