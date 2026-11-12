$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path '.').Path
$recordRoot = Join-Path $taskRoot 'artifacts/helpers/furnished-house-review'
New-Item -ItemType Directory -Force -Path $recordRoot | Out-Null
$profile = Join-Path $recordRoot ('profile-' + [guid]::NewGuid().ToString('N'))
$stop = Join-Path $recordRoot ('STOP-' + [guid]::NewGuid().ToString('N'))
$port = 4553
if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) { throw 'Furnished-house preview port is occupied.' }
$nodeExe = (Get-Command node).Source
$chromeExe = (Get-Item -LiteralPath 'C:/Program Files/Google/Chrome/Application/chrome.exe').FullName
$url = 'http://127.0.0.1:4553/tinderbox/art/source/furnished-house/review.html'
$serverArgs = @('tools/serve.mjs','--root','.','--port','4553','--base','/tinderbox/','--ttl','300','--stop-file',$stop)
$browserArgs = @('--headless=new','--disable-background-networking','--disable-default-apps','--disable-extensions','--disable-sync','--no-first-run','--no-default-browser-check','--no-proxy-server','--use-angle=d3d11','--window-size=1600,1070','--dump-dom','--virtual-time-budget=60000',('--user-data-dir=' + $profile),$url)
@{task='Furnished-house exported-art review';owner='01a17ea0-1362-7d13-a42d-f4a5fcff8902';workingDirectory=$taskRoot;source='art/source/furnished-house/review.js';serverExecutable=$nodeExe;serverArguments=$serverArgs;browserExecutable=$chromeExe;browserArguments=$browserArgs;port=$port;expirySeconds=300;stopFile=$stop;restart='Run art/source/furnished-house/run-review.ps1 deliberately with Node, installed Chrome and the exported factory available.'} | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 (Join-Path $recordRoot 'restart.json')
$server = $null; $browser = $null; $browserTime = $null
try {
 $server = Start-Process -FilePath $nodeExe -ArgumentList $serverArgs -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $recordRoot 'server-out.log') -RedirectStandardError (Join-Path $recordRoot 'server-err.log')
 @{owner='01a17ea0-1362-7d13-a42d-f4a5fcff8902';pid=$server.Id;creationTime=$server.StartTime.ToUniversalTime().ToString('o');executable=$nodeExe;task='Furnished-house art';purpose='Finite localhost exported-art capture';port=$port;stopFile=$stop;status='active'} | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $recordRoot 'server-owner.json')
 for ($tryIndex=0; $tryIndex -lt 20; $tryIndex++) {
  try { $response=Invoke-WebRequest -Uri $url -TimeoutSec 2; if($response.StatusCode -eq 200){break} } catch {}
  Start-Sleep -Milliseconds 200
 }
 $browser = Start-Process -FilePath $chromeExe -ArgumentList $browserArgs -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $recordRoot 'browser-output.html') -RedirectStandardError (Join-Path $recordRoot 'browser-err.log')
 $browserTime=$browser.StartTime.ToUniversalTime()
 @{owner='01a17ea0-1362-7d13-a42d-f4a5fcff8902';pid=$browser.Id;creationTime=$browserTime.ToString('o');executable=$chromeExe;task='Furnished-house art';purpose='Isolated native WebGL JPG capture';profile=$profile;stopMethod='Natural headless exit, 60-second bounded process handle';status='active'} | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $recordRoot 'browser-owner.json')
 if(-not $browser.WaitForExit(60000)){throw 'Furnished-house capture exceeded its 60-second deadline.'}
 if($browser.ExitCode -ne 0){throw ('Furnished-house capture exit ' + $browser.ExitCode)}
 node art/source/furnished-house/extract-review.mjs
 if($LASTEXITCODE -ne 0){throw 'Furnished-house capture extraction failed.'}
} finally {
 if($browser -and -not $browser.HasExited){
  $live=Get-Process -Id $browser.Id -ErrorAction SilentlyContinue
  if($live -and $live.StartTime.ToUniversalTime() -eq $browserTime -and $live.Path -eq $chromeExe){$browser.Kill();$browser.WaitForExit(5000) | Out-Null}
 }
 if($server){Set-Content -Encoding ascii -Path $stop -Value 'review complete';if(-not $server.WaitForExit(6000)){throw 'Preview server did not retire through its stop file.'}}
 $portFree=-not [bool](Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
 $usingProfile=Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | Where-Object {$_.CommandLine -and $_.CommandLine.Contains($profile)}
 $profileRemoved=$false
 if(-not $usingProfile -and (Test-Path -LiteralPath $profile)){
  $resolved=(Resolve-Path -LiteralPath $profile).Path
  if(-not $resolved.StartsWith($recordRoot + [IO.Path]::DirectorySeparatorChar)){throw 'Unsafe task profile path.'}
  Remove-Item -LiteralPath $resolved -Recurse -Force
  $profileRemoved=-not (Test-Path -LiteralPath $resolved)
 }
 @{task='Furnished-house art';retiredAt=[DateTime]::UtcNow.ToString('o');serverExited=($null -eq $server -or $server.HasExited);browserExited=($null -eq $browser -or $browser.HasExited);portReleased=$portFree;testProfileRemoved=$profileRemoved;restart='artifacts/helpers/furnished-house-review/restart.json'} | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $recordRoot 'retirement.json')
 foreach($name in @('server-owner.json','browser-owner.json')){ $p=Join-Path $recordRoot $name;if(Test-Path -LiteralPath $p){$r=Get-Content -Raw $p|ConvertFrom-Json;$r.status='retired';$r|ConvertTo-Json|Set-Content -Encoding utf8 $p}}
 if(-not $portFree){throw 'Furnished-house preview port is still listening.'}
}
