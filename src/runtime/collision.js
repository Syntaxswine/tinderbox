// Narrow phase for retained source fragments. A fragment's AABB is broad phase
// only: clipping can leave multiple jambs/rails around a genuinely empty hole.
const EPS=1e-6;
const pointDistance=(p,a,b)=>{const x=b[0]-a[0],y=b[1]-a[1],length=x*x+y*y,t=length?Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*y)/length)):0;return Math.hypot(p[0]-a[0]-t*x,p[1]-a[1]-t*y);};
function segmentDistance(a,b,c,d){
  const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  if(cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0&&Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]))<=Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0]))+EPS&&Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]))<=Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1]))+EPS)return 0;
  return Math.min(pointDistance(a,c,d),pointDistance(b,c,d),pointDistance(c,a,b),pointDistance(d,a,b));
}
function contains(p,polygon){let result=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];if(pointDistance(p,a,b)<EPS)return true;
  if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])result=!result;
}return result;}
function clipHeight(polygon,height,above){
  const result=[];for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length],insideA=above?a[1]>=height:a[1]<=height,insideB=above?b[1]>=height:b[1]<=height;
    if(insideA)result.push(a);if(insideA!==insideB){const t=(height-a[1])/(b[1]-a[1]);result.push(a.map((v,n)=>v+t*(b[n]-v)));}
  }return result;
}
export function transformCollisionShape(shape,matrix){
  const vertices=[];for(let i=0;i<shape.vertices.length;i+=3){const [x,y,z]=shape.vertices.slice(i,i+3);vertices.push([matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12],matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13],matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14]]);}
  const triangles=[];for(let i=0;i<shape.indices.length;i+=3)triangles.push(shape.indices.slice(i,i+3).map(index=>vertices[index]));
  return {triangles,closed:!!shape.closed};
}
function insideSolid(point,triangles){
  const hits=[];
  // Ray parity is used only for a checked watertight mesh. A cut pane without
  // closing faces must never acquire an invented solid volume in its opening.
  for(const [a,b,c]of triangles){
    const e1=b.map((v,i)=>v-a[i]),e2=c.map((v,i)=>v-a[i]),h=[0,-e2[2],e2[1]],det=e1.reduce((n,v,i)=>n+v*h[i],0);if(Math.abs(det)<1e-10)continue;
    const s=point.map((v,i)=>v-a[i]),u=s.reduce((n,v,i)=>n+v*h[i],0)/det;if(u< -EPS||u>1+EPS)continue;
    const q=[s[1]*e1[2]-s[2]*e1[1],s[2]*e1[0]-s[0]*e1[2],s[0]*e1[1]-s[1]*e1[0]],v=q[0]/det;if(v< -EPS||u+v>1+EPS)continue;
    const t=e2.reduce((n,value,i)=>n+value*q[i],0)/det;if(t>EPS)hits.push(t);
  }
  hits.sort((a,b)=>a-b);return hits.filter((v,i)=>i===0||v-hits[i-1]>EPS).length%2===1;
}
export function sweptCylinderClear(from,to,radius,minY,maxY,shape){
  const a=[from.x,from.y],b=[to.x,to.y];
  for(const triangle of shape.triangles){
    if(triangle.every(v=>v[1]<minY)||triangle.every(v=>v[1]>maxY))continue;
    const clipped=clipHeight(clipHeight(triangle,minY,true),maxY,false);if(!clipped.length)continue;
    const polygon=clipped.map(v=>[v[0],v[2]]);
    if(contains(a,polygon)||contains(b,polygon))return false;
    for(let i=0;i<polygon.length;i++)if(segmentDistance(a,b,polygon[i],polygon[(i+1)%polygon.length])<radius-EPS)return false;
  }
  if(shape.closed){const height=(minY+maxY)/2;if(insideSolid([from.x,height,from.y],shape.triangles)||insideSolid([to.x,height,to.y],shape.triangles))return false;}
  return true;
}
