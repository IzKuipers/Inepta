import { getJsonHierarchy, setJsonHierarchy } from "../hierarchy.js";
import { KernelModule } from "../kernel/module/index.js";
import { Log } from "../logging.js";
import { Store } from "../store.js";
import { RegistryHives } from "./store.js";

export class IneptaRegistry extends KernelModule {
  store = Store({});
  PATH = "./System/Registry.json";
  fs;

  constructor(kernel, id) {
    super(kernel, id);

    this.fs = kernel.getModule("fs");
  }

  async _init() {
    await this.loadRegistry();

    this.registrySync();
    this.setValue(RegistryHives.kernel, "Registry.lastLoadTime", new Date().getTime());
    this.setValue(
      RegistryHives.kernel,
      "Registry.initialSize",
      JSON.stringify(this.store.get()).length
    );

    this.populateHives();
  }

  populateHives() {
    for (const [id, hive] of Object.entries(RegistryHives)) {
      const existingHive = getJsonHierarchy(this.store.get(), hive);

      if (existingHive) continue;

      const store = this.store.get();

      Log(`IneptaRegistry.populateHives`, `Creating hive ${id} (Registry/${hive})`);

      setJsonHierarchy(store, hive, {});

      this.store.set(store);
    }
  }

  async loadRegistry() {
    try {
      const contents = this.fs.readFile(this.PATH, "SYSTEM");

      this.store.set(JSON.parse(contents));
    } catch {
      this.store.set({});

      this.fs.writeFile(this.PATH, JSON.stringify({}), "SYSTEM");
    }
  }

  registrySync() {
    this.store.subscribe((v) => {
      this.fs.writeFile(this.PATH, JSON.stringify(v), "SYSTEM");
    });
  }

  stop() {
    this.store.destroy();
  }

  setValue(hive = RegistryHives.local, path, value) {
    const absolutePath = `${hive}.${path}`;
    const store = this.store.get();

    Log(`IneptaRegistry.setValue`, `Registry/${absolutePath.replaceAll(".", "/")}`);

    setJsonHierarchy(store, absolutePath, value);

    this.store.set(store);
  }

  getValue(hive = RegistryHives.local, path) {
    return getJsonHierarchy(this.store.get(), `${hive}.${path}`);
  }

  getHive(hive = RegistryHives.local) {
    return getJsonHierarchy(this.store.get(), hive);
  }
}
