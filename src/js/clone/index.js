import { VERSION } from "../../env.js";
import { SecurityLevel } from "../fssec/store.js";
import { KernelModule } from "../kernel/module/index.js";
import { Log, LogStore, LogType } from "../logging.js";
import { Sleep } from "../sleep.js";

const { glob } = require("glob");
const { readFile } = require("fs/promises");
const { statSync } = require("fs");

export class CloneModule extends KernelModule {
  fs;
  needsClone = false;
  paths = [];
  IGNORE_LIST = ["yarn.lock", "index.js", "package.json"];

  constructor(kernel, id) {
    super(kernel, id);

    this.fs = kernel.getModule("fs");
    this.fssec = kernel.getModule("fssec");
  }

  async _init() {
    const runningClone = location.href.toLowerCase().includes("local/inepta/system");
    const isLive = navigator.userAgent.includes("LIVEMODE");

    if (runningClone || isLive) {
      this.setRegistryValue("isLive", isLive);
      this.setRegistryValue("runningClone", runningClone);

      return;
    }

    this.paths = (await glob("./**/*"))
      .filter((p) => statSync(p).isFile())
      .map((p) => p.replaceAll("\\", "/"));

    const currentVersion = this.getRegistryValue("clonedVersion");

    if (!currentVersion) return (this.needsClone = true);

    if (currentVersion === VERSION.join(".")) {
      location.href = this.fs.join(this.fs.root, "System/src/index.html");
      return;
    }

    this.needsClone = true;
  }

  async doClone(cb = () => {}) {
    Log("CloneModule.doClone", `Cloning ${this.paths.length} system files to the filesystem`);

    for (const path of this.paths) {
      Log("CloneModule.doClone", path);

      try {
        if (this.IGNORE_LIST.includes(path)) {
          Log("CloneModule.doClone", `IGNORED: ${path}`, LogType.warning);

          cb(`${path} (IGNORED)`);

          continue;
        }

        this.fs.writeFile(`System/${path}`, await readFile(path), "SYSTEM");

        cb(path);
      } catch {
        Log("CloneModule.doClone", `FAILURE: ${path}`, LogType.error);

        cb(`${path} (FAILED)`);
      }

      await Sleep(3);
    }

    cb(`Applying permissions...`);

    await Sleep(1000);

    for (const path of this.paths) {
      if (this.IGNORE_LIST.includes(path)) {
        Log("CloneModule.doClone", `IGNORED: ${path}`, LogType.warning);

        cb(`${path} (IGNORED)`);

        continue;
      }

      cb(`${path} (FSSEC)`);

      this.fssec.createSecurityNode(`System/${path}`, {
        readRequirement: SecurityLevel.user,
        writeRequirement: SecurityLevel.admin,
        readAllow: ["SYSTEM"],
        writeAllow: ["SYSTEM"],
      });

      await Sleep(1);
    }

    const logs = {};

    for (let i = 0; i < LogStore.length; i++) {
      logs[`LogItem#${i}`] = LogStore[i];
    }

    this.setRegistryValue("clonedVersion", VERSION.join("."));
    this.setRegistryValue("cloneLog", logs);
  }
}
