"""Review sheets from preserved source pixels and actual exported mesh renders.
No stretching to force agreement. Source and model share the stated metre scale.
"""
from pathlib import Path
import json
from PIL import Image,ImageDraw,ImageFont,ImageOps
ROOT=Path(__file__).resolve().parents[3]
E=ROOT/'art/source/exposition-administration/evidence'
P=ROOT/'docs/art/exposition-administration/previews'
FONT='C:/Windows/Fonts/arial.ttf';BOLD='C:/Windows/Fonts/arialbd.ttf'
def font(n,b=False):return ImageFont.truetype(BOLD if b else FONT,n)
def txt(im,xy,s,n=25,color='#263b36',bold=False):ImageDraw.Draw(im).text(xy,s,font=font(n,bold),fill=color)
def fit(im,box):
 im=im.copy();im.thumbnail(box,Image.Resampling.LANCZOS);return im
def affine(im,size,origin,baseline,scale,centre=560,base=1000):
 return im.transform(size,Image.Transform.AFFINE,(scale,0,origin-centre*scale,0,scale,baseline-base*scale),Image.Resampling.BICUBIC,fillcolor='#f7f3e9')
source=Image.open(E/'hunt-sheet-full.jpg').convert('RGB')
render=Image.open(P/'front-elevation.jpg').crop((0,0,1600,1060))
page=Image.new('RGB',(2600,2860),'#f7f3e9');d=ImageDraw.Draw(page)
txt(page,(60,35),'Administration Building | source and Nautilus assembly',45,bold=True)
txt(page,(60,100),'Hunt / Riquois, 1893 (LOC 2024636088) and actual-model CPU renders. Units: metres.',27)
left,right=60,1330
for x,title,sub in [(left,'Published drawing','Indicative elevation: same-sheet plan ruler; no separate elevation ruler.'),(right,'Authored engine assembly','Fixed 2.12 m pitch; custom dome and ornament; four pavilion floors.')]:
 txt(page,(x,168),title,32,bold=True);txt(page,(x,211),sub,23)
# 12 pixels per metre on both panels. The source has not been reshaped.
sp=affine(source,(1120,1080),2395,3190,32.38/12)
mp=affine(render,(1120,1080),800,530+38*(1600/144),(1600/144)/12)
for x,im in [(left+45,sp),(right+45,mp)]:
 page.paste(im,(x,255));d.line((x,1255,x+1120,1255),fill='#548079',width=2)
 d.line((x+75,1315,x+315,1315),fill='#263b36',width=4);txt(page,(x+90,1273),'20 m',23)
txt(page,(left,1350),'Measured front: 79.77 m (about +/-1.1 m).',25)
txt(page,(right,1350),'Body: 80 m. Crown: 76.32 m (grid marker 36).',25)
txt(page,(left,1390),'Height from this ruler is indicative: 77.52 m +/-1.4 m.',23)
txt(page,(right,1390),'Flinn: 250 ft = 76.20 m; candidate uses that height basis.',23)
for x,title in [(left,'Original front-half plan'),(right,'Adapted front offices / first-floor wall course')]:txt(page,(x,1475),title,30,bold=True)
# Plan uses its printed 0--50 METRE ruler. Mirror the top camera for source orientation.
sp=affine(source,(1120,610),2401.5,4745,32.38/12,base=540)
ground=ImageOps.mirror(Image.open(P/'ground-floor.jpg').crop((0,0,1600,1060)))
gp=affine(ground,(1120,610),799,530+40*(1600/152),(1600/152)/12,base=540)
for x,im in [(left+45,sp),(right+45,gp)]:
 page.paste(im,(x,1535));d.line((x,2075,x+1120,2075),fill='#548079',width=2)
 # No source exists above the front half, so shade that strip explicitly.
 d.rectangle((x,1535,x+1120,1594),fill='#e4e7df');txt(page,(x+12,1550),'Rear half not supplied on this sheet',23)
