import assert from 'node:assert/strict';
import {after} from 'node:test';
import {limitDiagnosticTrialSteps,trialDiagnostics} from '../../../../workbenches/furnished-house/simulation.js';
import {sceneCompileDiagnostics} from '../../../../workbenches/furnished-house/scene.js';
limitDiagnosticTrialSteps(0);
after(()=>{const compiler=sceneCompileDiagnostics(),trial=trialDiagnostics();console.log('PHYSICAL_RESOURCES '+JSON.stringify({compiler,trial,actualNewYorkCalls:0,fullNewYorkDiagnostics:0,rendererCalls:0,builds:0}));assert.equal(compiler.calls,0);assert.equal(trial.created,0);assert.equal(trial.steps,0);});
