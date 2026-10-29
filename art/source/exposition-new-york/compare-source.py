"""Source/actual-model plate at shared metre density, without fitting source to model."""
from pathlib import Path
import json,math
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[3];source=Path(__file__).resolve().parent;out=ROOT/'docs/art/exposition-new-york/previews';renders=ROOT/'artifacts/exposition-new-york/renders'
data=json.loads((source/'measurements.json').read_text(encoding='utf-8'));model=json.loads((renders/'model.json').read_text(encoding='utf-8'));meta=model['metadata'];font=lambda n:ImageFont.truetype('C:/Windows/Fonts/arial.ttf',n)
canvas=Image.new('RGB',(2700,3070),'#f3edde');d=ImageDraw.Draw(canvas);ink='#253b34';blue='#276b91';orange='#b65029';grey='#67756c'
def text(x,y,value,size=26,color=ink):d.text((x,y),value,font=font(size),fill=color)
def pathline(points,color,width=4,closed=True):d.line(points+[points[0]] if closed else points,fill=color,width=width)
text(65,32,'NEW YORK STATE BUILDING | source to actual model',44);text(65,95,'Plate 44 plan / elevation + plate 43 built view. McKim, Mead & White; Getty / Internet Archive.',27)
text(65,164,'FIRST-FLOOR PLAN + MEASURED / AUTHORED OUTLINE',27);text(1400,164,'ACTUAL MODEL ROOF PLAN - SAME METRE DENSITY',27)
image=Image.open(source/'source-plan.jpg');s=1250/image.width;pp=data['plan']['ruler']['pixelsPerFoot']/.3048*s;left=(60,215);canvas.paste(image.resize((1250,round(image.height*s)),Image.Resampling.LANCZOS),left)
origin=data['plan']['origin'];project=lambda p:(left[0]+origin[0]*s+p[0]*pp,left[1]+origin[1]*s-p[1]*pp)
pathline([project(p) for p in data['sourceMeasuredUncompressedOutlineMetres']],blue,7)
pathline([project(p) for p in meta['authoredBodyOutline']],orange,3)
for f in meta['groundContact']:
 pathline([project(p) for p in f['polygon']],orange,2 if f['id']=='main-plinth' else 3)
plan=Image.open(renders/'roof-plan/roof-plan.png').convert('RGB');rs=pp/(1600/76);new=(round(plan.width*rs),round(plan.height*rs));rp=(1420,round(project([0,0])[1]-(530+11*1600/76)*rs));canvas.paste(plan.resize(new,Image.Resampling.LANCZOS),rp)
project2=lambda p:(rp[0]+(800+p[0]*1600/76)*rs,rp[1]+(530-(p[1]-11)*1600/76)*rs)
pathline([project2(p) for p in data['sourceMeasuredUncompressedOutlineMetres']],blue,7);pathline([project2(p) for p in meta['authoredBodyOutline']],orange,3)
# An independently dimensioned 10 m bar belongs to each comparison panel.
for x,y in [(90,1098),(1430,1098)]:d.line((x,y,x+10*pp,y),fill=ink,width=5);d.line((x,y-7,x,y+7),fill=ink,width=3);d.line((x+10*pp,y-7,x+10*pp,y+7),fill=ink,width=3);text(x,y+12,'10 m',23)
text(310,1108,'Blue: ruler-measured body. Orange: authored body / ground additions.',26);text(65,1165,'Main facade 154 ft / 46.9392 m -> 47 m. Curved porches remain full size; ground envelope 70.5 m.',27)
text(65,1203,'Repeated front window centres: maximum source-to-model offset 0.118 m. Native leaves remain unscaled.',23)
d.line((60,1230,2640,1230),fill='#c8c4b6',width=3)
text(65,1255,'PUBLISHED FRONT ELEVATION',28);text(1420,1255,'ACTUAL MODEL - SAME METRE DENSITY / GROUND DATUM',28)
elev=Image.open(source/'source-elevation.jpg');ep=16;es=ep/(data['elevation']['ruler']['pixelsPerFoot']/.3048);ev=(60,1330);canvas.paste(elev.resize((round(elev.width*es),round(elev.height*es)),Image.Resampling.LANCZOS),ev);baseline=ev[1]+data['elevation']['origin'][1]*es
front=Image.open(renders/'front-elevation/front-elevation.png').convert('RGB').crop((0,150,1600,920));fs=ep/(1600/76);fp=(1420,round(baseline-(530+17*1600/76-150)*fs));canvas.paste(front.resize((round(front.width*fs),round(front.height*fs)),Image.Resampling.LANCZOS),fp)
for y,label in [(0,'0 m ground'),(9.8,'9.8 m porch rail'),(19.2,'19.2 m main rail'),(24.9,'24.9 m roof rail'),(33.5,'33.5 m cap')]:
 yy=baseline-y*ep
 for x0,x1 in [(ev[0]+80,ev[0]+1210),(1420,2635)]:
  for x in range(round(x0),round(x1),18):d.line((x,yy,min(x+9,x1),yy),fill=blue,width=2)
 text(2410,yy-27,label,20,blue)
