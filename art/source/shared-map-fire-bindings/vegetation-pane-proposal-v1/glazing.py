"""Original glazing memberships and proposed local damage; zero fuel."""
import collections,re
from fractions import Fraction as F
def configure(source,cells):
 global S,M;S=source;M=cells
def is_frame(sid):
 return bool(re.search(r'/(?:rib-|latitude-|lantern-post-|lantern-ring-|rafter-|purlin-|jamb-|mullion|transom|sill$|rail-|arch-moulding|arch$|fan-)',sid))
def build(original,sources):
 by={(r['placeId'],r['sourceId']):sources.ref(r) for r in original};assert len(by)==433
 needed=collections.defaultdict(set);windows=collections.defaultdict(list)
 for r in original:
  needed[r['placeId']].update(sid for sid in r['sourceFrameAssociationIds'] if is_frame(sid));windows[r['placeId']].append(sources.actual_bounds(by[r['placeId'],r['sourceId']]))
 for place in sorted(needed):sources.seek(place,needed[place],windows[place])
 templates={};private_masks={};tri_members={};catalogue=[];local=[];frame_refs={};exceptions=[];contact_tests=0;authored=[]
 for number,old in enumerate(original):
  key=(old['placeId'],old['sourceId']);row=by[key];triangles,start=sources.local_triangles(row);assert len(triangles)==old['sourceTriangleCount']
  cachekey=(row['geometrySha256'],start,len(triangles),'authored-vent' if old['sourceId'].endswith('/cupola-vent') else 'native-cell')
  template_id=S.sha(repr(cachekey).encode())[:24]
  if template_id not in templates:
   if cachekey[-1]=='authored-vent':
    groups=M.authored_vent_components(triangles,start)
    mask={'coordinateFrame':'original authored disconnected vent-opening components','localCellCount':len(groups),'ignoredThinAxis':None,'ignoredThicknessCoRetired':False,'allOriginalTriangleOffsetsExhaustive':True,'positiveAreaPortionsPartitionEachOriginalTriangleExactlyOnce':True,'sourceOriginalTriangleCount':len(triangles),'zeroAreaSourceTriangleOffsets':[],'cells':[{'cellKey':g['componentKey'],'originalTrianglePortions':[{'originalTriangleOffset':o,'exactOrientedAreaFraction':F(1),'exactZeroAreaSourceTriangle':False} for o in g['originalTriangleOffsets']],'authoredBoundaryEvidence':g} for g in groups],'replacementGeometryOrIndexBuffers':False}
    private={g['componentKey']:{} for g in groups};membership={o:[g['componentKey']] for g in groups for o in g['originalTriangleOffsets']}
   else:mask,private,membership=M.build_mask(triangles,start)
   templates[template_id]={'templateId':template_id,'originalGeometryPath':row['geometryPath'],'originalGeometrySha256':row['geometrySha256'],'sourceRange':row['sourceRange'],'scope':cachekey[-1],'mask':mask};private_masks[template_id]=private;tri_members[template_id]=membership
  template=templates[template_id];mask=template['mask']
  frameids=[sid for sid in old['sourceFrameAssociationIds'] if is_frame(sid)];frames=[sources.parts[key[0],sid] for sid in frameids if (key[0],sid) in sources.parts]
  for frame in frames:frame_refs[key[0]+'::'+frame['sourceId']]=frame
  contacts,tests=M.contacts(sources,row,frames,triangles,start,mask,private_masks[template_id],tri_members[template_id]);contact_tests+=tests
  is_authored=cachekey[-1]=='authored-vent';coupling_unproved=old['sourceId'].startswith('replacement/') and mask['ignoredThinAxis'] is None
  entry={'placeId':key[0],'originalSourceId':key[1],'originalSourceReference':row,'maskTemplateId':template_id,'originalAuthoredPartKept':True,'authoredPaneClaim':'disconnected authored vent-opening component is a proposed pane/damage owner; no historical pane claim' if is_authored else None,'verifiedHistoricalOrFramedPaneBoundaries':False,'originalMeshCellCandidatePreserved':old.get('unappliedSourceMeshCellCandidate'),'damageScopeProposal':'one damage owner per authored vent-opening component' if is_authored else 'local original-source-native-cell triangle-portion masks','fuelStock':0,'fuelProfileId':None,'physicalScreeningRequired':True,'physicalCollisionAndScreeningPreserveOriginalSourceGeometry':True,'noWholeSheetFirstHitRetirement':True,'parentSelectionSemantics':'any-of-fixed-original-local-frame-port selections only; no nearest-surviving-parent rebinding','adjacentPanesProvideBracing':False,'sourceFrameAssociationIdsPreserved':old['sourceFrameAssociationIds'],'candidateFrameIdsExcludedAsCoveringOrNonframe':[sid for sid in old['sourceFrameAssociationIds'] if not is_frame(sid)],'localDamageGroupKeys':[],'finiteThicknessCounterpartCouplingUnproved':coupling_unproved,'runtimeInstalled':False}
  for cell in mask['cells']:
   ck=cell['cellKey'];groupkey=key[0]+'::'+key[1]+'::'+('authored-opening/' if is_authored else 'native-cell/')+ck
   witness=list(contacts.get(ck,{}).values());entry['localDamageGroupKeys'].append(groupkey)
   group={'proposalDamageGroupKey':groupkey,'originalOwnerSourceId':key[1],'placeId':key[0],'maskTemplateId':template_id,'templateCellKey':ck,'originalMatrix':row['matrix'],'originalOpenMatrix':row['openMatrix'],'immutableAliasComponents':['original owner/source ID','pinned original source surface/range','fixed original mask cell/component key'],'additionalStockAccount':False,'combustibleStock':0,'physicalScreenParticipation':True,'localRetirementMustPreserveOtherMaskPortions':True,'wholeOriginalTriangleDeletionAllowedOnlyIfItsFullMaskPortionIsRetired':True,'frontBackAndEdgeContributionsCoRetired':mask['ignoredThinAxis'] is not None,'fixedOriginalFrameContacts':witness,'parentSemantics':'any-of-fixed-original-local-contact-ports; no support from adjacent panes','geometricContactCount':len(witness),'mechanicalFasteningAndLoadCapacityApproved':False,'newAnchorOrBrace':False,'currentGeneralSelectorSchemaAccepted':False,'runtimeInstalled':False}
   if is_authored:
    group['authoredMembership']=cell['authoredBoundaryEvidence'];authored.append({'damageGroupKey':groupkey,'originalSourceId':key[1],'originalTriangleOffsets':[r['originalTriangleOffset'] for r in cell['originalTrianglePortions']],'sourceBoundaryMeaning':cell['authoredBoundaryEvidence']['meaning']})
   if not witness:exceptions.append({'damageGroupKey':groupkey,'kind':'local-original-frame-contact-not-proved','fallbackToDistantOrSurvivingFrame':False,'newAnchor':False})
   local.append(group)
  if coupling_unproved:exceptions.append({'placeId':key[0],'originalSourceId':key[1],'kind':'oblique-captured-thickness-counterparts-need-pinned-original-sheet-frame','doNotRetireFrontBackSeparately':True,'noAutomaticWholeSheetFallback':True})
  catalogue.append(entry)
  if number%40==0:print('Glazing source proposal: '+str(number+1)+' / '+str(len(original))+' original parts',flush=True)
 assert len(catalogue)==433 and len({g['proposalDamageGroupKey'] for g in local})==len(local)
 assert all(not e['runtimeInstalled'] and e['fuelStock']==0 for e in catalogue)
 return {'sourceCatalogue':catalogue,'maskTemplates':[templates[k] for k in sorted(templates)],'localDamageGroups':local,'authoredVentOpeningMemberships':authored,'originalFrameReferences':[frame_refs[k] for k in sorted(frame_refs)],'exceptions':exceptions,'exactCandidateTriangleContactTests':contact_tests}
