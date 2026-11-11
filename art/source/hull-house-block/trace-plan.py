"""Hand trace of the printed 1895 outline base, kept separate from household colors."""
import json,hashlib,sys
from pathlib import Path
ROOT=Path('.');OUT=ROOT/'art/source/hull-house-block';CACHE=ROOT/'artifacts/research/hull-house-block'
W,D=258,74
records=[]
def poly(id,points,street,numbers,levels=2,material='wood',roof='gable',status='printed-outline',note=''):
 records.append(dict(id=id,sourcePolygon=points,street=street,printedNumbers=numbers,levels=levels,physicalWall=material,roof=roof,
  footprintEvidence=status,facadeEvidence='unpictured property; comparable UIC photographs and original text',heightEvidence='inferred native levels; later insurance comparison where compatible',note=note))
def rect(id,bounds,street,numbers,levels=2,material='wood',roof='gable',status='printed-outline',note=''):
 x0,z0,x1,z1=bounds;poly(id,[[x0,z0],[x1,z0],[x1,z1],[x0,z1]],street,numbers,levels,material,roof,status,note)
# Halsted-facing structures. Address labels identify a parcel, not a surveyed door.
rect('halsted-338-north',[40,104,68,130],'S. Halsted',['338'],1,note='Small northern structure; exact door number unassigned.')
rect('halsted-338-middle',[40,199,78,228],'S. Halsted',['338'],2)
rect('halsted-338-south',[40,247,99,276],'S. Halsted',['338'],2)
rect('halsted-342',[40,303,138,334],'S. Halsted',['342'],2,roof='flat')
rect('halsted-344',[45,346,112,376],'S. Halsted',['342','346'],2,note='Intermediate frontage; individual number unresolved.')
rect('halsted-346',[42,392,146,421],'S. Halsted',['346'],3,material='brick',roof='flat')
rect('halsted-348',[53,435,147,466],'S. Halsted',['346','350'],2,note='Intermediate frontage; individual number unresolved.')
rect('halsted-350',[42,478,142,510],'S. Halsted',['350'],2,material='brick',roof='flat')
# North row. Survey lot numbers are never interpreted as storey counts.
rect('polk-228-front',[148,100,174,177],'W. Polk',['228'],2)
rect('polk-228-rear',[148,245,204,288],'W. Polk',['228'],1)
poly('polk-224',[[271,94],[326,94],[326,237],[302,237],[302,157],[271,157]],'W. Polk',['224','225','221'],2,roof='flat',note='Stepped printed outline simplified to an orthogonal native polygon.')
rect('polk-222',[333,97,357,166],'W. Polk',['222'],2)
rect('polk-218',[392,102,413,171],'W. Polk',['218'],2)
poly('polk-214',[[459,106],[494,106],[494,161],[479,161],[479,288],[459,288]],'W. Polk',['217','213','214'],2,roof='flat')
rect('polk-209-workshop',[512,78,589,240],'W. Polk',['209'],2,material='brick',roof='flat',status='inferred-within-uncolored-commercial-plot',note='Earlier map leaves this nonresidential plot uncolored. Later insurance shows industrial premises; this conservative mass is provisional.')
rect('polk-208-service',[601,176,621,296],'W. Polk',['208'],1,roof='flat',status='outline-role-uncertain',note='Narrow printed return; interpreted as a low service wing pending earlier insurance evidence.')
rect('polk-204-front',[692,101,725,192],'W. Polk',['204'],2)
rect('polk-204-rear',[736,235,776,290],'W. Polk',['204'],1)
rect('polk-198',[864,102,902,179],'W. Polk',['198'],2)
rect('polk-194',[916,102,964,189],'W. Polk',['194'],2)
rect('polk-194-annex',[967,101,991,165],'W. Polk',['194'],1)
rect('polk-190',[1002,102,1031,166],'W. Polk',['190'],2)
rect('polk-186-rear',[1101,182,1138,292],'W. Polk',['186'],2)
rect('polk-186-front',[1149,112,1181,168],'W. Polk',['186'],2)
rect('polk-182-front',[1227,100,1255,172],'W. Polk',['182'],2)
rect('polk-182-rear',[1227,204,1255,249],'W. Polk',['182'],1)
rect('polk-178-front',[1275,112,1312,153],'W. Polk',['178'],2)
rect('polk-178-rear',[1269,211,1355,264],'W. Polk',['178'],2,roof='flat',status='outline-role-uncertain',note='Horizontal printed outline, partly coincident with survey color divisions.')
rect('polk-174-front',[1363,88,1401,168],'W. Polk',['174'],2)
rect('polk-174-rear',[1402,186,1444,231],'W. Polk',['174'],1)
rect('polk-170-front',[1450,111,1491,137],'W. Polk',['170'],1)
rect('desplaines-north-return',[1495,160,1534,286],'S. Desplaines',['355'],2,roof='flat',status='outline-role-uncertain',note='Eastern return interpreted within the printed parcel, not copied from later household colors.')
# South row. The narrow 8-foot-labelled strip at the west is a court entrance,
# not a through alley. Keep it free from decorative props.
rect('ewing-203-rear',[240,343,268,401],'Ewing',['206','204','203'],1)
rect('ewing-203-front',[293,457,320,514],'Ewing',['203'],2)
rect('ewing-199',[337,319,363,487],'Ewing',['199'],2)
rect('ewing-198-rear',[417,403,441,457],'Ewing',['198'],1)
rect('ewing-195-front',[417,483,441,514],'Ewing',['196','195'],2)
rect('ewing-192-workshop',[513,357,585,515],'Ewing',['192'],2,material='brick',roof='flat',status='commercial-outline-with-inferred-use',note='Printed internal rectangle in an uncolored plot. Industrial use is inferred from the later insurance comparison.')
poly('ewing-188-workshop',[[607,341],[638,341],[638,303],[682,303],[682,515],[607,515]],'Ewing',['188'],3,material='brick',roof='flat',status='commercial-outline-with-inferred-use')
rect('ewing-181',[690,452,721,514],'Ewing',['184','181'],2)
rect('ewing-177',[781,452,840,516],'Ewing',['177'],2)
rect('ewing-175-rear',[908,406,929,442],'Ewing',['175'],1)
rect('ewing-175-front',[878,454,902,515],'Ewing',['175'],2)
rect('ewing-171',[952,419,986,514],'Ewing',['172','171'],2)
rect('ewing-169-front',[1017,458,1036,514],'Ewing',['170','169'],2)
rect('ewing-169-rear',[1004,303,1022,409],'Ewing',['170','169'],1)
rect('ewing-167',[1093,419,1118,514],'Ewing',['168','167'],2)
rect('ewing-163',[1183,388,1211,517],'Ewing',['164','163'],2)
rect('ewing-159-front',[1228,436,1265,514],'Ewing',['160','159'],2)
rect('ewing-159-rear',[1228,361,1245,411],'Ewing',['160','159'],1)
rect('ewing-155-front',[1291,426,1313,514],'Ewing',['156','155'],2)
rect('ewing-155-rear',[1315,320,1356,424],'Ewing',['156','155'],1,note='Whole-metre snapping closes a small source gap at the front-house corner [220,58]. The inferred rear house uses one native level so its gable eaves remain below the front roof. Original height is unknown; native wall corners meet here.')
rect('ewing-151',[1362,428,1396,514],'Ewing',['152','151'],2)
rect('ewing-east-small',[1424,438,1444,516],'Ewing',['151'],1)
rect('desplaines-365',[1458,480,1533,520],'S. Desplaines',['365'],2,roof='flat')
rect('desplaines-361',[1492,314,1534,343],'S. Desplaines',['361'],2,roof='flat')
# Preserve property edges independently from color subdivisions.
north=[40,144,237,329,413,504,598,688,778,908,998,1092,1182,1267,1358,1447,1535]
northLots=['3','4','9','10','15','16','21','22','1','2','3','4','5','6','7','8']
south=[237,327,413,504,598,687,778,908,998,1092,1182,1225,1267,1358,1447,1535]
southLots=['8','11','14','17','20','23','16','15','14','13','12','11','10','9','corner']
parcels=[dict(id='north-'+str(i+1),surveyLot=northLots[i],sourceRect=[north[i],70,north[i+1],300]) for i in range(len(north)-1)]
parcels += [dict(id='south-'+str(i+1),surveyLot=southLots[i],sourceRect=[south[i],300,south[i+1],524]) for i in range(len(south)-1)]
parcels += [dict(id='halsted-'+str(i+1),surveyLot=str(i+1),sourceRect=[40,a,217,b]) for i,(a,b) in enumerate([(300,342),(342,385),(385,429),(429,474),(474,524)])]
source=dict(id='HH-MAP-N1',publication='Hull-House Maps and Papers',published=1895,fieldwork=1893,pdfPage=257,correspondingWagePdfPage=261,
 url='https://homicide.northwestern.edu/docs_hc/pdf/Hull-House-Maps-and-Papers-1895.pdf',
 sourceImage='nat1-original.png',sourceCrop='selected-block-nat1.png',cropInSourcePixels=[180,285,1570,575],
 traceCoordinateSystem='Pixels in the selected crop, X right/east and Y down/south. Black outlines traced; household colors ignored.',
 blockCornersPixels=[[40,70],[1535,85],[1534,524],[35,516]],idealizedRectPixels=[40,70,1535,524])
