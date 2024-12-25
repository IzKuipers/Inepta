/**
 * App Renderer class
 *
 * Created by Izaak Kuipers.
 *
 * The class responsible for putting all windows on the screen, regardless of what state we're in. This class
 * should be initialized once by the Process Handler when it is constructed by the Kernel, nowhere else.
 *
 * Original Filename: src/js/apps/renderer.js
 *
 * - Izaak Kuipers <izaak.kuipers@gmail.com>
 *   24-Oct-2024, 6:02 PM
 */

import { RendererPid } from "../../env.js";
import { MessageBox } from "../desktop/message.js";
import { AppIcons } from "../images/apps.js";
import { MessageIcons } from "../images/msgbox.js";
import { IneptaKernel } from "../kernel/index.js";
import { KernelModule } from "../kernel/module/index.js";
import { Draggable } from "../neodrag.js";
import { ProcessDispatch } from "../process/dispatch.js";
import { Process } from "../process/instance.js";
import { RegistryHives } from "../registry/store.js";
import { Sleep } from "../sleep.js";
import { Store } from "../store.js";
import { htmlspecialchars } from "../util.js";
import { AppRendererError } from "./error.js";

const { randomUUID } = require("crypto");

export class AppRenderer extends Process {
  currentState = [];
  target;
  maxZIndex = 1e6;
  focusedPid = Store(-1);

  constructor(handler, pid, parentPid, target) {
    super(handler, pid, parentPid); // Let's first initialize the Process

    // Get the element where apps should be rendered
    const targetDiv = document.getElementById(target);

    // No target? No apps. It's just that simple.
    if (!targetDiv)
      throw new AppRendererError("Tried to create an app renderer on a non existent element");

    this.target = targetDiv; // Move the target to a class property
    RendererPid.set(this._pid); // Set the global Renderer PID to this process
  }

  // disposedCheck: a function used to determine whether or not the renderer was killed. This function
  // has to be called in every other function to stop the rendering as soon as possible.
  disposedCheck() {
    if (this._disposed) {
      throw new AppRendererError(`AppRenderer with PID ${this._pid} was killed`);
    }
  }

  // Sync function: used to check for windows that have been spawned, and windows that are destroyed.
  sync() {
    this.disposedCheck(); // Are we disposed?
    this.syncNewbies(); // Render any newly spawned processes
    this.syncDisposed(); // Destroy any disposed processes
  }

  // Function to render any newly spawned processes
  syncNewbies() {
    this.disposedCheck(); // Are we disposed?

    // The array that contains all new app processes
    const appProcesses = [];

    // For every process in the ProcessHandler...
    for (const [_, proc] of [...this.handler.store.get()]) {
      // If it's an app and it's not disposed, add it
      if (proc.app && !proc._disposed) appProcesses.push(proc);
    }

    // For every app process...
    for (const process of appProcesses) {
      // Get the instances of the app process from the current renderer state
      const presentInstances = this.currentState.filter((p) => p == process._pid);

      // Are there no instances, and is the process an app?
      if (!presentInstances.length && process.app) {
        // Then add the instance PID to the current state ...
        this.currentState.push(process._pid);

        // ... and render the app.
        this.render(process);
      }
    }
  }

  syncDisposed() {
    this.disposedCheck(); // Are we disposed?

    // For every process in the current renderer state...
    for (const pid of this.currentState) {
      // Get the process via its PID...
      const process = this.handler.getProcess(pid);

      // Does it still exist? Stop.
      if (process) continue;

      // It's gone! Get rid of the window.
      this.remove(pid);
    }
  }

