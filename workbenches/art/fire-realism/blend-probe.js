// Explicit workbench unit probe, never a game render mode or cost measurement.
const vertex = 'void main(){gl_Position=vec4(position,1.);}';
const fragment = associated => `uniform vec3 linearColor;uniform float finalAlpha;
void main(){gl_FragColor=vec4(linearColor,finalAlpha);
#include <colorspace_fragment>
${associated ? 'gl_FragColor.rgb*=gl_FragColor.a;' : ''}
}`;

export function createFramebufferBlendProbe(T, renderer) {
  const gl = renderer.getContext(), scene = new T.Scene(), camera = new T.Camera();
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const uniforms = {linearColor: {value: new T.Vector3()}, finalAlpha: {value: 1}};
  const common = {uniforms, vertexShader: vertex, depthTest: false, depthWrite: false, toneMapped: false, forceSinglePass: true};
  const background = new T.ShaderMaterial({...common, fragmentShader: fragment(false), blending: T.NoBlending});
  const straight = new T.ShaderMaterial({...common, fragmentShader: fragment(false), transparent: true, blending: T.NormalBlending, premultipliedAlpha: false});
  const associated = new T.ShaderMaterial({...common, fragmentShader: fragment(true), transparent: true, blending: T.NormalBlending, premultipliedAlpha: true});
  const mesh = new T.Mesh(geometry, background); mesh.frustumCulled = false; scene.add(mesh);
  let closed = false;
  const parameter = name => ({name, value: gl.getParameter(gl[name])});
  const blendState = () => ({enabled: gl.isEnabled(gl.BLEND), values: ['BLEND_SRC_RGB', 'BLEND_DST_RGB', 'BLEND_SRC_ALPHA', 'BLEND_DST_ALPHA', 'BLEND_EQUATION_RGB', 'BLEND_EQUATION_ALPHA'].map(parameter)});
  function attachment(name) {
    if (!gl.getFramebufferAttachmentParameter) return {name, available: false};
    const value = gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.BACK, gl[name]), error = gl.getError();
    return {name, value, error, available: error === gl.NO_ERROR};
  }
  function run({redraw, colors = [.25, .75, 1.65], alphas = [.05, .25, .75], backgrounds = [0, .18, .65]} = {}) {
    if (closed) throw Error('Disposed blend probe');
    if (typeof redraw !== 'function') throw TypeError('A synchronous normal-scene redraw is required for probe restoration');
    if (renderer.getRenderTarget() !== null) throw Error('Probe requires the actual default framebuffer; no substitute target');
    if (renderer.toneMapping !== T.NoToneMapping || renderer.outputColorSpace !== T.SRGBColorSpace) throw Error('Probe requires the existing NoToneMapping/sRGB path; it will not change it');
    if (!colors.length || colors.length > 6 || !alphas.length || alphas.length > 6 || !backgrounds.length || backgrounds.length > 4 || colors.some(x => !Number.isFinite(x) || x < 0 || x > 1.65) || alphas.some(x => !Number.isFinite(x) || x <= 0 || x >= 1) || backgrounds.some(x => !Number.isFinite(x) || x < 0 || x > 1)) throw RangeError('Invalid bounded probe inputs');
    const saved = {viewport: renderer.getViewport(new T.Vector4()), scissor: renderer.getScissor(new T.Vector4()), scissorTest: renderer.getScissorTest(), autoClear: renderer.autoClear,
      toneMapping: renderer.toneMapping, outputColorSpace: renderer.outputColorSpace, exposure: renderer.toneMappingExposure, pixelRatio: renderer.getPixelRatio()};
    const initialError = gl.getError(); if (initialError !== gl.NO_ERROR) throw Error(`Pre-existing GL error${initialError}; probe not run`);
    const report = {diagnosticOnly: true, actualReadback: true, qualityAcceptance: false, performanceAcceptance: false, framebuffer: 'actual default; one physical scissored pixel, main resolution unchanged',
      sourceEncoding: 'Inputs linear RGB; colorspace_fragment encodes to current sRGB output; associated variant multiplies encoded RGB by final alpha afterward', readbackFormat: 'RGBA / UNSIGNED_BYTE from actual default framebuffer; raw integer components, no decoding',
      contextAttributes: gl.getContextAttributes?.() || null, componentBits: ['RED_BITS', 'GREEN_BITS', 'BLUE_BITS', 'ALPHA_BITS'].map(parameter),
      enumLegend: Object.fromEntries(['ONE', 'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA', 'LINEAR', 'SRGB', 'UNSIGNED_NORMALIZED', 'FLOAT'].map(name => [name, gl[name]])),
      attachment: [attachment('FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING'), attachment('FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE')],
      output: {toneMapping: saved.toneMapping, colorSpace: saved.outputColorSpace, exposure: saved.exposure}, blendBefore: blendState(), rows: []};
    try {
      renderer.autoClear = false; renderer.setScissor(0, 0, 1 / saved.pixelRatio, 1 / saved.pixelRatio); renderer.setScissorTest(true);
      for (const backdrop of backgrounds) for (const color of colors) for (const alpha of alphas) for (const [name, material] of [['straight', straight], ['associated-after-conversion', associated]]) {
        uniforms.linearColor.value.setScalar(backdrop); uniforms.finalAlpha.value = 1; mesh.material = background; renderer.render(scene, camera);
        uniforms.linearColor.value.setScalar(color); uniforms.finalAlpha.value = alpha; mesh.material = material; renderer.render(scene, camera);
        const rgba = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
        const error = gl.getError(); if (error !== gl.NO_ERROR) throw Error(`Actual framebuffer probe failed:${error}`);
        report.rows.push({linearBackdrop: backdrop, linearUnassociatedColor: color, finalAlpha: alpha, association: name, rgba: [...rgba], blend: blendState()});
      }
      return report;
    } finally {
      mesh.material = background; renderer.autoClear = saved.autoClear; renderer.setViewport(saved.viewport); renderer.setScissor(saved.scissor); renderer.setScissorTest(saved.scissorTest);
      if (renderer.toneMapping !== saved.toneMapping || renderer.outputColorSpace !== saved.outputColorSpace || renderer.toneMappingExposure !== saved.exposure || renderer.getPixelRatio() !== saved.pixelRatio) throw Error('Unexpected global output mutation during probe');
      redraw(); report.restoration = 'Public viewport/scissor/autoClear preserved; complete selected frozen scene redrawn. No conclusion is inferred from probe values.';
      report.blendAfterRedraw = blendState();
    }
  }
  return {run, shaderSources: {straight: straight.fragmentShader, associated: associated.fragmentShader},
    dispose() {if (closed) return; closed = true; scene.clear(); geometry.dispose(); for (const material of [background, straight, associated]) material.dispose();}};
}
