// Full-draw muzzle in the native goat's standing frame. The arm pose fits the
// original pistol to this point, so sight, ballistics and art agree at release.
export function patrolMuzzle(actor) {
  const forward = .55, right = .23;
  const cos = Math.cos(actor.heading), sin = Math.sin(actor.heading);
  return {x: actor.x + forward * cos - right * sin, y: actor.y + forward * sin + right * cos, h: 1.23};
}
