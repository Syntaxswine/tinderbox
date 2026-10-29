"""Review sheet made from actual model renders and recorded metre outlines."""
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'artifacts/render-deps'))
from PIL import Image,ImageDraw,ImageFont
D=ROOT/'docs/art/exposition-new-york-tile/previews'
meta=json.loads((ROOT/'assets/art/exposition-new-york-tile/metadata.json').read_text(encoding='utf-8'))
old=json.loads((ROOT/'assets/art/exposition-new-york/metadata.json').read_text(encoding='utf-8'))
font=lambda n,bold=False:ImageFont.truetype('C:/Windows/Fonts/'+('arialbd.ttf' if bold else 'arial.ttf'),n)
canvas=Image.new('RGB',(2400,3100),'#f3eddd');draw=ImageDraw.Draw(canvas)
ink='#263e35';green='#1c7261';muted='#66736a';amber='#a27030'
draw.text((50,35),'New York State Building | two preserved editions',font=font(48,True),fill=ink)
draw.text((50,100),'Original custom model kept intact. Separate structure compiled from the native metre grid.',font=font(29),fill=ink)
for x,path,title,line in [(50,ROOT/'docs/art/exposition-new-york/previews/front-isometric.jpg','Original source study','47 x 27 m main body; custom upper elevations'),(1230,D/'front-isometric.jpg','Tile adaptation','48 x 28 m main body; standard 2.12 m levels')]:
 im=Image.open(path).crop((0,0,1600,1060)).resize((1120,742),Image.Resampling.LANCZOS);canvas.paste(im,(x,163))
 draw.text((x,923),title,font=font(34,True),fill=ink);draw.text((x,971),line,font=font(27),fill=ink)
draw.text((50,1035),'Actual front elevation with the shared level grid',font=font(34,True),fill=ink)
draw.text((50,1082),'Green: floor/deck present somewhere in the building. Amber: no floor slab at that level.',font=font(26),fill=ink)
oy=1135
im=Image.open(D/'front-elevation.jpg').crop((0,0,1600,1060));canvas.paste(im,(50,oy));draw=ImageDraw.Draw(canvas)
active={f['level'] for f in meta['floors']}
for n in range(16):
 y=oy+530-(n*2.12-17)*1600/76
 c=green if n in active else amber if n else muted
 for xx in range(65,1655,20):draw.line((xx,y,min(xx+9,1655),y),fill=c,width=2)
 state='SLAB' if n in active else 'VOID' if n else 'GROUND'
 text=f'L{n:02d}   {n*2.12:5.2f} m   {state}'
 draw.text((1715,y-13),text,font=font(27,n in active),fill=c)
draw.text((1715,oy+960),'Roof peaks and ornament',font=font(25),fill=ink)
draw.text((1715,oy+994),'can sit between grid levels.',font=font(25),fill=ink)
y0=2240
draw.text((50,y0),'Actual cutaway | green slabs, open tall rooms',font=font(32,True),fill=ink)
im=Image.open(D/'structural-cutaway.jpg').crop((0,0,1600,1060)).resize((1120,742),Image.Resampling.LANCZOS);canvas.paste(im,(50,y0+53))
# Same-scale plan overlay: original grey, new green, one square = one metre.
draw=ImageDraw.Draw(canvas);draw.text((1230,y0),'Metre plan | body wall centre-lines',font=font(32,True),fill=ink)
sc=17;cx=1790;cz=y0+102
for x in range(-25,26):draw.line((cx+x*sc,cz,cx+x*sc,cz+35*sc),fill='#e3dccb',width=1)
for z in range(36):draw.line((cx-25*sc,cz+z*sc,cx+25*sc,cz+z*sc),fill='#e3dccb',width=1)
for outline,c,w in [(old['authoredBodyOutline'],'#8e9190',4),(meta['tilePlan']['bodyOutline'],green,5)]:
 points=[(cx+x*sc,cz+z*sc) for x,z in outline];draw.line(points+[points[0]],fill=c,width=w)
draw.text((cx-140,cz-43),'48 m facade',font=font(27,True),fill=green)
draw.text((1230,cz+613),'Grey: original     Green: tile copy',font=font(27),fill=ink)
draw.text((1230,cz+654),'Wall runs: 2, 4, 6, 10, 16, 28, 48 m',font=font(27,True),fill=ink)
draw.text((1230,cz+695),'Curved porches / ornament are custom attachments.',font=font(25),fill=ink)
# Extend page a little so the final labels have comfortable margins.
page=Image.new('RGB',(2400,3160),'#f3eddd');page.paste(canvas,(0,0));draw=ImageDraw.Draw(page)
draw.text((50,3113),'Actual-model CPU evidence. Room partitions, stair traversal, collision and WebGL acceptance remain later integration work.',font=font(25),fill=muted)
page.save(D/'grid-audit.jpg',quality=95,subsampling=0,optimize=True)
print('Saved 2400 x 3160 grid-audit.jpg from the actual model views and recorded outlines.')
