param([string]$Before,[string]$After,[string]$Output)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
public static class StartupPixels {
 public static long[] Compare(byte[] a,byte[] b,int width,int height,int stride) {
  int columns=(width+79)/80;var result=new long[columns*((height+79)/80)*4+4];int tail=result.Length-4;result[tail]=width;result[tail+1]=height;
  for(int y=0;y<height;y++)for(int x=0;x<width;x++) {
   int n=y*stride+x*3,block=((y/80)*columns+x/80)*4;bool changed=false;
   for(int c=0;c<3;c++) {int d=System.Math.Abs(a[n+c]-b[n+c]);changed|=d>0;result[block+1]+=d;result[block+2]=System.Math.Max(result[block+2],d);result[block+3]+=d*d;}
   if(changed){result[block]++;result[tail]=System.Math.Min(result[tail],x);result[tail+1]=System.Math.Min(result[tail+1],y);result[tail+2]=System.Math.Max(result[tail+2],x);result[tail+3]=System.Math.Max(result[tail+3],y);}
  }
  return result;
 }
}
'@
$a=[System.Drawing.Bitmap]::new([string](Resolve-Path -LiteralPath $Before).Path)
$b=[System.Drawing.Bitmap]::new([string](Resolve-Path -LiteralPath $After).Path)
$lockedA=$null;$lockedB=$null
try {
 if($a.Width -ne $b.Width -or $a.Height -ne $b.Height){throw 'Frame dimensions differ'}
 $rectangle=[System.Drawing.Rectangle]::new(0,0,$a.Width,$a.Height)
 $lockedA=$a.LockBits($rectangle,[System.Drawing.Imaging.ImageLockMode]::ReadOnly,[System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
 $lockedB=$b.LockBits($rectangle,[System.Drawing.Imaging.ImageLockMode]::ReadOnly,[System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
 if($lockedA.Stride -ne $lockedB.Stride -or $lockedA.Stride -lt 0){throw 'Unexpected bitmap layout'}
 $bytesA=[byte[]]::new($lockedA.Stride*$a.Height);$bytesB=[byte[]]::new($lockedB.Stride*$b.Height)
 [System.Runtime.InteropServices.Marshal]::Copy($lockedA.Scan0,$bytesA,0,$bytesA.Length)
 [System.Runtime.InteropServices.Marshal]::Copy($lockedB.Scan0,$bytesB,0,$bytesB.Length)
 $values=[StartupPixels]::Compare($bytesA,$bytesB,$a.Width,$a.Height,$lockedA.Stride)
 $columns=[int][Math]::Ceiling($a.Width/80);$blocks=@();$changed=0;$squared=0
 for($i=0;$i -lt $values.Length-4;$i+=4){
  $x=([int]($i/4)%$columns)*80;$y=[int][Math]::Floor(($i/4)/$columns)*80
  $changed+=$values[$i];$squared+=$values[$i+3]
  $blocks+=@{x=$x;y=$y;changedPixels=$values[$i];absoluteChannelDifference=$values[$i+1];maxChannelDifference=$values[$i+2];squared=$values[$i+3]}
 }
 $result=@{scope='Offline Windows JPEG decoder; 80px tiles, no rendering or new GPU probe';width=$a.Width;height=$a.Height;changedPixels=$changed;channelRms=[Math]::Sqrt($squared/($a.Width*$a.Height*3));changedBounds=@{minX=$values[-4];minY=$values[-3];maxX=$values[-2];maxY=$values[-1]};blocks=$blocks}
 $result|ConvertTo-Json -Depth 5|Set-Content -LiteralPath $Output
 $result|Select-Object -Property * -ExcludeProperty blocks|ConvertTo-Json -Depth 3
} finally {
 if($lockedA){$a.UnlockBits($lockedA)};if($lockedB){$b.UnlockBits($lockedB)};$a.Dispose();$b.Dispose()
}