  /**
   * render: the main renderer function of the App Renderer.
   *
   * This function is called for every app to get its window rendered on the screen for the user to
   * interact with. It's arguably the most important function of the Inepta UI. It takes the AppProcess
   * instance of the app, and renders out an HTML window, after which it adds that window to the renderer's
   * target (with a bunch of stuff in between).
   *
   * It's also responsible for handling errors in the app runtime, and making sure those errors are displayed
   * to the user in a dialog.
   */
  async render(process) {
    this.disposedCheck(); // Are we disposed?

    if (process._disposed) return; // Is the process disposed?

    const window = document.createElement("div"); // The main window div
    const titlebar = this._renderTitlebar(process); // The titlebar
    const body = document.createElement("div"); // The body of the window
    const styling = document.createElement("link"); // The <link> used to load the CSS

    const { app } = process; // The app data
    const { data } = app; // The metadata from the app dat

    styling.rel = "stylesheet"; // Set the <link> type to stylesheet
    styling.href = data.files.css; // Set the href of the <link> to the URL from the metadata
    styling.id = `$${process._pid}`; // Add the PID of the process to the <link>'s ID

    document.body.append(styling); // Append the <link> to the body of the page

    await Sleep(100); // Wait for the CSS to load (CSS issues? try increasing this value.)

    await this._windowHtml(body, data); // Add the app's body HTML to the window

    body.className = "body"; // Set the body class

    window.className = "window"; // Set the window class
    window.setAttribute("data-pid", process._pid); // Add the process PID to the window
    window.setAttribute("data-id", data.id); // add the app Id to the window
    window.append(titlebar, body); // Append the titlebar and body to the window
    window.classList.add(data.id); // Add the app ID to the window class

    // Add additional classes and style attributes to the window based on the metadata
    this._windowClasses(window, data);
    // Drag the window and listen for `focusedPid` changes
    this._windowEvents(process._pid, window, titlebar, data);

    // Finally, add the window HTML to the body before letting the JS loose.
    this.target.append(window);

    try {
      await process.render(); // Call the render() function of the process
      this.focusPid(process._pid); // Focus the window
      await process.CrashDetection(); // Start the Crash Detection
    } catch (e) {
      // Only show the error message if the app isn't disposed
      if (!process._disposed) {
        // The HTML of the error message
        this.notifyCrash(data, e, process);
      }

      await Sleep(0); // Wait for the next frame
      await this.handler.kill(process._pid); // Kill the process
    }
  }

  // _windowClasses: adds basically anything regarding size, state and position to the window classes and style attribute.
  _windowClasses(window, data) {
    this.disposedCheck(); // Are we disposed?

    // Is it a core window? then no classes necessary.
    if (data.core) window.classList.add("core");
    else {
      // WIDTH & HEIGHT
      window.style.maxWidth = `${data.maxSize.w}px`;
      window.style.maxHeight = `${data.maxSize.h}px`;
      window.style.minWidth = `${data.minSize.w}px`;
      window.style.minHeight = `${data.minSize.h}px`;
      window.style.width = `${data.size.w}px`;
      window.style.height = `${data.size.h}px`;

      // Window centering
      if (data.position.centered) {
        // Predefined X, OR (bodyWidth - windowWidth) / 2
        const x = data.position.x || (document.body.offsetWidth - data.size.w) / 2;
        // Predefined Y, OR (bodyHeight - windowHeight) / 2
        const y = data.position.y || (document.body.offsetHeight - data.size.h) / 2;

        window.style.top = `${y}px`; // Set the Y position
        window.style.left = `${x}px`; // Set the X position
        window.style.transform = `translate3d(0px, 0px, 0px)`; // Predefine the transform for Neodrag
      } else if (`${data.position.x}` && `${data.position.y}`) {
        window.style.top = `${data.position.y}px`; // Set the X position
        window.style.left = `${data.position.x}px`; // Set the Y position
      } else {
        // No valid positional information? Crash.
        throw new Error(`Attempted to create a window without valid position`);
      }

      // Resizable makes the window, well, resizable.
      if (data.state.resizable) window.classList.add("resizable");
    }
  }

  // Function for centering a window after its initial rendering procedure
  centerWindow(pid) {
    this.disposedCheck(); // Are we disposed?

    // Get the window
    const window = this.target.querySelector(`div.window[data-pid="${pid}"]`);

    // No window? No center.
    if (!window) return;

    // Calculate the X and Y positions
    const x = (document.body.offsetWidth - window.offsetWidth) / 2;
    const y = (document.body.offsetHeight - window.offsetHeight) / 2;

    // Set the X and Y positions
    window.style.top = `${y}px`;
    window.style.left = `${x}px`;
  }

