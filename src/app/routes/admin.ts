import { Router } from "express";
import type { JobManager } from "../../core/jobs/jobManager.js";

export function createAdminRouter(jobManager: JobManager): Router {
  const router = Router();

  router.get("/jobs", (_req, res) => {
    res.json(jobManager.listJobs());
  });

  router.get("/jobs/:jobId", (req, res) => {
    try {
      res.json({
        job: jobManager.getJob(req.params.jobId),
        events: jobManager.getEvents(req.params.jobId)
      });
    } catch (error) {
      res.status(404).json({
        error: error instanceof Error ? error.message : "Job not found."
      });
    }
  });

  return router;
}
