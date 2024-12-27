import { KernelModule } from "../kernel/module/index.js";
import { RegistryHives } from "../registry/store.js";

export class Environment extends KernelModule {
  VALID_TYPES = ["string", "number", "boolean"];

  constructor(kernel, id) {
    super(kernel, id);

    this.registry = kernel.getModule("registry");
  }

  async _init() {
    this.checkEnvironment();

    this.setRegistryValue("lastLoadTime", new Date().getTime());
  }

  checkEnvironment() {
    this.registry.setValue(RegistryHives.local, "Environment", {});
  }

  setProperty(key, value) {
    const isValid =
      key && value && this.VALID_TYPES.includes(typeof value) && typeof key === "string";

    if (!isValid) return false;

    this.registry.setValue(RegistryHives.local, `Environment.${key.toUpperCase()}`, value);
  }

  getProperty(key) {
    return this.registry.getValue(RegistryHives.local, `Environment.${key.toUpperCase()}`);
  }

  getAll() {
    return this.registry.getValue(RegistryHives.local, "Environment");
  }
}
