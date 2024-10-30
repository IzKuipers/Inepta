import { KernelModule } from "../kernel/module/index.js";
import { RegistryHives } from "../registry/store.js";

const { randomUUID } = require("crypto");

export class ElevationModule extends KernelModule {
  constructor(kernel, id) {
    super(kernel, id);

    this.registry = kernel.getModule("registry");
    this.userLogic = kernel.getModule("userlogic");
  }

  _init() {
    this.registry.setValue(RegistryHives.kernel, this._id, {});
  }

  elevate(pid, userId) {
    const uuid = randomUUID();
    const user = this.userLogic.getUser(userId);

    if (!user) throw new Error(`User {${userId}} not registered`);

    const data = { pid, userId, uuid };

    this.setRegistryValue(uuid, data);

    return uuid;
  }

  validate(uuid, pid, userId) {
    const data = this.getRegistryValue(uuid);

    if (!data) throw new Error(`Elevation node {${uuid}} not registered`);
    if (data.pid !== pid) throw new Error(`Elevation {${uuid}}: PID mismatch`);
    if (data.userId !== userId) throw new Error(`Elevation {${uuid}}: User ID mismatch`);

    return;
  }

  discardElevation(uuid) {
    this.setRegistryValue(uuid, undefined);
  }
}
