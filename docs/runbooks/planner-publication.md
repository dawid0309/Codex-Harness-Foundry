# Planner Publication Runbook

Use this runbook when you want to keep leader/orchestrator decisions separate from planner task publication.

## Repo Roles

- `planning/milestones.json` is the milestone blueprint
- `planning/planner-output.json` is the planner-owned proposal artifact
- `planning/task-board.json` is the leader-approved execution state

## Standard Flow

1. Generate a planner proposal:

```powershell
pnpm planner:propose
```

2. Review `planning/planner-output.json`.
3. Accept the planner output into the task board:

```powershell
pnpm planner:publish
```

4. Choose the next published task:

```powershell
pnpm planner:next
```

## Compatibility Shortcut

If you want the previous one-command behavior, use:

```powershell
pnpm planner:refresh
```

That command now acts as a convenience wrapper for `planner:propose` followed by `planner:publish`.
