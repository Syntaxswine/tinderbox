// Application lifecycle has no DOM/WebGL dependency; factories own visit details.
export function createApplication({places,characters=[],selectedCharacterId='goat',startAtTitle=false,createVisit,onState=()=>{},onFocus=()=>{},onFocusTitle=()=>{}}) {
  const catalogue=new Map(places.map(place=>[place.id,place]));
  const choices=new Set(characters.map(character=>character.id));
  if(choices.size&&!choices.has(selectedCharacterId))throw Error('Unknown initial character');
  let epoch=0,active=null,pending=null,closed=false,state={phase:startAtTitle?'title':'menu',loadingId:null,error:null,placeId:null,selectedCharacterId};
  function publish(next){state={...state,...next};onState({...state});}
  function retire(){pending?.controller.abort();pending=null;if(active){const old=active;active=null;old.dispose();}}
  function returnToMenu({error=null,focusId=state.placeId||state.loadingId}={}){
    if(closed)return;epoch++;retire();publish({phase:'menu',loadingId:null,placeId:null,error});if(focusId&&!error)onFocus(focusId);
  }
  function select(id){
    if(closed||state.phase==='title'||!catalogue.has(id))return Promise.resolve(false);
    if(pending?.id===id)return pending.promise;
    if(active&&state.placeId===id)return Promise.resolve(true);
    epoch++;retire();const ticket=epoch,controller=new AbortController(),place=catalogue.get(id);
    publish({phase:'loading',loadingId:id,placeId:null,error:null});
    const entry={id,controller,promise:null};pending=entry;
    entry.promise=(async()=>{
      let visit;
      try{
        visit=await createVisit(place,{characterId:state.selectedCharacterId,signal:controller.signal,onExitToMenu:()=>returnToMenu({focusId:id}),
          onError:error=>{if(!closed&&ticket===epoch)returnToMenu({focusId:id,error:message(error)});}});
        if(closed||ticket!==epoch||controller.signal.aborted){visit?.dispose();return false;}
        if(!visit||typeof visit.dispose!=='function')throw Error('Visit did not supply its lifecycle handle');
        pending=null;active=visit;publish({phase:'visit',loadingId:null,placeId:id,error:null});return true;
      }catch(error){
        visit?.dispose();
        if(!closed&&ticket===epoch&&!controller.signal.aborted){pending=null;publish({phase:'menu',loadingId:null,placeId:null,error:message(error)});}
        return false;
      }
    })();return entry.promise;
  }
  publish(state);
  return {select,returnToMenu,openMenu(){if(closed||state.phase!=='title')return false;publish({phase:'menu',error:null});onFocus(places[0]?.id);return true;},
    returnToTitle(){if(closed)return;epoch++;retire();publish({phase:'title',loadingId:null,placeId:null,error:null});onFocusTitle();},
    selectCharacter(id){if(closed||state.phase!=='menu'||!choices.has(id))return false;publish({selectedCharacterId:id,error:null});return true;},state:()=>({...state}),visit:()=>active,dispose(){if(closed)return;epoch++;retire();closed=true;publish({phase:'disposed',loadingId:null,placeId:null});}};
}
function message(error){
  if(error?.name==='AbortError')return null;
  if(/context lost/i.test(error?.message||''))return 'Graphics context lost. Return to places and try again.';
  if(/WebGL|creat.*context/i.test(error?.message||''))return 'This browser could not open the 3D view. Enable WebGL 2, then try again.';
  if(/HTTP|fetch|network/i.test(error?.message||''))return 'Some map assets could not load. Check your connection and try again.';
  return 'This place could not finish opening. Please try again or choose another place.';
}
