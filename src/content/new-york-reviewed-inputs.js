import {createSharedMapInputFactory,loadMapInputJSON} from './shared-map-inputs.js';
export const REVIEWED_NEW_YORK_INPUTS=Object.freeze([{"path":"assets/runtime/map-inputs/new-york/reviewed-cohort-v1/pilot-plan.json","sha256":"956b7a1bd16c641f6fcd6b9cc1c12ec25ccadd6d803caee5fb0d4513ecac15a2"},{"path":"assets/runtime/map-inputs/new-york/reviewed-cohort-v1/admission-policy.json","sha256":"f2ea997aaa44a877554c4a85d63eca7e9dff6deefdfed5ed3cabacdc6dd84215"},{"path":"assets/runtime/map-inputs/new-york/reviewed-cohort-v1/numerical-evidence.json","sha256":"211343cc29818f80e5c5c846983e960415100dd856e443e67b83b02ac9ecdb3d"}]);
// Explicit engineering intake only; normal entry never calls this loader.
export async function loadReviewedNewYorkInputs({signal,load=loadMapInputJSON}={}){
  signal?.throwIfAborted();const [descriptor,policy,numericalEvidence]=await Promise.all(REVIEWED_NEW_YORK_INPUTS.map(ref=>load(ref,signal)));signal?.throwIfAborted();
  return {descriptor,policy,numericalEvidence,inputFactory:createSharedMapInputFactory({descriptor,policy,loadProjection:load})};
}
