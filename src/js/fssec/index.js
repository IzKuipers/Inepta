import { KernelModule } from "../kernel/module/index.js";
import { Log } from "../logging.js";
import { RegistryHives } from "../registry/store.js";
import { SecurityLevel } from "./store.js";

const { randomUUID } = require("crypto");

export class FileSystemSecurity extends KernelModule {
  constructor(kernel, id) {
    super(kernel, id);

    this.registry = kernel.getModule("registry");
    this.fs = kernel.getModule("fs");
    this.userLogic = kernel.getModule("userlogic");
  }

  async _init() {
    Log("FileSystemSecurity._init", "Loading FSSec into 'fs' kernel module");
    this.fs.fssec = this;
  }

  getSecurityNode(path) {
    const store = this.registry.getHive(RegistryHives.security);
    const uuid = this.findIdByPath(path);

    if (!uuid) return undefined;

    return store[uuid];
  }

  getSecurityNodeById(uuid) {
    const store = this.registry.getHive(RegistryHives.security);

    return store[uuid];
  }

  findIdByPath(path) {
    const store = this.registry.getHive(RegistryHives.security);

    return Object.entries(store)
      .filter(([_, node]) => path === node.path)
      .map(([uuid]) => uuid)[0];
  }

  createSecurityNode(path, options = {}) {
    const existing = this.getSecurityNode(path);

    if (existing) return existing;

    const uuid = randomUUID();
    const data = {
      path,
      readProhibit: options.readProhibit || [],
      readAllow: options.readAllow || [],
      writeProhibit: options.writeProhibit || [],
      writeAllow: options.writeAllow || [],
      readRequirement: options.readRequirement ?? SecurityLevel.user,
      writeRequirement: options.writeRequirement ?? SecurityLevel.user,
    };

    this.registry.setValue(RegistryHives.security, uuid, data);

    return data;
  }

  canReadItem(path, securityLevel, userId) {
    const node = this.getSecurityNode(path);

    if (!node) return true; // No permissions set; assume that everyone is allowed

    if (userId && node.readProhibit.includes(userId)) return false;
    if (userId && node.readAllow.includes(userId)) return true;

    return securityLevel >= node.readRequirement;
  }

  canWriteItem(path, securityLevel, userId) {
    const node = this.getSecurityNode(path);

    if (!node) return true; // No permissions set; assume that everyone is allowed

    if (userId && node.writeProhibit.includes(userId)) return false;
    if (userId && node.writeAllow.includes(userId)) return true;

    return securityLevel >= node.writeRequirement;
  }

  allowReadFor(userId, path) {
    const uuid = this.findIdByPath(path);
    const node = this.getSecurityNodeById(uuid);

    if (!node) throw new Error(`No permission node for ${path}`);

    if (node.readAllow.includes(userId)) return;
    if (node.readProhibit.includes(userId)) {
      node.readProhibit.splice(node.readProhibit.indexOf(userId), 1);
    }

    node.readAllow.push(userId);

    this.registry.setValue(RegistryHives.security, uuid, node);
  }

  prohibitReadFor(userId, path) {
    const uuid = this.findIdByPath(path);
    const node = this.getSecurityNodeById(uuid);

    if (!node) throw new Error(`No permission node for ${path}`);

    if (node.readProhibit.includes(userId)) return;
    if (node.readAllow.includes(userId)) {
      node.readAllow.splice(node.readAllow.indexOf(userId), 1);
    }

    node.readProhibit.push(userId);

    this.registry.setValue(RegistryHives.security, uuid, node);
  }

  allowWriteFor(userId, path) {
    const uuid = this.findIdByPath(path);
    const node = this.getSecurityNodeById(uuid);

    if (!node) throw new Error(`No permission node for ${path}`);

    if (node.writeAllow.includes(userId)) return;
    if (node.writeProhibit.includes(userId)) {
      node.writeProhibit.splice(node.writeProhibit.indexOf(userId), 1);
    }

    node.writeAllow.push(userId);

    this.registry.setValue(RegistryHives.security, uuid, node);
  }

  prohibitWriteFor(userId, path) {
    const uuid = this.findIdByPath(path);
    const node = this.getSecurityNodeById(uuid);

    if (!node) throw new Error(`No permission node for ${path}`);

    if (node.writeProhibit.includes(userId)) return;
    if (node.writeAllow.includes(userId)) {
      node.writeAllow.splice(node.writeAllow.indexOf(userId), 1);
    }

    node.writeProhibit.push(userId);

    this.registry.setValue(RegistryHives.security, uuid, node);
  }

  setReadRequirement(path, requirement) {
    const uuid = this.findIdByPath(path);
    const node = this.getSecurityNodeById(uuid);

    if (!node) throw new Error(`No permission node for ${path}`);

    node.readRequirement = requirement;

    this.registry.setValue(RegistryHives.security, uuid, node);
  }

  setWriteRequirement(path, requirement) {
    const uuid = this.findIdByPath(path);
    const node = this.getSecurityNodeById(uuid);

    if (!node) throw new Error(`No permission node for ${path}`);

    node.writeRequirement = requirement;

    this.registry.setValue(RegistryHives.security, uuid, node);
  }

  determineSecurityLevel(uuid) {
    if (uuid === "SYSTEM") return SecurityLevel.system;

    const user = this.userLogic.getUser(uuid);

    if (!user) return SecurityLevel.system;

    return user.admin ? SecurityLevel.admin : SecurityLevel.user;
  }
}
