import { AppProcess } from "../../js/apps/process.js";
import { MessageBox } from "../../js/desktop/message.js";
import { MessageIcons } from "../../js/images/msgbox.js";
import { Store } from "../../js/store.js";

const { sep } = require("path");

export default class NapkinProcess extends AppProcess {
  textarea;
  fileMenu;
  aboutMenu;
  file = Store("");
  modified = false;

  constructor(handler, pid, parentPid, app, file) {
    super(handler, pid, parentPid, app);

    this.file.set(file);
    this.fs = this.kernel.getModule("fs");
  }

  render() {
    this.textarea = this.getElement("textarea", true);
    this.fileMenu = this.getElement("#fileMenu", true);
    this.aboutMenu = this.getElement("#aboutMenu", true);
    this.filenameStatus = this.getElement("#filename", true);

    this.textarea.addEventListener("input", () => {
      this.modified = true;
    });

    this.clickMenu(this.fileMenu, () => [
      { caption: "New", action: () => this.newFile(), separator: true },
      {
        caption: "Save",
        action: this.safe(() => {
          this.save();
        }),
      },
      {
        caption: "Save As...",
        action: this.safe(() => {
          this.saveAs();
        }),
        separator: true,
      },
      {
        caption: "Exit",
        action: this.safe(() => {
          this.closeWindow();
        }),
      },
    ]);

    this.file.subscribe((v) => {
      if (!v) {
        this.filenameStatus.innerText = "New file";
        return this.windowTitle.set("Napkin");
      }

      const split = v.split(sep);
      const filename = split[split.length - 1];

      this.windowTitle.set(`${filename} - Napkin`);
      this.filenameStatus.innerText = filename;

      this.loadFile();
    });
  }

  async onClose() {
    return new Promise((r) => {
      const file = this.file.get();

      if (!file || !this.modified) return r(true);

      MessageBox({
        title: "Save changes?",
        message: `Do you want to save the changes you made to the following file:<br><br>${file}`,
        buttons: [
          {
            caption: "Yes",
            action: this.safe(async () => {
              await this.save();
              r(true);
            }),
          },
          {
            caption: "No",
            action: this.safe(async () => {
              r(true);
            }),
          },
          {
            caption: "Cancel",
            action: this.safe(async () => {
              r(false);
            }),
          },
        ],
        icon: MessageIcons.warning,
      });
    });
  }

  loadFile(path = this.file.get()) {
    try {
      const contents = this.fs.readFile(path, this.userId);

      this.textarea.value = contents;
      this.modified = false;
    } catch (e) {
      MessageBox({
        title: "Can't open file",
        message: e,
        buttons: [{ caption: "Okay", action: () => {} }],
        icon: MessageIcons.warning,
      });
    }
  }

  newFile() {
    this.file.set("");
    this.textarea.value = "";
    this.modified = false;
  }

  save() {
    try {
      const file = this.file.get();

      if (!file) return this.saveAs();

      this.fs.writeFile(file, this.textarea.value, this.userId);
      this.modified = false;
    } catch {
      MessageBox({
        title: "Can't save file",
        message: e,
        buttons: [{ caption: "Okay", action: () => {} }],
        icon: MessageIcons.warning,
      });
    }
  }

  saveAs() {
    // TODO: file transfer dialog, load/save dialog
    throw new Error("Not implemented!");
  }
}
