import { AppProcess } from "../../js/apps/process.js";
import { MessageBox } from "../../js/desktop/message.js";
import { MessageIcons } from "../../js/images/msgbox.js";
import { Store } from "../../js/store.js";

export default class ProgManProcess extends AppProcess {
  content;
  selectedPid = Store(-1);

  constructor(handler, pid, parentPid, app) {
    super(handler, pid, parentPid, app);
  }

  render() {
    this.content = this.getElement("div#content", true);

    this.handler.store.subscribe(
      this.safeCallback((v) => {
        this.update(v);
      })
    );

    this.toolbarActions();
  }

  update(processes) {
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
    const row = document.createElement("div");

    row.className = "row header";

    const { nameSegment, titleSegment, pidSegment, idSegment } =
      this.segments();

    nameSegment.innerText = "Name";
    titleSegment.innerText = "Title";
    pidSegment.innerText = "PID";
    idSegment.innerText = "ID";

    row.append(nameSegment, titleSegment, pidSegment, idSegment);
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

    const { nameSegment, titleSegment, pidSegment, idSegment } =
      this.segments();

    try {
      nameSegment.innerText = process.name;
      titleSegment.innerText = process.app.data.metadata.name;
      idSegment.innerText = process.app.id;
    } catch {
      titleSegment.innerText = "-";
      titleSegment.classList.add("empty");
      idSegment.innerText = "-";
      idSegment.classList.add("empty");
    }

    pidSegment.innerText = process._pid;

    row.append(nameSegment, titleSegment, pidSegment, idSegment);

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
    const nameSegment = document.createElement("div");
    const titleSegment = document.createElement("div");
    const pidSegment = document.createElement("div");
    const idSegment = document.createElement("div");

    nameSegment.className = "segment name";
    titleSegment.className = "segment title";
    pidSegment.className = "segment pid";
    idSegment.className = "segment id";

    return { nameSegment, titleSegment, pidSegment, idSegment };
  }

  toolbarActions() {
    const killButton = this.getElement("#killButton", true);
    const runButton = this.getElement("#runButton", true);
    const shutdownButton = this.getElement("#shutdownButton", true);
    const restartButton = this.getElement("#restartButton", true);

    killButton.addEventListener(
      "click",
      this.safeCallback(() => {
        this.killSelected();
      })
    );
  }

  killSelected() {
    const selectedPid = this.selectedPid.get();

    if (!selectedPid) return;

    MessageBox(
      {
        title: `Kill ${selectedPid}?`,
        message: `Are you sure you want to behead the innocent process with ID ${selectedPid}?`,
        buttons: [
          {
            caption: "Do it.",
            action: () => {
              this.handler.kill(selectedPid);
            },
          },
          {
            caption: "Let it live.",
            action: () => {},
          },
        ],
        icon: MessageIcons.question,
      },
      this._pid
    );
  }
}