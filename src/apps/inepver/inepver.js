import { VERSION } from "../../env.js";
import { AppProcess } from "../../js/apps/process.js";
import { strftime } from "../../js/desktop/date.js";
import { RegistryHives } from "../../js/registry/store.js";

export default class InepVerProcess extends AppProcess {
  constructor(handler, pid, parentPid, app) {
    super(handler, pid, parentPid, app);
  }

  render() {
    this.closeIfSecondInstance();

    this._banner();
    this._master();
    this._setupBy();
    this._okayButton();
  }

  _banner() {
    const versionNumber = this.getElement("#versionNumber");

    versionNumber.innerText = `${VERSION[0]}.${VERSION[1]}`;
  }

  _master() {
    const versionNumber = this.getElement("#masterVersionNumber");
    const gitHash = this.getElement("#masterGitHash");

    versionNumber.innerText = VERSION.join(".");
    gitHash.innerText = this.kernel.BUILD.replace(/(.{7})..+/, "$1");
  }

  _okayButton() {
    const okayButton = this.getElement("#okayButton", true);

    okayButton.addEventListener(
      "click",
      this.safe(() => {
        this.closeWindow();
      })
    );
  }

  _setupBy() {
    const initialSetupBy = this.getElement("#initialSetupBy", true);

    const { finishedAt, doneBy } = this.registry.getValue(RegistryHives.local, "initialSetup");

    initialSetupBy.innerText = `${doneBy} on ${strftime(
      "%A %e %B %Y at %k:%M",
      new Date(finishedAt)
    )}`;
  }
}
