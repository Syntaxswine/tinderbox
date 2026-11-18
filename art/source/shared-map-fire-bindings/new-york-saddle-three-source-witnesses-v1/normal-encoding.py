"""Recover only JSON-lost zero signs from immutable canonical hashes; no geometry math."""
from pathlib import Path
import json,hashlib,struct,itertools,sys
HERE=Path(__file__).resolve().parent;rows=[]
for name in ['cornice','roof-seat','top']:
 path='proof-'+name+'.json';raw=(HERE/path).read_bytes();proof=json.loads(raw);q=proof['geometryWitness']
 for side,n,h in zip(['parent','child'],q['normals'],q['canonicalNormalFloat64LittleEndianSha256']):
  zero=[i for i,v in enumerate(n) if v==0];matches=[]
  for signs in itertools.product([0.0,-0.0],repeat=len(zero)):
   candidate=list(n)
   for i,v in zip(zero,signs):candidate[i]=v
   encoded=struct.pack('<ddd',*candidate)
   if hashlib.sha256(encoded).hexdigest()==h:matches.append((candidate,encoded))
  assert len(matches)==1
  candidate,encoded=matches[0]
  rows.append({'proof':path,'proofSha256':hashlib.sha256(raw).hexdigest(),'endpoint':side,'canonicalNormalSha256':h,
   'canonicalNormalBinary64LittleEndianHex':encoded.hex(),'negativeZeroComponentIndices':[i for i,v in enumerate(candidate) if v==0 and struct.pack('<d',v).hex()=='0000000000000080']})
report={'version':1,'purpose':'Exact serialization appendix. JSON numeric arrays normalize negative zero. These bytes reproduce the canonical hashes already frozen in the three proofs; no normal/point/geometry/predicate was recomputed or changed.','endpoints':rows,'sourceTransforms':0,'contactQueries':0}
if '--write' in sys.argv:
 with (HERE/'normal-encoding.json').open('xb') as f:f.write((json.dumps(report,separators=(',',':'))+'\n').encode())
else:assert report==json.loads((HERE/'normal-encoding.json').read_bytes())
print(json.dumps({'result':'SIX_CANONICAL_NORMAL_ENCODINGS_MATCH_FROZEN_HASHES','endpoints':6,'negativeZeroEndpoints':sum(bool(r['negativeZeroComponentIndices']) for r in rows),'geometryWork':0}))
