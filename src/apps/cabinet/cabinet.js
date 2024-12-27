import { AppProcess } from "../../js/apps/process.js";
import { spawnApp } from "../../js/apps/spawn.js";
import { strftime } from "../../js/desktop/date.js";
import { MessageBox } from "../../js/desktop/message.js";
import { MessageIcons } from "../../js/images/msgbox.js";
import { Store } from "../../js/store.js";
import { formatBytes } from "../../js/util/bytes.js";

export default class CabinetProcess extends AppProcess {
  path;
  contents;
  historyIndex = Store(-1);
  history = Store([]);
  breadCrumbs;
  aliases = {};

  constructor(handler, pid, parentPid, app, path) {
    super(handler, pid, parentPid, app);

    this.path = path || this.environment.getProperty("userprofile");
    this.fs = this.kernel.getModule("fs");
    this.userLogic = this.kernel.getModule("userlogic");

    if (!this.path) {
      setTimeout(() => {
        MessageBox({
          title: "Property not registered",
          message: `<code>Registry::LOCAL.Environment.USERPROFILE</code><br><br>Failed to get the User Profile path from the environment. This probably means that the Cabinet was opened in suboptimal conditions.`,
          buttons: [{ caption: "Okay", action() {} }],
          icon: MessageIcons.warning,
        });
      }, 100);

      this.path = "./System";
    }
  }

  render() {
    const user = this.userLogic.getUser(this.userId);

    this.aliases[user.userFolder.replace("./", "")] = "You";
    this.aliases[this.userId] = "You";
    this.aliases["."] = "Inepta HD";

    this.breadCrumbs = this.getElement("#breadCrumbs", true);

    this.navigationControls();
    this.updateBreadCrumbs();

    this.navigate(this.path);

    this.historyIndex.subscribe((v) => {
      const backButton = this.getElement("#backButton", true);
      const forwardButton = this.getElement("#forwardButton", true);

      const historyLength = this.history.get().length;

      backButton.disabled = v <= 0;
      forwardButton.disabled = v >= historyLength - 1;
    });
  }

  async navigate(path) {
    const history = this.history.get();
    let index = this.historyIndex.get();

    if (index === history.length - 1) {
      if (history[history.length - 1] !== path) history.push(path);
    } else {
      history.splice(this.historyIndex.get());
      history.push(path);
    }

    index = history.length - 1;

    this.history.set(history);
    this.historyIndex.set(index);

    await this.goHere(path);
  }

  async goHere(path) {
    try {
      const contents = await this.fs.readDirectory(path, this.userId);

      this.path = path;
      this.contents = contents;
    } catch (e) {
      MessageBox({
        title: "Can't open directory",
        message: `The specified directory could not be opened. Please check the name and try again.<br><br>${e.message}`,
        buttons: [{ caption: "Okay", action() {} }],
        icon: MessageIcons.critical,
      });
    }

    this.updateStatusbar();
    this.updateLocations();
    this.updatePlaces();
    this.populateDirectory();

    const aliasedPath =
      this.aliases[this.path.startsWith("./") ? this.path.replace("./", "") : this.path] ||
      this.path;

    this.windowTitle.set(aliasedPath);
    this.updateBreadCrumbs(this.path);
  }

  updateStatusbar() {
    if (!this.contents || !this.contents.files || !this.contents.dirs) return;

    const split = this.path.split("/");

    const fileCount = this.getElement("#fileCount", true);
    const folderCount = this.getElement("#folderCount", true);
    const folderName = this.getElement("#folderName", true);
    const parentName = this.getElement("#parentName", true);

    fileCount.innerText = `${this.contents.files.length} file(s)`;
    folderCount.innerText = `${this.contents.dirs.length} folder(s)`;

    folderName.innerText = split.length > 1 ? split[split.length - 1] : split[0];
    parentName.innerText = split.length > 1 ? `In ${split[split.length - 2]}` : "Inepta HD";
  }

  populateDirectory() {
    if (!this.contents || !this.contents.files || !this.contents.dirs) return;
    const container = this.getElement("#container", true);

    container.innerHTML = "";

    container.append(this._topItem());

    for (const directory of this.contents.dirs) {
      const element = this._folderItem(directory);

      container.append(element);
    }

    for (const file of this.contents.files) {
      const element = this._fileItem(file);

      container.append(element);
    }
  }

  _topItem() {
    const { item, name, icon, modified, created, size } = this._baseItem();

    item.classList.add("header");
    name.innerText = "Name";
    modified.innerText = "Date Modified";
    created.innerText = "Date Created";
    size.innerText = "Size";
    icon.remove();

    return item;
  }

