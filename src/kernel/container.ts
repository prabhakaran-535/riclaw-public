import type { AppContainer, ServiceFactory, ServiceMap, ShutdownTask, StartupTask } from "./contracts.js";
import {
  CircularServiceDependencyError,
  ServiceRegistrationError,
  ServiceResolutionError
} from "./errors.js";

export class RuntimeContainer<Services extends ServiceMap> implements AppContainer<Services> {
  private readonly instances = new Map<keyof Services, Services[keyof Services]>();
  private readonly factories = new Map<keyof Services, ServiceFactory<Services, Services[keyof Services]>>();
  private readonly startupTasks: Array<StartupTask<Services>> = [];
  private readonly shutdownTasks: Array<ShutdownTask<Services>> = [];
  private readonly resolving = new Set<keyof Services>();

  registerValue<Key extends keyof Services>(key: Key, value: Services[Key]): void {
    if (this.has(key)) {
      throw new ServiceRegistrationError(String(key));
    }

    this.instances.set(key, value);
  }

  registerSingleton<Key extends keyof Services>(
    key: Key,
    factory: ServiceFactory<Services, Services[Key]>
  ): void {
    if (this.has(key)) {
      throw new ServiceRegistrationError(String(key));
    }

    this.factories.set(key, factory as ServiceFactory<Services, Services[keyof Services]>);
  }

  resolve<Key extends keyof Services>(key: Key): Services[Key] {
    const existing = this.instances.get(key);
    if (existing !== undefined) {
      return existing as Services[Key];
    }

    const factory = this.factories.get(key);
    if (!factory) {
      throw new ServiceResolutionError(String(key));
    }

    if (this.resolving.has(key)) {
      throw new CircularServiceDependencyError(String(key));
    }

    this.resolving.add(key);
    try {
      const instance = factory(this);
      this.instances.set(key, instance);
      this.factories.delete(key);
      return instance as Services[Key];
    } finally {
      this.resolving.delete(key);
    }
  }

  has<Key extends keyof Services>(key: Key): boolean {
    return this.instances.has(key) || this.factories.has(key);
  }

  onStart(task: StartupTask<Services>): void {
    this.startupTasks.push(task);
  }

  onStop(task: ShutdownTask<Services>): void {
    this.shutdownTasks.push(task);
  }

  async start(): Promise<void> {
    for (const task of this.startupTasks) {
      await task(this);
    }
  }

  async stop(): Promise<void> {
    for (const task of [...this.shutdownTasks].reverse()) {
      await task(this);
    }
  }
}
