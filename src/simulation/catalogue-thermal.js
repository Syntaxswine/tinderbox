// Compatibility boundary for the frozen Catalogue host and historical checks.
// Gameplay maps and Catalogue share the same physical provider implementation.
import {createSceneThermal} from './scene-thermal.js';
export {CATALOGUE_GRASS_PROFILE} from './scene-thermal.js';
export function createCatalogueThermal(options){return createSceneThermal(options);}
