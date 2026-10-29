"""Labelled sheets from actual CPU mesh renders and preserved source pixels."""
from pathlib import Path
import json
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[3];P=ROOT/'docs/art/horticulture-waterfront/previews';E=ROOT/'art/source/horticulture-waterfront/evidence'
def font(n,b=False):return ImageFont.truetype('C:/Windows/Fonts/'+('arialbd.ttf' if b else 'arial.ttf'),n)
def txt(im,xy,text,n=25,b=False):ImageDraw.Draw(im).text(xy,text,font=font(n,b),fill='#29433b')
labels=[('Promenade slab','1 x 1 m; native 0.12 m slab'),('Retaining wall + coping','1 x 1 m cell; native 2 m wall'),('Railed section','1 x 1 m cell; dark horizontal bars'),('Rusticated pier + capped post','1 x 1 m cell'),('Outside corner','1 x 1 m cell; 90-degree turn'),('Inside corner','2 x 2 m envelope; three land cells'),('Left terminal','1 x 1 m cell; closed end return'),('Right terminal','1 x 1 m cell; closed end return'),('Water-access stair','2 x 5 m including native landing')]
canvas=Image.new('RGB',(2020,1800),'#f6f1e6');d=ImageDraw.Draw(canvas)
txt(canvas,(40,28),'Horticulture waterfront | reusable tile catalogue',43,True)
txt(canvas,(40,90),'Actual asset meshes. Native deck: 2.12 m. 1 m panels stay unscaled; custom trim and rails.',26)
for i,(title,caption)in enumerate(labels):
 x=30+(i%3)*665;y=150+(i//3)*530
 im=Image.open(P/f'part-{i+1:02d}.jpg').crop((0,0,1600,1060)).resize((640,424),Image.Resampling.LANCZOS)
 canvas.paste(im,(x,y));txt(canvas,(x+8,y+434),f'{i+1}. {title}',26,True);txt(canvas,(x+8,y+471),caption,23)
txt(canvas,(40,1755),'Source: Arnold / Higinbotham, plate43, 1893. Corners, terminals and stairs are explicit game adaptations.',24)
canvas.save(P/'tile-catalogue.jpg',quality=95,subsampling=0,optimize=True)
metadata={'name':'tile-catalogue','path':'docs/art/horticulture-waterfront/previews/tile-catalogue.jpg','width':2020,'height':1800,'method':'Three by three contact sheet; each tile rendered separately from actual exported geometry to avoid overlap.','views':[f'part-{i:02d}.json'for i in range(1,10)],'labels':[{'number':i+1,'name':a,'dimensions':b}for i,(a,b)in enumerate(labels)],'visualReview':'pending'}
(P/'tile-catalogue.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8',newline='\n')
page=Image.new('RGB',(2000,2200),'#f6f1e6');txt(page,(40,30),'Horticultural shoreline | source and native kit',43,True)
src=Image.open(E/'waterfront-detail.jpg');src.thumbnail((1920,320));page.paste(src,(40,120))
txt(page,(40,425),'1893 Arnold / Higinbotham plate43. Perspective evidence; no historic dimensions measured.',26)
txt(page,(40,485),'Actual modular assembly',32,True)
actual=Image.open(P/'assembled-waterfront.jpg').crop((0,0,1600,1060)).resize((1920,1272),Image.Resampling.LANCZOS);page.paste(actual,(40,540))
lines=[
 'Preserved forms: pale coping, capped posts, dark horizontal railing and projecting rusticated pier faces.',
 'Native choices: 1 m cells; unscaled 1 x 2 x 0.16 m wall cores; 0.12 m slabs; deck at native level1 /2.12 m.',
 'Review water line:0.92 m. Nominal4 m post rhythm has corner/stair interruptions. These are art choices.',
 'Corner, terminal and stair variants are game adaptations. Main building, planting and boats are omitted.',
 'Source pixels are research evidence only. Catalogue intake, water and traversal behavior remain separate.'
]
for i,line in enumerate(lines):txt(page,(40,1860+i*58),line,26)
page.save(P/'source-comparison.jpg',quality=95,subsampling=0,optimize=True)
print('Prepared labelled nine-tile catalogue and source/model comparison.')
