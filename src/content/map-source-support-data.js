import {bounds,unit,cross,sub,overlaps} from '../../workbenches/furnished-house/geometry.js';
import {supportSurfacesTouch} from '../../workbenches/furnished-house/support.js';
import {sourceGeometryTriangles} from './map-source-shapes.js';

// The native graph connects structural floor/wall/roof forms symmetrically;
// fittings/decorations, opening assemblies and moving leaves remain dependents.
const STRUCTURE=new Set(['building-deck','exterior-wall','perimeter-closure','interior-stair','roof-covering','raised-base','approach-stair','exterior-paving','column']);
export const sourceSupportClass=c=>STRUCTURE.has(c.role)?'structural':'dependent';

// Offline only: generic adjacency is a search index, never evidence of bearing.
// Verify candidate structural contacts with the unchanged native triangle test,
// then serialize just identity pairs for the cold runtime metadata graph.
export function encodeSourceContacts(index,library){
  const facets=new Map(),byNumber=index.carriers;
  function geometry(number){
    if(facets.has(number))return facets.get(number);const c=byNumber[number],out=[];
    for(const partNumber of c.parts){const p=index.parts[partNumber];if(!p.physical)continue;const g=library.geometries[p.geometry],count=(g.index?.array.length??g.attributes.position.array.length/3)/3;
      for(const t of sourceGeometryTriangles({matrix:p.matrix,triangleCount:count},g))out.push({triangles:[t],bounds:bounds(t),normal:unit(cross(sub(t[1],t[0]),sub(t[2],t[0]))),kind:'wall',thickness:0});
    }facets.set(number,out);return out;
  }
  const contacts=[],seen=new Set();let candidates=0;
  for(let i=0;i<byNumber.length;i++)if(sourceSupportClass(byNumber[i])==='structural')for(const j of byNumber[i].adjacency){
    const key=[Math.min(i,j),Math.max(i,j)].join('/');if(seen.has(key)||sourceSupportClass(byNumber[j])!=='structural')continue;seen.add(key);candidates++;
    if(geometry(i).some(a=>geometry(j).some(b=>overlaps(a.bounds,b.bounds,.00001)&&supportSurfacesTouch(a,b))))contacts.push([Math.min(i,j),Math.max(i,j)]);
  }
  contacts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);return {contacts,evidence:{kind:'existing-native-support-triangle-contact',candidates,contacts:contacts.length,transformedCarriers:facets.size,scope:'Offline contact verification only; zero runtime world geometry at decode.'}};
}
