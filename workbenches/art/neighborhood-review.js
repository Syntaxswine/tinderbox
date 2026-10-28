const frame = document.querySelector('#review-frame'), output = document.querySelector('#review-output');
const show = value => { output.textContent = JSON.stringify(value, null, 2); return value; };
const review = () => { const api = frame.contentWindow?.neighborhoodReview; if (!api) throw Error('Review viewport is still loading'); return api; };
const action = callback => async () => { try { show(await callback(review())); } catch (error) { show({passed: false, rendered: false, error: error.message, visualAcceptance: 'pending'}); } };
document.querySelector('#run-review').onclick = action(api => api.run());
document.querySelector('#sample').onclick = action(api => api.sample());
document.querySelector('#interactive').onclick = action(api => api.rebuild());
document.querySelector('#move-position').onclick = action(api => api.rebuild({position: document.querySelector('#position').value}));
document.querySelector('#burnout').onclick = action(api => api.rebuild({burnout: true}));
for (const [id, width, height] of [['desktop', 1280, 800], ['phone', 390, 844]]) document.querySelector('#' + id).onclick = action(async api => {
  frame.width = width; frame.height = height; await new Promise(resolve => requestAnimationFrame(resolve)); return api.sample();
});
frame.addEventListener('load', () => show({viewport: {width: frame.width, height: frame.height}, status: 'Use Run behavior review or Sample diagnostics. A successful WebGL render is required.'}));
