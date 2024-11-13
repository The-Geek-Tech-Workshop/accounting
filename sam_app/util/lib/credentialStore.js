import { readFile, writeFile, mkdir } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

const CONFIG_DIR = join(homedir(), ".accounting-util");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export const storeCredential = async (key, value) => {
  // Create config directory if it doesn't exist
  await mkdir(CONFIG_DIR, { recursive: true });

  // Read existing config or create new one
  let config = {};
  try {
    config = JSON.parse(await readFile(CONFIG_FILE, "utf8"));
  } catch (error) {
    // File doesn't exist or is invalid, use empty config
  }

  // Update config with new value
  config[key] = value;

  // Write updated config
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
};

export const loadCredentials = async () => {
  try {
    return JSON.parse(await readFile(CONFIG_FILE, "utf8"));
  } catch (error) {
    return {};
  }
};
