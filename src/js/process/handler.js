import { AppRenderer } from "../apps/renderer.js";
import { IneptaKernel } from "../kernel/index.js";
import { KernelModule } from "../kernel/module/index.js";
import { Log } from "../logging.js";
import { Store } from "../store.js";

export class ProcessHandler extends KernelModule {
  store = Store(new Map([]));
  renderer;
  lastPid = 0;

  constructor(kernel, id) {
    super(kernel, id);

    this.registry = kernel.getModule("registry");

    Log("ProcessHandler.constructor", "Constructing");
  }

  _init() {
    this.setRegistryValue("lastLoadTime", new Date().getTime());
  }

  async startRenderer(renderTarget, initPid) {
    Log("ProcessHandler.startRenderer", "Starting renderer");

    try {
      this.renderer = await this.spawn(AppRenderer, initPid, "SYSTEM", renderTarget);
    } catch (e) {
      throw new Error("ProcessHandler.startRenderer: Starting renderer failed!");
    }
  }

  /**
   * @param {import("./instance.js").Process} process
   * @param {any[]} args
   */
  async spawn(process, parentPid = undefined, userId, ...args) {
    if (IneptaKernel().PANICKED) return;

    const pid = this.getPid();
    const proc = new process(this, pid, parentPid, ...args);

    Log("ProcessHandler.spawn", `Spawning new ${proc.constructor.name} (PID ${pid})`);

    if (proc.start) {
      const result = await proc.start();

      if (result === false) return;
    }

    proc.userId = userId;
    proc.name = proc.constructor.name;

    const store = this.store.get();

    store.set(pid, proc);

    this.store.set(store);

    if (this.renderer) this.renderer.sync();

    return proc;
  }

  async kill(pid, force = false) {
    Log("ProcessHandler.kill", `Attempting to kill ${pid}`);

    const store = this.store.get();
    const proc = store.get(pid);

    if (!proc) return "err_noExist";
    if (proc._criticalProcess && !force) return "err_criticalProcess";

    if (proc.stop) await proc.stop();

    await this._killSubProcesses(pid);

    proc._disposed = true;

    store.set(pid, proc);
    this.store.set(store);

    this.renderer.sync();

    return "success";
  }

  async _killSubProcesses(pid) {
    const procs = this.getSubProcesses(pid);

    if (!procs.size) return;

    for (const [pid, proc] of procs) {
      if (proc._disposed) continue;

      if (proc.closeWindow) {
        proc.closeWindow();

        continue;
      }

      await this.kill(pid);
    }
  }

  getSubProcesses(pPid) {
    const result = new Map([]);

    if (!this.isPid(pPid)) return result;

    for (const [pid, proc] of this.store.get()) {
      if (proc.parentPid != pPid) continue;

      result.set(pid, proc);
    }

    return result;
  }

  getProcess(pid) {
    const proc = this.store.get().get(pid);

    if (!proc) return undefined;

    return proc._disposed ? undefined : proc;
  }

  getPid() {
    this.lastPid++;

    return this.lastPid;
  }

  isPid(pid) {
    return this.store.get().has(pid) && !this.store.get().get(pid)._disposed;
  }

  ConnectDispatch(pid) {
    const proc = this.getProcess(pid);

    if (!proc || !proc.dispatch) return {};

    return proc.dispatch;
  }
}
