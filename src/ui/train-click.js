// A short mechanical click made locally, with no downloaded sound asset.
export function createTrainClick(win,{muted=false}={}) {
  let context=null,disposed=false,played=0;
  const voices=new Set();
  function stop() {
    for (const voice of voices) {
      try { voice.source.stop(); } catch {}
      voice.source.disconnect();voice.gain.disconnect();
    }
    voices.clear();
  }
  return {
    unlock(event) {
      if (disposed || muted || !event.isTrusted) return;
      try {
        const Audio=win.AudioContext||win.webkitAudioContext;
        if (!context && Audio) context=new Audio();
        if (context?.state==='suspended') context.resume().catch(()=>{});
      } catch {}
    },
    click() {
      if (disposed || muted || context?.state!=='running') return false;
      try {
        const now=context.currentTime,source=context.createOscillator(),gain=context.createGain();
        source.type='triangle';source.frequency.setValueAtTime(850,now);
        source.frequency.exponentialRampToValueAtTime(120,now+.035);
        gain.gain.setValueAtTime(.075,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.045);
        source.connect(gain);gain.connect(context.destination);
        const voice={source,gain};voices.add(voice);
        source.onended=()=>{source.disconnect();gain.disconnect();voices.delete(voice);};
        source.start(now);source.stop(now+.05);played++;return true;
      } catch { return false; }
    },
    setMuted(value) { muted=Boolean(value);if(muted)stop(); },
    get state() { return {muted,played,state:context?.state||'unopened',voices:voices.size}; },
    dispose() { if(disposed)return;disposed=true;stop();context?.close().catch(()=>{}); }
  };
}
