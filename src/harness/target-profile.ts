import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolveRoleBriefsPath } from "./roles";
import { loadTargetRegistry, resolveTargetRegistration } from "./targets";
import { nowIso } from "./time";
import type {
  ExternalTargetConfig,
  HarnessProjectRoleBriefOverlay,
  HarnessRoleKind,
  HarnessTargetProfileDraft,
  HarnessTargetRegistration,
  HarnessTargetRegistryFile,
} from "./types";

type ProfileOptions = {
  repoPath: string;
  targetId?: string | null;
  label?: string | null;
};

const MAX_FILES = 1500;
const MAX_DOC_SUMMARY = 5;

function normalizeText(value: string, maxLength = 220) {
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLength) {
    return collapsed;
  }
  return `${collapsed.slice(0, maxLength - 3)}...`;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "target";
}

async function collectFiles(root: string, current = root, acc: string[] = []) {
  if (!existsSync(current) || acc.length >= MAX_FILES) {
    return acc;
  }
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "target" || entry.name === "dist" || entry.name === ".idea") {
      continue;
    }
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(root, absolute, acc);
    } else {
      acc.push(path.relative(root, absolute).replaceAll("\\", "/"));
    }
    if (acc.length >= MAX_FILES) {
      break;
    }
  }
  return acc;
}

