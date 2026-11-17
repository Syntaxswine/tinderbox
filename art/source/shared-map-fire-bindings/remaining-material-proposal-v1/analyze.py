"""Source-only material-family proposal; reads descriptors, never geometry arrays or factories."""
from pathlib import Path
import argparse,collections,hashlib,json,re,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
UI='4498db77a606f87413765b26b34811ef360a4776';RUNTIME='2b350309d9116812a1d3988af090614bdaefbc25'
PINS={'administration':('4de71aac210f28b1becbf3bafd4d9bbcd9ad6ed36a8fb978c685ee3ee5802497','06ac8d1a329550345855cb0894e8de49e2cc78e6c476b656a345943b6bb9fb54'),'horticulture':('45d31d5e3580e25664135063474bbe14e82d7e86b9c9fe513157a58f783d37c7','46b35ad5aed3dbb699fed9d96c256d3fac79ce04e678fbce672b4e46eb7ba3c6')}
ORIGINAL={'administration':'43337a33ddfe4dff6849654c827c56e1f24e1acc','horticulture':'c4287338ff93907900a94a86b6c7e3bed0ae7c2f'}
def digest(data):return hashlib.sha256(data).hexdigest()
def sha(path):return digest((ROOT/path).read_bytes())
def load(path):return json.loads(git(path))
def encode(value):return json.dumps(value,indent=2,sort_keys=True)+'\n'
def git(path,commit=RUNTIME):return subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
def match(condition,part):
 if 'all' in condition:return all(match(c,part) for c in condition['all'])
 if 'any' in condition:return any(match(c,part) for c in condition['any'])
 if 'not' in condition:return not match(condition['not'],part)
 if 'roleIn' in condition:return part['role'] in condition['roleIn']
 if 'idRegex' in condition:return re.search(condition['idRegex'],part['sourceId']) is not None
 raise ValueError(condition)
def rule(fid,name,condition,material,profile,quantity,basis,owner='one-per-original-logical-solid'):
 return {'id':fid,'name':name,'scope':condition,'proposedPhysicalMaterial':material,'existingSharedProfile':profile,'quantityRule':quantity,'basis':basis,'ownershipProposal':owner,'accepted':False,'applied':False}
