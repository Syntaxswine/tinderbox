import assert from 'node:assert/strict';

// Single AVC video track, no B frames/audio. The WebCodecs encoder supplies the
// AVCDecoderConfigurationRecord and length-prefixed access units. Constant-rate
// timestamps are explicit; the real browser's decoder validates the result.
const cat=(...parts)=>Buffer.concat(parts.flat());
const u16=n=>{const b=Buffer.alloc(2);b.writeUInt16BE(n);return b;};
const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32BE(n>>>0);return b;};
const str=s=>Buffer.from(s,'ascii'),zero=n=>Buffer.alloc(n);
const box=(type,...payload)=>{const data=cat(...payload);return cat(u32(data.length+8),str(type),data);};
const full=(type,flags,...payload)=>box(type,u32(flags),...payload);
const matrix=()=>cat(...[0x10000,0,0,0,0x10000,0,0,0,0x40000000].map(u32));

export function muxAvcMp4({width,height,fps=30,description,samples}) {
  assert.ok(samples.length&&description?.length,'AVC samples and decoder config are required.');
  assert.ok(width>0&&width<65536&&height>0&&height<65536);
  assert.equal(samples[0].type,'key');
  for(let i=0;i<samples.length;i++)assert.ok(Math.abs(samples[i].timestamp-i*1e6/fps)<2,'Low-latency AVC output must retain input order.');
  const timescale=30000,durationPerSample=timescale/fps,duration=samples.length*durationPerSample;
  assert.ok(Number.isInteger(durationPerSample));
  const ftyp=box('ftyp',str('isom'),u32(512),str('isomiso2avc1mp41'));
  const compressor=Buffer.alloc(32),name=str('Tinderbox WebGL replay');compressor[0]=name.length;name.copy(compressor,1);
  const avc1=box('avc1',zero(6),u16(1),zero(16),u16(width),u16(height),u32(72*65536),u32(72*65536),u32(0),u16(1),compressor,u16(24),u16(65535),box('avcC',Buffer.from(description)));
  const keyframes=samples.flatMap((s,i)=>s.type==='key'?[i+1]:[]);
  const moov=offset=>box('moov',
    full('mvhd',0,u32(0),u32(0),u32(timescale),u32(duration),u32(65536),u16(256),zero(10),matrix(),zero(24),u32(2)),
    box('trak',full('tkhd',7,u32(0),u32(0),u32(1),u32(0),u32(duration),zero(8),u16(0),u16(0),u16(0),u16(0),matrix(),u32(width*65536),u32(height*65536)),
      box('mdia',full('mdhd',0,u32(0),u32(0),u32(timescale),u32(duration),u16(21956),u16(0)),
        full('hdlr',0,u32(0),str('vide'),zero(12),str('Tinderbox video\0')),
        box('minf',full('vmhd',1,zero(8)),box('dinf',full('dref',0,u32(1),full('url ',1))),
          box('stbl',full('stsd',0,u32(1),avc1),full('stts',0,u32(1),u32(samples.length),u32(durationPerSample)),
            full('stsc',0,u32(1),u32(1),u32(samples.length),u32(1)),
            full('stsz',0,u32(0),u32(samples.length),...samples.map(s=>u32(s.data.length))),
            full('stco',0,u32(1),u32(offset)),full('stss',0,u32(keyframes.length),...keyframes.map(u32)))))));
  const metadataSize=moov(0).length,metadata=moov(ftyp.length+metadataSize+8);
  return cat(ftyp,metadata,box('mdat',...samples.map(s=>s.data)));
}
