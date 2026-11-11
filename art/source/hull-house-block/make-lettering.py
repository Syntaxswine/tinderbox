"""Extract only the used outlines from the already pinned Besley font."""
from pathlib import Path
import json,hashlib,sys
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/"artifacts/stockyard-build-deps"))
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
ROOT=Path(__file__).resolve().parents[3]
fontpath=ROOT/'assets/art/ui/typography/besley/Besley[wght].ttf'
font=TTFont(fontpath);glyphs=font.getGlyphSet();cmap=font.getBestCmap();units=font['head'].unitsPerEm
class Outline(BasePen):
 def __init__(self):super().__init__(glyphs);self.contours=[];self.current=[]
 def _moveTo(self,p):self.current=[p]
 def _lineTo(self,p):self.current.append(p)
 def _curveToOne(self,p1,p2,p3):
  p0=self.current[-1]
  for i in range(1,9):
   t=i/8;u=1-t;self.current.append(tuple(u*u*u*p0[j]+3*u*u*t*p1[j]+3*u*t*t*p2[j]+t*t*t*p3[j] for j in range(2)))
 def _qCurveToOne(self,p1,p2):
  p0=self.current[-1]
  for i in range(1,9):
   t=i/8;u=1-t;self.current.append(tuple(u*u*p0[j]+2*u*t*p1[j]+t*t*p2[j] for j in range(2)))
 def _closePath(self):
  self.contours.append([[round(x/units,6),round(y/units,6)] for x,y in self.current]);self.current=[]
 def _endPath(self):self._closePath()
result={}
for c in sorted(set('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-')):
 name=cmap[ord(c)];pen=Outline();glyphs[name].draw(pen);result[c]={'advance':round(font['hmtx'].metrics[name][0]/units,6),'contours':pen.contours}
text='// Besley used-letter outline subset. Derived from the existing pinned OFL font.\n// Source and terms: assets/art/ui/typography/manifest.json and besley/OFL.txt.\nexport const LETTERS = '+json.dumps(result,separators=(',',':'))+';\n'
(ROOT/'art/source/hull-house-block/letters.js').write_text(text,encoding='utf8',newline='\n')
print(json.dumps({'glyphs':len(result),'fontSha256':hashlib.sha256(fontpath.read_bytes()).hexdigest(),'outputBytes':len(text)}))
