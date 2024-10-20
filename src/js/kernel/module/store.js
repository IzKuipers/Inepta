import { Environment } from "../../environment/index.js";
import { PowerLogic } from "../../power/index.js";
import { ProcessHandler } from "../../process/handler.js";
import { IneptaRegistry } from "../../registry/index.js";
import { UserLogic } from "../../user/index.js";
import { FileSystem } from "../../vfs.js";

export const CoreKernelModules = {
  fs: FileSystem,
  registry: IneptaRegistry,
  environment: Environment,
  userlogic: UserLogic,
  stack: ProcessHandler,
  powerlogic: PowerLogic,
};
