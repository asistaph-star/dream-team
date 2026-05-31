import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const scriptPath = "scratch/sync_player_updates.py";
const bundledPython = join(
  homedir(),
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "python",
  "python.exe"
);

const candidates = [
  { command: process.env.PYTHON, args: [] },
  { command: "python", args: [] },
  { command: "python3", args: [] },
  { command: "py", args: ["-3"] },
  { command: bundledPython, args: [] },
].filter((candidate) => candidate.command);

let lastError = "";

for (const candidate of candidates) {
  if (candidate.command === bundledPython && !existsSync(bundledPython)) continue;

  const result = spawnSync(candidate.command, [...candidate.args, scriptPath], {
    stdio: "inherit",
    shell: false,
  });

  if (!result.error) {
    process.exit(result.status ?? 0);
  }

  lastError = `${candidate.command}: ${result.error.message}`;
}

console.error("Could not find a Python runtime for player sync.");
if (lastError) console.error(lastError);
console.error("Install Python, set PYTHON, or run inside Codex with its bundled runtime available.");
process.exit(1);
