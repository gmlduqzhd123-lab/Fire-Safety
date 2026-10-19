const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const game = fs.readFileSync('game.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const stages = fs.readFileSync('stages.js', 'utf8');
const stageContext = { window: {} };
vm.runInNewContext(stages, stageContext);
const { STAGES, TILE, generateDailyChallengeStage } = stageContext.window.FireEscape;
function context(stage) {
  const ctx = { activeCustomStage: stage, STAGES, currentStageIdx: 0,
    player: { x: 1.5, y: 1.5, hazardsFixed: 0, totalHazards: 5 },
    items: [{ type: 'npc' }, { type: 'dog' }, { type: 'mask' }], TILE,
    findNearestTileOfTypes: types => ({ c: 4, r: 4, tile: types[0] }) };
  const start = game.indexOf('  function getIncompleteEscapeReason()');
  const end = game.indexOf('  // --- HUD Update', start);
  vm.runInNewContext(game.slice(start, end), ctx);
  return ctx;
}
test('all fire stages and daily challenge allow immediate escape without equipment or rescue', () => {
  for (const stage of [...STAGES.filter(s => !s.isPreventionMode), generateDailyChallengeStage()]) {
    const ctx = context(stage);
    assert.equal(ctx.getIncompleteEscapeReason(), null, stage.name);
    assert.equal(ctx.getNextStepObjective().c, 4);
    assert.equal(ctx.getNextStepObjective().r, 4);
    assert.match(ctx.getNextStepObjective().bannerText, /대피|탈출/);
  }
});
test('legacy/custom maps cannot restore dangerous escape prerequisites', () => {
  const ctx = context({ requireWetTowelOrMask: true, requireGasClosed: true, requireRescueNpc: true, requireRescueDog: true });
  assert.equal(ctx.getIncompleteEscapeReason(), null);
  for (const crouching of [true, false]) {
    ctx.player.crouching = crouching;
    assert.equal(ctx.getNextStepObjective().label, '🎯 비상구(EXIT) 탈출!');
  }
});
test('non-fire prevention checklist is still required and completable', () => {
  const ctx = context({ isPreventionMode: true });
  assert.match(ctx.getIncompleteEscapeReason(), /5곳/);
  ctx.player.hazardsFixed = 5;
  assert.equal(ctx.getIncompleteEscapeReason(), null);
});
test('stop-drop-roll still takes priority when clothing is on fire', () => {
  const ctx = context({});
  ctx.player.onFire = true;
  ctx.player.rollNeeded = 3;
  assert.match(ctx.getNextStepObjective().label, /구르기/);
});
test('unsubstantiated filtration and absolute safety claims are absent', () => {
  assert.doesNotMatch(game + html, /7중 필터|유독가스를 85%|방연마스크는 유독가스를 막아주고|질식을 막을 수 있습니다/);
  assert.match(html, /실제 제품의 보호 성능이 아닙니다/);
  assert.match(html, /절대 다시 들어가지 마세요/);
  assert.match(html, /newsId=148947269/);
  assert.match(html, /fa_221\.pdf/);
});
