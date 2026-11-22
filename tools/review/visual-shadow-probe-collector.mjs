// QA-copy diagnostics only. This module never imports game, Three, GL, or clocks.
export function createShadowProbe({maxMaterials=512}={}) {
  if(!Number.isInteger(maxMaterials)||maxMaterials<1||maxMaterials>4096)throw Error('SHADOW_PROBE_BAD_CAPACITY');
  let active=false,label=null,pass='other',direct=null,overflow=0;
  let totals=Object.create(null),scopes=new Map(),materials=new Map();
  const add=(row,event,n)=>{row[event]=(row[event]||0)+n;};
  function hit(event,n=1) {
    if(!active)return;
    add(totals,event,n);
    const scope=pass+'/'+(direct?(direct.skinned?'skinned':'ordinary'):'outside-direct');
    let row=scopes.get(scope);if(!row){row=Object.create(null);scopes.set(scope,row);}add(row,event,n);
    if(direct){
      const key=scope+'/material-'+direct.materialId;
      let material=materials.get(key);
      if(!material){if(materials.size>=maxMaterials){overflow++;return;}material=Object.create(null);materials.set(key,material);}
      add(material,event,n);
    }
  }
  function snapshot() {
    return {version:1,scope:'Untimed QA attribution only; not a performance measurement',label,active,
      balanced:pass==='other'&&direct===null,overflow,maxMaterials,totals:{...totals},
      byScope:Object.fromEntries([...scopes].map(([k,v])=>[k,{...v}])),
      byMaterial:Object.fromEntries([...materials].map(([k,v])=>[k,{...v}]))};
  }
  return Object.freeze({
    begin(nextLabel){if(active||pass!=='other'||direct!==null)throw Error('SHADOW_PROBE_WINDOW_NOT_IDLE');
      label=String(nextLabel).slice(0,80);totals=Object.create(null);scopes=new Map();materials=new Map();overflow=0;active=true;},
    end(){if(pass!=='other'||direct!==null)throw Error('SHADOW_PROBE_UNBALANCED_WINDOW');active=false;return snapshot();},
    snapshot,hit,
    enterShadow(point){if(!active)return null;const previous=pass;pass=point?'point-shadow':'other-shadow';return previous;},
    leaveShadow(previous){if(previous!==null)pass=previous;},
    enterDirect(skinned,materialId){if(!active)return null;const previous={direct};direct={skinned,materialId};hit('submissions');return previous;},
    leaveDirect(previous){if(previous!==null)direct=previous.direct;},
    reason(reason){hit('program-reason:'+reason);},
    draw(count,instances){hit('draws');hit('submitted-elements',count*instances);}
  });
}
export const shadowProbe=createShadowProbe();
