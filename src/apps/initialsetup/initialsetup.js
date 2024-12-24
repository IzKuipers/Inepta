import { VERSION } from "../../env.js";
import { AppProcess } from "../../js/apps/process.js";
import { MessageBox } from "../../js/desktop/message.js";
import { MessageIcons } from "../../js/images/msgbox.js";
import { RegistryHives } from "../../js/registry/store.js";

export default class SetupHelperProcess extends AppProcess {
  pageIndex = 0;
  pageCount = 3;
  nextConditions = {
    page2: this.createFirstUser.bind(this),
  };

  constructor(handler, pid, parentPid, app) {
    super(handler, pid, parentPid, app);

    this.powerLogic = this.kernel.getModule("powerlogic");
    this.userlogic = this.kernel.getModule("userlogic");
  }

  render() {
    this.previousButton = this.getElement("#previous", true);
    this.nextButton = this.getElement("#next", true);
    this.usernameField = this.getElement("#usernameField", true);
    this.passwordField = this.getElement("#passwordField", true);
    this.confirmField = this.getElement("#passwordConfirmField", true);

    this.pageIndex = 1;
    this.update();
    this.initActions();
  }

  initActions() {
    this.previousButton.addEventListener(
      "click",
      this.safe(() => {
        this.previous();
      })
    );

    this.nextButton.addEventListener(
      "click",
      this.safe(() => {
        this.next();
      })
    );
  }

  update() {
    this.updatePages();
    this.updateActions();
  }

  updatePages() {
    const pages = this.getElements(".page");

    for (const page of pages) {
      if (page.id === `page${this.pageIndex}`) {
        page.classList.add("show");
      } else {
        page.classList.remove("show");
      }
    }

    this.updateActions();
  }

  updateActions() {
    const previous = this.getElement("#previous", true);
    const next = this.getElement("#next span.lucide", true);

    previous.disabled = this.pageIndex <= 1;
    next.classList.toggle("icon-check", this.pageIndex >= this.pageCount);
    next.classList.toggle("icon-chevron-right", !(this.pageIndex >= this.pageCount));
  }

  previous() {
    this.pageIndex--;
    this.update();
  }

  async next() {
    this.nextButton.disabled = true;

    const nextCondition = this.nextConditions[`page${this.pageIndex}`];

    if (nextCondition) {
      const result = await nextCondition();

      if (result !== true) {
        this.nextButton.disabled = false;

        return;
      }
    }

    this.pageIndex++;

    if (this.pageIndex > this.pageCount) {
      this.finish();

      return;
    }

    this.nextButton.disabled = false;

    this.update();
  }

  async createFirstUser() {
    if (!this.usernameField.value || !this.passwordField.value || !this.confirmField.value) {
      MessageBox(
        {
          title: "Missing values",
          message:
            "Something doesn't feel quite right... Oh! You forgot to fill out one of the fields. You'll have to fill those out before we can continue.",
          buttons: [{ caption: "Okay", action() {} }],
          icon: MessageIcons.warning,
        },
        this._pid
      );

      return;
    }

    if (this.passwordField.value !== this.confirmField.value) {
      MessageBox(
        {
          title: "Passwords don't match",
          message: "The passwords you entered don't match! Please try again.",
          buttons: [{ caption: "Okay", action() {} }],
          icon: MessageIcons.critical,
        },
        this._pid
      );

      return;
    }

    this.usernameField.disabled = true;
    this.passwordField.disabled = true;
    this.confirmField.disabled = true;

    return true;
  }

  async finish() {
    await this.userlogic.createUser(this.usernameField.value, this.passwordField.value, true);

    this.registry.setValue(RegistryHives.local, "initialSetup.finishedAt", new Date().getTime());
    this.registry.setValue(RegistryHives.local, "initialSetup.doneBy", this.usernameField.value);
    this.registry.setValue(RegistryHives.local, "initialSetup.completed", true);
    this.registry.setValue(RegistryHives.local, "initialSetup.installVersion", VERSION);

    this.powerLogic.restart();
  }
}
