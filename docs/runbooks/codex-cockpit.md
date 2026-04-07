# Codex Cockpit Runbook

## Default Operator Prompts

Keep one main Codex thread focused on orchestration. Useful high-level prompts include:

- `Continue the current milestone`
- `Pick the highest-value ready task and implement it`
- `Open an experiment branch for this feature`
- `Summarize verified progress and propose the next slice`

## Standard Main-Thread Loop

1. Read `AGENTS.md`.
2. Run `pnpm planner:propose`.
3. Review `planning/planner-output.json`.
4. If the proposal matches repository truth, run `pnpm planner:publish`.
5. Review `planning/task-board.json`.
6. Pick the next `ready` task with the highest value and lowest dependency risk.
7. Implement only within the subsystem boundary described by the task.
8. Run `pnpm verify`.
9. Update task state, handoff notes, and any review or decision records.

`pnpm planner:refresh` is still available as the compatibility shortcut when you want both proposal and publication in one command.

## When To Pause

Pause and ask for human input only when:

- the request would expand or change the MVP boundary
- a core architecture decision must change
- a new costly external dependency is required
- the same path has failed repeatedly without new evidence
- deployment, permissions, compliance, or secret management blocks progress
