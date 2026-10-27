import {CIVILIAN_PROFILES} from './exterior-kit.js';
// A game courtyard made from sourced recipes. Positions/scale are adaptations;
// this is not a miniature of a real palace or a reconstruction of fair geography.
const skins = {facade: 'inherited-plaster', trim: 'inherited-cream', door: 'inherited-wood', roof: 'inherited-roof'};
const refs = ['farmyard:hybrid-wall-opening', 'EXPO-P01:scan31', 'EXPO-P02:plate43', 'game:frontage-fragment'];
const panel = (id, form, x, y, width, depth, height, extra = {}) => ({id, form, x, y, width, depth, height,
  heading: 0, physicalMaterial: 'wood', skinSlots: {...skins}, sourceRefs: [...refs], ...extra});
const civilian = (id, species, x, y, route) => ({id, ...CIVILIAN_PROFILES[species], x, y, route, hp: 100, speed: 0.8,
  team: 'civilian', headgear: 'none', equipment: 'none'});
export const EXPOSITION_SCENARIO = {
  id: 'exposition', width: 20, height: 16, player: {x: 10, y: 12, tool: 'jerry-can'},
  patches: [{x: 0, y: 0, width: 3, depth: 16, material: 'grass'}],
  modules: [
    panel('court-gate', 'doorway', 10, 9, 4, 0.3, 3.2, {opening: {width: 1.4, height: 2.3, state: 'open'}}),
    panel('court-front-west', 'wall', 6, 9, 4, 0.3, 3.2), panel('court-front-east', 'wall', 14, 9, 4, 0.3, 3.2),
    panel('court-west', 'wall', 4, 6, 6, 0.3, 3.2, {heading: Math.PI / 2}),
    panel('court-east', 'wall', 16, 6, 6, 0.3, 3.2, {heading: Math.PI / 2}),
    panel('hall-back', 'wall', 10, 3, 12, 0.3, 3.6),
    panel('hall-closed-door', 'doorway', 10, 5, 4, 0.3, 3.2, {opening: {width: 1.4, height: 2.3, state: 'closed'}}),
    panel('hall-pilaster', 'pilaster', 6, 5, 0.45, 0.55, 3.4),
    panel('service-corner', 'corner', 18, 5, 2, 2, 3, {thickness: 0.3}),
    panel('hall-gable', 'roof-gable', 10, 4, 12, 2.4, 1.6, {baseHeight: 3.6, supportModuleIds: ['hall-back', 'hall-closed-door'], sourceRefs: ['EXPO-P02:plate53', 'EXPO-P02:plate97', 'game:roof-primitive-adaptation']}),
    panel('service-hip', 'roof-hip', 18, 5, 2.4, 2.4, 0.8, {baseHeight: 3.2, supportModuleIds: ['service-corner'], sourceRefs: ['EXPO-P02:plate53', 'EXPO-P02:plate97', 'game:roof-primitive-adaptation']})
  ], obstacles: [], actors: [
    civilian('visitor-horse', 'horse', 7, 7, [{x: 7, y: 7}, {x: 13, y: 7}]),
    civilian('visitor-goat', 'goat', 13, 12, [{x: 13, y: 12}, {x: 17, y: 12}])
  ]
};