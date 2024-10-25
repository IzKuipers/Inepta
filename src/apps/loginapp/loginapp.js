import { VERSION } from "../../env.js";
import { AppRuntimeError } from "../../js/apps/error.js";
import { isLoaded, loadApp } from "../../js/apps/load.js";
import { AppProcess } from "../../js/apps/process.js";
import { spawnApp } from "../../js/apps/spawn.js";
import { AppStore } from "../../js/apps/store.js";
import { MessageBox } from "../../js/desktop/message.js";
import { MessageIcons } from "../../js/images/msgbox.js";
import { RegistryHives } from "../../js/registry/store.js";
import { Sleep } from "../../js/sleep.js";
import { getStateProps, StateProps } from "../../js/state/store.js";
import { UserDaemon } from "../../js/user/daemon.js";
import { InitialSetupApp } from "../initialsetup/metadata.js";
import { MsgBoxApp } from "../messagebox/metadata.js";

export default class LoginAppProcess extends AppProcess {
  usernameField;
  passwordField;
  loginButton;
  cancelButton;
  shutdownButton;
  versionNumber;

  fs;
  state;
  userlogic;
  type;

  constructor(handler, pid, parentPid, app, type) {
    super(handler, pid, parentPid, app);

    this.kernel = this.handler._kernel;
    this.powerLogic = this.kernel.getModule("powerlogic");
    this.type = type;
  }

  async render() {
    if (this._disposed) return;

    await this.satisfyDependencies();

    const stateHandler = this.kernel.getModule("state");
    const { currentState } = stateHandler;

    if (currentState !== "login") {
      throw new AppRuntimeError(`Can't launch LoginApp: invalid context`);
    }

    this._prepare();

    this.type ||= getStateProps({ identifier: "login" }).type;

    if (!this.type) {
      if (!this.registry.getValue(RegistryHives.local, "initialSetup.completed")) {
        this.displayStatus(`Welcome to Inepta`);
        await loadApp(InitialSetupApp);
        await spawnApp("initialSetup", this._pid, this.userId);
      }

      return;
    }

    switch (this.type) {
      case "shutdown":
        this.shutdown();
        break;
      case "restart":
        this.restart();
        break;
      case "logout":
        this.logout();
        break;
      default:
        throw new AppRuntimeError(`Don't know what to do with type "${type}"`);
    }
  }

  async satisfyDependencies() {
    if (this._disposed) return;

    if (!isLoaded("msgBox")) await loadApp(MsgBoxApp);

    this.fs = this.kernel.getModule("fs");
    this.state = this.kernel.getModule("state");
    this.userlogic = this.kernel.getModule("userlogic");
  }

  _prepare() {
    if (this._disposed) return;

    this.usernameField = this.getElement("#usernameField", true);
    this.passwordField = this.getElement("#passwordField", true);
    this.loginButton = this.getElement("#loginButton", true);
    this.cancelButton = this.getElement("#cancelButton", true);
    this.shutdownButton = this.getElement("#shutdownButton", true);
    this.versionNumber = this.getElement("#versionNumber", true);

    const lastUser = this.registry.getValue(RegistryHives.local, "LoginApp.lastUser");

    if (lastUser) {
      this.usernameField.value = lastUser;
      this.passwordField.focus();
      this.passwordField.autofocus = true;
    } else {
      this.usernameField.focus();
      this.usernameField.autofocus = true;
    }

    this.versionNumber.innerText = `${VERSION[0]}.${VERSION[1]}`;

    const onValuesChange = () => {
      this.loginButton.disabled = !this.usernameField.value || !this.passwordField.value;
    };

    this.loginButton.addEventListener(
      "click",
      this.safe(async () => {
        this.loginButton.disabled = true;

        await this.proceed(this.usernameField.value, this.passwordField.value);

        this.loginButton.disabled = false;
      })
    );

    this.shutdownButton.addEventListener(
      "click",
      this.safe(() => this.powerLogic.shutdown())
    );

    this.cancelButton.addEventListener(
      "click",
      this.safe(() => {
        cancelButton.disabled = true;

        this.closeWindow();
        setTimeout(() => {
          spawnApp("loginApp", this.parentPid, this.userId);
        }, 100);
      })
    );

    this.cancelButton.disabled = false;
    this.loginButton.disabled = true;

    this.usernameField.addEventListener(
      "input",
      this.safe(() => onValuesChange())
    );

    this.passwordField.addEventListener(
      "input",
      this.safe(() => onValuesChange())
    );

    this.passwordField.addEventListener(
      "keydown",
      this.safe(async (e) => {
        if (e.key === "Enter") {
          if (!this.usernameField.value || !this.passwordField.value) return;

          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          this.loginButton.disabled = true;

          await this.proceed(this.usernameField.value, this.passwordField.value);

          this.loginButton.disabled = false;
        }
      })
    );
  }

