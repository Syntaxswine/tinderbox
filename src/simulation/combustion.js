import {clamp} from './geometry.js';

export function storedHeat(heat, incoming, cooling, seconds, limit) {
  return clamp(heat + incoming - cooling * seconds, 0, limit);
}

export function ignites(heat, threshold, fuel) {
  return fuel > 0 && heat >= threshold;
}
