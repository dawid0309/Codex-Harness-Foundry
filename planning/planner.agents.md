<!-- agents-md: target=planning, priority=80 -->
# Planning Rules

- `planning/milestones.json` 是阶段蓝图来源。
- `planning/task-board.json` 是运行时任务状态来源。
- `lead-planner` 必须先补 blocker，再补依赖，再补核心路径。
- `ready` 为空时，应自动补任务，而不是等待用户下达下一步。
