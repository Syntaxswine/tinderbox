// Scripted acknowledgements for reviewing UI input. The game host owns real motion.
export function createTrainUIFixture() {
  const contract=Object.freeze({id:'nautilus-drivable-trains',version:1,profile:'bounded-rail-driver-v1'});
  const listeners=new Set(),commands=[];
  let refused=false,disposed=false;
  const state={actorId:'player',mode:'driver',walkingAllowed:false,trainId:'preview/steam',carId:'preview/cab',entranceId:'cab',cabFacing:1,
    expected:{actorRevision:1,occupancyRevision:1,controlRevision:1},
    train:{stock:'steam',stopped:true,speedMps:0,signedSpeedMps:0,
      controls:{direction:'neutral',power:0,brake:1,leaseId:null}}};
  const notify=()=>{for(const listener of [...listeners])listener();};
  const session={contract,readForActor:()=>structuredClone(state),
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
    dispatch(command) {
      commands.push(structuredClone(command));
      let code=null;
      if(disposed)code='DISPOSED';
      else if(command.type==='drive'){
        if(refused)code='SHIFT_REFUSED';
        else if(command.actorId!==state.actorId||command.trainId!==state.trainId||state.mode!=='driver')code='STALE_DRIVER';
        else if(JSON.stringify(command.expected)!==JSON.stringify(state.expected))code='STALE_REVISION';
        else {
          state.train.controls={direction:command.direction,power:command.power,brake:command.brake,leaseId:command.leaseId};
          state.expected.controlRevision++;notify();
        }
      } else if(command.type==='release'){
        if(state.train.controls.leaseId===command.leaseId){
          state.train.controls={direction:'neutral',power:0,brake:1,leaseId:null};
          state.expected.controlRevision++;notify();
        }
      } else code='UNKNOWN_COMMAND';
      return {commandId:command.commandId,ok:!code,committed:!code,code,reason:code?'Stop the train before changing direction.':null,repeated:false,observerErrors:0};
    }
  };
  return {session,commands,get state(){return structuredClone(state);},
    setMode(mode){state.mode=mode;state.walkingAllowed=mode==='on-foot';state.expected.occupancyRevision++;notify();},
    setRefused(value){refused=value;},dispose(){disposed=true;listeners.clear();},
    get listenerCount(){return listeners.size;}
  };
}