# Source office numbers on the model. Positions use source-aligned +X right, +Z rear.
rooms=[(4,-22,6),(6,-35,6),(5,-33,19),(8,-20,16),(9,-23,23),(7,-17,23),(10,17,6),(11,24,6),(12,34,6),(8,23,16),(13,31,19),(14,37,19),(7,17,23)]
for number,x,z in rooms:
 px=right+45+560+x*12;py=1535+540-z*12
 d.rounded_rectangle((px-18,py-17,px+18,py+17),radius=6,fill='#f7f3e9',outline='#274940',width=2)
 d.text((px,py),str(number),font=font(21,True),fill='#274940',anchor='mm')
txt(page,(left,2180),'Calibration: 1,619 pixels / 50 m = 32.38 px/m.',25)
txt(page,(right,2180),'Both plan panels: 12 px/m. Model mirrored to match source.',23)
txt(page,(left,2225),'4 Post office  |  5 Exchange  |  6 Public waiting  |  7 Toilet  |  8 Ante-room  |  9 Vault',25)
txt(page,(left,2265),'10 Foreign visitors  |  11 Information  |  12 Ambulance  |  13 Doctor  |  14 Pharmacy',25)
d.line((60,2330,2540,2330),fill='#a5afa3',width=2)
lines=[
 'What follows the sources: four corner pavilions, recessed entrances, octagonal rotunda, circular stairs, colonnade and gilded dome.',
 'Grid adaptations: 26 m pavilions; 16 m entrance fields; eight 16 m rotunda runs; floor plates at levels 1, 3, 5, 7, 9, 19 and 23.',
 'Plan differences: diagonal office corners squared, room proportions snapped, rear symmetry inferred; rear and upper room partitions unknown.',
 'Dome difference: outer 40.6 m envelope follows the drawn silhouette / native octagon; Flinn nominal diameter is 120 ft = 36.576 m.',
 'Ornament is simplified. Upper interior sculpture, mural and elevators are not reproduced. Exact historical colours remain unverified.',
 'This is a native geometry assembly candidate. Current six-layer editor intake, WebGL and gameplay traversal require separate acceptance.'
]
for i,line in enumerate(lines):txt(page,(60,2370+65*i),line,25)
page.save(P/'source-comparison.jpg',quality=95,subsampling=0,optimize=True)
# Grid diagram preserves the actual elevation camera. All line positions are computed in metres.
audit=Image.new('RGB',(2200,2050),'#f7f3e9');ad=ImageDraw.Draw(audit)
txt(audit,(50,30),'Administration | shared levels and interior review',43,bold=True)
txt(audit,(50,95),'Native pitch 2.12 m = 2 m wall + 0.12 m slab. Empty levels preserve the tall rooms.',27)
audit.paste(render,(40,165))
for level,label in [(1,'first floor'),(3,'pavilion second'),(5,'pavilion third'),(7,'pavilion fourth'),(9,'roof / lower gallery'),(19,'upper terrace'),(23,'dome spring'),(36,'crown marker only')]:
 y=165+530-(level*2.12-38)*(1600/144)
 ad.line((340,y,1640,y),fill='#34766d',width=2)
 if level<=9:txt(audit,(1665,y-13),f'L{level}  {level*2.12:.2f} m | {label}',21,bold=True)
 else:
  txt(audit,(1665,y-15),f'L{level}  {level*2.12:.2f} m',25,bold=True)
  txt(audit,(1665,y+15),label,23)
# Empty intermediate level lines are kept faint, and only on the left margin.
for level in range(37):
 y=165+530-(level*2.12-38)*(1600/144)
 ad.line((250,y,320,y),fill='#b6c1b2',width=1)
cut=fit(Image.open(P/'structural-cutaway.jpg').crop((0,0,1600,1060)),(1300,665));audit.paste(cut,(40,1265))
stair=fit(Image.open(P/'stair-detail.jpg').crop((0,0,1600,1060)),(780,665));audit.paste(stair,(1380,1265))
txt(audit,(50,1965),'Green = actual floor slabs. Open rotunda above L1. Four circular stairs meet L1 / L3 / L5 / L7.',27)
txt(audit,(50,2008),'Source plan is only the front half. Structural interiors are built; unknown upper/rear rooms stay open. CPU review only.',23)
audit.save(P/'grid-review.jpg',quality=95,subsampling=0,optimize=True)
print('Created source-comparison.jpg and grid-review.jpg from preserved evidence and actual meshes.')
