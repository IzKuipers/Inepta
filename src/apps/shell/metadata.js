export const ShellApp = {
  metadata: {
    name: "Shell",
    version: "1.0.0",
    author: "Izaak Kuipers",
    icon: "./assets/inepta.svg",
  },
  size: { w: NaN, h: NaN },
  minSize: { w: NaN, h: NaN },
  maxSize: { w: NaN, h: NaN },
  position: { x: 0, y: 0 },
  state: {
    resizable: false,
    minimized: false,
    maximized: false,
    fullscreen: true,
  },
  controls: {
    minimize: false,
    maximize: false,
    close: true,
  },
  files: {
    js: "../../apps/shell/shell.js",
    css: "./css/apps/shell.css",
    html: "./apps/shell/shell.html",
  },
  autoRun: true,
  core: true,
  id: "shell",
};
