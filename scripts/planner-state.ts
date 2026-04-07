import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type TaskStatus =
  | "backlog"
  | "ready"
  | "in_progress"
  | "blocked"
  | "review"
  | "verified"
  | "done";

type TaskMetadata = {
  input_artifacts?: string[];
  expected_output?: string[];
  acceptance?: string[];
  verification?: string[];
  next_consumer?: string;
  [key: string]: unknown;
};

export type TaskCard = TaskMetadata & {
  id: string;
  title: string;
  milestone: string;
  status: TaskStatus;
  priority: string;
  owner_role: string;
  dependencies: string[];
};

export type TaskBlueprint = TaskMetadata & {
  id: string;
  title: string;
  milestone: string;
  priority: string;
  owner_role: string;
  dependencies: string[];
};

export type Milestone = {
  id: string;
  order: number;
  taskBlueprints: TaskBlueprint[];
  [key: string]: unknown;
};

export type TaskBoard = {
  currentMilestoneId?: string | null;
  lastRefreshedAt?: string | null;
  tasks: TaskCard[];
};

export type PlannerStatusUpdate = {
  id: string;
  from: TaskStatus;
  to: TaskStatus;
};

export type PlannerPublication = {
  currentMilestoneId: string | null;
  newTasks: TaskCard[];
  statusUpdates: PlannerStatusUpdate[];
};

export type PlannerReadyTask = Pick<TaskCard, "id" | "title" | "priority" | "owner_role" | "status">;

export type PlannerOutput = {
  generatedAt: string | null;
  activeMilestoneId: string | null;
  summary: string[];
  publication: PlannerPublication;
  recommendedNextTasks: PlannerReadyTask[];
};

export const root = process.cwd();
export const milestonesPath = path.join(root, "planning", "milestones.json");
export const taskBoardPath = path.join(root, "planning", "task-board.json");
export const plannerOutputPath = path.join(root, "planning", "planner-output.json");

export async function loadJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export async function saveJson<T>(filePath: string, payload: T): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export function isDone(status: TaskStatus) {
  return status === "done" || status === "verified";
}

function computeActiveMilestone(taskBoard: TaskBoard, milestones: Milestone[]): Milestone | null {
  const sorted = [...milestones].sort((left, right) => left.order - right.order);
  let activeId = taskBoard.currentMilestoneId ?? sorted[0]?.id ?? null;

  for (const milestone of sorted) {
    const existing = taskBoard.tasks.filter((task) => task.milestone === milestone.id);
    const allDone =
      milestone.taskBlueprints.length > 0 &&
      milestone.taskBlueprints.every((blueprint) =>
        existing.some((task) => task.id === blueprint.id && isDone(task.status)),
      );

    if (!allDone) {
      activeId = milestone.id;
      break;
    }
  }

  return sorted.find((milestone) => milestone.id === activeId) ?? sorted[0] ?? null;
}

function cloneTaskBoard(taskBoard: TaskBoard): TaskBoard {
  return {
    currentMilestoneId: taskBoard.currentMilestoneId ?? null,
    lastRefreshedAt: taskBoard.lastRefreshedAt ?? null,
    tasks: taskBoard.tasks.map((task) => ({ ...task })),
  };
}

export function defaultPlannerOutput(): PlannerOutput {
  return {
    generatedAt: null,
    activeMilestoneId: null,
    summary: ["No planner proposal has been generated yet."],
    publication: {
      currentMilestoneId: null,
      newTasks: [],
      statusUpdates: [],
    },
    recommendedNextTasks: [],
  };
}

export function buildPlannerOutput(taskBoard: TaskBoard, milestones: Milestone[]): PlannerOutput {
  const activeMilestone = computeActiveMilestone(taskBoard, milestones);

  if (!activeMilestone) {
    return {
      ...defaultPlannerOutput(),
      generatedAt: new Date().toISOString(),
      summary: ["No milestones are available, so the planner cannot publish tasks."],
    };
  }

  const map = new Map(taskBoard.tasks.map((task) => [task.id, task]));
  const publication: PlannerPublication = {
    currentMilestoneId: activeMilestone.id,
    newTasks: [],
    statusUpdates: [],
  };

  for (const blueprint of activeMilestone.taskBlueprints) {
    const existing = map.get(blueprint.id);
    const depsOk = blueprint.dependencies.every((dep) => isDone(map.get(dep)?.status ?? "backlog"));

    if (!existing) {
      publication.newTasks.push({
        ...blueprint,
        status: depsOk ? "ready" : "backlog",
      });
      continue;
    }

    if (existing.status === "backlog" && depsOk) {
      publication.statusUpdates.push({
        id: existing.id,
        from: existing.status,
        to: "ready",
      });
    }
  }

  const preview = applyPlannerPublication(cloneTaskBoard(taskBoard), {
    generatedAt: new Date().toISOString(),
    activeMilestoneId: activeMilestone.id,
    summary: [],
    publication,
    recommendedNextTasks: [],
  }, false);

  const recommendedNextTasks = preview.tasks
    .filter((task) => task.status === "ready")
    .slice(0, 4)
    .map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      owner_role: task.owner_role,
      status: task.status,
    }));

  const summary = [
    `Planner proposed ${publication.newTasks.length} new task publication(s).`,
    `Planner proposed ${publication.statusUpdates.length} backlog-to-ready transition(s).`,
    `Leader should accept or reject publication for milestone ${activeMilestone.id}.`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    activeMilestoneId: activeMilestone.id,
    summary,
    publication,
    recommendedNextTasks,
  };
}

export function applyPlannerPublication(
  taskBoard: TaskBoard,
  plannerOutput: PlannerOutput,
  markRefreshed = true,
): TaskBoard {
  let didChange = false;

  if ((taskBoard.currentMilestoneId ?? null) !== plannerOutput.publication.currentMilestoneId) {
    taskBoard.currentMilestoneId = plannerOutput.publication.currentMilestoneId;
    didChange = true;
  }

  const map = new Map(taskBoard.tasks.map((task) => [task.id, task]));
  for (const task of plannerOutput.publication.newTasks) {
    if (map.has(task.id)) {
      continue;
    }
    const clone = { ...task };
    taskBoard.tasks.push(clone);
    map.set(clone.id, clone);
    didChange = true;
  }

  for (const update of plannerOutput.publication.statusUpdates) {
    const existing = map.get(update.id);
    if (!existing || existing.status === update.to) {
      continue;
    }
    existing.status = update.to;
    didChange = true;
  }

  if (didChange && markRefreshed) {
    taskBoard.lastRefreshedAt = new Date().toISOString();
  }

  return taskBoard;
}