  // Window events: stuff like dragging and focusedPid
  _windowEvents(pid, window, titlebar, data) {
    this.disposedCheck();

    if (data.core) return; // Core applications don't need any fancy things

    // Intialize Neodrag, legacyTranslate and gpuAcceleration are turned off because they break CSS scale animations
    new Draggable(window, {
      bounds: { top: 0, left: 0, right: 0 },
      handle: titlebar,
      cancel: `.controls`,
      legacyTranslate: false,
      gpuAcceleration: false,
    });

    // Focus the window if it's interacted with
    window.addEventListener("mousedown", () => {
      this.focusPid(pid);
    });

    // Subscribe to the focused pid, focusing the window as it changes
    this.focusedPid.subscribe((v) => {
      window.classList.remove("focused");

      if (v === pid) window.classList.add("focused");
    });
  }

  // Finds a window based on ID and focuses it
  focusPid(pid) {
    this.disposedCheck(); // Are we disposed?

    const currentFocus = this.focusedPid.get(); // Get the current focused PID
    const window = document.querySelector(`div.window[data-pid="${pid}"]`); // Get the target window

    // Unminimize the target PID
    this.unMinimize(pid);

    // No window or already focused? stop.
    if (!window || currentFocus === pid) return;

    this.maxZIndex++; // Increment the z-index threshold
    window.style.zIndex = this.maxZIndex; // Apply the new z-index threshold

    this.focusedPid.set(pid); // Update the store
  }

  // Gets the HTML of an app and applies it to the body of the window
  async _windowHtml(body, data) {
    this.disposedCheck(); // Are we disposed?

    try {
      const html = await (await fetch(data.files.html)).text(); // Get the HTML by fetching it

      body.innerHTML = html; // Apply it to the body
    } catch {
      // Error? File doesn't exist.
      throw new AppRendererError(`Failed to get HTML of ${data.id}`);
    }
  }

  // Creates and returns the window titlebar
  _renderTitlebar(process) {
    this.disposedCheck(); // Are we disposed?

    if (process.app.data.core) return ""; // Core apps don't need a titlebar

    const titlebar = document.createElement("div"); // The titlebar
    const title = document.createElement("div"); // titlebar > window title
    const titleIcon = document.createElement("img"); // titlebar > window title > icon
    const titleCaption = document.createElement("span"); // titlebar > window title > caption
    const controls = document.createElement("div"); // titlebar > controls

    controls.className = "controls"; // Set the controls class

    const { app } = process; // Get the app data from the process
    const { data } = app; // Get the metadata from the app data

    // minimize button
    if (data.controls.minimize) {
      const minimize = document.createElement("button");

      minimize.className = "minimize icon-chevron-down";
      // minimize.innerText = "chevron_down";
      minimize.addEventListener("click", () => this.toggleMinimize(process._pid));

      controls.append(minimize);
    }

    // maximize button
    if (data.controls.maximize) {
      const maximize = document.createElement("button");

      maximize.className = "maximize icon-chevron-up";
      // maximize.innerText = "chevron_up";
      maximize.addEventListener("click", () => this.toggleMaximize(process._pid));

      controls.append(maximize);
    }

    // close button
    if (data.controls.close) {
      const close = document.createElement("button");

      close.className = "close icon-x";
      // close.innerText = "";
      close.addEventListener("click", async () => {
        process.closeWindow();
      });

      titlebar.append(close);
    }

    titleCaption.innerText = `${data.metadata.name}`; // Set the window title caption
    titleIcon.src = data.metadata.icon || AppIcons.default; // Set the window icon

    // If the window title changes, reflect those changes in the titlebar
    process.windowTitle.subscribe((v) => {
      titleCaption.innerText = v;
    });

    // Context menu options for a titlebar
    process.contextMenu(titlebar, () => [
      // Just the app's name
      {
        caption: data.metadata.name,
        disabled: true,
        action: () => {},
        separator: true,
      },
      // Minimize action
      {
        caption: "Minimize",
        disabled: !data.controls.minimize,
        action: () => {
          this.toggleMinimize(process._pid);
        },
      },
      // Maximize action
      {
        caption: "Maximize",
        disabled: !data.controls.maximize,
        action: () => {
          this.toggleMaximize(process._pid);
        },
      },
      // Close action
      {
        caption: "Close",
        disabled: !data.controls.close,
        action: () => {
          process.closeWindow();
        },
      },
    ]);

    // Set the window title class
    title.className = "window-title";
    title.append(titleIcon, titleCaption);

    // Set the titlebar class
    titlebar.className = "titlebar";
    titlebar.append(title, controls);

    // Return the titlebar
    return titlebar;
  }

