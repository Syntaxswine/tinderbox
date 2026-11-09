const directions=['right','lower right','bottom','lower left','left','upper left','top','upper right'];

// A vector toward the moving air, in the ground plan's +x right / +y down axes.
export function windView(wind){
  if(!Number.isFinite(wind?.x)||!Number.isFinite(wind?.y))return null;
  if(wind.x===0&&wind.y===0)return {angle:null,description:'Wind: calm.'};
  const angle=Math.atan2(wind.y,wind.x)*180/Math.PI;
  const direction=directions[(Math.round(angle/45)+8)%8];
  return {angle,description:'Wind blowing toward the '+direction+' of the ground plan.'};
}

export function mountWindIndicator(caption,wind){
  const reading=windView(wind);
  if(!reading)return;
  const plate=caption.ownerDocument.createElement('div');
  plate.className='tb-wind';
  plate.dataset.wind=reading.angle===null?'calm':'direction';
  plate.setAttribute('role','img');
  plate.setAttribute('aria-label',reading.description);
  plate.innerHTML='<svg viewBox="0 0 28 28" aria-hidden="true"><circle class="tb-wind-dial" cx="14" cy="14" r="11.5"/>'+
    '<path class="tb-wind-ticks" d="M14 3.5v2 M24.5 14h-2 M14 24.5v-2 M3.5 14h2"/>'+
    (reading.angle===null?'<circle class="tb-wind-mark" cx="14" cy="14" r="2"/>':
      '<path class="tb-wind-mark" d="M6.5 14l4-2.5v1.35h6V9.8l6 4.2-6 4.2v-3.05h-6v1.35Z"/>')+
    '</svg><span class="tb-wind-copy"><b>WIND</b>'+(reading.angle===null?'<small>Calm</small>':'')+'</span>';
  if(reading.angle!==null)plate.querySelector('.tb-wind-mark').setAttribute('transform','rotate('+reading.angle+' 14 14)');
  caption.append(plate);
}
