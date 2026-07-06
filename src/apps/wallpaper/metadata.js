export const WallpaperApp = {
  metadata: {
    name: "Wallpaper",
    version: "1.0.0",
    author: "Izaak Kuipers",
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
    js: "../../apps/wallpaper/wallpaper.js",
    css: "./css/apps/wallpaper.css",
    html: "./apps/wallpaper/wallpaper.html",
  },
  autoRun: true,
  core: true,
  id: "wallpaper",
};