  async remove(pid) {
    this.disposedCheck(); // Are we disposed?

    if (!pid) return; // No pid? No removal.

    const window = this.target.querySelector(`div.window[data-pid="${pid}"]`); // The window
    const styling = document.body.querySelector(`link[id="$${pid}"`); // The imported CSS <link>

    if (window) window.remove(); // Remove the window
    if (styling) styling.remove(); // Unload the CSS
  }

  // Toggles the maximized state of the specified PID
  toggleMaximize(pid) {
    this.disposedCheck(); // Are we disposed?

    const window = this.target.querySelector(`div.window[data-pid="${pid}"]`); // Get the window by its PID

    if (!window) return; // No window? No problem.

    window.classList.toggle("maximized"); // Toggle the maximized state

    const process = this.handler.getProcess(+pid); // Get the process

    if (!process || !process.app) return; // No process or is the process not an app? Don't bother.

    // Update the maximized state of the app metadata
    process.app.data.state.maximized = window.classList.contains("maximized");
  }

  unMinimize(pid) {
    this.disposedCheck(); // Are we disposed?

    const window = this.target.querySelector(`div.window[data-pid="${pid}"]`); // Get the window by its PID

    if (!window) return; // No window? No problem.

    window.classList.remove("minimized"); // Remove the minimized class

    const process = this.handler.getProcess(+pid); // Get the process

    if (!process || !process.app) return; // No process or is the process not an app? Don't bother.

    // Update the minimized state of the app metadata
    process.app.data.state.minimized = false;
  }

  toggleMinimize(pid) {
    this.disposedCheck(); // Are we disposed?

    const window = this.target.querySelector(`div.window[data-pid="${pid}"]`); // Get the window by its PID

    if (!window) return; // No window? No problem.

    window.classList.toggle("minimized"); // Toggle the minimized state

    const process = this.handler.getProcess(+pid); // Get the process

    if (!process || !process.app) return; // No process or is the process not an app? Don't bother.

    // Update the minimized state of the app metadata
    process.app.data.state.minimized = window.classList.contains("minimized");
  }

  // Gets the instances of the provided app
  getAppInstances(id, origin = undefined) {
    const result = []; // The resulting instances

    // For every PID in the current state...
    for (const pid of this.currentState) {
      if (pid === origin) continue; // If the PID is equal to the originating PID, skip it.

      const proc = this.handler.getProcess(pid); // Get the process

      // Check if 1) the process is an app and 2) if the ID matches. If it matches, add it to the result
      if (proc && proc.app && proc.app.data && proc.app.data.id === id) result.push(proc);
    }

    // Return the result
    return result;
  }

  notifyCrash(data, e, process) {
    const lines = [
      `<b><code>${data.id}::'${data.metadata.name}'</code> (PID ${process._pid}) has encountered a problem and needs to close. I am sorry for the inconvenience.</b>`,
      `If you were in the middle of something, the information you were working on might be lost. You can choose to view the call stack, which may contain the reason for the crash.`,
      `<details><summary>Show call stack</summary><pre>${htmlspecialchars(
        e.stack.replaceAll(location.href, "")
      )}</pre></details>`,
    ];

    const uuid = randomUUID();

    const filteredProcess = Object.fromEntries(
      Object.entries(process).map(([k, v]) => {
        if (
          this.kernel.getModule(k) ||
          v instanceof Process ||
          v instanceof IneptaKernel ||
          v instanceof KernelModule ||
          v instanceof ProcessDispatch
        ) {
          return [k, undefined];
        }

        return [k, v];
      })
    );

    const crashReport = {
      appId: data.id,
      appName: data.metadata.name,
      pid: process._pid,
      stack: htmlspecialchars(e.stack.replaceAll(location.href, "")),
      timestamp: Date.now(),
      event: {
        name: e.name,
        message: e.message,
        stack: e.stack,
      },
      appData: data,
      crashId: uuid,
      process: filteredProcess,
    };

    this.registry.setValue(RegistryHives.local, `renderer.Crashes.${uuid}`, crashReport);

    // Show the error message. The options here should be self explanatory.
    MessageBox({
      title: `${data.metadata.name} - Application Error`,
      message: lines.join("<br><br>"),
      buttons: [
        {
          caption: "Okay",
          action() {},
        },
      ],
      icon: MessageIcons.critical,
    });
  }
}
