import type { AppModuleDefinition, ServiceMap } from "./contracts.js";
import { RuntimeContainer } from "./container.js";
import { ModuleRegistry } from "./moduleRegistry.js";

type AppShellOptions<Services extends ServiceMap> = {
  modules: ReadonlyArray<AppModuleDefinition<Services>>;
  configure?(container: RuntimeContainer<Services>): void;
};

export class AppShell<Services extends ServiceMap> {
  private readonly container = new RuntimeContainer<Services>();
  private readonly registry: ModuleRegistry<Services>;
  private readonly modules: AppModuleDefinition<Services>[];
  private started = false;

  constructor(options: AppShellOptions<Services>) {
    options.configure?.(this.container);
    this.registry = new ModuleRegistry(options.modules);
    this.modules = [...options.modules];
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    this.registry.registerAll(this.container);
    await this.container.start();
    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    await this.container.stop();
    this.started = false;
  }

  resolve<Key extends keyof Services>(key: Key): Services[Key] {
    return this.container.resolve(key);
  }

  listModules(): string[] {
    return this.modules.map((module) => module.id);
  }
}
