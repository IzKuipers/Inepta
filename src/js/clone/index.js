import { VERSION } from "../../env.js";
import { KernelModule } from "../kernel/module/index.js";
import { Log, LogStore, LogType } from "../logging.js";

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

          await cb(`${path} (IGNORED)`);

          continue;
        }

        await this.fs.writeFile(`System/${path}`, await readFile(path), "SYSTEM");

        await cb(path);
      } catch {
        Log("CloneModule.doClone", `FAILURE: ${path}`, LogType.error);

        this.IGNORE_LIST.push(path);

        await cb(`${path} (FAILED)`);
      }
    }

    const logs = {};

    for (let i = 0; i < LogStore.length; i++) {
      logs[`LogItem#${i}`] = LogStore[i];
    }

    this.setRegistryValue("clonedVersion", VERSION.join("."));
    this.setRegistryValue("cloneLog", logs);
  }
}
