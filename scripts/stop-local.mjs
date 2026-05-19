#!/usr/bin/env node
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(scriptDir, "..");
const localDir = resolve(rootDir, ".local");
const pidFile = resolve(localDir, "xiao-konglong.pid");
const urlFile = resolve(localDir, "xiao-konglong.url");

const pid = await readPid();
if (!pid) {
  console.log("小恐龙本地状态机没有运行。");
  process.exit(0);
}

try {
  process.kill(pid, "SIGTERM");
  console.log(`已停止小恐龙本地状态机: ${pid}`);
} catch (error) {
  if (error.code === "ESRCH") {
    console.log("小恐龙本地状态机没有运行。");
  } else {
    throw error;
  }
}

await rm(pidFile, { force: true });
await rm(urlFile, { force: true });

async function readPid() {
  try {
    return Number((await readFile(pidFile, "utf8")).trim());
  } catch {
    return 0;
  }
}
