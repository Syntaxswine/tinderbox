// Authored period furnishing forms. Three and the shared metre-UV form builder are borrowed.
export function buildProp(T,f,parent,id,assetId,{labelText}={}){
 const g=f.group(parent,id,[0,0,0]);let serial=0;
 const name=n=>id+'/'+n,box=(n,w,h,d,x,y,z,s='wood')=>f.box(g,name(n),w,h,d,x,y,z,s);
 const cyl=(n,r,h,x,y,z,s='wood',segments=12)=>f.cylinder(g,name(n),r,r,h,x,y,z,s,segments);
 const lathe=(n,profile,x,y,z,s='wood',segments=12)=>f.lathe(g,name(n),profile,x,y,z,s,segments);
 function custom(n,key,make,x,y,z,s){
  if(!f.geometries.has(key)){const geo=make();if(!geo.attributes.normal)geo.computeVertexNormals();if(!geo.attributes.grossUV){const p=geo.attributes.position,n=geo.attributes.normal,uv=[];for(let i=0;i<p.count;i++){const a=Math.abs(n.getX(i)),b=Math.abs(n.getY(i)),c=Math.abs(n.getZ(i));uv.push(a>b&&a>c?p.getZ(i):p.getX(i),b>a&&b>c?p.getZ(i):p.getY(i));}geo.setAttribute('grossUV',new T.Float32BufferAttribute(uv,2));}geo.computeBoundingBox();geo.computeBoundingSphere();f.geometries.set(key,geo);}
  const m=new T.Mesh(f.geometries.get(key),f.interiorMaterials[s]);m.name=name(n);m.position.set(x,y,z);m.castShadow=!m.material.transparent;m.receiveShadow=true;m.userData={componentId:m.name,appearanceSlot:s,physicalMaterial:'unassigned'};g.add(m);f.meshes.push(m);f.components.push(m.name);return m;
 }
 const ell=(n,w,h,d,x,y,z,s='wood',detail=1)=>custom(n,'ell/'+[w,h,d,detail].join('/'),()=>new T.IcosahedronGeometry(1,detail).scale(w/2,h/2,d/2),x,y,z,s);
 function torus(n,r,t,x,y,z,s='brass',horizontal=false){const m=custom(n,'torus/'+r+'/'+t,()=>new T.TorusGeometry(r,t,6,24),x,y,z,s);if(horizontal)m.rotation.x=Math.PI/2;return m;}
 function beam(n,a,b,r=.025,s='wood',sides=8){const A=new T.Vector3(...a),B=new T.Vector3(...b),v=B.clone().sub(A),mid=A.clone().add(B).multiplyScalar(.5);const m=cyl(n,r,v.length(),...mid.toArray(),s,sides);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;}
 function leg(n,x,z,h=.7,s='wood'){lathe(n,[[.045,0],[.065,.04],[.04,.10],[.035,h*.45],[.06,h*.55],[.04,h*.7],[.05,h]],x,0,z,s,10);}
 function leaf(n,x,y,z,a,L=1.2){const m=custom(n,'fern-leaf/'+L,()=>{const p=[],point=(t,side)=>[side*.17*Math.sin(Math.PI*t)*(Math.floor(t*18)%2?.68:1),.65*Math.sin(Math.PI*t)-.2*t,L*t];for(let i=0;i<10;i++){const a=i/10,b=(i+1)/10;for(const v of [point(a,-1),point(a,1),point(b,1),point(a,-1),point(b,1),point(b,-1)])p.push(...v);}const G=new T.BufferGeometry();G.setAttribute('position',new T.Float32BufferAttribute(p,3));return G;},x,y,z,'foliage');m.rotation.y=a;return m;}
 function fern(n,x,y,z,L=1.2){cyl(n+'/stem',.04,.45,x,y+.225,z,'woodDark',8);for(let j=0;j<9;j++)leaf(n+'/leaf-'+j,x,y+.45,z,j*Math.PI*2/9,L);}
 function vase(n,x,y,z,r=.11,h=.25,s='ivory'){lathe(n,[[r*.6,0],[r,.03],[r,h*.55],[r*.45,h*.8],[r*.5,h]],x,y,z,s,12);}
 function books(n,x,y,z,count=12){for(let j=0;j<count;j++){const h=.24+(j%4)*.035;box(n+'/'+j,.105,h,.24,x+(j-(count-1)/2)*.135,y+h/2,z,['woodDark','red','wood','ink'][j%4]);box(n+'/'+j+'/band',.108,.018,.012,x+(j-(count-1)/2)*.135,y+h*.72,z-.127,'brass');}}
 function bottle(n,x,y,z,index=0){const h=.24+(index%3)*.035,r=.045+(index%2)*.008;lathe(n,[[r*.8,0],[r,.025],[r,h*.65],[r*.5,h*.8],[r*.5,h]],x,y,z,index%3?'glass':'red',10);cyl(n+'/cork',r*.5,.035,x,y+h+.01,z,'wood',8);box(n+'/label',r*1.4,.075,.008,x,y+h*.38,z-r-.003,'paper');}
 function chair(n,x=0,z=0,rotation=0,upholstered=false){const sub=f.group(g,name(n),[x,0,z],rotation);const b=(k,w,h,d,a,y,c,s='wood')=>f.box(sub,name(n+'/'+k),w,h,d,a,y,c,s);
  for(const a of [-.22,.22])for(const c of [-.22,.22])f.lathe(sub,name(n+'/leg-'+a+'-'+c),[[.026,0],[.043,.045],[.025,.20],[.035,.39],[.04,.47]],a,0,c,'wood',8);
  b('seat',.55,.09,.55,0,.50,0,upholstered?'velvet':'wood');b('seat-apron',.57,.09,.56,0,.43,0,'woodDark');
  for(const a of [-.23,.23])b('back-post-'+a,.045,.62,.045,a,.72,.24);
  b('crest',.55,.075,.07,0,1.015,.24);b('back-splat',upholstered?.42:.10,.33,.055,0,.80,.24,upholstered?'velvet':'wood');
  for(const a of [-.23,.23]){b('rung-'+a,.035,.035,.44,a,.24,0);if(upholstered)b('arm-'+a,.065,.065,.5,a,.76,0);}
  return sub;
 }
 function armchair(n,x=0,z=0,rotation=0){const s=f.group(g,name(n),[x,0,z],rotation),b=(k,w,h,d,a,y,c,slot='wood')=>f.box(s,name(n+'/'+k),w,h,d,a,y,c,slot);
  for(const a of [-.30,.30])for(const c of [-.29,.29])f.lathe(s,name(n+'/leg-'+a+'-'+c),[[.04,0],[.07,.06],[.045,.22],[.06,.42]],a,0,c,'wood',10);
  b('seat-frame',.8,.11,.8,0,.43,0);b('cushion',.7,.14,.68,0,.55,-.03,'velvet');b('back-velvet',.66,.61,.12,0,.91,.30,'velvet');
  for(const a of [-.36,.36]){b('back-post-'+a,.065,.89,.065,a,.77,.34);b('arm-'+a,.10,.09,.68,a,.79,-.03);b('arm-support-'+a,.05,.31,.05,a,.62,-.29);}
  b('crest',.79,.10,.14,0,1.21,.32);for(const a of [-.26,0,.26])for(const y of [.76,.94,1.10])s.add(ell(n+'/tuft-'+a+'-'+y,.025,.025,.025,a,y,.23,'brass',0));
 }
 function label(text,x,y,z,width=.8,height=.16,slot='ink'){
  const F={A:['0,0 .5,1 1,0','.2,.4 .8,.4'],B:['0,0 0,1 .65,1 1,.8 .65,.5 0,.5','.65,.5 1,.25 .65,0 0,0'],C:['1,.9 .7,1 .15,.85 0,.5 .15,.15 .7,0 1,.1'],D:['0,0 0,1 .6,1 1,.75 1,.25 .6,0 0,0'],E:['1,1 0,1 0,0 1,0','0,.5 .75,.5'],F:['1,1 0,1 0,0','0,.5 .8,.5'],G:['1,.85 .7,1 .15,.85 0,.5 .15,.15 .7,0 1,.15 1,.5 .55,.5'],H:['0,0 0,1','1,0 1,1','0,.5 1,.5'],I:['0,1 1,1','.5,1 .5,0','0,0 1,0'],J:['0,1 1,1','1,1 1,.2 .7,0 .2,0 0,.2'],K:['0,0 0,1','1,1 0,.45 1,0'],L:['0,1 0,0 1,0'],M:['0,0 0,1 .5,.45 1,1 1,0'],N:['0,0 0,1 1,0 1,1'],O:['.2,0 0,.25 0,.75 .2,1 .8,1 1,.75 1,.25 .8,0 .2,0'],P:['0,0 0,1 .75,1 1,.75 .75,.5 0,.5'],Q:['.2,0 0,.25 0,.75 .2,1 .8,1 1,.75 1,.25 .8,0 .2,0','.6,.25 1,0'],R:['0,0 0,1 .75,1 1,.75 .75,.5 0,.5','.5,.5 1,0'],S:['1,.9 .7,1 .15,.9 0,.65 .2,.5 .8,.5 1,.3 .85,.1 .3,0 0,.1'],T:['0,1 1,1','.5,1 .5,0'],U:['0,1 0,.2 .2,0 .8,0 1,.2 1,1'],V:['0,1 .5,0 1,1'],W:['0,1 .2,0 .5,.6 .8,0 1,1'],X:['0,0 1,1','0,1 1,0'],Y:['0,1 .5,.5 1,1','.5,.5 .5,0'],Z:['0,1 1,1 0,0 1,0'],' ':[]};
  const step=width/Math.max(1,text.length),cw=step*.72,thickness=height*.09;
  for(let k=0;k<text.length;k++)for(const stroke of F[text[k]]||[]){const points=stroke.split(' ').map(v=>v.split(',').map(Number));for(let q=1;q<points.length;q++){const a=points[q-1],b=points[q],dx=(b[0]-a[0])*cw,dy=(b[1]-a[1])*height,L=Math.hypot(dx,dy);if(!L)continue;const m=box('letter-'+serial++,thickness,L,.008,x+width/2-(k+.14)*step-(a[0]+b[0])*cw/2,y+(a[1]+b[1])*height/2,z,slot);m.rotation.z=Math.atan2(dx,dy);}}
 }
 function counter(){box('body',2,1.02,.74,0,.51,0);box('top',2.0,.09,.8,0,1.065,0,'woodDark');for(const x of [-.7,0,.7]){box('inset-'+x,.55,.67,.025,x,.52,-.39,'woodDark');box('panel-'+x,.49,.61,.027,x,.52,-.407,'wood');}
  for(const x of [-.93,.93])box('screen-post-'+x,.055,1.0,.055,x,1.61,.18,'brass');box('screen-top',1.9,.04,.04,0,2.09,.18,'brass');
  for(const x of [-.75,-.60,-.45,.45,.60,.75])box('screen-bar-'+x,.015,.9,.015,x,1.62,.18,'brass');box('wicket-rail',.7,.035,.035,0,1.48,.18,'brass');label(labelText||'POST',0,.63,-.43,.70,.14,'ivory');
 }
 function cabinet(kind){box('back',1.95,2.2,.045,0,1.15,.225,'woodDark');for(const x of [-.96,.96])box('side-'+x,.08,2.25,.5,x,1.125,0);box('plinth',2,.15,.5,0,.075,0,'woodDark');box('cornice',2,.11,.5,0,2.245,0,'woodDark');
  const rows=kind==='mail'?6:4;
  for(let j=0;j<=rows;j++)box('shelf-'+j,1.90,.04,.46,0,.35+j*(1.75/rows),0);
  if(kind==='mail'){
   for(let j=1;j<7;j++)box('divider-'+j,.025,1.75,.44,-.93+j*1.86/7,1.225,-.01);
   for(let a=0;a<7;a++)for(let b=0;b<6;b++)if((a+b)%3!==0)box('mail-'+a+'-'+b,.17,.025+(a%2)*.02,.25,-.80+a*.266,.39+b*.292,-.045,'paper');
  }else if(kind==='books')for(let j=0;j<4;j++)books('ledgers-'+j,0,.37+j*.4375,-.02,12);
  else{
   for(let row=0;row<4;row++)for(let col=0;col<8;col++)bottle('medicine-'+row+'-'+col,-.78+col*.223,.38+row*.4375,-.03,row+col);
   for(const x of [-.475,.475]){box('glass-door-'+x,.89,1.72,.015,x,1.23,-.245,'glass');for(const a of [-.43,.43])box('door-stile-'+x+'-'+a,.025,1.77,.035,x+a,1.23,-.26,'brass');box('knob-'+x,.035,.035,.05,x-Math.sign(x)*.38,1.18,-.29,'brass');}
  }
 }
 function display(width=2.2,rods=false){const depth=rods?.75:.85,H=rods?2.42:1.82;box('case-base',width-.12,.75,depth-.1,0,.49,0);box('case-foot',width,.14,depth,0,.07,0,'woodDark');box('case-sill',width,.10,depth,0,.90,0,'woodDark');
  const h=H-1.04;for(const x of [-width/2+.04,width/2-.04])for(const z of [-depth/2+.04,depth/2-.04])box('case-post-'+x+'-'+z,.045,h+.06,.045,x,1.0+h/2,z,'brass');
  for(const z of [-depth/2+.02,depth/2-.02])box('glass-face-'+z,width-.12,h,.015,0,.96+h/2,z,'glass');box('glass-lid',width-.10,.015,depth-.10,0,H-.08,0,'glass');box('case-cornice',width,.08,depth,0,H-.04,0);
  if(rods)for(let j=0;j<8;j++){const x=-1.25+j*.355;beam('rod-'+j,[x,1.0,.06],[x+.05,2.33,.08],.012,'woodDark',6);torus('reel-'+j,.065,.012,x,1.24,-.02,'brass');}
  else{for(let j=0;j<5;j++){ell('specimen-'+j,.27,.18,.16,-.78+j*.39,1.1,0,j%2?'stone':'brass',0);box('caption-'+j,.24,.015,.13,-.78+j*.39,.985,-.23,'paper');}}
 }
 function fish(n,x,y,z,variant=0){const outline=[[-.38,0],[-.22,.12],[.08,.17],[.33,.06],[.39,0],[.27,-.09],[-.12,-.12],[-.30,-.03],[-.48,-.16],[-.45,.15]];f.profile(g,name(n),outline,.11,x,y,z,variant?'ochre':'ivory');ell(n+'/eye',.035,.035,.015,x+.26,y+.045,z-.065,'ink',0);}
 function tank(kind){const inner=kind==='inner',w=kind==='small'?1.6:kind==='large'?3.2:4.74,d=inner?2.6:1.6;
  const poly=inner?[[-1.83,-1.3],[1.83,-1.3],[2.37,1.3],[-2.37,1.3]]:[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];
  f.prism(g,name('stone-plinth'),poly,.46,0,.23,0,'stone');f.prism(g,name('tank-bed'),poly,.10,0,.51,0,'soil');
  for(let j=0;j<poly.length;j++){const a=poly[j],b=poly[(j+1)%poly.length],A=[a[0],2.18,a[1]],B=[b[0],2.18,b[1]];beam('top-frame-'+j,A,B,.055,'woodDark');beam('bottom-frame-'+j,[a[0],.52,a[1]],[b[0],.52,b[1]],.05,'woodDark');beam('pier-'+j,[a[0],.46,a[1]],[a[0],2.6,a[1]],.075,'stone');
   const len=Math.hypot(b[0]-a[0],b[1]-a[1]),face=box('pane-'+j,len-.12,1.58,.025,(a[0]+b[0])/2,1.36,(a[1]+b[1])/2,(j===0||(inner&&j===2))?'glass':'woodDark');face.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);}
  f.prism(g,name('tank-canopy'),poly,.34,0,2.48,0,'woodDark');
  for(let j=0;j<(inner?5:kind==='large'?4:2);j++){const x=(j-((inner?5:kind==='large'?4:2)-1)/2)*.48;fish('fish-'+j,x,.93+(j%3)*.27,-.06,j%2);ell('submerged-rock-'+j,.35,.4,.30,x,.68,.35,'stone',0);}
  box('tank-water',inner?3.4:w-.24,.025,d-.22,0,1.96,0,'water');box('tank-label',Math.min(1.0,w-.3),.18,.03,0,.24,-d/2-.012,'ivory');label('FISH',0,.19,-d/2-.034,.68,.10);
 }
 switch(assetId){
 case 'renaissance-armchair':armchair('chair');break;
 case 'renaissance-settee':
  for(const x of [-1.02,1.02])for(const z of [-.28,.28])leg('leg-'+x+'-'+z,x,z,.42);
  box('seat-frame',2.38,.13,.82,0,.45,0);box('velvet-seat',2.16,.14,.70,0,.57,-.015,'velvet');box('back',2.18,.68,.12,0,.96,.34,'velvet');box('crest',2.35,.09,.15,0,1.275,.34);
  for(const x of [-1.12,1.12]){box('arm-'+x,.12,.10,.8,x,.83,0);box('arm-support-'+x,.07,.38,.07,x,.62,-.32);}
  for(let x=-.92;x<1.0;x+=.23)for(const y of [.82,1.05])ell('tuft-'+serial++,.025,.025,.025,x,y,.267,'brass',0);break;
 case 'banquet-table':
  for(const x of [-1.18,1.18])for(const z of [-.43,.43])leg('leg-'+x+'-'+z,x,z,.75);
  box('top',3.2,.09,1.2,0,.78,0,'woodDark');box('linen',3.15,.012,1.25,0,.831,0,'linen');for(const z of [-.61,.61])box('linen-drop-'+z,3.15,.18,.018,0,.74,z,'linen');
  for(const x of [-1.1,0,1.1])for(const z of [-.39,.39]){cyl('plate-'+serial++,.16,.018,x,.85,z,'ivory',16);cyl('glass-stem-'+serial++,.015,.10,x+.22,.91,z,'glass',8);vase('glass-cup-'+serial++,x+.22,.96,z,.04,.09,'glass');}
  vase('centre-vase',0,.85,0,.09,.20,'brass');break;
 case 'writing-desk':
  for(const x of [-.74,.74])for(const z of [-.31,.31])leg('leg-'+x+'-'+z,x,z,.73);
  box('top',1.8,.09,.9,0,.77,0,'woodDark');box('drawer',1.60,.18,.70,0,.65,.03);for(const x of [-.54,0,.54]){box('drawer-face-'+x,.49,.14,.035,x,.65,-.34);ell('knob-'+x,.055,.035,.04,x,.65,-.37,'brass',0);}
  box('writing-pad',.7,.01,.40,-.20,.82,-.08,'velvet');box('ledger',.36,.05,.29,.50,.845,.10,'red');box('ledger-pages',.32,.03,.28,.50,.86,.085,'paper');vase('ink-pot',-.63,.82,.23,.045,.07,'ink');beam('pen',[-.60,.89,.25],[-.48,1.10,.28],.008,'woodDark',6);break;
 case 'clerk-chair':chair('chair');break;
 case 'service-counter':counter();break;
 case 'pigeonhole-cabinet':cabinet('mail');break;
 case 'ledger-bookcase':cabinet('books');break;
 case 'pharmacy-cabinet':cabinet('pharmacy');break;
 case 'iron-cot':
  for(const x of [-.96,.96])for(const z of [-.38,.38])beam('post-'+x+'-'+z,[x,0,z],[x,1.05,z],.026,'iron');
  for(const z of [-.38,.38])beam('side-'+z,[-.96,.48,z],[.96,.48,z],.03,'iron');
  for(const x of [-.96,.96]){beam('end-'+x,[x,1.05,-.38],[x,1.05,.38],.03,'iron');for(const z of [-.24,0,.24])beam('end-bar-'+x+'-'+z,[x,.50,z],[x,1.05,z],.014,'iron');}
  box('mattress',1.85,.17,.78,0,.56,0,'linen');box('folded-blanket',1.18,.055,.81,.28,.68,0,'ivory');ell('pillow',.44,.16,.63,-.66,.70,0,'linen',1);break;
 case 'washstand':
  for(const x of [-.30,.30])for(const z of [-.20,.20])leg('leg-'+x+'-'+z,x,z,.76);box('marble-top',.82,.08,.62,0,.8,0,'ivory');
  lathe('basin',[[.11,0],[.21,.055],[.23,.10],[.22,.12],[.20,.10],[.10,.025]],-.1,.84,-.05,'ivory',20);vase('ewer',.22,.84,.1,.10,.34,'ivory');torus('ewer-handle',.085,.016,.31,1.03,.1,'ivory');break;
 case 'document-safe':
  box('case',1.35,1.8,.88,0,.92,0,'iron');box('base',1.35,.10,.9,0,.05,0,'woodDark');box('door',1.18,1.60,.065,0,.94,-.46,'woodDark');
  for(const x of [-.53,.53])for(let y=.25;y<1.7;y+=.22)ell('rivet-'+serial++,.035,.035,.025,x,y,-.505,'brass',0);
  torus('wheel',.20,.025,.16,1.02,-.52,'brass');for(let j=0;j<6;j++){const a=j*Math.PI/3;beam('spoke-'+j,[.16,1.02,-.52],[.16+.2*Math.cos(a),1.02+.2*Math.sin(a),-.52],.015,'brass');}break;
 case 'waiting-bench':
  for(const x of [-.82,.82])for(const z of [-.23,.23])leg('leg-'+x+'-'+z,x,z,.48);
  for(let j=0;j<4;j++)box('seat-slat-'+j,2.1,.045,.12,0,.50,-.225+j*.15);
  for(const x of [-.92,.92])box('back-post-'+x,.06,.65,.06,x,.70,.26);
  for(const y of [.70,.85,1.0])box('back-slat-'+y,2.1,.075,.045,0,y,.27);break;
 case 'marble-fireplace':
  box('hearth',2.4,.08,.64,0,.04,0,'ivory');box('firebox',1.3,1.65,.06,0,.91,.22,'ink');
  for(const x of [-.85,.85]){box('pier-'+x,.32,1.98,.48,x,1.06,0,'ivory');box('pier-inset-'+x,.18,1.50,.05,x,1.03,-.255,'stone');box('capital-'+x,.48,.15,.53,x,2.09,0,'ivory');}
  for(const [j,w]of [2.12,2.28,2.4].entries())box('mantel-'+j,w,.12,.58,0,2.20+j*.12,0,'ivory');ell('cartouche',.40,.22,.07,0,2.23,-.33,'brass',1);break;
 case 'electric-chandelier':
  lathe('stem',[[.11,0],[.18,.10],[.08,.2],[.07,1.3],[.15,1.55],[.06,1.9]],0,0,0,'brass');
  for(let j=0;j<6;j++){const a=j*Math.PI/3,x=Math.cos(a),z=Math.sin(a);beam('arm-a-'+j,[0,.85,0],[x*.62,.45,z*.62],.035,'brass');beam('arm-b-'+j,[x*.62,.45,z*.62],[x, .29,z],.035,'brass');cyl('cup-'+j,.14,.07,x,.27,z,'brass');ell('globe-'+j,.40,.40,.40,x,.49,z,'ivory',2);}
  for(const y of [1.95,2.06])torus('chain-'+y,.065,.012,0,y,0,'brass');break;
 case 'opal-pendant':
  cyl('stem',.026,.64,0,.71,0,'brass');lathe('cup',[[.10,0],[.17,.06],[.14,.12]],0,.45,0,'brass');ell('globe',.59,.59,.59,0,.30,0,'ivory',2);break;
 case 'opal-desk-lamp':
  lathe('column',[[.13,0],[.14,.035],[.08,.07],[.03,.10],[.03,.31],[.10,.35]],0,0,0,'brass');ell('globe',.32,.32,.32,0,.41,0,'ivory',2);break;
 case 'display-case':display();break;
 case 'rod-case':display(3.2,true);break;
 case 'cafe-table-set':
  cyl('round-top',.49,.07,0,.78,0,'woodDark',20);cyl('linen',.48,.012,0,.822,0,'linen',20);lathe('pedestal',[[.35,0],[.30,.06],[.06,.18],[.065,.72]],0,0,0);
  chair('left-chair',-1.05,0,-Math.PI/2);chair('right-chair',1.05,0,Math.PI/2);vase('flower-vase',0,.83,0,.065,.18,'glass');leaf('small-leaf',0,1.0,0,.8,.25);break;
 case 'fruit-stand':
  for(const x of [-1.7,1.7])for(const z of [-.5,.5])leg('leg-'+x+'-'+z,x,z,.68);
  for(let row=0;row<3;row++){const y=.76+row*.27,z=-.48+row*.46;box('tier-'+row,4,.075,.48,0,y,z,'woodDark');for(let j=0;j<15;j++){const x=-1.83+j*.26;ell('fruit-'+row+'-'+j,.17,.17,.17,x,y+.12,z,j%5===0?'red':j%3===0?'ivory':'fruit',0);}}
  for(const x of [-1.8,0,1.8])box('label-'+x,.25,.015,.15,x,1.39,.61,'paper');break;
 case 'orange-tower':{
  const profile=[[1.8,0],[1.8,.22],[1.55,.22],[1.55,.95],[1.28,.95],[1.28,1.2],[.76,1.2],[.76,4.65],[.95,4.65],[.95,4.92],[.65,4.92],[.65,5.50],[.78,5.50],[.78,5.72],[.22,6.25]];
  lathe('tower-core',profile,0,0,0,'woodDark',24);
  for(let y=.12;y<6.22;y+=.18){let radius=.22;for(let j=1;j<profile.length;j++)if(y>=profile[j-1][1]&&y<=profile[j][1]&&profile[j][1]>profile[j-1][1]){const t=(y-profile[j-1][1])/(profile[j][1]-profile[j-1][1]);radius=profile[j-1][0]+(profile[j][0]-profile[j-1][0])*t;break;}
   const count=Math.max(7,Math.floor(Math.PI*2*radius/.18));for(let j=0;j<count;j++){const a=j*Math.PI*2/count+(Math.floor(y/.18)%2)*.03,x=radius*Math.cos(a),z=radius*Math.sin(a);if(y<.95&&z<0&&Math.abs(x)<.45)continue;ell('orange-'+serial++,.16,.16,.16,x,y,z,'fruit',0);}}
  f.profile(g,name('arched-recess'),[[-.48,.05],[.48,.05],[.48,.57],[.36,.84],[0,.98],[-.36,.84],[-.48,.57]],.03,0,0,-1.63,'ink');box('exhibit-label',1.2,.45,.05,0,1.40,-.79,'ivory');label('CALIFORNIA',0,1.31,-.825,1.07,.18);break;}
 case 'potting-bench':
  for(const x of [-.9,.9])for(const z of [-.28,.28])leg('leg-'+x+'-'+z,x,z,.79);box('top',2.2,.10,.8,0,.85,0);box('shelf',2.0,.06,.66,0,.28,0,'woodDark');
  for(const x of [-.75,-.25,.25,.75]){vase('terracotta-'+x,x,.9,0,.15,.34,'red');cyl('soil-'+x,.11,.025,x,1.22,0,'soil');leaf('seedling-'+x,x,1.2,0,x,.3);}break;
 case 'wardian-case':
  for(const x of [-.74,.74])for(const z of [-.29,.29])leg('leg-'+x+'-'+z,x,z,.65);box('tray',1.8,.22,.85,0,.74,0);box('earth',1.63,.03,.68,0,.87,0,'soil');
  for(const x of [-.85,.85])for(const z of [-.39,.39])beam('corner-'+x+'-'+z,[x,.85,z],[x,1.72,z],.025,'brass');
  for(const z of [-.40,.40])box('pane-'+z,1.65,.82,.016,0,1.28,z,'glass');for(const x of [-.84,.84])box('end-pane-'+x,.016,.82,.75,x,1.28,0,'glass');
  for(const s of [-1,1]){const pane=box('roof-pane-'+s,1.72,.018,.54,0,1.89,s*.21,'glass');pane.rotation.x=s*.67;beam('ridge-'+s,[-.87,2.07,0],[.87,2.07,0],.022,'brass');}
  for(const x of [-.5,.35])fern('fern-'+x,x,.89,0,.44);break;
 case 'rock-grotto':{
  for(let j=0;j<14;j++){const a=j*Math.PI*2/14;if(Math.sin(a)<-.65)continue;const m=ell('basal-rock-'+j,2.9,2.7,3.0,4.3*Math.cos(a),1.35,4.3*Math.sin(a),'stone',1);m.rotation.y=-a;}
  for(const s of [-1,1]){ell('entry-rock-'+s,2.7,2.9,2.5,s*2.9,1.45,-3.9,'stone',1);box('portal-pier-'+s,.52,2.65,1.0,s*1.76,1.325,-4.0,'stone');}
  f.arch(g,name('cave-arch'),1.5,.65,1.1,0,2.62,-4.0,'stone');
  for(let j=0;j<10;j++){const a=j*Math.PI*2/10;ell('upper-rock-'+j,3.2,2.1,3.2,2.8*Math.cos(a),3.55,2.8*Math.sin(a),'stone',1);}
  ell('summit-rock',4.7,2.0,4.8,0,4.5,.5,'stone',1);
  for(const [j,v]of [[-4.1,2.5,-1.7],[4,2.4,-1.6],[-3.5,3.8,1.3],[3.5,3.8,1.5],[-1.8,4.8,.7],[1.5,4.8,1.3]].entries())fern('mound-fern-'+j,...v,1.7);
  for(const s of [-1,1])for(let j=0;j<4;j++){const x=s*(1.7+j*.13);cyl('crystal-'+s+'-'+j,.10,.65+j*.19,x,.5+j*.13,1.7,'ivory',5);ell('crystal-tip-'+s+'-'+j,.20,.30,.20,x,.85+j*.225,1.7,'ivory',0);}
  box('cave-sign',2.4,.40,.12,0,3.1,-4.63,'woodDark');box('cave-sign-ink',2.20,.25,.018,0,3.1,-4.70,'ivory');label('CRYSTAL CAVE',0,3.01,-4.715,2.06,.17);break;}
 case 'net-and-buoy-rack':
  for(const x of [-1.25,1.25]){box('post-'+x,.10,2.25,.12,x,1.125,.20);box('foot-'+x,.48,.09,.8,x,.045,0);}
  beam('crossbar',[-1.4,2.26,.20],[1.4,2.26,.20],.065,'wood');
  for(let j=0;j<15;j++){const x=-1.2+j*.17;beam('net-vertical-'+j,[x,.45+.16*Math.cos(x*2),-.04],[x,2.10,0],.009,'linen',5);}
  for(let j=0;j<10;j++){const y=.52+j*.165;beam('net-horizontal-'+j,[-1.2,y,-.04],[1.2,y,0],.009,'linen',5);}
  for(const x of [-1.15,1.15]){beam('buoy-rope-'+x,[x,2.20,.1],[x,1.1,.1],.014,'linen');ell('buoy-'+x,.28,.43,.28,x,1.1,.1,'ivory',1);cyl('buoy-band-'+x,.145,.08,x,1.13,.1,'red',12);}break;
 case 'skiff-on-cradle':{
  for(const x of [-1.45,1.45]){box('cradle-'+x,.19,.30,1.6,x,.15,0,'woodDark');for(const z of [-.48,.48])beam('support-'+x+'-'+z,[x,.20,z],[x,.63,z],.07,'woodDark');}
  const hull=[];for(const sign of [-1,1])for(let j=0;j<16;j++){const a=j/16,b=(j+1)/16,point=(t,u)=>[(t-.5)*4.8,.38+u*.70,sign*.7*Math.pow(Math.sin(Math.PI*t),.55)*u];for(const v of [point(a,0),point(b,0),point(b,1),point(a,0),point(b,1),point(a,1)])hull.push(...v);}
  custom('hull','skiff-hull',()=>{const both=[...hull];for(let j=0;j<hull.length;j+=9)both.push(...hull.slice(j,j+3),...hull.slice(j+6,j+9),...hull.slice(j+3,j+6));const G=new T.BufferGeometry();G.setAttribute('position',new T.Float32BufferAttribute(both,3));return G;},0,0,0,'wood');
  for(const sign of [-1,1])for(let j=0;j<16;j++){const a=j/16,b=(j+1)/16;beam('gunwale-'+sign+'-'+j,[(a-.5)*4.8,1.08,sign*.7*Math.pow(Math.sin(Math.PI*a),.55)],[(b-.5)*4.8,1.08,sign*.7*Math.pow(Math.sin(Math.PI*b),.55)],.035,'woodDark');}
  box('keel',4.5,.10,.10,0,.38,0,'woodDark');for(const x of [-1,0,1])box('thwart-'+x,.22,.08,1.05,x,.87,0,'woodDark');
  for(const z of [-.38,.38]){beam('oar-'+z,[-1.8,1.17,z],[1.9,1.17,z],.025,'wood');box('oar-blade-'+z,.55,.055,.20,1.55,1.17,z,'wood');}break;}
 case 'aquarium-small':tank('small');break;
 case 'aquarium-large':tank('large');break;
 case 'aquarium-inner':tank('inner');break;
 case 'aquarium-pool':
  lathe('coping',[[3.75,0],[4.1,0],[4.1,.65],[3.75,.65],[3.75,0]],0,0,0,'stone',48);cyl('pool-water',3.75,.045,0,.50,0,'water',48);cyl('pool-bottom',3.74,.06,0,.04,0,'soil',48);
  for(let j=0;j<9;j++){const a=j*Math.PI*2/9;ell('pool-rock-'+j,1.5,1.5,1.5,1.05*Math.cos(a),.85+((j%3)*.3),1.05*Math.sin(a),'stone',1);}ell('rock-crown',1.8,1.1,1.8,0,2.0,0,'stone',1);
  for(let j=0;j<16;j++){const a=j*Math.PI*2/16,x=1.4*Math.cos(a),z=1.4*Math.sin(a);beam('reed-'+j,[x,.5,z],[x*.93,1.7+(j%4)*.15,z*.93],.015,'foliage',5);}
  for(const s of [-1,1]){const waterfall=box('waterfall-'+s,.40,1.4,.035,s*.55,1.35,-.55,'water');waterfall.rotation.x=.2;}break;
 case 'wall-clock':{
  box('clock-case',.60,1.12,.20,0,.56,0,'woodDark');box('clock-glass',.33,.43,.016,0,.29,-.11,'glass');beam('pendulum',[0,.52,-.12],[0,.12,-.12],.012,'brass');ell('pendulum-bob',.16,.16,.03,0,.16,-.13,'brass',1);
  const dial=cyl('dial',.25,.025,0,.79,-.12,'ivory',32);dial.rotation.x=Math.PI/2;
  for(let j=0;j<12;j++){const a=j*Math.PI/6;box('mark-'+j,.018,.042,.014,.205*Math.sin(a),.79+.205*Math.cos(a),-.142,'ink');}
  const hand=box('hour-hand',.016,.18,.015,-.05,.83,-.154,'ink');hand.rotation.z=.9;const minute=box('minute-hand',.012,.21,.015,.065,.84,-.16,'ink');minute.rotation.z=-1.0;break;}
 case 'coffer-panel':
  box('ceiling-field',2,.05,2,0,.195,0,'ivory');for(const s of [-1,1]){box('frame-x-'+s,.08,.12,2,s*.94,.12,0,'brass');box('frame-z-'+s,1.8,.12,.08,0,.12,s*.94,'brass');box('inset-x-'+s,.04,.055,1.58,s*.78,.14,0,'wood');box('inset-z-'+s,1.58,.055,.04,0,.14,s*.78,'wood');}
  torus('rosette-ring',.38,.027,0,.08,0,'brass',true);for(let j=0;j<8;j++){const a=j*Math.PI/4;ell('rosette-leaf-'+j,.19,.04,.27,.22*Math.cos(a),.06,.22*Math.sin(a),'brass',1);}cyl('rosette-centre',.12,.045,0,.055,0,'brass',12);break;
 case 'classical-wall-panel':
  box('field',1.2,2.8,.035,0,1.4,.04,'ivory');for(const s of [-1,1])box('stile-'+s,.045,2.8,.07,s*.56,1.4,0,'brass');for(const y of [.06,2.74])box('rail-'+y,1.2,.065,.07,0,y,0,'brass');
  ell('cameo',.70,1.0,.055,0,1.6,-.02,'ochre',2);vase('amphora',0,.91,-.07,.12,.59,'brass');for(const s of [-1,1]){torus('vase-handle-'+s,.085,.015,s*.13,1.3,-.06,'brass');for(let j=0;j<5;j++)ell('garland-'+s+'-'+j,.10,.18,.04,s*(.21+j*.05),2.25-j*.06,-.02,'brass',1);}break;
 case 'rug':
  box('woven-field',3,.009,2,0,.0045,0,'velvet');for(const s of [-1,1]){box('border-x-'+s,.07,.003,1.9,s*1.42,.011,0,'brass');box('border-z-'+s,2.9,.003,.07,0,.011,s*.92,'brass');}
  for(const x of [-.9,-.45,0,.45,.9]){const d=box('diamond-'+x,.15,.002,.15,x,.013,0,'ivory');d.rotation.y=Math.PI/4;}break;
 default:throw Error('Unknown interior prop '+assetId);
 }
 return g;
}
