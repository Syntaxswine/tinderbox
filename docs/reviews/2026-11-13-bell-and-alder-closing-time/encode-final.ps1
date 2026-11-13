param([Parameter(Mandatory=$true)][string]$HeroDirectory,
      [Parameter(Mandatory=$true)][string]$DirectDirectory)
$ErrorActionPreference='Stop'
$taskRoot='C:/Users/baals/Documents/ChatGPT/tinderbox'
$taskWork=Join-Path $taskRoot 'artifacts/qa/bell-and-alder-closing/replay-review/final-encode'
$taskDelivery=Join-Path $taskRoot 'docs/reviews/2026-11-13-bell-and-alder-closing-time'
$taskFfmpeg='C:/Users/baals/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
New-Item -ItemType Directory -Path (Join-Path $taskWork 'frames'),$taskDelivery -Force|Out-Null
$taskLines=[System.Collections.Generic.List[string]]::new()
$taskLines.Add('ffconcat version 1.0')
$taskFrames=[System.Collections.Generic.List[object]]::new()
$taskSegments=[System.Collections.Generic.List[object]]::new()
$taskDuration=0.0
foreach($taskSpec in @(@{mode='hero';directory=$HeroDirectory},@{mode='direct';directory=$DirectDirectory})){
  if(-not(Test-Path -LiteralPath (Join-Path $taskSpec.directory 'complete.json'))){throw 'Source sequence is incomplete'}
  $taskSequencePath=Join-Path $taskSpec.directory 'sequence.json'
  $taskSequence=Get-Content -LiteralPath $taskSequencePath -Raw|ConvertFrom-Json
  if($taskSequence.source.dataSha256 -ne '15d284fbcaad23daceaf727079dbb902c072a9a0cefeaea7bd12fe89fd29c943'){throw 'Unexpected physical source'}
  if($taskSequence.source.gameRuntimeFilesSha256 -ne '74d5f58d62a1d2ed3258b3bf62eb889def29bf3f938b903b31d8f66f43174ffe'){throw 'Unexpected runtime source'}
  $taskSegmentStart=$taskDuration
  foreach($taskFrame in $taskSequence.sequence){
    if($taskFrame.file -notmatch '^\d{4}\.jpg$' -or $taskFrame.mode -ne $taskSpec.mode){throw 'Unexpected source frame path or mode'}
    if($taskFrame.durationSeconds -le 0 -or $taskFrame.durationSeconds -gt 10){throw 'Unexpected duration'}
    $taskFile=$taskSpec.mode+'-'+$taskFrame.file
    $taskTo=Join-Path (Join-Path $taskWork 'frames') $taskFile
    Copy-Item -LiteralPath (Join-Path $taskSpec.directory $taskFrame.file) -Destination $taskTo
    $taskBytes=[IO.File]::ReadAllBytes($taskTo)
    if($taskBytes.Length -lt 1000 -or $taskBytes[0] -ne 255 -or $taskBytes[1] -ne 216){throw 'Invalid source JPEG'}
    $taskLines.Add("file 'frames/$taskFile'")
    $taskLines.Add('duration '+$taskFrame.durationSeconds.ToString('0.########',[Globalization.CultureInfo]::InvariantCulture))
    $taskFrames.Add([pscustomobject]@{file=$taskFile;mode=$taskSpec.mode;worldTime=$taskFrame.worldTime;sourceTick=$taskFrame.sourceTick;speed=$taskFrame.speed;videoStart=$taskDuration;duration=$taskFrame.durationSeconds;sha256=(Get-FileHash -LiteralPath $taskTo -Algorithm SHA256).Hash.ToLowerInvariant()})
    $taskDuration+=$taskFrame.durationSeconds
  }
  Copy-Item -LiteralPath $taskSequencePath -Destination (Join-Path $taskDelivery ($taskSpec.mode+'-sequence.json'))
  $taskSegments.Add([pscustomobject]@{mode=$taskSpec.mode;start=$taskSegmentStart;duration=($taskDuration-$taskSegmentStart);sourceFrames=$taskSequence.sequence.Count;source=$taskSequence.source})
}
$taskLines.Add("file 'frames/$taskFile'")
[IO.File]::WriteAllLines((Join-Path $taskWork 'sequence.ffconcat'),$taskLines,[Text.UTF8Encoding]::new($false))
$taskVideo=Join-Path $taskDelivery 'closing-time-replay.mp4'
$taskArguments=@('-hide_banner','-loglevel','warning','-f','concat','-safe','0','-i',(Join-Path $taskWork 'sequence.ffconcat'),'-an','-vf','fps=15,format=yuv420p','-t',$taskDuration.ToString('0.########',[Globalization.CultureInfo]::InvariantCulture),'-c:v','libx264','-threads','2','-preset','veryfast','-crf','20','-movflags','+faststart','-n',$taskVideo)
& $taskFfmpeg @taskArguments
if($LASTEXITCODE -ne 0){throw 'Video encode failed'}
& $taskFfmpeg -hide_banner -nostdin -i $taskVideo -map 0:v:0 -an -f null - 2> (Join-Path $taskDelivery 'decode.log')
if($LASTEXITCODE -ne 0){throw 'Full video decode failed'}
foreach($taskSeconds in @(0,40,50,90,125,148)){
  & $taskFfmpeg -hide_banner -loglevel error -ss $taskSeconds -i $taskVideo -frames:v 1 -q:v 2 -threads 1 -n (Join-Path $taskDelivery ('sample-'+$taskSeconds+'.jpg'))
  if($LASTEXITCODE -ne 0){throw 'Decoded frame extraction failed'}
}
$taskManifest=[pscustomobject]@{version=1;createdAt=[DateTime]::UtcNow.ToString('o');video='closing-time-replay.mp4';videoSha256=(Get-FileHash -LiteralPath $taskVideo -Algorithm SHA256).Hash.ToLowerInvariant();videoBytes=(Get-Item -LiteralPath $taskVideo).Length;expectedDuration=$taskDuration;outputFps=15;width=1280;height=796;silent=$true;motionInterpolated=$false;sourceFrames=$taskFrames.Count;segments=$taskSegments;frames=$taskFrames;encoder=[pscustomobject]@{executable=$taskFfmpeg;arguments=$taskArguments;restartSource=$PSCommandPath};fullDecodePassed=$true;acceptance='Diagnostic movie only; combined acceptance and demo expansion held'}
$taskManifest|ConvertTo-Json -Depth 9|Set-Content -LiteralPath (Join-Path $taskDelivery 'manifest.json') -Encoding utf8
[pscustomobject]@{video=$taskVideo;expectedDuration=$taskDuration;sourceFrames=$taskFrames.Count;sha256=$taskManifest.videoSha256}|ConvertTo-Json -Compress
