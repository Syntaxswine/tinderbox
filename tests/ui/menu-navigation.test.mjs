import test from 'node:test';
import assert from 'node:assert/strict';
import {mountMenuNavigation} from '../../src/ui/menu-navigation.js';

// Finite DOM host: no browser, layout engine, renderer or background server.
// Native focus, touch geometry and keyboard activation remain combined review.
class Element extends EventTarget {
  constructor(tag,doc){super();this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.attributes=new Map();this.dataset={};}
  set textContent(value){this.text=String(value);this.textWrites=(this.textWrites||0)+1;}
  get textContent(){return this.text||'';}
  append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}
  setAttribute(name,value){this.attributes.set(name,String(value));}
  getAttribute(name){return this.attributes.get(name)??null;}
  remove(){if(this.parentElement){this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=null;}}
}
function host() {
  const doc={createElement:tag=>new Element(tag,doc)},root=doc.createElement('section'),calls=[];
  const control=mountMenuNavigation({root,placeTitle:'New York State Building',onView:value=>calls.push(value),mark:symbol=>'<svg data-mark="'+symbol+'"></svg>'});
  const group=root.children[0],buttons=group.children.filter(child=>child.tagName==='BUTTON');
  return {root,control,group,buttons,calls};
}
const navigation={characterName:'Goat',locationLabel:'Upper gallery',level:2,view:'follow'};
const activate=button=>button.dispatchEvent(new Event('click',{cancelable:true}));

test('overview and follow are native menu controls, hidden and disabled before host readiness',()=>{
  const s=host();
  assert.equal(s.group.hidden,true);assert.equal(s.group.getAttribute('aria-label'),'Place view');
  assert.deepEqual(s.buttons.map(button=>[button.type,button.disabled]),[['button',true],['button',true]]);
  s.buttons.forEach(activate);assert.deepEqual(s.calls,[]);
  assert.equal(s.group.children[0].children[0].textContent,'New York State Building');
  s.control.dispose();
});

test('capability and pause readiness independently gate commands, including stale clicks',()=>{
  const s=host();
  for(const [available,enabled] of [[false,false],[false,true],[true,false]]) {
    s.control.update(navigation,{available,enabled});assert.equal(s.group.hidden,!available);
    s.buttons.forEach(button=>{assert.equal(button.disabled,true);activate(button);});
  }
  assert.deepEqual(s.calls,[]);
  s.control.update(navigation,{available:true,enabled:true});s.buttons.forEach(activate);
  assert.deepEqual(s.calls,['view-overview','view-follow']);
  s.control.update(navigation,{available:false,enabled:true});s.buttons.forEach(activate);
  assert.equal(s.calls.length,2);
  s.control.dispose();
});

test('all three native character names and current host view update without issuing commands',()=>{
  const s=host(),nodes=[...s.buttons];
  for(const [characterName,view] of [['Goat','follow'],['Horse','overview'],['Bear',null]]) {
    const value=Object.freeze({...navigation,characterName,view}),before=JSON.stringify(value);
    s.control.update(value,{available:true,enabled:true});
    assert.deepEqual(s.buttons,nodes);assert.equal(s.group.children[0].children[2].textContent,'Upper gallery · '+characterName);
    assert.equal(s.buttons[1].getAttribute('aria-label'),'Follow the '+characterName.toLowerCase());
    assert.deepEqual(s.buttons.map(button=>button.getAttribute('aria-pressed')),[String(view==='overview'),String(view==='follow')]);
    assert.equal(JSON.stringify(value),before);
  }
  assert.deepEqual(s.calls,[]);s.control.dispose();
});

test('disposal removes its own menu section and silences retained nodes and updates',()=>{
  const s=host();s.control.update(navigation,{available:true,enabled:true});
  const sibling=s.root.ownerDocument.createElement('button');s.root.append(sibling);
  s.control.dispose();s.control.dispose();
  assert.deepEqual(s.root.children,[sibling]);
  s.control.update(navigation,{available:true,enabled:true});s.buttons.forEach(activate);assert.deepEqual(s.calls,[]);
});

test('unchanged snapshots preserve label text nodes and never write view commands',()=>{
  const s=host();s.control.update(navigation,{available:true,enabled:true});
  const textNodes=[s.group.children[0].children[2],...s.buttons.map(button=>button.children[0])];
  const writes=textNodes.map(node=>node.textWrites);
  for(let tick=0;tick<100;tick++)s.control.update({...navigation},{available:true,enabled:true});
  assert.deepEqual(textNodes.map(node=>node.textWrites),writes);assert.deepEqual(s.calls,[]);
  s.control.dispose();
});
