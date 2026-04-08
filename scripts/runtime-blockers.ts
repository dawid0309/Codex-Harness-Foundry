export type TerminalBlocker = {
  signature: string;
  label: string;
};

type RuntimeBlockerMatcher = TerminalBlocker & {
  patterns: RegExp[];
};

const blockerMatchers: RuntimeBlockerMatcher[] = [
  {
    signature: "shell-startup-failure",
    label: "shell startup failed before repo commands could run",
    patterns: [
      /CreateProcessWithLogonW failed:\s*1326/i,
      /0x8009001d/i,
      /\b8009001d\b/i,
      /Windows PowerShell startup failure/i,
      /shell startup failure/i,
      /failed before any repo command executes/i,
    ],
  },
  {
    signature: "policy-rejection",
    label: "approval or policy rejection prevents progress",
    patterns: [
      /approval policy/i,
      /requires approval/i,
      /blocked by policy/i,
      /policy rejection/i,
      /not permitted by policy/i,
      /orchestrator_helper_launch_canceled/i,
      /ShellExecuteExW failed to launch setup helper/i,
      /\b1223\b/,
    ],
  },
  {
    signature: "workspace-read-only",
    label: "workspace or sandbox is read-only",
    patterns: [
      /workspace is read-only/i,
      /read-only workspace/i,
      /workspace remains read-only/i,
      /sandbox.*read-only/i,
      /cannot write (files|changes|to)/i,
      /no writable/i,
      /missing write capability/i,
      /write capability/i,
    ],
  },
  {
    signature: "command-not-executable",
    label: "required planner or repo command is not executable",
    patterns: [
      /pnpm planner:propose.*not executable/i,
      /pnpm planner:publish.*not executable/i,
      /pnpm next-milestone:propose.*not executable/i,
      /pnpm next-milestone:publish.*not executable/i,
      /command .* not executable/i,
    ],
  },
];

export function detectTerminalBlocker(
  lastMessage: string,
  stdoutText: string,
  stderrText: string,
): TerminalBlocker | null {
  const text = `${lastMessage}\n${stdoutText}\n${stderrText}`;

  for (const matcher of blockerMatchers) {
    if (matcher.patterns.some((pattern) => pattern.test(text))) {
      return {
        signature: matcher.signature,
        label: matcher.label,
      };
    }
  }

  return null;
}
