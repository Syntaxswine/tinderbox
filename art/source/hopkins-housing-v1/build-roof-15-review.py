from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import json
root=Path(__file__).resolve().parents[3];base=root/'docs/art/hopkins-housing-v1';out=base/'previews'
font=lambda n:ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',n)
strong=lambda n:ImageFont.truetype('C:/Windows/Fonts/seguisb.ttf',n)
for angle in ['front','rear']:
 Image.open(root/f'artifacts/hopkins-roof-15/images/hopkins-4-15-exterior-0-{angle}.png').convert('RGB').save(out/f'roof-15-{angle}.jpg',quality=94)
sheet=Image.new('RGB',(2000,1530),'#ece6d7');d=ImageDraw.Draw(sheet)
d.text((42,24),'HOPKINS No. 15 / GAMBREL ROOF CORRECTION',font=strong(38),fill='#39382d')
source=Image.open(root/'art/source/hopkins-housing-v1/plates/n26.jpg').crop((120,412,822,910))
items=[(source,'1891 catalogue / leaf n26'),(Image.open(out/'hopkins-4-15-exterior-0.jpg'),'Revised / continuous dual slopes and front gambrel'),(Image.open(out/'roof-15-before.jpg'),'Previous candidate / roof followed room outlines'),(Image.open(out/'roof-15-front.jpg'),'Revised front / centered period sash in a 2 m bay')]
for i,(im,label) in enumerate(items):
 x=35+(i%2)*990;y=100+(i//2)*660
 im=ImageOps.contain(im,(940,590));sheet.paste(im,(x+(940-im.width)//2,y+(590-im.height)//2))
 d.text((x+8,y+600),label,font=strong(22),fill='#484737')
d.text((43,1440),'52 roof panels / 48 one-metre runs + 4 cut ends / 24 panels cut at the valleys',font=strong(22),fill='#4b4a3b')
d.text((43,1478),'Native room/door dimensions preserved; centered upper sash adopted. Roof angles and overhangs are artist adaptations. Actual mesh renders.',font=font(20),fill='#6b6655')
sheet.save(out/'roof-15-comparison.jpg',quality=94)
print('Saved roof comparison and front/rear review views.')
