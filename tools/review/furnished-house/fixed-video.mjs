import fs from 'node:fs';
import {muxAvcMp4} from './mux-mp4.mjs';

export async function beginFixedVideo(page,{output,canvasSelector='#world',labelSelector='#qa-caption',title,fps=30,bitrate=5_000_000}) {
  const samples=[];let description;
  await page.exposeFunction('__qaAvcChunk',record=>{
    if(record.description)description=Buffer.from(record.description,'base64');
    samples.push({...record,data:Buffer.from(record.data,'base64')});
  });
  const configuration=await page.evaluate(async({canvasSelector,labelSelector,title,fps,bitrate})=>{
    if(!globalThis.VideoEncoder)throw Error('WebCodecs video encoding is unavailable.');
    const source=document.querySelector(canvasSelector),copy=document.createElement('canvas');
    copy.width=source.width;copy.height=source.height;
    const pen=copy.getContext('2d',{alpha:false}),writes=[];
    const config={codec:'avc1.420028',width:copy.width,height:copy.height,framerate:fps,bitrate,
      hardwareAcceleration:'prefer-hardware',latencyMode:'realtime',avc:{format:'avc'}};
    const support=await VideoEncoder.isConfigSupported(config);if(!support.supported)throw Error('Hardware AVC configuration unavailable.');
    let failure,order=0,frames=0;
    const base64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
    const encoder=new VideoEncoder({error:error=>{failure=error;},output:(chunk,metadata)=>{
      const data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);
      const description=metadata.decoderConfig?.description;
      writes.push(window.__qaAvcChunk({order:order++,timestamp:chunk.timestamp,type:chunk.type,data:base64(data),
        ...(description?{description:base64(new Uint8Array(description))}:{})}));
    }});encoder.configure(support.config);
    window.__qaFixedVideo={
      async frame(){
        if(failure)throw failure;
        pen.drawImage(source,0,0,copy.width,copy.height);
        pen.fillStyle='rgba(26,17,10,.9)';pen.fillRect(0,copy.height-44,copy.width,44);
        pen.fillStyle='#f6dfb8';pen.font='18px Georgia,serif';
        const label=[title,document.querySelector(labelSelector)?.textContent].filter(Boolean).join('  |  ');
        pen.fillText(label,20,copy.height-16,copy.width-40);
        const frame=new VideoFrame(copy,{timestamp:Math.round(frames*1e6/fps),duration:Math.round(1e6/fps)});
        try{encoder.encode(frame,{keyFrame:frames%(fps*2)===0});frames++;}finally{frame.close();}
        while(encoder.encodeQueueSize>6){await new Promise(resolve=>setTimeout(resolve,1));if(failure)throw failure;}
      },
      async finish(){try{await encoder.flush();await Promise.all(writes);if(failure)throw failure;return {frames,width:copy.width,height:copy.height,fps,config:support.config};}finally{encoder.close();}}
    };return support.config;
  },{canvasSelector,labelSelector,title,fps,bitrate});
  return {configuration,async finish(){
    const result=await page.evaluate(()=>window.__qaFixedVideo.finish());
    samples.sort((a,b)=>a.order-b.order);
    if(samples.length!==result.frames)throw Error('The encoder did not return every rendered frame.');
    const bytes=muxAvcMp4({width:result.width,height:result.height,fps,description,samples});
    fs.writeFileSync(output,bytes);return {...result,bytes:bytes.length,duration:result.frames/fps};
  }};
}
