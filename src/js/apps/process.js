import { Log, LogType } from "../logging.js";
import { Process } from "../process/instance.js";
import { Sleep } from "../sleep.js";
import { Store } from "../store.js";
import { AppRuntimeError } from "./error.js";
import { spawnAppExternal } from "./spawn.js";

// The AppProcess class: the very class that apps are built from
export class AppProcess extends Process {
  // Reason for a potential crash
  crashReason = "";
  // { app, AppProcess }
  app;
  // Store to get/set the Window Title (used by the renderer)
  windowTitle = Store("");
  // Any child apps from app.data.children
  children = {};

  constructor(handler, pid, parentPid, app) {
    super(handler, pid, parentPid);

    // Initialize base variables
    this.app = app;
    this.app.data = JSON.parse(JSON.stringify({ ...app.data }));
    this.app.meta = JSON.parse(JSON.stringify({ ...app.data }));
    this.app.id = app.data.id;
    this.windowTitle.set(app.data.metadata.name);
    this.name = app.data.id;

    // Assign the base dispatch subscribers for an app
    this.assignDispatchSubscribers();
  }

  async start() {
    // Register app children when the process (not the app) starts
    await this.registerChildren();
  }

  // Utility function for getting an element in the scope of the app's HTML
  getElement(querySelector, error = false) {
    const element = document.querySelector(
      `div.window[data-pid="${this._pid}"] > div.body ${querySelector}`
    );

    if (error && !element) {
      throw new AppRuntimeError(`${this._pid}: No such element ${querySelector}`);
    }

    return element;
  }

  getWindow() {
    const window = document.querySelector(`div.window[data-pid="${this._pid}"]`);

    return window || undefined;
  }

  getBody() {
    const body = document.querySelector(`div.window[data-pid="${this._pid}"]`);

    return body || undefined;
  }

  // Utility function for getting elements in the scope of the app's HTML
  getElements(querySelector, error = false) {
    const element = document.querySelectorAll(
      `div.window[data-pid="${this._pid}"] > div.body ${querySelector}`
    );

    if (error && !element.length) {
      throw new AppRuntimeError(`${this._pid}: No such elements ${querySelector}`);
    }

    return element;
  }

  // Conditional function that can prohibit closing if it returns false
  async onClose() {
    return true;
  }

  // Function to gracefully close the app window and then kill the process
  async closeWindow() {
    // Can the window close?
    const canClose = this._disposed || (await this.onClose());

    // Nope; stop.
    if (!canClose) return;

    // Get the window and the taskbar button of the window
    const elements = [
      ...document.querySelectorAll(`div.window[data-pid="${this._pid}"]`),
      ...(document.querySelectorAll(`button.opened-app[data-pid="${this._pid}"]`) || []),
    ];

    // No window and no taskbar button? Kill.
    if (!elements.length) return this.killSelf();

    // Add the closing class to each located element
    for (const element of elements) {
      element.classList.add("closing");
    }

    // Wait 300ms for the window close animation to finish
    await Sleep(300);

    // Kill.
    this.killSelf();
  }

  /**
   * Function for handling errors within the application:
   *
   * This function constantly monitors the `crashReason` variable. If it changes, an exception is thrown with the reason as
   * its message. This will then be picked up by the AppRenderer, which handles the crash dialog (provided the app isn't disposed).
   *
   * This method only works effectively if EVERY callback within the app's process is wrapped in the `this.safe()` function
   * found in this AppProcess class.
   */
  async CrashDetection() {
    while (true) {
      if (this.crashReason) {
        throw new AppRuntimeError(this.crashReason);
      }

      if (this._disposed) {
        throw new Error("Disposed");
      }

      await Sleep(1);
    }
  }

