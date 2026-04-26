import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import baseBriefsJson from "./role-briefs/base-briefs.json";
import type {
  EvaluationFailureClass,
  EvaluationFailureScope,
  HarnessBaseRoleBrief,
  HarnessComposedRoleBrief,
  HarnessFailureEnvelope,
  HarnessProjectRoleBriefOverlay,
  HarnessProjectRoleBriefOverlayEntry,
  HarnessRoleContextPacket,
  HarnessRoleGroup,
  HarnessRoleKind,
  HarnessRolePermission,
  HarnessTargetRegistration,
  HarnessTaskNode,
} from "./types";

const BASE_BRIEFS = baseBriefsJson as Record<HarnessRoleKind, HarnessBaseRoleBrief>;

const ROLE_LABELS: Record<HarnessRoleKind, string> = {
  supervisor: "Supervisor",
  strategy_planner: "Strategy Planner",
  milestone_planner: "Milestone Planner",
  case_planner: "Case Planner",
  strategy_evaluator: "Strategy Evaluator",
  milestone_evaluator: "Milestone Evaluator",
  executor: "Executor",
  runtime_operator: "Runtime Operator",
  environment_remediator: "Environment Remediator",
  case_evaluator: "Case Evaluator",
  handoff_recorder: "Handoff Recorder",
  state_reconciler: "State Reconciler",
};

const ROLE_GROUPS: Record<HarnessRoleKind, HarnessRoleGroup> = {
  supervisor: "supervisor",
  strategy_planner: "planning",
  milestone_planner: "planning",
  case_planner: "planning",
  strategy_evaluator: "planning",
  milestone_evaluator: "planning",
  executor: "execution",
  runtime_operator: "env_ops",
  environment_remediator: "env_ops",
  case_evaluator: "assurance",
  handoff_recorder: "assurance",
  state_reconciler: "assurance",
};

const ROLE_PERMISSIONS: Record<HarnessRoleKind, HarnessRolePermission> = {
  supervisor: {
    canSpawn: true,
    canStop: true,
    canDirect: true,
    allowedChildren: [
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
    ],
  },
  strategy_planner: { canSpawn: false, canStop: false, canDirect: false, allowedChildren: [] },
  milestone_planner: { canSpawn: false, canStop: false, canDirect: false, allowedChildren: [] },
  case_planner: { canSpawn: false, canStop: false, canDirect: false, allowedChildren: [] },
  strategy_evaluator: { canSpawn: false, canStop: false, canDirect: false, allowedChildren: [] },
  milestone_evaluator: { canSpawn: false, canStop: false, canDirect: false, allowedChildren: [] },
  executor: { canSpawn: true, canStop: true, canDirect: true, allowedChildren: [] },
  runtime_operator: { canSpawn: true, canStop: true, canDirect: true, allowedChildren: [] },
  environment_remediator: { canSpawn: true, canStop: true, canDirect: true, allowedChildren: [] },
  case_evaluator: { canSpawn: false, canStop: false, canDirect: false, allowedChildren: [] },
  handoff_recorder: { canSpawn: false, canStop: false, canDirect: false, allowedChildren: [] },
  state_reconciler: { canSpawn: false, canStop: false, canDirect: false, allowedChildren: [] },
};

function collapseWhitespace(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed || null;
}

function uniq<T>(values: T[]) {
  return [...new Set(values)];
}

function mergeStrings(...lists: Array<string[] | undefined>) {
  return uniq(lists.flatMap((list) => list ?? []).map((item) => item.trim()).filter(Boolean));
}

function overlayForRole(overlay: HarnessProjectRoleBriefOverlay | null, kind: HarnessRoleKind): HarnessProjectRoleBriefOverlayEntry | null {
  return overlay?.roleOverrides?.[kind] ?? null;
}

export function roleLabel(kind: HarnessRoleKind) {
  return ROLE_LABELS[kind];
}

export function roleGroup(kind: HarnessRoleKind) {
  return ROLE_GROUPS[kind];
}