text(65,2010,'Heights: independently calibrated elevation. Source drawings are converted by their ruler, never fitted to the model.',26)
d.line((60,2070,2640,2070),fill='#c8c4b6',width=3)
text(65,2095,'BUILT VIEW / SOURCE LIMITS',29);photo=Image.open(source/'plate-43-built.jpg');photo.thumbnail((900,610),Image.Resampling.LANCZOS);canvas.paste(photo,(65,2150))
text(65,2780,'Visible awnings / urn displays used; plants omitted.',24);text(65,2820,'Exact colours and structural materials unresolved.',24);text(65,2860,'Rear openings and roof depths are inferred.',24)
text(1040,2095,'MEASUREMENT / ADAPTATION REGISTER',29)
cols=[1040,1440,1680,1920,2160,2390];headers=['Feature','Feet*','Source m','Authored m','Delta m','Allow. m']
for x,h in zip(cols,headers):text(x,2155,h,25)
ids=['main-facade','main-body-depth','porch-radius','envelope-width-with-side-stairs','front-stair-width','main-parapet-height','clerestory-cornice-height','upper-roof-balustrade-height','tower-cap-height']
labels=['Main facade','Body depth','Porch radius','Ground width','Stair + cheeks','Main parapet','Clerestory cornice','Upper roof rail','Tower cap']
for i,(ident,label) in enumerate(zip(ids,labels)):
 row=next(r for r in data['measurements'] if r['id']==ident);values=[label,format(row['sourceFeet'],'.2f')+(' P' if ident=='main-facade' else ' R'),format(row['sourceMetres'],'.3f'),format(row['authoredMetres'],'.2f'),format(row['authoredMetres']-row['sourceMetres'],'+.3f'),format(row['readingUncertaintyMetres'],'.2f')];y=2207+i*53
 for x,v in zip(cols,values):text(x,y,v,24)
text(1040,2715,'* P = printed chain. R = ruler-derived feet, not a transcribed numeral.',23);text(1040,2760,'Ruler allowance: +/-2 px per feature endpoint + 2% span.',23)
text(1040,2800,'154 ft facade receives +0.0608 m native-grid adjustment.',23)
text(1040,2840,'Doors: unchanged 1 x 1.65 x .12 m leaves + fixed transoms.',23)
text(65,2940,'Geometry, skin slots and local bounds are reusable. No crowds, effects, interiors, gameplay or UI in these previews.',27)
text(65,2990,'Actual Three mesh export / CPU diffuse rendering; WebGL shader and performance acceptance remains with the architect.',25)
canvas.save(out/'source-comparison.jpg',quality=96,subsampling=0,optimize=True)
print('Saved 2700 x 3070 source/model comparison; independent metre density, shared ground datum.')