function topLanguages(files: string[]) {
  const extensionMap: Record<string, string> = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".java": "Java",
    ".kt": "Kotlin",
    ".rs": "Rust",
    ".py": "Python",
    ".cs": "C#",
    ".go": "Go",
    ".cpp": "C++",
    ".c": "C",
  };
  const counts = new Map<string, number>();
  for (const file of files) {
    const language = extensionMap[path.extname(file).toLowerCase()];
    if (!language) {
      continue;
    }
    counts.set(language, (counts.get(language) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([language]) => language).slice(0, 3);
}

function detectBuildSystems(files: string[]) {
  const systems = new Set<string>();
  if (files.includes("pom.xml") || files.includes("mvnw.cmd") || files.includes("mvnw")) {
    systems.add("maven");
  }
  if (files.includes("package.json") || files.includes("pnpm-lock.yaml")) {
    systems.add("node");
  }
  if (files.includes("Cargo.toml")) {
    systems.add("cargo");
  }
  if (files.includes("build.gradle") || files.includes("build.gradle.kts")) {
    systems.add("gradle");
  }
  return [...systems];
}

function detectTestEntrypoints(files: string[]) {
  const result: string[] = [];
  if (files.some((file) => file.startsWith("src/test/"))) {
    result.push("src/test");
  }
  if (files.some((file) => /test|spec/i.test(path.basename(file)))) {
    result.push("named test/spec files");
  }
  if (files.includes("package.json")) {
    result.push("package.json scripts");
  }
  if (files.includes("Cargo.toml")) {
    result.push("cargo test");
  }
  return [...new Set(result)];
}

async function readDocSummary(repoRoot: string, files: string[]) {
  const docs = files.filter((file) => /^README(\.[^/]+)?$/i.test(path.basename(file)) || file.startsWith("docs/")).slice(0, MAX_DOC_SUMMARY);
  const summaries: string[] = [];
  for (const file of docs) {
    const absolute = path.join(repoRoot, file);
    try {
      const content = await readFile(absolute, "utf8");
      const firstMeaningful = content.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
      if (firstMeaningful) {
        summaries.push(`${file}: ${normalizeText(firstMeaningful)}`);
      }
    } catch {
      // ignore unreadable docs
    }
  }
  return summaries;
}

function defaultWriteScope(files: string[]) {
  const scopes = [];
  if (files.some((file) => file.startsWith("src/"))) {
    scopes.push("src");
  }
  if (files.some((file) => file.startsWith("docs/"))) {
    scopes.push("docs");
  }
  if (files.includes("README.md")) {
    scopes.push("README.md");
  }
  if (files.includes("pom.xml")) {
    scopes.push("pom.xml");
  }
  if (files.includes("package.json")) {
    scopes.push("package.json");
  }
  if (files.includes("Cargo.toml")) {
    scopes.push("Cargo.toml");
  }
  return scopes.length > 0 ? scopes : ["."];
}

function inferDoctorCommands(buildSystems: string[]) {
  const commands: string[] = [];
  if (buildSystems.includes("maven")) {
    commands.push("java -version");
    commands.push("powershell -NoProfile -Command \"if (Test-Path '.\\\\mvnw.cmd') { Write-Output 'mvnw.cmd'; exit 0 } elseif (Get-Command mvn -ErrorAction SilentlyContinue) { Write-Output 'mvn'; exit 0 } else { Write-Error 'Maven or mvnw.cmd is required'; exit 1 }\"");
  }
  if (buildSystems.includes("cargo")) {
    commands.push("cargo --version");
  }
  if (buildSystems.includes("node")) {
    commands.push("node --version");
  }
  return [...new Set(commands)];
}

function inferEvaluationCommands(buildSystems: string[]) {
  if (buildSystems.includes("maven")) {
    return [
      { id: "java-version", label: "Java version", command: "java -version" },
      {
        id: "maven-compile",
        label: "Maven compile",
        command: "powershell -NoProfile -Command \"if (Test-Path '.\\\\mvnw.cmd') { .\\\\mvnw.cmd -q -DskipTests compile; exit $LASTEXITCODE } elseif (Get-Command mvn -ErrorAction SilentlyContinue) { mvn -q -DskipTests compile; exit $LASTEXITCODE } else { Write-Error 'Maven or mvnw.cmd is required'; exit 1 }\"",
      },
    ];
  }
  if (buildSystems.includes("cargo")) {
    return [
      { id: "cargo-check", label: "Cargo check", command: "cargo check" },
    ];
  }
  if (buildSystems.includes("node")) {
    return [
      { id: "node-version", label: "Node version", command: "node --version" },
    ];
  }
  return [
    { id: "git-status", label: "Git status", command: "git status --short" },
  ];
}

function inferTargetDescription(label: string, docsSummary: string[]) {
  return docsSummary[0]
    ? `External target for ${label}. ${normalizeText(docsSummary[0], 140)}`
    : `External target for ${label}.`;
}

function buildRoleOverlay(targetId: string, profile: {
  label: string;
  languages: string[];
  buildSystems: string[];
  docsSummary: string[];
}) {
  const now = nowIso();
  const projectConstraints = [
    "Stay grounded in repository truth.",
    "Prefer one coherent harness cycle at a time.",
  ];
  const roleOverrides: HarnessProjectRoleBriefOverlay["roleOverrides"] = {
    strategy_planner: {
      directionBias: [`Keep long-term direction aligned with ${profile.label}'s repository reality.`],
      repoFacts: profile.docsSummary,
    },
    milestone_planner: {
      directionBias: ["Break strategy into sequential stages that fit the current stack."],
      techBias: profile.buildSystems.map((item) => `Respect the repository's ${item} build flow.`),
    },
    case_planner: {
      directionBias: ["Prefer the next most valuable implementation slice over broad backlog expansion."],
      techBias: profile.languages.map((item) => `Bias case scope toward the existing ${item} codebase.`),
    },
    executor: {
      techBias: profile.languages.map((item) => `Prefer coherent progress inside the existing ${item} stack.`),
      projectConstraints,
    },
    case_evaluator: {
      preferredChecks: profile.buildSystems.map((item) => `Use ${item}-appropriate verification commands first.`),
    },
    environment_remediator: {
      environmentHotspots: profile.buildSystems.map((item) => `${item} toolchain setup and invocation shape`),
    },
  };

  const repoFacts: HarnessProjectRoleBriefOverlay["repoFacts"] = {
    primaryLanguages: profile.languages,
    buildSystems: profile.buildSystems,
    testEntrypoints: [],
    docsSummary: profile.docsSummary,
  };

  return {
    targetId,
    generatedAt: now,
    updatedAt: now,
    generatedBy: "harness_profiler",
    directionBias: [`Keep ${profile.label} aligned with repository truth instead of imagined architecture.`],
    techBias: profile.languages.map((item) => `Prefer coherent progress inside the existing ${item} stack.`),
    repoFacts,
    projectConstraints,
    preferredChecks: profile.buildSystems.map((item) => `Use ${item}-appropriate verification before broad conclusions.`),
    environmentHotspots: profile.buildSystems.map((item) => `${item} toolchain setup and command shape`),
    roleOverrides,
  } satisfies HarnessProjectRoleBriefOverlay;
}

export async function buildTargetProfileDraft(controlRepoRoot: string, options: ProfileOptions): Promise<HarnessTargetProfileDraft> {
  const repoRoot = path.isAbsolute(options.repoPath) ? path.normalize(options.repoPath) : path.normalize(path.join(controlRepoRoot, options.repoPath));
  if (!existsSync(repoRoot)) {
    throw new Error(`Target repo path does not exist: ${repoRoot}`);
  }

  const repoName = path.basename(repoRoot);
  const targetId = options.targetId?.trim() || slugify(repoName);
  const label = options.label?.trim() || repoName;
  const files = await collectFiles(repoRoot);
  const languages = topLanguages(files);
  const buildSystems = detectBuildSystems(files);
  const docsSummary = await readDocSummary(repoRoot, files);
  const writeScope = defaultWriteScope(files);
  const registration: HarnessTargetRegistration = {
    id: targetId,
    label,
    repoRoot,
    adapterId: "external-generic",
    adapterConfigPath: path.join(controlRepoRoot, "targets", targetId, "target.config.json"),
    artifactRoot: `data/harness/targets/${targetId}`,
    roleBriefsPath: path.join(controlRepoRoot, "targets", targetId, "role-briefs.json"),
    approvalState: "pending_approval",
    profileGeneratedAt: nowIso(),
  };

  const roleBriefs = buildRoleOverlay(targetId, {
    label,
    languages,
    buildSystems,
    docsSummary,
  });
  roleBriefs.repoFacts.testEntrypoints = detectTestEntrypoints(files);

  const targetConfig: ExternalTargetConfig = {
    id: targetId,
    label,
    description: inferTargetDescription(label, docsSummary),
    casesPath: "cases.json",
    roleBriefsPath: "role-briefs.json",
    execution: {
      basePrompt: `Act as a disciplined senior engineer working inside the ${label} repository. Read repository truth first, make one coherent and reviewable unit of progress, stay inside the allowed write scope, and leave the repo ready for external evaluation.`,
      resumePrompt: `Resume the previous ${label} development run from repository truth and the saved thread. Continue the same case, make one coherent and reviewable unit of progress, and leave the repo ready for external evaluation.`,
      sandboxMode: "workspace-write",
      model: null,
      defaultWriteScope: writeScope,
      directionNote: `Keep development aligned with ${label}'s current repository structure and documented purpose.`,
    },
    evaluation: {
      commands: inferEvaluationCommands(buildSystems),
    },
    planning: {
      enabled: true,
      strategyPath: "strategy.json",
      milestonesPath: "milestones.json",
      directionNote: `Ground planning in repository truth for ${label}.`,
      strategy: {
        agentId: `${targetId}-strategy-planner`,
        label: `${label} Strategy Planner`,
        basePrompt: `Refresh ${label}'s long-term product strategy from repository truth.`,
        directionNote: `Keep the strategy grounded in the repository's actual product direction and current stack.`,
        model: null,
        maxRecentHandoffs: 8,
        refreshAfterVerifiedCases: 5,
      },
      milestones: {
        agentId: `${targetId}-milestone-planner`,
        label: `${label} Milestone Planner`,
        basePrompt: `Plan the next milestone batch for ${label} from the current strategy and repository truth.`,
        directionNote: `Break strategy into staged milestones that fit the repository's current architecture.`,
        model: null,
        batchSize: 3,
      },
      strategyEvaluator: {
        agentId: `${targetId}-strategy-evaluator`,
        label: `${label} Strategy Evaluator`,
        basePrompt: `Evaluate whether ${label}'s current strategy should remain active, complete, become superseded, or be marked blocked.`,
        directionNote: `Fail closed when evidence is mixed.`,
        model: null,
      },
      milestoneEvaluator: {
        agentId: `${targetId}-milestone-evaluator`,
        label: `${label} Milestone Evaluator`,
        basePrompt: `Evaluate whether ${label}'s active milestone should remain active, complete, or be marked blocked.`,
        directionNote: `Fail closed when evidence is mixed.`,
        model: null,
      },
      cases: {
        agentId: `${targetId}-case-planner`,
        label: `${label} Case Planner`,
        basePrompt: `Plan the next small batch of ${label} work from repository truth.`,
        directionNote: `Bias toward the next coherent implementation case.`,
        model: null,
        batchSize: 3,
        maxRecentHandoffs: 5,
        firstGeneratedStatus: "ready",
        remainingGeneratedStatus: "backlog",
      },
      contextBudget: {
        recentRunsLimit: 4,
        entrySnapshotLimit: 5,
        entrySnapshotBytesPerFile: 2500,
        verifiedInputSnapshotLimit: 3,
        verifiedInputBytesPerFile: 1800,
        gitStatusMaxLines: 60,
        maxContextBytes: 18000,
      },
    },
    doctor: {
      requiredFiles: ["."],
      requiredCommands: inferDoctorCommands(buildSystems),
    },
  };

  return {
    registration,
    targetConfig,
    roleBriefs,
  };
}

export async function writeTargetProfileDraft(controlRepoRoot: string, draft: HarnessTargetProfileDraft, targetRegistryPath = "harness.targets.json") {
  const registry = await loadTargetRegistry(controlRepoRoot, targetRegistryPath);
  const relativeTargetDir = path.relative(controlRepoRoot, path.dirname(draft.registration.adapterConfigPath)).replaceAll("\\", "/");
  await mkdir(path.dirname(draft.registration.adapterConfigPath), { recursive: true });
  await writeFile(draft.registration.adapterConfigPath, `${JSON.stringify(draft.targetConfig, null, 2)}\n`, "utf8");
  const roleBriefsPath = resolveRoleBriefsPath(controlRepoRoot, draft.registration);
  await writeFile(roleBriefsPath, `${JSON.stringify(draft.roleBriefs, null, 2)}\n`, "utf8");
  await writeFile(path.join(path.dirname(draft.registration.adapterConfigPath), "cases.json"), "[]\n", "utf8");
  await writeFile(path.join(path.dirname(draft.registration.adapterConfigPath), "strategy.json"), "null\n", "utf8");
  await writeFile(path.join(path.dirname(draft.registration.adapterConfigPath), "milestones.json"), "[]\n", "utf8");

  registry.targets[draft.registration.id] = {
    ...draft.registration,
    repoRoot: path.relative(controlRepoRoot, draft.registration.repoRoot).replaceAll("\\", "/"),
    adapterConfigPath: `${relativeTargetDir}/target.config.json`,
    roleBriefsPath: `${relativeTargetDir}/role-briefs.json`,
  };
  await writeFile(path.join(controlRepoRoot, targetRegistryPath), `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  return resolveTargetRegistration(controlRepoRoot, registry, draft.registration.id);
}

export async function approveTarget(controlRepoRoot: string, targetId: string, targetRegistryPath = "harness.targets.json") {
  const registry = await loadTargetRegistry(controlRepoRoot, targetRegistryPath);
  const target = registry.targets[targetId];
  if (!target) {
    throw new Error(`Target "${targetId}" was not found in harness target registry.`);
  }
  target.approvalState = "approved";
  await writeFile(path.join(controlRepoRoot, targetRegistryPath), `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  return resolveTargetRegistration(controlRepoRoot, registry, targetId);
}

export async function readTargetRoleBriefs(controlRepoRoot: string, targetId: string, targetRegistryPath = "harness.targets.json") {
  const registry = await loadTargetRegistry(controlRepoRoot, targetRegistryPath);
  const target = resolveTargetRegistration(controlRepoRoot, registry, targetId);
  const roleBriefsPath = resolveRoleBriefsPath(controlRepoRoot, target);
  const overlay = existsSync(roleBriefsPath)
    ? JSON.parse(await readFile(roleBriefsPath, "utf8")) as HarnessProjectRoleBriefOverlay
    : null;
  return {
    target,
    roleBriefsPath,
    overlay,
  };
}
