export const CabinetApp = {
  metadata: {
    name: "File Cabinet",
    version: "1.0.0",
    author: "Izaak Kuipers",
    icon: "./assets/fs/folder.svg",
  },
  size: { w: 900, h: 650 },
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
    js: "../../apps/cabinet/cabinet.js",
    css: "./css/apps/cabinet.css",
    html: "./apps/cabinet/cabinet.html",
  },
  hidden: false,
  core: false,
  id: "cabinet",
};
