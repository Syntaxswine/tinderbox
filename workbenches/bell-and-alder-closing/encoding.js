// MIME codec parameters can contain commas; only the base64 delimiter ends
// the header. FileReader and canvas data URLs share this payload grammar.
export function base64Payload(url){
  const marker=';base64,',index=typeof url==='string'?url.indexOf(marker):-1;
  if(!url?.startsWith('data:')||index<5)throw Error('Expected a base64 data URL');
  const payload=url.slice(index+marker.length);
  if(!payload||!/^[A-Za-z0-9+/]*={0,2}$/.test(payload)||payload.length%4)throw Error('Invalid base64 payload');
  return payload;
}