  /**
   * Wrapper function for safely handling errors thrown because of callbacks
   *
   * This works by setting the `crashReason` variable if an exception occurs during the code execution of the provided callback.
   * This ensures that only the app crashes, not Inepta entirely. It's also why every callback has to be wrapped in this function, for example:
   *
   * button.addEventListener("click", this.safe(async () => {
   *   await someOperationThatMightErrorSomehow();
   * }))
   */
  safe(callback) {
    return (...args) => {
      try {
        if (this._disposed) return;

        callback(...args);
      } catch (e) {
        Log(`AppProcess::'${this._pid}'.safe`, e.message, LogType.error);

        this.crashReason = e.stack;
      }
    };
  }

  // Helper function that adds an event to an element, making it safe in the process
  listener(element, event, callback) {
    element.addEventListener(
      event,
      this.safe((e) => callback(e))
    );
  }

  // Function called by the renderer when the HTML of the app is loaded. Intended to be overridden by child classes.
  render() {}

  // SingleInstance: makes sure that an app can only be launched once at a time
  getSingleInstanceLock() {
    const { renderer } = this.handler;

    const instances = renderer.getAppInstances(this.app.data.id, this._pid);

    return !instances.length;
  }

  // Function to terminate the process if it's not the first (and therefor only) instance
  closeIfSecondInstance() {
    const hasLock = this.getSingleInstanceLock();

    if (!hasLock) this.killSelf();
  }

  // Assign default dispatch calls to the process' dispatch
  assignDispatchSubscribers() {
    this.dispatch.subscribe(
      "close-window",
      this.safe(() => {
        // When received: closes the window
        this.closeWindow();
      })
    );

    this.dispatch.subscribe(
      "close-second-instance",
      this.safe(() => {
        // When received: terminates if second instance
        this.closeIfSecondInstance();
      })
    );

    this.dispatch.subscribe(
      "panic-button",
      this.safe(() => {
        // When received: causes the app to crash on command
        throw new Error("Panic!");
      })
    );
  }

  // Application children: child metadata listed in `app.data.children`, which contains supportive applications that
  // add to the functionality of the app. Children are loaded when the app process is spawned, and do not reside in
  // the global App Store, rather in this class instance.
  async registerChildren() {
    Log(
      `AppProcess::'${this._pid}'.registerChildren`,
      `Locating and loading contents of app.data.children`
    );

    // Get the children from the app metadata
    const children = this.app.data.children;

    // No children? No problem. (that's not me implying anything, hol' up)
    if (!children) return;

    // For every found child...
    for (const childMetaPath of children) {
      Log(`AppProcess::'${this._pid}'.registerChildren`, `Attempting import of ${childMetaPath}`);

      try {
        const { default: meta } = await import(childMetaPath); // Import the child's metadata

        if (!meta) continue; // No meta? skip it.

        // Add the metadata of the child to the Child Store
        this.children[meta.id] = meta;
      } catch {
        // Make note if anything went wrong
        Log(
          `AppProcess::'${this._pid}'.registerChildren`,
          `Attempting import of ${childMetaPath} failed!`,
          LogType.error
        );

        continue; // Error? Continue.
      }
    }
  }

  // Function to spawn a child that's loaded by registerChildren()
  async spawnChild(id, ...args) {
    // Get the child
    const child = this.children[id];

    // No child? stop.
    if (!child) return false;

    // Spawn the child
    return await spawnAppExternal(child, this._pid, this.userId, ...args);
  }

  // Wrapper function for quickly assigning a right-click (context) menu to an element
  contextMenu(element, optionsCallback) {
    element.addEventListener(
      "contextmenu",
      this.safe(async (e) => {
        // Spawn the menu, awaiting optionsCallback for the options to display
        this.context.showMenu(e.clientX, e.clientY, await optionsCallback());
      })
    );
  }

  // Wrapper function for quickly assigning a right-click (context) menu to an element
  clickMenu(element, optionsCallback) {
    element.addEventListener(
      "click",
      this.safe(async (e) => {
        const { x, y: clientY, height } = e.target.getBoundingClientRect(); // Get the required bounding rect values
        const y = clientY + height + 2; // Menu Y position: the Y position of the element, plus the height of the element, plus 2

        // Spawn the menu, awaiting optionsCallback for the options to display
        this.context.showMenu(x, y, await optionsCallback());
      })
    );
  }
}
