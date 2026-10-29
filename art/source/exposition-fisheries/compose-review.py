"""Source comparison and native section audit; diagrams, not new source evidence."""
from pathlib import Path
import json,math,hashlib
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[3];out=ROOT/'docs/art/exposition-fisheries/previews';meta=json.loads((ROOT/'assets/art/exposition-fisheries/metadata.json').read_text());plan=meta['plan']
font=lambda n,b=False:ImageFont.truetype('C:/Windows/Fonts/arial'+('bd'if b else'')+'.ttf',n)
C='#243a32';paper='#f0eadb'
canvas=Image.new('RGB',(2400,2150),paper);d=ImageDraw.Draw(canvas)
d.text((55,30),'Fisheries Building | source diagrams and native plan',font=font(44,True),fill=C)
d.text((55,96),'Conkey 1893, scans 35 /36. Installation diagrams; ground rear entrance partly clipped. Gallery sheet supplies the rear outline.',font=font(25),fill=C)
for x,name,label in [(50,'conkey-ground-oriented','GROUND FLOOR / SCAN 35'),(1240,'conkey-gallery-oriented','GALLERY / SCAN 36')]:
 im=Image.open(ROOT/'art/source/exposition-fisheries/evidence'/f'{name}.jpg');im.thumbnail((1110,780));canvas.paste(im,(x,150));d.text((x,955),label,font=font(29,True),fill=C)
d.text((55,1030),'Native assembly: 112 x50 m main hall; 16 x8 m polygon edges in each wing; four 8 m chords per arcade.',font=font(29,True),fill=C)
d.text((55,1080),'Green: Nautilus wall traces (apertures omitted). Cream: L1 deck. Red: L3 gallery void / stairs. Connector siting is an artistic adaptation.',font=font(24),fill=C)
scale=8.7;cx=1200;top=1235
pt=lambda p:(cx+p[0]*scale,1905-p[1]*scale)
for floor in plan['floors']:
 if floor['level']!=1:continue
 for p in floor['polygons']:d.polygon([pt(v)for v in p],fill='#e2cfaa',outline='#b7a78c',width=1)
for x in range(-124,126,2):d.line((pt([x,-4]),pt([x,78])),fill='#d8cbb2',width=1)
for z in range(-4,80,2):d.line((pt([-125,z]),pt([125,z])),fill='#d8cbb2',width=1)
for r in plan['runs']:
 if r['startLevel']>0:continue
 d.line((pt(r['a']),pt(r['b'])),fill='#275c47',width=3)
for floor in plan['floors']:
 if floor['id']!='main-gallery':continue
 for p in floor['holes']:d.line([pt(v)for v in p+[p[0]]],fill='#a85137',width=4)
for stair in plan['stairs']:
 x,z=stair['x'],stair['z'];a=stair['heading'];p=lambda xx,zz:pt([x+math.cos(a)*xx+math.sin(a)*zz,z-math.sin(a)*xx+math.cos(a)*zz])
 d.polygon([p(-stair['width']/2,0),p(stair['width']/2,0),p(stair['width']/2,stair['run']),p(-stair['width']/2,stair['run'])],fill='#b47a4f')
for p in plan['portals']:
 x,y=pt([p['position'][0],p['position'][2]]);d.ellipse((x-6,y-6,x+6,y+6),fill='#a85137')
d.text(pt([-119,25]),'ANGLING',font=font(22,True),fill=C);d.text(pt([91,25]),'AQUARIUM',font=font(22,True),fill=C)
d.text((55,1995),'Local +X toward aquarium; +Z toward rear. Ground anchor at middle of front entrance. Source compass is oblique.',font=font(26),fill=C)
d.text((55,2040),'2 m grid. Conkey 1100 ft overall is unresolved; this compound does not claim that footprint or a surveyed fair-site position.',font=font(26),fill=C)
canvas.save(out/'source-plan-comparison.jpg',quality=95,subsampling=0,optimize=True)
canvas=Image.new('RGB',(2000,1250),paper);d=ImageDraw.Draw(canvas);d.text((55,30),'Fisheries Building | native levels and roof-height audit',font=font(43,True),fill=C)
X,Y,sx,sy=890,1090,9.7,21.1
p=lambda x,y:(X+x*sx,Y-y*sy)
for level in range(21):
 y=level*2.12;py=p(0,y)[1];d.line((260,py,1535,py),fill='#d5c9b4',width=1);d.text((1570,py-12),f'L{level} / {y:.2f} m',font=font(20,level in[1,3,8,12,18,20]),fill=C)
d.line([p(-56,0),p(-56,10.6),p(-48,14.84),p(-48,19.08),p(-33,23.32),p(-20.5,23.32)],fill='#8d684f',width=4)
d.line([p(20.5,23.32),p(33,23.32),p(48,19.08),p(48,14.84),p(56,10.6),p(56,0)],fill='#8d684f',width=4)
for sign in [-1,1]:d.line([p(sign*20.5,10.6),p(sign*20.5,25.44),p(sign*2.05,38.16),p(sign*2.05,40.28),p(0,42.4)],fill='#b46d48',width=6)
for a,b,level in [(-56,56,1),(-48,-40,3),(40,48,3),(-22.04,-18.96,8),(18.96,22.04,8)]:
 aa=p(a,2.12*level);bb=p(b,2.12*level);d.rectangle((aa[0],aa[1],bb[0],aa[1]+max(3,.12*sy)),fill='#a85137')
d.text((60,125),'Crown 42.40 m',font=font(29,True),fill=C);d.text((60,172),'L20 height marker',font=font(25),fill=C);d.text((60,214),'Two occupied floors',font=font(25,True),fill=C);d.text((60,252),'L1 and L3',font=font(25),fill=C)
d.text((60,380),'Custom tile roofs',font=font(25,True),fill=C);d.text((60,423),'Pitches are art choices',font=font(23),fill=C)
d.text((60,680),'L8 external ring',font=font(25,True),fill=C);d.text((60,720),'Decorative; no upper route',font=font(23),fill=C)
d.text((60,918),'L3 gallery /6.36 m',font=font(25,True),fill=C);d.text((60,1030),'L1 first floor /2.12 m',font=font(25,True),fill=C)
d.text((55,1150),'Schematic section from authored dimensions; 2.12 m floor pitch and .12 m slabs. Empty levels preserve tall rooms.',font=font(25),fill=C)
d.text((55,1192),'Tile relief adds less than .07 m above the crown marker. No height or roof pitch is measured from the perspective photograph.',font=font(24),fill=C)
canvas.save(out/'native-floor-audit.jpg',quality=95,subsampling=0,optimize=True)
for name,criteria in [('source-plan-comparison',['Main hall and projecting entrances agree with inspected diagrams at the documented grid adaptation.','Polygonal annexes and curved chord arcades are distinct from the measured main body.','Main gallery void and all eight stair locations are shown; decorative high balcony omitted from ground trace.']),('native-floor-audit',['Occupied levels L1 and L3, decorative ring L8 and crown L20 are distinguished.','Diagram is an authored section, not a source elevation or20 occupied storeys.'])]:
 f=out/(name+'.jpg');write=dict(name=name,path=f.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(f.read_bytes()).hexdigest(),width=Image.open(f).width,height=Image.open(f).height,kind='Derived source/geometry audit graphic',visualReview='pending',criteria=criteria);(out/(name+'.json')).write_text(json.dumps(write,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Prepared source comparison and native-level section audit.')
