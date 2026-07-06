/* ! NOTE: External application, don't EVER load into the app store */
const ProgManRunPromptApp = {
  metadata: {
    name: "Run...",
    version: "1.0.0",
    author: "Izaak Kuipers",
    icon: "./assets/apps/progman.svg",
  },
  size: { w: 350, h: 200 },
  minSize: { w: 350, h: 200 },
  maxSize: { w: 350, h: 200 },
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
    close: true,
  },
  files: {
    js: "../../apps/progman/runprompt/runprompt.js",
    css: "./css/apps/progman/runprompt.css",
    html: "./apps/progman/runprompt/runprompt.html",
  },
  hidden: true,
  core: false,
  id: "progManRunPromptApp",
};

export default ProgManRunPromptApp;
