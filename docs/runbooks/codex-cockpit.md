# Codex Cockpit Runbook

## 你在 Codex 里的默认操作

只保留一个主线程，优先使用这些高层命令：

- `继续推进当前里程碑`
- `为这个功能开一个实验路线对比`
- `总结当前所有实验分支的结论`
- `把已验证的任务整理成里程碑提交`

## 主线程固定动作

1. 读 `AGENTS.md`
2. 跑 `pnpm planner:refresh`
3. 读 `planning/task-board.json`
4. 选择下一批 `ready` 任务
5. 完成后跑 `pnpm verify`
6. 回写状态
