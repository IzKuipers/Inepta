import { AppProcess } from "../../js/apps/process.js";
import { spawnApp } from "../../js/apps/spawn.js";
import { MessageBox } from "../../js/desktop/message.js";
import { MessageIcons } from "../../js/images/msgbox.js";
import { ProgressBar } from "../../js/ui/progress.js";

const { BrowserWindow } = require("@electron/remote");

export default class DebugToolProcess extends AppProcess {
  constructor(handler, pid, parentPid, app) {
    super(handler, pid, parentPid, app);
  }

  render() {
    this.cssHotFix();
    this.electronControls();
    this.pageReload();
    this.launcher();
    this.progressBars();
  }

  cssHotFix() {
    const button = this.getElement("button#cssReloadHotfix", true);

    button.addEventListener(
      "click",
      this.safe(() => {
        const stylesheets = document.querySelectorAll("link[rel='stylesheet']");

        for (const stylesheet of stylesheets) {
          const href = stylesheet.href;

          stylesheet.href = "";

          setTimeout(() => {
            stylesheet.href = href;
            MessageBox({
              title: "CSS Reload Hotfix",
              message: `Reloaded stylesheet <b>${stylesheet.id}</b>:<br><br><code>${href}</code>`,
              icon: MessageIcons.information,
              buttons: [
                {
                  caption: "Okay",
                  action() {},
                },
              ],
            });
          });
        }
      })
    );
  }

  pageReload() {
    const button = this.getElement("button#pageReload", true);

    button.addEventListener(
      "click",
      this.safe(() => {
        location.reload();
      })
    );
  }

  launcher() {
    const input = this.getElement("input#launchValue", true);
    const button = this.getElement("button#launchButton", true);

    button.addEventListener(
      "click",
      this.safe(() => {
        const value = input.value;

        if (!value) return;

        spawnApp(value, this._pid, this.userId);
      })
    );
  }

  electronControls() {
    const minimize = this.getElement("button#minimize", true);
    const maximize = this.getElement("button#maximize", true);
    const close = this.getElement("button#close", true);

    minimize.addEventListener(
      "click",
      this.safe(() => {
        if (!BrowserWindow.getFocusedWindow()) return;

        BrowserWindow.getFocusedWindow().minimize();
      })
    );

    maximize.addEventListener(
      "click",
      this.safe(() => {
        if (!BrowserWindow.getFocusedWindow()) return;

        BrowserWindow.getFocusedWindow().maximize();
        BrowserWindow.getFocusedWindow().fullScreen = false;
      })
    );

    close.addEventListener(
      "click",
      this.safe(() => {
        window.close();
      })
    );
  }

  progressBars() {
    const target = this.getElement("#progressBars");

    const bar1 = new ProgressBar({
      indeterminate: true,
    }).bar;
    const bar2 = new ProgressBar({
      maxValue: 4,
      value: 1,
    }).bar;
    const bar3 = new ProgressBar({
      maxValue: 4,
      value: 3,
    }).bar;
    const bar4 = new ProgressBar({
      maxValue: 4,
      value: 2,
    }).bar;

    target.append(bar1, bar2, bar3, bar4);
  }
}
