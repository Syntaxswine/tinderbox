param([Parameter(Mandatory=$true)][string]$PlanPath,[Parameter(Mandatory=$true)][int]$OwnerPid)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$plan=Get-Content -LiteralPath $PlanPath -Raw | ConvertFrom-Json
$recordPath=Join-Path (Split-Path -Parent $PlanPath) 'encoder-run.json'
$own=Get-Process -Id $PID
$record=[ordered]@{ ownerChat='01a17ea0-1362-7d13-a42d-f4a5fcff8902';task='M29 approved clear parapet block closeups';purpose='Encode two offline JPGs with labels and scales';pid=$PID;creationFiletime=$own.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$own.Path;renderSessionPid=$OwnerPid;startedAt=[DateTime]::UtcNow.ToString('o');intendedExpirySeconds=120;port=$null;retained=$false;stopMethod='Synchronous foreground encoding completes after two JPGs; no retained helper';outputs=@() }
[IO.File]::WriteAllText($recordPath,($record|ConvertTo-Json -Depth 8)+"`n",[Text.UTF8Encoding]::new($false))
try {
 $jpeg=[System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
 $quality=[System.Drawing.Imaging.EncoderParameters]::new(1)
 $quality.Param[0]=[System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality,[long]95)
 foreach($view in $plan.views) {
  $source=[System.Drawing.Image]::FromFile($view.bmpPath)
  $canvas=[System.Drawing.Bitmap]::new(1600,1100)
  $g=[System.Drawing.Graphics]::FromImage($canvas)
  $g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#253c34'))
  $g.DrawImage($source,[System.Drawing.Rectangle]::new(0,0,1600,860))
  $titleFont=[System.Drawing.Font]::new('Arial',24,[System.Drawing.FontStyle]::Bold)
  $bodyFont=[System.Drawing.Font]::new('Arial',14)
  $smallFont=[System.Drawing.Font]::new('Arial',12)
  $cream=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#f3e6cd'))
  $muted=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#bdcbbb'))
  $accent=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#b9ded2'))
  $ruler=[System.Drawing.Pen]::new($cream.Color,3)
  $backing=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#253c34'))
  $g.FillRectangle($backing,0,0,1600,112)
  $g.FillRectangle($backing,26,773,[single]($view.rulerMetres*1600/(2*$view.camera.halfWidth)+38),64)
  $g.DrawString($view.title,$titleFont,$cream,26,20)
  $g.DrawString($view.caption,$bodyFont,$cream,28,66)
  $g.DrawString($view.notes[0],$bodyFont,$cream,28,880)
  $g.DrawString($view.notes[1],$smallFont,$muted,28,921)
  $span=2*[double]$view.camera.halfWidth
  $ppm=1600/$span
  $g.DrawString(("Orthographic field: {0:0.00} m wide | {1:0.0} image px/m | Original source colours; diffuse software preview" -f $span,$ppm),$smallFont,$muted,28,958)
  $rulerLength=[single]([double]$view.rulerMetres*$ppm)
  $g.DrawLine($ruler,[single]40,[single]819,[single](40+$rulerLength),[single]819)
  $g.DrawLine($ruler,[single]40,[single]811,[single]40,[single]827)
  $g.DrawLine($ruler,[single](40+$rulerLength),[single]811,[single](40+$rulerLength),[single]827)
  $g.DrawString(("{0} m" -f $view.rulerMetres),$smallFont,$cream,40,784)
  $g.DrawString($plan.footer,$smallFont,$cream,28,1015)
  $g.DrawString('New blocks share the approved primitive, UV density and existing cornice material. No new texture layer.',$smallFont,$muted,28,1051)
  $canvas.Save($view.jpgPath,$jpeg,$quality)
  $record.outputs+=@($view.jpgPath)
  $g.Dispose();$canvas.Dispose();$source.Dispose();$titleFont.Dispose();$bodyFont.Dispose();$smallFont.Dispose();$cream.Dispose();$muted.Dispose();$accent.Dispose();$ruler.Dispose();$backing.Dispose()
 }
 $quality.Dispose();$record.passed=$true
} finally {
 $record.finishedAt=[DateTime]::UtcNow.ToString('o')
 [IO.File]::WriteAllText($recordPath,($record|ConvertTo-Json -Depth 8)+"`n",[Text.UTF8Encoding]::new($false))
}
