export const States = {
  boot: {
    js: "../../state/boot/boot.js",
    css: "./css/state/boot.css",
    html: "./state/boot/boot.html",
    name: "Boot",
    identifier: "boot-screen",
  },
  firstrun: {
    js: "../../state/firstrun/firstrun.js",
    css: "./css/state/firstrun.css",
    html: "./state/firstrun/firstrun.html",
    name: "First Run",
    identifier: "first-run",
  },
  crash: {
    js: "../../state/crash/crash.js",
    css: "./css/state/crash.css",
    html: "./state/crash/crash.html",
    name: "Aw, snap!",
    identifier: "crash-screen",
  },
  login: {
    js: "../../state/newlogin/newlogin.js",
    css: "./css/state/newlogin.css",
    html: "./state/newlogin/newlogin.html",
    name: "Login",
    identifier: "login",
  },
  desktop: {
    js: "../../js/desktop.js",
    css: "./css/state/desktop.css",
    html: "./state/desktop/desktop.html",
    name: "Desktop",
    identifier: "desktop",
  },
};

export const StateProps = {};

export function getStateProps(state) {
  const identifier = state.identifier;

  if (!identifier) return {};

  return StateProps[identifier] || {};
}
