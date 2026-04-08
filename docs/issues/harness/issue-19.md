# Issue #19: Runtime misclassifies policy rejections as read-only blockers

- Batch: followup
- Status: landed
- Linked issues: [#15](https://github.com/dawid0309/Codex-Harness-Foundry/issues/15)

## Summary

Make runtime blocker classification precedence-aware so explicit policy and helper-launch rejections win over generic read-only or write-capability text.

## Repo Evidence

- The runtime already classifies blockers from last-message, stdout event output, and stderr text.
- Generic write-capability wording can coexist with more specific policy or helper-launch failures in the same runtime cycle.

## Implementation Notes

- Move blocker classification into a dedicated helper module so it can be verified directly.
- Prioritize policy rejection and helper-launch failure patterns before read-only and write-capability patterns.
- Treat helper-launch cancellation and ShellExecuteExW setup-helper failures as policy-side blockers for operator diagnostics.

## Closure Condition

- Runtime status reports policy-side failures as policy-rejection instead of workspace-read-only when both kinds of text appear together.

