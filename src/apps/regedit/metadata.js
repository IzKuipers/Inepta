export const RegEditApp = {
  metadata: {
    name: "Registry Editor",
    version: "1.0.0",
    author: "Izaak Kuipers",
    icon: "./assets/apps/regedit.svg",
  },
  size: { w: 850, h: 560 },
  minSize: { w: 500, h: 500 },
  maxSize: { w: 1600, h: 1000 },
  position: { centered: true },
  state: {
    resizable: true,
    minimized: false,
    maximized: false,
    fullscreen: false,
  },
  controls: {
    minimize: true,
    maximize: true,
    close: true,
  },
  files: {
    js: "../../apps/regedit/regedit.js",
    css: "./css/apps/regedit.css",
    html: "./apps/regedit/regedit.html",
  },
  hidden: false,
  core: false,
  id: "regEditApp",
  children: ["../../apps/regedit/mutator/metadata.js"],
};
