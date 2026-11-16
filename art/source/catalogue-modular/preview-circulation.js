// Source-only static asset review. No simulator, player movement or gameplay commands.
import * as T from '../../../src/runtime/three.js';
import {createCatalogueStructureArt} from './thermal-art.js';
import {loadCharacterKit} from '../../../src/reuse/characters.js';
const errors=[];addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
const data=await fetch('../../../workbenches/catalogue-modular/house-data.json').then(r=>r.json());
const scene=new T.Scene();scene.background=new T.Color(0xd9cfb5);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(1400,1050);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;document.body.append(renderer.domElement);
const camera=new T.OrthographicCamera(-10,10,7.5,-7.5,.1,100);
const hemi=new T.HemisphereLight(0xfff1d4,0x6b7257,2.2);scene.add(hemi);
const sun=new T.DirectionalLight(0xffdfb9,3.0);sun.position.set(-6,17,-9);sun.target.position.set(5,1.8,3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14,near:.5,far:60});sun.shadow.bias=-.00015;sun.shadow.normalBias=.012;scene.add(sun,sun.target);
const groundGeometry=new T.PlaneGeometry(80,80),groundMaterial=new T.MeshStandardMaterial({color:0x8d9470,roughness:1}),ground=new T.Mesh(groundGeometry,groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.set(5,data.groundY,4);ground.receiveShadow=true;scene.add(ground);
const art=await createCatalogueStructureArt(T,{renderer,data,placement:{translation:[0,0,0],quarterTurns:0,sourceURL:new URL('../../../workbenches/catalogue-modular/house-data.json',import.meta.url).href}});scene.add(art.root);
const kits=[],actors=[];for(const species of ['bear','goat']){const kit=await loadCharacterKit({characterId:species,THREE:T,renderer,unarmed:true}),rig=kit.create();kits.push(kit);actors.push({species,rig});rig.setHeldVisible(false);scene.add(rig.root);}
let revision=0,current;
const views={
 exterior:{title:'Exterior — retained house and roof',detail:'Native paired 1 m door leaves; widened approach. No geometry omitted.',target:[5,2.6,3.1],eye:[18,12,-15],span:14.8,open:false,actors:[[5,.16,-3.1],[7.8,0,-3.0]]},
 entry:{title:'Open entry — native paired leaves',detail:'2.00 m portal height · 1.88 m between open leaf faces · 2.32 m stone approach',target:[5,1.5,-.5],eye:[10,4,-14],span:7.8,open:true,actors:[[5,.16,-3.1],[7.3,0,-2.9]]},
 stairs:{title:'Quarter-turn stair assembly',detail:'1.50 m clear bearing · 12 native rises · main floors 0.48 / 2.60 m; intermediate landing 1.54 m',target:[6.2,1.8,3.4],eye:[16,13,-8],span:10.8,open:true,actors:[[5.5,1.54,4.25],[5.5,.48,1.1]],study:true}
};
const manifest=await fetch('../../../workbenches/catalogue-modular/scene-data.json').then(r=>r.json()),keepLanding=new Set(manifest.instances.find(i=>i.id==='hopkins-fifteen').stairFlights.find(f=>f.upper.elevation===2.6).upper.surfaceIds),openingSurfaces=new Set(data.openings.map(o=>o.surfaceId));
function sourceVisible(s,v){if(!v.study)return true;if(s.kind==='roof'||s.kind==='wall'||openingSurfaces.has(s.id))return false;if(s.level===1&&s.kind==='floor')return keepLanding.has(s.id);if(s.level>=1)return false;if(s.kind==='attachment')return /stair|circulation150\/(?:mid|lower|upper|turn|front|parlor)|porch/.test(s.id);return true;}
function draw(name){const v=views[name];if(!v)throw Error('Unknown static view');current=name;revision++;
 const boundaries=data.surfaces.map(s=>({id:s.id,sourceSurfaceId:s.id,intact:sourceVisible(s,v),charFraction:0,heatFraction:0,openFraction:v.open&&data.navigation.entryDoorGroup.openingIds.some(id=>data.openings.find(o=>o.id===id)?.surfaceId===s.id)?1:0}));
 art.update({version:1,full:true,worldTime:0,revision,boundaries,items:data.items.map(i=>({id:i.id,intact:!v.study||i.level===0})),fireSamples:[],falls:[],rubble:[]},{mode:'exterior',level:0,effects:{flames:false,smoke:false,lighting:false}});
 actors.forEach(({rig},i)=>{const p=v.actors[i];rig.update({x:p[0],elevation:p[1],y:p[2],heading:-Math.PI/2,travelled:0,moving:false,tool:'matches'},0);rig.setHeldVisible(false);});
 camera.left=-v.span*4/3/2;camera.right=v.span*4/3/2;camera.top=v.span/2;camera.bottom=-v.span/2;camera.position.fromArray(v.eye);camera.lookAt(new T.Vector3(...v.target));camera.updateProjectionMatrix();camera.updateMatrixWorld();
 document.getElementById('view').textContent=v.title;document.getElementById('detail').textContent=v.detail+(v.study?' · envelope, other upper floors and upper furniture omitted':'');
 renderer.render(scene,camera);return {name,camera:{eye:v.eye,target:v.target,span:v.span},lighting:{hemisphere:2.2,sun:3,exposure:1.05},omissions:v.study?['Roof, walls and openings','Upper floors except actual exit landing','Upper furniture','Non-circulation trim']:[],groundDatum:{previewRevision:'h15-ground-datum-v2',sourceY:data.groundY,planeY:ground.position.y,stoneSolids:data.surfaces.filter(s=>s.supportType==='entry-step').map(s=>({id:s.id,physicalMinY:s.bounds.min[1],solidMinY:Math.min(...data.render.geometry.filter(g=>s.sourceMeshBindings.includes(g.id)).flatMap(g=>g.triangles.flatMap(t=>t.vertices.map(v=>v[1])))),topY:s.bounds.max[1]}))},actors:actors.map(({species,rig},i)=>{const body=rig.sampleBodyBounds(),feetY=rig.root.position.y+body.min[1],expectedSupportY=v.actors[i][1];return {species,nativeScale:rig.worker.root.scale.toArray(),body,position:rig.root.position.toArray(),feetY,expectedSupportY,supportError:feetY-expectedSupportY};}),diagnostics:art.diagnostics(),errors:[...errors]};
}
function dispose(){for(const kit of kits)kit.dispose();art.dispose();groundGeometry.dispose();groundMaterial.dispose();sun.shadow.dispose();sun.dispose();hemi.dispose();renderer.dispose();return {art:art.diagnostics().resources,kits:kits.map(k=>k.diagnostics()),errors};}
globalThis.__h15AssetPreview={draw,dispose,sourceVariant:data.navigation.gameAccessVariant.id};draw('exterior');
