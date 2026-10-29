"""Source-plan / native-plan and floor-height evidence; no historical pixels in runtime."""
from pathlib import Path
import json,hashlib
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[3];out=ROOT/'docs/art/exposition-horticulture/previews';meta=json.loads((ROOT/'assets/art/exposition-horticulture/metadata.json').read_text(encoding='utf-8'));plan=meta['plan']
font=lambda n,b=False:ImageFont.truetype('C:/Windows/Fonts/arial'+('bd'if b else'')+'.ttf',n)
canvas=Image.new('RGB',(2400,1900),'#f0eadb');d=ImageDraw.Draw(canvas)
d.text((65,30),'Horticultural Building | source diagram and native assembly',font=font(44,True),fill='#243a32')
d.text((65,96),'Conkey 1893: one-based scan31. Exhibit-installation diagram; frontage calibrated from the written 1000 ft length.',font=font(27),fill='#243a32')
im=Image.open(ROOT/'art/source/exposition-horticulture/evidence/conkey-plan-oriented.jpg').crop((50,590,4160,1880));im.thumbnail((2260,710));canvas.paste(im,((2400-im.width)//2,145))
d.text((65,870),'Native plan: 306 m frontage; 76 m end body; 88 m central projection; two 84 x28 m courts.',font=font(31,True),fill='#243a32')
d.text((65,918),'Dark lines: actual Nautilus runs. Cream: first-floor slab. Green: court planting. Grey: approach/waterfront deck.',font=font(25),fill='#465b50')
scale=7.05;cx=1200;by=1665
pt=lambda p:(cx+p[0]*scale,by-p[1]*scale)
poly=lambda points,fill,outline=None:d.polygon([pt(p)for p in points],fill=fill,outline=outline,width=2)
poly([[-153,-18],[153,-18],[153,0],[-153,0]],'#c8b99b')
for p in [[[-153,0],[-117,0],[-117,12],[-153,12]],[[-117,0],[-33,0],[-33,24],[-117,24]],[[33,0],[117,0],[117,24],[33,24]],[[117,0],[153,0],[153,12],[117,12]]]:poly(p,'#c8b99b')
poly(plan['body'],'#e8d8b3')
for p in plan['courts']:poly(p,'#b6c6a8')
for x in range(-152,154,2):d.line((pt([x,0]),pt([x,88])),fill='#d6cba8',width=1)
for z in range(0,90,2):d.line((pt([-153,z]),pt([153,z])),fill='#d6cba8',width=1)
for run in plan['runs']:d.line((pt(run['a']),pt(run['b'])),fill='#24493e',width=3)
for floor in plan['floors']:
 if floor['id']not in ['rotunda-gallery','pavilion-galleries']:continue
 for p in floor['holes']:d.line([pt(v)for v in p+[p[0]]],fill='#9d513a',width=3)
for stair in plan['stairs']:
 x,z=stair['x'],stair['z'];poly([[x-1,z],[x+1,z],[x+1,z+8],[x-1,z+8]],'#a66f43')
for x in [-76,76]:d.text(pt([x-14,60]),'OPEN COURT',font=font(20,True),fill='#24493e')
d.text((65,1820),'2 m review grid. Diagram anisotropy/edge interpretation about 3-5%; written 250 ft extreme width conflicts with its central projection.',font=font(25),fill='#465b50')
canvas.save(out/'source-plan-comparison.jpg',quality=96,subsampling=0,optimize=True)
canvas=Image.new('RGB',(2000,1100),'#f0eadb');d=ImageDraw.Draw(canvas);d.text((60,30),'Horticultural Building | native height and floor audit',font=font(44,True),fill='#243a32')
X=750;Y=950;s=22
pt2=lambda x,y:(X+x*12,Y-y*s)
# Section is schematic: actual authored radii, spring and rise; source is not an elevation.
d.polygon([pt2(-30.65,2.12),pt2(30.65,2.12),pt2(30.65,10.6),pt2(-30.65,10.6)],fill='#ddcfb0')
d.rectangle((pt2(-28.2,10.6),pt2(28.2,2.12)),fill='#f0eadb')
pts=[]
import math
for j in range(161):
 a=math.pi*j/160;pts.append(pt2(28*math.cos(a),10.6+19.08*math.sin(a)))
d.line(pts,fill='#527f7b',width=6)
for sign in [-1,1]:d.line((pt2(sign*4,29.484),pt2(sign*4,32.86)),fill='#527f7b',width=4)
d.line((pt2(-4,32.86),pt2(0,33.92),pt2(4,32.86)),fill='#527f7b',width=5)
for level in range(17):
 y=2.12*level;px,py=pt2(-37,y);d.line((px,py,1450,py),fill='#d1c7b4',width=1);d.text((1480,py-13),f'L{level} / {y:.2f} m',font=font(21,level in[1,3,5,16]),fill='#24493e')
for lo,hi,level in [(-30.65,30.65,1),(-30.65,-23.55,3),(23.55,30.65,3),(-30.65,-28.2,5),(28.2,30.65,5)]:
 a=pt2(lo,2.12*level);b=pt2(hi,2.12*level);d.rectangle((a[0],a[1],b[0],a[1]+max(2,.12*s)),fill='#a75b3b')
d.text((70,170),'Crown:33.92 m',font=font(28,True),fill='#24493e');d.text((70,214),'L16 height marker',font=font(25),fill='#24493e');d.text((70,253),'Not16 occupied storeys',font=font(25),fill='#24493e')
d.text((70,390),'Glass dome:56 m diameter',font=font(25),fill='#24493e');d.text((70,430),'Custom ellipsoid and lantern',font=font(25),fill='#24493e')
d.text((70,665),'L5 /10.60 m spring deck',font=font(25),fill='#24493e');d.text((70,800),'L3 /6.36 m gallery',font=font(25),fill='#24493e');d.text((70,913),'L1 /2.12 m first floor',font=font(25),fill='#24493e')
d.text((60,1010),'Schematic section from factory dimensions. .12 m slabs, 2.12 m pitch; no full slab seals the centre above the first floor.',font=font(26),fill='#465b50')
canvas.save(out/'native-floor-audit.jpg',quality=96,subsampling=0,optimize=True)
for name,criteria in [('source-plan-comparison',['Compared three pavilions, two courts, central projection and even-metre wall traces.','Text width / diagram-envelope discrepancy remains explicit; no survey precision claimed.']),('native-floor-audit',['Floor levels and dome crown match metadata; central high space stays empty.'])]:
 p=out/(name+'.jpg');b=p.read_bytes();record=dict(name=name,path=p.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(b).hexdigest(),width=Image.open(p).width,height=Image.open(p).height,kind='Derived source/geometry audit graphic',visualReview='pending',criteria=criteria)
 (out/(name+'.json')).write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Prepared source-plan comparison and native floor audit.')
