"""Build visual evidence sheets from the workbench's exported PNG render bundle.
Needs Python 3 + Pillow. This formats rendered previews; generated texture pixels
are copied unchanged and are never processed here.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import argparse, base64, hashlib, json
parser=argparse.ArgumentParser();parser.add_argument('--input',required=True);args=parser.parse_args()
root=Path(__file__).resolve().parents[3];out=root/'artifacts/art-review/gross-housing-v1';out.mkdir(parents=True,exist_ok=True)
review=json.loads(Path(args.input).read_text('utf-8'))
for item in review['images']:
    name=item['file'];assert Path(name).name==name and name.endswith('.png')
    raw=item.pop('dataURL');assert raw.startswith('data:image/png;base64,')
    data=base64.b64decode(raw.split(',',1)[1]);assert data.startswith(b'\x89PNG')
    (out/name).write_bytes(data);item['sha256']=hashlib.sha256(data).hexdigest();item['bytes']=len(data)
(out/'review.json').write_text(json.dumps(review,indent=2)+'\n',encoding='utf-8')
preview=root/'docs/art/gross-housing-v1/previews';preview.mkdir(exist_ok=True)
def font(file,size):
    p=Path('C:/Windows/Fonts')/file
    return ImageFont.truetype(str(p),size) if p.exists() else ImageFont.load_default(size=size)
body=font('georgia.ttf',22);small=font('arial.ttf',15);title=font('georgia.ttf',35)
def tile(sheet,filename,x,y,w,h):
    im=Image.open(out/filename).convert('RGB');im.thumbnail((w,h));sheet.paste(im,(x+(w-im.width)//2,y+(h-im.height)//2))
exteriors=[i for i in review['images'] if i['view']=='exterior'];sheet=Image.new('RGB',(1800,1650),'#eee9da');draw=ImageDraw.Draw(sheet)
draw.text((35,25),'Homes beyond the fair',font=title,fill='#332f25');draw.text((37,74),'13 Gross catalogue houses / 1891 Chicago / native Farmyard wall and door proportions',font=small,fill='#756e5d')
for index,item in enumerate(exteriors):
    x=20+(index%4)*445;y=110+(index//4)*375;tile(sheet,item['file'],x,y,430,315);draw.text((x+10,y+320),item['id'].replace('-',' ').title(),font=body,fill='#332f25')
sheet.save(preview/'all-exteriors.jpg',quality=93)
selected=[('ashland-worker-exterior.png','Ashland workers cottage'),('grossdale-octagon-exterior.png','Grossdale octagonal bay'),('monroe-row-exterior.png','Monroe Street row house'),('grossdale-spire-cutaway-0.png','Grossdale / first-floor interior')]
sheet=Image.new('RGB',(1600,1090),'#eee9da');draw=ImageDraw.Draw(sheet);draw.text((30,22),'Tinderbox / Gross catalogue housing',font=title,fill='#332f25');draw.text((32,71),'13 exterior prefabs + 29 interior levels / native Nautilus panels and cut ends',font=small,fill='#756e5d')
for index,(file,label) in enumerate(selected):
    x=20+(index%2)*790;y=110+(index//2)*480;tile(sheet,file,x,y,770,440);draw.text((x+12,y+441),label,font=body,fill='#332f25')
sheet.save(preview/'collection.jpg',quality=95)
for file in ['ashland-worker-exterior.png','grossdale-octagon-exterior.png','monroe-row-exterior.png','grossdale-spire-cutaway-0.png','grossdale-octagon-cutaway-1.png','albany-cottage-cutaway--1.png']:
    (preview/file).write_bytes((out/file).read_bytes())
# Paired source comparison explicitly separates catalogue evidence from the adaptation.
sheet=Image.new('RGB',(1600,1120),'#eee9da');draw=ImageDraw.Draw(sheet);draw.text((30,20),'Ashland & 47th / source and adapted prefab',font=title,fill='#332f25')
plate=Image.open(root/'art/source/gross-housing-v1/plates/n66.jpg').convert('RGB');plate.thumbnail((720,1000));sheet.paste(plate,(25,90));tile(sheet,'ashland-worker-exterior.png',770,105,800,455);tile(sheet,'ashland-worker-cutaway-0.png',770,610,800,455)
draw.text((790,565),'Exterior / native wall and door scale',font=body,fill='#332f25');draw.text((790,1070),'Interior / source room sequence, interpreted furnishings',font=small,fill='#756e5d');sheet.save(preview/'source-to-prefab.jpg',quality=94)
review['limits']=['Desktop GPU; phone viewport emulation does not measure a physical phone.','Artist models and wall-run authoring traces; no Tinderbox gameplay integration or Nautilus full-prefab intake claimed.']
(root/'docs/art/gross-housing-v1/browser-review.json').write_text(json.dumps(review,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:review[k] for k in ['passed','captures','viewport','baseline','repeated','probe','programs']},indent=2))