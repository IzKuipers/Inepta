import { Crash } from "../crash.js";
import { Log } from "../logging.js";

export function handleGlobalErrors() {
  Log("handleGlobalErrors", "Handling error, unhandledrejection");

  function error(e) {
    e.preventDefault();

    Crash(e);

    return true;
  }

  window.addEventListener("error", error, { passive: false });
  window.addEventListener("unhandledrejection", error, { passive: false });
}
