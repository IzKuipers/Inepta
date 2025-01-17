import { AppRuntimeError } from "../../js/apps/error.js";
import { AppProcess } from "../../js/apps/process.js";
import { spawnApp } from "../../js/apps/spawn.js";
import { AppStore } from "../../js/apps/store.js";
import { strftime } from "../../js/desktop/date.js";
import { MessageBox } from "../../js/desktop/message.js";
import { MessageIcons } from "../../js/images/msgbox.js";
import { IneptaKernel } from "../../js/kernel/index.js";
import { Store } from "../../js/store.js";
import { UserData } from "../../js/user/data.js";

class _shellProc extends AppProcess {
  powerLogic;
  startOpened = Store(false);
  startPopulated = false;
  userData;
  usernameField;
  shutdownButton;
  startButton;
  startMenu;
  appList;

  forceLaunch = false;

  constructor(handler, pid, parentPid, app, forceLaunch = false) {
    super(handler, pid, parentPid, app);

    this.powerLogic = IneptaKernel().getModule("powerlogic");
    this.environment.setProperty("SHELLPID", this._pid);
    this.forceLaunch = forceLaunch;
  }

  render() {
    const stateHandler = this.kernel.getModule("state");
    const { currentState } = stateHandler;

    if (currentState !== "desktop" && !this.forceLaunch) {
      throw new AppRuntimeError(`Can't launch Shell: invalid context`);
    }

    this.checkSafeShutdown();

    this.userData = UserData.get();
    this.usernameField = this.getElement("#startMenu #username", true);
    this.shutdownButton = this.getElement("#startMenu #shutdown", true);
    this.restartButton = this.getElement("#startMenu #restart", true);
    this.logoutButton = this.getElement("#startMenu #logout", true);
    this.startButton = this.getElement("#startButton", true);
    this.startMenu = this.getElement("#startMenu", true);
    this.appList = this.getElement("#appList", true);

    this.handler.renderer.target.classList.toggle("no-blur", !!this.userData.noBlur);
    this.handler.renderer.target.classList.toggle("no-anim", !!this.userData.noAnim);

    this.startActiveAppsPopulator();
    this.startOutsideTrigger();
    this.startClock();
    this.initializeStartMenu();
    this.powerButtons();

    AppStore.subscribe((v) => {
      if (!v) return;

      this.populateAppList();
    });

    this.handler.renderer.focusedPid.subscribe(
      this.safe((v) => {
        this.updateActiveAppsFocus(v);
      })
    );
  }

  startActiveAppsPopulator() {
    const activeApps = this.getElement("#activeApps");

    if (!activeApps) throw new AppRuntimeError("Failed to find #activeApps div");

    const populate = this.safe((v = this.handler.store.get()) => {
      activeApps.innerHTML = "";

      for (const [pid, proc] of [...v]) {
        if (!proc.app || proc.app.data.core || proc._disposed) continue;

        const button = document.createElement("button");

        button.setAttribute("data-pid", pid);
        button.className = `${proc.app.data.id} opened-app`;
        button.innerText = button.title = proc.app.data.metadata.name;

        button.addEventListener(
          "click",
          this.safe(() => {
            this.handler.renderer.focusPid(pid);
          })
        );

        this.contextMenu(button, () => [
          {
            caption: proc.windowTitle.get() || proc.app.data.metadata.name,
            disabled: true,
          },
          proc.app.data.hidden
            ? undefined
            : {
                caption: `New ${proc.app.data.metadata.name} window`,
                action: this.safe(async () => {
                  await spawnApp(
                    proc.app.data.id,
                    this.environment.getProperty("SHELLPID"),
                    this.userId
                  );
                }),
                separator: true,
              },
          {
            caption: "Close window",
            action: this.safe(() => {
              const dispatch = this.handler.ConnectDispatch(pid);

              dispatch.dispatch("close-window");
            }),
          },
          {
            caption: "Kill process",
            action: this.safe(() => {
              this.handler.kill(proc._pid);
            }),
          },
        ]);

        proc.windowTitle.subscribe((v) => {
          button.innerText = button.title = v;
        });

        activeApps.append(button);
      }
    });

    this.handler.store.subscribe(populate);
  }

