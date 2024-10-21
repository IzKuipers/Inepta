import remote from "@electron/remote/main/index.js";
import { execSync } from "child_process";
import { app, BrowserWindow, globalShortcut, nativeTheme } from "electron";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { VERSION } from "./src/env.js";

remote.initialize();

let window;

app.on("ready", async () => {
  await writeCommitHash();

  window = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    center: true,
    fullscreen: true,
    backgroundColor: "#000",
    title: `Inepta ${VERSION}`,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: "./inepta.png",
  });

  remote.enable(window.webContents);

  window.removeMenu();
  window.loadFile("src/index.html");

  window.on("maximize", () => {
    window.unmaximize();
    setTimeout(() => {
      window.fullScreen = true;
    });
  });

  window.webContents.on("devtools-opened", () => {
    toggleNativeTheme();
  });

  window.webContents.session.webRequest.onHeadersReceived(
    { urls: ["*://*/*"] },
    (d, c) => {
      if (d.responseHeaders["X-Frame-Options"]) {
        delete d.responseHeaders["X-Frame-Options"];
      } else if (d.responseHeaders["x-frame-options"]) {
        delete d.responseHeaders["x-frame-options"];
      }

      c({ cancel: false, responseHeaders: d.responseHeaders });
    }
  );

  globalShortcut.register("Ctrl+Shift+Alt+I", () => {
    if (window.isFocused()) window.toggleDevTools();
  });

  globalShortcut.register("Alt+Enter", () => {
    if (window.isFocused()) window.fullScreen = !window.fullScreen;
  });
});

function toggleNativeTheme() {
  // First, set the theme to 'light'
  nativeTheme.themeSource = "light";

  // After a short delay, set it to 'dark'
  setTimeout(() => {
    nativeTheme.themeSource = "dark";
  }, 100); // 100ms delay; adjust if necessary
}

async function writeCommitHash() {
  try {
    const hash = execSync(`git rev-parse HEAD`);

    if (!existsSync("env")) await mkdir("env");

    await writeFile("./env/HASH", hash);
  } catch (e) {
    console.log(e);
  }
}