export function rolePermissions(kind: HarnessRoleKind): HarnessRolePermission {
  return ROLE_PERMISSIONS[kind];
}

export function loadBaseRoleBrief(kind: HarnessRoleKind): HarnessBaseRoleBrief {
  const brief = BASE_BRIEFS[kind];
  if (!brief) {
    throw new Error(`Missing base role brief for "${kind}".`);
  }
  return brief;
}

export async function loadProjectRoleBriefOverlay(target: HarnessTargetRegistration): Promise<HarnessProjectRoleBriefOverlay | null> {
  if (!target.roleBriefsPath) {
    return null;
  }
  if (!existsSync(target.roleBriefsPath)) {
    return null;
  }
  return JSON.parse(await readFile(target.roleBriefsPath, "utf8")) as HarnessProjectRoleBriefOverlay;
}

export function composeRoleBrief(
  kind: HarnessRoleKind,
  projectOverlay: HarnessProjectRoleBriefOverlay | null,
): HarnessComposedRoleBrief {
  const base = loadBaseRoleBrief(kind);
  const overlay = overlayForRole(projectOverlay, kind);
  return {
    kind,
    mission: base.mission,
    responsibilities: base.responsibilities,
    nonGoals: base.nonGoals,
    allowedInputs: base.allowedInputs,
    forbiddenInputs: base.forbiddenInputs,
    allowedOutputs: base.allowedOutputs,
    knownRoles: uniq([...(base.knownRoles ?? []), ...((overlay?.knownRoles) ?? [])]),
    allowedHandoffs: uniq([...(base.allowedHandoffs ?? []), ...((overlay?.allowedHandoffs) ?? [])]),
    escalationRules: mergeStrings(base.escalationRules, overlay?.escalationRules),
    successDefinition: mergeStrings(base.successDefinition, overlay?.successDefinition),
    briefSource: {
      base: `base-briefs.json#${kind}`,
      project: projectOverlay ? `${projectOverlay.targetId}:roleOverrides.${kind}` : null,
    },
    projectBias: {
      directionBias: mergeStrings(projectOverlay?.directionBias, overlay?.directionBias),
      techBias: mergeStrings(projectOverlay?.techBias, overlay?.techBias),
      repoFacts: mergeStrings(projectOverlay?.repoFacts.docsSummary, overlay?.repoFacts),
      projectConstraints: mergeStrings(projectOverlay?.projectConstraints, overlay?.projectConstraints),
      preferredChecks: mergeStrings(projectOverlay?.preferredChecks, overlay?.preferredChecks),
      environmentHotspots: mergeStrings(projectOverlay?.environmentHotspots, overlay?.environmentHotspots),
    },
  };
}

export function composeRoleContextPacket(input: {
  kind: HarnessRoleKind;
  projectOverlay: HarnessProjectRoleBriefOverlay | null;
  contractSummary?: string | null;
  strategySummary?: string | null;
  milestoneSummary?: string | null;
  latestEvaluationSummary?: string | null;
  latestFailureEnvelope?: HarnessFailureEnvelope | null;
  latestCheckpoint?: string | null;
  doctorSummary?: string[];
  runtimeSummary?: string[];
}): HarnessRoleContextPacket {
  return {
    role: {
      kind: input.kind,
      label: roleLabel(input.kind),
      group: roleGroup(input.kind),
    },
    brief: composeRoleBrief(input.kind, input.projectOverlay),
    visibleContext: {
      contractSummary: input.contractSummary ?? null,
      strategySummary: input.strategySummary ?? null,
      milestoneSummary: input.milestoneSummary ?? null,
      latestEvaluationSummary: input.latestEvaluationSummary ?? null,
      latestFailureEnvelope: input.latestFailureEnvelope ?? null,
      latestCheckpoint: input.latestCheckpoint ?? null,
      repoFacts: mergeStrings(input.projectOverlay?.repoFacts.docsSummary),
      doctorSummary: input.doctorSummary ?? [],
      runtimeSummary: input.runtimeSummary ?? [],
    },
  };
}