  updateActiveAppsFocus(focusedPid = this.handler.renderer.focusedPid.get()) {
    const activeApps = this.getElement("#activeApps");

    if (!activeApps) throw new AppRuntimeError("Failed to find #activeApps div");

    for (const button of activeApps.children) {
      const pid = button.getAttribute("data-pid");

      button.classList.remove("focused", "minimized");
      if (parseInt(pid) === focusedPid) button.classList.add("focused");

      const process = this.handler.getProcess(+pid);

      if (process && process.app && process.app.data.state.minimized) {
        button.classList.add("minimized");
      }
    }
  }

  populateAppList() {
    const appList = this.appList;
    const apps = AppStore.get();

    this.appList.innerHTML = "";

    for (const [id, app] of Object.entries(apps)) {
      if (!app || !app.data || app.data.hidden || app.data.core) continue;

      const button = document.createElement("button");
      const icon = document.createElement("img");
      const caption = document.createElement("span");

      caption.innerText = app.data.metadata.name;
      caption.className = "caption";

      icon.className = "icon";
      icon.src = app.data.metadata.icon || "./assets/apps/application.svg";

      button.append(icon, caption);

      button.addEventListener(
        "click",
        this.safe(() => {
          this.startOpened.set(false);
          spawnApp(id, this._pid, this.userId);
        })
      );

      appList.append(button);
    }
  }

  initializeStartMenu() {
    UserData.subscribe(
      this.safe((v) => {
        if (!v) return;

        if (!v.username) {
          MessageBox({
            title: "Property not registered",
            message:
              "UserData.username<br><br>Failed to get Username from the UserData store. This probably means that the Shell was opened in suboptimal conditions.",
            buttons: [{ caption: "Okay", action() {} }],
            icon: MessageIcons.warning,
          });
        }

        this.usernameField.innerText = v.username;
      })
    );

    this.startButton.addEventListener(
      "click",
      this.safe(() => {
        this.startOpened.set(!this.startOpened.get());
      })
    );

    this.startOpened.subscribe(
      this.safe((v) => {
        this.startMenu.classList.remove("opened");
        if (v) this.startMenu.classList.add("opened");

        this.startButton.classList.remove("opened");
        if (v) this.startButton.classList.add("opened");
      })
    );
  }

  startClock() {
    const clock = this.getElement(".taskbar #clock");

    if (!clock) throw new AppRuntimeError(`Silly me, there's no clock!`);

    const tick = this.safe(() => {
      clock.innerText = strftime("%l:%M %p");
    });
    setInterval(tick, 500);
    tick();
  }

  startOutsideTrigger() {
    const startMenu = this.getElement("#startMenu", true);
    const startButton = this.getElement("#startButton", true);

    document.addEventListener(
      "click",
      this.safe((e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (!e.composedPath().includes(startMenu) && !e.composedPath().includes(startButton)) {
          this.startOpened.set(false);
        }
      })
    );
  }

  powerButtons() {
    this.restartButton.addEventListener("click", () => {
      this.powerLogic.restart();
    });
    this.shutdownButton.addEventListener("click", () => {
      this.powerLogic.shutdown();
    });
    this.logoutButton.addEventListener("click", () => {
      this.powerLogic.logoff();
    });
  }

  checkSafeShutdown() {
    const shutdownProperly = this.powerLogic.getRegistryValue("shutdownProperly");

    if (shutdownProperly) {
      this.powerLogic.setRegistryValue("shutdownProperly", undefined);

      return;
    }

    MessageBox({
      title: "Inepta wasn't shut down correctly",
      message: `It looks like Inepta wasn't shut down properly. To prevent a loss of data in the future, please shut down Inepta via the start menu.<br><br>If Inepta crashed, try unloading any sideloaded applications (it's a future thing) or user-mode Kernel Modules (also a future thing) to see if that solves the problem.`,
      buttons: [{ caption: "Okay", action() {} }],
      icon: MessageIcons.warning,
    });
  }
}

const ShellProcess = new Proxy(_shellProc, {
  apply() {
    const kernel = IneptaKernel();
    const stack = kernel.getModule("stack");
    const instances = stack.renderer.getAppInstances("shell");

    if (instances.length === 0) return undefined;

    return instances[0];
  },

  construct(target, argArray) {
    return new target(...argArray);
  },
});

export default ShellProcess;
