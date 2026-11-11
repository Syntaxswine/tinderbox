"""Generate the plan proof from the public-domain original crop and actual export metadata."""
from pathlib import Path
import sys,json,hashlib,shutil,math
sys.path.insert(0,str(Path('artifacts/stockyard-build-deps').resolve()))
from PIL import Image,ImageDraw,ImageFont
ROOT=Path('.');src=ROOT/'art/source/hull-house-block';ref=src/'reference';out=ROOT/'docs/art/hull-house-block/previews';cache=ROOT/'artifacts/research/hull-house-block'
ref.mkdir(exist_ok=True);out.mkdir(exist_ok=True)
for a,b in [('selected-block-nat1.png','nationalities-selected.png'),('selected-block-wage1.png','wage-selected.png'),('sanborn-1906-sheet100-small.jpg','sanborn-1906-sheet100.jpg')]:
 if not (ref/b).exists():shutil.copyfile(cache/a,ref/b)
trace=json.loads((src/'trace.json').read_text(encoding='utf-8-sig'))
data=json.loads((ROOT/'assets/art/hull-house-block/block.json').read_text())['metadata']
W,D=258,74
im=Image.new('RGB',(1920,1750),'#e1d6ba');draw=ImageDraw.Draw(im)
font='assets/art/ui/typography/besley/Besley[wght].ttf'
F=lambda n:ImageFont.truetype(font,n)
draw.text((42,22),'Hull-House neighborhood | original plan and native-grid study',font=F(36),fill='#263e38')
draw.text((44,78),'One block east of Hull House. Chicago c.1893. Physical outlines are independent of the survey household colors.',font=F(23),fill='#4b5546')
orig=Image.open(ref/'nationalities-selected.png').convert('RGB');orig.thumbnail((1832,675));im.paste(orig,(44,122))
draw.text((44,812),'A  Original Nationalities Map No. 1 (1895), based on 1893 fieldwork. Source crop retained unchanged.',font=F(25),fill='#263e38')
draw.text((44,854),'B  Exported building footprints over the unsnapped outline trace. All native wall runs use whole metres.',font=F(25),fill='#263e38')
x0,y0,pw=85,950,1750;scale=pw/W;ph=D*scale
P=lambda x,z:(x0+x*scale,y0+z*scale)
draw.rectangle((x0,y0,x0+pw,y0+ph),fill='#f2ead4',outline='#46594b',width=3)
for x in range(0,W+1,5):draw.line((P(x,0),P(x,D)),fill='#e0d9c5',width=1)
for z in range(0,D+1,5):draw.line((P(0,z),P(W,z)),fill='#e0d9c5',width=1)
for parcel in trace['parcels']:
 a,b,c,d=parcel['sourceRect'];poly=[P((x-40)*W/1495,(z-70)*D/454) for x,z in [(a,b),(c,b),(c,d),(a,d)]]
 draw.line(poly+[poly[0]],fill='#b5af98',width=2)
sourceById={d['id']:d for d in trace['buildings']}
for b in data['buildings']:
 s=sourceById[b['id']];uncertain=s['footprintEvidence']!='printed-outline'
 pts=[P(p[0],p[2]) for p in b['polygon']]
 draw.polygon(pts,fill='#bc8563' if uncertain else '#718e7b',outline='#2e4d44',width=2)
 # Raw trace is an independent thin grey outline; snap shift is visible against the filled art polygon.
 raw=[P((x-40)*W/1495,(z-70)*D/454) for x,z in s['sourcePolygon']]
 draw.line(raw+[raw[0]],fill='#292f2c',width=1)
 xs=[p[0] for p in pts];ys=[p[1] for p in pts];label=b['id'].replace('halsted-','H').replace('polk-','P').replace('ewing-','E').replace('desplaines-','D').replace('-front','').replace('-rear','r').replace('-workshop','w').replace('-north','n').replace('-middle','m').replace('-south','s').replace('-return','R').replace('-service','S').replace('-annex','a').replace('-small','s')
 if max(xs)-min(xs)>65 and max(ys)-min(ys)>25:draw.text(((min(xs)+max(xs))/2,(min(ys)+max(ys))/2),label,anchor='mm',font=F(13),fill='#f7efd9')
