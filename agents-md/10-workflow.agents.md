<!-- agents-md: target=root, priority=90 -->
# Lead Agent Workflow

Every substantial request follows the same loop:

1. Read `planning/milestones.json` and `planning/task-board.json`.
2. Run `pnpm planner:refresh` if no `ready` task exists.
3. Select the highest-value `ready` task.
4. Implement only within the task's subsystem boundary.
5. Run `pnpm verify`.
6. Update task status, handoff notes, and decision log.
7. Continue unless a stop condition is hit.
