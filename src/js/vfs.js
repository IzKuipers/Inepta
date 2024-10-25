/**
 * Inepta File System implementation
 *
 * Created by Izaak Kuipers, consulting ChatGPT for occasional assistance.
 *
 * Original filename: src/js/vfs.js
 *
 * - Izaak Kuipers <izaak.kuipers@gmail.com>
 *   23-Oct-2024, 8:13 PM
 */

import { SecurityLevel } from "./fssec/store.js";
import { KernelModule } from "./kernel/module/index.js";
import { Log, LogType } from "./logging.js";

const fs = require("fs");
const path = require("path");
const os = require("os");

export class FileSystem extends KernelModule {
  constructor(kernel, id) {
    super(kernel, id);

    this.fssec = this._kernel.getModule("fssec");
  }

  // Called by kernel to initialize the filesystem
  _init() {
    Log("FileSystem._init", "Constructing new Filesystem integration");

    // Set the root directory path using getAppDataPath method.
    this.root = this.getAppDataPath();

    // Ensure the root directory exists, create it if it doesn't
    if (!fs.existsSync(this.root)) {
      fs.mkdirSync(this.root, { recursive: true }); // Create the root directory recursively (create parent directories as needed).
    }
  }

  // Determines the application data path based on the OS platform.
  getAppDataPath() {
    const platform = os.platform();

    // Return platform-specific application data directory paths.
    return platform === "win32"
      ? path.join(process.env.LOCALAPPDATA, "inepta") // Windows-specific app data path.
      : path.join(os.homedir(), ".local", "inepta"); // Unix-like system path (Linux/macOS).
  }

