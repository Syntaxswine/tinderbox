from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import json, html
root=Path(__file__).resolve().parents[3];review=root/'docs/art/housing-siding-review';previews=review/'previews';previews.mkdir(parents=True,exist_ok=True)
font=lambda n:ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',n)
strong=lambda n:ImageFont.truetype('C:/Windows/Fonts/seguisb.ttf',n)
hopkins=json.loads((root/'assets/art/hopkins-housing-v1/houses.json').read_text(encoding='utf-8'))['houses']
gross=json.loads((root/'assets/art/gross-housing-v1/houses.json').read_text(encoding='utf-8'))['houses']
out=root/'docs/art/gross-housing-v1/previews'
for h in gross:
 im=Image.open(root/f"artifacts/gross-renders/images/{h['id']}-exterior-0.png").convert('RGB');im.save(out/f"{h['id']}-exterior-0.jpg",quality=94)
 if h['id'] in ['ashland-worker','grossdale-octagon','monroe-row']:im.save(out/f"{h['id']}-exterior.png")
def place(sheet,im,box):
 x,y,w,h=box;im=ImageOps.contain(im,(w,h));sheet.paste(im,(x+(w-im.width)//2,y+(h-im.height)//2))
def thumb(h,collection):return Image.open(root/f"docs/art/{collection}-housing-v1/previews/{h['id']}-exterior-0.jpg")
sheet=Image.new('RGB',(1800,1660),'#ece6d7');draw=ImageDraw.Draw(sheet);draw.text((35,24),'GROSS / SIDING AND ROOF REVIEW',font=strong(35),fill='#39382d');draw.text((37,77),'13 houses / actual mesh renders / vertical enclosures match their wall finish',font=font(18),fill='#6b6655')
for i,h in enumerate(gross):
 x=20+(i%4)*445;y=110+(i//4)*375;place(sheet,thumb(h,'gross'),(x,y,430,315));draw.text((x+8,y+320),h['id'].replace('-',' ').title(),font=strong(19),fill='#484737')
sheet.save(out/'all-exteriors.jpg',quality=94)
sheet=Image.new('RGB',(1600,1090),'#ece6d7');draw=ImageDraw.Draw(sheet);draw.text((30,22),'TINDERBOX / GROSS CATALOGUE HOUSING',font=strong(33),fill='#39382d');draw.text((32,71),'Corrected facade finishes / 13 exteriors + 29 unchanged interior levels',font=font(18),fill='#6b6655')
selected=[('ashland-worker','Ashland workers cottage'),('grossdale-octagon','Grossdale octagonal bay'),('monroe-row','Monroe Street row house')]
for i,(id,label) in enumerate(selected):
 x=20+(i%2)*790;y=110+(i//2)*480;h=next(h for h in gross if h['id']==id);place(sheet,thumb(h,'gross'),(x,y,770,440));draw.text((x+12,y+441),label,font=strong(23),fill='#484737')
place(sheet,Image.open(out/'grossdale-spire-cutaway-0.png'),(810,590,770,440));draw.text((822,1031),'Grossdale / unchanged first-floor interior',font=strong(23),fill='#484737');sheet.save(out/'collection.jpg',quality=95)
sheet=Image.new('RGB',(1600,1120),'#ece6d7');draw=ImageDraw.Draw(sheet);draw.text((30,20),'ASHLAND / SOURCE AND ADAPTED PREFAB',font=strong(34),fill='#39382d');place(sheet,Image.open(root/'art/source/gross-housing-v1/plates/n66.jpg'),(25,90,720,1000));h=next(h for h in gross if h['id']=='ashland-worker');place(sheet,thumb(h,'gross'),(770,105,800,455));place(sheet,Image.open(root/'artifacts/art-review/gross-housing-v1/ashland-worker-cutaway-0.png'),(770,610,800,455));draw.text((790,565),'Corrected facade / offline mesh render',font=strong(22),fill='#484737');draw.text((790,1070),'Unchanged interior / prior browser render',font=font(18),fill='#6b6655');sheet.save(out/'source-to-prefab.jpg',quality=94)
sheet=Image.new('RGB',(1800,2020),'#ece6d7');draw=ImageDraw.Draw(sheet);draw.text((35,24),'WALLS KEEP THEIR SIDING. ROOFS KEEP THEIR SHINGLES.',font=strong(31),fill='#39382d');draw.text((38,78),'25 houses inspected / 23 corrected / all geometry, openings and roof coverings preserved',font=font(20),fill='#6b6655')
examples=[('hopkins','hopkins-4-12'),('gross','grossdale-spire'),('hopkins','hopkins-4-16'),('gross','albany-cottage'),('hopkins','hopkins-4-20'),('gross','monroe-row')]
for i,(collection,id) in enumerate(examples):
 h=next(h for h in (hopkins if collection=='hopkins' else gross) if h['id']==id);x=25+(i%2)*880;y=120+(i//2)*620;place(sheet,thumb(h,collection),(x,y,850,540));draw.text((x+12,y+546),h['label'],font=strong(21),fill='#484737');draw.text((x+12,y+577),'Vertical faces: '+('horizontal clapboard' if h['style']['wall']=='clapboard' else 'matching brick')+' / original roof covering',font=font(18),fill='#6b6655')
draw.text((38,1990),'Actual mesh renders, unchanged texture files. Existing native wall and door geometry is preserved.',font=font(19),fill='#6b6655');sheet.save(previews/'collection-review.jpg',quality=94)
figures=[]
for collection,houses in [('hopkins',hopkins),('gross',gross)]:
 for h in houses:
  src=f"../{collection}-housing-v1/previews/{h['id']}-exterior-0.jpg"
  figures.append(f'<figure><img src="{src}" alt="{html.escape(h["label"])}"><figcaption><strong>{html.escape(h["label"])}</strong><br>{html.escape(h["style"]["wall"])} walls · {html.escape(h["style"]["roof"])} roof · <a href="{html.escape(h["source"]["url"],quote=True)}">source plate</a></figcaption></figure>')
page='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Housing siding review / 25 houses</title><style>body{margin:0;padding:24px;background:#ece6d7;color:#39382d;font:16px system-ui}h1{font-size:28px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:20px}figure{margin:0;background:#f8f4e9;padding:12px}img{width:100%;height:auto;display:block}figcaption{line-height:1.5}a{color:#465d48}</style><h1>Housing siding review</h1><p>25 houses checked; 23 corrected. Vertical faces match their wall finish. Native geometry, openings and roof coverings are preserved. Saved renders of the actual meshes; live GPU review remains unavailable.</p><main>'+''.join(figures)+'</main></html>'
(review/'gallery.html').write_text(page,encoding='utf-8',newline='\n')
print('Refreshed 13 Gross exteriors and collection/source sheets; saved 25-house review gallery and six-house contact sheet.')
