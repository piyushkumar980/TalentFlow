// api/mock/mirage/server.js
import { createServer, Model, Factory, Response } from "miragejs";

export function startMirage() {
  if (typeof window === "undefined") return;    // ignore SSR
  if (window.__mirage_started) return;          // avoid double start
  window.__mirage_started = true;

  createServer({
    models: {
      job: Model,
      candidate: Model,
      assessment: Model,
    },

    factories: {
      job: Factory.extend({
        title(i) { return `Frontend Engineer ${i + 1}`; },
        role() { return "Frontend Engineer"; },
        company(i) { return ["Acme", "Globex", "Umbrella", "Soylent"][i % 4]; },
        slug(i) { return `frontend-${i + 1}`; },
        status(i) { return i % 5 === 0 ? "archived" : "active"; },
        tags() { return ["react", "vite"]; },
        order(i) { return i; },
        createdAt() { return Date.now() - Math.floor(Math.random() * 1e8); },
      }),

      candidate: Factory.extend({
        jobId() { return 1 + Math.floor(Math.random() * 25); },
        name(i) { return `Candidate ${i + 1}`; },
        email(i) { return `candidate${i + 1}@example.com`; },
        stage(i) {
          const stages = ["applied","screen","tech","offer","hired","rejected"];
          return stages[i % stages.length];
        },
        createdAt() { return Date.now() - Math.floor(Math.random() * 1e8); },
      }),
    },

    seeds(server) {
      if (server.schema.all("job").models.length === 0) server.createList("job", 25);
      if (server.schema.all("candidate").models.length === 0) server.createList("candidate", 1000);
      if (server.schema.all("assessment").models.length === 0) {
        server.create("assessment", {
          jobId: 1,
          sections: [{
            id: "sec-1",
            title: "Basics",
            questions: Array.from({ length: 10 }).map((_, i) => ({
              id: `q-${i+1}`,
              type: "single",
              label: `Sample question ${i+1}?`,
              options: ["A","B","C","D"],
              correctIndex: i % 4,
              required: true,
            })),
          }],
        });
      }
    },

    routes() {
      // Match your fetch URLs (you call "/jobs", "/candidates", etc.)
      this.namespace = "/";

      // Simulated latency & write failures
      this.timing = randomBetween(
        Number(import.meta.env.VITE_API_LATENCY_MIN ?? 200),
        Number(import.meta.env.VITE_API_LATENCY_MAX ?? 1200)
      );

      /* -------------------- JOBS -------------------- */
      this.get("/jobs", (schema, request) => {
        let items = schema.all("job").models.map(m => m.attrs);

        const search = (request.queryParams.search ?? "").toLowerCase();
        const status = request.queryParams.status;

        if (search) {
          items = items.filter(j =>
            (j.title||"").toLowerCase().includes(search) ||
            (j.company||"").toLowerCase().includes(search) ||
            (j.role||"").toLowerCase().includes(search)
          );
        }
        if (status) items = items.filter(j => j.status === status);

        items.sort((a,b) => (a.order ?? 0) - (b.order ?? 0));

        const page = Number(request.queryParams.page ?? 1);
        const pageSize = Number(request.queryParams.pageSize ?? 20);
        const total = items.length;
        const start = (page - 1) * pageSize;
        const paged = items.slice(start, start + pageSize);

        return { items: paged, page, pageSize, total };
      });

      this.post("/jobs", (schema, req) => {
        maybeFailWrite();
        const data = JSON.parse(req.requestBody || "{}");
        return schema.create("job", data).attrs;
      });

      this.patch("/jobs/:id", (schema, req) => {
        maybeFailWrite();
        const id = req.params.id;
        const data = JSON.parse(req.requestBody || "{}");
        const rec = schema.find("job", id);
        return rec ? rec.update(data).attrs : new Response(404);
      });

      this.patch("/jobs/:id/reorder", () => {
        maybeFailWrite(0.1);
        return { ok: true };
      });

      /* ----------------- CANDIDATES ----------------- */
      this.get("/candidates", (schema, request) => {
        let items = schema.all("candidate").models.map(m => m.attrs);

        const search = (request.queryParams.search ?? "").toLowerCase();
        const stage = request.queryParams.stage;

        if (search) {
          items = items.filter(c =>
            (c.name||"").toLowerCase().includes(search) ||
            (c.email||"").toLowerCase().includes(search)
          );
        }
        if (stage) items = items.filter(c => String(c.stage) === stage);

        items.sort((a,b) => (a.name||"").localeCompare(b.name||""));

        const page = Number(request.queryParams.page ?? 1);
        const pageSize = Number(request.queryParams.pageSize ?? 20);
        const total = items.length;
        const start = (page - 1) * pageSize;
        const paged = items.slice(start, start + pageSize);

        return { items: paged, page, pageSize, total };
      });

      this.get("/candidates/:id/timeline", () => {
        return {
          items: [
            { id: "t1", at: Date.now()-86400000, kind: "applied" },
            { id: "t2", at: Date.now()-3600000, kind: "profile-view" },
          ],
        };
      });

      /* ----------------- ASSESSMENTS ---------------- */
      this.get("/assessments/:jobId", (schema, req) => {
        const jobId = Number(req.params.jobId);
        const rec = schema.all("assessment").models.find(a => a.attrs.jobId === jobId);
        return rec ? rec.attrs : new Response(404, {}, { message: "Not found" });
      });

      this.put("/assessments/:jobId", (schema, req) => {
        maybeFailWrite();
        const jobId = Number(req.params.jobId);
        const body = JSON.parse(req.requestBody || "{}");
        const existing = schema.all("assessment").models.find(a => a.attrs.jobId === jobId);
        if (existing) return existing.update(body).attrs;
        return schema.create("assessment", body).attrs;
      });

      this.post("/assessments/:jobId/submit", () => ({ ok: true }));
    },
  });
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function maybeFailWrite(rate = Number(import.meta.env.VITE_API_WRITE_ERROR_RATE ?? 0.08)) {
  if (Math.random() < rate) throw new Response(500, {}, { error: "Simulated server error" });
}
