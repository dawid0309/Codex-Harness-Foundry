import { readFile } from "node:fs/promises";
import path from "node:path";

async function load(relativePath: string) {
  return JSON.parse(await readFile(path.join(process.cwd(), relativePath), "utf8"));
}

async function main() {
  const milestones = await load("planning/milestones.json");
  const taskBoard = await load("planning/task-board.json");

  if (!Array.isArray(milestones) || milestones.length === 0) {
    throw new Error("milestones.json must contain at least one milestone.");
  }

  if (!Array.isArray(taskBoard.tasks)) {
    throw new Error("task-board.json must contain a tasks array.");
  }

  console.log(`Smoke OK: ${milestones.length} milestones, ${taskBoard.tasks.length} tasks.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
