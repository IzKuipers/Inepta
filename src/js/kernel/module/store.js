import { CloneModule } from "../../clone/index.js";
import { ToolbarModule } from "../../electron/toolbar.js";
import { ElevationModule } from "../../elevation/index.js";
import { Environment } from "../../environment/index.js";
import { FileSystemSecurity } from "../../fssec/index.js";
import { PowerLogic } from "../../power/index.js";
import { ProcessHandler } from "../../process/handler.js";
import { IneptaRegistry } from "../../registry/index.js";
import { ContextMenuLogic } from "../../ui/context/index.js";
import { UserLogic } from "../../user/index.js";
import { FileSystem } from "../../vfs.js";

export const CoreKernelModules = {
  fs: FileSystem,
  registry: IneptaRegistry,
  userlogic: UserLogic,
  elevation: ElevationModule,
  fssec: FileSystemSecurity,
  clone: CloneModule,
  powerlogic: PowerLogic,
  toolbar: ToolbarModule,
  context: ContextMenuLogic,
  environment: Environment,
  stack: ProcessHandler,
};
