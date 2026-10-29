const EPS=1e-8;
export const rect=(x0,z0,x1,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
export const circle=(x,z,r,n=24)=>Array.from({length:n},(_,i)=>[x+r*Math.cos(i*2*Math.PI/n),z+r*Math.sin(i*2*Math.PI/n)]);
export const area=p=>Math.abs(p.reduce((v,a,i)=>v+a[0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*a[1],0)/2);
export function clip(p,a,b,inside=true){const out=[],s=q=>(b[0]-a[0])*(q[1]-a[1])-(b[1]-a[1])*(q[0]-a[0]);for(let i=0;i<p.length;i++){const u=p[i],v=p[(i+1)%p.length],su=s(u),sv=s(v),ui=inside?su>=-EPS:su<=EPS,vi=inside?sv>=-EPS:sv<=EPS;if(ui)out.push(u);if(ui!==vi){const t=su/(su-sv);out.push([u[0]+t*(v[0]-u[0]),u[1]+t*(v[1]-u[1])]);}}return out.filter((v,i)=>Math.hypot(v[0]-out[(i+out.length-1)%out.length][0],v[1]-out[(i+out.length-1)%out.length][1])>EPS);}
export function intersect(p,q){for(let i=0;i<q.length&&p.length>2;i++)p=clip(p,q[i],q[(i+1)%q.length]);return p;}
export function subtract(p,q){const out=[];for(let i=0;i<q.length&&p.length>2;i++){const no=clip(p,q[i],q[(i+1)%q.length],false);if(no.length>2&&area(no)>EPS)out.push(no);p=clip(p,q[i],q[(i+1)%q.length]);}return out;}
export function cells(polygons){const prior=[],out=[];for(const polygon of polygons){const xx=polygon.map(p=>p[0]),zz=polygon.map(p=>p[1]);for(let x=Math.floor(Math.min(...xx));x<Math.ceil(Math.max(...xx));x++)for(let z=Math.floor(Math.min(...zz));z<Math.ceil(Math.max(...zz));z++){let pieces=[intersect(rect(x,z,x+1,z+1),polygon)].filter(p=>p.length>2&&area(p)>EPS);for(const q of prior)pieces=pieces.flatMap(p=>subtract(p,q));for(const p of pieces)out.push({x,z,polygon:p,area:area(p),full:Math.abs(area(p)-1)<EPS});}prior.push(polygon);}return out;}
export const move=(p,x,z,yaw=0)=>[x+Math.cos(yaw)*p[0]+Math.sin(yaw)*p[1],z-Math.sin(yaw)*p[0]+Math.cos(yaw)*p[1]];
export const polygonBounds=(polygons,minY,maxY)=>({min:[Math.min(...polygons.flat().map(p=>p[0])),minY,Math.min(...polygons.flat().map(p=>p[1]))],max:[Math.max(...polygons.flat().map(p=>p[0])),maxY,Math.max(...polygons.flat().map(p=>p[1]))]});
export const intersects=(a,b)=>!b||a.min.every((v,i)=>v<=b.max[i]+EPS&&a.max[i]>=b.min[i]-EPS);
