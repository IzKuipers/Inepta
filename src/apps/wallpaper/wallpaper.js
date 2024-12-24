import { AppRuntimeError } from "../../js/apps/error.js";
import { AppProcess } from "../../js/apps/process.js";
import { MessageBox } from "../../js/desktop/message.js";
import { MessageIcons } from "../../js/images/msgbox.js";

export default class WallpaperProcess extends AppProcess {
  constructor(handler, pid, parentPid, app) {
    super(handler, pid, parentPid, app);
  }

  render() {
    const desktop = this.getBody();

    if (!desktop) throw new AppRuntimeError("Huh?!");

    this.contextMenu(desktop, () => [
      {
        caption: "huhhhhh",
        action: this.safe(() => {
          MessageBox({
            title: "Yes",
            message: "No!",
            icon: MessageIcons.critical,
            buttons: [{ caption: "Okay", action() {} }],
          });
        }),
      },
    ]);
  }
}
