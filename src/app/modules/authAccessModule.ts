import { AccessControl } from "../../core/auth/accessControl.js";
import type { AppModuleDefinition } from "../../kernel/contracts.js";
import type { RiclawServices } from "../services.js";

export const authAccessModule: AppModuleDefinition<RiclawServices> = {
  id: "auth.access",
  name: "Access Control",
  dependencies: ["storage.sqlite"],
  register(container) {
    container.registerSingleton("accessControl", (runtime) => {
      return new AccessControl(runtime.resolve("authorizedUserRepository"), runtime.resolve("config"));
    });
    container.onStart((runtime) => {
      runtime.resolve("accessControl").ensureBootstrapOwner();
    });
  }
};
