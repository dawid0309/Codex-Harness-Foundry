import { doctorHarness, resumeHarness, runHarness } from "../src/harness/engine";
import { composeRoleBrief, loadProjectRoleBriefOverlay, roleLabel } from "../src/harness/roles";
import { approveTarget, buildTargetProfileDraft, readTargetRoleBriefs, writeTargetProfileDraft } from "../src/harness/target-profile";
import { loadTargetRegistry, resolveTargetRegistration } from "../src/harness/targets";
import { defaultCliArgs, runManualEvaluation, type HarnessCliArgs } from "../src/harness/worker-controller";

function parseArgs(argv: string[]): HarnessCliArgs {
  const parsed = defaultCliArgs();

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];
    if (current === "--adapter" && next) {
      parsed.adapter = next;
      index += 1;
      continue;
    }
    if (current === "--manifest" && next) {
      parsed.manifest = next;
      index += 1;
      continue;
    }
    if (current === "--targets-file" && next) {
      parsed.targetsFile = next;
      index += 1;
      continue;
    }
    if (current === "--target" && next) {
      parsed.target = next;
      index += 1;
      continue;
    }
    if (current === "--run-id" && next) {
      parsed.runId = next;
      index += 1;
      continue;
    }
    if (current === "--model" && next) {
      parsed.model = next;
      index += 1;
      continue;
    }
    if (current === "--task" && next) {
      parsed.task = next;
      index += 1;
      continue;
    }
    if (current === "--repo" && next) {
      parsed.repo = next;
      index += 1;
      continue;
    }
    if (current === "--label" && next) {
      parsed.label = next;
      index += 1;
    }
  }

  return parsed;
}

function printChecks(checks: { label: string; passed: boolean; detail: string }[]) {
  for (const check of checks) {
    console.log(`- ${check.passed ? "PASS" : "FAIL"} ${check.label}: ${check.detail}`);
  }
}

async function main() {
  const command = process.argv[2] ?? "doctor";
  const args = parseArgs(process.argv.slice(3));
  const controlRepoRoot = process.cwd();

  switch (command) {
    case "run": {
      const result = await runHarness({
        controlRepoRoot,
        manifestPath: args.manifest,
        targetRegistryPath: args.targetsFile,
        targetId: args.target,
        adapterId: args.adapter,
        runId: args.runId,
        model: args.model,
        taskId: args.task,
      });
      console.log(`Harness run completed: ${result.spec.runId}`);
      console.log(`Target: ${result.spec.targetId}`);
      console.log(`Adapter: ${result.spec.adapterId}`);
      console.log(`Task: ${result.contract.caseId}`);
      console.log(`Evaluation passed: ${result.evaluation.passed}`);
      console.log(`State file: ${result.statePath}`);
      return;
    }
    case "resume": {
      if (!args.runId) {
        throw new Error("Usage: pnpm harness:resume -- --target <target-id> --run-id <run-id>");
      }
      const result = await resumeHarness({
        controlRepoRoot,
        manifestPath: args.manifest,
        targetRegistryPath: args.targetsFile,
        targetId: args.target,
        adapterId: args.adapter,
        runId: args.runId,
        model: args.model,
      });
      console.log(`Harness run resumed: ${result.spec.runId}`);
      console.log(`Target: ${result.spec.targetId}`);
      console.log(`Task: ${result.contract.caseId}`);
      console.log(`Evaluation passed: ${result.evaluation.passed}`);
      console.log(`State file: ${result.statePath}`);
      return;
    }
    case "eval": {
      const result = await runManualEvaluation(controlRepoRoot, args);
      console.log(`Manual evaluation completed for ${result.contract.caseId}.`);
      console.log(`Target: ${result.spec.targetId}`);
      console.log(`Evaluation passed: ${result.evaluation.passed}`);
      console.log(`State file: ${result.statePath}`);
      return;
    }
    case "doctor": {
      const result = await doctorHarness({
        controlRepoRoot,
        manifestPath: args.manifest,
        targetRegistryPath: args.targetsFile,
        targetId: args.target,
        adapterId: args.adapter,
      });
      printChecks(result.checks);
      const failed = result.checks.filter((item) => !item.passed);
      console.log(`Doctor target: ${result.spec.targetId}`);
      console.log(`Doctor checks: ${result.checks.length}, failed: ${failed.length}`);
      if (failed.length > 0) {
        process.exitCode = 1;
      }
      return;
    }
    case "target:profile": {
      if (!args.repo) {
        throw new Error("Usage: pnpm harness:target:profile -- --repo <path> [--target <id>] [--label <label>]");
      }
      const draft = await buildTargetProfileDraft(controlRepoRoot, {
        repoPath: args.repo,
        targetId: args.target,
        label: args.label,
      });
      const target = await writeTargetProfileDraft(controlRepoRoot, draft, args.targetsFile);
      console.log(`Target draft generated: ${target.id}`);
      console.log(`Approval state: ${target.approvalState}`);
      console.log(`Config: ${target.adapterConfigPath}`);
      console.log(`Role briefs: ${target.roleBriefsPath ?? "n/a"}`);
      return;
    }
    case "target:approve": {
      if (!args.target) {
        throw new Error("Usage: pnpm harness:target:approve -- --target <target-id>");
      }
      const target = await approveTarget(controlRepoRoot, args.target, args.targetsFile);
      console.log(`Target approved: ${target.id}`);
      console.log(`Approval state: ${target.approvalState}`);
      return;
    }
    case "target:briefs": {
      if (!args.target) {
        throw new Error("Usage: pnpm harness:target:briefs -- --target <target-id>");
      }
      const { target, overlay } = await readTargetRoleBriefs(controlRepoRoot, args.target, args.targetsFile);
      const registry = await loadTargetRegistry(controlRepoRoot, args.targetsFile);
      const resolved = resolveTargetRegistration(controlRepoRoot, registry, target.id);
      console.log(`Target: ${resolved.id}`);
      console.log(`Approval state: ${resolved.approvalState}`);
      console.log(`Role briefs path: ${resolved.roleBriefsPath}`);
      for (const kind of [
        "supervisor",
        "strategy_planner",
        "milestone_planner",
        "case_planner",
        "strategy_evaluator",
        "milestone_evaluator",
        "executor",
        "runtime_operator",
        "environment_remediator",
        "case_evaluator",
        "handoff_recorder",
        "state_reconciler",
      ] as const) {
        const composed = composeRoleBrief(kind, overlay);
        console.log(`\n[${roleLabel(kind)}]`);
        console.log(`Mission: ${composed.mission}`);
        console.log(`Known roles: ${composed.knownRoles.map((item) => roleLabel(item)).join(", ") || "none"}`);
        console.log(`Allowed handoffs: ${composed.allowedHandoffs.map((item) => roleLabel(item)).join(", ") || "none"}`);
        if (composed.projectBias.directionBias.length > 0) {
          console.log(`Direction bias: ${composed.projectBias.directionBias.join(" | ")}`);
        }
        if (composed.projectBias.techBias.length > 0) {
          console.log(`Tech bias: ${composed.projectBias.techBias.join(" | ")}`);
        }
      }
      return;
    }
    default:
      throw new Error(`Unknown harness command "${command}". Expected run, resume, eval, doctor, target:profile, target:approve, or target:briefs.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
