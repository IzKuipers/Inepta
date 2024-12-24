import { IneptaKernel } from "../kernel/index.js";
import { Log } from "../logging.js";
import { RegistryHives } from "../registry/store.js";
import { AppLoadError } from "./error.js";
import { appDataComplete } from "./sanitise.js";
import { AppStore } from "./store.js";

// Main function for loading apps into the app store
export async function loadApp(data = {}) {
  // Check if the app metadata is all there
  if (!appDataComplete(data)) {
    throw new AppLoadError("Tried to load an app with invalid data!");
  }

  // Check if the app isn't already loaded
  if (isLoaded(data.id)) {
    throw new AppLoadError(`Can't load two apps of the same ID!`);
  }

  // Make note of the load process
  Log(
    `loadApp`,
    `${data.id}: ${data.metadata.name} by ${data.metadata.author} (v${data.metadata.version})`
  );

  try {
    // Import the AppProcess
    const { default: process } = await import(data.files.js);

    // No process? No load.
    if (!process) throw new AppLoadError(`Tried to load an app without an AppProcess`);

    // Get the current app store
    const store = AppStore.get();

    // Add the app to the store with its metadata and the accompanying process
    store[data.id] = { data, process };

    // Save the app store
    AppStore.set(store);

    // Make note of the Registry copy
    Log(`loadApp`, `${data.id}: Copying application metadata to the Registry.`);

    // Copy the application metadata in full to the registry
    IneptaKernel().registry.setValue(RegistryHives.apps, `${data.id}`, data);
  } catch (e) {
    // Throw an error if anything went wrong
    throw new AppLoadError(`Failed to import "${data.files.js}" for ${data.id}: ${e.message}`);
  }
}

// May be subject to disabling and such in the future
export function isLoaded(id) {
  return !!AppStore.get()[id];
}