  _folderItem(directory) {
    const { item, name, icon, modified, created, size } = this._baseItem();

    item.classList.add("folder");
    icon.src = "./assets/fs/folder.svg";

    name.innerText = directory.name;
    modified.innerText = strftime("%e %b %G %H:%M", new Date(directory.dateModified));
    created.innerText = strftime("%e %b %G %H:%M", new Date(directory.dateCreated));
    size.innerText = "-";

    this.listener(item, "click", () => {
      this.navigate(this.fs.join(this.path, directory.name));
    });

    return item;
  }

  _fileItem(file) {
    const { item, name, icon, modified, created, size } = this._baseItem();

    item.classList.add("file");
    icon.src = "./assets/fs/file.svg";

    name.innerText = file.name;
    modified.innerText = strftime("%e %b %G %H:%M", new Date(file.dateModified));
    created.innerText = strftime("%e %b %G %H:%M", new Date(file.dateCreated));
    size.innerText = formatBytes(file.size);

    this.listener(item, "click", () => {
      spawnApp("napkin", undefined, this.userId, this.fs.join(this.path, file.name));
    });

    return item;
  }

  _baseItem() {
    const item = document.createElement("div");
    const name = document.createElement("div");
    const icon = document.createElement("img");
    const modified = document.createElement("div");
    const created = document.createElement("div");
    const size = document.createElement("div");

    icon.className = "icon";
    icon.src = "./assets/fs/file.svg";

    item.className = "item";
    name.className = "field name";
    modified.className = "field modified";
    created.className = "field created";
    size.className = "field size";

    name.innerText = "NAME";
    modified.innerText = "MODIFIED";
    created.innerText = "CREATED";
    size.innerText = "SIZE";

    item.append(icon, name, modified, created, size);

    return { item, icon, name, modified, created, size };
  }

  updateLocations() {
    const locations = this.getElement("#locations", true);

    locations.innerHTML = "";

    const driveItem = document.createElement("button");
    const driveIcon = document.createElement("img");
    const driveCaption = document.createElement("span");

    driveItem.className = "item";
    driveCaption.innerText = "Inepta HD";
    driveIcon.src = "./assets/fs/drive.svg";

    this.listener(driveItem, "click", () => {
      this.navigate(".");
    });

    driveItem.append(driveIcon, driveCaption);
    locations.append(driveItem);
  }

  async updatePlaces() {
    const places = this.getElement("#places", true);

    places.innerHTML = "";

    const userProfile = this.environment.getProperty("userprofile");
    const userDirectory = await this.fs.readDirectory(userProfile);

    for (const dir of userDirectory.dirs) {
      const button = document.createElement("button");
      const icon = document.createElement("img");
      const span = document.createElement("span");

      button.className = "item";

      this.listener(button, "click", () => {
        this.navigate(this.fs.join(userProfile, dir.name));
      });

      icon.src = "./assets/fs/folder.svg";
      span.innerText = dir.name;

      button.append(icon, span);

      places.append(button);
    }
  }

  async parentDir() {
    this.navigate(await this.fs.getParentDirectory(this.path));
  }

  navigationControls() {
    const backButton = this.getElement("#backButton", true);
    const forwardButton = this.getElement("#forwardButton", true);
    const parentButton = this.getElement("#parentButton", true);
    const homeButton = this.getElement("#homeButton", true);

    this.listener(backButton, "click", async () => {
      await this.back();
    });

    this.listener(forwardButton, "click", async () => {
      await this.forward();
    });

    this.listener(parentButton, "click", async () => {
      await this.parentDir();
    });

    this.listener(homeButton, "click", async () => {
      await this.navigate(this.environment.getProperty("userprofile"));
    });
  }

  async back() {
    let index = this.historyIndex.get();

    index--;

    this.historyIndex.set(index);

    await this.goHere(this.history.get()[index]);
  }

  async forward() {
    let index = this.historyIndex.get();

    index++;

    this.historyIndex.set(index);

    await this.goHere(this.history.get()[index]);
  }

  updateBreadCrumbs(path = this.path) {
    const crumbs = path.split("/");
    const startIndex = crumbs[0] == "." ? 1 : 0;

    this.breadCrumbs.innerHTML = "";

    if (crumbs.length === 1 && crumbs[0] === ".") {
      this._breadCrumb(".", 0);

      return;
    }

    for (let i = startIndex; i < crumbs.length; i++) {
      this._breadCrumb(crumbs, i);
    }
  }

  _breadCrumb(crumbs, i) {
    const crumb = document.createElement("button");

    crumb.className = "crumb";

    this.listener(crumb, "click", () => {
      const path = this.generatePath(crumbs, crumbs[i], i);

      this.navigate(path);
    });

    crumb.innerText = this.aliases[crumbs[i]] || crumbs[i];

    this.breadCrumbs.append(crumb);
  }

  generatePath(crumbs, crumb, I) {
    let str = "";

    for (let i = 0; i < I; i++) {
      str += `${crumbs[i]}/`;
    }

    return `${str}${crumb}`;
  }
}
