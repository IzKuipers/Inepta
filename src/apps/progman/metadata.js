import { AppIcons } from "../../js/images/apps.js";

export const ProgManApp = {
  metadata: {
    name: "Process Manager",
    version: "1.0.0",
    author: "Izaak Kuipers",
    icon: AppIcons.progman,
  },
  size: { w: 750, h: 500 },
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
    js: "../../apps/progman/progman.js",
    css: "./css/apps/progman.css",
    html: "./apps/progman/progman.html",
  },
  hidden: false,
  core: false,
  id: "progMan",
  children: ["../../apps/progman/runprompt/metadata.js"],
};