  // Ensures a directory exists, creating it if it doesn't.
  ensureDirSync(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true }); // Create the directory if it doesn't exist, including parent directories.
    }
  }

  // Traverses the filesystem and verifies that a directory exists.
  traverse(pathStr) {
    const fullPath = path.join(this.root, pathStr); // Join root path with the given path string.

    // Check if the path exists and is a directory.
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
      throw new Error(`Directory ${pathStr} does not exist.`); // Throw an error if the directory doesn't exist.
    }
    return fullPath; // Return the full directory path if valid.
  }

  // Joins multiple path segments into one path.
  join(...paths) {
    return path.join(...paths); // Join path arguments using the path module.
  }

  // Writes data to a file, creating the file and directories if necessary.
  writeFile(pathStr, content, userId) {
    this.canWrite(pathStr, userId);

    const fullPath = path.join(this.root, pathStr); // Join root path with the provided path string.
    const dirPath = path.dirname(fullPath); // Get the directory part of the full path.
    this.ensureDirSync(dirPath); // Ensure that the directory exists.

    // If the content is a buffer, use it directly; otherwise, convert it to a buffer.
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content);
    fs.writeFileSync(fullPath, data); // Write the data to the file synchronously.
  }

  // Reads data from a file.
  readFile(pathStr, userId) {
    this.canRead(pathStr, userId);

    const fullPath = path.join(this.root, pathStr); // Join root path with the provided path string.

    // Check if the file exists and is a valid file.
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      throw new Error(`File ${pathStr} does not exist.`); // Throw an error if the file doesn't exist.
    }
    return fs.readFileSync(fullPath); // Return the file content synchronously.
  }

  // Deletes a file from the file system.
  deleteFile(pathStr, userId) {
    this.canWrite(pathStr, userId);

    const fullPath = path.join(this.root, pathStr); // Join root path with the provided path string.

    // Check if the file exists.
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File ${pathStr} does not exist.`); // Throw an error if the file doesn't exist.
    }
    fs.unlinkSync(fullPath); // Delete the file synchronously.
  }

  // Creates a directory (and parent directories, if necessary).
  createDirectory(pathStr) {
    const fullPath = path.join(this.root, pathStr); // Join root path with the provided path string.
    this.ensureDirSync(fullPath); // Ensure that the directory exists or is created recursively.
  }

  // Reads the contents of a directory, returning both files and subdirectories with metadata.
  readDirectory(pathStr, userId) {
    this.canRead(pathStr, userId);

    // If the user tries to break out of the filesystem bounds, don't let them.
    if (pathStr.includes("..")) throw new Error(`Directory ${pathStr} does not exist.`);

    const fullPath = this.traverse(pathStr); // Traverse the path to ensure it's a valid directory.
    const dirEntries = fs.readdirSync(fullPath, { withFileTypes: true }); // Read directory entries with file type info.

    return {
      // Get subdirectories along with their creation and modification times.
      dirs: dirEntries
        .filter((entry) => entry.isDirectory())
        .map((dir) => ({
          name: dir.name,
          dateCreated: fs.statSync(path.join(fullPath, dir.name)).birthtime, // Directory creation time.
          dateModified: fs.statSync(path.join(fullPath, dir.name)).mtime, // Directory last modification time.
        })),

      // Get files along with their size and timestamps.
      files: dirEntries
        .filter((entry) => entry.isFile())
        .map((file) => ({
          name: file.name,
          size: fs.statSync(path.join(fullPath, file.name)).size, // File size in bytes.
          dateCreated: fs.statSync(path.join(fullPath, file.name)).birthtime, // File creation time.
          dateModified: fs.statSync(path.join(fullPath, file.name)).mtime, // File last modification time.
        })),
    };
  }

  // Deletes a directory and its contents recursively.
  deleteDirectory(pathStr, userId) {
    this.canWrite(pathStr, userId);

    const fullPath = path.join(this.root, pathStr); // Join root path with the provided path string.

    // Check if the directory exists and is valid.
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
      throw new Error(`Directory ${pathStr} does not exist.`); // Throw an error if the directory doesn't exist.
    }
    fs.rmdirSync(fullPath, { recursive: true }); // Delete the directory and its contents recursively.
  }

  // Checks if a given path points to a file.
  isFile(pathStr) {
    const fullPath = path.join(this.root, pathStr); // Join root path with the provided path string.
    return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile(); // Return true if the path exists and is a file.
  }

  // Checks if a given path points to a directory.
  isDir(pathStr) {
    const fullPath = path.join(this.root, pathStr); // Join root path with the provided path string.
    return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory(); // Return true if the path exists and is a directory.
  }

  // Resets the file system by deleting all content in the root directory.
  reset() {
    if (fs.existsSync(this.root)) {
      fs.rmdirSync(this.root, { recursive: true }); // Remove the root directory and its contents.
    }
    fs.mkdirSync(this.root, { recursive: true }); // Recreate the root directory.
  }

  // Returns the parent directory of the given path.
  getParentDirectory(p) {
    const split = p.split(path.sep); // Split the path into its components using the path separator.

    if (p == "." || !split.length) return p; // Return the path itself if it's the current directory or empty.
    if (split.length == 1) return "."; // If there's only one part, return the current directory.

    split.splice(-1); // Remove the last part (i.e., the file or last directory).

    const newPath = split.join(path.sep); // Join the remaining parts back into a path.
    return newPath; // Return the parent directory path.
  }

  // Function to verify that the user is allowed to read an item
  canRead(path, userId) {
    if (!this.fssec) {
      // No FSSec? Then everything is allowed.
      Log(
        "FileSystem.canRead",
        `FSSec isn't loaded! Allowing everything for ${path}`,
        LogType.warning
      );

      return true;
    }

    const securityLevel = userId ? this.fssec.determineSecurityLevel(userId) : SecurityLevel.system;
    const canRead = this.fssec.canReadItem(path, securityLevel, userId);

    if (!canRead) throw new Error(`Access denied: "READ" not allowed on ${path}`);
  }

  canWrite(path, userId) {
    if (!this.fssec) {
      Log(
        "FileSystem.canWrite",
        `FSSec isn't loaded! Allowing everything for ${path}`,
        LogType.warning
      );

      return true;
    }

    const securityLevel = userId ? this.fssec.determineSecurityLevel(userId) : SecurityLevel.system;
    const canWrite = this.fssec.canWriteItem(path, securityLevel, userId);

    if (!canWrite) throw new Error(`Access denied: "WRITE" not allowed on ${path}`);
  }
}
