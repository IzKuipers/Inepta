import { LoginApp } from "../../apps/loginapp/metadata.js";
import { RendererPid } from "../../env.js";
import { loadApp } from "../../js/apps/load.js";
import { spawnApp } from "../../js/apps/spawn.js";
import { AppStore } from "../../js/apps/store.js";
import { Sleep } from "../../js/sleep.js";

export default async function render() {
  AppStore.set({});

  const appRenderer = document.querySelector("div#appRenderer");

  if (appRenderer) {
    appRenderer.classList.remove("no-anim");
    appRenderer.classList.remove("no-blur");
  }

  await loadApp(LoginApp);
  await spawnApp("loginApp", RendererPid.get(), "SYSTEM");

  document.addEventListener("keydown", async (e) => {
    if (e.key.toLowerCase() === "f8") {
      e.preventDefault();
      const links = document.querySelectorAll(`link[rel="stylesheet"]`);

      for (const link of links) {
        const href = `${link.href}`;

        link.href = "";
        await Sleep(100);
        link.href = href;
      }
    }
  });
}
