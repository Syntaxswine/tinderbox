# Finite supervisor only. No geometry, child descendants or network service.
$ErrorActionPreference = 'Stop'
$proofDirectory = $PSScriptRoot
$proofRoot = [IO.Path]::GetFullPath((Join-Path $proofDirectory '../../../..'))
$proofPlanPath = Join-Path $proofDirectory 'plan.json'
$proofPlan = Get-Content -LiteralPath $proofPlanPath -Raw | ConvertFrom-Json
$proofNode = 'C:\Program Files\nodejs\node.exe'
$proofNodeLeaf = Get-Item -LiteralPath $proofNode -ErrorAction Stop
$proofNodeVersion = $proofNodeLeaf.VersionInfo.FileVersion
if ($proofNodeLeaf -isnot [IO.FileInfo] -or $proofNodeVersion -ne '24.15.0') { throw 'Verified scalar Node leaf/version differs; no proof process launched' }
$proofScript = Join-Path $proofDirectory 'compare.mjs'
$proofStop = Join-Path $proofDirectory 'stop.requested'
$proofEncoding = [Text.UTF8Encoding]::new($false)
$proofParent = [Diagnostics.Process]::GetCurrentProcess()
if ($proofPlan.authority -ne '1a88cf4748bf62c1456285ff43412c929d311199') { throw 'Wrong proof authority' }
if (-not [string]::IsNullOrWhiteSpace($env:NODE_OPTIONS)) { throw 'Unexpected inherited NODE_OPTIONS; no proof process launched' }
foreach ($proofPin in $proofPlan.harnessPins) {
    $proofActualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $proofDirectory $proofPin.file)).Hash.ToLowerInvariant()
    if ($proofActualHash -ne $proofPin.sha256) { throw "Changed harness source: $($proofPin.file)" }
}
foreach ($proofExisting in @('launch.once','comparison-started.once','launch.json','partial.json','final.json','receipt.json')) {
    if (Test-Path -LiteralPath (Join-Path $proofDirectory $proofExisting)) { throw "One-run marker/result already exists: $proofExisting. No retry is authorized." }
}
function Write-ProofJSON($proofName, $proofValue) {
    [IO.File]::WriteAllText((Join-Path $proofDirectory $proofName),($proofValue | ConvertTo-Json -Depth 30) + [Environment]::NewLine,$proofEncoding)
}
$proofStartInfo = [Diagnostics.ProcessStartInfo]::new()
$proofStartInfo.FileName = $proofNode
$proofStartInfo.WorkingDirectory = $proofRoot
$proofStartInfo.UseShellExecute = $false
$proofStartInfo.CreateNoWindow = $true
$proofStartInfo.RedirectStandardOutput = $true
$proofStartInfo.RedirectStandardError = $true
$proofStartInfo.StandardOutputEncoding = $proofEncoding
$proofStartInfo.StandardErrorEncoding = $proofEncoding
$proofStartInfo.ArgumentList.Add('--max-old-space-size=1024')
$proofStartInfo.ArgumentList.Add($proofScript)
$proofProcess = [Diagnostics.Process]::new()
$proofProcess.StartInfo = $proofStartInfo
$proofReceipt = [ordered]@{
    version = 1; owner = 'Coder Tinderbox'; project = 'Tinderbox M29'
    authority = $proofPlan.authority; sourceSeam = $proofPlan.sourceSeam
    purpose = 'One isolated regional compiler/stock correctness comparison; four full-roof-equivalent native passes maximum'
    cwd = $proofRoot; executable = $proofNode; executableLeafVersion = $proofNodeVersion; arguments = @('--max-old-space-size=1024',$proofScript)
    parentPid = $proofParent.Id; parentCreatedUtc = $proofParent.StartTime.ToUniversalTime().ToString('o')
    parentExecutable = $proofParent.MainModule.FileName
    cooperativeMs = 50000; parentForceMs = 55000; absoluteMs = 60000; nodeOldSpaceMiB = 1024
    ports = @(); stopMethod = 'Private stop file at 50 s, then exact PID/creation/executable validated process-handle termination at 55 s'
    state = 'stateless'; safeToTerminateReason = 'Source-local disposable calculation only; partial files are saved before each risky stage. No user world/save/write transaction exists.'
    automaticReplay = $false; restart = 'This comparison consumes the grant. Preserve sources and outputs; no automatic rerun or restart is authorized.'
    planSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $proofPlanPath).Hash.ToLowerInvariant()
    sourceFiles = @($proofPlan.harnessPins | ForEach-Object { Join-Path $proofDirectory $_.file })
    inputPins = 'docs/engineering/shared-maps/bounded-source-compiler-v1/plan.json:inputPins'
    dependencyPins = 'docs/engineering/shared-maps/bounded-source-compiler-v1/plan.json:sourcePins'
    outputs = @('partial.json','final.json','iterations-forward.jsonl','iterations-reverse.jsonl','iterations-scattered.jsonl','stdout.log','stderr.log','receipt.json')
    stopFileWritten = $false; forced = $false; childExitConfirmed = $false; noRetainedPort = $true
}
$proofWatch = [Diagnostics.Stopwatch]::new()
$proofStdoutTask = $null
$proofStderrTask = $null
$proofStarted = $false
$proofFingerprint = $null
try {
    $proofOnce = [IO.File]::Open((Join-Path $proofDirectory 'launch.once'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
    $proofOnce.Dispose()
    $proofWatch.Start()
    if (-not $proofProcess.Start()) { throw 'Proof child failed to start' }
    $proofStarted = $true
    $proofFingerprint = $proofProcess.StartTime.ToUniversalTime().ToFileTimeUtc()
    $proofReceipt.pid = $proofProcess.Id
    $proofReceipt.createdUtc = $proofProcess.StartTime.ToUniversalTime().ToString('o')
    $proofReceipt.creationFileTime = $proofFingerprint.ToString()
    $proofReceipt.startedAt = [DateTime]::UtcNow.ToString('o')
    $proofReceipt.cooperativeDeadlineUtc = $proofProcess.StartTime.ToUniversalTime().AddSeconds(50).ToString('o')
    $proofReceipt.parentDeadlineUtc = $proofProcess.StartTime.ToUniversalTime().AddSeconds(55).ToString('o')
    $proofReceipt.absoluteDeadlineUtc = $proofProcess.StartTime.ToUniversalTime().AddSeconds(60).ToString('o')
    Write-ProofJSON 'launch.json' $proofReceipt
    $proofStdoutTask = $proofProcess.StandardOutput.ReadToEndAsync()
    $proofStderrTask = $proofProcess.StandardError.ReadToEndAsync()
    while (-not $proofProcess.HasExited) {
        $proofElapsed = $proofWatch.Elapsed.TotalMilliseconds
        if ($proofElapsed -ge 50000 -and -not $proofReceipt.stopFileWritten) {
            [IO.File]::WriteAllText($proofStop,'Cooperative supervisor deadline reached',$proofEncoding)
            $proofReceipt.stopFileWritten = $true
        }
        if ($proofElapsed -ge 55000) {
            $proofCurrent = [Diagnostics.Process]::GetProcessById($proofProcess.Id)
            if ($proofCurrent.StartTime.ToUniversalTime().ToFileTimeUtc() -ne $proofFingerprint -or $proofCurrent.MainModule.FileName -ine $proofNode) { throw 'Child identity changed; refusing termination' }
            $proofReceipt.terminationIdentityRevalidatedAt = [DateTime]::UtcNow.ToString('o')
            $proofProcess.Kill()
            $proofReceipt.forced = $true
            break
        }
        [void]$proofProcess.WaitForExit([Math]::Max(1,[Math]::Min(100,55000-$proofElapsed)))
    }
} catch {
    $proofReceipt.parentError = $_.Exception.Message
} finally {
    if ($proofStarted) {
        if (-not $proofProcess.HasExited -and -not $proofReceipt.forced) {
            try {
                $proofCurrent = [Diagnostics.Process]::GetProcessById($proofProcess.Id)
                if ($null -ne $proofFingerprint -and $proofCurrent.StartTime.ToUniversalTime().ToFileTimeUtc() -eq $proofFingerprint -and $proofCurrent.MainModule.FileName -ieq $proofNode) {
                    $proofReceipt.terminationIdentityRevalidatedAt = [DateTime]::UtcNow.ToString('o')
                    $proofProcess.Kill()
                    $proofReceipt.forced = $true
                } else { $proofReceipt.cleanupBlocker = 'Could not revalidate owned process identity' }
            } catch { $proofReceipt.cleanupError = $_.Exception.Message }
        }
        [void]$proofProcess.WaitForExit(3000)
        $proofReceipt.childExitConfirmed = $proofProcess.HasExited
        if ($proofProcess.HasExited) {
            $proofReceipt.exitCode = $proofProcess.ExitCode
            $proofReceipt.exitedAt = $proofProcess.ExitTime.ToUniversalTime().ToString('o')
            if ($null -ne $proofStdoutTask) { [IO.File]::WriteAllText((Join-Path $proofDirectory 'stdout.log'),$proofStdoutTask.GetAwaiter().GetResult(),$proofEncoding) }
            if ($null -ne $proofStderrTask) { [IO.File]::WriteAllText((Join-Path $proofDirectory 'stderr.log'),$proofStderrTask.GetAwaiter().GetResult(),$proofEncoding) }
        }
    }
    $proofReceipt.endedAt = [DateTime]::UtcNow.ToString('o')
    $proofReceipt.parentElapsedMs = $proofWatch.Elapsed.TotalMilliseconds
    $proofReceipt.withinAbsolute60s = $proofReceipt.childExitConfirmed -and $proofWatch.Elapsed.TotalMilliseconds -lt 60000
    $proofReceipt.lastPartialExists = Test-Path -LiteralPath (Join-Path $proofDirectory 'partial.json')
    $proofReceipt.finalExists = Test-Path -LiteralPath (Join-Path $proofDirectory 'final.json')
    Write-ProofJSON 'receipt.json' $proofReceipt
    $proofProcess.Dispose()
}
$proofReceipt | ConvertTo-Json -Depth 8
if (-not $proofReceipt.childExitConfirmed -or $proofReceipt.forced -or $proofReceipt.parentError -or $proofReceipt.exitCode -ne 0) { exit 1 }
