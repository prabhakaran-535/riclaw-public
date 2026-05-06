export class AppError extends Error {
  constructor(message: string, readonly statusCode = 500) {
    super(message);
    this.name = "AppError";
  }
}

export class KernelError extends AppError {
  constructor(message: string) {
    super(message, 500);
    this.name = "KernelError";
  }
}

export class ServiceRegistrationError extends KernelError {
  constructor(serviceId: string) {
    super(`Service "${serviceId}" is already registered.`);
    this.name = "ServiceRegistrationError";
  }
}

export class ServiceResolutionError extends KernelError {
  constructor(serviceId: string) {
    super(`Service "${serviceId}" is not registered.`);
    this.name = "ServiceResolutionError";
  }
}

export class CircularServiceDependencyError extends KernelError {
  constructor(serviceId: string) {
    super(`Circular service dependency detected while resolving "${serviceId}".`);
    this.name = "CircularServiceDependencyError";
  }
}

export class DuplicateModuleError extends KernelError {
  constructor(moduleId: string) {
    super(`Module "${moduleId}" is already registered.`);
    this.name = "DuplicateModuleError";
  }
}

export class MissingModuleDependencyError extends KernelError {
  constructor(moduleId: string, dependencyId: string) {
    super(`Module "${moduleId}" depends on missing or disabled module "${dependencyId}".`);
    this.name = "MissingModuleDependencyError";
  }
}

export class CircularModuleDependencyError extends KernelError {
  constructor(moduleId: string) {
    super(`Circular module dependency detected while registering "${moduleId}".`);
    this.name = "CircularModuleDependencyError";
  }
}
