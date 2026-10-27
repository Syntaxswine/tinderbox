
export class Resources {
  constructor() { this.geometries=new Set();this.materials=new Set();this.textures=new Set();this.objects=new Set();this.closed=false; }
  geometry(value){this.geometries.add(value);return value;}
  material(value){this.materials.add(value);return value;}
  texture(value){this.textures.add(value);return value;}
  object(value){this.objects.add(value);return value;}
  dispose(){
    if(this.closed)return;this.closed=true;
    for(const item of this.objects)item.dispose?.();
    for(const item of this.geometries)item.dispose();
    for(const item of this.materials)item.dispose();
    for(const item of this.textures)item.dispose();
    this.objects.clear();this.geometries.clear();this.materials.clear();this.textures.clear();
  }
  counts(){return {geometries:this.geometries.size,materials:this.materials.size,textures:this.textures.size,objects:this.objects.size};}
}
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
export const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export function seedOf(value){let s=2166136261;for(const c of String(value))s=Math.imul(s^c.charCodeAt(0),16777619);return (s>>>0)/4294967296;}
export function removeTree(root){root?.removeFromParent();root?.clear();}
