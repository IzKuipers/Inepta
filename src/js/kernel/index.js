import { setKernel } from "../../env.js";
import { Crash } from "../crash.js";
import { handleConsoleIntercepts } from "../error/console.js";
import { handleGlobalErrors } from "../error/global.js";
import { Log, LogStore, LogType } from "../logging.js";
import { StateHandler } from "../state/index.js";
import { InitProcess } from "./init.js";
import { CoreKernelModules } from "./module/store.js";

const { readFile } = require("fs/promises");

export class IneptaKernel {
  fs;
  state;
  stack;
  params;
  initPid;
  startMs;
  modules = [];
  BUILD = "";

  constructor() {
    Log("KERNEL", "Starting kernel");

    // KERNEL STARTS HERE

    this.startMs = new Date().getTime();

    // handleGlobalErrors();
    handleConsoleIntercepts();

    setKernel(this);
  }

  async initializeCoreModules() {
    Log("KERNEL", `Initializing Core Modules`);

    for (const [id, mod] of Object.entries(CoreKernelModules)) {
      this[id] = new mod(this, id);

      await this[id].__init();

      this.modules.push(id);
    }
  }

  getModule(id) {
    return this[id] && typeof this[id] === "object" ? this[id] : undefined;
  }

  loadUserModule(id, data) {
    Log("KERNEL", `Loading user module "${id}"`);

    if (!data || typeof data !== "object" || this[id])
      throw new Error(`Attempted to load invalid Kernel Module "${id}"`);

    this[id] = data;
    this.modules.push(id);
  }

  async _init() {
    Log("KERNEL", "Called _init");

    await this.getBuildHash();
    await this.initializeCoreModules();

    this.params = new URLSearchParams();

    this.init = await this.stack.spawn(InitProcess, undefined, "SYSTEM");
    this.initPid = this.init._pid;

    this.state = await this.stack.spawn(StateHandler, this.initPid, "SYSTEM");

    await this.stack.startRenderer("appRenderer", this.initPid);

    this.init.jumpstart();
  }

  Log(source, message, type = 0) {
    if (!LogType[type]) return;

    const date = new Date();
    const ms = date.getTime();
    const timestamp = date.toJSON();

    const msg = `[${LogType[type]}] ${timestamp} | ${source}: ${message}`;

    console.log(msg);

    LogStore.push({
      type,
      timestamp,
      source,
      message,
      kernelTime: ms - this.startMs,
    });
  }

  async panic(reason) {
    const obj = {
      message: reason,
      stack: `Inepta Kernel Panic`,
    };
    Crash({
      reason: obj,
      error: obj,
    });
  }

  async getBuildHash() {
    try {
      this.BUILD = (await readFile("./env/HASH", { encoding: "utf-8" })).split("\n")[0];
    } catch {
      this.BUILD = "";
    }
  }
}
