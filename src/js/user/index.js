import { KernelModule } from "../kernel/module/index.js";
import { RegistryHives } from "../registry/store.js";
import { DefaultUserData, DefaultUserPreferences } from "./store.js";

const { randomUUID } = require("crypto");
const { argon2i, hash, verify } = require("argon2");
const { join } = require("path");

export class UserLogic extends KernelModule {
  constructor(kernel, id) {
    super(kernel, id);
  }

  async _init() {
    this.fs = this._kernel.getModule("fs");
    this.registry = this._kernel.getModule("registry");

    await this.initialize();
    this.setRegistryValue("lastLoadTime", new Date().getTime());
  }

  async initialize() {
    await this._loadStore();
  }

  async _loadStore() {
    const contents = this.registry.getValue(RegistryHives.users, "store");

    if (!contents) {
      this.registry.setValue(RegistryHives.users, "store", {});
    }
  }

  async createUser(username, password, admin = false) {
    username &&= username.toLowerCase();

    const store = this.registry.getValue(RegistryHives.users, "store");

    const uuid = randomUUID();

    if (this.getUserByName(username)) return false;

    store[uuid] = DefaultUserData;

    store[uuid].admin = admin;
    store[uuid].userFolder = `./Users/${uuid}`;
    store[uuid].username = username;
    store[uuid].password = await this.hashPassword(password);

    this.registry.setValue(RegistryHives.users, "store", store);

    return await this.initializeUser(uuid);
  }

  getUserByName(username) {
    if (username.toLowerCase() === "system") {
      return {
        admin: true,
        userFolder: "System",
        uuid: "SYSTEM",
        username: "System",
      };
    }

    username &&= username.toLowerCase();

    const store = this.registry.getValue(RegistryHives.users, `store`);

    const user = Object.entries(store)
      .filter(([_, user]) => user.username === username)
      .map(([uuid, user]) => ({ uuid, ...user }));

    return user[0];
  }

  getUser(uuid) {
    if (uuid.toLowerCase() === "system") {
      return {
        username: "System",
        uuid: "SYSTEM",
        admin: true,
        userFolder: "System",
      };
    }

    const store = this.registry.getValue(RegistryHives.users, `store`);

    if (!store) return undefined;

    return store[uuid];
  }

  async initializeUser(uuid) {
    uuid &&= uuid.toLowerCase();

    const user = this.getUser(uuid);

    if (!user) return false;

    await this.fs.createDirectory(user.userFolder, user.uuid);

    await this.initializePreferences(user);

    return true;
  }

  async initializePreferences(user) {
    user.username &&= user.username.toLowerCase();

    const preferencesPath = join(user.userFolder, "preferences.json");

    await this.fs.writeFile(preferencesPath, JSON.stringify(DefaultUserPreferences), user.uuid);
  }

  async hashPassword(password) {
    // NOTE: Identical settings to password hashing in ArcOS Legacy
    return await hash(password, {
      type: argon2i,
      memoryCost: 2 ** 16,
      timeCost: 6,
      hashLength: 32,
    });
  }

  async verifyPassword(password, hash) {
    return verify(hash, password);
  }
}
