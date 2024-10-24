import { KERNEL } from "../../env.js";
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
    this.main = document.querySelector("#main");
  }

  async start() {
    this.registry.setValue(RegistryHives.local, "UserDaemon.lastLoginName", this.username);
    this.registry.setValue(RegistryHives.local, "UserDaemon.lastLoginTime", new Date().getTime());

    this.preferencesPath = `./Users/${this.username}/preferences.json`;

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
    this.environment.setProperty("preferences", this.preferencesPath);
    this.environment.setProperty("userprofile", `./Users/${this.username}`);
  }

  async checkUserFolders() {
    await this.fs.createDirectory(`./Users/${this.username}/Documents`);
    await this.fs.createDirectory(`./Users/${this.username}/Pictures`);
    await this.fs.createDirectory(`./Users/${this.username}/Apps`);
  }

  async loadPreferences() {
    try {
      const contents = this.fs.readFile(this.preferencesPath);

      UserData.set({
        ...JSON.parse(contents.toString()),
        username: this.username,
      });
    } catch {
      UserData.set(DefaultUserPreferences);

      this.fs.writeFile(
        this.preferencesPath,
        JSON.stringify({ ...DefaultUserPreferences, username: this.username })
      );
    }
  }

  preferencesSync() {
    UserData.subscribe((v) => {
      if (this._disposed) return;
      this.fs.writeFile(this.preferencesPath, JSON.stringify(v, null, 2));
    });
  }

  async stop() {
    const stack = this.handler;

    for (const [_, proc] of stack.store.get()) {
      if (proc.closeWindow) await proc.closeWindow();
    }

    KERNEL.state.loadState(KERNEL.state.store.login, { type: "logout" });
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
