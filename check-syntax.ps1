# PowerShell syntax validation script for JS/TS files
# Usage: .\check-syntax.ps1 [file] or check all files

param([string]$file)

if ($file) {
    # Check specific file
    Write-Host "🔍 Checking syntax: $file"
    try {
        & node -c $file 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $file - OK"
        } else {
            Write-Host "❌ SYNTAX ERROR in $file"
        }
    } catch {
        Write-Host "❌ SYNTAX ERROR in $file"
    }
} else {
    # Check all JS/TS files
    Write-Host "🔍 Checking syntax of all JS/TS files..."
    $errorCount = 0

    Get-ChildItem -Recurse -Include "*.js","*.ts","*.tsx" -Exclude "node_modules/*" | ForEach-Object {
        try {
            & node -c $_.FullName 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ SYNTAX ERROR in $($_.FullName)"
                $errorCount++
            }
        } catch {
            Write-Host "❌ SYNTAX ERROR in $($_.FullName)"
            $errorCount++
        }
    }

    if ($errorCount -eq 0) {
        Write-Host "✅ All files passed syntax check!"
    } else {
        Write-Host "❌ Found $errorCount files with syntax errors"
    }
}
