"""Record source locators, dated comparisons and exact cached evidence hashes."""
from pathlib import Path
import json,hashlib
src=Path('art/source/hull-house-block');cache=Path('artifacts/research/hull-house-block')
def rec(p):
 b=p.read_bytes();return dict(path=p.as_posix(),bytes=len(b),sha256=hashlib.sha256(b).hexdigest())
def photo(n):
 j=json.loads((cache/f'photo-{n}.json').read_text(encoding='utf-8-sig'));d={x['label']:x['value'] for x in j['fields']}
 return dict(id=f'HH-PHOTO-{n}',title=d['Title'],date=d['Date of Original'],identifier=d['Identifier'],repository=d['Repository'],
  url=f'https://collections.carli.illinois.edu/digital/collection/uic_7sh/id/{n}',metadataUrl=f'https://collections.carli.illinois.edu/digital/api/singleitem/collection/uic_7sh/id/{n}',
  description=d.get('Description'),photographer=d.get('Photographer'),relation='Nearby settlement comparison, west of the modeled block' if n in [3488,3491] else 'Later neighborhood yard comparison; exact photographed property unlocated',
  use='Clapboards, rear porches, exterior timber steps and repair rhythm; placement is inferred' if n==3446 else 'Sash proportions, brick cornice and mixed timber/brick vocabulary; no exact facade copied',
  rights=d['Rights'],pixelsRedistributed=False,scanTextureUsed=False,
  chronology='1891 comparison predates fieldwork' if n==3488 else 'c1900 comparison is later than the game; later settlement expansion is excluded',
  limitations='UIC item labels c1900 and credits Lewis Hine. That combination needs curator confirmation; do not assert a precise exposure year or author from this record alone.' if n==3446 else 'Date taken from the UIC catalogue; not a photograph of any selected property.')
sources=[
 dict(id='HH-MAP-N1',title='Hull-House Maps and Papers, Nationalities Map No. 1',publication=1895,fieldwork='April 6 to July 15, 1893',
  url='https://homicide.northwestern.edu/docs_hc/pdf/Hull-House-Maps-and-Papers-1895.pdf',index='https://homicide.northwestern.edu/pubs/hullhouse/maps/',pdfPage=257,rotation='90 degrees counter-clockwise after Poppler rendering',
  use='Manual black-outline and parcel trace of Halsted/Desplaines/Polk/Ewing. Household colors never become physical materials.',
  rights='Original 1895 US publication is public domain by publication age. Northwestern scan is attributed; no separate scan license was located. Only the two original-plan crops are redistributed in the editable source folder.',
  installed='art/source/hull-house-block/reference/nationalities-selected.png'),
 dict(id='HH-MAP-W1',title='Hull-House Maps and Papers, Wage Map No. 1',publication=1895,pdfPage=261,
  url='https://homicide.northwestern.edu/docs_hc/pdf/Hull-House-Maps-and-Papers-1895.pdf',
  use='Independent reading of the same outline base and historic address groups.',rights='Same original 1895 publication, public domain by age.',
  installed='art/source/hull-house-block/reference/wage-selected.png',secondaryRightsEvidence='https://commons.wikimedia.org/wiki/File:WAGEMAP1.pdf'),
 dict(id='HH-TEXT-1895',title='Map Notes and Comments, Hull-House Maps and Papers',publication=1895,
  url='https://homicide.northwestern.edu/docs_hc/pdf/Hull-House-Maps-and-Papers-1895.pdf',printedPages=[4,6,8],pdfPages=[14,16,18],
  visuallyReviewedPdfPages=[14,16],use='Printed pages4/6: predominantly frame cross-street dwellings, some brick shops, rear houses and individual passages; no public alley between Polk and Ewing. Page8 explains the outline-map base and household coloring; extracted text reviewed.',
  rights='Original 1895 US publication, public domain by age. Full PDF remains an ignored research cache.'),
 dict(id='HH-FIELDWORK',title='Florence Kelley in Chicago: Hull House Maps and Papers',date='Modern Northwestern historical context',
  url='https://florencekelley.northwestern.edu/historical/hullhouse',
  use='Confirms 1895 publication and April6-July15 1893 underlying survey.',rights='Link and factual paraphrase only.'),
 dict(id='HH-SANBORN-1906',title='Sanborn Fire Insurance Map from Chicago, Cook County, Illinois, Vol.1 North and West Division',publication=1906,sheet='100W',
  url='https://www.loc.gov/item/sanborn01790_018/',
  imageUrl='https://tile.loc.gov/image-services/iiif/service:gmd:gmd410m:g4104m:g4104cm:g01790190601N:01790_01N_1906-0100/full/pct:25/0/default.jpg',
  use='Key identifies exact selected block on sheet100. Readable 0-150 feet ruler calibrates overall block bounds. Later building colors/storeys are comparison only.',
  installed='art/source/hull-house-block/reference/sanborn-1906-sheet100.jpg',
  rights='LOC Sanborn collection declares its online content public domain and free to reuse. Credit: Library of Congress, Geography and Map Division.',
  rightsEvidence='rights property in the cached LOC item response; response was truncated later in its resources array and is not a complete JSON document.',
  uncertainty='No accessible original 1894 core-city volume was located in the 104-volume LOC Chicago index. Do not backdate 1906 industrial premises or extensions.'),
 photo(3488),photo(3446),photo(3491)]
