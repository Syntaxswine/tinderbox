import {createSourceSupportCalculations,sourceSupportRelation,createSourceEdgeCapture,recordSourceEdge,SOURCE_SUPPORT_TOLERANCE as TOLERANCE} from './source-support-calculations.js';
import {claimPreparedSourceProvider,readPreparedSourceCalculation,releasePreparedSourceProvider} from './prepared-source-support.js';
export {visitSourceContinuityCandidates} from './source-support-calculations.js';

// The full metadata graph is cold; only activated sources have local native
// patch nodes. Exact approved links replace cold identities as each source is
// installed. Render section residency never enters this graph.
export function createSourceSupportGraph({scene,model,querySource,preparedProvider=null,sourceIdentity=null}){
  const {index}=scene,carriers=model.carrierById,active=new Map(),nodes=new Map(),links=new Map(),anchors=new Set(),relations=[],adjacency=[],metadataLinks=new Map(model.carriers.map(c=>[c.id,new Set()]));
  const exceptions=new Set();let structureDirty=true,graphVersion=0,lastRevision=-1,reachVersion=-1,reachCache,pendingReach,pendingCache=[],checks=0,initiallySupported,missingLocalLinks=0;
  // One current edge block per calculation; never retain transformed cold
  // geometry or a history of pose/activation variants. Rebuild still owns the
  // original graph schedule, anchors, live filtering and exception semantics.
  const calculations=new Map(),dependencies=new Map(),knownCalculations=new Set(),watched=new Map();
  let capture=null,cachedEdges=0,peakCachedEdges=0,cacheHits=0,cacheMisses=0,invalidations=0,closed=false;
  let continuityBuilds=0,peakTemporaryRecords=0,peakTemporaryMemberships=0;
  const providerOwner={};let provider=null,births=null;
  const math=createSourceSupportCalculations({index,model,querySource,nodes,active,onContinuityBuild(temporary){continuityBuilds++;peakTemporaryRecords=Math.max(peakTemporaryRecords,temporary.records);peakTemporaryMemberships=Math.max(peakTemporaryMemberships,temporary.memberships);}});
  function invalidate(id){for(const key of dependencies.get(id)||[]){const old=calculations.get(key);if(old){cachedEdges-=old.edges.length;calculations.delete(key);invalidations++;}}}
  function calculate(key,owners,build,describe){
    const old=calculations.get(key);if(old){cacheHits++;for(const [a,b]of old.edges)add(a,b);return old.result;}
    if(!knownCalculations.has(key)){knownCalculations.add(key);for(const id of owners){if(!dependencies.has(id))dependencies.set(id,new Set());dependencies.get(id).add(key);}}
    const previous=capture;capture=createSourceEdgeCapture();
    try{
      const baked=provider?readPreparedSourceCalculation(provider,providerOwner,{key,owners,calculation:describe(),scene,model,querySource,index,nodes,active,births,links},sourceIdentity):null;
      let result;if(baked){for(const [a,b]of baked.edges)add(a,b);result=baked.result;}else result=build();
      const edges=capture.edges;calculations.set(key,{edges,result});cachedEdges+=edges.length;peakCachedEdges=Math.max(peakCachedEdges,cachedEdges);cacheMisses++;return result;
    }finally{capture=previous;}
  }
  function relation(child,parent,record){const r=sourceSupportRelation(child,parent,record,carriers);relations.push(r);metadataLinks.get(parent).add(child);if(r.symmetric)metadataLinks.get(child).add(parent);}
  for(const c of model.carriers){
    for(const parent of c.supports){
      const attachment=c.attachments.find(a=>a.parent===parent),evidence=c.supportEvidence.find(e=>e.parent===parent);
      if(attachment)relation(c.id,parent,attachment);
      else if(evidence&&['coplanar-horizontal-triangle-contact','native-opening-assembly-attachment','native-portal-hinge-attachment','native-leaf-hardware-attachment'].includes(evidence.kind))relation(c.id,parent,evidence);
      else throw Error('Missing approved source support evidence '+c.id+' -> '+parent);
    }
  }
  for(const pair of model.index?.contacts||[]){const [a,b]=pair.map(i=>model.carriers[i].id);adjacency.push([a,b]);metadataLinks.get(a).add(b);metadataLinks.get(b).add(a);}
  function reachable(graph,roots){const seen=new Set(roots),queue=[...seen];for(let i=0;i<queue.length;i++)for(const id of graph.get(queue[i])||[])if(!seen.has(id)){seen.add(id);queue.push(id);}return seen;}
  const metadataSupported=reachable(metadataLinks,model.carriers.filter(c=>c.anchors.length).map(c=>c.id));
  const metadataUnrooted=model.carriers.filter(c=>!metadataSupported.has(c.id)).map(c=>c.id);
  function register(records){
    const changed=new Set();
    for(const b of records)if(carriers.has(b.sourceCarrierId)){
      if(!watched.has(b.id))watched.set(b.id,index.watch([b.id],()=>{if(closed)return;invalidate(b.sourceCarrierId);if(!b.queryOnly)graphVersion++;}));
      if(!b.queryOnly&&!nodes.has(b.id)){nodes.set(b.id,b);births?.set(b.id,b);if(!active.has(b.sourceCarrierId))active.set(b.sourceCarrierId,[]);active.get(b.sourceCarrierId).push(b);changed.add(b.sourceCarrierId);structureDirty=true;graphVersion++;}
    }
    for(const id of changed)invalidate(id);
  }
  function cold(id){return 'cold:'+id;}
  function live(id){return id.startsWith('cold:')?!active.has(id.slice(5)):nodes.get(id)?.intact===true;}
  function directed(a,b){
    links.get(a).add(b);
    recordSourceEdge(capture,a,b);
  }
  function add(a,b,both=false){if(a===b)return;directed(a,b);if(both)directed(b,a);}
  function connectContact(a,b,directed){return math.contact(a,b,directed,add);}
  function rebuild(){
    if(!structureDirty)return;links.clear();anchors.clear();missingLocalLinks=0;
    for(const c of model.carriers){if(!active.has(c.id)){links.set(cold(c.id),new Set());if(c.anchors.length)anchors.add(cold(c.id));}else for(const b of active.get(c.id)){links.set(b.id,new Set());if(c.anchors.some(a=>b.bounds.min[1]<=a.elevation+TOLERANCE&&b.bounds.max[1]>=a.elevation-TOLERANCE))anchors.add(b.id);}}
    // Native patches of one solid connect at their real common exterior/edge.
    for(const [id,list]of active)calculate('continuity:'+id,[id],()=>{
      math.continuity(id,add);
    },()=>({kind:'continuity',carrier:id}));
    for(let i=0;i<adjacency.length;i++){const [a,b]=adjacency[i];if(!active.has(a)&&!active.has(b))connectContact(a,b,false);else calculate('adjacency:'+i,[a,b],()=>connectContact(a,b,false),()=>({kind:'contact',a,b,directed:false}));}
    for(let i=0;i<relations.length;i++){const r=relations[i];
      if(!active.has(r.child)&&!active.has(r.parent)){add(cold(r.parent),cold(r.child),r.symmetric);continue;}
      const found=calculate('relation:'+i,[r.child,r.parent],()=>{
        return math.declaredRegion(r,add);
      },()=>({kind:'declared-region',relation:r}));
      if(!found)missingLocalLinks++;
    }
    const originallyReachable=reachable(links,anchors);initiallySupported=new Set([...nodes.values()].filter(b=>metadataSupported.has(b.sourceCarrierId)).map(b=>b.id));
    for(const id of initiallySupported)if(!originallyReachable.has(id)&&nodes.get(id).intact)exceptions.add(id);
    structureDirty=false;lastRevision=-1;
  }
  provider=claimPreparedSourceProvider(preparedProvider,providerOwner);births=provider?new Map():null;
  try{register(index.surfaces.values());rebuild();}catch(error){if(provider){releasePreparedSourceProvider(provider,providerOwner);provider=null;births.clear();for(const unsubscribe of watched.values())unsubscribe();watched.clear();}throw error;}
  function state(){if(closed)throw Error('Source support graph disposed');rebuild();if(reachCache&&reachVersion===graphVersion)return reachCache;const graph=new Map([...links].map(([id,set])=>[id,live(id)?new Set([...set].filter(live)):new Set()]));reachVersion=graphVersion;return reachCache=reachable(graph,[...anchors].filter(live));}
  function pendingSources(){const seen=state();if(seen!==pendingReach){pendingReach=seen;pendingCache=model.carriers.filter(c=>!active.has(c.id)&&metadataSupported.has(c.id)&&!seen.has(cold(c.id))).map(c=>c.id);}return pendingCache;}
  function unsupported({force=false}={}){if(!force&&!structureDirty&&lastRevision===graphVersion)return [];const seen=state();lastRevision=graphVersion;checks++;return [...initiallySupported].filter(id=>nodes.get(id).intact&&!exceptions.has(id)&&!seen.has(id)).sort().map(id=>nodes.get(id));}
  return {nodes,links,unsupported,pendingSources,sourcesAdded(result){if(closed)throw Error('Source support graph disposed');register(result.boundaries);structureDirty=true;},rootingEvidence:()=>({links:metadataLinks,supported:metadataSupported,relations,verifiedContacts:adjacency}),diagnostics:({includeIds=true}={})=>({nodes:nodes.size,coldCarrierNodes:model.carriers.length-active.size,declaredPairs:relations.length,adjacencyPairs:adjacency.length,anchors:anchors.size,initiallySupported:initiallySupported.size,unresolvedInitial:metadataUnrooted.length+exceptions.size,...(includeIds?{unresolvedIds:[...metadataUnrooted,...exceptions]}:{}),missingLocalLinks,checks,topologyCache:{entries:calculations.size,entryLimit:model.carriers.length+relations.length+adjacency.length,variantsPerCalculation:1,directedEdges:cachedEdges,peakDirectedEdges:peakCachedEdges,hits:cacheHits,misses:cacheMisses,invalidations,watchedBoundaries:watched.size,retainedColdMeshes:0,disposed:closed,continuityBuilds,peakTemporaryRecords,peakTemporaryMemberships,retainedTemporaryIndexes:0}}),
    dispose(){if(closed)return;closed=true;releasePreparedSourceProvider(provider,providerOwner);provider=null;births?.clear();for(const unsubscribe of watched.values())unsubscribe();watched.clear();calculations.clear();dependencies.clear();knownCalculations.clear();cachedEdges=0;capture=null;reachCache=pendingReach=null;pendingCache=[];nodes.clear();links.clear();active.clear();anchors.clear();initiallySupported.clear();exceptions.clear();}
  };
}
