# Database Backup Script
# Purpose: Create reliable SQL dump of pagemind database with baseline verification
# Usage: powershell -ExecutionPolicy Bypass -File backup-database.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PAGEMIND DATABASE BACKUP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Create backup directory
$backupBaseDir = "C:\Users\x\pagemind-api\backups"
$timestamp = (Get-Date -Format "yyyyMMdd_HHmmss")
$backupDir = "$backupBaseDir\backup-$timestamp"

Write-Host "`n[1/8] Creating backup directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Write-Host "Created: $backupDir" -ForegroundColor Gray

# Step 2: Record baseline counts
Write-Host "`n[2/8] Recording baseline data counts..." -ForegroundColor Yellow
$baselineFile = "$backupDir\baseline-counts.txt"

@"
=== BASELINE DATA COUNTS ===
Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

"@ | Out-File $baselineFile -Encoding UTF8

$tables = @("notes", "users", "folders", "refresh_tokens", "conversations", "messages", "SourcePage")

foreach ($table in $tables) {
    if ($table -eq "SourcePage") {
        # SourcePage uses quoted identifier - use temp file to avoid quoting issues
        @'
SELECT COUNT(*) FROM "SourcePage";
'@ | docker exec -i pagemind-db psql -U pagemind -d pagemind 2>&1 | Select-String -Pattern '^ *[0-9]' | ForEach-Object { $count = $_.ToString().Trim() } 
    } else {
        $count = docker exec pagemind-db psql -U pagemind -d pagemind -c "SELECT COUNT(*) FROM $table;" 2>&1 | Select-String '^ *[0-9]' | ForEach-Object { $_.ToString().Trim() }
    }
    "$table : $count" | Out-File $baselineFile -Encoding UTF8 -Append
    Write-Host "  $table : $count" -ForegroundColor Gray
}

# Step 3: Create SQL dump in container
Write-Host "`n[3/8] Creating SQL dump in container..." -ForegroundColor Yellow
$dumpFileName = "pagemind-dump-$timestamp.sql"
$containerPath = "/tmp/$dumpFileName"

docker exec pagemind-db pg_dump -U pagemind -d pagemind -F plain -f $containerPath

# Step 4: Copy dump to host
Write-Host "`n[4/8] Copying dump to host..." -ForegroundColor Yellow
$hostBackupPath = "$backupDir\$dumpFileName"
docker cp pagemind-db:$containerPath $hostBackupPath

# Step 5: Verify file exists
Write-Host "`n[5/8] Verifying backup file..." -ForegroundColor Yellow
if (-not (Test-Path $hostBackupPath)) {
    Write-Host "ERROR: Backup file not created!" -ForegroundColor Red
    exit 1
}
$fileSize = (Get-Item $hostBackupPath).Length
$fileSizeKB = [math]::Round($fileSize / 1024, 2)
Write-Host "Size: $fileSizeKB KB" -ForegroundColor Gray

# Step 6: Create checksum
Write-Host "`n[6/8] Computing checksum..." -ForegroundColor Yellow
$hash = Get-FileHash -Path $hostBackupPath -Algorithm SHA256
$hash.Hash | Out-File "$backupDir\checksum-SHA256.txt" -Encoding UTF8
Write-Host "Hash: $($hash.Hash.Substring(0,32))..." -ForegroundColor Gray

# Step 7: Verify SQL structure
Write-Host "`n[7/8] Verifying SQL structure..." -ForegroundColor Yellow
$expectedTables = @("notes", "users", "folders", "SourcePage", "refresh_tokens", "conversations", "messages")
$allFound = $true

foreach ($table in $expectedTables) {
    # Look for either quoted or unquoted table names with public schema prefix
    # Dump format can break lines, so just search for presence of table name
    if ($table -eq "SourcePage") {
        $found = Select-String -Path $hostBackupPath -Pattern """SourcePage""" | Measure-Object
    } else {
        $found = Select-String -Path $hostBackupPath -Pattern "public\.$table" | Measure-Object
    }
    
    if ($found.Count -gt 0) {
        Write-Host "  Found: $table" -ForegroundColor Gray
    } else {
        Write-Host "  MISSING: $table" -ForegroundColor Red
        $allFound = $false
    }
}

if (-not $allFound) {
    Write-Host "ERROR: Some tables missing from backup!" -ForegroundColor Red
    exit 1
}

# Step 8: Count INSERT statements
Write-Host "`n[8/8] Counting data rows..." -ForegroundColor Yellow
$insertCount = (Select-String -Path $hostBackupPath -Pattern "^INSERT INTO" | Measure-Object).Count
Write-Host "Found $insertCount INSERT statements" -ForegroundColor Gray

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "BACKUP COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nLocation: $backupDir" -ForegroundColor Green
Write-Host "Files: " -ForegroundColor Cyan
Get-ChildItem $backupDir | ForEach-Object {
    $size = if ($_.Length) { ([math]::Round($_.Length / 1024, 2)).ToString() + " KB" } else { "0 bytes" }
    Write-Host "  * $($_.Name) ($size)" -ForegroundColor Gray
}
Write-Host "`nNEXT: Run verification script to test restore" -ForegroundColor Yellow
Write-Host "  powershell -ExecutionPolicy Bypass -File verify-backup.ps1" -ForegroundColor Yellow
Write-Host "`n========================================" -ForegroundColor Cyan
