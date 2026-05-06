export type ServiceMap = Record<string, unknown>;

export type StartupTask<Services extends ServiceMap> = (container: AppContainer<Services>) => void | Promise<void>;
export type ShutdownTask<Services extends ServiceMap> = (container: AppContainer<Services>) => void | Promise<void>;
export type ServiceFactory<Services extends ServiceMap, Value> = (container: AppContainer<Services>) => Value;
export type ModuleEnabledPredicate<Services extends ServiceMap> =
  | boolean
  | ((container: AppContainer<Services>) => boolean);

export interface AppContainer<Services extends ServiceMap> {
  registerValue<Key extends keyof Services>(key: Key, value: Services[Key]): void;
  registerSingleton<Key extends keyof Services>(
    key: Key,
    factory: ServiceFactory<Services, Services[Key]>
  ): void;
  resolve<Key extends keyof Services>(key: Key): Services[Key];
  has<Key extends keyof Services>(key: Key): boolean;
  onStart(task: StartupTask<Services>): void;
  onStop(task: ShutdownTask<Services>): void;
}

export type AppModuleDefinition<Services extends ServiceMap> = {
  id: string;
  name: string;
  dependencies: string[];
  enabled?: ModuleEnabledPredicate<Services>;
  register(container: AppContainer<Services>): void;
};
