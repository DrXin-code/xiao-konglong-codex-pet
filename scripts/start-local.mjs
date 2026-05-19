#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { openSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(scriptDir, "..");
const localDir = resolve(rootDir, ".local");
const pidFile = resolve(localDir, "xiao-konglong.pid");
const logFile = resolve(localDir, "xiao-konglong.log");
const urlFile = resolve(localDir, "xiao-konglong.url");
const noOpen = process.argv.includes("--no-open");

await mkdir(localDir, { recursive: true });

const existingPid = await readExistingPid();
if (existingPid && isRunning(existingPid)) {
  const url = await readExistingUrl();
  console.log(`小恐龙本地状态机已在运行: ${url}`);
  if (!noOpen) {
    openBrowser(url);
  }
  process.exit(0);
}

await writeFile(logFile, "");
const out = openSync(logFile, "a");
const child = spawn(process.execPath, ["scripts/run-local.mjs", "--port", "49321", "--no-open"], {
  cwd: rootDir,
  detached: true,
  stdio: ["ignore", out, out],
});

child.unref();
await writeFile(pidFile, `${child.pid}\n`);

const url = await waitForUrl();
await writeFile(urlFile, `${url}\n`);
console.log(`小恐龙本地状态机已启动: ${url}`);
console.log(`本地触发示例: ${url.replace(/\/runtime\/$/, "")}/trigger/celebrate`);

if (!noOpen) {
  openBrowser(url);
}

async function readExistingPid() {
  try {
    return Number((await readFile(pidFile, "utf8")).trim());
  } catch {
    return 0;
  }
}

async function readExistingUrl() {
  try {
    return (await readFile(urlFile, "utf8")).trim();
  } catch {
    return "http://127.0.0.1:49321/runtime/";
  }
}

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForUrl() {
  for (let i = 0; i < 50; i += 1) {
    const log = await readLog();
    const match = log.match(/(http:\/\/127\.0\.0\.1:\d+\/runtime\/)/);
    if (match) {
      return match[1];
    }
    await sleep(100);
  }
  throw new Error(`本地服务启动失败，请查看日志: ${logFile}`);
}

async function readLog() {
  try {
    return await readFile(logFile, "utf8");
  } catch {
    return "";
  }
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function openBrowser(url) {
  const commands = {
    darwin: ["open", url],
    win32: ["cmd", "/c", "start", "", url],
    linux: ["xdg-open", url],
  };
  const command = commands[process.platform];
  if (!command) {
    return;
  }
  spawn(command[0], command.slice(1), {
    detached: true,
    stdio: "ignore",
  }).unref();
}
