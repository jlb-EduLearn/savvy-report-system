# Deploy to GitHub (Vercel auto-rebuilds the live site on every push to main)
# Usage: .\scripts\deploy.ps1
#        .\scripts\deploy.ps1 "Fixed enrollment column"

param(
  [string]$Message = "Update dashboard"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "`n=== SAVVY Report — Deploy ===" -ForegroundColor Cyan

$status = git status --porcelain
if (-not $status) {
  Write-Host "No changes to deploy." -ForegroundColor Yellow
  exit 0
}

Write-Host "`nChanges:" -ForegroundColor Gray
git status --short

git add .
git commit -m $Message
git push origin main

Write-Host "`nPushed to GitHub." -ForegroundColor Green
Write-Host "Vercel will rebuild in ~1-2 minutes." -ForegroundColor Green
Write-Host "Repo: https://github.com/jlb-EduLearn/savvy-report-system" -ForegroundColor Gray
Write-Host "Check: https://vercel.com/dashboard`n" -ForegroundColor Gray
