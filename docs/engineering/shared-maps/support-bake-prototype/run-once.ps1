$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../../../..')).Path
$proofPath = Join-Path $PSScriptRoot 'proof.mjs'
$recordPath = Join-Path $PSScriptRoot 'process.json'
if (Test-Path -LiteralPath $recordPath) { throw 'This assignment permits one fixture process; an execution record already exists.' }
$nodePath = (Get-Command node -ErrorAction Stop).Source
$fixture = $null
$identity = $null
$receipt = [ordered]@{
  owner = 'Tinderbox UI / support-bake feasibility'
  project = $taskRoot
  purpose = 'One CPU fixture: one NY continuity carrier and ordered contact 7397'
  executable = $nodePath
  arguments = @('--no-warnings', $proofPath)
  workingDirectory = $taskRoot
  sourceManifest = 'source-manifest.json'
  outputFiles = @('blocks.json','result.json','stdout.log','stderr.log')
  port = $null
  automaticRestart = $false
  stopMethod = 'Parent wait enforces 55s; finally checks exact PID/creation/executable before terminating a still-running owned fixture'
  status = 'preparing'
}
function Test-ExactFixture {
  $current = Get-Process -Id $fixture.Id -ErrorAction SilentlyContinue
  if (-not $current) { return $false }
  if ($current.StartTime.ToUniversalTime().ToString('o') -ne $identity) { throw 'PID creation identity changed; refusing termination.' }
  if ($current.Path -ne $nodePath) { throw 'Executable identity changed; refusing termination.' }
  return $true
}
try {
  $fixture = Start-Process -FilePath $nodePath -ArgumentList @('--no-warnings', $proofPath) -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $PSScriptRoot 'stdout.log') -RedirectStandardError (Join-Path $PSScriptRoot 'stderr.log')
  $created = $fixture.StartTime.ToUniversalTime()
  $identity = $created.ToString('o')
  $receipt.pid = $fixture.Id
  $receipt.creationTimeUtc = $identity
  $receipt.startedUtc = [DateTime]::UtcNow.ToString('o')
  $receipt.deadlineUtc = $created.AddSeconds(55).ToString('o')
  $receipt.intendedExpiry = '55 seconds from exact process creation; no retained helper'
  $receipt.status = 'running'
  $receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $recordPath -Encoding UTF8
  $remaining = [Math]::Max(1, [int]($created.AddSeconds(55) - [DateTime]::UtcNow).TotalMilliseconds)
  if (-not $fixture.WaitForExit($remaining)) {
    $receipt.status = 'deadline-exceeded'
    if (Test-ExactFixture) { Stop-Process -Id $fixture.Id -Force; $fixture.WaitForExit() }
    throw 'The single fixture exceeded its finite deadline; it was stopped.'
  }
  $fixture.WaitForExit()
  $receipt.exitCode = $fixture.ExitCode
  $receipt.status = if ($fixture.ExitCode -eq 0) { 'completed' } else { 'failed' }
} catch {
  $receipt.failure = $_.Exception.Message
  if ($receipt.status -ne 'deadline-exceeded') { $receipt.status = 'failed' }
} finally {
  if ($fixture) {
    $fixture.Refresh()
    if (-not $fixture.HasExited -and (Test-ExactFixture)) {
      Stop-Process -Id $fixture.Id -Force
      $fixture.WaitForExit()
      $receipt.finallyStopped = $true
    }
    $receipt.exited = $fixture.HasExited
    $receipt.finishedUtc = [DateTime]::UtcNow.ToString('o')
    $receipt.lifetimeMs = ([DateTime]::UtcNow - $created).TotalMilliseconds
    $receipt.sameIdentityStillRunning = Test-ExactFixture
    $receipt.portsOpenedByFixture = 'none: CPU/file-only ES module; no server or network listener created'
    $fixture.Dispose()
  }
  $receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $recordPath -Encoding UTF8
}
Get-Content -LiteralPath (Join-Path $PSScriptRoot 'stdout.log')
if ($receipt.status -ne 'completed') {
  Get-Content -LiteralPath (Join-Path $PSScriptRoot 'stderr.log')
  throw ('Fixture ended with status ' + $receipt.status + ': ' + $receipt.failure)
}
