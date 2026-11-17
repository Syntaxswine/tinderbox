"""Source-only selected dry controls; finite game proxies, not botanical biomass."""
from fractions import Fraction as F
import collections,re
def configure(source):
 global S;S=source
BUDGET=F(.30)
def area(row,sources):
 g=sources.geometry(row);triangles,start=sources.local_triangles(row);linear=S.C.linear_of(row['matrix']);terms=[];low=F(0);high=F(0);zero=[]
 for i,t in enumerate(triangles):
  world=tuple(S.C.apply(linear,p) for p in t);normal=S.cross(S.sub(world[1],world[0]),S.sub(world[2],world[0]));q=S.dot(normal,normal)
  if not q:zero.append(start+3*i);continue
  a,b=S.C.sqrt_bounds(q);low+=a/2;high+=b/2;terms.append({'originalTriangleOffset':start+3*i,'squaredCrossMagnitude':q,'coefficient':F(1,2)})
 projected=[tuple((p[0],p[2]) for p in t) for t in triangles if S.R.nonzero(t)]
 overlap=S.X.nonoverlap2(projected);assert overlap['proved']
 assert low>0 and len(terms)+len(zero)==len(triangles)
 return {'measureId':row['sourceId']+'::one-sided-area','sourceReference':row,'exactAreaExpression':{'operation':'sum-coefficient-times-square-root','terms':terms},'areaIntervalMetresSquared':[low,high],'zeroAreaOriginalTriangleOffsets':zero,'nonoverlappingOriginalXZProjection':overlap,'doubleSideMaterialCountedOnce':True,'actualOriginalLinearTransform':linear,'translationExcluded':True,'newMesh':False}
def trunk(owner,row,sources,sine):
 sid=owner['proposalKey'];fern=sid.startswith('fern-');orange=sid.startswith('orange-')
 rt,rb,n=(.1,.16,8) if orange else ((.16,.24,10) if fern else (.18,.28,10))
 height=2.2 if orange else ([3.4,3.4,3.8,3.8][int(sid.split('/')[0].split('-')[1])] if fern else [8,8,9,9,11,10][int(sid.split('/')[0].split('-')[1])])
 g=sources.geometry(row);assert row['sourceRange'] is None
 assert {p[1] for p in S.RP.vertices(g)}=={F(S.RP.f32(height/2)),-F(S.RP.f32(height/2))}
 pairs=S.RP.cylinder_pairs(n,rt,rb);S.RP.schedule(g,'cylinder',n)
 evidence=S.RP.pair_review(g,pairs,sine);topology=S.RP.symbolic_topology(g,pairs);strict=S.X.effective(g)['facts']
 assert topology['closedOrientedSymbolicManifold'] and topology['eulerCharacteristic']==2
 radial=S.RP.profile_certificate(g,'cylinder',n,[]);radial['heightBandNoSelfIntersectionProof']=S.RP.radial_band_certificate(g,'cylinder',n,[])
 measure=S.RP.measures(g,pairs);linear=S.C.linear_of(row['matrix']);det=S.X.determinant(linear);assert det
 lo,hi=[S.fraction(v)*abs(det) for v in measure['proposedGeometricVolumeInterval']];assert lo>0
 periodic=S.fraction(measure['exactPeriodicReferenceVolume'])*abs(det)
 return {'sourceId':sid,'sourceReference':row,'constructorSource':'assets/art/exposition-horticulture/index.js palm/orange planting and assets/art/exposition-new-york/forms.js cylinder','constructor':{'radiusTop':rt,'radiusBottom':rb,'height':height,'radialSegments':n,'heightSegments':1,'openEnded':False},'originalStrictFacts':strict,'periodicEndpointCorrespondence':evidence,'symbolicReferenceTopology':topology,'referenceEmbedding':radial,'localCapturedMeasurements':measure,'actualLinearDeterminant':det,'worldReferenceVolumeInterval':[lo,hi],'exactPeriodicReferenceVolume':periodic,'proposedQuantityRepresentation':S.C.lower_representation(lo/F(.12)),'recipe':'captured periodic-reference conservative volume / exact-binary64 .12','measurementCompleteForReview':True,'closedMeasurementReference':True,'closedSourceSolids':strict['closedSolidProof'],'physicalContainmentOrSupportShortcut':False,'sourceOnlyNotInstalled':True}
