// Menu data stays independent of model/renderer loading.
const preview = id => new URL('../../assets/art/place-previews/'+id+'.jpg',import.meta.url).href;
export const PLACES = Object.freeze([
  {id:'catalogue-street',title:'Catalogue Street',description:'Explore the catalogue houses and play with matches, fuel trails and fire.',previewUrl:null},
  {id:'new-york',title:'New York State Building',description:'Visit the grounds, enter the main halls and climb between occupied floors.',previewUrl:preview('new-york')},
  {id:'administration',title:'Administration Building',description:'Explore the rotunda, pavilion rooms and connected galleries by their stairs.',previewUrl:preview('administration')},
  {id:'horticulture',title:'Horticultural Building',description:'Walk the waterfront terrace, garden halls and elevated galleries.',previewUrl:preview('horticulture')}
].map(place=>Object.freeze(place)));
