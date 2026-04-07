# Issue #12: Separate leader orchestration from planner task publication

- Batch: followup
- Status: planned
- Linked issues: None

## Summary

Separate planner publication from leader/orchestrator control so task publication is proposed in an explicit repo artifact before it is accepted into the live task board.

## Repo Evidence

- planner:refresh currently combines generating task publications with applying them to the live task board.
- The repo already models planner, builder, and verifier roles, but task publication did not have its own artifact.

## Implementation Notes

- Introduce planning/planner-output.json as the planner-owned proposal artifact.
- Add planner:propose and planner:publish so leader acceptance is explicit.
- Update role guidance so leader/orchestrator reviews planner output instead of generating task publications inline.

## Closure Condition

- Leader orchestration and planner publication are separated in code, repo artifacts, and docs.

