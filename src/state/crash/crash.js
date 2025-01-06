import { IneptaKernel } from "../../js/kernel/index.js";
import { LogStore } from "../../js/logging.js";
import { RegistryHives } from "../../js/registry/store.js";
import { getStateProps } from "../../js/state/store.js";

export default async function render() {
  const crashText = document.getElementById("crashText");

  if (!crashText) return;

  const appRenderer = document.querySelector("div#appRenderer");

  appRenderer.remove();

  const { text } = getStateProps(IneptaKernel().state.store.crash);

  crashText.innerText = text;

  try {
    const fs = IneptaKernel().getModule("fs");
    const registry = IneptaKernel().getModule("registry");
    const now = new Date().getTime().toString();
    const logPath = `./System/CrashLogs/${now}.log`;

    const crashes = registry.getValue(RegistryHives.kernel, "Crashes") || {};
    const logs = {};

    for (let i = 0; i < LogStore.length; i++) {
      logs[`LogItem#${i}`] = LogStore[i];
    }

    crashes[now] = {
      text,
      logPath,
      logs,
    };

    registry.setValue(RegistryHives.kernel, "Crashes", crashes);

    await fs.writeFile(logPath, crashText.innerText, "SYSTEM");
  } catch (e) {
    alert(e);
  }

  throw text;
}