AD='Explicit game proxy: this source-family assignment is not a historical material determination.'
def rules(place):
 role=lambda *values:{'roleIn':list(values)}
 ids=lambda regex:{'idRegex':regex}
 both=lambda *conditions:{'all':list(conditions)}
 if place=='administration':return [
  rule('A01','Native approach walls/closures',both(role('structural-wall','perimeter-closure'),ids(r'^approach-')),'masonry-proxy',None,'inert',AD),
  rule('A02','Authored office partition core',both(role('structural-wall','perimeter-closure'),ids(r'^office-partition-')),'timber-proxy','partition','wall-area',AD+' Source room labels/plan are not proof of hidden framing.'),
  rule('A03','Other native wall/closure core',role('structural-wall','perimeter-closure'),'timber-proxy','clapboard','wall-area',AD+' Painted/staff appearance and validator wood token are not evidence for this choice.'),
  rule('A04','Native and derived floor/deck cells',role('floor'),'timber-proxy','frame','top-area',AD+' Includes named roof/gallery/spring-ring decks; occupied destinations remain separate.'),
  rule('A05','Exterior approach treads',both(role('stair-tread'),ids(r'^steps-')),'masonry-proxy',None,'inert',AD),
  rule('A06','Added interior stair treads',role('stair-tread'),'timber-proxy','frame','top-area',AD+' The added access stairs are game adaptations.'),
  rule('A07','Stateful native leaf bodies/extensions',role('door-leaf','door-extension'),'timber-proxy','door','leaf-area',AD,'pair-body-and-extension-by-original-portal-and-sign'),
  rule('A08','Leaf hardware',role('door-hardware'),'metal-proxy',None,'inert',AD+' Hardware follows its moving leaf; it does not brace a fixed header.'),
  rule('A09','Actual glazing parts',ids(r'/glass$'),'glass',None,'inert','Source function explicitly creates glazing; support and breakage still require actual source evidence.'),
  rule('A10','Fixed portal and window carpentry',{'any':[role('portal-frame'),both({'not':role('stair-rail','guard-rail','access-support')},{'not':ids(r'^admin-')},ids(r'/(?:jamb-|mullion|transom-|sash-|rail-|fan-|entry-header|header$)'))]},'timber-proxy','frame','closed-volume',AD+' Volumes withheld until actual local geometry is checked.'),
  rule('A11','Added stair rails/guards/supports',{'any':[role('stair-rail','guard-rail','access-support'),ids(r'^admin-[^/]+/(?:centre-column|base/rail-|rail-|handrail-|post-|landing-[^/]+/bridge-guard-[^/]+/top$)')]},'timber-proxy','frame','closed-volume',AD+' No inferred ground anchor or decorative brace.'),
  rule('A12','Substantial column core pieces',ids(r'/column-[^/]+/(?:pedestal|base|shaft)$'),'timber-proxy','frame','closed-volume',AD+' Staff-clad column anatomy does not prove a solid historical wooden column.'),
  rule('A13','Authored office desks',ids(r'^[^/]+/desk(?:-leg-[^/]+)?$'),'timber-proxy','furniture','closed-volume',AD+' Plan office use is factual; these desk assemblies are authored.','one-connected-desk-assembly-per-room'),
  rule('A14','Dome shell/ribs/caps/terminal',ids(r'^(?:great-dome/(?:shell|rib-|crown-cap|finial)|corner-cupola-[^/]+/cap$)'),'metal-roof-proxy',None,'inert',AD+' Gilding is documented; substrate, concealed framing and shell load capacity remain unverified.'),
  rule('A15','Staff-like trim/sculpture/balustrades',ids(r'(?:cornice|rustication|dentil|parapet|upper-rail|pilaster|capital|volute|pier-edge|arch-moulding|spandrel|/sill$|basement-panel|basement-pier|medallion|/field-|pavilion-figure|winged-figure|^great-dome/|^corner-cupola-)'),'mineral-staff-proxy',None,'inert',AD+' No extra combustible finish; actual attachment/parent evidence remains required.'),
  rule('A99','Unresolved source exceptions',ids(r'.*'),'unassigned',None,'withheld','No material/quantity fallback. Exact residual IDs require a separate decision.')
 ]
 return [
  rule('H01','Terrace native paving cells',both(ids(r'^terrace/'),role('floor')),'masonry-proxy',None,'inert',AD+' Visible paving is documented; actual historic quay construction remains unresolved.'),
  rule('H02','Terrace native retaining backbone',role('retaining-backbone'),'masonry-proxy',None,'inert',AD+' Source concrete enum is geometry-only. Contact with ground must be measured.'),
  rule('H03','Terrace rail bars/stair rails',both(ids(r'^terrace/'),role('rail-bar','stair-rail')),'metal-proxy',None,'inert',AD+' Dark photograph rails do not establish alloy or fixity.'),
  rule('H04','Other terrace facings/coping/posts/treads',ids(r'^terrace/'),'mineral-quay-proxy',None,'inert',AD+' Thin facings do not duplicate backbone fuel or become its brace.'),
  rule('H05','Wall and level-closure core',role('structural-wall','perimeter-closure'),'timber-proxy','clapboard','wall-area',AD+' Conkey documents cream staff outside, not this uniform core material.'),
  rule('H06','Building floor/gallery cells',both(role('floor'),ids(r'^(?:first-floor|pavilion-galleries|rotunda-gallery)/')),'timber-proxy','frame','top-area',AD),
  rule('H07','Unoccupied spring/entry/foyer roof decks',role('floor'),'timber-proxy','frame','top-area',AD+' No new occupied destination or hidden rotunda cap is implied.'),
  rule('H08','Added dry approach treads',both(role('stair-tread'),ids(r'^hort-dry-approach-')),'masonry-proxy',None,'inert',AD),
  rule('H09','Three gallery stair tread families',role('stair-tread'),'timber-proxy','frame','top-area',AD),
  rule('H10','Native paired leaf bodies/extensions',role('door-leaf','door-extension'),'timber-proxy','door','leaf-area',AD,'pair-body-and-extension-by-original-portal-and-sign'),
  rule('H11','Leaf hardware',role('door-hardware'),'metal-proxy',None,'inert',AD+' Moving-leaf attachment remains; no fixed-frame support from a moving door.'),
  rule('H12','Glazing and vents',{'any':[role('window-glass','dome-glass','roof-glass','lantern-glass','cupola-vent'),ids(r'/(?:arched-glass|glass)$')]},'glass',None,'inert','Conkey documents glazed front curtains and crystal dome. Open thin skins are not closed-volume fuel or structure.'),
  rule('H13','Dome/lantern/glazed-gallery framework',{'any':[role('dome-frame','lantern-frame'),ids(r'^(?:great-dome/lantern-|front-glass-gallery-|curved-gallery-connector-)')]},'metal-proxy',None,'inert','Period report documents ornamental ironwork at the Horticulture dome. Assignment to every modelled dome/cupola/gallery frame is an explicit game adaptation; exact alloy/member construction remains unverified.'),
  rule('H14','Cupola coverings',role('cupola-roof'),'metal-roof-proxy',None,'inert',AD+' Ribbed covering appearance does not establish historical sheet metal.'),
  rule('H15','Live foliage/fruit/trunks',{'any':[role('plant'),ids(r'^(?:palm-|fern-|orange-tree-).*/trunk$')]},'live-vegetation-unresolved',None,'withheld','Living plants are source-supported. Existing grass/dry timber rates do not establish wet foliage/palm/fern behaviour.'),
  rule('H16','Soil/planting-bed proxies',role('planting-bed'),'soil-proxy',None,'inert',AD+' Soil moisture remains unverified.'),
  rule('H16b','Court basin kerbs',ids(r'^court-basin-.*/kerb-'),'masonry-proxy',None,'inert',AD+' Actual basin masonry construction is unverified.'),
  rule('H17','Decorative basin water',role('decorative-water'),'water',None,'inert','Source supports aquatic basins. Two thin render water parts are not the lagoon rectangle, fuel or a new heat/suppression rule.'),
  rule('H18','Cafe tables and benches',ids(r'^cafe/'),'timber-proxy','furniture','closed-volume',AD+' Cafes are source-supported; furniture design and placements are authored.','one-table-and-two-separate-benches-per-cafe-position'),
  rule('H19','Fixed portal/window carpentry',{'any':[role('portal-frame'),ids(r'/(?:jamb-|mullion|transom|sash-|fan-|leaf-header)')]},'timber-proxy','frame','closed-volume',AD+' A glazed opening does not establish historical wood; fixed-frame support needs actual contacts.'),
  rule('H20','Gallery guards and stair rails',{'any':[role('stair-rail'),ids(r'^(?:end-gallery-guard-|rotunda-gallery-guard-)|/(?:post-|handrail-)')]},'timber-proxy','frame','closed-volume',AD+' Existing join directions and unsupported components require independent source review.'),
  rule('H21','Rear/end opaque roof coverings',ids(r'^(?:rear-curtain-roof|end-pavilion-roof-[01])$'),'timber-covering-proxy','roof','weather-area',AD+' Conkey distinguishes rear ordinary light from front glass; exact rear roofing is unresolved.'),
  rule('H22','Staff-like arcade trim/sculpture',{'any':[role('ornament'),ids(r'(?:cornice|/arch$|spandrel|/sill$|/boss-|/pilaster-|/capital-|^entrance-figure-)')]},'mineral-staff-proxy',None,'inert','Cream exterior staff is documented. Per-piece inert proxy and absence of an extra coating account are game choices.'),
  rule('H99','Unresolved source exceptions',ids(r'.*'),'unassigned',None,'withheld','No default timber, inert, quantity or support fallback.')
 ]
