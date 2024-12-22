import { AppProcess } from "../../js/apps/process.js";
import { getJsonHierarchy } from "../../js/hierarchy.js";
import { Store } from "../../js/store.js";
import { FILE_ICONS } from "./store.js";

export default class RegEditProcess extends AppProcess {
  hierarchy = Store("");

  constructor(handler, pid, parentPid, app) {
    super(handler, pid, parentPid, app);
  }

  render() {
    this.closeIfSecondInstance();

    this.treeElement = this.getElement("#directoryView", true);
    this.contentElement = this.getElement("#contentView", true);
    this.pathElement = this.getElement("#path", true);

    this.registry.store.subscribe(
      this.safe((v) => {
        this.populateTree(v);
        this.updateContent();
      })
    );
  }

  populateTree(store) {
    const rootObjects = this.treeBranch(store, "");

    const rootBranch = document.createElement("div");
    const button = document.createElement("button");
    const indent = document.createElement("div");

    rootBranch.className = "branch expanded";
    indent.className = "indent";

    button.className = "expander";
    button.innerText = "Registry";

    button.addEventListener(
      "click",
      this.safe(() => {
        this.select("");
      })
    );

    this.hierarchy.subscribe(
      this.safe((v) => {
        if (!v) button.classList.add("selected");
        else button.classList.remove("selected");
      })
    );

    indent.append(...rootObjects);
    rootBranch.append(button, indent);

    this.treeElement.innerHTML = "";
    this.treeElement.append(rootBranch);
  }

  select(hierarchy) {
    const split = hierarchy.split(".");
    const last = split[split.length - 1];
    const shortened = [...split].map((a) => a[0]);

    shortened.splice(-1);

    this.hierarchy.set(hierarchy);
    this.updateContent();
    this.windowTitle.set(`Registry - ${shortened.join("/")}/${last}`);
    this.pathElement.innerText = `Registry/${split.join("/")}`;
  }

  treeBranch(object, path) {
    const elements = [];

    for (const [key, value] of Object.entries(object)) {
      const isLeaf = typeof value !== "object" || Array.isArray(value) || value === null;

      if (isLeaf) continue;

      const branch = document.createElement("div");
      const button = document.createElement("button");
      const icon = document.createElement("img");
      const caption = document.createElement("span");
      const indent = document.createElement("div");

      branch.className = "branch";
      indent.className = "indent";
      button.className = "expander";

      icon.src = "./assets/fs/folder.svg";
      icon.className = "icon";
      caption.innerText = key;

      button.append(icon, caption);

      const currentPath = path ? `${path}.${key}` : key;

      button.addEventListener(
        "click",
        this.safe(() => {
          if (currentPath === this.hierarchy.get() && indent.childElementCount > 0)
            branch.classList.toggle("expanded");
          else {
            branch.classList.add("expanded");
          }

          if (this.hierarchy.get() !== currentPath) this.select(currentPath);
        })
      );

      this.hierarchy.subscribe(
        this.safe((v) => {
          if (currentPath == v) {
            button.classList.add("selected");
            branch.classList.add("expanded");
          } else button.classList.remove("selected");
        })
      );

      branch.append(button);

      if (!isLeaf) {
        const subItems = this.treeBranch(value, currentPath);

        indent.append(...subItems);
      }

      branch.append(indent);
      elements.unshift(branch);
    }

    return elements;
  }

  updateContent() {
    this.contentElement.innerHTML = "";

    const hierarchy = this.hierarchy.get();
    const registry = this.registry.store.get();
    const object = hierarchy ? getJsonHierarchy(registry, hierarchy) : registry;

    for (const [key, element] of Object.entries(object)) {
      if (!element && element !== false && element !== 0) continue;

      const isFolder = typeof element === "object" && !Array.isArray(element);

      const row = document.createElement("tr");

      const name = document.createElement("td");
      const value = document.createElement("td");
      const valuelength = document.createElement("td");
      const type = document.createElement("td");

      const nameWrapper = document.createElement("div");
      const nameCaption = document.createElement("span");
      const icon = document.createElement("img");

      const stringified = JSON.stringify(element);

      icon.src = FILE_ICONS[Array.isArray(element) ? "array" : typeof element];
      nameCaption.innerText = key;
      nameWrapper.append(icon, nameCaption);

      name.append(nameWrapper);

      name.className = "name";
      value.className = "value";
      valuelength.className = "value-length";
      type.className = "type";

      value.innerText = isFolder ? "(folder)" : JSON.stringify(element);
      valuelength.innerText = `${stringified ? stringified.length : 0} bytes`;
      type.innerText = `REG_${Array.isArray(element) ? "ARRAY" : (typeof element).toUpperCase()}`;

      row.addEventListener(
        "click",
        this.safe(() => {
          const path = hierarchy ? `${hierarchy}.${key}` : key;
          if (typeof element === "object" && !Array.isArray(element)) {
            this.select(path);
          } else {
            this.editValue(path, element);
          }
        })
      );

      row.addEventListener(
        "contextmenu",
        this.safe((e) => {
          const path = hierarchy ? `${hierarchy}.${key}` : key;

          const options = [];

          if (typeof element === "object" && !Array.isArray(element)) {
            options.push(
              {
                caption: "Navigate here",
                action: () => {
                  this.select(path);
                },
                separator: true,
                default: true,
              },
              {
                caption: "Rename...",
                action: () => {},
              }
            );
          } else {
            options.push({
              caption: "Edit value...",
              action: () => {
                this.editValue(path, element);
              },
              default: true,
            });
          }

          this.context.showMenu(e.clientX, e.clientY, options);
        })
      );

      row.append(name, value, valuelength, type);

      this.contentElement.append(row);
    }
  }

  async editValue(hierarchy, value) {
    const split = hierarchy.split(".");
    const hive = split[0];

    this.spawnChild("regEditMutatorApp", hive, hierarchy.replace(`${hive}.`, ""), value);
  }
}
