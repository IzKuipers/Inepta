export const NapkinApp = {
  metadata: {
    name: "Napkin",
    version: "1.0.0",
    author: "Izaak Kuipers",
    icon: "./assets/fs/file.svg",
  },
  size: { w: 480, h: 360 },
  minSize: { w: 400, h: 300 },
  maxSize: { w: NaN, h: NaN },
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
    js: "../../apps/napkin/napkin.js",
    css: "./css/apps/napkin.css",
    html: "./apps/napkin/napkin.html",
  },
  hidden: false,
  core: false,
  id: "napkin",
};
