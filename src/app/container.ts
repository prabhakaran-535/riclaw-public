import { createRiclawAppShell } from "./createAppShell.js";

export async function createContainer() {
  const appShell = createRiclawAppShell();
  await appShell.start();

  return {
    dbClient: appShell.resolve("dbClient"),
    jobRepository: appShell.resolve("jobRepository"),
    authorizedUserRepository: appShell.resolve("authorizedUserRepository"),
    jobManager: appShell.resolve("jobManager"),
    jobQueue: appShell.resolve("jobQueue"),
    telegramClient: appShell.resolve("telegramClient"),
    jobRunner: appShell.resolve("jobRunner"),
    telegramBot: appShell.resolve("telegramBot"),
    accessControl: appShell.resolve("accessControl")
  };
}
