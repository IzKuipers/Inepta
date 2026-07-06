import { AppProcess } from "../../../js/apps/process.js";
import { Sleep } from "../../../js/sleep.js";
import { convertToType } from "../../../js/util/convert.js";

export default class RegEditMutatorProcess extends AppProcess {
  dataType;
  initialValue;
  hierarchy;

  constructor(handler, pid, parentPid, app, hive, hierarchy, value) {
    super(handler, pid, parentPid, app);

    this.initialValue = value;
    this.hierarchy = hierarchy;
    this.hive = hive;
    this.dataType = typeof this.initialValue;
    this.isArray = Array.isArray(this.initialValue);
  }

  render() {
    this.closeIfSecondInstance();
    this.cancelButton = this.getElement("#cancelButton", true);
    this.saveButton = this.getElement("#saveButton", true);
    this.keyInput = this.getElement("#keyInput", true);
    this.valueInput = this.getElement("#valueInput", true);

    const splitHierarchy = this.hierarchy.split(".");

    if (this.dataType === "object" && !this.isArray) return this.closeWindow();

    this.valueInput.value = this.initialValue;
    this.keyInput.value = splitHierarchy[splitHierarchy.length - 1];

    this.cancelButton.addEventListener(
      "click",
      this.safe(() => {
        this.closeWindow();
      })
    );

    this.saveButton.addEventListener(
      "click",
      this.safe(async () => {
        this.saveChanges();
      })
    );
  }

  async saveChanges() {
    const value = convertToType(this.valueInput.value, this.dataType);

    this.registry.setValue(this.hive, this.hierarchy, value);

    this.handler.renderer.focusedPid.set(this.parentPid);

    await Sleep(10);

    this.closeWindow();
  }
}
