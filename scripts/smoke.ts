import { readFile } from "node:fs/promises";
import path from "node:path";

async function load(relativePath: string) {
  return JSON.parse(await readFile(path.join(process.cwd(), relativePath), "utf8"));
}

async function main() {
  const milestones = await load("planning/milestones.json");
  const taskBoard = await load("planning/task-board.json");
  const plannerOutput = await load("planning/planner-output.json");

  if (!Array.isArray(milestones) || milestones.length === 0) {
    throw new Error("milestones.json must contain at least one milestone.");
  }

  if (!Array.isArray(taskBoard.tasks)) {
    throw new Error("task-board.json must contain a tasks array.");
  }

  if (!plannerOutput || typeof plannerOutput !== "object") {
    throw new Error("planner-output.json must contain a planner output object.");
  }

  if (!plannerOutput.publication || !Array.isArray(plannerOutput.publication.newTasks)) {
    throw new Error("planner-output.json must include publication.newTasks.");
  }

  if (!Array.isArray(plannerOutput.publication.statusUpdates)) {
    throw new Error("planner-output.json must include publication.statusUpdates.");
  }

  console.log(`Smoke OK: ${milestones.length} milestones, ${taskBoard.tasks.length} tasks, planner output present.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
