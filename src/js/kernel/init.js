import { Process } from "../process/instance.js";
import { IneptaKernel } from "./index.js";

export class InitProcess extends Process {
  constructor(handler, pid, parentPid) {
    super(handler, pid, parentPid);
  }

  stop() {
    throw new Error("Attempted to kill init!");
  }

  jumpstart() {
    // USER SPACE STARTS HERE
    IneptaKernel().state.loadState(
      IneptaKernel().state.store[IneptaKernel().params.get("state") || "boot"],
      {},
      false
    );
  }
}