export function renderRoleContextForPrompt(packet: HarnessRoleContextPacket) {
  const brief = packet.brief;
  const visible = packet.visibleContext;
  return [
    `Role: ${packet.role.label}`,
    `Mission: ${brief.mission}`,
    "",
    "Responsibilities:",
    ...brief.responsibilities.map((item) => `- ${item}`),
    "",
    "Non-goals:",
    ...brief.nonGoals.map((item) => `- ${item}`),
    "",
    "Allowed inputs:",
    ...brief.allowedInputs.map((item) => `- ${item}`),
    "",
    "Forbidden inputs:",
    ...brief.forbiddenInputs.map((item) => `- ${item}`),
    "",
    "Allowed outputs:",
    ...brief.allowedOutputs.map((item) => `- ${item}`),
    "",
    "Known roles:",
    ...brief.knownRoles.map((item) => `- ${roleLabel(item)}`),
    "",
    "Allowed handoffs:",
    ...brief.allowedHandoffs.map((item) => `- ${roleLabel(item)}`),
    ...(brief.projectBias.directionBias.length > 0
      ? ["", "Project direction bias:", ...brief.projectBias.directionBias.map((item) => `- ${item}`)]
      : []),
    ...(brief.projectBias.techBias.length > 0
      ? ["", "Project tech bias:", ...brief.projectBias.techBias.map((item) => `- ${item}`)]
      : []),
    ...(brief.projectBias.projectConstraints.length > 0
      ? ["", "Project constraints:", ...brief.projectBias.projectConstraints.map((item) => `- ${item}`)]
      : []),
    ...(brief.projectBias.environmentHotspots.length > 0
      ? ["", "Environment hotspots:", ...brief.projectBias.environmentHotspots.map((item) => `- ${item}`)]
      : []),
    ...(brief.projectBias.preferredChecks.length > 0
      ? ["", "Preferred checks:", ...brief.projectBias.preferredChecks.map((item) => `- ${item}`)]
      : []),
    ...(visible.contractSummary ? ["", `Visible contract summary: ${visible.contractSummary}`] : []),
    ...(visible.strategySummary ? ["", `Visible strategy summary: ${visible.strategySummary}`] : []),
    ...(visible.milestoneSummary ? ["", `Visible milestone summary: ${visible.milestoneSummary}`] : []),
    ...(visible.latestEvaluationSummary ? ["", `Visible evaluation summary: ${visible.latestEvaluationSummary}`] : []),
    ...(visible.latestFailureEnvelope ? [
      "",
      `Visible failure owner: ${roleLabel(visible.latestFailureEnvelope.ownerRole)}`,
      `Visible suggested recovery: ${visible.latestFailureEnvelope.suggestedRecoveryRole ? roleLabel(visible.latestFailureEnvelope.suggestedRecoveryRole) : "none"}`,
      `Visible failure summary: ${visible.latestFailureEnvelope.normalizedSummary}`,
    ] : []),
  ].join("\n");
}

export function inferPlanningRole(task: HarnessTaskNode | null, latestSummary: string | null): HarnessRoleKind {
  const haystack = `${task?.title ?? ""} ${task?.summary ?? ""} ${latestSummary ?? ""}`.toLowerCase();
  if (haystack.includes("strategy") && haystack.includes("evaluator")) {
    return "strategy_evaluator";
  }
  if (haystack.includes("milestone") && haystack.includes("evaluator")) {
    return "milestone_evaluator";
  }
  if (haystack.includes("strategy")) {
    return "strategy_planner";
  }
  if (haystack.includes("milestone")) {
    return "milestone_planner";
  }
  return "case_planner";
}

type FailurePattern = {
  test: RegExp;
  failureClass: HarnessFailureEnvelope["failureClass"];
  failureScope: HarnessFailureEnvelope["failureScope"];
  retryable: boolean;
  blocking: boolean;
  summary: string;
  escalateToRole: HarnessRoleKind | null;
  suggestedRecoveryRole: HarnessRoleKind | null;
};