excluded=[
 dict(item=3448,date='c1907',reason='Juvenile court at Ewing and Halsted is later construction; excluded.'),
 dict(item=3489,date='c1920s',reason='Halsted view with Geis Clothing is much later; excluded.'),
 dict(item=3450,date='c1910',reason='Later settlement exterior; excluded.'),
 dict(item=3513,date='c1901',reason='Rear porches metadata lead only; image not used.')]
record=dict(task='Hull-House block, art-only massing preview',representedDate='Chicago around1893',sources=sources,excluded=excluded,
 evidenceClasses={'sourceMatched':'Block boundaries, interpreted black footprints, historic parcel/address groups and court location.',
 'comparablePhoto':'1891 settlement brick/sash vocabulary; c1900 later neighborhood timber porches, repairs and stairs.',
 'inferred':'Every facade opening and native level count; 45-degree or flat roof choice; wood/brick distribution except broad district pattern; generic trades; cloth placement; fence construction; landing and stairs.'},
 remaining=['No photograph of an exact selected frontage was located.','Household color divisions may obscure physical outlines; flagged provisional masses retain their source gap.','1906 industrial comparison cannot establish 1893 industrial footprint or proprietor.','Roof materials and chimney positions are unverified.','Original survey plot numerals are not storey counts.','Native closed doors cannot clear the native goat; traversal is deferred.'],
 noExternalContact=True,noNewDonorRevision=True)
(src/'sources.json').write_bytes((json.dumps(record,indent=2)+'\n').encode())
files=['maps-papers-1895.pdf','maps-papers-1895.txt','nat1-original.png','wage1-original.png','selected-block-nat1.png','selected-block-wage1.png',
 'comments-014.png','comments-016.png','sanborn-1906-key.jpg','sanborn-1906-sheet100-small.jpg','sanborn-selected-block.png','sanborn-scale-study.png',
 'sanborn-100-info.json','sanborn-chicago-index.json','photo-3488.json','photo-3488.jpg','photo-3446.json','photo-3446.jpg','photo-3491.json','photo-3491.jpg']
(src/'preserved.json').write_bytes((json.dumps(dict(cache='artifacts/research/hull-house-block',retained=[rec(cache/p) for p in files],
 excludedDamaged=['sanborn-1906-nw.json is truncated after its rights field; not used as a complete item document.','sanborn-1906-sheet100.jpg is a partial JPEG; use the complete pct25 image.'],
 regeneration='Original volume: pdftoppm -f257 -l257 -scale-to3600 -png, then rotate90 counter-clockwise and crop as trace.json. Wage page261 likewise. See source URLs and trace calibration endpoints.'),indent=2)+'\n').encode())
print('Saved sources and evidence fingerprints',len(sources),len(files))
