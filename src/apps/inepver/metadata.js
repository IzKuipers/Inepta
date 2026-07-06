export const InepVerApp = {
  metadata: {
    name: "About Inepta",
    version: "1.0.0",
    author: "Izaak Kuipers",
    icon: "./assets/inepta.svg",
  },
  size: { w: 500, h: 460 },
  minSize: { w: 500, h: 460 },
  maxSize: { w: 500, h: 460 },
  position: { x: 80, y: 80 },
  state: {
    resizable: false,
    minimized: false,
    maximized: false,
    fullscreen: false,
  },
  controls: {
    minimize: false,
    maximize: false,
    close: true,
  },
  files: {
    js: "../../apps/inepver/inepver.js",
    css: "./css/apps/inepver.css",
    html: "./apps/inepver/inepver.html",
  },
  hidden: true,
  core: false,
  id: "inepver",
};
