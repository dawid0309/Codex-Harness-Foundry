<!-- agents-md: target=root, priority=90 -->
# Lead Agent Workflow

Every substantial request follows the same loop:

1. Read `docs/intent/current.md`, `planning/milestones.json`, and `planning/task-board.json`.
2. Run `pnpm planner:refresh` if no `ready` task exists.
3. Select the highest-value `ready` task.
4. Implement only within the task's subsystem boundary.
5. Run `pnpm verify`.
6. Update task status, handoff notes, decision log, and any repo-first feedback artifacts.
7. Stop after one coherent harness cycle unless a human explicitly starts another worker cycle.
