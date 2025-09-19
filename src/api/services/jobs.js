// src/api/services/jobs.js
import { db as localDatabase } from "../../lib/db.js";
import { fetchJSON as fetchJsonOrThrow } from "../client.js";

/*TINY UTILITIES (PURE, SIDE-EFFECT FREE)
   - BUILD CLEAN QUERY STRINGS
   - PERFORM SIMPLE CLIENT-SIDE PAGINATION
   - MIRROR SERVER SLUG NORMALIZATION */

/** BUILD A QUERYSTRING FROM ONLY TRUTHY / MEANINGFUL PARAMS */
const buildQueryStringFromParams = (params = {}) =>
  new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== "" && value !== undefined && value !== null
      )
    )
  ).toString();

/** RETURN A SHALLOW PAGINATION ENVELOPE OVER AN ARRAY */
const applyClientSidePagination = (rows, page = 1, pageSize = 12) => {
  const startIndex = (page - 1) * pageSize;
  return {
    items: rows.slice(startIndex, startIndex + pageSize),
    total: rows.length,
    page,
    pageSize,
  };
};

/** NORMALIZE SLUGS EXACTLY LIKE THE BACKEND DOES (LOWERCASE + DASHES) */
const generateSlugLikeServer = (input = "") =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^[-]+|[-]+$/g, "");

/*READ: LIST JOBS
   - TRY NETWORK FIRST (MSW IN DEV)
   - FALL BACK TO LOCAL DEXIE WITH EQUIVALENT FILTERS/SORT */
export async function listJobs({
  search = "",
  status = "",
  page = 1,
  pageSize = 12,
  sort = "order",
} = {}) {
  try {
    // SERVER-FIRST: RETURNS PAGINATED, FILTERED RESULTS
    const qs = buildQueryStringFromParams({ search, status, page, pageSize, sort });
    return await fetchJsonOrThrow(`/jobs?${qs}`);
  } catch {
    // OFFLINE/ERROR FALLBACK: EMULATE SERVER FILTERING/SORTING LOCALLY
    let allJobs = await localDatabase.jobs.toArray();

    const needle = search.trim().toLowerCase();
    if (needle) {
      allJobs = allJobs.filter(
        (j) =>
          (j.title || "").toLowerCase().includes(needle) ||
          (j.slug || "").toLowerCase().includes(needle) ||
          (j.company || "").toLowerCase().includes(needle) ||
          (j.role || "").toLowerCase().includes(needle)
      );
    }

    if (status) {
      allJobs = allJobs.filter((j) => j.status === status);
    }

    // STABLE SORT RULES MIRROR THE API
    if (sort === "title") {
      allJobs.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (sort === "status") {
      allJobs.sort((a, b) => (a.status || "").localeCompare(b.status || ""));
    } else {
      allJobs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    return applyClientSidePagination(allJobs, page, pageSize);
  }
}

/* CREATE: NEW JOB
   - ATTEMPT SERVER WRITE
   - LOCAL FALLBACK APPENDS TO THE END (ORDER = COUNT) */
export async function createJob({ title, slug, status = "active", tags = [] } = {}) {
  try {
    // API WRITE WITH BODY PASSTHROUGH
    return await fetchJsonOrThrow("/jobs", {
      method: "POST",
      body: { title, slug, status, tags },
    });
  } catch {
    // LOCAL FALLBACK: ASSIGN ORDER AS CURRENT COUNT; DERIVE A REASONABLE SLUG
    const nextOrder = await localDatabase.jobs.count();
    const effectiveTitle = title || "Untitled";
    const effectiveSlug = generateSlugLikeServer(slug || effectiveTitle || `job-${Date.now()}`);

    const jobRecord = {
      title: effectiveTitle,
      slug: effectiveSlug,
      status,
      tags,
      order: nextOrder,
    };

    const id = await localDatabase.jobs.add(jobRecord);
    return { id, ...jobRecord };
  }
}

/* UPDATE: PATCH EXISTING JOB
   - PREFER SERVER MUTATION
   - FALL BACK TO LOCAL UPDATE AND RETURN FRESH ROW*/
export async function patchJob(id, partialBody) {
  try {
    return await fetchJsonOrThrow(`/jobs/${id}`, { method: "PATCH", body: partialBody });
  } catch {
    await localDatabase.jobs.update(id, partialBody);
    const updated = await localDatabase.jobs.get(id);
    if (!updated) throw new Error("Job not found");
    return updated;
  }
}

/* REORDER: MOVE A JOB BETWEEN POSITIONS
   - ATTEMPT BACKEND REORDER
   - LOCAL FALLBACK REBUILDS THE ORDER INDICES */
export async function reorderJob(id, { fromOrder, toOrder }) {
  try {
    return await fetchJsonOrThrow(`/jobs/${id}/reorder`, {
      method: "PATCH",
      body: { fromOrder, toOrder },
    });
  } catch {
    // LOCAL REORDER: REARRANGE BY CURRENT 'order' FIELD, THEN REWRITE SEQUENCE
    const ordered = await localDatabase.jobs.orderBy("order").toArray();

    const sourceIndex = ordered.findIndex((j) => j.order === fromOrder);
    const targetIndex = ordered.findIndex((j) => j.order === toOrder);
    if (sourceIndex < 0 || targetIndex < 0) return { ok: false };

    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);

    await Promise.all(ordered.map((job, idx) => localDatabase.jobs.update(job.id, { order: idx })));

    return { ok: true };
  }
}
