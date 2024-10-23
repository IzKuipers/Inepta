import { KernelModule } from "../kernel/module/index.js";
import { RegistryHives } from "../registry/store.js";
import { DefaultUserData, DefaultUserPreferences } from "./store.js";

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

    if (store[username]) return false;

    store[username] = DefaultUserData;

    store[username].admin = admin;
    store[username].userFolder = `./Users/${username}`;
    store[username].username = username;
    store[username].password = await this.hashPassword(password);

    this.registry.setValue(RegistryHives.users, "store", store);

    return await this.initializeUser(username);
  }

  getUser(username) {
    username &&= username.toLowerCase();

    const store = this.registry.getValue(RegistryHives.users, `store`);

    return store[username];
  }

  async initializeUser(username) {
    username &&= username.toLowerCase();

    const user = this.getUser(username);

    if (!user) return false;

    this.fs.createDirectory(user.userFolder);

    await this.initializePreferences(user);

    return true;
  }

  async initializePreferences(user) {
    user.username &&= user.username.toLowerCase();

    const preferencesPath = join(user.userFolder, "preferences.json");

    await this.fs.writeFile(preferencesPath, JSON.stringify(DefaultUserPreferences));
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
