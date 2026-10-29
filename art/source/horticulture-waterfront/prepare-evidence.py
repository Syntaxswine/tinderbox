"""Preserve reproducible original-photo evidence and previous-asset hashes."""
from pathlib import Path
import json,hashlib,subprocess
from PIL import Image
ROOT=Path(__file__).resolve().parents[3];out=ROOT/'art/source/horticulture-waterfront';raw=ROOT/'artifacts/horticulture-waterfront/raw/arnold-plate043.jpg';e=out/'evidence'
def record(p):
 b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
im=Image.open(raw).convert('RGB');w,h=im.size
photo=im.copy();photo.thumbnail((2400,2400));photo.save(e/'arnold-plate043.jpg',quality=96,subsampling=0,optimize=True)
rect=[int(w*.18),int(h*.58),int(w*.93),int(h*.72)]
im.crop(rect).save(e/'waterfront-detail.jpg',quality=97,subsampling=0,optimize=True)
s={'version':1,'sourceId':'HWF-ARNOLD-43','creators':['C. D. Arnold','H. D. Higinbotham'],'title':"Official views of the World's Columbian Exposition",'date':1893,'plate':43,'caption':'Horticultural Building from Wooded Island','publication':'Chicago Photo-Gravure Co.; Department of Photography','url':'https://www.gutenberg.org/cache/epub/22847/pg22847-images.html','rawURL':'https://www.gutenberg.org/cache/epub/22847/images/043.jpg','raw':record(raw),'rawPixels':[w,h],'cropPixels':rect,'evidence':[record(e/'arnold-plate043.jpg'),record(e/'waterfront-detail.jpg')],
 'observations':['A pale retaining face follows the water edge, under a continuous coping.','Regular projecting rusticated pilasters align with capped pale posts above.','Dark horizontal railing members run between the posts; faceted post caps are readable in the crop.'],
 'inferences':['Dark bars are represented with a metal-like finish; the photograph does not independently establish their material.','Fine wall coursing, cap bevels and joints are simplified for the game camera.'],
 'adaptations':['1 m repeating modules; 2 m unscaled native retaining panels with deck at 2.12 m.','Default review water line0.92 m leaves about1.2 m of the retaining face visible; the runtime tile does not impose a water level.','A nominal4 m post rhythm is interrupted at corners, ends and stairs; this is an art choice rather than a surveyed source measurement.','Inside/outside corners, terminal returns and the two-metre water-access stair are useful game variants; their historical location or exact design is not established by this photo.'],
 'limits':['Perspective photograph; no calibrated historical shoreline dimensions or actual construction assignment.','Pale and dark tones are supported; exact original colours are unverified.','Building, planting and boats in the source are not included in this bounded shoreline asset.'],
 'rights':'1893 public-domain photographic volume. Preserve Arnold/Higinbotham, publication and Project Gutenberg credit. Gutenberg records gamma0.8 correction and repairs; this is a treated reproduction, not an untouched negative. No source pixels enter runtime.',
 'existingRegister':'docs/art/exposition/sources.json TB009-R03; docs/research/1893-exposition/sources.json EXPO-P02'}
(out/'sources.json').write_text(json.dumps(s,indent=2)+'\n',encoding='utf-8',newline='\n')
prefixes=['art/source/exposition-new-york','art/source/exposition-new-york-tile','assets/art/exposition-new-york','assets/art/exposition-new-york-tile','docs/art/exposition-new-york','docs/art/exposition-new-york-tile','art/source/exposition-administration','assets/art/exposition-administration','docs/art/exposition-administration','workbenches/art/check-exposition-new-york.mjs','workbenches/art/check-exposition-new-york-tile.mjs','workbenches/art/check-exposition-administration.mjs']
lines=subprocess.check_output(['git','ls-tree','-r','43337a33ddfe4dff6849654c827c56e1f24e1acc','--',*prefixes]).decode().splitlines()
files=[]
for line in lines:
 descriptor,path=line.split('\t');files.append({'path':path,'gitBlob':descriptor.split()[2]})
engine=ROOT/'vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/map-core/wall-runs.js'
preserved={'baseCommit':'43337a33ddfe4dff6849654c827c56e1f24e1acc','files':files,'engine':{'commit':'90054d07134116a5d9661f8318a76fe68f922aad',**record(engine),'newDonorImports':[]}}
(out/'preserved.json').write_text(json.dumps(preserved,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Prepared photo evidence and '+str(len(files))+' preserved previous-asset records.')
