// Workbench-only draw selection. The original factory and all source records
// remain intact; filtered renders are never reference/performance acceptance.
const anchor32 = '      float stepSize=(exit-entry)/32.;\n      for(int j=0;j<32;j++) {';
const anchor64 = '      float stepSize=(exit-entry)/64.;\n      for(int j=0;j<64;j++) {';
export function regional64Shader(source) {
  if (source.split(anchor32).length !== 2) throw new Error('Diagnostic64 requires exactly one known regional32 march block');
  return source.replace(anchor32, anchor64);
}

// Workbench-only correct association: keep original linear E/A and final alpha
// (including player legibility), encode color, then associate by that final alpha.
export function associatedFieldShader(source) {
  const anchor = '#include <colorspace_fragment>';
  if (source.split(anchor).length !== 2 || source.split('gl_FragColor=vec4(emission/max(.0001,alpha),alpha*legibility);').length !== 2) throw Error('Unknown final field output; refusing association diagnostic');
  return source.replace(anchor, anchor + '\n    gl_FragColor.rgb*=gl_FragColor.a;');
}
function actualBlendState(renderer) {
  const gl = renderer.getContext();
  return {observedAt: 'actual fire mesh onAfterRender, before original material restoration', enabled: gl.isEnabled(gl.BLEND),
    values: ['BLEND_SRC_RGB', 'BLEND_DST_RGB', 'BLEND_SRC_ALPHA', 'BLEND_DST_ALPHA', 'BLEND_EQUATION_RGB', 'BLEND_EQUATION_ALPHA'].map(name => ({name, value: gl.getParameter(gl[name])})),
    enumLegend: {ONE: gl.ONE, SRC_ALPHA: gl.SRC_ALPHA, ONE_MINUS_SRC_ALPHA: gl.ONE_MINUS_SRC_ALPHA, FUNC_ADD: gl.FUNC_ADD}};
}

export function createFixtureStreamControl(T, effect) {
  const meshes = effect.root.children.filter(o => o.isMesh);
  if (meshes.length !== 1 || !meshes[0].geometry.attributes.iPolicy) throw Error('Unknown fire stream; refusing diagnostic filtering');
  const mesh = meshes[0], geometry = mesh.geometry, original = mesh.material;
  const derivedSource = regional64Shader(original.fragmentShader), associated32 = associatedFieldShader(original.fragmentShader), associated64 = associatedFieldShader(derivedSource), derived = new Map();
  let closed = false, last = null;
  const instanced = () => Object.entries(geometry.attributes).filter(([, attribute]) => attribute.isInstancedBufferAttribute);
  function changed(attribute, count) {attribute.clearUpdateRanges(); if (count) attribute.addUpdateRange(0, count * attribute.itemSize); attribute.needsUpdate = true;}
  function materialFor(steps, association) {
    if (steps === 32 && association === 'straight') return original;
    const key = `${association}-${steps}`;
    if (!derived.has(key)) {
      // Do NOT clone uniforms: their textures are owned/borrowed by the real
      // factory, not this disposable diagnostic material.
      const material = new T.ShaderMaterial({uniforms: original.uniforms, vertexShader: original.vertexShader, fragmentShader: association === 'associated' ? steps === 64 ? associated64 : associated32 : derivedSource,
        defines: {...original.defines}, transparent: original.transparent, depthWrite: original.depthWrite, depthTest: original.depthTest,
        side: original.side, toneMapped: original.toneMapped, forceSinglePass: original.forceSinglePass, blending: original.blending,
        premultipliedAlpha: association === 'associated' ? true : original.premultipliedAlpha, blendSrc: original.blendSrc, blendDst: original.blendDst, blendEquation: original.blendEquation,
        blendSrcAlpha: original.blendSrcAlpha, blendDstAlpha: original.blendDstAlpha, blendEquationAlpha: original.blendEquationAlpha});
      material.name = original.name; // Keep Three's injected shader-name prefix identical too.
      derived.set(key, material);
    }
    return derived.get(key);
  }
  function withSelection({layer = 'all', steps = 32, association = 'straight'} = {}, draw) {
    if (closed) throw Error('Disposed fixture stream control');
    if (!['all', 'flame', 'smoke'].includes(layer) || ![32, 64].includes(steps) || !['straight', 'associated'].includes(association)) throw RangeError('Unknown fixture-only draw diagnostic');
    if (mesh.material !== original) throw Error('Original material was not restored');
    const count = geometry.instanceCount, attributes = instanced(), policy = geometry.attributes.iPolicy, ids = effect.diagnostics().sortedSemanticIds;
    const keep = Array.from({length: count}, (_, i) => i).filter(i => layer === 'all' || (layer === 'flame' ? policy.array[i * policy.itemSize] < .5 : policy.array[i * policy.itemSize] >= .5));
    const copies = layer === 'all' ? [] : attributes.map(([name, a]) => [name, a.array.slice(0, count * a.itemSize)]);
    const originalAfterRender = mesh.onAfterRender;
    last = {diagnosticOnly: true, layer, steps, association, fieldDraw: null, originalInstances: count, submittedInstances: keep.length, selectedSemanticIds: keep.map(i => ids[i]),
      originalSourcesRetained: true, qualityAcceptance: false, performanceAcceptance: false};
    try {
      if (layer !== 'all') {
        for (const [name, source] of copies) {const a = geometry.attributes[name]; keep.forEach((index, i) => a.array.set(source.subarray(index * a.itemSize, (index + 1) * a.itemSize), i * a.itemSize)); changed(a, keep.length);}
        geometry.instanceCount = keep.length;
      }
      mesh.material = materialFor(steps, association);
      last.material = {original: mesh.material === original, blending: mesh.material.blending, premultipliedAlpha: mesh.material.premultipliedAlpha, finalAlphaIncludesLegibility: true, associationPoint: association === 'associated' ? 'after colorspace conversion, multiplied by final gl_FragColor.a' : 'unchanged straight RGB'};
      mesh.onAfterRender = function(renderer, ...args) {originalAfterRender.call(this, renderer, ...args); last.fieldDraw = actualBlendState(renderer);};
      const result = draw();
      if (result?.then) throw Error('Fixture draw callback must be synchronous so restoration precedes the next frame');
      return result;
    } finally {
      mesh.onAfterRender = originalAfterRender; mesh.material = original; geometry.instanceCount = count;
      for (const [name, values] of copies) {const a = geometry.attributes[name]; a.array.set(values); changed(a, count);}
      last.restoration = {materialRestored: mesh.material === original, instanceCountRestored: geometry.instanceCount === count, arraysRestored: copies.every(([name, values]) => values.every((v, i) => geometry.attributes[name].array[i] === v)), all32NoRewrite: layer === 'all' && steps === 32 && association === 'straight', afterRenderRestored: mesh.onAfterRender === originalAfterRender};
    }
  }
  return {withSelection, source32: original.fragmentShader, source64: derivedSource, sourceAssociated32: associated32, sourceAssociated64: associated64,
    diagnostics: () => last && {...structuredClone(last), cachedDerivedMaterials: derived.size, maximumDerivedMaterials: 3},
    dispose() {if (closed) return; closed = true; mesh.material = original; for (const material of derived.values()) material.dispose(); derived.clear();}};
}
