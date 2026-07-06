import { AppRuntimeError } from "../../js/apps/error.js";
import { AppProcess } from "../../js/apps/process.js";
import { MessageBox } from "../../js/desktop/message.js";
import { MessageIcons } from "../../js/images/msgbox.js";

export default class WallpaperProcess extends AppProcess {
  forceLaunch = false;

  constructor(handler, pid, parentPid, app, forceLaunch = false) {
    super(handler, pid, parentPid, app);

    this.forceLaunch = forceLaunch;
  }

  render() {
    const stateHandler = this.kernel.getModule("state");
    const { currentState } = stateHandler;

    if (currentState !== "desktop" && !this.forceLaunch) {
      throw new AppRuntimeError(`Can't launch Wallpaper: invalid context`);
    }

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
