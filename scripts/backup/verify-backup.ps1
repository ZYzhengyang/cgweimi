# Verify PostgreSQL backup integrity
# Usage: .\verify-backup.ps1 [-BackupFile <path>]

param(
    [string]$BackupFile = ""
)

$ErrorActionPreference = "Stop"

$BACKUP_DIR = "C:\CGweimi\cgvmi-server\backups"
$LOG_FILE = "C:\CGweimi\cgvmi-server\logs\backup.log"

function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -Append -FilePath $LOG_FILE
    Write-Host $Message
}

try {
    Write-Log "=== Backup verification started ==="

    # Find latest backup if not specified
    if (-not $BackupFile) {
        $BackupFile = Get-ChildItem $BACKUP_DIR -Filter "misskey-backup-*.sql.gz" |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1 -ExpandProperty FullName
    }

    if (-not $BackupFile -or -not (Test-Path $BackupFile)) {
        throw "No backup file found to verify"
    }

    $fileName = Split-Path $BackupFile -Leaf
    $fileInfo = Get-Item $BackupFile
    $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)

    Write-Log "Verifying: $fileName"

    # Check 1: File size > 0
    if ($fileInfo.Length -eq 0) {
        throw "FAIL: Backup file is empty!"
    }
    Write-Log "PASS: File size = $sizeMB MB"

    # Check 2: File is valid gzip
    try {
        $fs = [System.IO.File]::OpenRead($BackupFile)
        $gs = New-Object System.IO.Compression.GZipStream($fs, [System.IO.Compression.CompressionMode]::Decompress)
        $buffer = New-Object byte[] 1024
        $read = $gs.Read($buffer, 0, 1024)
        $gs.Close()
        $fs.Close()
        if ($read -eq 0) {
            throw "Decompressed data is empty"
        }
        Write-Log "PASS: File is valid gzip format"
    } catch {
        throw "FAIL: File is not valid gzip: $_"
    }

    # Check 3: Decompressed content contains SQL keywords
    try {
        $fs = [System.IO.File]::OpenRead($BackupFile)
        $gs = New-Object System.IO.Compression.GZipStream($fs, [System.IO.Compression.CompressionMode]::Decompress)
        $reader = New-Object System.IO.StreamReader($gs)
        $header = $reader.ReadBlock(4096)
        $headerText = $reader.CurrentEncoding.GetString($buffer, 0, [math]::Min($header, 4096))
        $reader.Close()
        $gs.Close()
        $fs.Close()

        if ($headerText -match "PostgreSQL|pg_dump|SET|CREATE") {
            Write-Log "PASS: Content contains PostgreSQL dump markers"
        } else {
            Write-Log "WARN: Content may not be a valid PostgreSQL dump (no markers found in first 4KB)"
        }
    } catch {
        Write-Log "WARN: Could not read decompressed content: $_"
    }

    # Check 4: Backup age < 24 hours
    $age = (Get-Date) - $fileInfo.LastWriteTime
    if ($age.TotalHours -gt 24) {
        Write-Log "WARN: Backup is $([math]::Round($age.TotalHours,1)) hours old"
    } else {
        Write-Log "PASS: Backup is recent ($([math]::Round($age.TotalHours,1)) hours old)"
    }

    # Check 5: List recent backups
    Write-Log "--- Recent backups ---"
    Get-ChildItem $BACKUP_DIR -Filter "misskey-backup-*.sql.gz" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 5 |
        ForEach-Object {
            $s = [math]::Round($_.Length/1MB, 2)
            Write-Log "  $($_.Name) - $s MB - $($_.LastWriteTime)"
        }

    Write-Log "=== Backup verification completed ==="
    exit 0

} catch {
    Write-Log "ERROR: $_"
    exit 1
}
