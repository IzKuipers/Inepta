import { LoginApp } from "../../apps/loginapp/metadata.js";
import { RendererPid } from "../../env.js";
import { loadApp } from "../../js/apps/load.js";
import { spawnApp } from "../../js/apps/spawn.js";
import { AppStore } from "../../js/apps/store.js";

export default async function render() {
  AppStore.set({});

  const appRenderer = document.querySelector("div#appRenderer");

  if (appRenderer) {
    appRenderer.classList.remove("no-anim");
    appRenderer.classList.remove("no-blur");
  }

  await loadApp(LoginApp);
  await spawnApp("loginApp", RendererPid.get(), "SYSTEM");
}
