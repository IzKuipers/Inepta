import { AppRuntimeError } from "../../js/apps/error.js";
import { AppProcess } from "../../js/apps/process.js";

export default class MsgBoxProcess extends AppProcess {
  data;

  constructor(handler, pid, parentPid, app, data) {
    super(handler, pid, parentPid, app);

    this.data = data;
    this.app.data.metadata.name = data.title;
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
        await this.killSelf();
      });

      buttonsDiv.append(buttonElement);
    }

    this.handler.renderer.centerWindow(this._pid);
  }
}