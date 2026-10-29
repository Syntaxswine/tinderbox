"""Reproduce JP2 evidence derivatives and source-only annotation, not model artwork.
Requires Pillow, Windows Arial, and the two committed original JP2 pages.
Does not download or modify raw scans. All coordinates remain original crop pixels.
"""
from pathlib import Path
import json,hashlib
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[3];out=Path(__file__).resolve().parent;raw=ROOT/'artifacts/exposition-new-york'
data=json.loads((out/'measurements.json').read_text(encoding='utf-8'));provenance=json.loads((out/'sources.json').read_text(encoding='utf-8'))
for scan,filename,rotation in [(99,'plate-44.jpg',0),(97,'plate-43-built.jpg',270)]:
 file=out/'raw'/('plate-'+str(43 if scan==97 else 44)+'.jp2');expected=next(p for p in provenance['jp2']['pages'] if p['scan']==scan)
 assert hashlib.sha256(file.read_bytes()).hexdigest()==expected['sha256']
 image=Image.open(file).convert('RGB')
 if rotation:image=image.rotate(rotation,expand=True)
 image.save(out/filename,quality=96,subsampling=0)
page=Image.open(out/'raw/plate-44.jp2').convert('RGB');crops={}
for kind in ['plan','elevation']:
 crops[kind]=page.crop(data[kind]['crop']);crops[kind].save(out/('source-'+kind+'.jpg'),quality=97,subsampling=0)
crops['plan'].crop((1210,320,1515,685)).resize((915,1095),Image.Resampling.LANCZOS).save(out/'porch-column-source.jpg',quality=97,subsampling=0)
font=lambda n:ImageFont.truetype('C:/Windows/Fonts/arial.ttf',n)
sheet=Image.new('RGB',(2300,3200),'#f3edde');d=ImageDraw.Draw(sheet)
d.text((65,35),'NEW YORK STATE BUILDING | source calibration',font=font(44),fill='#253b34');d.text((65,97),'McKim, Mead & White - plates 44 and 43 - Getty / Internet Archive',font=font(27),fill='#48544a')
for kind,x0,y0,targetW in [('plan',95,160,2110),('elevation',95,1770,2110)]:
 info=data[kind];image=crops[kind];scale=targetW/image.width;image=image.resize((targetW,round(image.height*scale)),Image.Resampling.LANCZOS);sheet.paste(image,(x0,y0));p0,p1=info['ruler']['points']
 d.line((x0+p0[0]*scale,y0+p0[1]*scale,x0+p1[0]*scale,y0+p1[1]*scale),fill='#ad3c27',width=5)
 for x,y in [p0,p1]:d.ellipse((x0+x*scale-6,y0+y*scale-6,x0+x*scale+6,y0+y*scale+6),fill='#ad3c27')
 if kind=='plan':
  line=[(x0+x*scale,y0+y*scale) for x,y in info['outlinePixels']];d.line(line+[line[0]],fill='#267b6a',width=4)
  d.text((115,1650),'PLAN: 20-40 ft = 124 px; 10-30 ft = 124 px. Printed facade: 154 ft = 46.9392 m.',font=font(27),fill='#253b34')
 else:
  for label,y in [('ground',714),('main parapet',326),('tower cap',39)]:d.line((x0+250*scale,y0+y*scale,x0+1260*scale,y0+y*scale),fill='#267b6a',width=3)
  d.text((115,2890),'ELEVATION: 20-40 ft = 123 px; 10-30 ft = 123 px. Calibrated independently.',font=font(27),fill='#253b34')
d.text((90,3000),'Green: measured body / levels. Red: calibration endpoints. Coordinates refer to original JP2 crops.',font=font(26),fill='#253b34')
d.text((90,3055),'Ruler-derived allowance: +/-2 pixels per feature endpoint + 2% of span. Small ambiguous numerals unresolved.',font=font(25),fill='#253b34')
d.text((90,3110),'Published after the fair; not a complete construction or as-built set. See measurements.json for each adaptation.',font=font(25),fill='#253b34')
sheet.save(out/'annotated-calibration.jpg',quality=96,subsampling=0)
provenance['files']=[]
for p in sorted([*out.glob('*.jpg'),*out.glob('raw/*.jp2')]):provenance['files'].append(dict(path=p.relative_to(ROOT).as_posix(),bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
(out/'sources.json').write_text(json.dumps(provenance,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Prepared',len(provenance['files']),'source files with exact hashes.')
