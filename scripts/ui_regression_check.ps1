$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$appJs = Join-Path $repoRoot 'app.js'
$indexHtml = Join-Path $repoRoot 'index.html'

function Assert-NoPattern {
    param(
        [string]$Path,
        [string]$Pattern,
        [string]$Label
    )

    $matches = Select-String -Path $Path -Pattern $Pattern
    if ($matches) {
        Write-Host "[FAIL] $Label in $Path" -ForegroundColor Red
        $matches | Select-Object -First 5 | ForEach-Object {
            Write-Host "  Line $($_.LineNumber): $($_.Line.Trim())" -ForegroundColor DarkRed
        }
        return $false
    }

    Write-Host "[PASS] $Label in $Path" -ForegroundColor Green
    return $true
}

function Assert-HasPattern {
    param(
        [string]$Path,
        [string]$Pattern,
        [string]$Label
    )

    $matches = Select-String -Path $Path -Pattern $Pattern
    if (-not $matches) {
        Write-Host "[FAIL] Missing $Label in $Path" -ForegroundColor Red
        return $false
    }

    Write-Host "[PASS] Found $Label in $Path" -ForegroundColor Green
    return $true
}

$allGood = $true

# 1) No inline click handlers or javascript:void links.
$allGood = (Assert-NoPattern -Path $appJs -Pattern 'onclick=' -Label 'no inline onclick') -and $allGood
$allGood = (Assert-NoPattern -Path $indexHtml -Pattern 'onclick=' -Label 'no inline onclick') -and $allGood
$allGood = (Assert-NoPattern -Path $appJs -Pattern 'javascript:void\(0\)' -Label 'no javascript:void links') -and $allGood
$allGood = (Assert-NoPattern -Path $indexHtml -Pattern 'javascript:void\(0\)' -Label 'no javascript:void links') -and $allGood

# 2) Freshness guard present.
$allGood = (Assert-HasPattern -Path $appJs -Pattern 'function getLatestNonFutureSignalTimestamp' -Label 'latest non-future timestamp helper') -and $allGood
$allGood = (Assert-HasPattern -Path $appJs -Pattern 'ts > nowTs' -Label 'future-date exclusion guard') -and $allGood

# 3) Delegated interaction hooks present / deprecated hooks absent.
$allGood = (Assert-NoPattern -Path $appJs -Pattern '\[data-priority-view-all\]|View all Structural signals' -Label 'deprecated priority view-all hook removed') -and $allGood
$allGood = (Assert-HasPattern -Path $appJs -Pattern '\[data-priority-signal-key\]' -Label 'priority details delegated hook') -and $allGood
$allGood = (Assert-HasPattern -Path $appJs -Pattern '\[data-kpi-close\]' -Label 'kpi close delegated hook') -and $allGood
$allGood = (Assert-HasPattern -Path $appJs -Pattern '\[data-strength-breakdown-inst\]' -Label 'signal strength drilldown delegated hook') -and $allGood

if ($allGood) {
    Write-Host "\nUI regression static checks passed." -ForegroundColor Green
    exit 0
}

Write-Host "\nUI regression static checks failed." -ForegroundColor Red
exit 1
