import { MessageBox } from "../desktop/message.js";
import { MessageIcons } from "../images/msgbox.js";
import { Log, LogType } from "../logging.js";

export function handleConsoleIntercepts() {
  Log("handleConsoleIntercepts", "Intercepting console -> warn, error");

  console.warn = (message, ...optionalParams) => {
    if (message.includes("Electron Security Warning")) return;

    Log(message, optionalParams.join(" "), LogType.warning);
  };

  console.error = (...data) => {
    MessageBox({
      title: data && data[0] ? data[0] : "Error",
      message: data && data[0] ? data.join("<br>") : "Unknown error.",
      buttons: [{ caption: "Okay", action() {} }],
      icon: MessageIcons.warning,
    });
  };
}
