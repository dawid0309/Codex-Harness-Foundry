<!-- agents-md: target=root, priority=80 -->
# Orchestrator Loop

- 主线程是总控台。
- 每次用户给出高层目标后，先读 `planning/task-board.json`。
- 先跑 `pnpm planner:refresh`，再根据 `pnpm planner:next` 决定下一批任务。
- 任务完成后必须跑 `pnpm verify`。