def parent_key(owner):
 sid=owner['proposalKey']
 if owner['kind'] in ('frond-crown','orange-canopy-and-fruit'):return sid.rsplit('/',1)[0]+'/trunk'
 if owner['kind']=='flowering-shrub-clump':
  m=re.fullmatch(r'front-shrub-(-?\d+)-(\d+)/clump',sid);return 'front-flower-bed-'+m[1]
 if sid.startswith('orange-tree-'):
  stem=sid.split('/')[0];return 'court-bed-'+stem[len('orange-tree-'):]
 return None
def build(original,sources):
 phase,sine=S.RP.phase_bounds();trunks=[];areas=[];owners=[];patches=[];followers=[];dependencies=[];exceptions=[]
 rows={ref['sourceId']:sources.ref(ref) for owner in original['owners'] for ref in owner['sourceGeometryRefs']}
 assert len(rows)==412
 windows=[sources.actual_bounds(r) for r in rows.values()]
 bedids={parent_key(o) for o in original['owners'] if parent_key(o) and o['kind'] in ('trunk','flowering-shrub-clump')}
 sources.seek('horticulture',bedids,windows)
 # Read only nearby first-floor descriptor sections; test actual source vertices/faces.
 floorrows=[r for (place,sid),r in sources.parts.items() if place=='horticulture' and r.get('floorId')=='first-floor']
 for number,owner in enumerate(original['owners']):
  key=owner['proposalKey'];kind=owner['kind'];ownerrow={'logicalOwnerKey':key,'originalSourceIds':owner['sourceIds'],'kind':kind,'proposedPhysicalMaterial':'timber' if kind=='trunk' else 'cloth','proposedExistingProfileId':'frame' if kind=='trunk' else 'cloth','profileResponseControl':{'thresholdScale':1,'delayScale':1,'globalOverride':False,'wetField':False},'stockMeaning':'explicit gameplay proxy; not botanical biomass or moisture','finiteOwnerBudget':None,'runtimeInstalled':False,'canonicalRuntimeOwnerId':None,'canBraceGreenhouse':False}
  if kind=='trunk':
   certificate=trunk(owner,rows[owner['sourceIds'][0]],sources,sine);trunks.append(certificate);ownerrow['finiteOwnerBudget']=certificate['proposedQuantityRepresentation']['exactDyadicValue'];ownerrow['quantityReferenceSourceId']=key
  else:ownerrow['finiteOwnerBudget']=BUDGET
  damage=owner['damagePatchSourceIds'];localareas=[]
  if kind=='frond-crown':
   for sid in damage:
    measure=area(rows[sid],sources);areas.append(measure);localareas.append(measure)
   assert len(localareas)==12
   sumlow=sum(a['areaIntervalMetresSquared'][0] for a in localareas);sumhigh=sum(a['areaIntervalMetresSquared'][1] for a in localareas)
  for sid in damage:
   share={'operation':'entire-owner-budget','weight':F(1)}
   if kind=='frond-crown':
    measure=next(a for a in localareas if a['sourceReference']['sourceId']==sid);lo,hi=measure['areaIntervalMetresSquared']
    share={'operation':'owner-budget-times-measure-over-sum-of-owner-measures','numeratorMeasureId':measure['measureId'],'denominatorMeasureIds':[a['measureId'] for a in localareas],'ownerBudget':BUDGET,'shareEnclosure':[BUDGET*lo/sumhigh,BUDGET*hi/sumlow],'exactNormalizedAreaExpression':True}
   patches.append({'logicalOwnerKey':key,'localPatchKey':sid,'originalSourceReference':rows[sid],'proposedStockShare':share,'additionalIndependentStock':0,'ownerAccountIsSoleStock':True,'localHitDoesNotRetireOwner':True,'retireRule':'Only this original patch or explicitly selected original native-cell portions may retire from reviewed local exhaustion; no first-hit crown/sheet retirement.','finerEnvelopeDamageSchemaNeeded':kind in ('orange-canopy-and-fruit','flowering-shrub-clump')})
  ownerrow['localPatchKeys']=damage;ownerrow['shareConservation']={'allOriginalPatchIdsExhaustiveAndUnique':True,'sumOfNormalizedAreaWeightsExactlyOne':kind=='frond-crown','singlePatchWeightOne':kind!='frond-crown','independentFollowerStock':0,'stockBornOnActivationOrRefill':False}
  owners.append(ownerrow)
  for sid in owner['visualFollowSourceIds']:
   assert len(damage)==1
   followers.append({'originalSourceReference':rows[sid],'logicalOwnerKey':key,'fixedOriginalParentPatchKeys':damage,'parentSemantics':'all-of-fixed-original-parent-patches','additionalCombustibleStock':0,'alreadyIncludedOnceInOwnerBudget':True,'heatDamageRoute':'Proposed route to fixed owner/patch account; no separate follower fuel','retirementRule':'Follow only the original local parent patch retirement; never select surviving distant parents.','actualSourceParentContact':sources.surface_contact(rows[sid],rows[damage[0]]),'mechanicalJointProved':False,'runtimeInstalled':False})
  pkey=parent_key(owner)
  if kind in ('frond-crown','orange-canopy-and-fruit'):
   parent=rows[pkey];contact_rows=[]
   for sid in damage:contact_rows.append({'childOriginalSourceId':sid,'parentOriginalSourceId':pkey,'sourceContact':sources.surface_contact(rows[sid],parent)})
   dependencies.append({'logicalOwnerKey':key,'fixedOriginalParents':[pkey],'parentSemantics':'all-of-one-original-trunk-selection','contactEvidence':contact_rows,'mechanicalJointApproved':False,'plantsBraceGreenhouse':False,'runtimeInstalled':False})
   if any(c['sourceContact']['kind']!='exact-original-triangle-surface-intersection' for c in contact_rows):exceptions.append({'logicalOwnerKey':key,'kind':'botanical-parent-contact-unproved','fixedParent':pkey,'noNewJointOrAnchor':True})
  else:
   child=rows[damage[0]];bounds=sources.actual_bounds(child);low=min(p[1] for t in sources.triangles(child)[0] for p in t);candidatefloors=[]
   for floor in floorrows:
    b=floor['bounds']
    if all(b['min'][k]<=bounds['max'][k] and b['max'][k]>=bounds['min'][k] for k in (0,2)) and b['max'][1]<=float(low)+.5:candidatefloors.append(floor)
   floor_evidence=[sources.point_clearance(child,floor) for floor in candidatefloors]
   floor_evidence=[v for v in floor_evidence if v['actualLowestSourceVertexHorizontalFaceWitnesses']]
   bed=sources.parts.get(('horticulture',pkey)) if pkey else None
   bed_evidence=sources.point_clearance(child,bed) if bed else None
   dep={'logicalOwnerKey':key,'originalFloorFaceCandidates':floor_evidence,'authoredBedAssociation':bed_evidence,'proposedParentSemantics':'fixed original bed/floor selections only; unresolved geometric gaps are not anchors','mechanicalJointApproved':False,'newGroundAnchor':False,'plantsBraceGreenhouse':False}
   dependencies.append(dep);exceptions.append({'logicalOwnerKey':key,'kind':'grounding-or-bed-attachment-not-proved','actualSourceFloorOrBedEvidenceRecorded':bool(floor_evidence or bed_evidence),'noAutomaticAnchor':True})
  if kind in ('orange-canopy-and-fruit','flowering-shrub-clump'):exceptions.append({'logicalOwnerKey':key,'kind':'finer-local-envelope-retirement-needs-schema','preserveExistingTopLevelPatchCount':True,'noFirstHitOwnerRetirement':True})
 assert len(owners)==98 and len(patches)==208 and len(followers)==204 and len(trunks)==22 and len(areas)==120
 assert len({r['logicalOwnerKey'] for r in owners})==98
 assert len({r['localPatchKey'] for r in patches})==208
 assert len({r['originalSourceReference']['sourceId'] for r in followers})==204
 assert {r['originalSourceReference']['sourceId'] for r in patches+followers}==set(rows)
 return {'owners':owners,'patches':patches,'followers':followers,'trunkMeasurements':trunks,'frondAreas':areas,'parentDependence':dependencies,'exceptions':exceptions,'phaseProof':phase}
