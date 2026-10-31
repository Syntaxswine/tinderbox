from pathlib import Path
import array,sys,hashlib,json,math
root=Path('artifacts/qa/fire-realism/mantaflow-surface-source/stage-2026-10-31-v5');raw=(root/'raw-manifest.json').read_bytes();assert hashlib.sha256(raw).hexdigest()=='dc257c0200ea12dcea9c48fdf711cb33e6de62ab989732c731cdd7099f16a4ce';manifest=json.loads(raw);grid=manifest['samples'][0];h=grid['voxelSize'][0];origin=grid['scalarCentreOriginBlender'];n=48*48*96

def load(frame,channel):
 r=manifest['samples'][frame-1]['channels'][channel];b=(root/r['path']).read_bytes();assert len(b)==r['bytes'] and hashlib.sha256(b).hexdigest()==r['sha256'];a=array.array('f');a.frombytes(b)
 if sys.byteorder!='little':a.byteswap()
 return a

def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)

def quant(values):
 values=sorted(values);return {str(q):values[round((len(values)-1)*q)]for q in [.1,.5,.9]}
for tick,f0 in [(30,15),(60,30),(120,60),(180,90)]:
 a,b=load(f0,'flame'),load(f0+1,'flame');F=[(a[i]+b[i])*.5 for i in range(n)];a,b=load(f0,'temperature'),load(f0+1,'temperature');T=[(a[i]+b[i])*.5 for i in range(n)]
 pts=[(F[i],T[i],max(0,min(1,T[i]/3)))for i in range(n)if F[i]>.001];total=sum(p[0]for p in pts);old=[(f,smooth(.2,.82,heat))for f,t,heat in pts];new=[(f,heat**4)for f,t,heat in pts]
 def stats(pairs):
  mean=sum(f*v for f,v in pairs)/total;return {'FweightedMean':mean,'FweightedStd':math.sqrt(sum(f*(v-mean)**2 for f,v in pairs)/total),'unweightedQuantiles':quant([v for f,v in pairs])}
 grad={'energy':0.,'basalEnergy':0.,'verticalEnergy':0.,'abovePoint2Energy':0.,'abovePoint2HorizontalEnergy':0.,'activeCells':0}
 for z in range(95):
  for y in range(47):
   base=48*(y+48*z)
   for x in range(47):
    i=base+x;c=[F[i],F[i+1],F[i+48],F[i+49],F[i+2304],F[i+2305],F[i+2352],F[i+2353]]
    if max(c)<=.001:continue
    gx=(c[1]-c[0]+c[3]-c[2]+c[5]-c[4]+c[7]-c[6])/(4*h);gy=(c[2]-c[0]+c[3]-c[1]+c[6]-c[4]+c[7]-c[5])/(4*h);gz=(c[4]-c[0]+c[5]-c[1]+c[6]-c[2]+c[7]-c[3])/(4*h);e=gx*gx+gy*gy+gz*gz;nativeY=origin[2]+(z+.5)*h
    grad['energy']+=e;grad['verticalEnergy']+=gz*gz;grad['activeCells']+=1
    if nativeY<.2:grad['basalEnergy']+=e
    else:grad['abovePoint2Energy']+=e;grad['abovePoint2HorizontalEnergy']+=gx*gx+gy*gy
 print(json.dumps({'nativeTick':tick,'sourceAge':tick/60-1/60,'rawFrames':[f0,f0+1],'mix':.5,'positiveFlameCentres':len(pts),'reactingTemperatureQuantiles':quant([t for f,t,heat in pts]),'FweightedWarmPlateauFraction':sum(f for f,t,heat in pts if heat>=.82)/total,'FweightedTempClampFraction':sum(f for f,t,heat in pts if t>=3)/total,'maxTempWhereFlame':max(t for f,t,heat in pts),'lookupControl':stats(old),'lookupColorOnlyPower4Hypothesis':stats(new),'analyticTrilinearCellMidpointGradient':{'cells':grad['activeCells'],'basalEnergyFraction':grad['basalEnergy']/grad['energy'],'verticalEnergyFraction':grad['verticalEnergy']/grad['energy'],'upperHorizontalEnergyFractionOfUpper':grad['abovePoint2HorizontalEnergy']/grad['abovePoint2Energy']},'scope':'Hash-checked fields, CPU-double scalar/gradient evidence; no camera ray integration, opaqueDepth, playerlegibility, LDR clamp or GPU/native acceptance'},indent=2))