for f in data['fittings']:
 if f['kind']=='property-fence':draw.line([P(p[0],p[2]) for p in f['footprint'][:3]],fill='#a68d62',width=2)
 if f['kind']=='timber-porch-and-stair':draw.polygon([P(p[0],p[2]) for p in f['footprint']],fill='#c6ae75',outline='#75663e',width=2)
for p in data['passages']:
 pts=[P(v[0],v[2]) for v in p['polygon']];draw.line(pts+[pts[0]],fill='#277d91',width=4)
draw.text((x0+pw/2,917),'W. POLK STREET',anchor='mm',font=F(23),fill='#263e38')
draw.text((x0+pw/2,y0+ph+21),'EWING STREET',anchor='mm',font=F(23),fill='#263e38')
for text,side in [('S. HALSTED',-1),('S. DESPLAINES',1)]:
 tile=Image.new('RGBA',(400,40),(0,0,0,0));ImageDraw.Draw(tile).text((200,20),text,anchor='mm',font=F(20),fill='#263e38')
 tile=tile.rotate(90 if side<0 else -90,expand=True)
 im.paste(tile,(25 if side<0 else 1855,int(y0+ph/2-200)),tile)
# Feet-to-metres calibration is shown as a game-grid bar, not mislabelled as an original 1895 ruler.
for i in range(5):
 draw.rectangle((x0+i*10*scale,1491,x0+(i+1)*10*scale,1504),fill='#304b41' if i%2==0 else '#f2ead4',outline='#304b41')
draw.text((x0,1511),'0',font=F(16),fill='#304b41');draw.text((x0+50*scale,1511),'50 m game grid',anchor='ra',font=F(16),fill='#304b41')
draw.rectangle((520,1492,548,1514),fill='#718e7b');draw.text((558,1486),'Interpreted printed outline',font=F(20),fill='#304b41')
draw.rectangle((1004,1492,1032,1514),fill='#bc8563');draw.text((1042,1486),'Footprint/use source gap',font=F(20),fill='#304b41')
draw.line((1490,1504,1520,1504),fill='#277d91',width=4);draw.text((1530,1486),'Individual court',font=F(20),fill='#304b41')
draw.text((44,1562),'258 x 74 m: checked against the later 1906 Sanborn 100W feet ruler. Overall scale ~+/-2 x +/-1 m; local 1895 plots vary up to ~15%.',font=F(21),fill='#4b5546')
draw.text((44,1599),'Maximum grid vertex shift: 0.695 m. 56 masses / 4,684 m2 building ground. Roofs, levels, openings, skins and fence construction are inferred.',font=F(21),fill='#4b5546')
draw.text((44,1636),'1891 and c.1900 UIC photographs are comparisons, not photos of these properties. Later industrial construction is not silently backdated.',font=F(21),fill='#4b5546')
draw.text((44,1680),'Narrow-court exception: printed 8 ft = 2.44 m; traced grid uses 3 m nominal / 2.84 m clear (~23% wider). This is an explicit local adaptation.',font=F(21),fill='#4b5546')
im.save(out/'plan-comparison.jpg',quality=96,subsampling=0)
inputs=[src/'trace.json',ROOT/'assets/art/hull-house-block/block.json',ref/'nationalities-selected.png',ref/'wage-selected.png',ref/'sanborn-1906-sheet100.jpg']
rec=lambda p:dict(path=p.as_posix(),bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())
(src/'plan-proof.json').write_bytes((json.dumps(dict(generator='art/source/hull-house-block/make-plan-proof.py',inputs=[rec(p) for p in inputs],output=rec(out/'plan-comparison.jpg'),dimensions=[1920,1750],notes='Diagram from original public-domain plan crop and actual exported factory metadata. No UIC photo pixels included.'),indent=2)+'\n').encode())
print('Saved plan comparison',im.size)
