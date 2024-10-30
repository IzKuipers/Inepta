import { Store } from "./js/store.js";

export const VERSION = [1, 0, 0]; // Current Inepta Version
export const RendererPid = Store(-1); // PID that the AppRenderer is running as
export let KERNEL; // Global variable set by IneptaKernel

// Function to set the KERNEL global variable
export function setKernel(kernel) {
  KERNEL = kernel;
}
