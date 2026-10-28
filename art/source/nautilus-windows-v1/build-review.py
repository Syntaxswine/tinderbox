from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
root=Path(__file__).resolve().parents[3];docs=root/'docs/art/nautilus-windows-v1';out=docs/'previews';out.mkdir(parents=True,exist_ok=True)
font=lambda n:ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',n)
strong=lambda n:ImageFont.truetype('C:/Windows/Fonts/seguisb.ttf',n)
sheet=Image.new('RGB',(2000,1660),'#ece6d7');d=ImageDraw.Draw(sheet)
d.text((36,25),'NAUTILUS / CENTERED PERIOD WINDOWS',font=strong(37),fill='#39382d')
d.text((38,81),'2 m bay = 0.5 m wall + 1 m opening + 0.5 m wall / native scale',font=font(23),fill='#68634f')
items=[('hopkins-4-13-exterior-0','No. 13 / centered sash on upper front chamber'),('hopkins-4-15-exterior-0','No. 15 / centered sash in clapboard gable'),('hopkins-4-13-cutaway-1','No. 13 / existing upper room plan'),('hopkins-4-15-cutaway-1','No. 15 / existing upper room plan')]
figures=[]
for i,(id,label) in enumerate(items):
 x=30+(i%2)*990;y=130+(i//2)*720;im=ImageOps.contain(Image.open(root/f'docs/art/hopkins-housing-v1/previews/{id}.jpg'),(950,650));sheet.paste(im,(x+(950-im.width)//2,y+(650-im.height)//2));d.text((x+10,y+658),label,font=strong(23),fill='#484737')
 figures.append(f'<figure><img src="../hopkins-housing-v1/previews/{id}.jpg" alt="{label}"><figcaption>{label}</figcaption></figure>')
d.text((40,1600),'Actual mesh renders / source 90054d0 / original room, door and stair plans / traversal deferred',font=font(21),fill='#68634f')
sheet.save(out/'centered-windows.jpg',quality=94)
page='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nautilus centered windows</title><style>body{margin:0;padding:24px;background:#ece6d7;color:#39382d;font:16px system-ui}h1{font-size:28px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:20px}figure{margin:0;background:#f8f4e9;padding:12px}img{width:100%;height:auto;display:block}figcaption{line-height:1.5;margin-top:8px}a{color:#465d48}</style><h1>Nautilus centered windows</h1><p>2 m bay: 0.5 m wall + 1 m opening + 0.5 m wall. Native scale. Actual mesh renders of Hopkins Nos. 13 and 15.</p><p>Room, door and stair plans preserved. Window traversal remains deferred. <a href="../housing-siding-review/gallery.html">All 25 houses</a></p><main>'+''.join(figures)+'</main></html>'
(docs/'gallery.html').write_text(page,encoding='utf-8',newline='\n')
print('Saved centered-window contact sheet and four-view gallery.')
