import { KERNEL } from "../../env.js";
import { Sleep } from "../../js/sleep.js";

export default async function render() {
  const clone = KERNEL.getModule("clone");

  const statusText = document.querySelector("#stateLoader.first-run #statusText");
  const progressText = document.querySelector("#stateLoader.first-run #progressText");
  const circlesDiv = document.querySelector("#stateLoader.first-run .circles");

  await displayStatus("Welcome");
  await displayStatus("Getting Inepta ready for you");
  await displayStatus("This will take a minute or two.");

  async function displayStatus(status) {
    const interTime = statusText.innerText ? 700 : 0;
    statusText.classList.add("hidden");
    await Sleep(850);
    statusText.innerText = status;
    await Sleep(interTime);
    statusText.classList.remove("hidden");
    await Sleep(2000);
  }

  circlesDiv.classList.add("visible");
  progressText.innerHTML = "Preparing filesystem &mdash; 0% Complete";

  const itemLength = clone.paths.length * 2;
  let doneItems = 0;

  await clone.doClone(() => {
    doneItems++;
    progressText.innerHTML = `Preparing filesystem &mdash; ${Math.floor(
      (100 / itemLength) * doneItems
    )}% complete`;
  });

  circlesDiv.classList.remove("visible");

  await Sleep(300);

  progressText.innerHTML = "";

  await displayStatus("Restarting Inepta");
  statusText.classList.add("hidden");

  await Sleep(800);

  location.reload();
}
