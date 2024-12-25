import { IneptaKernel } from "./kernel/index.js";
import { Log, LogStore, LogType } from "./logging.js";

// Crash processes global errors & unhandled rejections to send the user to the crash screen
export function Crash(reason) {
  // Are we crashing?
  if (IneptaKernel().PANICKED) return; // yes; stop.

  // We sure are crashing now
  IneptaKernel().PANICKED = true;

  // Make note of the crash
  Log(`Crash`, `### ---![ WE ARE CRASHING! ]!--- ###`, LogType.critical);
  Log(`Crash`, reason.error ? reason.error.message : reason.reason.message, LogType.critical);

  const str = `**** INEPTA EXCEPTION ****\n\nAn error has occurred, and Inepta has been halted.\nDetails of the error and the system log can be found below.\nNewest log entry is at the top.\n\nIf this keeps happening, try unloading any sideloaded applications.\n\n`;
  const stack = reason.error ? reason.error.stack : reason.reason.stack;

  let text = str;

  text += stack;
  text = text.replaceAll(location.href, "./");

  text += `\n\n${LogStore.map(
    ({ type, kernelTime, source, message }) =>
      `[${kernelTime.toString().padStart(8, "0")}] ${LogType[type]} ${source}: ${message}`
  )
    .reverse()
    .join("\n")}`;

  // Get the currently loaded StateHandler
  const state = IneptaKernel().getModule("state");

  // Load the crash state
  state.loadState(state.store.crash, { text }, true);
}

export function ManualCrash(text) {
  // Get the currently loaded StateHandler
  const state = IneptaKernel().getModule("state");

  // Load the crash state
  state.loadState(state.store.crash, { text }, true);
}
