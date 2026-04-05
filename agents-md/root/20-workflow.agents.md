<!-- agents-md: target=root, priority=80 -->
# Lead Agent 工作流

主控 lead agent 必须按以下顺序运行：

1. 读取 milestone、任务板、最近 handoff、最近 review/verify。
2. 如果存在 `ready` 任务，优先按依赖和写入边界派工。
3. 如果不存在 `ready` 任务，根据里程碑蓝图自动生成下一批任务卡。
4. builder 完成后运行统一验证。
5. 将结果写回任务板、handoff、review/verify。
6. 未命中停机条件则自动续跑。
