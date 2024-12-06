import { KERNEL } from "../../env.js";
import { AppRuntimeError } from "../../js/apps/error.js";
import { AppProcess } from "../../js/apps/process.js";
import { spawnApp } from "../../js/apps/spawn.js";
import { AppStore } from "../../js/apps/store.js";
import { strftime } from "../../js/desktop/date.js";
import { MessageBox } from "../../js/desktop/message.js";
import { MessageIcons } from "../../js/images/msgbox.js";
import { Store } from "../../js/store.js";
import { UserData } from "../../js/user/data.js";

export default class ShellProcess extends AppProcess {
  powerLogic;
  startOpened = Store(false);
  startPopulated = false;
  userData;
  usernameField;
  shutdownButton;
  startButton;
  startMenu;
  appList;

  constructor(handler, pid, parentPid, app) {
    super(handler, pid, parentPid, app);

    this.powerLogic = KERNEL.getModule("powerlogic");
    this.environment.setProperty("SHELLPID", this._pid);
  }

  render() {
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
        button.innerText = proc.app.data.metadata.name;

        button.addEventListener(
          "click",
          this.safe(() => {
            this.handler.renderer.focusPid(pid);
          })
        );

        button.addEventListener("contextmenu", (e) => {
          const { clientX: x, clientY: y } = e;

          this.context.showMenu(x, y, [
            {
              caption: "Close Window",
              action: () => {
                const dispatch = this.handler.ConnectDispatch(pid);

                dispatch.dispatch("close-window");
              },
            },
          ]);
        });

        proc.windowTitle.subscribe((v) => {
          button.innerText = v;
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
        if (!v) return (this.usernameField.innerText = "Stranger");

        this.usernameField.innerText = v.username || "Stranger";
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
