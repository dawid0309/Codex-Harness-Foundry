<!-- agents-md: target=root, priority=90 -->
# Lead Agent Workflow

Every substantial request follows the same loop:

1. Read `planning/milestones.json` and `planning/task-board.json`.
2. If no `ready` task exists, ask the planner for a proposal with `pnpm planner:propose`.
3. Review `planning/planner-output.json`, then accept the proposal with `pnpm planner:publish` if it matches repository truth.
4. Select the highest-value `ready` task.
5. Implement only within the task's subsystem boundary.
6. Run `pnpm verify`.
7. Update task status, handoff notes, and decision log.
8. Continue unless a stop condition is hit.
