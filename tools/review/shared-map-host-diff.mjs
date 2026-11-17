const collisionCounters=new Set(['cachedShapes','cachedTriangles','peakShapes','peakTriangles','shapeBuilds','maxSingleQueryTriangles']);
const bodyCounters=new Set(['cachedShapes','cachedTriangles','peakCachedShapes','peakCachedTriangles']);
const escape=s=>String(s).replaceAll('~','~0').replaceAll('/','~1');
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);

// Compare every raw JSON field first. Only actual, finite counter differences
// at the architect's exact paths can subsequently be classified observational.
export function compareSharedMapHosts(reference,candidate){
  const differences=[];
  function visit(a,b,path,aPresent=true,bPresent=true){
    if(aPresent===bPresent&&Object.is(a,b))return;
    if(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length){for(let i=0;i<a.length;i++)visit(a[i],b[i],[...path,String(i)]);return;}
    if(object(a)&&object(b)){for(const key of new Set([...Object.keys(a),...Object.keys(b)]))visit(a[key],b[key],[...path,key],Object.hasOwn(a,key),Object.hasOwn(b,key));return;}
    const direct=path.length===3&&path[0]==='navigation'&&path[1]==='collision'&&collisionCounters.has(path[2]);
    const body=path.length===5&&path[0]==='navigation'&&path[1]==='collision'&&path[2]==='bodies'&&/^(0|[1-9]\d*)$/.test(path[3])&&bodyCounters.has(path[4]);
    const observational=(direct||body)&&aPresent&&bPresent&&Number.isSafeInteger(a)&&a>=0&&Number.isSafeInteger(b)&&b>=0;
    differences.push({path:'/'+path.map(escape).join('/'),referencePresent:aPresent,candidatePresent:bPresent,...(aPresent?{reference:a}:{}),...(bPresent?{candidate:b}:{}),classification:observational?'observational-counter':'unexpected'});
  }
  visit(reference,candidate,[]);
  return {strictEqual:differences.length===0,semanticEqual:!differences.some(d=>d.classification==='unexpected'),differences};
}
