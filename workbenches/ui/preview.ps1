param(
  [string]$OwnerThreadId = $env:CODEX_THREAD_ID,
  [ValidateRange(1024,65535)][int]$Port = 4552,
  [ValidateRange(1,1440)][int]$Minutes = 60
)
$ErrorActionPreference = 'Stop'
if (-not [guid]::TryParse($OwnerThreadId, [ref]([guid]::Empty))) { throw 'Pass the owning Codex thread UUID with -OwnerThreadId.' }
$uiRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$helperDirectory = Join-Path $uiRoot 'artifacts/ui-preview'
$identityPath = Join-Path $helperDirectory 'identity.json'
$stopPath = Join-Path $helperDirectory 'STOP'
$cleanupUtility = Join-Path $env:USERPROFILE 'Local Storage/AI/GTP/helper-lifecycle/cleanup.py'
$pythonExecutable = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$nodeExecutable = (Get-Command node).Source
$nodeVersion = (& $nodeExecutable --version).Trim()
if ([int]($nodeVersion.TrimStart('v').Split('.')[0]) -lt 22) { throw 'Node.js 22 or newer is required.' }
if (-not (Test-Path -LiteralPath $cleanupUtility) -or -not (Test-Path -LiteralPath $pythonExecutable)) { throw 'The required helper-lifecycle utility or bundled Python is unavailable.' }
if (Test-Path -LiteralPath $identityPath) {
  $old = Get-Content -LiteralPath $identityPath -Raw | ConvertFrom-Json
  $oldProcess = Get-Process -Id $old.pid -ErrorAction SilentlyContinue
  if ($oldProcess -and $oldProcess.StartTime.ToUniversalTime().ToFileTimeUtc().ToString() -eq $old.creationFiletime -and [IO.Path]::GetFullPath($oldProcess.Path) -eq [IO.Path]::GetFullPath($old.executable)) {
    $oldInfo = Get-Content -LiteralPath (Join-Path $helperDirectory 'process.json') -Raw | ConvertFrom-Json
    $ownedPort = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -eq $old.pid })
    if ($oldInfo.owner -eq $OwnerThreadId -and $oldInfo.port -eq $Port -and $ownedPort.Count -gt 0 -and [DateTimeOffset]::Parse($oldInfo.expiresAt) -gt [DateTimeOffset]::UtcNow -and -not (Test-Path -LiteralPath $stopPath)) {
      Write-Output "Reusing task-owned UI preview: http://127.0.0.1:$Port/workbenches/ui/ (original expiry $($oldInfo.expiresAt))."
      return
    }
    throw 'The recorded UI helper is still alive. Preserve its ownership and stop/review it before a replacement.'
  }
}
if (@(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue).Count) { throw "Port $Port is occupied; no replacement was launched." }
New-Item -ItemType Directory -Path $helperDirectory -Force | Out-Null
# Only an exact task-private marker from an ended process lifetime is removed.
if (-not $stopPath.StartsWith($uiRoot + [IO.Path]::DirectorySeparatorChar)) { throw 'Unsafe stop-marker path.' }
if (Test-Path -LiteralPath $stopPath) { Remove-Item -LiteralPath $stopPath }
$oldPort = $env:TINDERBOX_UI_PORT
$oldMinutes = $env:TINDERBOX_UI_MINUTES
$oldOwner = $env:TINDERBOX_UI_OWNER
try {
  $env:TINDERBOX_UI_PORT = $Port.ToString()
  $env:TINDERBOX_UI_MINUTES = $Minutes.ToString()
  $env:TINDERBOX_UI_OWNER = $OwnerThreadId
  $uiProcess = Start-Process -FilePath $nodeExecutable -ArgumentList @('workbenches/ui/serve.mjs') -WorkingDirectory $uiRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $helperDirectory 'stdout.log') -RedirectStandardError (Join-Path $helperDirectory 'stderr.log') -PassThru
} finally {
  $env:TINDERBOX_UI_PORT = $oldPort
  $env:TINDERBOX_UI_MINUTES = $oldMinutes
  $env:TINDERBOX_UI_OWNER = $oldOwner
}
$identity = @{pid=$uiProcess.Id;creationTime=$uiProcess.StartTime.ToUniversalTime().ToString('o');creationFiletime=$uiProcess.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$uiProcess.Path;task='TB-006';project='Tinderbox';purpose='UI workbench review';port=$Port;stopMethod='STOP marker';intendedExpiry="$Minutes minutes after start"}
$identity | ConvertTo-Json | Set-Content -LiteralPath $identityPath -Encoding utf8
try {
  $info = $null
  for ($attempt=0; $attempt -lt 40; $attempt++) {
    $processPath = Join-Path $helperDirectory 'process.json'
    if (Test-Path -LiteralPath $processPath) {
      $candidate = Get-Content -LiteralPath $processPath -Raw | ConvertFrom-Json
      if ($candidate.pid -eq $uiProcess.Id) { $info=$candidate; break }
    }
    Start-Sleep -Milliseconds 100
  }
  if (-not $info) { throw 'UI preview did not report readiness.' }
  $sourceFiles = @()
  foreach ($folder in @('src/ui','workbenches/ui','tests/ui','assets/art/ui')) { $sourceFiles += @(Get-ChildItem -LiteralPath (Join-Path $uiRoot $folder) -Recurse -File | ForEach-Object { $_.FullName }) }
  $manifestPath = Join-Path $uiRoot 'vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/provenance/ui.json'
  $imports = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  $sourceFiles += $manifestPath
  $sourceFiles += @($imports.files | ForEach-Object { Join-Path $uiRoot $_.installedPath })
  $sourceFiles += @($imports.sharedAssets | ForEach-Object { Join-Path $uiRoot $_.installedPath })
  $spec = @{pid=$uiProcess.Id;kind='task_owned';purpose='TB-006 temporary loopback UI workbench review';ownershipEvidence='Launched hidden by preview.ps1; exact PID/start/executable in identity.json';owners=@($OwnerThreadId);state='stateless';sourceFiles=$sourceFiles;ports=@($Port);expiresAt=$info.expiresAt;helperDirectory=$helperDirectory;stop=@{method='stop_file';path=$stopPath};restart=@{cwd=$uiRoot;executable=$nodeExecutable;args=@('workbenches/ui/serve.mjs');dependencies=@("$nodeVersion; no packages");inputs=@('UI sources, fixture snapshots and provenance/ui.json closure');outputs=@('artifacts/ui-preview','artifacts/ui-review');pendingWork='UI review only. Stop immediately when finished. Deliberate restarts must run preview.ps1 and register the new lifetime.';secretReferences=@();environment=@{TINDERBOX_UI_OWNER=$OwnerThreadId;TINDERBOX_UI_PORT=$Port;TINDERBOX_UI_MINUTES=$Minutes}}}
  $specPath = Join-Path $helperDirectory 'register.json'
  $spec | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $specPath -Encoding utf8
  $registrationText = & $pythonExecutable $cleanupUtility register $specPath
  if ($LASTEXITCODE -ne 0) { throw 'Helper registration failed.' }
  $registrationText | Set-Content -LiteralPath (Join-Path $helperDirectory 'registration.json') -Encoding utf8
  Write-Output "Registered UI preview: http://127.0.0.1:$Port/workbenches/ui/ (PID $($uiProcess.Id), automatic expiry $($info.expiresAt))."
} catch {
  New-Item -ItemType File -Path $stopPath -Force | Out-Null
  throw
}