  async proceed(username, password) {
    if (this._disposed) return;

    const valid = await this.isValid(username, password);

    if (!valid) {
      MessageBox({
        title: "Failed to log you on",
        message:
          "Either the username or password you provided is incorrect. Please check your credentials and try again. If you forgot your credentials, contact your system administrator.",
        buttons: [
          {
            caption: "Okay",
            action: async () => {
              await Sleep(10);

              this.handler.renderer.focusPid(this._pid);

              this.passwordField.value = "";
              this.passwordField.focus();
            },
          },
        ],
        icon: MessageIcons.warning,
      });

      return;
    }

    this.displayStatus(`Welcome, ${username}! Logging you in...`);
    await Sleep(800);

    this.displayStatus(`Resetting app storage`);
    await Sleep(100);

    AppStore.set({});

    this.displayStatus(`Terminating graphical processes`);
    await Sleep(100);

    for (const [pid, proc] of this.handler.store.get()) {
      this.displayStatus(`Terminating process ${pid}`);

      if (proc.closeWindow) await proc.closeWindow();
    }

    this.registry.setValue(RegistryHives.local, "LoginApp.lastUser", username);

    this.displayStatus(`Navigating to desktop`);
    await Sleep(100);

    await this.state.loadState(this.state.store.desktop);

    this.displayStatus(`Spawning UserDaemon`);
    await Sleep(600);

    await this.startDaemon(username);
  }

  async isValid(username, password) {
    if (this._disposed) return;

    const user = this.userlogic.getUserByName(username);

    if (!user) return false;

    if (!user.password) return true;

    const passwordValid = await this.userlogic.verifyPassword(password, user.password);

    if (!passwordValid) return false;

    return true;
  }

  async startDaemon(username) {
    const user = this.userlogic.getUserByName(username);

    if (!user) return;

    await this.handler.spawn(UserDaemon, this.handler._kernel.initPid, user.uuid, username);
  }

  displayStatus(status) {
    if (this._disposed) return;

    const statusDiv = this.getElement("#status", true);
    const container = this.getElement("#container", true);
    const banner = this.getElement("#banner", true);

    statusDiv.innerText = status;
    statusDiv.classList.remove("hidden");
    container.classList.add("hidden");
    banner.classList.add("loading");
    this.windowTitle.set(status);
  }

  hideStatus() {
    if (this._disposed) return;

    const statusDiv = this.getElement("#status", true);
    const container = this.getElement("#container", true);
    const banner = this.getElement("#banner", true);

    statusDiv.innerText = "";
    statusDiv.classList.add("hidden");
    container.classList.remove("hidden");
    banner.classList.remove("loading");
  }

  async logout() {
    if (this._disposed) return;

    this.displayStatus("Logging you out...");

    await Sleep(2000);

    this.closeWindow();
    StateProps["login"] = {};

    await Sleep(100);

    spawnApp("loginApp", this.parentPid, this.userId);
  }

  async shutdown() {
    if (this._disposed) return;

    this.displayStatus("Inepta is shutting down...");
  }

  async restart() {
    if (this._disposed) return;

    this.displayStatus("Inepta is restarting...");
  }
}
