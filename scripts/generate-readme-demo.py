from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "assets" / "readme" / "codex-harness-foundry-demo.gif"
WIDTH = 1320
HEIGHT = 760
BG = "#0f172a"
PANEL = "#111827"
TEXT = "#e5e7eb"
MUTED = "#94a3b8"
ACCENT = "#38bdf8"
SUCCESS = "#4ade80"
WARN = "#fbbf24"


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = []
    if bold:
        candidates.extend(["C:/Windows/Fonts/consolab.ttf", "C:/Windows/Fonts/lucon.ttf"])
    else:
        candidates.extend(["C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/lucon.ttf"])

    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


FONT = load_font(24)
FONT_BOLD = load_font(26, bold=True)
FONT_SMALL = load_font(20)


FRAMES = [
    {
        "caption": "Initialize a Codex project from a template",
        "hold": 900,
        "command": r"pnpm init:project -- --name ""Demo Product"" --slug ""demo-product"" --goal ""Ship a verifiable Codex workflow"" --stack ""Next.js, TypeScript, pnpm"" --owner ""your-github-user"" --repoName ""demo-product""",
        "body": [
            "> demo-product@0.1.0 init:project",
            '> tsx scripts/init-project.ts "--name" "Demo Product" "--slug" "demo-product"',
            "",
            "Initialized project metadata for Demo Product.",
            "Next steps:",
            "- Run `pnpm verify`",
            "- Review `docs/architecture/system.md` and `planning/milestones.json`",
        ],
        "highlights": {"Initialized project metadata for Demo Product.": SUCCESS, "- Run `pnpm verify`": ACCENT},
    },
    {
        "caption": "Generate repo-native context and verify the workflow",
        "hold": 1000,
        "command": "pnpm verify",
        "body": [
            "> demo-product@0.1.0 verify",
            "> powershell -ExecutionPolicy Bypass -File scripts/verify.ps1",
            "",
            "==> Sync project metadata",
            "==> Compose AGENTS",
            "==> Refresh task board",
            "Active milestone: m1-foundation",
            "Recommended next tasks:",
            "- M1-T001 [P0] Assemble the agents-md context skeleton -> lead-planner",
            "==> Typecheck",
            "==> Smoke",
            "Smoke OK: 2 milestones, 2 tasks.",
            "Verification complete.",
        ],
        "highlights": {
            "==> Sync project metadata": ACCENT,
            "==> Compose AGENTS": ACCENT,
            "==> Refresh task board": ACCENT,
            "- M1-T001 [P0] Assemble the agents-md context skeleton -> lead-planner": SUCCESS,
            "Verification complete.": SUCCESS,
        },
    },
    {
        "caption": "Get the next task from repo state",
        "hold": 900,
        "command": "pnpm planner:next",
        "body": [
            "> demo-product@0.1.0 planner:next",
            "> tsx scripts/lead-planner.ts next",
            "",
            "- M1-T001 [P0] Assemble the agents-md context skeleton -> lead-planner",
        ],
        "highlights": {"- M1-T001 [P0] Assemble the agents-md context skeleton -> lead-planner": SUCCESS},
    },
    {
        "caption": "See roles, dependencies, and live task state",
        "hold": 1300,
        "command": "pnpm tasks:status",
        "body": [
            "> demo-product@0.1.0 tasks:status",
            "> tsx scripts/harness/tasks.ts status",
            "",
            "Current milestone: m1-foundation",
            "Task counts: backlog:1 | ready:1 | in_progress:0 | blocked:0 | review:0 | verified:0 | done:0",
            "Tasks:",
            "- M1-T001 [ready] [P0] Assemble the agents-md context skeleton -> lead-planner",
            "- M1-T002 [backlog] [P0] Create milestone and task-board orchestration -> builder-engine deps:M1-T001",
        ],
        "highlights": {
            "Current milestone: m1-foundation": ACCENT,
            "- M1-T001 [ready] [P0] Assemble the agents-md context skeleton -> lead-planner": SUCCESS,
            "- M1-T002 [backlog] [P0] Create milestone and task-board orchestration -> builder-engine deps:M1-T001": WARN,
        },
    },
]


def draw_frame(frame: dict) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle((36, 28, WIDTH - 36, HEIGHT - 28), radius=24, fill=PANEL)
    draw.text((64, 50), "Codex Harness Foundry", font=FONT_BOLD, fill=TEXT)
    draw.text((64, 92), frame["caption"], font=FONT_SMALL, fill=ACCENT)
    draw.rounded_rectangle((64, 132, WIDTH - 64, 184), radius=14, fill="#020617")
    draw.text((84, 147), f"$ {frame['command']}", font=FONT_SMALL, fill=TEXT)

    y = 224
    for line in frame["body"]:
        fill = frame["highlights"].get(line, TEXT if line else MUTED)
        draw.text((84, y), line, font=FONT, fill=fill)
        y += 42

    draw.text((64, HEIGHT - 72), "Repo-native workflow: initialize, verify, plan, continue.", font=FONT_SMALL, fill=MUTED)
    return image


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    images = [draw_frame(frame) for frame in FRAMES]
    durations = [frame["hold"] for frame in FRAMES]
    images[0].save(
        OUTPUT,
        save_all=True,
        append_images=images[1:],
        duration=durations,
        loop=0,
        disposal=2,
    )
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
