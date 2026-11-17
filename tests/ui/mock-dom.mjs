// Finite DOM/event host for mounted UI input checks. It does not load styles,
// fetch assets, calculate layout or emulate native browser key/click defaults.
const dataName=name=>'data-'+name.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
class Node extends EventTarget {
  constructor(doc){super();this.ownerDocument=doc;this.childNodes=[];this.parentNode=null;}
  get parentElement(){return this.parentNode instanceof Element?this.parentNode:null;}
  get children(){return this.childNodes.filter(node=>node instanceof Element);}
  get firstChild(){return this.childNodes[0]??null;}
  get isConnected(){return this.ownerDocument.documentElement.contains(this);}
  contains(node){return node===this||this.childNodes.some(child=>child.contains(node));}
  append(...nodes){for(let node of nodes){if(typeof node==='string')node=new Text(node,this.ownerDocument);node.remove();node.parentNode=this;this.childNodes.push(node);}}
  prepend(...nodes){const prior=[...this.childNodes];this.replaceChildren(...nodes,...prior);}
  replaceChildren(...nodes){for(const node of this.childNodes)node.parentNode=null;this.childNodes=[];this.append(...nodes);}
  remove(){if(this.parentNode){this.parentNode.childNodes=this.parentNode.childNodes.filter(node=>node!==this);this.parentNode=null;}}
  get textContent(){return this.childNodes.map(node=>node.textContent).join('');}
  set textContent(value){this.replaceChildren(...(String(value)?[new Text(String(value),this.ownerDocument)]:[]));}
}
class Text extends Node {
  constructor(value,doc){super(doc);this.value=value;}
  get textContent(){return this.value;}
  set textContent(value){this.value=String(value);}
}
function simpleMatch(node,selector){
  if(!(node instanceof Element))return false;
  const tag=selector.match(/^[\w-]+/);if(tag&&node.tagName!==tag[0].toUpperCase())return false;
  const id=selector.match(/#([\w-]+)/);if(id&&node.id!==id[1])return false;
  for(const [,name] of selector.matchAll(/\.([\w-]+)/g))if(!node.classList.contains(name))return false;
  for(const [,name,,quoted,bare] of selector.matchAll(/\[([^\s=\]]+)(?:=(["'])(.*?)\2|=([^\]]+))?\]/g)){
    if(!node.hasAttribute(name))return false;
    if((quoted!==undefined||bare!==undefined)&&node.getAttribute(name)!==(quoted??bare))return false;
  }
  return true;
}
function matches(node,selector){
  return selector.split(',').some(part=>{
    const tokens=part.trim().replaceAll('>',' > ').split(/\s+/);
    function at(element,index){
      if(!simpleMatch(element,tokens[index]))return false;
      if(index===0)return true;
      if(tokens[index-1]==='>')return at(element.parentElement,index-2);
      for(let parent=element.parentElement;parent;parent=parent.parentElement)if(at(parent,index-1))return true;
      return false;
    }
    return at(node,tokens.length-1);
  });
}
class Element extends Node {
  constructor(tag,doc){
    super(doc);this.tagName=tag.toUpperCase();this.attributes=new Map();this.disabled=false;this.checked=false;
    this.style={setProperty(name,value){this[name]=String(value);}};
    this.dataset=new Proxy({}, {set:(target,name,value)=>{target[name]=String(value);this.attributes.set(dataName(name),String(value));return true;}});
  }
  get id(){return this.getAttribute('id')??'';}
  set id(value){this.setAttribute('id',value);}
  get className(){return this.getAttribute('class')??'';}
  set className(value){this.setAttribute('class',value);}
  get hidden(){return this.hasAttribute('hidden');}
  set hidden(value){this.toggleAttribute('hidden',value);}
  get classList(){
    const classes=()=>new Set(this.className.split(/\s+/).filter(Boolean));
    return {
      contains:name=>classes().has(name),
      add:(...names)=>{const next=classes();names.forEach(name=>next.add(name));this.className=[...next].join(' ');},
      remove:(...names)=>{const next=classes();names.forEach(name=>next.delete(name));this.className=[...next].join(' ');},
      toggle:(name,force)=>{const next=classes(),enabled=force??!next.has(name);if(enabled)next.add(name);else next.delete(name);this.className=[...next].join(' ');return enabled;}
    };
  }
  setAttribute(name,value){
    this.attributes.set(name,String(value));
    if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);
    if(name==='disabled')this.disabled=true;
  }
  getAttribute(name){return this.attributes.get(name)??null;}
  hasAttribute(name){return this.attributes.has(name);}
  removeAttribute(name){this.attributes.delete(name);if(name==='disabled')this.disabled=false;}
  toggleAttribute(name,force){const next=force??!this.hasAttribute(name);if(next)this.setAttribute(name,'');else this.removeAttribute(name);return next;}
  querySelectorAll(selector){
    const found=[];const visit=node=>{for(const child of node.children){if(matches(child,selector))found.push(child);visit(child);}};visit(this);return found;
  }
  querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
  closest(selector){for(let node=this;node;node=node.parentElement)if(matches(node,selector))return node;return null;}
  set innerHTML(value){this.replaceChildren(...parse(String(value),this.ownerDocument));}
  insertAdjacentHTML(position,value){
    if(position!=='afterbegin')throw Error('Unsupported finite DOM insertion');
    this.prepend(...parse(String(value),this.ownerDocument));
  }
  focus(){this.ownerDocument.activeElement=this;}
  click(){if(!this.disabled)this.dispatchEvent(event('click',{detail:0}));}
  setPointerCapture(id){this.capture=id;}
  hasPointerCapture(id){return this.capture===id;}
  releasePointerCapture(){this.capture=null;}
}
function parse(source,doc){
  const container=new Element('fragment',doc),stack=[container],voidTags=new Set(['br','input','link','hr','meta','img']);
  for(const token of source.matchAll(/<\/?([\w:-]+)([^>]*)>|([^<]+)/g)){
    if(token[3]!==undefined){stack.at(-1).append(new Text(token[3],doc));continue;}
    const tag=token[1].toLowerCase();
    if(token[0].startsWith('</')){while(stack.length>1){if(stack.pop().tagName.toLowerCase()===tag)break;}continue;}
    const node=new Element(tag,doc);
    for(const [,name,a,b,c] of token[2].matchAll(/([^\s=\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))node.setAttribute(name,a??b??c??'');
    stack.at(-1).append(node);
    if(!voidTags.has(tag)&&!token[0].endsWith('/>'))stack.push(node);
  }
  return [...container.childNodes];
}
export function event(type,properties={}){
  const value=new Event(type,{cancelable:true});
  for(const [name,property] of Object.entries(properties))Object.defineProperty(value,name,{value:property});
  return value;
}
export function createInputDOM(){
  const win=new EventTarget();win.Node=Node;
  const doc=new EventTarget();doc.defaultView=win;doc.hidden=false;
  doc.createElement=tag=>new Element(tag,doc);doc.createElementNS=(_ns,tag)=>doc.createElement(tag);
  doc.documentElement=doc.createElement('html');doc.body=doc.createElement('body');doc.documentElement.append(doc.body);doc.activeElement=doc.body;
  const root=doc.createElement('div');doc.body.append(root);
  return {root,doc,win,key(type,code,extra={}){return win.dispatchEvent(event(type,{code,repeat:false,...extra}));}};
}
