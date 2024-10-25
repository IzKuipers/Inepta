import { KERNEL } from "../../env.js";
import { RegistryHives } from "../../js/registry/store.js";
import { Sleep } from "../../js/sleep.js";
import { ProgressBar } from "../../js/ui/progress.js";

export default async function render() {
  const status = document.querySelector("#stateLoader.boot-screen #status");
  const bottom = document.querySelector("#stateLoader.boot-screen div.bottom");
  const clone = KERNEL.getModule("clone");
  const registry = KERNEL.getModule("registry");

  const progressBar = new ProgressBar({
    indeterminate: true,
    barWidth: 250,
    barHeight: 7,
  });

  bottom.insertAdjacentElement("afterbegin", progressBar.bar);

  progressBar.setIndeterminate(true);

  if (clone.needsClone) {
    status.innerText = "Cloning filesystem";

    await Sleep(2000);

    progressBar.setIndeterminate(false);
    progressBar.setMax(clone.paths.length * 2);
    progressBar.setValue(0);

    let elapsed = 0;

    await clone.doClone((p) => {
      status.innerText = `Cloned ${p}`;

      elapsed++;

      progressBar.setValue(elapsed);
    });

    status.innerText = "Loading...";

    await Sleep(1000);

    location.reload();

    return;
  }

  if (!registry.getValue(RegistryHives.local, "initialSetup.completed")) {
    status.innerText = "Welcome to Inepta";
  }

  await Sleep(3000);

  KERNEL.state.loadState(KERNEL.state.store.login);
  console.trace();
}
