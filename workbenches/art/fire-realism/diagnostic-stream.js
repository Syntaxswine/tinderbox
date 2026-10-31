// Workbench-only draw selection. The original factory and all source records
// remain intact; filtered renders are never reference/performance acceptance.
const anchor32 = '      float stepSize=(exit-entry)/32.;\n      for(int j=0;j<32;j++) {';
const anchor64 = '      float stepSize=(exit-entry)/64.;\n      for(int j=0;j<64;j++) {';
export function regional64Shader(source) {
  if (source.split(anchor32).length !== 2) throw new Error('Diagnostic64 requires exactly one known regional32 march block');
  return source.replace(anchor32, anchor64);
}

export function createFixtureStreamControl(T, effect) {
  const meshes = effect.root.children.filter(o => o.isMesh);
  if (meshes.length !== 1 || !meshes[0].geometry.attributes.iPolicy) throw Error('Unknown fire stream; refusing diagnostic filtering');
  const mesh = meshes[0], geometry = mesh.geometry, original = mesh.material;
  const derivedSource = regional64Shader(original.fragmentShader);
  let derived = null, closed = false, last = null;
  const instanced = () => Object.entries(geometry.attributes).filter(([, attribute]) => attribute.isInstancedBufferAttribute);
  function changed(attribute, count) {attribute.clearUpdateRanges(); if (count) attribute.addUpdateRange(0, count * attribute.itemSize); attribute.needsUpdate = true;}
  function material64() {
    if (!derived) {
      // Do NOT clone uniforms: their textures are owned/borrowed by the real
      // factory, not this disposable diagnostic material.
      derived = new T.ShaderMaterial({uniforms: original.uniforms, vertexShader: original.vertexShader, fragmentShader: derivedSource,
        defines: {...original.defines}, transparent: original.transparent, depthWrite: original.depthWrite, depthTest: original.depthTest,
        side: original.side, toneMapped: original.toneMapped, forceSinglePass: original.forceSinglePass, blending: original.blending,
        premultipliedAlpha: original.premultipliedAlpha, blendSrc: original.blendSrc, blendDst: original.blendDst, blendEquation: original.blendEquation,
        blendSrcAlpha: original.blendSrcAlpha, blendDstAlpha: original.blendDstAlpha, blendEquationAlpha: original.blendEquationAlpha});
      derived.name = original.name; // Keep Three's injected shader-name prefix identical too.
    }
    return derived;
  }
  function withSelection({layer = 'all', steps = 32} = {}, draw) {
    if (closed) throw Error('Disposed fixture stream control');
    if (!['all', 'flame', 'smoke'].includes(layer) || ![32, 64].includes(steps)) throw RangeError('Unknown fixture-only draw diagnostic');
    if (mesh.material !== original) throw Error('Original material was not restored');
    const count = geometry.instanceCount, attributes = instanced(), policy = geometry.attributes.iPolicy, ids = effect.diagnostics().sortedSemanticIds;
    const keep = Array.from({length: count}, (_, i) => i).filter(i => layer === 'all' || (layer === 'flame' ? policy.array[i * policy.itemSize] < .5 : policy.array[i * policy.itemSize] >= .5));
    const copies = layer === 'all' ? [] : attributes.map(([name, a]) => [name, a.array.slice(0, count * a.itemSize)]);
    last = {diagnosticOnly: true, layer, steps, originalInstances: count, submittedInstances: keep.length, selectedSemanticIds: keep.map(i => ids[i]),
      originalSourcesRetained: true, qualityAcceptance: false, performanceAcceptance: false};
    try {
      if (layer !== 'all') {
        for (const [name, source] of copies) {const a = geometry.attributes[name]; keep.forEach((index, i) => a.array.set(source.subarray(index * a.itemSize, (index + 1) * a.itemSize), i * a.itemSize)); changed(a, keep.length);}
        geometry.instanceCount = keep.length;
      }
      mesh.material = steps === 64 ? material64() : original;
      const result = draw();
      if (result?.then) throw Error('Fixture draw callback must be synchronous so restoration precedes the next frame');
      return result;
    } finally {
      mesh.material = original; geometry.instanceCount = count;
      for (const [name, values] of copies) {const a = geometry.attributes[name]; a.array.set(values); changed(a, count);}
      last.restoration = {materialRestored: mesh.material === original, instanceCountRestored: geometry.instanceCount === count, arraysRestored: copies.every(([name, values]) => values.every((v, i) => geometry.attributes[name].array[i] === v)), all32NoRewrite: layer === 'all' && steps === 32};
    }
  }
  return {withSelection, source32: original.fragmentShader, source64: derivedSource,
    diagnostics: () => last && {...last, selectedSemanticIds: [...last.selectedSemanticIds], restoration: last.restoration && {...last.restoration}},
    dispose() {if (closed) return; closed = true; mesh.material = original; derived?.dispose(); derived = null;}};
}
