/** Frozen-data causal diagnostic, never an optimized or accepted fire mode. */
import {makeFluidShaders} from './shaders.js';
export const SMOKE_EXTINCTION_ASSIGNMENT='float smokeSigma=smoke*1.8;';
export const REACTION_DIAGNOSTIC_ASSIGNMENT='float smokeSigma=0.;';
export function makeReactionDiagnosticShaders(maxPlanes){
  const original=makeFluidShaders(maxPlanes);
  if(original.fragmentShader.split(SMOKE_EXTINCTION_ASSIGNMENT).length!==2)throw Error('Frozen All smoke assignment changed; refuse an ambiguous diagnostic');
  return {...original,fragmentShader:original.fragmentShader.replace(SMOKE_EXTINCTION_ASSIGNMENT,REACTION_DIAGNOSTIC_ASSIGNMENT)};
}
