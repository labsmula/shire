import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const npmCommand = process.execPath;
const npmCli = path.join(
  path.dirname(process.execPath),
  "node_modules",
  "npm",
  "bin",
  "npm-cli.js",
);

const workspaces = [
  {
    name: "web",
    cwd: path.join(rootDir, "apps", "web"),
  },
  {
    name: "agent",
    cwd: path.join(rootDir, "apps", "agent"),
  },
];

const children = new Map();
let shuttingDown = false;

function prefixStream(stream, prefix) {
  let buffer = "";

  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.length > 0) {
        process.stdout.write(`[${prefix}] ${line}\n`);
      }
    }
  });

  stream.on("end", () => {
    if (buffer.length > 0) {
      process.stdout.write(`[${prefix}] ${buffer}\n`);
    }
  });
}

function stopChildren(signal = "SIGTERM") {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children.values()) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

function spawnWorkspace(workspace) {
  if (!existsSync(workspace.cwd)) {
    throw new Error(`Missing workspace directory: ${workspace.cwd}`);
  }

  const args = existsSync(npmCli) ? [npmCli, "run", "dev"] : ["run", "dev"];
  const child = spawn(npmCommand, args, {
    cwd: workspace.cwd,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    windowsHide: true,
  });

  children.set(workspace.name, child);
  prefixStream(child.stdout, workspace.name);
  prefixStream(child.stderr, workspace.name);

  child.on("exit", (code, signal) => {
    children.delete(workspace.name);

    if (shuttingDown) {
      if (children.size === 0) {
        process.exit(code ?? 0);
      }
      return;
    }

    const reason =
      signal !== null
        ? `${workspace.name} exited from signal ${signal}`
        : `${workspace.name} exited with code ${code ?? 0}`;

    process.stderr.write(`${reason}\n`);
    stopChildren();
    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    process.stderr.write(
      `failed to start ${workspace.name}: ${error.message}\n`,
    );
    stopChildren();
    process.exit(1);
  });
}

process.on("SIGINT", () => stopChildren("SIGINT"));
process.on("SIGTERM", () => stopChildren("SIGTERM"));

for (const workspace of workspaces) {
  spawnWorkspace(workspace);
}
