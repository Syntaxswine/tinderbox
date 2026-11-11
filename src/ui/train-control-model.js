export const TRAIN_GEARS = Object.freeze([
  Object.freeze({label:'Forward II',mark:'F II',direction:'forward',power:1}),
  Object.freeze({label:'Forward I',mark:'F I',direction:'forward',power:.5}),
  Object.freeze({label:'Neutral',mark:'N',direction:'neutral',power:0}),
  Object.freeze({label:'Reverse',mark:'R',direction:'reverse',power:.5})
]);

// Cross a little beyond the midpoint before leaving a notch.
export function trainDetent(position,current) {
  const bounded = Math.max(0,Math.min(3,position));
  const distance = bounded-current;
  if (Math.abs(distance) <= .62) return current;
  return Math.max(0,Math.min(3,Math.round(bounded-Math.sign(distance)*.12)));
}

export function trainGearOf(controls) {
  if (!controls || controls.brake > 0 || controls.direction === 'neutral') return 2;
  if (controls.direction === 'reverse') return 3;
  return controls.power > .75 ? 0 : 1;
}
