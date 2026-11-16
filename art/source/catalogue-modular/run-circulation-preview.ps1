# One finite source-asset preview. Run from the assigned artist worktree.
$ErrorActionPreference='Stop'
$taskRoot=(Resolve-Path '.').Path
$recordRoot=Join-Path $taskRoot 'artifacts/helpers/h15-circulation-preview'
New-Item -ItemType Directory -Force -Path $recordRoot | Out-Null
$profile=Join-Path $recordRoot ('profile-'+[guid]::NewGuid().ToString('N'))
$stop=Join-Path $recordRoot ('STOP-'+[guid]::NewGuid().ToString('N'))
$done=Join-Path $recordRoot 'REVIEW-DONE'
if(Test-Path -LiteralPath $done){Remove-Item -LiteralPath $done}
if(Get-NetTCPConnection -State Listen -LocalPort @(4568,4569) -ErrorAction SilentlyContinue){throw 'Static-preview ports are occupied.'}
$nodeExe=(Get-Command node).Source
$pythonExe=(Get-Command python).Source
$chromeExe=(Get-Item -LiteralPath 'C:/Program Files/Google/Chrome/Application/chrome.exe').FullName
$cleanup='C:/Users/baals/Local Storage/AI/GTP/helper-lifecycle/cleanup.py'
$overlay=Join-Path $recordRoot 'empty-overlay'
New-Item -ItemType Directory -Force -Path $overlay | Out-Null
'{"files":[]}' | Set-Content -Encoding utf8 (Join-Path $recordRoot 'runtime-inputs.json')
$expires=[DateTime]::UtcNow.AddMinutes(15)
$serverArgs=@('art/source/catalogue-modular/serve-review.mjs','--root','.','--port','4568','--base','/tinderbox/','--ttl','900','--stop-file',$stop,'--overlay',$overlay)
$browserArgs=@('--headless=new','--remote-debugging-address=127.0.0.1','--remote-debugging-port=4569','--disable-background-networking','--disable-default-apps','--disable-extensions','--disable-sync','--no-first-run','--no-default-browser-check','--no-proxy-server','--use-angle=d3d11','--window-size=1400,1050',('--user-data-dir='+$profile),'about:blank')
$sourceFiles=@('art/source/catalogue-modular/run-circulation-preview.ps1','art/source/catalogue-modular/capture-circulation.mjs','art/source/catalogue-modular/preview-circulation.html','art/source/catalogue-modular/preview-circulation.js','art/source/catalogue-modular/serve-review.mjs','art/source/catalogue-modular/thermal-art.js','src/runtime/three.js','src/reuse/characters.js','src/reuse/bear.js','src/reuse/bear-tools.js','src/reuse/loading.js','package.json','workbenches/catalogue-modular/house-data.json') | ForEach-Object {Join-Path $taskRoot $_}
$restart=@{cwd=$taskRoot;executable=$nodeExe;args=@('art/source/catalogue-modular/capture-circulation.mjs');dependencies=@('Node >=22','Installed Chrome native WebGL','Git source 4cecd10d plus these preview sources');inputs=@('workbenches/catalogue-modular/house-data.json','Local vendored textures/native rigs');outputs=@('docs/art/h15-circulation/previews','docs/art/h15-circulation/preview.json');pendingWork='Deliberately run the wrapper to reproduce static source views; no automatic restart.';secretReferences=@()}
@{owner='01a17ea0-1362-7d13-a42d-f4a5fcff8902';purpose='One static exported-H15 visual review';sourceCommit='4cecd10d09eff85543996d4362c63b2297001436';serverExecutable=$nodeExe;serverArguments=$serverArgs;browserExecutable=$chromeExe;browserArguments=$browserArgs;expiresAt=$expires.ToString('o');stopFile=$stop;reviewDoneFile=$done;restart=$restart} | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 (Join-Path $recordRoot 'restart.json')
$server=$null;$browser=$null;$browserTime=$null;$serverTime=$null
try{
 $server=Start-Process -FilePath $nodeExe -ArgumentList $serverArgs -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $recordRoot 'server-out.log') -RedirectStandardError (Join-Path $recordRoot 'server-err.log');$serverTime=$server.StartTime.ToUniversalTime()
 $serverSpec=@{pid=$server.Id;kind='task_owned';purpose='Finite localhost static H15 source-preview server';ownershipEvidence='Launched by assigned artist wrapper; unique port and private stop file';owners=@('01a17ea0-1362-7d13-a42d-f4a5fcff8902');state='stateless';sourceFiles=$sourceFiles;restart=@{cwd=$taskRoot;executable=$nodeExe;args=$serverArgs;dependencies=$restart.dependencies;inputs=$restart.inputs;outputs=$restart.outputs;pendingWork=$restart.pendingWork;secretReferences=@()};ports=@(4568);helperDirectory=$recordRoot;stop=@{method='stop_file';path=$stop};expiresAt=$expires.ToString('o')};$specPath=Join-Path $recordRoot 'server-registration.json';$serverSpec|ConvertTo-Json -Depth 10|Set-Content -Encoding utf8 $specPath
 & $pythonExe $cleanup register $specPath
 if($LASTEXITCODE -ne 0){throw 'Preview server registration failed.'}
 $browser=Start-Process -FilePath $chromeExe -ArgumentList $browserArgs -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $recordRoot 'browser-out.log') -RedirectStandardError (Join-Path $recordRoot 'browser-err.log');$browserTime=$browser.StartTime.ToUniversalTime()
 $browserSpec=@{pid=$browser.Id;kind='task_owned';purpose='Single isolated static H15 asset render session';ownershipEvidence='Launched by assigned artist wrapper; unique profile/debug port; no user browsing';owners=@('01a17ea0-1362-7d13-a42d-f4a5fcff8902');state='stateless';sourceFiles=$sourceFiles;restart=@{cwd=$taskRoot;executable=$chromeExe;args=$browserArgs;dependencies=$restart.dependencies;inputs=$restart.inputs;outputs=$restart.outputs;pendingWork=$restart.pendingWork;secretReferences=@()};ports=@(4569);safeToTerminateReason='Disposable source-preview browser; no user tabs, edits or uncheckpointed simulation';stop=@{method='terminate_stateless'};expiresAt=$expires.ToString('o')};$specPath=Join-Path $recordRoot 'browser-registration.json';$browserSpec|ConvertTo-Json -Depth 10|Set-Content -Encoding utf8 $specPath
 & $pythonExe $cleanup register $specPath
 if($LASTEXITCODE -ne 0){throw 'Preview browser registration failed.'}
 & $nodeExe art/source/catalogue-modular/capture-circulation.mjs
 if($LASTEXITCODE -ne 0){throw 'Static capture failed; preserve failure record.'}
 Write-Output 'Images ready; one source preview remains only during active visual review, hard expiry 15 minutes.'
 while(-not(Test-Path -LiteralPath $done) -and [DateTime]::UtcNow -lt $expires -and -not $browser.HasExited){Start-Sleep -Milliseconds 500}
}finally{
 if($browser -and -not $browser.HasExited){try{& $nodeExe art/source/catalogue-modular/capture-circulation.mjs --close | Out-Null}catch{};if(-not $browser.WaitForExit(5000)){$live=Get-Process -Id $browser.Id -ErrorAction SilentlyContinue;if($live -and $live.StartTime.ToUniversalTime() -eq $browserTime -and $live.Path -eq $chromeExe){$browser.Kill();$browser.WaitForExit(5000)|Out-Null}}}
 if($server){Set-Content -LiteralPath $stop -Encoding ascii -Value 'review ended';if(-not $server.WaitForExit(6000)){throw 'Source-preview server did not honor stop file.'}}
 $ports=Get-NetTCPConnection -State Listen -LocalPort @(4568,4569) -ErrorAction SilentlyContinue
 $profileUsers=Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | Where-Object {$_.CommandLine -and $_.CommandLine.Contains($profile)}
 for($i=0;$profileUsers -and $i -lt 15;$i++){Start-Sleep -Milliseconds 200;$profileUsers=Get-CimInstance Win32_Process -Filter "name='chrome.exe'"|Where-Object{$_.CommandLine -and $_.CommandLine.Contains($profile)}}
 if(-not $profileUsers -and(Test-Path -LiteralPath $profile)){$resolved=(Resolve-Path -LiteralPath $profile).Path;if(-not $resolved.StartsWith($recordRoot+[IO.Path]::DirectorySeparatorChar)){throw 'Unsafe preview profile path.'};Remove-Item -LiteralPath $resolved -Recurse -Force}
 @{task='H15 source-asset preview';retiredAt=[DateTime]::UtcNow.ToString('o');server=$(if($server){@{pid=$server.Id;creationTime=$serverTime.ToString('o');exited=$server.HasExited}}else{$null});browser=$(if($browser){@{pid=$browser.Id;creationTime=$browserTime.ToString('o');exited=$browser.HasExited}}else{$null});portsReleased=(-not [bool]$ports);profileRemoved=(-not(Test-Path -LiteralPath $profile));restart='artifacts/helpers/h15-circulation-preview/restart.json'}|ConvertTo-Json -Depth 6|Set-Content -Encoding utf8 (Join-Path $recordRoot 'retirement.json')
 & $pythonExe $cleanup inventory | Out-File -Encoding utf8 (Join-Path $recordRoot 'inventory-after.json')
 if($ports -or $profileUsers){throw 'Source-preview cleanup requires review; see retirement.json.'}
 Write-Output 'Static preview helper closed, private profile removed and both ports released.'
}
