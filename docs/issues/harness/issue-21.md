# Issue #21: Windows detached runtime sandbox breaks shell startup and can false-complete

- Batch: followup
- Status: landed
- Linked issues: [#19](https://github.com/dawid0309/Codex-Harness-Foundry/issues/19)

## Summary

Make the Windows detached runtime resilient to shell-sandbox startup failures and forbid completed status when no repo-local command actually ran.

## Repo Evidence

- Detached runtime shell startup can fail on Windows before any repository command executes.
- Structural stop predicates alone are not enough to prove useful runtime progress if the cycle never reaches repo-local command execution.

## Implementation Notes

- Keep CODEX_HOME repo-scoped but preserve the real Windows profile directories for detached runs.
- Fall back from workspace-write to danger-full-access for Windows detached runtime sessions so shell startup can reach repo commands reliably.
- Classify shell-startup failures explicitly and prevent completed state when a cycle exits before any repo-local command executes.

## Closure Condition

- Windows detached runtime status reports shell-startup failures accurately and no longer enters completed when a cycle never executes a repo-local command.

