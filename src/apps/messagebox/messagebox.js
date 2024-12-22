import { AppRuntimeError } from "../../js/apps/error.js";
import { AppProcess } from "../../js/apps/process.js";
import { Sleep } from "../../js/sleep.js";

export default class MsgBoxProcess extends AppProcess {
  data;

  constructor(handler, pid, parentPid, app, data) {
    super(handler, pid, parentPid, app);

    this.data = data;
    this.app.data.metadata.name = data ? data.title : "*";
    this.app.data.metadata.icon = data ? data.icon : "";

    this.windowTitle.set(this.app.data.metadata.name);
  }

  async render() {
    const iconElement = this.getElement("#icon", true);
    const buttonsDiv = this.getElement("#buttons", true);
    const messageField = this.getElement("#message", true);

    const { buttons, icon, title, message } = this.data;

    if (!buttons || !icon || !title || !message)
      throw new AppRuntimeError(`Got invalid MsgBox data`);

    iconElement.src = icon;
    messageField.innerHTML = message;

    for (const button of buttons) {
      const buttonElement = document.createElement("button");

      buttonElement.innerText = button.caption || "?";
      buttonElement.addEventListener("click", async () => {
        await button.action();
        await this.closeWindow();
      });

      buttonsDiv.append(buttonElement);

      buttonElement.focus();
    }

    await Sleep(0);

    this.handler.renderer.centerWindow(this._pid);

    await Sleep(0);

    const window = this.getWindow();

    if (!window) return;

    window.classList.add("show-error");
  }
}
