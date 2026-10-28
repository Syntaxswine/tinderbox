from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import json, shutil
root=Path('.');base=root/'docs/art/hopkins-housing-v1';out=base/'previews';out.mkdir(parents=True,exist_ok=True)
cat=json.loads((root/'assets/art/hopkins-housing-v1/houses.json').read_text(encoding='utf-8'))
font=lambda n:ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',n)
strong=lambda n:ImageFont.truetype('C:/Windows/Fonts/seguisb.ttf',n)
for p in (root/'artifacts/hopkins-renders/images').glob('*.png'):Image.open(p).convert('RGB').save(out/(p.stem+'.jpg'),quality=94)
report=json.loads((root/'artifacts/hopkins-renders/offline-review.json').read_text(encoding='utf-8'));report['imageCount']=len(report['images']);report['passed']=report['imageCount']==36;report['visualReview']='Pending inspection of exterior and both interior-level contact sheets.'
(base/'offline-review.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
for kind,level,name in [('exterior',0,'collection'),('cutaway',0,'all-first-floors'),('cutaway',1,'all-second-floors')]:
 sheet=Image.new('RGB',(1840,2190),'#ece6d7');d=ImageDraw.Draw(sheet)
 d.text((35,24),'HOPKINS / SMALL HOUSES',font=strong(36),fill='#39382d');d.text((36,77),'BOOK 4, 1891  /  '+('TWELVE EXTERIORS' if kind=='exterior' else ('FIRST' if level==0 else 'SECOND')+' FLOOR CUTAWAYS'),font=font(19),fill='#71705e')
 for i,h in enumerate(cat['houses']):
  im=Image.open(out/f"{h['id']}-{kind}-{level}.jpg");im=ImageOps.contain(im,(580,435));x=30+(i%3)*600;y=124+(i//3)*500;sheet.paste(im,(x,y));d.text((x+9,y+441),h['label'],font=strong(18),fill='#484737');d.text((x+9,y+468),'NATIVE WALL 1 x 2 m  /  DOOR 1 x 1.65 m',font=font(13),fill='#7d7968')
 d.text((36,2145),'Catalogue-derived modular compositions. Colors, furnishings and rear surfaces interpreted. Offline renders of the actual meshes.',font=font(17),fill='#74705e');sheet.save(out/(name+'.jpg'),quality=93)
# A compact comparison keeps the paired catalogue reference visible beside each asset.
sheet=Image.new('RGB',(1800,1620),'#ece6d7');d=ImageDraw.Draw(sheet);d.text((32,22),'FROM PLAN BOOK TO SHARED ASSET',font=strong(34),fill='#3a392d')
for i,n in enumerate([13,15,17]):
 h=next(h for h in cat['houses'] if h['designNumber']==n);y=105+i*485
 source=Image.open(root/'art/source/hopkins-housing-v1/plates'/f"n{h['source']['leaf']}.jpg");source=source.crop((0,0,source.width//2+20,source.height));source=ImageOps.contain(source,(550,425));sheet.paste(source,(30+(550-source.width)//2,y))
 for j,kind in enumerate(['exterior','cutaway']):
  im=ImageOps.contain(Image.open(out/f"{h['id']}-{kind}-0.jpg"),(590,425));sheet.paste(im,(600+j*595,y+(425-im.height)//2))
 d.text((38,y+432),'NO. '+str(n)+' / ORIGINAL EXTERIOR + PLANS',font=strong(16),fill='#68634f');d.text((615,y+432),'NATIVE MODULE COMPOSITION',font=strong(16),fill='#68634f');d.text((1210,y+432),'FIRST FLOOR INTERIOR',font=strong(16),fill='#68634f')
d.text((35,1580),'Historic one-and-half-storey heights are adapted to two full native courses; original wall and door geometry stays unchanged.',font=font(18),fill='#6b6655');sheet.save(out/'source-to-prefab.jpg',quality=94)
print('Saved 36 model previews, three complete contact sheets and source comparisons.')
