"""One latched rear solve. A failed/capped attempt cannot automatically repeat."""
from support import *
def main():
    assert not (HERE/"attempt-started.json").exists(),"This successor already spent its one rear attempt"
    inputs=pins();synthetic=read(HERE/"synthetic-checks.json");assert synthetic["passed"]
    assert synthetic["sourceCodeHashes"]==inputs["sourceCodeHashes"],"Code changed after synthetic controls"
    for slug in ("end-0","end-1"):
        check=read(HERE/(slug+"/preflight.json"));assert check["passed"]
        assert check["sourceInputs"]["sourceCodeHashes"]==inputs["sourceCodeHashes"],"Code changed after preflight"
    s=read(OLD/"rear/selection.json")
    assert len(s["candidates"])==569 and len(s["newBoundaryCandidates"])==12
    assert s["placementsIncludingRoof"]==570 and s["expandedGeometryCountPlanned"]==25 and s["triangleCountPlannedIncludingRoof"]==7468
    save("attempt-started.json",{"attempt":1,"target":"rear-curtain-roof","sourceInputs":inputs,
       "caps":C.CAPS,"clipCap":200000,"deadlineSeconds":55,"fixedCandidateCount":569,"allTwelveNewIds":s["newBoundaryCandidates"]})
    try:
        E,engine,captured=run("rear")
    except Exception as e:
        save("attempt-outcome.json",{"status":"stopped-first-failure","errorType":type(e).__name__,"error":str(e),
          "area":None,"automaticRetry":False,"sourceInputs":inputs})
        raise
    result=captured["rear/result.json"]
    save("attempt-outcome.json",{"status":"geometric-proof-complete","sourceInputs":inputs,"result":"rear/result.json",
      "exactClipOperations":result["exactClipOperations"],"newWeatherCoverAdoption":result["newWeatherCoverAdoption"],
      "runtimeStockAssigned":False,"automaticRetry":False})
    print(json.dumps({"rearAttempt":1,"status":"geometric-proof-complete","clips":result["exactClipOperations"],
                      "exposedAreaScalarBits":result["areaScalarDirectedLower"]["bits"],"classification":result["newWeatherCoverAdoption"]}))
if __name__=="__main__":main()
