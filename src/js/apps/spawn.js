import { KERNEL, RendererPid } from "../../env.js";
import { MessageBox } from "../desktop/message.js";
import { MessageIcons } from "../images/msgbox.js";
import { AppLoadError } from "./error.js";
import { AppStore } from "./store.js";

export async function spawnApp(id, parent = undefined, ...args) {
  if (!KERNEL.stack)
    throw new AppLoadError(`Tried to spawn an app without a handler`);

  const stored = AppStore.get()[id];

  if (!stored) {
    MessageBox(
      {
        title: "Application not found",
        message: `An attempt was made to launch an application with ID <b>${id}</b> against parent ${parent}, but the application could not be found. Please check the name of the app and try again.`,
        buttons: [{ caption: "Okay", action() {} }],
        icon: MessageIcons.warning,
      },
      parent
    );

    return false;
  }

  const app = { ...stored };

  const rendererPid = RendererPid.get();

  if (!parent && rendererPid) parent = rendererPid;

  app.data = JSON.parse(JSON.stringify(app.data));

  return (
    (await KERNEL.stack.spawn(app.process, parent, app, ...args)) === "success"
  );
}

export async function spawnAppExternal(metadata, parent = undefined, ...args) {
  const meta = { ...metadata };
  const stack = KERNEL.getModule("stack");
  const rendererPid = RendererPid.get();
  const { default: process } = await import(meta.files.js);

  if (!parent && rendererPid) parent = rendererPid;

  return await stack.spawn(process, parent, { process, data: meta }, ...args);
}
