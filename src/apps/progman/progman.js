import { AppRuntimeError } from "../../js/apps/error.js";
import { AppProcess } from "../../js/apps/process.js";
import { AppStore } from "../../js/apps/store.js";
import { MessageBox } from "../../js/desktop/message.js";
import { MessageIcons } from "../../js/images/msgbox.js";
import { Store } from "../../js/store.js";

export default class ProgManProcess extends AppProcess {
  content;
  selectedPid = Store(-1);

  constructor(handler, pid, parentPid, app) {
    super(handler, pid, parentPid, app);

    this.powerLogic = this.kernel.getModule("powerlogic");
    this.userLogic = this.kernel.getModule("userlogic");
  }

  render() {
    if (this._disposed) return;

    this.closeIfSecondInstance();

    const killButton = this.getElement("#killButton", true);
    const panicButton = this.getElement("#panicButton", true);

    this.content = this.getElement("div#content", true);

    this.handler.store.subscribe(
      this.safe((v) => {
        this.update(v);
      })
    );

    this.selectedPid.subscribe((v) => {
      const somethingSelected = v === -1;

      killButton.disabled = panicButton.disabled = somethingSelected;
    });

    this.toolbarActions();
  }

  update(processes) {
    if (this._disposed) return;

    const selectedPid = this.selectedPid.get();
    const selectedProcess = this.handler.getProcess(selectedPid);

    if (!selectedProcess && selectedPid !== -1) this.selectedPid.set(-1);

    const counter = this.getElement("#runningAppsCounter", true);

    counter.innerText = `${
      [...processes].filter(([_, proc]) => !proc._disposed).length
    } running process(es)`;

    this.content.innerHTML = "";

    this._createHeader();

    for (const [_, process] of processes) {
      if (process.parentPid || process._disposed) continue;

      this.processRow(process);
    }
  }

  _createHeader() {
    if (this._disposed) return;

    const row = document.createElement("div");

    row.className = "row header";

    const { nameSegment, titleSegment, pidSegment, idSegment, userSegment } = this.segments();

    nameSegment.innerText = "Name";
    titleSegment.innerText = "Title";
    pidSegment.innerText = "PID";
    userSegment.innerText = "User";
    idSegment.innerText = "ID";

    row.append(nameSegment, titleSegment, pidSegment, userSegment, idSegment);
    this.content.append(row);
  }

  processRow(process, target = this.content) {
    if (process._disposed) return;
    const row = document.createElement("div");

    this.selectedPid.subscribe((v) => {
      if (process._pid === v) {
        row.classList.add("selected");
      } else {
        row.classList.remove("selected");
      }
    });

    row.addEventListener("click", () => {
      this.selectedPid.set(process._pid);
    });

    row.className = "row";

    const { nameSegment, titleSegment, pidSegment, idSegment, userSegment } = this.segments();

    const user = this.userLogic.getUser(process.userId);

    userSegment.innerText = user.username;

    try {
      nameSegment.innerText = process.name;
      titleSegment.innerText = process.app.data.metadata.name;
      idSegment.innerText = process.app.id;

      if (!AppStore.get()[process.app.id]) {
        idSegment.classList.add("external");
        idSegment.innerText += "*";
        idSegment.title = "Application is from outside the app store";
      }
    } catch {
      titleSegment.innerText = "-";
      titleSegment.classList.add("empty");
      idSegment.innerText = "-";
      idSegment.classList.add("empty");
    }

    pidSegment.innerText = process._pid;

    row.append(nameSegment, titleSegment, pidSegment, userSegment, idSegment);

    const subProcesses = this.handler.getSubProcesses(process._pid);
    const indent = document.createElement("div");

    for (const [_, process] of subProcesses) {
      this.processRow(process, indent);
    }

    indent.className = "indent";
    indent.setAttribute("data-pid", process._pid);

    target.append(row, indent);
  }

  segments() {
    if (this._disposed) return;

    const nameSegment = document.createElement("div");
    const titleSegment = document.createElement("div");
    const pidSegment = document.createElement("div");
    const userSegment = document.createElement("div");
    const idSegment = document.createElement("div");

    nameSegment.className = "segment name";
    titleSegment.className = "segment title";
    pidSegment.className = "segment pid";
    userSegment.className = "segment user";
    idSegment.className = "segment id";

    return { nameSegment, titleSegment, pidSegment, userSegment, idSegment };
  }

  toolbarActions() {
    if (this._disposed) return;

    const killButton = this.getElement("#killButton", true);
    const panicButton = this.getElement("#panicButton", true);
    const runButton = this.getElement("#runButton", true);
    const shutdownButton = this.getElement("#shutdownButton", true);
    const restartButton = this.getElement("#restartButton", true);

    shutdownButton.addEventListener(
      "click",
      this.safe(() => {
        this.powerLogic.shutdown();
      })
    );

    restartButton.addEventListener(
      "click",
      this.safe(() => {
        this.powerLogic.restart();
      })
    );

    killButton.addEventListener(
      "click",
      this.safe(() => {
        this.killSelected();
      })
    );

    panicButton.addEventListener(
      "click",
      this.safe(() => {
        this.panicSelected();
      })
    );

    runButton.addEventListener(
      "click",
      this.safe(() => {
        this.runPrompt();
      })
    );
  }

  killSelected() {
    if (this._disposed) return;

    const selectedPid = this.selectedPid.get();

    if (!selectedPid) return;

    const process = this.handler.getProcess(selectedPid);

    MessageBox(
      {
        title: `Kill ${process.name}?`,
        message: `Are you sure you want to kill the process with ID ${selectedPid}? Any unsaved information will be lost.`,
        buttons: [
          {
            caption: "Kill",
            action: this.safe(() => {
              this.handler.kill(selectedPid);
            }),
          },
          {
            caption: "Cancel",
            action: () => {},
          },
        ],
        icon: MessageIcons.question,
      },
      this._pid
    );
  }

  panicSelected() {
    if (this._disposed) return;

    const selectedPid = this.selectedPid.get();

    if (!selectedPid) return;

    const process = this.handler.getProcess(selectedPid);

    MessageBox(
      {
        title: `Panic ${process.name}?`,
        message: `Are you sure you want to cause mayhem for the innocent process with ID ${selectedPid}? This can cause important data to get lost.`,
        buttons: [
          {
            caption: "Panic!",
            action: this.safe(() => {
              process.safe(() => {
                throw new AppRuntimeError("Crash via panic button!");
              })();
            }),
          },
          {
            caption: "Abort.",
            action: () => {},
          },
        ],
        icon: MessageIcons.question,
      },
      this._pid
    );
  }

  runPrompt() {
    this.spawnChild("progManRunPromptApp");
  }
}
