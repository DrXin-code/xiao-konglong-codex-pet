#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(scriptDir, "..");
const defaultPort = 49321;
const args = new Set(process.argv.slice(2));
const portArg = readArg("--port");
const host = readArg("--host") || "127.0.0.1";
const noOpen = args.has("--no-open");
const requestedPort = Number(portArg || process.env.PORT || defaultPort);
const sseClients = new Set();

const coreStates = [
  "idle",
  "running-right",
  "running-left",
  "waving",
  "jumping",
  "failed",
  "waiting",
  "running",
  "review",
];

const extendedStates = await loadExtendedStates();
const knownStates = new Set([...coreStates, ...extendedStates]);

const server = createServer(async (request, response) => {
  try {
    await route(request, response);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Internal server error" });
  }
});

const port = await listenWithFallback(server, host, requestedPort);
const baseUrl = `http://${host}:${port}`;

console.log(`小恐龙本地状态机已启动: ${baseUrl}/runtime/`);
console.log(`本地触发示例: ${baseUrl}/trigger/celebrate`);
console.log("按 Ctrl+C 停止服务。");

if (!noOpen) {
  openBrowser(`${baseUrl}/runtime/`);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return "";
  }
  return process.argv[index + 1] || "";
}

async function loadExtendedStates() {
  const file = join(rootDir, "extras", "extended-states.json");
  const raw = await readFile(file, "utf8");
  const config = JSON.parse(raw);
  return config.extendedStates.map((state) => state.id);
}

async function route(request, response) {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/") {
    redirect(response, "/runtime/");
    return;
  }

  if (request.method === "GET" && url.pathname === "/runtime") {
    redirect(response, "/runtime/");
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/states") {
    sendJson(response, 200, {
      coreStates,
      extendedStates,
      allStates: [...knownStates],
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/events") {
    connectEvents(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/trigger") {
    const body = await readJson(request);
    triggerState(response, body.state, body.reason || "本地 API 触发");
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/trigger/")) {
    const state = decodeURIComponent(url.pathname.replace("/trigger/", ""));
    const reason = url.searchParams.get("reason") || "本地 URL 触发";
    triggerState(response, state, reason);
    return;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    await serveStatic(request, response, url.pathname);
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}

function connectEvents(request, response) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  response.write("event: ready\n");
  response.write(`data: ${JSON.stringify({ ok: true })}\n\n`);
  sseClients.add(response);

  request.on("close", () => {
    sseClients.delete(response);
  });
}

function triggerState(response, state, reason) {
  if (!knownStates.has(state)) {
    sendJson(response, 400, {
      error: "Unknown state",
      state,
      knownStates: [...knownStates],
    });
    return;
  }

  const payload = {
    state,
    reason,
    at: new Date().toISOString(),
  };

  broadcast("trigger", payload);
  sendJson(response, 200, { ok: true, ...payload });
}

function broadcast(event, payload) {
  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    client.write(message);
  }
}

async function serveStatic(request, response, pathname) {
  const decoded = decodeURIComponent(pathname);
  let target = normalize(join(rootDir, decoded));

  if (decoded.endsWith("/")) {
    target = join(target, "index.html");
  }

  const rel = relative(rootDir, target);
  if (rel.startsWith("..") || rel === "") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      redirect(response, `${pathname.replace(/\/?$/, "/")}index.html`);
      return;
    }
    await access(target);
  } catch {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeType(target),
    "Cache-Control": "no-cache",
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(target).pipe(response);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache",
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function redirect(response, location) {
  response.writeHead(302, { Location: location });
  response.end();
}

function readJson(request) {
  return new Promise((resolveJson, rejectJson) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 64) {
        rejectJson(new Error("Request body too large"));
      }
    });
    request.on("end", () => {
      if (!body.trim()) {
        resolveJson({});
        return;
      }
      try {
        resolveJson(JSON.parse(body));
      } catch (error) {
        rejectJson(error);
      }
    });
    request.on("error", rejectJson);
  });
}

function mimeType(file) {
  const types = {
    ".css": "text/css; charset=utf-8",
    ".gif": "image/gif",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  return types[extname(file).toLowerCase()] || "application/octet-stream";
}

function listenWithFallback(httpServer, listenHost, startPort) {
  return new Promise((resolvePort, rejectPort) => {
    let port = startPort;

    function tryListen() {
      httpServer.once("error", onError);
      httpServer.listen(port, listenHost, () => {
        httpServer.off("error", onError);
        resolvePort(port);
      });
    }

    function onError(error) {
      httpServer.off("error", onError);
      if (error.code === "EADDRINUSE" && port < startPort + 30) {
        port += 1;
        tryListen();
        return;
      }
      rejectPort(error);
    }

    tryListen();
  });
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

function shutdown() {
  for (const client of sseClients) {
    client.end();
  }
  server.close(() => {
    process.exit(0);
  });
}
