import { IneptaKernel } from "../../js/kernel/index.js";
import { Sleep } from "../../js/sleep.js";

export default async function render() {
  const clone = IneptaKernel().getModule("clone");

  const statusText = document.querySelector("#stateLoader.first-run #statusText");
  const progressText = document.querySelector("#stateLoader.first-run #progressText");
  const circlesDiv = document.querySelector("#stateLoader.first-run .circles");

  const startTime = new Date().getTime();
  await displayStatus("Hi there");
  await displayStatus("Preparing Inepta\nDon't turn off your device", "shrunk");

  async function displayStatus(status, className) {
    const interTime = statusText.innerText ? 700 : 0;

    statusText.classList.add("hidden");

    await Sleep(850);

    statusText.classList.add(className);
    statusText.innerText = status;

    await Sleep(interTime);

    statusText.classList.remove("hidden");

    await Sleep(2000);
  }

  const endTime = new Date().getTime();
  const duration = endTime - startTime;

  circlesDiv.classList.add("visible");
  progressText.innerHTML = "Deploying filesystem &mdash; 0% Complete";

  const itemLength = clone.paths.length;
  let doneItems = 0;

  await clone.doClone(async () => {
    const percentage = Math.floor((100 / itemLength) * doneItems);

    doneItems++;

    progressText.innerHTML = `Deploying filesystem &mdash; ${percentage}% complete`;

    await Sleep(10);
  });

  circlesDiv.classList.remove("visible");

  await Sleep(300);

  progressText.innerHTML = "";

  await displayStatus("Almost ready");
  statusText.classList.add("hidden");

  await Sleep(800);

  location.reload();
}
