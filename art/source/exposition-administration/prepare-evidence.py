"""Rendered/cropped evidence only; original TIFF/PDF remain immutable in cache."""
from pathlib import Path
import json,hashlib,shutil,sys
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[3];raw=ROOT/'artifacts/exposition-administration/raw';out=ROOT/'art/source/exposition-administration/evidence';out.mkdir(parents=True,exist_ok=True)
def record(p):
 b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
im=Image.open(raw/'hunt-sheet.tif').convert('RGB');im.save(out/'hunt-sheet-full.jpg',quality=96,subsampling=0,optimize=True)
for name,rect in [('hunt-front-half-plan',(939,3476,3905,5027)),('hunt-front-elevation',(939,588,3856,3315))]:im.crop(rect).save(out/(name+'.jpg'),quality=98,subsampling=0,optimize=True)
shutil.copyfile(raw/'hunt-sheet.jpg',out/'hunt-library-jpeg.jpg')
for n in [23,25,33]:
 photo=Image.open(raw/f'arnold-plate{n:03d}.jpg').convert('RGB');photo.thumbnail((2400,1900));photo.save(out/f'arnold-plate{n:03d}.jpg',quality=96,subsampling=0,optimize=True)
for n in [49,51]:shutil.copyfile(raw/f'flinn-scan{n:03d}.jpg',out/f'flinn-scan{n:03d}.jpg')
# Calibration annotation, in the original TIFF coordinate basis.
a=im.copy();d=ImageDraw.Draw(a);f=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',48)
d.line((1584,4890,3203,4890),fill='#187c72',width=11);d.text((1660,4935),'0--50 metres: 1619 pixels',font=f,fill='#187c72')
d.line((1110,4745,3693,4745),fill='#a65139',width=10);d.text((1660,4610),'Measured front: 2583 pixels',font=f,fill='#a65139')
for x in [1584,1908,2232,2556,2880,3203]:d.ellipse((x-12,4878,x+12,4902),fill='#187c72')
a.thumbnail((2600,3000));a.save(out/'hunt-calibration.jpg',quality=96,subsampling=0,optimize=True)
files=[record(p)for p in sorted(out.glob('*.jpg'))]
source={'version':1,'sourceIds':['ADMIN-HUNT-1893','ADMIN-FLINN-1893','ADMIN-ARNOLD-1893'],
 'hunt':{'creator':'Richard Morris Hunt, architect; A. Riquois, delineator; Semaine des Constructeurs; Hunt collection, AIA/AAF / Library of Congress','date':1893,'item':'2024636088','folio':'11','catalog':'https://www.loc.gov/item/2024636088/','viewer':'https://www.loc.gov/resource/ppmsca.73183/','rawURL':'https://tile.loc.gov/storage-services/master/pnp/ppmsca/73100/73183u.tif','raw':record(raw/'hunt-sheet.tif'),'pixels':list(im.size),'meaning':'Geometrical facade elevation and ground-floor FRONT HALF only; lower legend labels front office functions.','rights':'Existing inspected LOC catalog records No known restrictions on publication; parent registry docs/research/1893-exposition/sources.json, EXPO-A02. Current catalog fetch returned403; public original TIFF/JPEG succeeded.'},
 'flinn':{'creator':'John J. Flinn; Columbian Guide Company, issued under authority of the exposition','title':'Official guide to the World\'s Columbian Exposition, handbook edition','date':1893,'item':'officialguidetow00flin','url':'https://archive.org/details/officialguidetow00flin','pdfURL':'https://archive.org/download/officialguidetow00flin/officialguidetow00flin.pdf','raw':record(raw/'flinn-official-guide.pdf'),'pages':[{'printed':43,'scan':49,'supports':'84 ft square corner pavilions, 120 ft central dome diameter, 250 ft height, 65 ft stages, 175 ft upper stage, 40 ft columns, gilded dome.'},{'printed':45,'scan':51,'supports':'Four stories in each corner pavilion, four50 ft entrances, circular stairs/elevators and octagonal interior.'}],'rights':'1893 publication; inherited archive/source evidence preserved in docs/ui/exposition/sources.json. No new blanket rights grant inferred.'},
 'arnold':{'creators':'C. D. Arnold and H. D. Higinbotham, official photographers','title':'Official Views of the World\'s Columbian Exposition','date':1893,'url':'https://www.gutenberg.org/cache/epub/22847/pg22847-images.html','plates':[{**record(raw/f'arnold-plate{n:03d}.jpg'),'plate':n,'rawURL':f'https://www.gutenberg.org/cache/epub/22847/images/{n:03d}.jpg'} for n in [23,25,33]],'notes':'1893 plates; Gutenberg explains gamma .8 adjustment and repair of some damage. Later appended1905 text is not used for building measurements.','rights':'Historical public-domain images; the preserved source register identifies Gutenberg reproduction terms. Source pixels are research evidence, outside runtime.'},
 'files':files,'limitations':['Hunt plan is only the front half; rear office subdivisions are not invented.','Full exterior uses the source four-pavilion description and four entrances; hidden rear joins remain adaptations.','Reported heights vary across early period descriptions; this candidate uses Flinn250 ft /76.2 m and the Hunt silhouette, not an asserted surveyed as-built height.','Exact face ornament, dome mural, elevator mechanics and upper-room partitions are not reproduced.']}
(ROOT/'art/source/exposition-administration/sources.json').write_text(json.dumps(source,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Prepared '+str(len(files))+' reproducible evidence JPGs and source/hash record.')
