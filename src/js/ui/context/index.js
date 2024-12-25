import { KernelModule } from "../../kernel/module/index.js";

export class ContextMenuLogic extends KernelModule {
  menu;
  locked;

  constructor(kernel, id) {
    super(kernel, id);
  }

  async _init() {
    this.createMenu();
  }

  createMenu() {
    this.menu = document.createElement("div");
    this.menu.className = "context-menu hidden";

    const main = document.querySelector("#main");
    main.addEventListener("click", (e) => this.checkOutsideClick(e));

    main.append(this.menu);
  }

  showMenu(x, y, options) {
    this.locked = true;

    this.menu.classList.add("hidden");
    this.menu.innerHTML = "";
    this.menu.style.setProperty("--x", "");
    this.menu.style.setProperty("--y", "");

    for (const option of options) {
      if (!option) continue;

      const button = document.createElement("button");

      button.className = option.className || "";

      if (option.disabled) button.disabled = true;
      if (option.default) button.classList.add("default");

      button.innerText = option.caption;
      button.addEventListener("click", () => {
        this.hideMenu();

        option.action(option);
      });

      this.menu.append(button);
      if (option.separator) this.menu.append(document.createElement("hr"));
    }

    this.menu.classList.remove("hidden");

    setTimeout(() => {
      const { x: newX, y: newY } = this.correctMenuPosition(x, y);

      x = newX;
      y = newY;

      this.menu.style.setProperty("--x", `${x}px`);
      this.menu.style.setProperty("--y", `${y}px`);
      this.locked = false;
    }, 2);
  }

  correctMenuPosition(x, y) {
    const { offsetWidth: width, offsetHeight: height } = this.menu;
    const { width: screenWidth, height: screenHeight } = document.body.getBoundingClientRect();

    if (x + width >= screenWidth) {
      x = screenWidth - width - 10;
    }

    if (y + height >= screenHeight) {
      y = screenHeight - height - 10;
    }

    return { x, y };
  }

  hideMenu() {
    this.menu.classList.add("hidden");
  }

  checkOutsideClick(e) {
    if (e.composedPath().includes(this.menu) || this.locked) return;

    this.hideMenu();
  }
}
