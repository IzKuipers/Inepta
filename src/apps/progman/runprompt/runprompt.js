import { AppProcess } from "../../../js/apps/process.js";
import { spawnApp } from "../../../js/apps/spawn.js";

export default class ProgManRunPromptProcess extends AppProcess {
  constructor(handler, pid, parentPid, app) {
    super(handler, pid, parentPid, app);
  }

  render() {
    this.closeIfSecondInstance();

    const input = this.getElement("#idInput", true);
    const goButton = this.getElement("#goButton", true);
    const cancelButton = this.getElement("#cancelButton", true);

    goButton.disabled = true;

    input.addEventListener(
      "input",
      this.safe(() => {
        const value = input.value;

        goButton.disabled = !value;
      })
    );

    goButton.addEventListener(
      "click",
      this.safe(async () => {
        this.go(input.value);
      })
    );

    cancelButton.addEventListener(
      "click",
      this.safe(() => {
        this.closeWindow();
      })
    );
  }

  async go(id) {
    const shellPid = this.environment.getProperty("SHELLPID");

    await spawnApp(id, shellPid, this.userId);
    this.closeWindow();
  }
}
