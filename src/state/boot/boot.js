import { IneptaKernel } from "../../js/kernel/index.js";
import { RegistryHives } from "../../js/registry/store.js";
import { Sleep } from "../../js/sleep.js";
import { ProgressBar } from "../../js/ui/progress.js";

export default async function render() {
  const status = document.querySelector("#stateLoader.boot-screen #status");
  const bottom = document.querySelector("#stateLoader.boot-screen div.bottom");
  const clone = IneptaKernel().getModule("clone");
  const registry = IneptaKernel().getModule("registry");

  const progressBar = new ProgressBar({
    indeterminate: true,
    barWidth: 250,
    barHeight: 7,
  });

  bottom.insertAdjacentElement("afterbegin", progressBar.bar);

  progressBar.setIndeterminate(true);

  if (!registry.getValue(RegistryHives.local, "initialSetup.completed")) {
    status.innerText = "Welcome to Inepta";
  }

  await Sleep(3000);

  if (clone.needsClone) {
    IneptaKernel().state.loadState(IneptaKernel().state.store.firstrun);
  } else {
    IneptaKernel().state.loadState(IneptaKernel().state.store.login);
  }
}
