# Codex Team Harness Template

这是一个可复用的 Codex 工作台模板，用来给新项目快速搭建：

- `agents-md` 上下文骨架
- `lead-planner` 自动续任务
- `task-board` 长期运行任务系统
- `git` 里程碑分支 / 实验分支策略
- `verify` 统一验证门

## 用法

1. 复制本目录作为你的新项目起点
2. 替换下面这些占位符：
   - `__PROJECT_NAME__`
   - `__PROJECT_GOAL__`
   - `__STACK__`
3. 安装依赖：

```powershell
pnpm install
```

4. 生成上下文：

```powershell
pnpm compose:agents
```

5. 刷新任务板：

```powershell
pnpm planner:refresh
pnpm planner:next
```

6. 开始在 Codex 主线程里使用：

- `继续推进当前里程碑`
- `为这个功能开一个实验路线对比`
- `总结当前所有实验分支的结论`
- `把已验证的任务整理成里程碑提交`

## 模板目标

这套模板的设计目标不是“让 Agent 会说话”，而是让 Agent 能稳定推进：

`读上下文 -> 刷任务板 -> 选 ready -> 开发 -> verify -> 回写 -> 自动继续`