calibration=dict(source='HH-SANBORN-1906',sheet='100W',sourceUrl='https://www.loc.gov/item/sanborn01790_018/',
 printedScale='Scale of Feet, 0 to 150 ft',rulerPixels=dict(image='sanborn-1906-sheet100-small.jpg',zero=[1153,1752],feet150=[1374,1752]),
 metresPerPixel=45.72/221,estimatedBlockMetres=[257,73.3],gameBlockMetres=[W,D],
 uncertainty='Overall block scale approximately +/-2 m in length and +/-1 m in depth. Individual 1895 plot proportions disagree locally with printed feet labels by up to about 15%; treat intra-block extents as a source-traced massing study, not survey accuracy.',
 adaptations=['The later insurance scale checks stable street-block bounds; its 1906 building changes are not silently treated as 1893 construction.','Printed 50-ft frontages and 118/119-ft depths on the 1895 map were read as cross-checks. No uniform scale ruler was read on that original plate.','Source rectangle is straightened; component coordinates snap to whole metres. Individual source vertices can move by up to half a grid step, plus paper skew.','The printed 8-ft individual court is about 2.44 m. The traced common image projection snaps it to 3 m nominal (2.84 m conservative clear), about 23 percent wider than that printed dimension. This narrow-width discrepancy is an explicit local adaptation beyond the broad 15-percent plot estimate.'])
trace=dict(version=1,assetId='hull-house-block',representedDate='Chicago around 1893',source=source,calibration=calibration,
 block=dict(width=W,depth=D,streets=dict(north='W. Polk Street',south='Ewing Street',west='S. Halsted Street',east='S. Desplaines Street')),
 buildings=records,parcels=parcels,
 passages=[dict(id='halsted-ewing-court',sourcePolygon=[[218,303],[236,303],[236,516],[218,516]],kind='individual-court-entrance',note='No public through alley. Continues north to the rear-property boundary only.')],
 sourceLimits=['Survey colors encode occupants, not wall materials or roof geometry.','Original text printed pages 4 and 6 supports predominantly timber street fronts and no public alley here.','No matching pre-1894 photograph for an individual modeled frontage was located. The 1891 image is nearby Hull-House; the c1900 yard view is a later comparison.','Household subdivisions, large survey lot numerals and colored bands are not extra buildings or storey counts.','Later insurance confirms a mixed timber/brick industrial block; per-property changes remain unresolved.'])
(OUT/'trace.json').write_bytes((json.dumps(trace,indent=2)+'\n').encode())
print('Recorded',len(records),'interpreted building outlines,',len(parcels),'parcel traces and one court entrance.')
