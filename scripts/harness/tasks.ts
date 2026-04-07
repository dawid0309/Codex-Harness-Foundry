import { loadJson, saveJson, taskBoardPath, type TaskBoard, type TaskCard, type TaskStatus } from "../planner-state";
const allowedStatuses: TaskStatus[] = [
  "backlog",
  "ready",
  "in_progress",
  "blocked",
  "review",
  "verified",
  "done",
];

async function loadBoard(): Promise<TaskBoard> {
  return loadJson<TaskBoard>(taskBoardPath);
}

async function saveBoard(taskBoard: TaskBoard): Promise<void> {
  await saveJson(taskBoardPath, taskBoard);
}

function printTask(task: TaskCard) {
  const deps = task.dependencies.length > 0 ? ` deps:${task.dependencies.join(",")}` : "";
  console.log(`- ${task.id} [${task.status}] [${task.priority}] ${task.title} -> ${task.owner_role}${deps}`);
}

async function status(filter?: TaskStatus) {
  const taskBoard = await loadBoard();
  const tasks = filter ? taskBoard.tasks.filter((task) => task.status === filter) : taskBoard.tasks;
  const counts = allowedStatuses.map(
    (value) => `${value}:${taskBoard.tasks.filter((task) => task.status === value).length}`,
  );

  console.log(`Current milestone: ${taskBoard.currentMilestoneId ?? "none"}`);
  console.log(`Last refreshed: ${taskBoard.lastRefreshedAt ?? "never"}`);
  console.log(`Task counts: ${counts.join(" | ")}`);

  if (tasks.length === 0) {
    console.log(filter ? `No tasks with status ${filter}.` : "No tasks on the board.");
    return;
  }

  console.log("Tasks:");
  for (const task of tasks) {
    printTask(task);
  }
}

async function plan() {
  const taskBoard = await loadBoard();
  const ready = taskBoard.tasks.filter((task) => task.status === "ready");

  if (ready.length === 0) {
    console.log("No ready tasks. Run `pnpm planner:propose` and `pnpm planner:publish`, or use `pnpm planner:refresh` as the compatibility shortcut.");
    return;
  }

  console.log("Recommended next tasks:");
  for (const task of ready.slice(0, 4)) {
    printTask(task);
  }
}

function parseStatus(value: string): TaskStatus {
  if (allowedStatuses.includes(value as TaskStatus)) {
    return value as TaskStatus;
  }

  throw new Error(`Invalid status '${value}'. Expected one of: ${allowedStatuses.join(", ")}`);
}

async function update(taskId: string | undefined, nextStatusRaw: string | undefined) {
  if (!taskId || !nextStatusRaw) {
    throw new Error("Usage: pnpm tasks:update -- <task-id> <status>");
  }

  const nextStatus = parseStatus(nextStatusRaw);
  const taskBoard = await loadBoard();
  const task = taskBoard.tasks.find((entry) => entry.id === taskId);

  if (!task) {
    throw new Error(`Task '${taskId}' was not found in planning/task-board.json`);
  }

  task.status = nextStatus;
  await saveBoard(taskBoard);
  console.log(`Updated ${task.id} to ${task.status}.`);
}

async function main() {
  const command = process.argv[2] ?? "status";

  if (command === "plan") {
    await plan();
    return;
  }

  if (command === "status") {
    const maybeFilter = process.argv[3];
    await status(maybeFilter ? parseStatus(maybeFilter) : undefined);
    return;
  }

  if (command === "update") {
    await update(process.argv[3], process.argv[4]);
    return;
  }

  throw new Error(`Unknown command '${command}'. Expected plan, status, or update.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
