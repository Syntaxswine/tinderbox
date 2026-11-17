"""Exact convex-mask union acceleration; original half-plane clip counter is untouched."""
from collections import Counter
from time import monotonic

HELPER_CAPS={"calls":20000000,"bboxTests":2000000,"edgePredicates":8000000,
             "canonicalInputRecords":200000,"canonicalVertices":2000000,"cacheEntries":50000}

class ExactUnion:
    def __init__(self,G):
        self.G=G;self.base_intersection=G.intersection;self.base_difference=G.difference
        self.counts=Counter();self.cache={};self.unions=[];self.inputs=[]
    def tick(self,name,n=1):
        self.counts["calls"]+=n;self.counts[name]+=n
        assert self.counts["calls"]<=HELPER_CAPS["calls"],"Additional helper call cap"
        if name in HELPER_CAPS:assert self.counts[name]<=HELPER_CAPS[name],"Additional helper "+name+" cap"
        if self.G.deadline is not None:assert monotonic()<self.G.deadline,"Unchanged 55-second geometry deadline"
    def info(self,p):
        self.tick("infoQueries")
        key=tuple(tuple(v) for v in p)
        if key not in self.cache:
            self.tick("cacheEntries")
            self.cache[key]=(min(v[0] for v in p),max(v[0] for v in p),
                             min(v[1] for v in p),max(v[1] for v in p),self.G.area(p))
        return self.cache[key]
    def overlaps(self,a,b):
        self.tick("bboxTests")
        A=self.info(a);B=self.info(b)
        yes=min(A[1],B[1])>max(A[0],B[0]) and min(A[3],B[3])>max(A[2],B[2])
        if not yes:self.tick("bboxRejections")
        return yes
    def contains(self,outer,inner):
        self.tick("containmentTests");self.tick("bboxTests")
        A=self.info(outer);B=self.info(inner)
        if A[0]>B[0] or A[1]<B[1] or A[2]>B[2] or A[3]<B[3]:return False
        for a,b in zip(outer,outer[1:]+outer[:1]):
            for v in inner:
                self.tick("edgePredicates")
                if self.G.det2(a,b,v)<0:return False
        return True
    def intersection(self,a,b):
        self.tick("intersectionCalls")
        if not a or not b:return []
        if not self.overlaps(a,b):return []
        if self.contains(b,a):return list(a)
        if self.contains(a,b):return list(b)
        return self.base_intersection(a,b)
    def difference(self,a,b):
        self.tick("differenceCalls")
        if not a:return []
        if not b or not self.overlaps(a,b):return [list(a)]
        if self.contains(b,a):return []
        return self.base_difference(a,b)
    def canonical(self,p):
        self.tick("canonicalVertices",len(p))
        p=self.G.normalized(p)
        if not p:return ()
        i=min(range(len(p)),key=lambda j:p[j])
        return tuple(p[i:]+p[:i])
    def union_cells(self,records):
        G=self.G;start=G.clips;call=len(self.unions)
        self.inputs.append({"call":call,"records":[dict(r) for r in records]})
        unique={};reductions=[]
        for index,r in enumerate(records):
            self.tick("canonicalInputRecords");key=self.canonical(r["polygon"])
            if not key:
                reductions.append({"input":index,"reason":"zero area"});continue
            if key in unique:
                self.tick("canonicalDuplicates")
                reductions.append({"input":index,"reason":"exact cyclic duplicate","witnessInput":unique[key][0]});continue
            unique[key]=(index,{**r,"polygon":list(key)})
        ordered=sorted(unique.values(),key=lambda row:(-self.info(row[1]["polygon"])[4],row[1]["owner"],row[1]["sourceOffset"],tuple(row[1]["polygon"])))
        retained=[]
        for index,r in ordered:
            witness=next((old_index for old_index,old in retained if self.contains(old["polygon"],r["polygon"])),None)
            if witness is not None:
                self.tick("containedRecords")
                reductions.append({"input":index,"reason":"exact convex containment","witnessInput":witness});continue
            retained.append((index,r))
        cells=[]
        for _,r in retained:
            pending=[r["polygon"]]
            for old in cells:
                pending=[piece for p in pending for piece in self.difference(p,old["polygon"])]
                assert len(pending)<=G.MAX_PIECES,"Unchanged polygon-piece cap"
                if not pending:break
            for p in pending:
                assert self.contains(r["polygon"],p)
                cells.append({**r,"polygon":p})
            assert len(cells)<=G.MAX_PIECES,"Unchanged polygon-piece cap"
        assert G.disjoint([r["polygon"] for r in cells])
        self.unions.append({"call":call,"inputRecords":len(records),"uniquePositiveRecords":len(unique),
          "retainedAfterContainment":len(retained),"outputCells":len(cells),"originalHalfPlaneClips":G.clips-start,"reductions":reductions})
        return cells
    def install(self):
        self.G.intersection=self.intersection;self.G.difference=self.difference;self.G.union_cells=self.union_cells
    def snapshot(self):
        return {"helperCaps":HELPER_CAPS,"helperCounts":dict(self.counts),"cachedPolygons":len(self.cache),
                "unions":self.unions,"originalHalfPlaneClips":self.G.clips}
