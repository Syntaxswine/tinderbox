param([Parameter(Mandatory=$true)][string]$PlanPath,[Parameter(Mandatory=$true)][int]$OwnerPid)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$plan=Get-Content -LiteralPath $PlanPath -Raw | ConvertFrom-Json
$recordPath=Join-Path (Split-Path -Parent $PlanPath) 'encoder-run.json'
$own=Get-Process -Id $PID
$record=[ordered]@{ownerChat='01a17ea0-1362-7d13-a42d-f4a5fcff8902';task='M29 nineteen native fitting contact sheets';purpose='Encode exactly two labeled actual-buffer contact sheets';pid=$PID;creationFiletime=$own.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$own.Path;renderSessionPid=$OwnerPid;startedAt=[DateTime]::UtcNow.ToString('o');intendedExpirySeconds=120;port=$null;retained=$false;stopMethod='Synchronous conversion; natural exit under render owner deadline';outputs=@()}
[IO.File]::WriteAllText($recordPath,($record|ConvertTo-Json -Depth 8)+"`n",[Text.UTF8Encoding]::new($false))
try {
 $jpeg=[System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()|Where-Object MimeType -eq 'image/jpeg'
 $quality=[System.Drawing.Imaging.EncoderParameters]::new(1);$quality.Param[0]=[System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality,[long]95)
 foreach($view in $plan.views){
  $source=[System.Drawing.Image]::FromFile($view.bmpPath);$canvas=[System.Drawing.Bitmap]::new(1600,1640);$g=[System.Drawing.Graphics]::FromImage($canvas)
  $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic;$g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $dark=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#253c34'));$cream=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#f3e6cd'));$muted=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#c3d0bd'))
  $title=[System.Drawing.Font]::new('Arial',24,[System.Drawing.FontStyle]::Bold);$body=[System.Drawing.Font]::new('Arial',13);$small=[System.Drawing.Font]::new('Arial',11)
  $line=[System.Drawing.Pen]::new($muted.Color,1);$ruler=[System.Drawing.Pen]::new($cream.Color,2)
  $g.Clear($dark.Color);$g.DrawImage($source,[System.Drawing.Rectangle]::new(0,110,1600,1400))
  $g.DrawString($view.title,$title,$cream,22,18);$g.DrawString($view.caption,$body,$cream,24,65)
  foreach($cell in $view.cells){
   $x=[single]($cell.col*400);$y=[single](110+$cell.row*280)
   $g.FillRectangle($dark,$x,$y,[single]400,[single]32);$g.DrawString($cell.label,$body,$cream,($x+9),($y+5))
   $g.DrawRectangle($line,$x,$y,[single]399,[single]279)
   $length=[single](.1*400/$view.fieldWidth);$ry=[single]($y+271)
   $g.DrawLine($ruler,($x+12),$ry,($x+12+$length),$ry);$g.DrawLine($ruler,($x+12),($ry-4),($x+12),($ry+4));$g.DrawLine($ruler,($x+12+$length),($ry-4),($x+12+$length),($ry+4))
   $g.DrawString('0.1 m',$small,$cream,($x+18+$length),($y+260))
   $g.DrawString(('q '+([double]$cell.quantity).ToString('G11')),$small,$muted,($x+200),($y+260))
  }
  $g.DrawString(('Per-cell field: '+$view.fieldWidth+' m wide; '+(400/$view.fieldWidth).ToString('0.0')+' image px/m. 0.16 x 0.2099999982 x 0.16 m envelopes.'),$body,$cream,24,1526)
  $g.DrawString('19 new pieces; first accepted P6/bay01 omitted. Profile sheet omits original parents. Empty grid cell has no asset.',$small,$muted,24,1560)
  $g.DrawString($plan.footer,$small,$cream,24,1591)
  $g.DrawString('Quantities abbreviated for display; exact per-piece binary64 certificates are authoritative. Both fixed lower ports remain required.',$small,$muted,24,1614)
  $canvas.Save($view.jpgPath,$jpeg,$quality);$record.outputs+=@($view.jpgPath)
  $g.Dispose();$canvas.Dispose();$source.Dispose();$dark.Dispose();$cream.Dispose();$muted.Dispose();$title.Dispose();$body.Dispose();$small.Dispose();$line.Dispose();$ruler.Dispose()
 }
 $quality.Dispose();$record.passed=$true
}finally{$record.finishedAt=[DateTime]::UtcNow.ToString('o');[IO.File]::WriteAllText($recordPath,($record|ConvertTo-Json -Depth 8)+"`n",[Text.UTF8Encoding]::new($false))}
