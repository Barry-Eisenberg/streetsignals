$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$indexHtml = Join-Path $repoRoot 'index.html'
$jsRoot = Join-Path $repoRoot 'js'

$scanPaths = @($indexHtml)
if (Test-Path $jsRoot) {
    $scanPaths += Get-ChildItem -Path $jsRoot -Filter *.js -File | Select-Object -ExpandProperty FullName
}

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

function Assert-Exists {
    param(
        [string]$Path,
        [string]$Label
    )

    if (-not (Test-Path $Path)) {
        Write-Host "[FAIL] Missing $Label at $Path" -ForegroundColor Red
        return $false
    }

    Write-Host "[PASS] Found $Label at $Path" -ForegroundColor Green
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

# 1) Required entry points exist.
$allGood = (Assert-Exists -Path $indexHtml -Label 'index shell') -and $allGood
$allGood = (Assert-Exists -Path (Join-Path $jsRoot 'app.js') -Label 'app bootstrap') -and $allGood
$allGood = (Assert-Exists -Path (Join-Path $jsRoot 'router.js') -Label 'router module') -and $allGood
$allGood = (Assert-Exists -Path (Join-Path $jsRoot 'data.js') -Label 'data module') -and $allGood

# 2) No inline handlers or javascript:void links across HTML/JS.
foreach ($path in $scanPaths) {
    $allGood = (Assert-NoPattern -Path $path -Pattern 'onclick=' -Label 'no inline onclick') -and $allGood
    $allGood = (Assert-NoPattern -Path $path -Pattern 'javascript:void\(0\)' -Label 'no javascript:void links') -and $allGood
}

# 3) Ensure the new route modules are loaded by index.html.
$allGood = (Assert-HasPattern -Path $indexHtml -Pattern 'js/state\.js' -Label 'state module import') -and $allGood
$allGood = (Assert-HasPattern -Path $indexHtml -Pattern 'js/data\.js' -Label 'data module import') -and $allGood
$allGood = (Assert-HasPattern -Path $indexHtml -Pattern 'js/router\.js' -Label 'router module import') -and $allGood
$allGood = (Assert-HasPattern -Path $indexHtml -Pattern 'js/routes-signals\.js' -Label 'signals route import') -and $allGood
$allGood = (Assert-HasPattern -Path $indexHtml -Pattern 'js/routes-playbooks\.js' -Label 'playbooks route import') -and $allGood
$allGood = (Assert-HasPattern -Path $indexHtml -Pattern 'js/routes-radar\.js' -Label 'radar route import') -and $allGood

if ($allGood) {
    Write-Host "\nUI regression static checks passed." -ForegroundColor Green
    exit 0
}

Write-Host "\nUI regression static checks failed." -ForegroundColor Red
exit 1
