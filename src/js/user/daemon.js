import { loadBuiltinApps } from "../apps/builtin.js";
import { IneptaKernel } from "../kernel/index.js";
import { Process } from "../process/instance.js";
import { RegistryHives } from "../registry/store.js";
import { getAccentColorVariations } from "../ui/color.js";
import { UserData } from "./data.js";
import { DefaultUserPreferences } from "./store.js";

export class UserDaemon extends Process {
  preferencesPath = "";
  username = "";
  userlogic;
  fs;

  constructor(handler, pid, parentPid, username) {
    super(handler, pid, parentPid);

    this.username = username;
    this.fs = this.handler._kernel.getModule("fs");
    this.registry = this.handler._kernel.getModule("registry");
    this.userlogic = this.handler._kernel.getModule("userlogic");
    this.user = this.userlogic.getUserByName(username);
    this.main = document.querySelector("#main");
  }

  async start() {
    this.registry.setValue(RegistryHives.local, "UserDaemon.lastLoginName", this.username);
    this.registry.setValue(RegistryHives.local, "UserDaemon.lastLoginTime", new Date().getTime());

    this.preferencesPath = this.fs.join(this.user.userFolder, "preferences.json");

    await this.loadPreferences();
    await this.checkUserFolders();
    this.preferencesSync();
    this.accentColorSync();

    UserData.subscribe((v) => {
      if (!this._disposed) {
        this.registry.setValue(RegistryHives.local, "CurrentUser", v);
      }
    });

    this.environment.setProperty("whoami", this.username);
    this.environment.setProperty("useruuid", this.user.uuid);
    this.environment.setProperty("preferences", this.preferencesPath);
    this.environment.setProperty("userprofile", this.user.userFolder);

    // Load all built-in applications
    await loadBuiltinApps(this.user.uuid);
  }

  async checkUserFolders() {
    await this.fs.createDirectory(this.fs.join(this.user.userFolder, "Documents"), this.userId);
    await this.fs.createDirectory(this.fs.join(this.user.userFolder, "Pictures"), this.userId);
    await this.fs.createDirectory(this.fs.join(this.user.userFolder, "Apps"), this.userId);
  }

  async loadPreferences() {
    try {
      const contents = await this.fs.readFile(this.preferencesPath, this.userId);

      UserData.set({
        ...JSON.parse(contents.toString()),
        username: this.username,
      });
    } catch {
      UserData.set(DefaultUserPreferences);

      await this.fs.writeFile(
        this.preferencesPath,
        JSON.stringify({ ...DefaultUserPreferences, username: this.username }),
        this.userId
      );
    }
  }

  preferencesSync() {
    UserData.subscribe(async (v) => {
      if (this._disposed) return;
      await this.fs.writeFile(this.preferencesPath, JSON.stringify(v, null, 2), this.userId);
    });
  }

  async stop() {
    const stack = this.handler;

    for (const [_, proc] of stack.store.get()) {
      if (proc.closeWindow) await proc.closeWindow();
    }

    IneptaKernel().state.loadState(IneptaKernel().state.store.login, { type: "logout" });
    this.main.style = "";
  }

  accentColorSync() {
    this.main = document.querySelector("#main");

    UserData.subscribe((v) => {
      if (this._disposed) return;

      const color = `#${v.accent || "ff6200"}`.replace("##", "#");

      const {
        accent,
        light,
        dark,
        darker,
        superdark,
        start,
        startHover,
        startActive,
        coloredShell,
      } = getAccentColorVariations(color);

      this.main.style.setProperty("--user-accent", accent);
      this.main.style.setProperty("--user-accent-light", light);
      this.main.style.setProperty("--user-accent-dark", dark);
      this.main.style.setProperty("--user-accent-darker", darker);
      this.main.style.setProperty("--user-accent-superdark", superdark);
      this.main.style.setProperty("--user-start-button-bg", start);
      this.main.style.setProperty("--user-start-button-hover-bg", startHover);
      this.main.style.setProperty("--user-start-button-active-bg", startActive);
      this.main.style.setProperty("--user-colored-shell-bg", coloredShell);

      if (v.coloredShell) this.main.classList.add("colored-shell");
      else this.main.classList.remove("colored-shell");
    });
  }
}
