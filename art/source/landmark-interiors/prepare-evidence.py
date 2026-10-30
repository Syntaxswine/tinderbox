"""Recreate public-domain research derivatives. Network acquisition is separate."""
from pathlib import Path
import subprocess,json,hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parents[3];raw=ROOT/'artifacts/landmark-interiors/raw';cache=ROOT/'artifacts/landmark-interiors/evidence';out=ROOT/'art/source/landmark-interiors/evidence'
cache.mkdir(parents=True,exist_ok=True);out.mkdir(parents=True,exist_ok=True)
items=[('new-york-report.pdf',163,'new-york-banquet-1894.jpg',270),('columbian-album.pdf',84,'horticulture-orange-tower-1893.jpg',270),('columbian-album.pdf',114,'horticulture-crystal-cave-1893.jpg',0),('fish-commission-aquarium.pdf',3,'forbes-p145.jpg',0),('fish-commission-aquarium.pdf',4,'forbes-p146.jpg',0)]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();records=[]
for pdf,page,name,angle in items:
 prefix=cache/('source-'+str(page)+'-'+Path(name).stem)
 subprocess.run(['pdftoppm','-f',str(page),'-l',str(page),'-singlefile','-scale-to','2100','-jpeg','-jpegopt','quality=95',str(raw/pdf),str(prefix)],check=True,timeout=30)
 im=Image.open(prefix.with_suffix('.jpg')).convert('RGB')
 if angle:im=im.rotate(angle,expand=True)
 im.thumbnail((2100,2100));p=out/name;im.save(p,quality=94,subsampling=0,optimize=True)
 records.append(dict(path=p.relative_to(ROOT).as_posix(),sha256=sha(p),bytes=p.stat().st_size,derivation=dict(pdf=(raw/pdf).relative_to(ROOT).as_posix(),sourceSha256=sha(raw/pdf),oneBasedScan=page,rotationClockwiseDegrees=(360-angle)%360,method='Poppler scale-to2100 JPEG95; Pillow RGB rotate/thumbnail JPEG94, no retouching')))
(out/'derivatives.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Prepared',len(records),'public-domain evidence images.')
