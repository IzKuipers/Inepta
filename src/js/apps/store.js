import { CabinetApp } from "../../apps/cabinet/metadata.js";
import { DebugToolApp } from "../../apps/debugtool/metadata.js";
import { InepVerApp } from "../../apps/inepver/metadata.js";
import { InitialSetupApp } from "../../apps/initialsetup/metadata.js";
import { MsgBoxApp } from "../../apps/messagebox/metadata.js";
import { NapkinApp } from "../../apps/napkin/metadata.js";
import { NewLoginApp } from "../../apps/newloginapp/metadata.js";
import { ProgManApp } from "../../apps/progman/metadata.js";
import { RegEditApp } from "../../apps/regedit/metadata.js";
import { ShellApp } from "../../apps/shell/metadata.js";
import { WallpaperApp } from "../../apps/wallpaper/metadata.js";
import { Store } from "../store.js";

export const AppStore = Store({});

export const builtInApps = [
  MsgBoxApp,
  ShellApp,
  WallpaperApp,
  DebugToolApp,
  ProgManApp,
  RegEditApp,
  InepVerApp,
  NapkinApp,
  CabinetApp,
  InitialSetupApp,
  NewLoginApp,
];
