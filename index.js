import remote from "@electron/remote/main/index.js";
import { execSync } from "child_process";
import { app, BrowserWindow, globalShortcut, nativeTheme } from "electron";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { VERSION } from "./src/env.js";
import dotenv from "dotenv";

const { parsed } = dotenv.config({ debug: true });

remote.initialize();

let window;

app.on("ready", async () => {
  console.log("[Inepta] Entrypoint: READY.");

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

  if (parsed.LIVE_MODE == "1" || process.argv.includes("live"))
    window.webContents.userAgent += " LIVEMODE";

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

  window.webContents.session.webRequest.onHeadersReceived({ urls: ["*://*/*"] }, (d, c) => {
    if (d.responseHeaders["X-Frame-Options"]) {
      delete d.responseHeaders["X-Frame-Options"];
    } else if (d.responseHeaders["x-frame-options"]) {
      delete d.responseHeaders["x-frame-options"];
    }

    c({ cancel: false, responseHeaders: d.responseHeaders });
  });

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
    console.log("[Inepta] Entrypoint -> writeCommitHash: Executing git rev-parse HEAD");

    const hash = execSync(`git rev-parse HEAD`);

    if (!existsSync("env")) {
      console.log("[Inepta] Entrypoint -> writeCommitHash: Creating env directory");

      await mkdir("env");
    }

    console.log("[Inepta] Entrypoint -> writeCommitHash: Writing HASH");

    await writeFile("./env/HASH", hash);

    console.log("[Inepta] Entrypoint -> writeCommitHash: done.");
  } catch (e) {
    console.warn(`[Inepta] Entrypoint -> writeCommitHash: Couldn't write commit hash: ${e}`);
  }
}
