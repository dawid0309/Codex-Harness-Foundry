<!-- agents-md: target=root, priority=80 -->
# Lead Agent Workflow

The main lead agent should operate in this order:

1. Read the milestones, task board, latest handoff, and latest review or verification notes.
2. If `ready` tasks exist, prioritize by dependency order and subsystem boundaries.
3. If no `ready` task exists, request a planner proposal and inspect `planning/planner-output.json`.
4. Accept planner output into the task board only after verifying it matches repository truth.
5. After a builder finishes, run the shared verification gate.
6. Write the result back into the task board, handoff, and review or verification records.
7. Continue automatically unless a stop condition is reached.
