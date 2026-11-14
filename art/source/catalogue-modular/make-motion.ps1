$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;using System.IO;using System.Text;
public static class CatalogueFireMotion {
 public static void Encode(byte[][] frames,string output,ushort delay){
  using(var writer=new BinaryWriter(File.Create(output))){
   writer.Write(Encoding.ASCII.GetBytes("GIF89a"));writer.Write(frames[0],6,4);writer.Write(new byte[]{0x70,0,0});
   writer.Write(new byte[]{0x21,0xff,11});writer.Write(Encoding.ASCII.GetBytes("NETSCAPE2.0"));writer.Write(new byte[]{3,1,0,0,0});
   foreach(var gif in frames){
    int globalSize=(gif[10]&0x80)!=0?3*(1<<((gif[10]&7)+1)):0,at=13+globalSize;
    while(gif[at]!=0x2c){if(gif[at]!=0x21)throw new Exception("Expected GIF image or extension");at+=2;int n;do{n=gif[at++];at+=n;}while(n!=0);}
    int flags=gif[at+9],localSize=(flags&0x80)!=0?3*(1<<((flags&7)+1)):0,paletteAt=localSize>0?at+10:13,paletteSize=localSize>0?localSize:globalSize,bits=localSize>0?flags&7:gif[10]&7;
    if(paletteSize==0)throw new Exception("Native GIF encoder omitted its palette");int start=at+10+localSize,end=start+1,count;do{count=gif[end++];end+=count;}while(count!=0);
    writer.Write(new byte[]{0x21,0xf9,4,4,(byte)delay,(byte)(delay>>8),0,0});writer.Write((byte)0x2c);writer.Write(gif,at+1,8);writer.Write((byte)(0x80|(flags&0x60)|bits));writer.Write(gif,paletteAt,paletteSize);writer.Write(gif,start,end-start);
   }writer.Write((byte)0x3b);
  }
 }
}
"@
$taskRoot=(Resolve-Path '.').Path
$paths=0..7 | ForEach-Object {Join-Path $taskRoot ('docs/art/catalogue-modular/previews/desktop-fire-motion-{0:d2}.jpg' -f $_)}
$encoded=[Collections.Generic.List[byte[]]]::new()
foreach($path in $paths){$nativeImage=[Drawing.Image]::FromFile($path);$memory=[IO.MemoryStream]::new();try{$nativeImage.Save($memory,[Drawing.Imaging.ImageFormat]::Gif);$encoded.Add($memory.ToArray())}finally{$nativeImage.Dispose();$memory.Dispose()}}
$outputPath=Join-Path $taskRoot 'docs/art/catalogue-modular/previews/desktop-grass-fire-motion.gif'
[CatalogueFireMotion]::Encode($encoded.ToArray(),$outputPath,3)
$check=[Drawing.Image]::FromFile($outputPath)
try{if($check.GetFrameCount([Drawing.Imaging.FrameDimension]::Time)-ne8){throw 'Native animation frame count differs'};$size=@($check.Width,$check.Height)}finally{$check.Dispose()}
$receipt=@{version=1;source='Eight unchanged native full-host HUD screenshots, captured through real inputs';frames=8;dimensions=$size;nativeFrameIntervalSeconds=(1.0/30);gifFrameMilliseconds=30;timingNote='GIF delay is quantized to centiseconds; the preview runs about 11 percent faster than the native 30 Hz samples.';output='docs/art/catalogue-modular/previews/desktop-grass-fire-motion.gif';sha256=(Get-FileHash -LiteralPath $outputPath -Algorithm SHA256).Hash.ToLowerInvariant();inputs=@($paths|ForEach-Object{@{path=('docs/art/catalogue-modular/previews/'+[IO.Path]::GetFileName($_));sha256=(Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash.ToLowerInvariant()}})}
$receipt|ConvertTo-Json -Depth 6|Set-Content -LiteralPath 'docs/art/catalogue-modular/motion.json' -Encoding utf8
@{frames=8;dimensions=$size;output=$receipt.output}|ConvertTo-Json -Compress
