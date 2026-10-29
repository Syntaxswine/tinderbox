export const CHARACTERS=Object.freeze([
  {id:'goat',title:'Goat',description:'The original normal-painted Farmyard goat, at its native size.'},
  {id:'horse',title:'Horse',description:'The original normal-painted Farmyard horse, at its native size.'},
  {id:'bear',title:'Bear',description:'The current AFT bear with its original paint and native rig.'}
].map(character=>Object.freeze(character)));
export const DEFAULT_CHARACTER_ID='goat';
// Conservative source-native body envelopes, checked against evaluated gait and
// every fitted tool. No character geometry is resized to fit a common profile.
export const CHARACTER_PROFILES=Object.freeze({
  goat:Object.freeze({radius:.5,height:1.66,maxStep:.22,provisional:false}),
  horse:Object.freeze({radius:.5,height:1.66,maxStep:.22,provisional:false}),
  bear:Object.freeze({radius:.56,height:1.68,maxStep:.22,provisional:false})
});
