import {createArtScene} from '../art/index.js';

// The common art factory remains the sole owner of models, effects and cleanup.
// Keep every borrowed object and callback intact; the coder supplies map structure.
export async function createSharedMapPresentation(args = {}) {
  if(!args || typeof args!=='object' || Array.isArray(args))throw new TypeError('Shared map presentation requires factory arguments.');
  const {artFactory=createArtScene,...ownerArgs}=args;
  if(!ownerArgs.gameplayMap || typeof ownerArgs.gameplayMap!=='object' || Array.isArray(ownerArgs.gameplayMap))
    throw new TypeError('Shared map presentation requires gameplayMap.');
  if(typeof ownerArgs.createMapStructureArt!=='function')
    throw new TypeError('Shared map presentation requires createMapStructureArt.');
  if(typeof artFactory!=='function')throw new TypeError('Shared map presentation requires an art factory.');
  return artFactory(ownerArgs);
}
