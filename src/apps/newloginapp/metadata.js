export const NewLoginApp = {
  metadata: {
    name: "Log in to Inepta",
    version: "2.0.0",
    author: "Izaak Kuipers",
    icon: "./assets/apps/loginapp.svg",
  },
  size: { w: NaN, h: NaN },
  minSize: { w: NaN, h: NaN },
  maxSize: { w: NaN, h: NaN },
  position: { centered: true },
  state: {
    resizable: false,
    minimized: false,
    maximized: false,
    fullscreen: false,
  },
  controls: {
    minimize: false,
    maximize: false,
    close: false,
  },
  files: {
    js: "../../apps/newloginapp/newloginapp.js",
    css: "./css/apps/newloginapp.css",
    html: "./apps/newloginapp/newloginapp.html",
  },
  hidden: true,
  core: true,
  id: "newLoginApp",
};
