import assert from 'node:assert/strict';
import {after} from 'node:test';
import {limitDiagnosticTrialSteps,trialDiagnostics} from '../../../../workbenches/furnished-house/simulation.js';
import {sceneCompileDiagnostics} from '../../../../workbenches/furnished-house/scene.js';
// Architect's separate allowance: only the unchanged 2x45-step tiny comparison.
limitDiagnosticTrialSteps(128);
after(()=>{const trial=trialDiagnostics();console.log('LEGACY_RESOURCES '+JSON.stringify({compiler:sceneCompileDiagnostics(),trial,allowedAggregateSteps:128,sourceCellsPerActivatedOwner:4,activatedOwnersPerFixture:2,sourceTrianglesPerFixture:4,actualNewYorkCalls:0,fullNewYorkDiagnostics:0,rendererCalls:0,builds:0}));assert.ok(trial.steps<=128);assert.equal(trial.created,trial.disposed);});
