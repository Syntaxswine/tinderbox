// Fire-specific depth preparation. Uses the actual materials (including alphaTest),
// current visibility and current ghosting state; never substitutes solid boxes.
export function createOpaqueSceneDepth(T, renderer, scene, excludedRoots = []) {
  const target = new T.WebGLRenderTarget(1, 1, {minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthBuffer:true,stencilBuffer:false});
  target.texture.name = 'Fire depth preparation color (not composited)';
  target.depthTexture = new T.DepthTexture(1, 1, T.UnsignedIntType);
  target.depthTexture.minFilter = target.depthTexture.magFilter = T.NearestFilter;
  target.depthTexture.name = 'Borrowed actual opaque scene depth';
  let closed = false, frames = 0, record = null;
  const size = new T.Vector2(), vp = new T.Matrix4();
  function prepare(camera) {
    if (closed) throw Error('Opaque scene depth disposed');
    renderer.getDrawingBufferSize(size);
    const width=Math.max(1,Math.floor(size.x)),height=Math.max(1,Math.floor(size.y));
    if (target.width!==width || target.height!==height) target.setSize(width,height);
    const hidden = new Map(), materials = new Map();
    const saved = {target:renderer.getRenderTarget(),autoClear:renderer.autoClear,shadowAutoUpdate:renderer.shadowMap?.autoUpdate,
      viewport:renderer.getViewport(new T.Vector4()),scissor:renderer.getScissor(new T.Vector4()),scissorTest:renderer.getScissorTest()};
    const hide = object => {if (!hidden.has(object)) hidden.set(object,object.visible);object.visible=false;};
    try {
      for (const root of excludedRoots) hide(root);
      scene.traverse(object => {
        for (const material of [object.material].flat().filter(Boolean)) {
          if (material.transparent || material.opacity < 1 || material.depthWrite===false) {
            if (!materials.has(material)) materials.set(material,material.visible);
            material.visible=false;
          }
        }
      });
      if(renderer.shadowMap)renderer.shadowMap.autoUpdate=false;
      renderer.autoClear=true;renderer.setRenderTarget(target);renderer.setViewport(0,0,width,height);renderer.setScissorTest(false);
      renderer.clear(true,true,true);renderer.render(scene,camera);
      camera.updateMatrixWorld();vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
      record={valid:true,texture:target.depthTexture,width,height,convention:'webgl-depth-0-1',
        viewProjectionMatrix:vp.toArray(),projectionMatrixInverse:camera.projectionMatrixInverse.toArray(),cameraWorldMatrix:camera.matrixWorld.toArray()};
      frames++;return record;
    } finally {
      for(const [material,visible]of materials)material.visible=visible;
      for(const [object,visible]of hidden)object.visible=visible;
      renderer.setRenderTarget(saved.target);renderer.setViewport(saved.viewport);renderer.setScissor(saved.scissor);renderer.setScissorTest(saved.scissorTest);
      renderer.autoClear=saved.autoClear;if(renderer.shadowMap)renderer.shadowMap.autoUpdate=saved.shadowAutoUpdate;
    }
  }
  return {prepare,diagnostics:()=>({frames,width:target.width,height:target.height,disposed:closed,
    bytesEstimate:target.width*target.height*8,estimateBasis:'RGBA8 color plus unsigned-int depth, driver overhead excluded',
    method:'Actual visible opaque/depth-writing materials; alpha-tested holes preserved; transparent/faded materials excluded'}),
    dispose(){if(closed)return;closed=true;record=null;target.dispose();target.depthTexture.dispose();}};
}
