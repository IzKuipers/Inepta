import { IneptaKernel } from "../kernel/index.js";
import { Log } from "../logging.js";
import { ProcessDispatch } from "./dispatch.js";

export class Process {
  _pid;
  _disposed = false;
  _criticalProcess = false;
  handler;
  dispatch;
  parentPid = undefined;
  name = "";
  userId = "";

  constructor(handler, pid, parentPid = undefined) {
    this._pid = pid;
    this._disposed = false;
    this.parentPid = parentPid;
    this.handler = handler;
    this.kernel = IneptaKernel();
    this.registry = IneptaKernel().getModule("registry");
    this.environment = IneptaKernel().getModule("environment");
    this.context = IneptaKernel().getModule("context");
    this.dispatch = new ProcessDispatch(this);

    this.name ||= this.constructor.name;

    this.dispatch.subscribe("kill-self", () => {
      this.killSelf();
    });
  }

  setUser(userId) {
    Log(`Process::'${this._pid}'.setUser`, `Now operating as ${userId}`);

    this.userId = userId;
  }

  async killSelf() {
    await this.handler.kill(this._pid);
  }

  async stop() {
    // ! DUMMY
  }

  async start() {
    // ! DUMMY
  }
}
