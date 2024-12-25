import { IneptaKernel } from "../kernel/index.js";
import { Log } from "../logging.js";
import { Process } from "../process/instance.js";
import { Sleep } from "../sleep.js";
import { StateError } from "./error.js";
import { StateProps, States } from "./store.js";

export class StateHandler extends Process {
  store = {};
  currentState;

  constructor(handler, pid, parentPid, store = States) {
    Log(
      "StateHandler.constructor",
      `Constructing new StateHandler with a store containing ${Object.entries(store).length} states`
    );

    super(handler, pid, parentPid);
    this.store = store;
  }

  stop() {
    throw new StateError("StateHandler was killed! Can't continue.");
  }

  async loadState({ html, css, js, name, identifier } = {}, props = {}, instant = false) {
    if (IneptaKernel().PANICKING && identifier != "crash-screen") return;

    if (!html || !css || !js || !name || !identifier)
      throw new StateError("Attempted state load invocation without valid metadata");

    const { htmlLoader, cssLoader, main } = this.getStateLoaders();

    StateProps[identifier] = props || {};

    if (!instant) {
      main.classList.add("hidden");

      await Sleep(400);
    }

    Log(`StateHandler.loadState`, `BEGINNING LOAD OF ${name} (${identifier})`);

    try {
      const htmlContents = await (await fetch(html)).text();

      htmlLoader.innerHTML = htmlContents;
      Log(`StateHandler.loadState`, ` -> Loaded ${html}`);
    } catch {
      throw new StateError(`${identifier}: Could not find required file ${html}`);
    }

    if (this.currentState) htmlLoader.classList.remove(this.currentState);

    htmlLoader.classList.add(`fullscreen`, identifier);
    cssLoader.href = css;
    Log(`StateHandler.loadState`, ` -> Loaded ${css}`);

    if (!instant) {
      await Sleep(500);

      main.classList.remove("hidden");
    }

    this.currentState = identifier;

    try {
      const { default: render } = await import(js);

      if (!render) throw new StateError(`${identifier}: No render function`);

      Log(`StateHandler.loadState`, ` -> Loaded ${js}`);
      Log(`StateHandler.loadState`, `==> Now entering ${name}`);
      await render();
    } catch (e) {
      throw new StateError(`${identifier}: ${e.stack}`);
    }
  }

  getStateLoaders() {
    const main = document.querySelector("#main");
    const cssLoader = document.getElementById("stateCSSLoader");
    const htmlLoader = document.getElementById("stateLoader");

    if (!cssLoader || !htmlLoader || !main)
      throw new StateError("Missing elements of state handling.");

    return { htmlLoader, cssLoader, main };
  }
}
