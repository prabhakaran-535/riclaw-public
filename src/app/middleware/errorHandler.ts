import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import { logger } from "../../shared/logger.js";

export function errorHandler(error: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error(error.message, { stack: error.stack });
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  res.status(statusCode).json({ error: error.message });
}
