import { createRiclawAppShell } from "./createAppShell.js";
import { logger } from "../shared/logger.js";

async function main(): Promise<void> {
  const appShell = createRiclawAppShell();
  await appShell.start();

  const config = appShell.resolve("config");
  const app = appShell.resolve("httpApp");

  app.listen(config.PORT, () => {
    logger.info(`RIClaw server listening on port ${config.PORT}`);
  });
}

void main().catch((error) => {
  logger.error("RIClaw server failed to start.", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});
