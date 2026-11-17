import {createPlaceNavigation,inside} from '../runtime/place-navigation.js';
import {sweptCylinderClear} from '../runtime/collision.js';
import {pointOnTriangle} from '../../workbenches/furnished-house/geometry.js';
export function createMapNavigation({definition,boundaryBindings={},floorReservations=[],doorBindings={},trial,querySource,state,event,isSectionReady=()=>true,streamMetrics=()=>({})}){
  const navs=new Map(),blocks=new Map(),commands=[],physicalSources=new Set([...Object.values(boundaryBindings).flat(),...floorReservations.flatMap(r=>r.sourceIds)]),fragments=new Map([...physicalSources].map(id=>[id,[]]));let view='follow',waiting=false,closed=false;
  for(const b of trial.scene.index.surfaces.values())if(fragments.has(b.sourceSurfaceId))fragments.get(b.sourceSurfaceId).push(b);
  const pieces=ids=>ids.flatMap(id=>fragments.get(id)||[]).filter(b=>b.intact);
  function navFor(actor,radius=actor.radius,height=actor.height){
    const key=[radius,height].join('/');if(navs.has(key))return navs.get(key);
    const body={radius,height,maxStep:.22},nav=createPlaceNavigation({definition,body,isSectionReady,portalOpen:querySource.portalOpen,liveCeilings:true,
      supportPresent(p,s){const claims=floorReservations.filter(r=>Math.abs(r.height-s.height)<1e-5&&inside(p,r.polygon));return !claims.length||claims.some(r=>pieces(r.sourceIds).some(b=>b.supports&&b.triangles.some(t=>pointOnTriangle([p.x,s.height,p.y],t,1e-5))));},
      liveShapes(b,open){if(boundaryBindings[b.id])return pieces(boundaryBindings[b.id]).map(s=>({triangles:s.solidTriangles||s.triangles,closed:s.closedShape!==false}));const shape=querySource.shape(b.id,open);return shape?[shape]:undefined;},
      liveClearance(p,y,previous,{onStairs,body,report}){
        const low=Math.min(y,previous.elevation)+(onStairs ? .45 : .025),high=Math.max(y,previous.elevation)+body.height-1e-6,box={min:[Math.min(p.x,previous.x)-radius,low,Math.min(p.y,previous.y)-radius],max:[Math.max(p.x,previous.x)+radius,high,Math.max(p.y,previous.y)+radius]};
        for(const b of trial.scene.index.candidates(box))if(b.intact&&!sweptCylinderClear(previous,p,radius,low,high,{triangles:b.solidTriangles||b.triangles,closed:b.closedShape!==false})){report({reason:'source-triangles',id:b.id,height:y});return false;}return true;
      }});navs.set(key,nav);return nav;
  }
  const interaction=()=>state.player.hp<=0||state.player.lanternAim?null:navFor(state.player).interaction(state.player,state.paused);
  const shop={interaction,carriesLantern:()=>false,accepts:c=>typeof c.portalId==='string'&&['open','close'].includes(c.action)&&definition.portals.some(p=>p.id===c.portalId&&p.stateful!==false),interact(c){const target=interaction();if(target?.enabled&&target.id===c.portalId&&target.action===c.action)commands.push({...c});},snapshot:()=>({moduleOwned:true,lantern:null,doors:definition.portals.filter(p=>p.stateful!==false).map(p=>({id:p.id,position:p.position,label:p.label,open:querySource.portalOpen(p.id),intact:true}))})};
  return {shop,move(actor,dx,dy,radius,height){if(closed)throw Error('Map navigation disposed');let lastBlock=null;const nav=navFor(actor,radius,height),support=nav.support(actor,actor.elevation);if(!support){blocks.set(actor.id,{reason:'No reachable support',id:actor.surfaceId});return [{x:actor.x,y:actor.y,elevation:actor.elevation}];}
      const result=nav.move(actor,dx,dy);waiting=result.waiting;if(result.path.length===1&&Math.hypot(dx,dy)>1e-8){const target={x:actor.x+dx,y:actor.y+dy},s=nav.support(target,actor.elevation);if(!s)lastBlock={reason:'No reachable support'};else nav.canStand(target,s.height,actor,b=>{lastBlock=b;});}if(lastBlock)blocks.set(actor.id,lastBlock);else blocks.delete(actor.id);return result.path.map(p=>({...p,ownerInstanceId:definition.placeId}));},
    beforeStep(){for(const c of commands.splice(0)){const target=interaction();if(target?.enabled&&target.id===c.portalId&&target.action===c.action){querySource.setPortalOpen(c.portalId,c.action==='open');for(const id of doorBindings[c.portalId]||[])trial.command({type:'opening',id,open:c.action==='open'});event('portal-state',state.player,{portalId:c.portalId,open:c.action==='open',backend:'native-map-trial',nativeTick:trial.tick+1});}}},
    setView(mode){if(!['overview','follow'].includes(mode))throw Error('Invalid map view');view=mode;},snapshot:()=>({placeId:definition.placeId,view,waitingForSection:waiting,portalStates:querySource.portalStates(),collision:{...querySource.metrics(),bodies:[...navs.values()].map(nav=>nav.metrics())},navigation:Object.fromEntries(blocks),...streamMetrics()}),
    dispose(){closed=true;commands.length=0;for(const nav of navs.values())nav.dispose();navs.clear();blocks.clear();}};
}
