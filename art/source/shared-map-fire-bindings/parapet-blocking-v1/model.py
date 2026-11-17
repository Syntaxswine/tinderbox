"""Prepare exact approved support-addition records; asset writes belong to export.py."""
from pathlib import Path
import copy,hashlib,json
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
DIRECTORY='assets/art/shared-map-support-additions/new-york-parapet-blocking-v1'
PROPOSAL='art/source/shared-map-fire-bindings/support-overrides-v1/parapet-blocking-proposal.json';PROPOSAL_SHA='ba25706bd1cf0895e36b16465dd2c6a5acebbcafe30d30b8e51b9d56ec9d13b4'
BASE='assets/art/shared-map-fire-bindings/new-york-complete-v1.json';BASE_SHA='407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba'
OVERLAY='assets/art/shared-map-derived-geometry/new-york/v1/index.json';OVERLAY_SHA='f1252c7364adfeb025f573fc4650020e71915a3e17e71bcf2e725e56c3f1c941'
CONTROLS='assets/art/shared-map-support-overrides/new-york-controls-v1.json';CONTROLS_SHA='f3f28fda72742c6bc04d32f70331ab96e036662f953153952297fae9ce3bc915'
def digest(data):return hashlib.sha256(data).hexdigest()
def sha(path):return digest((ROOT/path).read_bytes())
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))
def canonical(value):return json.dumps(value,sort_keys=True,separators=(',',':')).encode()
def source_inputs():
 assert sha(PROPOSAL)==PROPOSAL_SHA and sha(BASE)==BASE_SHA and sha(OVERLAY)==OVERLAY_SHA and sha(CONTROLS)==CONTROLS_SHA
 return read(PROPOSAL),read(BASE)
def shared_geometry(proposal):
 original=proposal['geometryTemplate']
 return {'attributes':{k:{'itemSize':v['itemSize'],'type':'Float32Array','normalized':False,'array':copy.deepcopy(v['array'])} for k,v in original['attributes'].items()},'index':copy.deepcopy(original['index'])}
def records():
 proposal,base=source_inputs();geometry=shared_geometry(proposal);payload=canonical(geometry);identity=digest(payload);path=DIRECTORY+'/geometry/'+identity+'.json';geometry_ref={'id':identity,'path':path,'sha256':digest(payload+b'\n'),'triangleCount':12};members=[];by={}
 for original in proposal['proposedInstances']:
  cid=original['id'];part_id=cid.removeprefix('carrier/')
  member={'id':cid,'sourcePartId':part_id,'role':'timber-fitting','physicalMaterial':'timber','fuelClass':'frame','fuelAmount':original['fuelAmount'],'quantityBasis':{'rule':'closed-volume','volumeMetresCubed':original['volumeMetresCubed'],'formula':'actual closed volume / .12','unit':'prototype-fuel-unit','oneCanonicalAccount':True},'geometryId':identity,'matrix':copy.deepcopy(original['matrix']),'bounds':copy.deepcopy(original['bounds']),'appearanceMaterialId':original['appearanceMaterialId'],'nativeBay':copy.deepcopy(original['nativeBay']),'groundAnchor':False,'anchors':[],'finish':None,'physicalContribution':'carrier-solid'}
  members.append(member);by[cid]=member
 joins=[]
 for contact in proposal['modeledContactEvidence']:
  block=by[contact['blockCarrierId']];child,parent=contact['childCarrierId'],contact['parentCarrierId'];host_ref=copy.deepcopy(contact['hostGeometryRef']);host_ref['sha256']=contact['hostGeometrySha256'];block_ref={'partId':block['sourcePartId'],'sourcePartId':block['sourcePartId'],'geometryId':identity,'geometryPath':path,'sha256':geometry_ref['sha256'],'matrix':copy.deepcopy(block['matrix']),'sourceRange':None}
  def region(ref):return {'frame':'emitted-world','bounds':copy.deepcopy(contact['actualContactBounds']),'geometryRefs':[ref],'witnessPoint':copy.deepcopy(contact['witnessPoint']),'boundsMeaning':'Actual local geometry selector only; physical triangles remain authoritative.'}
  block_region=region(block_ref);host_region=region(host_ref);child_region,parent_region=(block_region,host_region) if contact['blockFace']=='bottom' else (host_region,block_region)
  joins.append({'childCarrierId':child,'parentCarrierId':parent,'kind':'bearing-face','direction':'parent-to-child','groundAnchor':False,'childRegion':child_region,'parentRegion':parent_region,'localChildLossBounds':copy.deepcopy(contact['upperLocalBaySelector']) if contact['blockFace']=='top' else copy.deepcopy(block['bounds']),'wholeCarrierRetirement':False,'evidence':{'kind':'modeled-horizontal-bearing-face','blockFace':contact['blockFace'],'blockCarrierId':contact['blockCarrierId'],'actualContactBounds':copy.deepcopy(contact['actualContactBounds']),'contactAreaMetresSquared':contact['contactAreaMetresSquared'],'gapMetres':contact['gapMetres'],'witnessPoint':copy.deepcopy(contact['witnessPoint']),'geometryFrame':contact['geometryFrame'],'sourceProposalPath':PROPOSAL,'sourceProposalSha256':PROPOSAL_SHA}})
 return proposal,base,geometry,geometry_ref,members,joins
if __name__=='__main__':
 proposal,base,geometry,ref,members,joins=records();print(json.dumps({'preparedOnly':True,'manifestEmitted':False,'sharedGeometryId':ref['id'],'geometryTriangles':12,'members':len(members),'role':'timber-fitting','bearingRecords':len(joins),'addedStaticFrameFuel':round(sum(m['fuelAmount'] for m in members),6),'baseStockUnchanged':base['finiteLedger']['total']},sort_keys=True))
