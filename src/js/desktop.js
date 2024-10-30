import { loadApp } from "./apps/load.js";
import { spawnApp } from "./apps/spawn.js";
import { LogStore } from "./logging.js";
import { Sleep } from "./sleep.js";
import { StateError } from "./state/error.js";
import { UserData } from "./user/data.js";

// Renderer function invoked when the Desktop state is being loaded
export default async function render() {
  // Get the state loader (note the "desktop" class at the end)
  const stateLoader = document.querySelector("#stateLoader.desktop");

  // Are we being loaded properly?
  if (!stateLoader)
    // Nope; stop.
    throw new StateError("Desktop render invocation outside StateLoader!");

  // Subscribing to the user preferences...
  UserData.subscribe((v) => {
    // No preferences? Stop.
    if (!v) return;

    // Set the theme attribute of the state loader according to the user's preferences
    stateLoader.setAttribute("data-theme", v.theme || "dark");
  });

  // DEBUG AREA STARTS HERE ///////////////////////////////////////////////////////////////////////

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
