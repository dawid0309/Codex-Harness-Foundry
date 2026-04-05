param(
  [Parameter(Mandatory = $true)]
  [string]$Id,
  [Parameter(Mandatory = $true)]
  [string]$Slug
)

$branch = "codex/milestone/$Id-$Slug"
git checkout -b $branch
Write-Host "Created milestone branch: $branch"
