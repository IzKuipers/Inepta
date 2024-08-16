import { Log } from "../logging.js";
import { loadApp } from "./load.js";
import { builtInApps } from "./store.js";

export async function loadBuiltinApps() {
  Log("loadBuiltinApps", `Loading ${builtInApps.length} apps.`);

  for (const app of builtInApps) {
    await loadApp(app);
  }
}
