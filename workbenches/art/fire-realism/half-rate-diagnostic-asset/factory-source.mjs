/** Surgical source adaptation; optical generators themselves stay byte-identical.
 * No old factory is imported/evaluated and no old data singleton is constructed.
 */
const q=String.fromCharCode(39),imp=(names,file)=>'import '+names+' from '+q+'./'+file+q+';';
const one=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Unexpected frozen factory source term');return s.replace(a,b);};
export function diagnosticFactorySource(base){
 let s=base;
 const names={prepareFluidSurfaceContactData:'prepareHalfRateDiagnosticData',fluidSurfaceContactPayloadEvidence:'halfRateDiagnosticPayloadEvidence',auditFluidSurfaceContactRGBA:'auditHalfRateDiagnosticRGBA',createFluidSurfaceContactReference:'createHalfRateContactDiagnostic'};
 for(const [old,name]of Object.entries(names)){if(s.split(old).length!==2)throw Error('Frozen export changed');s=s.replace(old,name);}
 s=one(s,imp('{floorPrism}','floor.js'),imp('{floorPrism}','floor.js')+'\n'+imp('{emissionAbsorptionFragment,emissionVariantUniform,configureEmissionBlend}','emission-transfer.js')+'\n'+imp('{normalizedEmissionFragment}','normalization-transfer.js'));
 s=one(s,"'0.1.0-finite-surface-fluid-contact-prototype'","'0.1.0-half-rate-failed-terminal-diagnostic'");
 s=one(s,"root.name='Unaccepted V5 surface CFD contact'","root.name='Unaccepted exact cfe01 half-rate diagnostic'");
 s=one(s,"if(options.quality&&options.quality!=='reference')", "if(PRESENTATION.study?.id!=='cfe01-half-rate-terminal-diagnostic'||PRESENTATION.study.rawGatesPassed!==false||PRESENTATION.study.admitted!==false||FIELD_METADATA.source.rawManifestSha256!=='1a3bb8d2af92f6a9c7017ad37a49b76977baa227d94ae3a0cded781229a2c77e')throw Error('Exact failed diagnostic source identity required');\n  if(T?.ColorManagement?.workingColorSpace!==T.LinearSRGBColorSpace)throw Error('Fixed6r requires pinned linearSRGB primaries');\n  if(options.quality&&options.quality!=='reference')");
 s=one(s,'const shaders=makeFluidShaders(GEOMETRY_METRICS.maxHullVertices),slots=',"const original=makeFluidShaders(GEOMETRY_METRICS.maxHullVertices),shaders={vertexShader:original.vertexShader,fragmentShader:normalizedEmissionFragment(emissionAbsorptionFragment(original.fragmentShader,'smoke-only'),GEOMETRY_METRICS.maxHullVertices)},slots=");
 s=one(s,'const uniforms={...shared,planeCount:',"const uniforms={...shared,eaFlameExtinctionCoefficient:emissionVariantUniform('smoke-only'),planeCount:");
 s=one(s,'const mesh=new T.Mesh(geometry,material);','configureEmissionBlend(T,material);\n    const mesh=new T.Mesh(geometry,material);');
 const old="diagnostic:{variant:'all',opticalBaselineCommit:'edb3f44262cf2d401c37cdc3c783cf1356452767',scope:'Original All optical mapping; new V5 fields and explicitly floor-clipped support geometry'}";
 s=one(s,old,"diagnostic:{variant:'exact-half-rate-failed-terminal-fixed6r',study:structuredClone(PRESENTATION.study),rawGatesPassed:false,admitted:false,opticalControlCommit:'930553024d54297e4aeefb1cb33273de595a8eeb',fixedFlameEmissivity:6,scope:'Same fixed6r smoke-only optical generators, actual source clock/A/depth and two slots; distinct measured half-rate support. Unaccepted diagnostic only; no native quality/cost credit.'}");
 return s;
}
export function localNormalizationSource(original){
 const replacements=[[q+'./fluid-contact-surface/shaders.js'+q,q+'./shaders.js'+q],[q+'./fluid-surface-emission-transfer.js'+q,q+'./emission-transfer.js'+q]];
 let s=original;for(const [a,b]of replacements)s=one(s,a,b);return s;
}
