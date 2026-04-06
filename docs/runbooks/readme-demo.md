# README Demo Asset

This runbook documents the terminal GIF embedded in the repository landing page.

## Goal

Show the shortest believable workflow that proves three things:

1. the repo can be initialized as a template
2. verification is a first-class workflow
3. the repo produces a concrete next step instead of ending at setup

## Demo Sequence

Use these commands in order:

```powershell
pnpm install
pnpm init:project -- --name "Demo Product" --slug "demo-product" --goal "Ship a verifiable Codex workflow" --stack "Next.js, TypeScript, pnpm" --owner "demo-user" --repoName "demo-product"
pnpm verify
pnpm planner:next
pnpm tasks:status
```

## Canonical Asset Path

The landing-page asset lives at:

`docs/assets/readme/codex-harness-foundry-demo.gif`

## Regeneration

Regenerate the GIF with:

```powershell
python scripts/generate-readme-demo.py
```

The script renders the GIF from transcripts captured from real command runs in this repository.
