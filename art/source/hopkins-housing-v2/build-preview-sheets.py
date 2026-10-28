from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import json,html
root=Path(__file__).resolve().parents[3];base=root/'docs/art/hopkins-housing-v2';out=base/'previews';out.mkdir(parents=True,exist_ok=True)
cat=json.loads((root/'assets/art/hopkins-housing-v2/houses.json').read_text());font=lambda n:ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',n);bold=lambda n:ImageFont.truetype('C:/Windows/Fonts/seguisb.ttf',n)
for p in (root/'artifacts/hopkins2-renders/images').glob('*.png'):Image.open(p).convert('RGB').save(out/(p.stem+'.jpg'),quality=93)
def place(sheet,image,box):
 x,y,w,h=box;im=ImageOps.contain(image,(w,h));sheet.paste(im,(x+(w-im.width)//2,y+(h-im.height)//2))
for kind,level,name in [('exterior',0,'collection'),('cutaway',0,'first-floors'),('cutaway',1,'second-floors')]:
 sheet=Image.new('RGB',(2100,2930),'#ece6d7');d=ImageDraw.Draw(sheet);d.text((36,25),'HOPKINS / NEIGHBORHOOD HOUSES',font=bold(39),fill='#39382d');d.text((38,86),'BOOK 4, 1891 / DESIGNS 21–35 / '+('15 EXTERIORS' if kind=='exterior' else 'PUBLISHED '+('PRINCIPAL / FIRST' if level==0 else 'SECOND')+' FLOORS'),font=font(23),fill='#68634f')
 for i,h in enumerate(cat['houses']):
  x=30+i%3*690;y=145+i//3*540;file=out/f"{h['id']}-{kind}-{level}.jpg"
  if file.exists():place(sheet,Image.open(file),(x,y,660,470))
  else:d.text((x+28,y+205),'No attic floor plan published',font=bold(25),fill='#6b6655')
  d.text((x+10,y+476),h['label'],font=bold(20),fill='#484737');d.text((x+10,y+506),'WALL 1 x 2 m / DOOR 1 x 1.65 m / FLOOR 2.12 m',font=font(16),fill='#77705c')
 d.text((38,2875),'Actual exported meshes, existing painted textures. Room consolidation, pitches, colors and unseen surfaces are art adaptations.',font=font(20),fill='#68634f');sheet.save(out/(name+'.jpg'),quality=93)
sheet=Image.new('RGB',(1800,1630),'#ece6d7');d=ImageDraw.Draw(sheet);d.text((32,25),'15 MORE HOUSES / THE SHARED KIT GROWS',font=bold(36),fill='#39382d');d.text((35,79),'29 published interior levels / 181 rooms / native dimensions and period sashes',font=font(22),fill='#68634f')
for i,n in enumerate([21,23,26,31,33,35]):
 h=next(h for h in cat['houses'] if h['designNumber']==n);x=22+i%2*890;y=125+i//2*480;place(sheet,Image.open(out/f"{h['id']}-exterior-0.jpg"),(x,y,865,420));d.text((x+14,y+427),h['label'],font=bold(21),fill='#484737')
d.text((36,1584),'Source-specific exteriors and furnished interiors / horizontal siding on vertical walls / actual mesh renders',font=font(20),fill='#68634f');sheet.save(out/'selected.jpg',quality=94)
sheet=Image.new('RGB',(1800,1790),'#ece6d7');d=ImageDraw.Draw(sheet);d.text((32,24),'FROM THE PUBLISHED PLATE TO THE SHARED LIBRARY',font=bold(33),fill='#39382d')
for i,n in enumerate([21,26,33]):
 h=next(h for h in cat['houses'] if h['designNumber']==n);y=100+i*545;place(sheet,Image.open(root/f"art/source/hopkins-housing-v2/plates/n{h['source']['leaf']}.jpg"),(20,y,650,480));place(sheet,Image.open(out/f"{h['id']}-exterior-0.jpg"),(680,y,1100,480));d.text((35,y+485),f"NO. {n} / ORIGINAL EXTERIOR AND FLOOR DIAGRAMS",font=bold(19),fill='#484737');d.text((700,y+485),'NATIVE MODULE COMPOSITION / pitches and colors interpreted',font=font(20),fill='#68634f')
d.text((35,1740),'Contemporary designs, not surveyed Chicago addresses. No. 26 has only its published principal floor; optional attic rooms stay unspecified.',font=font(18),fill='#68634f');sheet.save(out/'source-to-prefab.jpg',quality=93)
sections=[]
for h in cat['houses']:
 images=[('exterior',0)]+[('cutaway',i) for i in range(len(h['floors']))];figures=[]
 for view,level in images:
  label='Exterior' if view=='exterior' else h['floors'][level]['label'];file=f"previews/{h['id']}-{view}-{level}.jpg";figures.append(f'<figure><img src="{file}" alt="{html.escape(h["label"]+" / "+label)}"><figcaption>{html.escape(label)}</figcaption></figure>')
 sections.append(f'<section><h2>{html.escape(h["label"])}</h2><p><a href="{html.escape(h["source"]["url"],quote=True)}">Original exterior + floor plans</a> · <a href="../../../assets/art/hopkins-housing-v2/prefabs/{h["id"]}.json">Prefab JSON</a></p><div class="views">'+''.join(figures)+'</div></section>')
page='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hopkins neighborhood houses / 15 exteriors + 29 interiors</title><style>body{margin:0;padding:24px;background:#ece6d7;color:#39382d;font:16px system-ui}h1{font-size:30px}h2{font-size:23px}section{margin:30px 0;padding-top:8px;border-top:1px solid #c9c1aa}.views{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:16px}figure{margin:0;background:#f8f4e9;padding:10px}img{width:100%;height:auto;display:block}figcaption{line-height:1.5}a{color:#465d48}</style><h1>Hopkins / fifteen more houses</h1><p>Designs 21–35, Book 4 (1891). Fifteen exteriors and twenty-nine published interior levels. Native walls 1 x 2 m; doors 1 x 1.65 m; floor pitch 2.12 m.</p><p>No. 26 publishes a principal floor only. No. 34 is a southern-style cottage on piers. Source dimensions and art adaptations are recorded separately. <a href="../../../workbenches/art/hopkins-neighborhood.html">House workbench</a></p>'+''.join(sections)+'</html>'
(base/'gallery.html').write_text(page,encoding='utf-8',newline='\n');report=json.loads((root/'artifacts/hopkins2-renders/offline-review.json').read_text());report.update(imageCount=len(report['images']),exteriors=15,publishedInteriorLevels=29,passed=False,visualReview='Pending inspection of all contact sheets and selected full renders.');(base/'offline-review.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');(base/'.gitattributes').write_text('*.json text eol=lf\n*.md text eol=lf\n*.jpg binary\n',encoding='utf-8',newline='\n');print('Saved 44 previews, full exterior/interior sheets, source comparisons and the complete gallery.')
