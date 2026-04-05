param(
  [Parameter(Mandatory = $true)]
  [string]$Topic,
  [Parameter(Mandatory = $true)]
  [string]$Variant
)

$branch = "codex/exp/$Topic-$Variant"
git checkout -b $branch
Write-Host "Created experiment branch: $branch"