const EXECUTION_FAILURE_PATTERNS: FailurePattern[] = [
  {
    test: /unexpected status\s+(401|429|5\d\d)\b[^\n]*127\.0\.0\.1:15721\/v1\/responses|local responses gateway returned/i,
    failureClass: "execution_runtime_failure",
    failureScope: "runtime",
    retryable: true,
    blocking: true,
    summary: "Execution stopped because the local model gateway or session runtime failed.",
    escalateToRole: "runtime_operator",
    suggestedRecoveryRole: "runtime_operator",
  },
  {
    test: /CreateProcessWithLogonW failed|windows sandbox|sandbox logon failed/i,
    failureClass: "execution_runtime_failure",
    failureScope: "runtime",
    retryable: false,
    blocking: true,
    summary: "Execution stopped because sandboxed shell access failed.",
    escalateToRole: "runtime_operator",
    suggestedRecoveryRole: "runtime_operator",
  },
  {
    test: /ParserError|Unexpected token|missing the terminator|Unknown lifecycle phase|insufficient memory|OutOfMemory|pagefile|mmap|cargo is required|rustup\.exe not found|maven or mvnw\.cmd is required/i,
    failureClass: "execution_environment_failure",
    failureScope: "environment",
    retryable: false,
    blocking: true,
    summary: "Execution stopped because the local build or shell environment needs repair.",
    escalateToRole: "environment_remediator",
    suggestedRecoveryRole: "environment_remediator",
  },
];

export function failureEnvelopeFromEvaluation(input: {
  failureClass: EvaluationFailureClass | null;
  failureScope: EvaluationFailureScope | null;
  retryable: boolean;
  blocking: boolean;
  normalizedSummary: string | null;
}): HarnessFailureEnvelope | null {
  if (!input.failureClass || !input.normalizedSummary) {
    return null;
  }

  let suggestedRecoveryRole: HarnessRoleKind | null = "executor";
  let escalateToRole: HarnessRoleKind | null = "case_evaluator";
  if (input.failureClass === "infrastructure_failure") {
    suggestedRecoveryRole = "runtime_operator";
    escalateToRole = "runtime_operator";
  } else if (input.failureClass === "environment_blocker" || input.failureScope === "tooling" || input.failureScope === "runtime") {
    suggestedRecoveryRole = "environment_remediator";
    escalateToRole = "environment_remediator";
  } else if (input.failureClass === "command_error") {
    suggestedRecoveryRole = "environment_remediator";
    escalateToRole = "environment_remediator";
  }

  return {
    ownerRole: "case_evaluator",
    escalateToRole,
    suggestedRecoveryRole,
    failureClass: input.failureClass,
    failureScope: input.failureScope ?? "unknown",
    retryable: input.retryable,
    blocking: input.blocking,
    normalizedSummary: input.normalizedSummary,
  };
}

export function failureEnvelopeFromExecutionSummary(summary: string | null): HarnessFailureEnvelope | null {
  const normalized = collapseWhitespace(summary);
  if (!normalized) {
    return null;
  }
  for (const pattern of EXECUTION_FAILURE_PATTERNS) {
    if (pattern.test.test(normalized)) {
      return {
        ownerRole: "executor",
        escalateToRole: pattern.escalateToRole,
        suggestedRecoveryRole: pattern.suggestedRecoveryRole,
        failureClass: pattern.failureClass,
        failureScope: pattern.failureScope,
        retryable: pattern.retryable,
        blocking: pattern.blocking,
        normalizedSummary: normalized,
      };
    }
  }
  return null;
}

export function resolveRoleBriefsPath(controlRepoRoot: string, target: HarnessTargetRegistration) {
  const configured = target.roleBriefsPath
    ? (path.isAbsolute(target.roleBriefsPath) ? target.roleBriefsPath : path.join(controlRepoRoot, target.roleBriefsPath))
    : path.join(path.dirname(target.adapterConfigPath), "role-briefs.json");
  return path.normalize(configured);
}
