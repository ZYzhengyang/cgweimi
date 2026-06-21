# Upload PostgreSQL backup to Tencent Cloud COS
# Usage: .\backup-to-cos.ps1 [-BackupFile <path>]
# Requires: COS_SECRET_ID and COS_SECRET_KEY environment variables, or coscli installed

param(
    [string]$BackupFile = ""
)

$ErrorActionPreference = "Stop"

$BACKUP_DIR = "C:\CGweimi\cgvmi-server\backups"
$LOG_FILE = "C:\CGweimi\cgvmi-server\logs\backup.log"
$COS_BUCKET = $env:COS_BUCKET ?? "cgvmi-1314814344"
$COS_REGION = $env:COS_REGION ?? "ap-guangzhou"
$COS_SECRET_ID = $env:COS_SECRET_ID
$COS_SECRET_KEY = $env:COS_SECRET_KEY

function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -Append -FilePath $LOG_FILE
    Write-Host $Message
}

try {
    Write-Log "=== COS Upload started ==="

    # Find latest backup if not specified
    if (-not $BackupFile) {
        $BackupFile = Get-ChildItem $BACKUP_DIR -Filter "misskey-backup-*.sql.gz" |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1 -ExpandProperty FullName
    }

    if (-not $BackupFile -or -not (Test-Path $BackupFile)) {
        throw "No backup file found to upload"
    }

    $fileName = Split-Path $BackupFile -Leaf
    $fileSize = (Get-Item $BackupFile).Length
    Write-Log "Uploading: $fileName ($([math]::Round($fileSize/1MB,2)) MB)"

    # Method 1: Use coscli if available
    if (Get-Command coscli -ErrorAction SilentlyContinue) {
        Write-Log "Using coscli..."
        coscli cp $BackupFile "cos://$COS_BUCKET/db-backups/$fileName"
        if ($LASTEXITCODE -ne 0) { throw "coscli upload failed" }
    }
    # Method 2: Use COS API via Python
    elseif (Get-Command python -ErrorAction SilentlyContinue) {
        if (-not $COS_SECRET_ID -or -not $COS_SECRET_KEY) {
            throw "COS_SECRET_ID and COS_SECRET_KEY environment variables required"
        }
        Write-Log "Using Python COS SDK..."
        $pythonScript = @"
import os
from qcloud_cos import CosConfig, CosServiceClient

config = CosConfig(Region='$COS_REGION', SecretId='$COS_SECRET_ID', SecretKey='$COS_SECRET_KEY')
client = CosServiceClient(config)

with open(r'$BackupFile', 'rb') as f:
    client.put_object(
        Bucket='$COS_BUCKET',
        Body=f,
        Key='db-backups/$fileName'
    )
print('Upload successful')
"@
        $pythonScript | python -
        if ($LASTEXITCODE -ne 0) { throw "Python COS upload failed" }
    }
    # Method 3: Use curl with COS API
    elseif (Get-Command curl -ErrorAction SilentlyContinue) {
        if (-not $COS_SECRET_ID -or -not $COS_SECRET_KEY) {
            throw "COS_SECRET_ID and COS_SECRET_KEY environment variables required"
        }
        Write-Log "Using curl..."
        $date = [DateTime]::UtcNow.ToString("r")
        $signDate = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ")
        $keyTime = "$signDate;$signDate"
        $httpString = "put`n/db-backups/$fileName`n`nhost=$COS_BUCKET.cos.$COS_REGION.myqcloud.com`n"
        $sha1HttpString = [System.Security.Cryptography.SHA1]::Create().ComputeHash(
            [System.Text.Encoding]::UTF8.GetBytes($httpString)
        )
        # Simplified: recommend installing coscli or python SDK
        throw "Please install coscli (pip install coscmd) or set up Python COS SDK"
    }
    else {
        throw "No upload tool available. Install coscli: pip install coscmd"
    }

    Write-Log "=== COS Upload finished successfully ==="
    exit 0

} catch {
    Write-Log "ERROR: $_"
    exit 1
}
