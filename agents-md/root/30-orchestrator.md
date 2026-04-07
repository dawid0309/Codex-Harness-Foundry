<!-- agents-md: target=root, priority=80 -->
# Orchestrator Loop

- Keep one main thread as the orchestrator.
- After any high-level user goal, read `planning/task-board.json` first.
- Request planner output with `pnpm planner:propose`, inspect `planning/planner-output.json`, then accept it with `pnpm planner:publish`.
- Use `pnpm planner:next` to choose the next published task.
- Every completed task must pass `pnpm verify` before it counts as done.
