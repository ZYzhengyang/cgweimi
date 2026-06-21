# Misskey PostgreSQL Backup Script
# Usage: .\backup-db.ps1
# Requires: Docker running with PostgreSQL container on port 5433

$ErrorActionPreference = "Stop"

# Config
$BACKUP_DIR = "C:\CGweimi\cgvmi-server\backups"
$LOG_FILE = "C:\CGweimi\cgvmi-server\logs\backup.log"
$PG_DUMP = "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe"
$DB_HOST = "localhost"
$DB_PORT = "5433"
$DB_USER = "postgres"
$DB_NAME = "misskey"
$DB_PASS = "postgres"
$RETENTION_DAYS = 30

# Ensure directories exist
New-Item -ItemType Directory -Force -Path $BACKUP_DIR | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $LOG_FILE) | Out-Null

# Generate filename
$DATE = Get-Date -Format "yyyy-MM-dd-HHmmss"
$BACKUP_FILE = Join-Path $BACKUP_DIR "misskey-backup-$DATE.sql"
$COMPRESSED_FILE = "$BACKUP_FILE.gz"

function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -Append -FilePath $LOG_FILE
    Write-Host $Message
}

try {
    Write-Log "=== Backup started ==="

    # Check if pg_dump exists
    if (-not (Test-Path $PG_DUMP)) {
        throw "pg_dump not found at: $PG_DUMP"
    }

    # Run pg_dump directly
    Write-Log "Dumping database '$DB_NAME' from $DB_HOST`:$DB_PORT..."
    $env:PGPASSWORD = $DB_PASS
    & $PG_DUMP -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --no-owner --no-privileges | Out-File -Encoding utf8 $BACKUP_FILE

    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }

    # Compress with gzip
    Write-Log "Compressing backup..."
    if (Get-Command gzip -ErrorAction SilentlyContinue) {
        gzip -f $BACKUP_FILE
    } else {
        # Use PowerShell compression
        $content = [System.IO.File]::ReadAllBytes($BACKUP_FILE)
        $ms = New-Object System.IO.MemoryStream
        $gs = New-Object System.IO.Compression.GZipStream($ms, [System.IO.Compression.CompressionLevel]::Optimal)
        $gs.Write($content, 0, $content.Length)
        $gs.Close()
        [System.IO.File]::WriteAllBytes($COMPRESSED_FILE, $ms.ToArray())
        Remove-Item $BACKUP_FILE -Force
    }

    # Verify backup
    $fileInfo = Get-Item $COMPRESSED_FILE
    if ($fileInfo.Length -eq 0) {
        throw "Backup file is empty!"
    }
    $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
    Write-Log "Backup completed: $COMPRESSED_FILE ($sizeMB MB)"

    # Clean old backups
    Write-Log "Cleaning backups older than $RETENTION_DAYS days..."
    $cutoff = (Get-Date).AddDays(-$RETENTION_DAYS)
    Get-ChildItem $BACKUP_DIR -Filter "misskey-backup-*.sql.gz" |
        Where-Object { $_.LastWriteTime -lt $cutoff } |
        ForEach-Object {
            Write-Log "Deleting old backup: $($_.Name)"
            Remove-Item $_.FullName -Force
        }

    Write-Log "=== Backup finished successfully ==="
    exit 0

} catch {
    Write-Log "ERROR: $_"
    exit 1
}