QUANTITIES={
 'inert':{'proposal':'zero fuel; keep screening, breakage, mass/support intent and retirement explicit','measuredNow':False},
 'withheld':{'proposal':'No finite assignment, including no automatic zero or timber default','measuredNow':False},
 'wall-area':{'proposal':'one primary remaining physical wall/closure area at .16 m native depth times 1; never two faces; partition versus clapboard uses the selected existing profile','measuredNow':False},
 'top-area':{'proposal':'actual upward projected physical area times 1; retain each real slab/tread, apertures and .12 m slab geometry; never add absent cells','measuredNow':False},
 'closed-volume':{'proposal':'actual verified closed physical union volume divided by .12; withhold on unverified/open/cut geometry or unresolved overlap; never double-count compound intersections or cosmetic layers','measuredNow':False},
 'leaf-area':{'proposal':'one native body plus its existing upper extension: total nonduplicate physical panel area times .45, once per portal/sign; hardware separate/inert','measuredNow':False},
 'weather-area':{'proposal':'actual exposed upward weather-face area times 1; remove buried/duplicate coverage by actual triangles, never bounding-box area','measuredNow':False}
}
def inspect(place):
 folder='assets/art/place-scenes/'+place;index=load(folder+'/index.json');navigation=load(folder+'/navigation.json')
 assert sha(folder+'/index.json')==PINS[place][0] and sha(folder+'/navigation.json')==PINS[place][1]
 table=rules(place);groups={r['id']:[] for r in table};sections=[];all_ids=[];render_ids=[];merged=0;cut=[];role_counts=collections.Counter()
 for section in index['chunks']:
  path=folder+'/'+section['url'];raw=(ROOT/path).read_bytes();parts=json.loads(raw)['parts'];members=[];local=collections.Counter()
  for part in parts:
   render_ids.append(part['id']);ranges=part.get('sourceRanges') or [{'id':part['id'],'start':None,'count':None}]
   if part.get('sourceRanges'):merged+=1
   for source in ranges:
    row={'sourceId':source['id'].removeprefix('replacement/'),'originalSourceId':source['id'],'role':part.get('role'),'renderId':part['id'],'fromAccess':part.get('fromAccess',False),'sourceRange':{'start':source.get('start'),'count':source.get('count')} if part.get('sourceRanges') else None}
    chosen=next(rule for rule in table if match(rule['scope'],row));groups[chosen['id']].append(row);all_ids.append(source['id']);local[chosen['id']]+=1;role_counts[str(row['role'])]+=1
    if source['id'].startswith(('replacement/','visit-cap/')):cut.append({'sourceId':source['id'],'renderId':part['id'],'sectionId':section['id'],'familyId':chosen['id'],'geometryId':part['geometry'],'sourceRange':row['sourceRange'],'closureVerdict':'not-measured; no New York repair or allowance transferred'})
  sections.append({'id':section['id'],'path':path,'sha256':digest(raw),'descriptorBytes':len(raw),'renderRecords':len(parts),'logicalSourceIds':sum(local.values()),'familyCounts':dict(sorted(local.items()))})
 assert len(all_ids)==len(set(all_ids))==index['statistics']['emittedParts']
 assert len(render_ids)==len(set(render_ids))==index['statistics']['renderParts']
 out=[]
 for rule in table:
  members=groups[rule['id']];ids=sorted(r['originalSourceId'] for r in members);row={**rule,'logicalSourceCount':len(members),'renderRecordCount':len({r['renderId'] for r in members}),'logicalIdSetSha256':digest(('\n'.join(ids)+'\n').encode()),'firstSourceId':ids[0] if ids else None,'lastSourceId':ids[-1] if ids else None,'examples':ids[:3],'scopeMeaning':'First matching ordered rule over exact pinned original logical IDs after sourceRanges expansion; replacement/ is stripped only for semantic matching. Canonical physical owners/quantities are not exported.'}
  if rule['id'].endswith('99'):row['unresolvedIds']=ids
  out.append(row)
 nav={'sourceOffset':navigation['sourceOffset'],'occupiedLevels':navigation['occupiedLevels'],'portals':[{'id':p['id'],'stateful':p['stateful'],'initiallyOpen':p.get('initiallyOpen')} for p in navigation['portals']],'width':navigation['width'],'height':navigation['height'],'collisionShapeOpenMetadataCount':sum(not c.get('closed',True) for c in navigation['collisionShapes'].values()) if isinstance(navigation['collisionShapes'],dict) else None,'accessPlanSummary':load('art/source/exploration-access/plan-summary.json')[place]}
 return {'version':1,'placeId':place,'status':'UNACCEPTED_UNAPPLIED_MATERIAL_FAMILY_PROPOSAL','runtimeConsumable':False,'sourceIndexSha256':PINS[place][0],'navigationSha256':PINS[place][1],'renderRecords':len(render_ids),'logicalSourceParts':len(all_ids),'logicalIdSetSha256':digest(('\n'.join(sorted(all_ids))+'\n').encode()),'mergedRenderRows':merged,'roleCounts':dict(sorted(role_counts.items())),'families':out,'quantityRules':QUANTITIES,'nativeAccessExceptions':nav,'manifestWaterRectangle':index.get('water'),'actualCarrierCount':'not assigned','finiteFuel':'not assigned','geometryArraysRead':False,'sourceGeometryChanged':False,'newCombustionProfiles':False,'supportOrAnchorAssignments':False,'familyOverridesExported':False},sections,cut
def build():
 outputs={}
 for place in PINS:
  proposal,sections,cut=inspect(place);outputs[place+'-proposal.json']=encode(proposal);outputs[place+'-section-pins.json']=encode({'version':1,'sourceOnly':True,'sections':sections});outputs[place+'-cut-exceptions.json']=encode({'version':1,'status':'UNVERIFIED_LOCAL_GEOMETRY_EXCEPTIONS_NOT_REPAIRS','records':cut})
 return outputs
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--save-proposal',action='store_true');parser.add_argument('--check',action='store_true');args=parser.parse_args();assert not(args.save_proposal and args.check)
 outputs=build()
 for name,text in outputs.items():
  if args.save_proposal:(HERE/name).write_text(text,encoding='utf-8',newline='\n')
  if args.check:assert (HERE/name).read_bytes()==text.encode(),'Proposal differs: '+name
  if name.endswith('-proposal.json'):
   result=json.loads(text);print(json.dumps({'place':result['placeId'],'logical':result['logicalSourceParts'],'families':[(r['id'],r['name'],r['logicalSourceCount'],r.get('unresolvedIds',[])[:6]) for r in result['families']]},sort_keys=True))
