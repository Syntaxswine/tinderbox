# Finite focused H15 native-input preview. No helper is retained.
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path '.').Path
$recordRoot = Join-Path $taskRoot 'artifacts/helpers/h15-access-125-review'
New-Item -ItemType Directory -Force -Path $recordRoot | Out-Null
$profile = Join-Path $recordRoot ('profile-' + [guid]::NewGuid().ToString('N'))
$stop = Join-Path $recordRoot ('STOP-' + [guid]::NewGuid().ToString('N'))
$port = 4558
if (Get-NetTCPConnection -State Listen -LocalPort @($port,4559) -ErrorAction SilentlyContinue) { throw 'Catalogue host preview port is occupied.' }
$nodeExe = (Get-Command node).Source
$chromeExe = (Get-Item -LiteralPath 'C:/Program Files/Google/Chrome/Application/chrome.exe').FullName
$url = 'http://127.0.0.1:4558/tinderbox/art/source/catalogue-modular/review.html'
$serverArgs = @('art/source/catalogue-modular/serve-review.mjs','--root','.','--port','4558','--base','/tinderbox/','--ttl','300','--stop-file',$stop,'--overlay','artifacts/qa/h15-access-125/runtime-inputs')
$browserArgs = @('--headless=new','--remote-debugging-address=127.0.0.1','--remote-debugging-port=4559','--disable-background-networking','--disable-default-apps','--disable-extensions','--disable-sync','--no-first-run','--no-default-browser-check','--no-proxy-server','--use-angle=d3d11','--window-size=1600,1070',('--user-data-dir=' + $profile),'about:blank')
@{task='Catalogue host exported-art review';owner='01a17ea0-1362-7d13-a42d-f4a5fcff8902';workingDirectory=$taskRoot;source='art/source/catalogue-modular/review.js';driver='art/source/catalogue-modular/capture-h15-access.mjs';serverExecutable=$nodeExe;serverArguments=$serverArgs;browserExecutable=$chromeExe;browserArguments=$browserArgs;port=$port;expirySeconds=300;debugPort=4559;stopFile=$stop;restart='Run art/source/catalogue-modular/run-h15-access.ps1 deliberately with Node, installed Chrome and the frozen h15-access-125 host inputs available.'} | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 (Join-Path $recordRoot 'restart.json')
$server = $null; $browser = $null; $browserTime = $null
try {
 $server = Start-Process -FilePath $nodeExe -ArgumentList $serverArgs -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $recordRoot 'server-out.log') -RedirectStandardError (Join-Path $recordRoot 'server-err.log')
 @{owner='01a17ea0-1362-7d13-a42d-f4a5fcff8902';pid=$server.Id;creationTime=$server.StartTime.ToUniversalTime().ToString('o');executable=$nodeExe;task='Focused H15 access art';purpose='Finite localhost exported-art capture';port=$port;stopFile=$stop;status='active'} | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $recordRoot 'server-owner.json')
 for ($tryIndex=0; $tryIndex -lt 20; $tryIndex++) {
  try { $response=Invoke-WebRequest -Uri $url -TimeoutSec 2; if($response.StatusCode -eq 200){break} } catch {}
  Start-Sleep -Milliseconds 200
 }
 $browser = Start-Process -FilePath $chromeExe -ArgumentList $browserArgs -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $recordRoot 'browser-output.html') -RedirectStandardError (Join-Path $recordRoot 'browser-err.log')
 $browserTime=$browser.StartTime.ToUniversalTime()
 @{owner='01a17ea0-1362-7d13-a42d-f4a5fcff8902';pid=$browser.Id;creationTime=$browserTime.ToString('o');executable=$chromeExe;task='Focused H15 access art';purpose='Isolated native WebGL JPG capture';profile=$profile;port=4559;stopMethod='CDP Browser.close after finite native actions; 180-second driver deadline';status='active'} | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $recordRoot 'browser-owner.json')
 & $nodeExe art/source/catalogue-modular/capture-h15-access.mjs
 if($LASTEXITCODE -ne 0){throw 'Actual host input capture failed; partial evidence is retained.'}
 if(-not $browser.WaitForExit(5000)){throw 'Private capture Chrome did not close through CDP.'}
} finally {
 if($browser -and -not $browser.HasExited){
  $live=Get-Process -Id $browser.Id -ErrorAction SilentlyContinue
  if($live -and $live.StartTime.ToUniversalTime() -eq $browserTime -and $live.Path -eq $chromeExe){$browser.Kill();$browser.WaitForExit(5000) | Out-Null}
 }
 if($server){Set-Content -Encoding ascii -Path $stop -Value 'review complete';if(-not $server.WaitForExit(6000)){throw 'Preview server did not retire through its stop file.'}}
 $portFree=-not [bool](Get-NetTCPConnection -State Listen -LocalPort @($port,4559) -ErrorAction SilentlyContinue)
 $usingProfile=Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | Where-Object {$_.CommandLine -and $_.CommandLine.Contains($profile)}
 for($profileWait=0;$usingProfile -and $profileWait -lt 15;$profileWait++){Start-Sleep -Milliseconds 200;$usingProfile=Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | Where-Object {$_.CommandLine -and $_.CommandLine.Contains($profile)}}
 $profileRemoved=-not (Test-Path -LiteralPath $profile)
 if(-not $usingProfile -and (Test-Path -LiteralPath $profile)){
  $resolved=(Resolve-Path -LiteralPath $profile).Path
  if(-not $resolved.StartsWith($recordRoot + [IO.Path]::DirectorySeparatorChar)){throw 'Unsafe task profile path.'}
  Remove-Item -LiteralPath $resolved -Recurse -Force
  $profileRemoved=-not (Test-Path -LiteralPath $resolved)
 }
 @{task='Focused H15 access art';retiredAt=[DateTime]::UtcNow.ToString('o');serverExited=($null -eq $server -or $server.HasExited);browserExited=($null -eq $browser -or $browser.HasExited);portReleased=$portFree;testProfileRemoved=$profileRemoved;restart='artifacts/helpers/h15-access-125-review/restart.json'} | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $recordRoot 'retirement.json')
 foreach($name in @('server-owner.json','browser-owner.json')){ $p=Join-Path $recordRoot $name;if(Test-Path -LiteralPath $p){$r=Get-Content -Raw $p|ConvertFrom-Json;$r.status='retired';$r|ConvertTo-Json|Set-Content -Encoding utf8 $p}}
 if(-not $portFree){throw 'Catalogue host preview port is still listening.'}
 if(-not $profileRemoved){throw 'Capture browser exited but its exact task profile is still in use; cleanup remains explicit in retirement.json.'}
}
