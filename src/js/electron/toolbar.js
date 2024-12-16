import { VERSION } from "../../env.js";
import { KernelModule } from "../kernel/module/index.js";
import { Log, LogType } from "../logging.js";
import { Store } from "../store.js";

const { BrowserWindow } = require("@electron/remote");

export class ToolbarModule extends KernelModule {
  fullscreen = Store(false);
  timeout;
  triggerTimeout;
  powerLogic;

  constructor(kernel, id) {
    super(kernel, id);
  }

  _init() {
    this.createToolbar();
    this.fullscreenListener();
    this.powerLogic = this._kernel.getModule("powerlogic");
    this.state = this._kernel.state;
  }

  createToolbar() {
    Log("ToolbarModule.createToolbar", "Fabricating a fresh toolbar");

    const toolbar = document.createElement("div");
    const trigger = document.createElement("div");
    const devtoolsToggle = document.createElement("button");
    const controlsWrapper = document.createElement("div");
    const minimizeButton = document.createElement("button");
    const maximizeButton = document.createElement("button");
    const closeButton = document.createElement("button");
    const caption = document.createElement("p");

    caption.className = "caption";
    caption.innerText = `${this._kernel.LIVE_MODE ? "LIVE - " : ""}Inepta v${VERSION.join(".")}`;

    if (this._kernel.LIVE_MODE) {
      document.body.classList.add("live");
    }

    trigger.className = "electron-toolbar-trigger";
    toolbar.className = "electron-toolbar retracted";
    controlsWrapper.className = "controls-wrapper";

    this.assignHoverEvents(trigger, toolbar);

    devtoolsToggle.className = "devtools-toggle lucide icon-bug";
    devtoolsToggle.addEventListener("click", () => this.toggleDevTools());

    minimizeButton.className = "minimize lucide icon-chevron-down";
    minimizeButton.addEventListener("click", () => this.minimize());

    maximizeButton.className = "maximize lucide icon-minimize";
    maximizeButton.addEventListener("click", () => this.toggleFullscreen());

    closeButton.className = "close lucide icon-x";
    closeButton.addEventListener("click", () => this.close());

    controlsWrapper.append(minimizeButton, maximizeButton, closeButton);
    toolbar.append(devtoolsToggle, controlsWrapper, caption);

    this.fullscreen.subscribe((v) => {
      if (v) {
        toolbar.classList.remove("hidden");
        trigger.classList.remove("hidden");
      } else {
        toolbar.classList.add("hidden");
        trigger.classList.add("hidden");
      }
    });

    document.body.append(trigger, toolbar);
  }

  fullscreenListener() {
    Log("ToolbarModule.fullscreenListener", "Assigning listeners for fullscreen changes");

    try {
      const window = BrowserWindow.getAllWindows()[0];

      window.on("enter-full-screen", () => {
        this.fullscreen.set(true);
      });

      window.on("leave-full-screen", () => {
        this.fullscreen.set(false);
      });

      this.fullscreen.set(window.fullScreen);
    } catch {
      Log(
        "ToolbarModule.fullscreenListener",
        "Failed to start fullscreen listener",
        LogType.warning
      );

      this.fullscreen.set(true);
    }
  }

  assignHoverEvents(trigger, toolbar) {
    Log("ToolbarModule.assignHoverEvents", "Assigning toolbar hover events");

    trigger.addEventListener("mouseover", () => {
      clearTimeout(this.timeout);
      clearTimeout(this.triggerTimeout);

      this.triggerTimeout = setTimeout(() => {
        toolbar.classList.remove("retracted");
      }, 200);
    });

    trigger.addEventListener("mouseleave", () => {
      clearTimeout(this.triggerTimeout);
    });

    toolbar.addEventListener("mouseover", () => {
      clearTimeout(this.timeout);
      clearTimeout(this.triggerTimeout);

      toolbar.classList.remove("retracted");
    });

    toolbar.addEventListener("mouseleave", () => {
      clearTimeout(this.triggerTimeout);

      this.timeout = setTimeout(() => {
        toolbar.classList.add("retracted");
      }, 1000);
    });
  }

  minimize() {
    try {
      BrowserWindow.getFocusedWindow().minimize();
    } catch {
      Log(
        "ToolbarModule.minimize",
        "Failed to call minimize on focused BrowserWindow",
        LogType.error
      );
    }
  }

  toggleFullscreen() {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow();

      if (focusedWindow.fullScreen == true) {
        focusedWindow.fullScreen = false;
      } else {
        focusedWindow.fullScreen = true;
      }
    } catch {
      Log(
        "ToolbarModule.fullscreen",
        "Failed to access focused BrowserWindow to toggle fullscreen",
        LogType.error
      );
    }
  }

  toggleDevTools() {
    try {
      const window = BrowserWindow.getAllWindows()[0];

      window.toggleDevTools();
    } catch {
      Log(
        "ToolbarModule.toggleDevTools",
        "Failed to access BrowserWindow to toggle developer tools",
        LogType.error
      );
    }
  }

  close() {
    if (
      this._kernel.state.currentState === "desktop" ||
      this._kernel.state.currentState === "login"
    )
      this.powerLogic.shutdown();
    else window.close();
  }
}
