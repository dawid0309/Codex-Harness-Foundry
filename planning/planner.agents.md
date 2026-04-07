<!-- agents-md: target=nearest, priority=80 -->
# Planning Rules

- `planning/milestones.json` is the blueprint for staged delivery.
- `planning/task-board.json` is the live execution state.
- `planning/planner-output.json` is the planner artifact proposed for leader review.
- The planner should unblock blockers first, then dependencies, then the core path.
- When `ready` is empty, generate the next publication proposal from the milestone blueprint instead of writing directly to the task board.
