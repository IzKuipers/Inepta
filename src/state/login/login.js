import { LoginApp } from "../../apps/loginapp/metadata.js";
import { RendererPid } from "../../env.js";
import { loadApp } from "../../js/apps/load.js";
import { spawnApp } from "../../js/apps/spawn.js";
import { AppStore } from "../../js/apps/store.js";

export default async function render() {
  AppStore.set({});

  await loadApp(LoginApp);
  await spawnApp("loginApp", RendererPid.get(), "SYSTEM");
}
