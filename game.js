(function () {
  'use strict';

  const {
    SoundFX,
    TILE,
    COLS,
    ROWS,
    BADGE_DEFS,
    HAZARD_QUIZZES,
    CHARACTER_SKINS,
    generateDailyChallengeStage,
    STAGES,
    initMapEditor
  } = window.FireEscape;

  // --- Storage & Badge Encyclopedia Helpers (Idea #9) ---
  let unlockedBadges = {};
  try {
    unlockedBadges = JSON.parse(localStorage.getItem('fire_escape_badges') || '{}') || {};
  } catch (e) {
    unlockedBadges = {};
  }

  function unlockBadge(badgeId) {
    if (!unlockedBadges[badgeId]) {
      unlockedBadges[badgeId] = true;
      try {
        localStorage.setItem('fire_escape_badges', JSON.stringify(unlockedBadges));
      } catch (e) {}
    }
  }

  function getUnlockedBadgeCount() {
    return BADGE_DEFS.filter(b => unlockedBadges[b.id]).length;
  }

  let selectedSkinId = 'student';
  try {
    selectedSkinId = localStorage.getItem('fire_escape_skin') || 'student';
  } catch (e) {
    selectedSkinId = 'student';
  }

  function getSelectedSkin() {
    const unlockedCount = getUnlockedBadgeCount();
    const list = CHARACTER_SKINS || [];
    const found = list.find(s => s.id === selectedSkinId && unlockedCount >= s.minBadges);
    return found || list[0] || {
      id: 'student',
      name: '용감한 초등학생',
      icon: '🧒',
      minBadges: 0,
      perkDesc: '기본 캐릭터',
      bonusExtinguisher: 0,
      bonusWater: 0,
      defaultFlashlight: false,
      crouchSpeedBonus: 1.0,
      o2DrainMult: 1.0
    };
  }

  let currentClassCode = '';
  try {
    currentClassCode = localStorage.getItem('fire_escape_class_code') || '';
  } catch (e) {
    currentClassCode = '';
  }

  function getClassLeaderboard() {
    try {
      return JSON.parse(localStorage.getItem('fire_escape_class_board') || '[]') || [];
    } catch (e) {
      return [];
    }
  }

  function recordClassScore(stageName, finalScore, gradeText) {
    const studentName = (studentNameInput && studentNameInput.value.trim()) || '용감한 어린이';
    const cls = currentClassCode.trim() || '자유 참가반';
    const board = getClassLeaderboard();
    const now = new Date();
    const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    board.push({
      studentName,
      classCode: cls,
      stageName,
      score: finalScore,
      grade: gradeText,
      timeStr
    });
    board.sort((a, b) => b.score - a.score);
    const trimmed = board.slice(0, 30);
    try {
      localStorage.setItem('fire_escape_class_board', JSON.stringify(trimmed));
    } catch (e) {}
  }

  function getSavedBestScore() {
    try {
      return parseInt(localStorage.getItem('fire_escape_best_score') || '0', 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBestScore(val) {
    try {
      const current = getSavedBestScore();
      if (val > current) {
        localStorage.setItem('fire_escape_best_score', String(val));
      }
    } catch (e) {}
  }

  // --- DOM Elements ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const canvasContainer = document.getElementById('canvasContainer');

  const stageBadge = document.getElementById('stageBadge');
  const classBanner = document.getElementById('classBanner');
  const btnStage0 = document.getElementById('btnStage0');
  const btnStage1 = document.getElementById('btnStage1');
  const btnStage2 = document.getElementById('btnStage2');
  const btnStage3 = document.getElementById('btnStage3');
  const btnStage4 = document.getElementById('btnStage4');
  const btnStage5 = document.getElementById('btnStage5');
  const btnStage6 = document.getElementById('btnStage6');
  const btnDailyStage = document.getElementById('btnDailyStage');
  const btnCoopToggle = document.getElementById('btnCoopToggle');
  const coopToggleText = document.getElementById('coopToggleText');
  const btnClassMode = document.getElementById('btnClassMode');
  const btnTeacherMode = document.getElementById('btnTeacherMode');
  const btnMapEditor = document.getElementById('btnMapEditor');
  const btnCertModal = document.getElementById('btnCertModal');
  const btnPause = document.getElementById('btnPause');
  const pauseIcon = document.getElementById('pauseIcon');
  const pauseText = document.getElementById('pauseText');
  const btnRestartTop = document.getElementById('btnRestartTop');
  const btnSound = document.getElementById('btnSound');
  const btnGuide = document.getElementById('btnGuide');

  const hpBar = document.getElementById('hpBar');
  const hpValue = document.getElementById('hpValue');
  const o2Bar = document.getElementById('o2Bar');
  const o2Value = document.getElementById('o2Value');
  const postureStatus = document.getElementById('postureStatus');
  const convectionMarker = document.getElementById('convectionMarker');
  const convectionHint = document.getElementById('convectionHint');
  const timerDisplay = document.getElementById('timerDisplay');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const bestScoreDisplay = document.getElementById('bestScoreDisplay');
  const missionShort = document.getElementById('missionShort');
  const inventoryList = document.getElementById('inventoryList');
  const extAmmoBadge = document.getElementById('extAmmoBadge');
  const waterAmmoBadge = document.getElementById('waterAmmoBadge');
  const rollStatusBadge = document.getElementById('rollStatusBadge');

  const toastBanner = document.getElementById('toastBanner');
  const contextPrompt = document.getElementById('contextPrompt');

  const gameOverlay = document.getElementById('gameOverlay');
  const overlayIcon = document.getElementById('overlayIcon');
  const overlaySubtitle = document.getElementById('overlaySubtitle');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayDesc = document.getElementById('overlayDesc');
  const overlayTipsBox = document.getElementById('overlayTipsBox');
  const overlayStats = document.getElementById('overlayStats');
  const statTime = document.getElementById('statTime');
  const statVitals = document.getElementById('statVitals');
  const statScore = document.getElementById('statScore');
  const debriefReportBox = document.getElementById('debriefReportBox');
  const debriefGrade = document.getElementById('debriefGrade');
  const debriefChecklist = document.getElementById('debriefChecklist');
  const debriefCurriculumNote = document.getElementById('debriefCurriculumNote');
  const replayMinimap = document.getElementById('replayMinimap');
  const btnReplayAnim = document.getElementById('btnReplayAnim');
  const btnPrimaryAction = document.getElementById('btnPrimaryAction');
  const btnOpenCertFromOverlay = document.getElementById('btnOpenCertFromOverlay');
  const btnSecondaryAction = document.getElementById('btnSecondaryAction');

  const eduModal = document.getElementById('eduModal');
  const eduModalBadge = document.getElementById('eduModalBadge');
  const eduModalTitle = document.getElementById('eduModalTitle');
  const eduModalDesc = document.getElementById('eduModalDesc');
  const eduModalChoices = document.getElementById('eduModalChoices');
  const btnCloseEduModal = document.getElementById('btnCloseEduModal');

  const mapEditorModal = document.getElementById('mapEditorModal');
  const certModal = document.getElementById('certModal');
  const btnCloseCertModal = document.getElementById('btnCloseCertModal');
  const btnConfirmCertModal = document.getElementById('btnConfirmCertModal');
  const btnDownloadCertPng = document.getElementById('btnDownloadCertPng');
  const studentNameInput = document.getElementById('studentNameInput');
  const certTotalScore = document.getElementById('certTotalScore');
  const certBadgeCount = document.getElementById('certBadgeCount');
  const badgeCollectionGrid = document.getElementById('badgeCollectionGrid');
  const skinSelectionGrid = document.getElementById('skinSelectionGrid');
  const activeSkinBadge = document.getElementById('activeSkinBadge');

  const classModal = document.getElementById('classModal');
  const btnCloseClassModal = document.getElementById('btnCloseClassModal');
  const btnConfirmClassModal = document.getElementById('btnConfirmClassModal');
  const classCodeInput = document.getElementById('classCodeInput');
  const btnApplyClassCode = document.getElementById('btnApplyClassCode');
  const btnCopyClassUrl = document.getElementById('btnCopyClassUrl');
  const classBoardTitle = document.getElementById('classBoardTitle');
  const btnClearClassBoard = document.getElementById('btnClearClassBoard');
  const classLeaderboardList = document.getElementById('classLeaderboardList');

  const teacherModal = document.getElementById('teacherModal');
  const btnCloseTeacherModal = document.getElementById('btnCloseTeacherModal');
  const btnConfirmTeacherModal = document.getElementById('btnConfirmTeacherModal');
  const btnToggleBoardZoom = document.getElementById('btnToggleBoardZoom');
  const btnTeacherUnlockAll = document.getElementById('btnTeacherUnlockAll');
  const btnPrintWorksheet = document.getElementById('btnPrintWorksheet');
  const printWorksheetClass = document.getElementById('printWorksheetClass');
  const printWorksheetName = document.getElementById('printWorksheetName');
  const printWorksheetStage = document.getElementById('printWorksheetStage');

  const guideModal = document.getElementById('guideModal');
  const btnCloseGuide = document.getElementById('btnCloseGuide');
  const btnConfirmGuide = document.getElementById('btnConfirmGuide');

  const btnUp = document.getElementById('btnUp');
  const btnDown = document.getElementById('btnDown');
  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');
  const btnRoll = document.getElementById('btnRoll');
  const btnCrouch = document.getElementById('btnCrouch');
  const btnWaterBucket = document.getElementById('btnWaterBucket');
  const btnExtinguish = document.getElementById('btnExtinguish');
  const btnAction = document.getElementById('btnAction');

  // --- Game State ---
  let currentStageIdx = 0;
  let activeCustomStage = null;
  let gameState = 'START';
  let isCoopMode = false;
  let replayAnimId = null;
  let grid = [];
  let guideSigns = [];
  let fires = [];
  let smokes = [];
  let items = [];
  let particles = [];
  let floatTexts = [];
  let pathHistory = [];
  let pathRecordTimer = 0;
  let burnBeepTimer = 0;
  let interactedDoors = new Set(); // Bug #1 Fix: Prevents infinite door open/close score farming

  let cssCanvasW = 600;
  let cssCanvasH = 400;

  let player = {
    x: 2.5,
    y: 2.5,
    radius: 0.26,
    dirX: 0,
    dirY: 1,
    hp: 100,
    o2: 100,
    crouching: false,
    hasTowel: false,
    wetTowel: false,
    hasMask: false,
    hasFlashlight: false,
    onFire: false,
    rollNeeded: 0,
    keys: 0,
    extinguisherCharges: 0,
    waterCharges: 0,
    passLearned: false,
    hasAxe: false,
    rescuedDog: false,
    rescuedNpcs: 0,
    alarmRung: false,
    fireDoorsClosed: 0,
    hazardsFixed: 0,
    totalHazards: 0,
    gasClosed: false,
    breakerClosed: false,
    carryingToy: false,
    hurtCooldown: 0
  };

  let player2 = {
    x: 2.5,
    y: 1.5,
    radius: 0.25,
    dirX: 0,
    dirY: 1,
    crouching: false
  };

  let pointerMoveTarget = null;

  let metrics = {
    smokeTimeTotal: 0,
    smokeTimeCrouched: 0,
    doorHeatChecked: 0,
    backdraftTriggered: 0,
    waterOnSpecialFireMistake: 0,
    correctExtinguishCount: 0,
    called119: false,
    usedLifeline: false,
    usedPartition: false,
    ignoredOrDroppedToy: true
  };

  let score = 0;
  let stageStartScore = 0;
  let elapsedSeconds = 0;
  let fireSpreadTimer = 0;
  let lastFrameTime = 0;
  let animFrameId = null;
  let toastTimeout = null;
  let mapEditorInstance = null;

  const keysPressed = {
    up: false,
    down: false,
    left: false,
    right: false
  };

  const keysPressed2 = {
    up: false,
    down: false,
    left: false,
    right: false
  };

  function clearAllInputStates() {
    keysPressed.up = false;
    keysPressed.down = false;
    keysPressed.left = false;
    keysPressed.right = false;
    keysPressed2.up = false;
    keysPressed2.down = false;
    keysPressed2.left = false;
    keysPressed2.right = false;
    pointerMoveTarget = null;
    [btnUp, btnDown, btnLeft, btnRight].forEach(b => b.classList.remove('is-pressed'));
  }

  window.addEventListener('blur', clearAllInputStates);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearAllInputStates();
  });

  // --- Toast Notification ---
  function showToast(msg, borderClass = 'border-amber-500/50') {
    toastBanner.textContent = msg;
    toastBanner.className = `pointer-events-none absolute top-2.5 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-xl bg-slate-950/95 border ${borderClass} text-amber-200 text-[11px] sm:text-sm font-semibold shadow-lg transition-all duration-300 opacity-100 translate-y-0 w-[92%] sm:w-auto max-w-[94%] text-center`;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastBanner.classList.remove('opacity-100', 'translate-y-0');
      toastBanner.classList.add('opacity-0', '-translate-y-2');
    }, 3400);
  }

  function addFloatText(gridX, gridY, text, color = '#fde047') {
    floatTexts.push({
      x: gridX,
      y: gridY,
      text,
      color,
      alpha: 1.0,
      vy: -0.025
    });
  }

  // --- Educational Mini-Modal & Overlay Keyboard Navigation State ---
  let eduSelectedIndex = 0;
  let eduChoiceButtons = [];
  let overlaySelectedIndex = 0;

  function updateEduSelectionUI() {
    eduChoiceButtons.forEach((btn, idx) => {
      const isSelected = (idx === eduSelectedIndex);
      const indicator = btn.querySelector('.kb-indicator');
      if (isSelected) {
        btn.className = 'w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-extrabold text-xs sm:text-sm text-left transition flex items-center justify-between gap-2 shadow-lg kb-selected';
        if (indicator) indicator.textContent = '⏎ 선택';
        btn.focus({ preventScroll: true });
      } else {
        btn.className = 'w-full py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs sm:text-sm text-left transition flex items-center justify-between gap-2';
        if (indicator) indicator.textContent = '▶';
      }
    });
  }

  function getVisibleOverlayButtons() {
    return [btnPrimaryAction, btnOpenCertFromOverlay, btnSecondaryAction].filter(
      (b) => b && !b.classList.contains('hidden')
    );
  }

  function updateOverlaySelectionUI() {
    const btns = getVisibleOverlayButtons();
    if (btns.length === 0) return;
    if (overlaySelectedIndex >= btns.length) overlaySelectedIndex = 0;
    if (overlaySelectedIndex < 0) overlaySelectedIndex = btns.length - 1;
    [btnPrimaryAction, btnOpenCertFromOverlay, btnSecondaryAction].forEach((b) => {
      if (b) b.classList.remove('kb-selected');
    });
    const targetBtn = btns[overlaySelectedIndex];
    if (targetBtn) {
      targetBtn.classList.add('kb-selected');
      targetBtn.focus({ preventScroll: true });
    }
  }

  function openEduModal(badgeText, titleText, descText, choices) {
    clearAllInputStates();
    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
      pauseIcon.textContent = '▶️';
      pauseText.textContent = '계속하기';
    }

    eduModalBadge.textContent = badgeText;
    eduModalTitle.textContent = titleText;
    eduModalDesc.innerHTML = descText;
    eduModalChoices.innerHTML = '';
    eduChoiceButtons = [];
    eduSelectedIndex = 0;

    choices.forEach((ch, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = `<span>${ch.label}</span><span class="kb-indicator text-xs opacity-90 shrink-0 font-mono px-1.5 py-0.5 rounded bg-black/25">▶</span>`;
      btn.addEventListener('mouseenter', () => {
        if (eduSelectedIndex !== idx) {
          eduSelectedIndex = idx;
          updateEduSelectionUI();
        }
      });
      btn.addEventListener('click', () => {
        ch.onSelect();
      });
      eduModalChoices.appendChild(btn);
      eduChoiceButtons.push(btn);
    });

    eduModal.classList.remove('hidden');
    eduModal.classList.add('flex');
    updateEduSelectionUI();
  }

  function closeEduModal() {
    clearAllInputStates();
    eduModal.classList.add('hidden');
    eduModal.classList.remove('flex');
    if (
      gameState === 'PAUSED' &&
      gameOverlay.classList.contains('hidden') &&
      guideModal.classList.contains('hidden') &&
      mapEditorModal.classList.contains('hidden') &&
      certModal.classList.contains('hidden') &&
      (!classModal || classModal.classList.contains('hidden')) &&
      (!teacherModal || teacherModal.classList.contains('hidden'))
    ) {
      gameState = 'PLAYING';
      pauseIcon.textContent = '⏸️';
      pauseText.textContent = '일시정지';
    }
    updateHUD();
  }

  btnCloseEduModal.addEventListener('click', closeEduModal);

  // --- Initialize Stage ---
  function loadStage(stageIndex, resetTotalScore = false, customStageObj = null) {
    clearAllInputStates();
    currentStageIdx = stageIndex;
    activeCustomStage = customStageObj || null;
    const st = activeCustomStage || STAGES[currentStageIdx];

    if (resetTotalScore) {
      score = 0;
      stageStartScore = 0;
    } else {
      stageStartScore = score;
    }

    grid = st.map.map(row => [...row]);
    guideSigns = (st.guideSigns || []).map(g => ({ ...g }));
    fires = st.fires.map(f => ({
      ...f,
      fireType: f.fireType || 'normal',
      phase: Math.random() * Math.PI * 2
    }));
    smokes = st.smokes.map(s => ({ ...s, phase: Math.random() * Math.PI * 2 }));
    items = st.items.map(it => ({ ...it }));
    particles = [];
    floatTexts = [];
    pathHistory = [{ x: st.playerStart.x, y: st.playerStart.y, state: 'safe' }];
    pathRecordTimer = 0;
    burnBeepTimer = 0;
    interactedDoors = new Set();

    let hazardCount = 0;
    let hasGasValve = false;
    let hasBreaker = false;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === TILE.HAZARD) hazardCount++;
        if (grid[r][c] === TILE.GAS_VALVE) hasGasValve = true;
        if (grid[r][c] === TILE.BREAKER) hasBreaker = true;
      }
    }

    const activeSkin = getSelectedSkin();

    player.x = st.playerStart.x;
    player.y = st.playerStart.y;
    player.dirX = 0;
    player.dirY = 1;
    player.hp = 100;
    player.o2 = 100;
    player.crouching = false;
    player.hasTowel = false;
    player.wetTowel = false;
    player.hasMask = false;
    player.hasFlashlight = !!activeSkin.defaultFlashlight;
    player.onFire = false;
    player.rollNeeded = 0;
    player.keys = 0;
    player.extinguisherCharges = activeSkin.bonusExtinguisher || 0;
    player.waterCharges = activeSkin.bonusWater || 0;
    player.hasAxe = false;
    player.rescuedDog = false;
    player.rescuedNpcs = 0;
    player.alarmRung = false;
    player.fireDoorsClosed = 0;
    player.hazardsFixed = 0;
    player.totalHazards = hazardCount;
    player.gasClosed = !hasGasValve;
    player.breakerClosed = !hasBreaker;
    player.carryingToy = false;
    player.hurtCooldown = 0;

    player2.x = canMoveTo(st.playerStart.x + 0.85, st.playerStart.y, player2.radius)
      ? st.playerStart.x + 0.85
      : st.playerStart.x;
    player2.y = st.playerStart.y;
    player2.dirX = 0;
    player2.dirY = 1;
    player2.crouching = false;

    metrics = {
      smokeTimeTotal: 0,
      smokeTimeCrouched: 0,
      doorHeatChecked: 0,
      backdraftTriggered: 0,
      waterOnSpecialFireMistake: 0,
      correctExtinguishCount: 0,
      called119: false,
      usedLifeline: false,
      usedPartition: false,
      ignoredOrDroppedToy: true
    };

    elapsedSeconds = 0;
    fireSpreadTimer = 0;

    stageBadge.textContent = st.name;
    missionShort.textContent = st.mission;

    const stageButtons = [
      { btn: btnStage1, idx: 0 },
      { btn: btnStage2, idx: 1 },
      { btn: btnStage3, idx: 2 },
      { btn: btnStage4, idx: 3 },
      { btn: btnStage5, idx: 4 },
      { btn: btnStage0, idx: 5 },
      { btn: btnStage6, idx: 6 }
    ];
    stageButtons.forEach(({ btn, idx }) => {
      if (!btn) return;
      if (idx === currentStageIdx && !customStageObj) {
        btn.className = idx === 5
          ? 'px-1 sm:px-2 py-0.5 sm:py-1 text-[9.5px] sm:text-xs font-bold rounded-md bg-emerald-600 text-white transition shrink-0'
          : 'px-1 sm:px-2 py-0.5 sm:py-1 text-[9.5px] sm:text-xs font-bold rounded-md bg-orange-600 text-white transition shrink-0';
      } else {
        btn.className = idx === 5
          ? 'px-1 sm:px-2 py-0.5 sm:py-1 text-[9.5px] sm:text-xs font-bold rounded-md text-emerald-300 hover:text-white transition shrink-0'
          : 'px-1 sm:px-2 py-0.5 sm:py-1 text-[9.5px] sm:text-xs font-bold rounded-md text-slate-300 hover:text-white transition shrink-0';
      }
    });

    if (btnDailyStage) {
      btnDailyStage.className = (customStageObj && customStageObj.isDailyChallenge)
        ? 'px-1 sm:px-2 py-0.5 sm:py-1 text-[9.5px] sm:text-xs font-bold rounded-md bg-amber-600 text-white transition shrink-0'
        : 'px-1 sm:px-2 py-0.5 sm:py-1 text-[9.5px] sm:text-xs font-bold rounded-md text-amber-300 hover:text-white transition shrink-0';
    }

    updateHUD();
    renderCanvas();
  }

  // --- HUD Update ---
  function updateHUD() {
    const st = activeCustomStage || STAGES[currentStageIdx] || STAGES[0];
    const hpPct = Math.max(0, Math.min(100, Math.round(player.hp)));
    const o2Pct = Math.max(0, Math.min(100, Math.round(player.o2)));

    hpBar.style.width = hpPct + '%';
    hpValue.textContent = hpPct + '%';
    o2Bar.style.width = o2Pct + '%';
    o2Value.textContent = o2Pct + '%';

    if (hpPct <= 30 || o2Pct <= 30 || player.onFire) {
      canvasContainer.classList.add('pulse-danger');
    } else {
      canvasContainer.classList.remove('pulse-danger');
    }

    if (player.onFire) {
      rollStatusBadge.textContent = `(${player.rollNeeded}회연타!)`;
      btnRoll.classList.remove('hidden');
      btnRoll.classList.add('flex');
      btnWaterBucket.classList.add('hidden');
      btnWaterBucket.classList.remove('flex');
    } else {
      rollStatusBadge.textContent = `(안전)`;
      btnRoll.classList.add('hidden');
      btnRoll.classList.remove('flex');
      btnWaterBucket.classList.remove('hidden');
      btnWaterBucket.classList.add('flex');
    }

    if (st.isPreventionMode) {
      postureStatus.textContent = player.crouching ? '🧎 하층 점검' : '🔍 사전점검';
      postureStatus.className = 'text-[11px] font-extrabold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800';
      convectionMarker.style.top = player.crouching ? '20px' : '12px';
      convectionHint.textContent = '화재 전 쾌적한 실내 공기';
      btnCrouch.className = player.crouching
        ? 'btn-control px-2 py-2 rounded-xl bg-emerald-700/80 border border-emerald-400 text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-1.5 shadow'
        : 'btn-control px-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs sm:text-sm font-bold text-amber-300 flex items-center justify-center gap-1.5 shadow';
    } else if (player.crouching) {
      postureStatus.textContent = '🧎 낮은자세(안전)';
      postureStatus.className = 'text-[11px] font-extrabold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800';
      convectionMarker.style.top = '20px';
      convectionHint.textContent = '바닥 신선한 공기 호흡';
      btnCrouch.className = 'btn-control px-2 py-2 rounded-xl bg-emerald-700/80 border border-emerald-400 text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-1.5 shadow';
    } else {
      postureStatus.textContent = '🚶 서있음(연기주의)';
      postureStatus.className = 'text-[11px] font-extrabold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800';
      convectionMarker.style.top = '3px';
      convectionHint.textContent = '상층 유독가스 주의!';
      btnCrouch.className = 'btn-control px-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs sm:text-sm font-bold text-amber-300 flex items-center justify-center gap-1.5 shadow';
    }

    const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const secs = String(Math.floor(elapsedSeconds % 60)).padStart(2, '0');
    timerDisplay.textContent = `${mins}:${secs}`;

    scoreDisplay.textContent = score.toLocaleString();
    bestScoreDisplay.textContent = getSavedBestScore().toLocaleString();
    extAmmoBadge.textContent = `(${player.extinguisherCharges})`;
    waterAmmoBadge.textContent = `(${player.waterCharges})`;

    const activeSkin = getSelectedSkin();
    const badges = [];
    if (isCoopMode) {
      badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-500/20 border border-pink-400/40 text-pink-200 text-[11px] font-bold shrink-0">👥 2인협동ON</span>`);
    }
    if (activeSkin && activeSkin.id !== 'student') {
      badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-400/40 text-purple-200 text-[11px] font-bold shrink-0">${activeSkin.icon} ${activeSkin.name}</span>`);
    }
    if (player.onFire) {
      badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600 text-white text-[11px] font-extrabold shrink-0">🔥 착화! 구르기(${player.rollNeeded})</span>`);
    }
    if (player.hasMask) {
      badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-500/20 border border-teal-400/40 text-teal-200 text-[11px] font-bold shrink-0">😷 방연마스크</span>`);
    } else if (player.wetTowel) {
      badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/40 text-sky-200 text-[11px] font-bold shrink-0">💧 젖은 수건</span>`);
    } else if (player.hasTowel) {
      badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[11px] font-bold shrink-0">🧣 마른 수건</span>`);
    }
    if (player.hasFlashlight) {
      badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/20 border border-yellow-400/40 text-yellow-200 text-[11px] font-bold shrink-0">🔦 손전등ON</span>`);
    }
    if (player.waterCharges > 0) {
      badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/40 text-blue-200 text-[11px] font-bold shrink-0">🪣 물(${player.waterCharges})</span>`);
    }
    if (player.extinguisherCharges > 0) {
      badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/20 border border-red-400/40 text-red-200 text-[11px] font-bold shrink-0">🧯 소화기(${player.extinguisherCharges})</span>`);
    }
    if (player.keys > 0) {
      badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/20 border border-yellow-400/40 text-yellow-200 text-[11px] font-bold shrink-0">🔑 열쇠x${player.keys}</span>`);
    }
    if (player.hasAxe) {
      badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/20 border border-orange-400/40 text-orange-200 text-[11px] font-bold shrink-0">🪓 도끼</span>`);
    }
    if (player.rescuedDog) {
      badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] font-bold shrink-0">🐶 초코</span>`);
    }
    if (player.rescuedNpcs > 0) {
      badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] font-bold shrink-0">🧒 동행x${player.rescuedNpcs}</span>`);
    }
    if (player.fireDoorsClosed > 0) {
      badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-[11px] font-bold shrink-0">🚪 방화문차단x${player.fireDoorsClosed}</span>`);
    }
    if (player.totalHazards > 0) {
      badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] font-bold shrink-0">🔍 점검(${player.hazardsFixed}/${player.totalHazards})</span>`);
    }

    if (badges.length === 0) {
      inventoryList.innerHTML = `<span class="text-[11px] text-slate-500 whitespace-nowrap shrink-0">보유 장비 없음</span>`;
    } else {
      inventoryList.innerHTML = badges.join('');
    }
  }

  // --- Collision Helpers ---
  function isTileSolid(c, r) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return true;
    const t = grid[r][c];
    return (
      t === TILE.WALL ||
      t === TILE.FURNITURE ||
      t === TILE.DOOR ||
      t === TILE.HOT_DOOR ||
      t === TILE.LOCKED_DOOR ||
      t === TILE.SINK ||
      t === TILE.ELEVATOR ||
      t === TILE.DEBRIS ||
      t === TILE.GAS_VALVE ||
      t === TILE.PHONE_119 ||
      t === TILE.BREAKER ||
      t === TILE.LIFELINE ||
      t === TILE.PARTITION ||
      t === TILE.HAZARD ||
      t === TILE.ALARM_BELL
    );
  }

  function canMoveTo(nx, ny, radius) {
    const points = [
      { x: nx - radius, y: ny - radius },
      { x: nx + radius, y: ny - radius },
      { x: nx - radius, y: ny + radius },
      { x: nx + radius, y: ny + radius }
    ];
    for (const p of points) {
      const c = Math.floor(p.x);
      const r = Math.floor(p.y);
      if (isTileSolid(c, r)) return false;
    }
    return true;
  }

  // --- Nearby Interactive Target Detection ---
  function getInteractTargetForActor(actor) {
    const pc = Math.floor(actor.x);
    const pr = Math.floor(actor.y);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const dist = Math.hypot(actor.x - (it.c + 0.5), actor.y - (it.r + 0.5));
      if (dist < 1.15) {
        return { kind: 'item', index: i, item: it };
      }
    }

    const targetC = Math.floor(actor.x + actor.dirX * 0.85);
    const targetR = Math.floor(actor.y + actor.dirY * 0.85);
    const candidates = [
      { c: targetC, r: targetR },
      { c: pc + 1, r: pr },
      { c: pc - 1, r: pr },
      { c: pc, r: pr + 1 },
      { c: pc, r: pr - 1 }
    ];

    for (let idx = 0; idx < candidates.length; idx++) {
      const cand = candidates[idx];
      if (cand.c < 0 || cand.c >= COLS || cand.r < 0 || cand.r >= ROWS) continue;
      const t = grid[cand.r][cand.c];
      if (t === TILE.OPEN_DOOR) {
        if (idx !== 0 || (cand.c === pc && cand.r === pr)) continue;
      }

      if (
        t === TILE.DOOR ||
        t === TILE.OPEN_DOOR ||
        t === TILE.HOT_DOOR ||
        t === TILE.LOCKED_DOOR ||
        t === TILE.SINK ||
        t === TILE.ELEVATOR ||
        t === TILE.DEBRIS ||
        t === TILE.GAS_VALVE ||
        t === TILE.PHONE_119 ||
        t === TILE.BREAKER ||
        t === TILE.LIFELINE ||
        t === TILE.PARTITION ||
        t === TILE.HAZARD ||
        t === TILE.ALARM_BELL
      ) {
        return { kind: 'tile', c: cand.c, r: cand.r, tile: t };
      }
    }

    return null;
  }

  function getInteractTarget() {
    const t1 = getInteractTargetForActor(player);
    if (t1) return t1;
    if (isCoopMode) return getInteractTargetForActor(player2);
    return null;
  }

  // --- Stop, Drop & Roll Action ---
  function performStopDropRoll() {
    if (gameState !== 'PLAYING') return;
    SoundFX.init();

    if (!player.onFire) {
      player.crouching = true;
      SoundFX.water();
      addFloatText(player.x, player.y - 0.3, '🔄 구르기 연습 (낮은 자세)', '#a7f3d0');
      showToast('🔄 [멈추고·엎드려·구르기] 옷에 불이 붙었을 때 바닥에 엎드려 구르면 산소가 차단되어 불이 꺼집니다!');
      updateHUD();
      return;
    }

    player.rollNeeded = Math.max(0, player.rollNeeded - 1);
    SoundFX.water();

    for (let i = 0; i < 10; i++) {
      particles.push({
        x: player.x + (Math.random() - 0.5) * 0.5,
        y: player.y + (Math.random() - 0.5) * 0.5,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 0.35,
        maxLife: 0.4,
        size: 4,
        color: '#60a5fa'
      });
    }

    if (player.rollNeeded <= 0) {
      player.onFire = false;
      score += 150;
      unlockBadge('stop_roll');
      addFloatText(player.x, player.y - 0.3, '🔄 구르기 소화 성공! +150', '#4ade80');
      showToast('✅ [멈추고·엎드려·구르기 성공!] 옷에 붙은 불을 침착하게 굴러서 껐습니다! (+150점 · 배지 해금!)', 'border-emerald-400');
    } else {
      addFloatText(player.x, player.y - 0.3, `🔄 구르기 중! (${player.rollNeeded}번 더!)`, '#fde047');
      showToast(`🔄 바닥에 엎드려 구르는 중입니다! [구르기] 버튼을 ${player.rollNeeded}번 더 누르세요!`);
    }
    updateHUD();
  }

  // --- Water Bucket Action ---
  function useWaterBucket() {
    if (gameState !== 'PLAYING') return;
    SoundFX.init();

    if (player.waterCharges <= 0) {
      SoundFX.warning();
      showToast('🪣 보유한 물양동이가 없습니다! 세면대(🚰)에서 물을 채우거나 양동이를 주우세요.', 'border-blue-500/60');
      return;
    }

    player.waterCharges--;
    SoundFX.water();
    if (player.onFire) {
      player.onFire = false;
      player.rollNeeded = 0;
      addFloatText(player.x, player.y - 0.3, '🪣 물로 옷의 불 진화!', '#60a5fa');
    }

    const dirAngle = Math.atan2(player.dirY, player.dirX);
    for (let i = 0; i < 22; i++) {
      const spread = (Math.random() - 0.5) * 0.8;
      const speed = 2.2 + Math.random() * 3.0;
      particles.push({
        x: player.x + player.dirX * 0.35,
        y: player.y + player.dirY * 0.35,
        vx: Math.cos(dirAngle + spread) * speed,
        vy: Math.sin(dirAngle + spread) * speed,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 4 + Math.random() * 4,
        color: '#60a5fa'
      });
    }

    let normalExtinguished = 0;
    let hazardTriggered = false;

    for (let i = fires.length - 1; i >= 0; i--) {
      const f = fires[i];
      const fx = f.c + 0.5;
      const fy = f.r + 0.5;
      const dx = fx - player.x;
      const dy = fy - player.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= 2.6) {
        const dot = (dx * player.dirX + dy * player.dirY) / (dist || 1);
        if (dot > 0.3 || dist < 1.2) {
          if (f.fireType === 'oil' || (f.fireType === 'electric' && !player.breakerClosed)) {
            hazardTriggered = f.fireType;
            metrics.waterOnSpecialFireMistake++;
            player.hp = Math.max(5, player.hp - 12);
            SoundFX.hurt();
            addFloatText(fx, fy, f.fireType === 'oil' ? '💥 기름 폭발! 물 금지!' : '⚡ 감전 위험! 물 금지!', '#ef4444');
            if (!smokes.some(s => s.c === f.c && s.r === f.r)) {
              smokes.push({ c: f.c, r: f.r, phase: 0 });
            }
          } else {
            fires.splice(i, 1);
            normalExtinguished++;
            metrics.correctExtinguishCount++;
            score += 150;
            addFloatText(fx, fy, f.fireType === 'electric' ? '⚡ 전원차단 후 냉각소화! +150' : '🪣 냉각 소화(발화점↓)! +150', '#60a5fa');
          }
        }
      }
    }

    if (hazardTriggered === 'oil') {
      showToast('🚨 [과학 원리 경고] 식용유·알코올 화재(🍳)에 물을 부으면 불길이 번집니다! 소화기(🧯질식소화)를 쓰세요!', 'border-red-500');
    } else if (hazardTriggered === 'electric') {
      showToast('🚨 [과학 원리 경고] 전원이 켜진 전기 화재(⚡)에 물을 부으면 감전됩니다! 차단기(⚡)를 내리거나 소화기(🧯)를 쓰세요!', 'border-red-500');
    } else if (normalExtinguished > 0) {
      showToast(`🪣 [냉각 소화 성공] 물로 온도를 발화점 아래로 낮춰 화재 ${normalExtinguished}곳을 진압했습니다!`, 'border-blue-400');
    } else {
      showToast('🪣 물을 뿌렸습니다. 일반 화재(🔥)를 향해 사용하세요!', 'border-slate-600');
    }

    updateHUD();
  }

  // --- Extinguisher Spray Action ---
  function useExtinguisher(actor = player) {
    if (gameState !== 'PLAYING') return;
    SoundFX.init();

    if (player.extinguisherCharges <= 0) {
      SoundFX.warning();
      showToast('⚠️ 보유한 소화기가 없거나 약제가 모두 소진되었습니다!', 'border-red-500/60');
      return;
    }

    player.extinguisherCharges--;
    SoundFX.spray();

    if (player.onFire) {
      player.onFire = false;
      player.rollNeeded = 0;
      addFloatText(player.x, player.y - 0.3, '🧯 소화기로 몸의 불 진화!', '#38bdf8');
    }

    const dirAngle = Math.atan2(actor.dirY, actor.dirX);
    for (let i = 0; i < 26; i++) {
      const spread = (Math.random() - 0.5) * 0.85;
      const speed = 2.5 + Math.random() * 3.5;
      particles.push({
        x: actor.x + actor.dirX * 0.35,
        y: actor.y + actor.dirY * 0.35,
        vx: Math.cos(dirAngle + spread) * speed,
        vy: Math.sin(dirAngle + spread) * speed,
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.7,
        size: 4 + Math.random() * 5,
        color: '#f0f9ff'
      });
    }

    let extinguishedCount = 0;
    let specialExtinguished = 0;
    for (let i = fires.length - 1; i >= 0; i--) {
      const f = fires[i];
      const fx = f.c + 0.5;
      const fy = f.r + 0.5;
      const dx = fx - actor.x;
      const dy = fy - actor.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= 2.8) {
        const dot = (dx * actor.dirX + dy * actor.dirY) / (dist || 1);
        if (dot > 0.35 || dist < 1.25) {
          const isSpec = (f.fireType === 'oil' || f.fireType === 'electric');
          fires.splice(i, 1);
          extinguishedCount++;
          metrics.correctExtinguishCount++;
          unlockBadge('pass_ext');
          if (isSpec) {
            specialExtinguished++;
            score += 200;
            addFloatText(fx, fy, '🧯 질식 소화(산소차단)! +200', '#38bdf8');
          } else {
            score += 150;
            addFloatText(fx, fy, '🧯 화원 진압! +150', '#38bdf8');
          }
          for (let s = smokes.length - 1; s >= 0; s--) {
            if (Math.hypot(smokes[s].c - f.c, smokes[s].r - f.r) <= 1.1) {
              smokes.splice(s, 1);
            }
          }
        }
      }
    }

    if (specialExtinguished > 0) {
      showToast(`🧯 [질식 소화 성공] 산소를 차단해 식용유/전기 화재를 안전하게 진압했습니다! (+${specialExtinguished * 200}점)`, 'border-sky-400');
    } else if (extinguishedCount > 0) {
      showToast(`🧯 소화기로 불길 ${extinguishedCount}곳의 화원(뿌리)을 쓸어 껐습니다! (+${extinguishedCount * 150}점)`, 'border-sky-400');
    } else {
      showToast('🧯 소화기를 분사했습니다. 바람을 등지고 불길 뿌리 쪽을 향해 분사하세요!', 'border-slate-600');
    }

    updateHUD();
  }

  // --- 119 Emergency Call Simulation Modal ---
  function start119Simulation(c, r) {
    if (metrics.called119) {
      showToast('📞 이미 119에 정확한 위치와 상황을 신고했습니다! 신속히 대피하세요!');
      return;
    }
    openEduModal(
      '1~2학년 통합교과 · 119 신고 절차',
      '📞 119 긴급 화재 신고 시뮬레이션',
      '소방관에게 가장 먼저, 가장 정확하게 전달해야 할 <strong>올바른 신고 내용</strong>을 선택하세요!',
      [
        {
          label: '1️⃣ "정확한 주소(또는 건물·교실 위치)와 화재 발생 장소, 현재 대피 인원을 침착하게 말합니다."',
          primary: true,
          onSelect: () => {
            metrics.called119 = true;
            score += 300;
            SoundFX.win();
            SoundFX.speak('119 신고가 접수되었습니다. 소방차가 출동 중이니 침착하게 비상구로 대피하세요.');
            addFloatText(c + 0.5, r + 0.5, '119 신고 완료! +300', '#c084fc');
            closeEduModal();
            showToast('📞 [119 신고 완벽 성공] 주소·발화장소·대피현황을 침착하게 전달했습니다! (+300점)', 'border-purple-400');
          }
        },
        {
          label: '2️⃣ "불이 났어요! 무서워요, 무조건 빨리 와주세요!" (정확한 위치 누락)',
          primary: false,
          onSelect: () => {
            SoundFX.warning();
            showToast('⚠️ 당황해서 주소를 말하지 않으면 소방차가 찾아오기 어렵습니다! 다시 정확히 신고해 보세요.', 'border-amber-500');
          }
        }
      ]
    );
  }

  // --- Descending Life Line (완강기) Sequence Mini-Game ---
  function startLifelineMiniGame() {
    let step = 1;
    function renderStep() {
      if (step === 1) {
        openEduModal(
          '5~6학년 실과 · 완강기 사용법 (1/3단계)',
          '🪢 베란다 완강기 탈출: 1단계 준비',
          '고층이나 현관이 막혔을 때 완강기로 탈출합니다. <strong>가장 먼저 해야 할 일</strong>은 무엇일까요?',
          [
            {
              label: '✅ 1. 지지대 고리에 완강기 후크를 걸고 나사를 단단히 조인다',
              primary: true,
              onSelect: () => { SoundFX.pickup(); step = 2; renderStep(); }
            },
            {
              label: '❌ 2. 안전벨트를 착용하기 전에 창밖으로 먼저 뛰어내린다',
              primary: false,
              onSelect: () => { SoundFX.warning(); showToast('⚠️ 위험합니다! 반드시 지지대에 완강기를 먼저 고정해야 합니다.'); }
            }
          ]
        );
      } else if (step === 2) {
        openEduModal(
          '5~6학년 실과 · 완강기 사용법 (2/3단계)',
          '🪢 베란다 완강기 탈출: 2단계 벨트 착용',
          '지지대에 고정하고 릴(줄)을 창밖으로 내렸습니다. 이제 <strong>안전벨트를 어디에 어떻게 착용</strong>해야 할까요?',
          [
            {
              label: '✅ 1. 벨트를 머리에서 뒤집어써서 겨드랑이 밑(가슴 높이)에 단단히 조인다',
              primary: true,
              onSelect: () => { SoundFX.pickup(); step = 3; renderStep(); }
            },
            {
              label: '❌ 2. 벨트를 발목이나 목에 느슨하게 건다',
              primary: false,
              onSelect: () => { SoundFX.warning(); showToast('⚠️ 벨트는 반드시 겨드랑이 아래 가슴에 단단히 고정해야 빠지지 않습니다!'); }
            }
          ]
        );
      } else if (step === 3) {
        openEduModal(
          '5~6학년 실과 · 완강기 사용법 (3/3단계)',
          '🪢 베란다 완강기 탈출: 3단계 안전 하강',
          '가슴 벨트를 단단히 조였습니다! 이제 <strong>창밖으로 내려갈 때 올바른 자세</strong>는 무엇일까요?',
          [
            {
              label: '✅ 1. 건물 벽면을 바라보고 두 손으로 벽을 가볍게 짚으며 안전하게 내려간다',
              primary: true,
              onSelect: () => {
                metrics.usedLifeline = true;
                score += 500;
                closeEduModal();
                handleStageClear();
              }
            },
            {
              label: '❌ 2. 만세를 부르며 두 손을 위로 들면 벨트가 쑥 빠져 추락할 수 있다',
              primary: false,
              onSelect: () => { SoundFX.warning(); showToast('⚠️ 두 팔을 위로 들면 벨트가 겨드랑이에서 빠질 수 있어 절대 금물입니다!'); }
            }
          ]
        );
      }
    }
    renderStep();
  }

  // --- Lightweight Partition Wall (아파트 베란다 경량칸막이) Mini-Game ---
  function startPartitionBreak(c, r) {
    openEduModal(
      '공동주택 피난시설 · 경량칸막이 (아이디어 1)',
      '🧱 아파트 베란다 경량칸막이 발견!',
      '현관과 복도에 불길·연기가 가득할 때, 아파트 베란다 벽면의 <strong>9mm 석고보드 경량칸막이</strong>를 통해 옆집 세대로 대피할 수 있습니다! 어떻게 하시겠습니까?',
      [
        {
          label: '🦶 앞의 적치물을 치우고 발로 힘껏 차거나 도끼로 부숴 옆집으로 탈출한다! (+400점)',
          primary: true,
          onSelect: () => {
            grid[r][c] = TILE.EXIT;
            metrics.usedPartition = true;
            unlockBadge('partition');
            score += 400;
            SoundFX.unlock();
            closeEduModal();
            handleStageClear();
          }
        },
        {
          label: '⏳ 그냥 두고 다른 길을 더 찾아본다',
          primary: false,
          onSelect: () => {
            closeEduModal();
          }
        }
      ]
    );
  }

  // --- Household Fire Hazard Inspection (사전 예방 점검 모드) ---
  const HAZARD_COORD_MAP = {
    '1,3': 0,
    '1,7': 1,
    '1,13': 2,
    '7,2': 3,
    '8,8': 4
  };

  function inspectHazardTile(c, r) {
    const mappedIdx = HAZARD_COORD_MAP[`${r},${c}`];
    const quizIdx = typeof mappedIdx === 'number' ? mappedIdx : (player.hazardsFixed % HAZARD_QUIZZES.length);
    const q = HAZARD_QUIZZES[quizIdx % HAZARD_QUIZZES.length];
    openEduModal(
      `화재 예방 사전 점검 (${player.hazardsFixed + 1}/${player.totalHazards})`,
      q.title,
      q.desc,
      [
        {
          label: q.good,
          primary: true,
          onSelect: () => {
            grid[r][c] = TILE.FLOOR;
            player.hazardsFixed++;
            score += 200;
            SoundFX.pickup();
            addFloatText(c + 0.5, r + 0.5, `위험요소 해결! (${player.hazardsFixed}/${player.totalHazards})`, '#4ade80');
            closeEduModal();
            if (player.hazardsFixed >= player.totalHazards) {
              unlockBadge('prevention');
              showToast('🎉 집 안의 화재 위험요소 5곳을 모두 안전하게 수리했습니다! EXIT로 이동해 점검을 완료하세요!', 'border-emerald-400');
            } else {
              showToast(`🔍 위험요소를 해결했습니다! 남은 점검 대상: ${player.totalHazards - player.hazardsFixed}곳`, 'border-emerald-400');
            }
            updateHUD();
          }
        },
        {
          label: q.bad,
          primary: false,
          onSelect: () => {
            SoundFX.warning();
            showToast('⚠️ 방치하면 큰 화재로 이어질 수 있습니다! 안전한 예방 조치를 선택하세요.');
          }
        }
      ]
    );
  }

  function nudgePlayerOutOfSolidTile(tc, tr) {
    const minX = tc - player.radius - 0.03;
    const maxX = tc + 1 + player.radius + 0.03;
    const minY = tr - player.radius - 0.03;
    const maxY = tr + 1 + player.radius + 0.03;
    if (player.x > minX && player.x < maxX && player.y > minY && player.y < maxY) {
      const dxLeft = Math.abs(player.x - minX);
      const dxRight = Math.abs(maxX - player.x);
      const dyTop = Math.abs(player.y - minY);
      const dyBottom = Math.abs(maxY - player.y);
      const m = Math.min(dxLeft, dxRight, dyTop, dyBottom);
      if (m === dxLeft) player.x = minX;
      else if (m === dxRight) player.x = maxX;
      else if (m === dyTop) player.y = minY;
      else player.y = maxY;
    }
  }

  // --- Primary Interaction (Bug #1 Fix: Single-reward tracking per door coordinate) ---
  function triggerInteraction(explicitTarget = null) {
    if (gameState !== 'PLAYING') return;
    SoundFX.init();

    if (player.onFire) {
      performStopDropRoll();
      return;
    }

    const target = explicitTarget || getInteractTarget();
    if (!target) {
      if (player.extinguisherCharges > 0) {
        useExtinguisher();
      } else if (player.waterCharges > 0) {
        useWaterBucket();
      } else {
        showToast('주변에 상호작용할 대상이 없습니다. 아이템이나 문 가까이 이동하세요.');
      }
      return;
    }

    if (target.kind === 'item') {
      const it = target.item;

      if (it.type === 'toy') {
        openEduModal(
          '3~4학년 사회·안전 · 대피 우선순위 판단',
          `⚠️ ${it.icon} ${it.name}을(를) 발견했습니다!`,
          '불길이 번지는 위급한 상황입니다! 아끼는 장난감이나 게임기를 챙기시겠습니까?',
          [
            {
              label: '🏃 "생명이 가장 소중해!" 물건을 두고 즉시 대피한다 (+150점 안전 보너스)',
              primary: true,
              onSelect: () => {
                items.splice(target.index, 1);
                metrics.ignoredOrDroppedToy = true;
                score += 150;
                SoundFX.pickup();
                addFloatText(it.c + 0.5, it.r + 0.5, '생명 우선 판단! +150', '#4ade80');
                closeEduModal();
                showToast('✅ 현명한 판단입니다! 화재 시 귀중품이나 장난감보다 생명이 최우선입니다! (+150점)', 'border-emerald-400');
              }
            },
            {
              label: '🎮 "아까우니까 챙겨 갈래!" 양손에 무겁게 들고 간다 (이동속도 감소 · -100점)',
              primary: false,
              onSelect: () => {
                items.splice(target.index, 1);
                player.carryingToy = true;
                metrics.ignoredOrDroppedToy = false;
                score = Math.max(0, score - 100);
                SoundFX.warning();
                addFloatText(it.c + 0.5, it.r + 0.5, '무거운 짐! 속도 감소', '#f87171');
                closeEduModal();
                showToast('⚠️ 장난감을 챙기느라 시간이 지체되고 이동 속도가 느려졌습니다!', 'border-red-500');
              }
            }
          ]
        );
        return;
      }

      items.splice(target.index, 1);
      SoundFX.pickup();

      if (it.type === 'towel') {
        player.hasTowel = true;
        score += 100;
        addFloatText(it.c + 0.5, it.r + 0.5, '수건 획득! +100', '#fcd34d');
        showToast('🧣 마른 수건을 획득했습니다! 세면대(🚰)에서 물에 적시세요!');
      } else if (it.type === 'mask') {
        player.hasMask = true;
        player.wetTowel = true;
        unlockBadge('mask_light');
        score += 300;
        addFloatText(it.c + 0.5, it.r + 0.5, '습식 방연마스크 착용! +300', '#2dd4bf');
        showToast('😷 [습식 방연마스크 착용!] 7중 필터가 유독가스를 85% 차단해 호흡기를 강력하게 보호합니다! (+300점)', 'border-teal-400');
      } else if (it.type === 'flashlight') {
        player.hasFlashlight = true;
        unlockBadge('mask_light');
        score += 200;
        addFloatText(it.c + 0.5, it.r + 0.5, '비상 손전등 ON! +200', '#fde047');
        showToast('🔦 [비상 손전등 점등!] 어두운 정전 구역과 연기 속에서 시야가 2배 넓어졌습니다! (+200점)', 'border-yellow-400');
      } else if (it.type === 'npc') {
        player.rescuedNpcs++;
        unlockBadge('alarm_npc');
        score += 350;
        addFloatText(it.c + 0.5, it.r + 0.5, `${it.name} 구출! +350`, '#4ade80');
        showToast(`🧒 ["불이야! 같이 대피하자!"] ${it.name}와(과) 손을 잡고 함께 비상구로 대피합니다! (+350점)`, 'border-emerald-400');
      } else if (it.type === 'bucket') {
        player.waterCharges += (it.charges || 3);
        score += 120;
        addFloatText(it.c + 0.5, it.r + 0.5, `물양동이 +${it.charges || 3}`, '#60a5fa');
        showToast('🪣 물양동이(냉각 소화) 획득! 일반 화재(🔥)는 끌 수 있지만 식용유(🍳)·전기(⚡) 화재엔 절대 쓰지 마세요!');
      } else if (it.type === 'key') {
        player.keys++;
        score += 120;
        addFloatText(it.c + 0.5, it.r + 0.5, '열쇠 획득! +120', '#fde047');
        showToast('🔑 열쇠를 획득했습니다! 잠긴 문(🔒)을 열 수 있습니다.');
      } else if (it.type === 'extinguisher') {
        player.extinguisherCharges += (it.charges || 5);
        score += 150;
        addFloatText(it.c + 0.5, it.r + 0.5, `소화기 +${it.charges || 5}`, '#38bdf8');
        if (!player.passLearned) {
          player.passLearned = true;
          openEduModal(
            '학교안전 7대 표준안 · 소화기 PASS 4단계',
            '🧯 소화기 획득! PASS 사용법을 익혀요',
            `<div class="space-y-1 text-xs">
              <div>• <strong>P (Pull):</strong> 손잡이를 잡지 말고 <strong>안전핀</strong>을 먼저 뽑는다.</div>
              <div>• <strong>A (Aim):</strong> 바람을 등지고 불길의 <strong>맨 아래쪽(화원 뿌리)</strong>을 조준한다.</div>
              <div>• <strong>S (Squeeze):</strong> 손잡이를 힘껏 움켜쥔다.</div>
              <div>• <strong>S (Sweep):</strong> 빗자루로 쓸 듯이 좌우로 골고루 분사한다.</div>
            </div>`,
            [
              {
                label: '🧷 안전핀(Pin) 뽑기 완료! 화원을 향해 분사 준비 (+100점)',
                primary: true,
                onSelect: () => {
                  score += 100;
                  unlockBadge('pass_ext');
                  SoundFX.unlock();
                  closeEduModal();
                  showToast('🧯 안전핀을 뽑았습니다! 불길 앞에서 [소화기] 또는 [Space]를 누르세요! (+100점)', 'border-sky-400');
                }
              }
            ]
          );
          return;
        } else {
          showToast('🧯 소화기를 추가로 획득했습니다! 식용유·전기·일반 화재 모두 진압 가능합니다.');
        }
      } else if (it.type === 'axe') {
        player.hasAxe = true;
        score += 200;
        addFloatText(it.c + 0.5, it.r + 0.5, '소방 도끼 획득! +200', '#fb923c');
        showToast('🪓 소방 도끼를 획득했습니다! 길을 막는 나무 판자(🪵)나 경량칸막이(🧱)를 부술 수 있습니다.');
      } else if (it.type === 'dog') {
        player.rescuedDog = true;
        score += 400;
        addFloatText(it.c + 0.5, it.r + 0.5, '초코 구출! +400', '#4ade80');
        showToast('🐶 반려견 초코를 구출했습니다! 함께 비상구로 탈출하세요!');
      }
      updateHUD();
      return;
    }

    if (target.kind === 'tile') {
      const { c, r, tile } = target;

      if (tile === TILE.SINK) {
        if (player.hasTowel && !player.wetTowel) {
          player.wetTowel = true;
          player.waterCharges = Math.min(5, player.waterCharges + 2);
          unlockBadge('wet_towel');
          SoundFX.water();
          score += 250;
          addFloatText(c + 0.5, r + 0.5, '젖은 수건 + 물보충! +250', '#38bdf8');
          showToast('💧 수건을 물에 적시고 물양동이도 채웠습니다! 연기 속 산소 피해가 대폭 감소합니다!', 'border-sky-400');
        } else {
          SoundFX.water();
          player.o2 = Math.min(100, player.o2 + 15);
          player.waterCharges = Math.min(5, player.waterCharges + 2);
          addFloatText(c + 0.5, r + 0.5, '산소 회복 & 물양동이 보충', '#38bdf8');
          showToast('💧 세면대에서 호흡을 가다듬고 물양동이(+2회)를 채웠습니다!', 'border-sky-400');
        }
      } else if (tile === TILE.DOOR) {
        grid[r][c] = TILE.OPEN_DOOR;
        SoundFX.unlock();
        const openKey = `open:${r},${c}`;
        if (!interactedDoors.has(openKey)) {
          interactedDoors.add(openKey);
          metrics.doorHeatChecked++;
          score += 50;
          addFloatText(c + 0.5, r + 0.5, '손등 온도확인 후 개방! +50', '#a7f3d0');
          showToast('🤚🚪 문을 열었습니다! 통과한 뒤 문을 다시 닫으면 연기 확산을 물리적으로 막을 수 있습니다!');
        } else {
          addFloatText(c + 0.5, r + 0.5, '문 열기', '#cbd5e1');
          showToast('🚪 문을 다시 열었습니다. (온도 확인 보너스는 문당 최초 1회만 부여됩니다)');
        }
      } else if (tile === TILE.OPEN_DOOR) {
        grid[r][c] = TILE.DOOR;
        nudgePlayerOutOfSolidTile(c, r);
        SoundFX.unlock();
        const closeKey = `close:${r},${c}`;
        if (!interactedDoors.has(closeKey)) {
          interactedDoors.add(closeKey);
          player.fireDoorsClosed++;
          unlockBadge('fire_door');
          score += 150;
          addFloatText(c + 0.5, r + 0.5, '방화문 닫기(연기차단)! +150', '#818cf8');
          showToast('🚪🛡️ [방화문 닫기 완료!] 지나온 문을 닫아 불길과 유독가스가 문 너머로 번지는 것을 차단했습니다! (+150점)', 'border-indigo-400');
        } else {
          addFloatText(c + 0.5, r + 0.5, '방화문 닫기 완료', '#818cf8');
          showToast('🚪🛡️ 방화문을 다시 닫아 연기 확산을 차단했습니다! (점수는 문당 최초 1회만 부여됩니다)', 'border-indigo-400');
        }
      } else if (tile === TILE.HOT_DOOR) {
        const hotKey = `hot:${r},${c}`;
        openEduModal(
          '범교과 안전 · 열전도와 백드래프트 예방',
          '🤚🌡️ 문 손잡이 온도 확인 결과: 매우 뜨거움!',
          '손등으로 문손잡이를 살짝 대어 보니 <strong>화상을 입을 만큼 뜨겁게 달궈져</strong> 있습니다! 문 반대편에 거센 불길이 가득하다는 뜻입니다. 어떻게 하시겠습니까?',
          [
            {
              label: '✅ 문을 절대 열지 않고 다른 안전한 우회 통로를 찾는다 (+200점 안전 판단)',
              primary: true,
              onSelect: () => {
                SoundFX.pickup();
                if (!interactedDoors.has(hotKey)) {
                  interactedDoors.add(hotKey);
                  metrics.doorHeatChecked++;
                  score += 200;
                  addFloatText(c + 0.5, r + 0.5, '백드래프트 예방! +200', '#4ade80');
                  closeEduModal();
                  showToast('✅ [백드래프트 예방 성공] 뜨거운 문을 열지 않고 우회하여 폭발적 화염을 피했습니다! (+200점)', 'border-emerald-400');
                } else {
                  addFloatText(c + 0.5, r + 0.5, '안전 우회 확인', '#4ade80');
                  closeEduModal();
                  showToast('✅ 이미 온도를 확인한 고온 위험 문입니다. 안전한 우회 통로로 이동하세요!', 'border-emerald-400');
                }
              }
            },
            {
              label: '❌ 무시하고 문을 확 열어젖힌다 (산소 유입으로 백드래프트 폭발 위험!)',
              primary: false,
              onSelect: () => {
                metrics.backdraftTriggered++;
                grid[r][c] = TILE.FLOOR;
                player.hp = Math.max(5, player.hp - 30);
                fires.push({ c, r, intensity: 1.0, fireType: 'normal', phase: 0 });
                SoundFX.hurt();
                addFloatText(c + 0.5, r + 0.5, '💥 백드래프트 폭발!', '#ef4444');
                closeEduModal();
                showToast('💥 뜨거운 문을 열어 산소가 급격히 유입되면서 화염이 폭발(백드래프트)했습니다! (체력 -30%)', 'border-red-500');
              }
            }
          ]
        );
        return;
      } else if (tile === TILE.LOCKED_DOOR) {
        if (player.keys > 0) {
          player.keys--;
          metrics.doorHeatChecked++;
          grid[r][c] = TILE.OPEN_DOOR;
          interactedDoors.add(`open:${r},${c}`);
          SoundFX.unlock();
          score += 100;
          addFloatText(c + 0.5, r + 0.5, '잠금 해제! +100', '#fde047');
          showToast('🔓 손등으로 온도를 확인한 뒤 열쇠로 잠긴 문을 열었습니다!');
        } else {
          SoundFX.warning();
          showToast('🔒 잠긴 문입니다! 주변 방에서 열쇠(🔑)를 먼저 찾으세요.', 'border-amber-500');
        }
      } else if (tile === TILE.ELEVATOR) {
        SoundFX.warning();
        showToast('🚨 화재 시 엘리베이터는 정전으로 갇히거나 굴뚝 효과로 유독가스가 가득 찹니다! 비상계단(EXIT)을 이용하세요!', 'border-red-500');
      } else if (tile === TILE.GAS_VALVE) {
        if (!player.gasClosed) {
          player.gasClosed = true;
          SoundFX.unlock();
          score += 250;
          addFloatText(c + 0.5, r + 0.5, '가스 밸브 차단! +250', '#4ade80');
          showToast('✅ [가연물 차단] 주방 중간 가스 밸브를 잠가 2차 가스 폭발을 예방했습니다! (+250점)', 'border-emerald-400');
        } else {
          showToast('✅ 가스 밸브가 이미 안전하게 잠겨 있습니다.');
        }
      } else if (tile === TILE.BREAKER) {
        if (!player.breakerClosed) {
          player.breakerClosed = true;
          SoundFX.unlock();
          score += 250;
          addFloatText(c + 0.5, r + 0.5, '전원 차단기 OFF! +250', '#38bdf8');
          showToast('⚡ [전기 화재 예방] 두꺼비집(전원 차단기)을 내려 추가 누전과 감전 위험을 차단했습니다! (+250점)', 'border-sky-400');
        } else {
          showToast('⚡ 전원 차단기가 이미 내려가 있습니다.');
        }
      } else if (tile === TILE.PHONE_119) {
        start119Simulation(c, r);
        return;
      } else if (tile === TILE.LIFELINE) {
        startLifelineMiniGame();
        return;
      } else if (tile === TILE.PARTITION) {
        startPartitionBreak(c, r);
        return;
      } else if (tile === TILE.HAZARD) {
        inspectHazardTile(c, r);
        return;
      } else if (tile === TILE.ALARM_BELL) {
        if (!player.alarmRung) {
          player.alarmRung = true;
          unlockBadge('alarm_npc');
          SoundFX.bell();
          SoundFX.speak('불이야! 화재가 발생했습니다! 모두 비상구로 대피하세요!');
          score += 250;
          addFloatText(c + 0.5, r + 0.5, '🔔 비상벨 발신! "불이야!" +250', '#facc15');
          showToast('🔔 [화재 비상벨 발신!] "불이야!" 큰 소리로 외치고 비상벨을 눌러 이웃과 친구들에게 대피를 알렸습니다! (+250점)', 'border-yellow-400');
        } else {
          SoundFX.bell();
          showToast('🔔 이미 화재 비상벨이 울리고 있습니다! 이웃과 함께 신속히 대피하세요!');
        }
      } else if (tile === TILE.DEBRIS) {
        if (player.hasAxe) {
          grid[r][c] = TILE.FLOOR;
          SoundFX.unlock();
          score += 200;
          addFloatText(c + 0.5, r + 0.5, '장애물 파괴! +200', '#fb923c');
          showToast('🪓 소방 도끼로 무너진 나무 잔해를 부수고 비상 탈출로를 열었습니다!');
        } else {
          SoundFX.warning();
          showToast('🪵 무너진 나무 판자가 길을 막고 있습니다. 소방 도끼(🪓)를 찾거나 완강기(🪢)·경량칸막이(🧱)를 이용하세요!');
        }
      }
      updateHUD();
    }
  }

  // --- Toggle Crouch ---
  function toggleCrouch() {
    if (gameState !== 'PLAYING') return;
    SoundFX.init();
    player.crouching = !player.crouching;
    if (player.crouching) {
      showToast('🧎 [대류 현상 활용] 낮은 자세로 바닥(30~60cm)의 신선한 공기를 호흡하며 이동합니다!');
    } else {
      showToast('🚶 서서 이동합니다. 이동 속도가 빨라지지만 상층부 유독가스에 취약합니다.');
    }
    updateHUD();
  }

  // --- Render Movement Trajectory Replay Minimap (with Timelapse Animation Support) ---
  function renderReplayMinimap(maxPointCount = null) {
    if (!replayMinimap) return;
    const mctx = replayMinimap.getContext('2d');
    const mw = replayMinimap.width;
    const mh = replayMinimap.height;
    const tw = mw / COLS;
    const th = mh / ROWS;

    mctx.fillStyle = '#090d16';
    mctx.fillRect(0, 0, mw, mh);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = grid[r][c];
        if (t === TILE.WALL) mctx.fillStyle = '#334155';
        else if (t === TILE.EXIT) mctx.fillStyle = '#10b981';
        else if (t === TILE.FURNITURE) mctx.fillStyle = '#451a03';
        else mctx.fillStyle = '#1e293b';
        mctx.fillRect(c * tw, r * th, tw - 0.5, th - 0.5);
      }
    }

    for (const s of smokes) {
      mctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
      mctx.fillRect(s.c * tw, s.r * th, tw, th);
    }
    for (const f of fires) {
      mctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
      mctx.fillRect(f.c * tw, f.r * th, tw, th);
    }

    const limit = typeof maxPointCount === 'number'
      ? Math.max(1, Math.min(pathHistory.length, maxPointCount))
      : pathHistory.length;

    if (limit > 1) {
      mctx.lineWidth = 2.2;
      for (let i = 1; i < limit; i++) {
        const p0 = pathHistory[i - 1];
        const p1 = pathHistory[i];
        mctx.strokeStyle = p1.state === 'hurt' ? '#ef4444' : (p1.state === 'crouch' ? '#38bdf8' : '#4ade80');
        mctx.beginPath();
        mctx.moveTo(p0.x * tw, p0.y * th);
        mctx.lineTo(p1.x * tw, p1.y * th);
        mctx.stroke();
      }
      const lastPt = pathHistory[limit - 1];
      mctx.fillStyle = lastPt.state === 'hurt' ? '#ef4444' : '#fde047';
      mctx.beginPath();
      mctx.arc(lastPt.x * tw, lastPt.y * th, 3.8, 0, Math.PI * 2);
      mctx.fill();
      mctx.font = '10px sans-serif';
      mctx.textAlign = 'center';
      mctx.textBaseline = 'middle';
      mctx.fillText(lastPt.state === 'crouch' ? '🧎' : '🏃', lastPt.x * tw, lastPt.y * th - 6);
    } else if (pathHistory.length === 1) {
      const pt = pathHistory[0];
      mctx.fillStyle = '#fde047';
      mctx.beginPath();
      mctx.arc(pt.x * tw, pt.y * th, 3.5, 0, Math.PI * 2);
      mctx.fill();
    }
  }

  function animateReplayMinimap() {
    if (!replayMinimap || pathHistory.length <= 1) {
      renderReplayMinimap();
      return;
    }
    if (replayAnimId) cancelAnimationFrame(replayAnimId);
    const startTime = performance.now();
    const duration = 2600;
    if (btnReplayAnim) btnReplayAnim.textContent = '⏳ 타임랩스 동선 재생 중...';

    function step(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const count = Math.max(1, Math.ceil(progress * pathHistory.length));
      renderReplayMinimap(count);
      if (progress < 1) {
        replayAnimId = requestAnimationFrame(step);
      } else {
        replayAnimId = null;
        if (btnReplayAnim) btnReplayAnim.textContent = '▶️ 3초 타임랩스 애니메이션 재생';
      }
    }
    replayAnimId = requestAnimationFrame(step);
  }

  if (btnReplayAnim) {
    btnReplayAnim.addEventListener('click', () => {
      SoundFX.init();
      SoundFX.pickup();
      animateReplayMinimap();
    });
  }

  // --- Build Debriefing Report Card ---
  function populateDebriefReport(isGameOver = false) {
    debriefReportBox.classList.remove('hidden');
    const crouchPct = metrics.smokeTimeTotal > 0.5
      ? Math.round((metrics.smokeTimeCrouched / metrics.smokeTimeTotal) * 100)
      : 100;

    const st = activeCustomStage || STAGES[currentStageIdx] || STAGES[0];
    const itemsHtml = [];
    if (st.isPreventionMode) {
      itemsHtml.push(`<div>${player.hazardsFixed >= player.totalHazards ? '✅' : '⚠️'} <strong>가정 내 화재 위험요소 사전 점검:</strong> 총 <strong>${player.hazardsFixed} / ${player.totalHazards}곳</strong> 안전 조치 완료</div>`);
    } else {
      itemsHtml.push(`<div>${(player.wetTowel || player.hasMask) ? '✅' : '⚠️'} <strong>호흡기 보호 & 낮은 자세:</strong> ${player.hasMask ? '방연마스크 착용' : (player.wetTowel ? '젖은 수건 착용' : '미착용')} · 낮은 자세 유지율 <strong>${crouchPct}%</strong></div>`);
    }
    itemsHtml.push(`<div>${metrics.waterOnSpecialFireMistake === 0 ? '✅' : '❌'} <strong>연소·소화 & 방화문 차단:</strong> 화재 진압 <strong>${metrics.correctExtinguishCount}회</strong> · 방화문 닫기 <strong>${player.fireDoorsClosed}회</strong></div>`);
    itemsHtml.push(`<div>${metrics.backdraftTriggered === 0 ? '✅' : '❌'} <strong>문 온도 확인 & 특수 피난:</strong> 문 확인 <strong>${metrics.doorHeatChecked}회</strong> ${metrics.usedPartition ? '· 🧱경량칸막이 탈출' : ''} ${metrics.usedLifeline ? '· 🪢완강기 탈출' : ''}</div>`);
    itemsHtml.push(`<div>${(player.alarmRung || player.rescuedNpcs > 0 || metrics.called119 || isCoopMode) ? '✅' : '💡'} <strong>협동·신고 활동:</strong> ${player.alarmRung ? '🔔비상벨 발신 ' : ''}${player.rescuedNpcs > 0 ? `· 🧒이웃구출 ${player.rescuedNpcs}명 ` : ''}${metrics.called119 ? '· 📞119 신고 완료 ' : ''}${isCoopMode ? '· 👥2인 협동 탈출' : ''}</div>`);

    debriefChecklist.innerHTML = itemsHtml.join('');

    if (isGameOver) {
      debriefGrade.textContent = '대피 실패 · 재도전 필요 (미수료)';
      debriefGrade.className = 'px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px] sm:text-[11px]';
    } else if (metrics.waterOnSpecialFireMistake > 0 || metrics.backdraftTriggered > 0) {
      debriefGrade.textContent = '안전 수칙 복습 필요 (B등급)';
      debriefGrade.className = 'px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] sm:text-[11px]';
    } else if (crouchPct < 60 || !metrics.ignoredOrDroppedToy) {
      debriefGrade.textContent = '우수 안전 대원 (A등급)';
      debriefGrade.className = 'px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-[10px] sm:text-[11px]';
    } else {
      debriefGrade.textContent = '최우수 안전 대원 (S등급)';
      debriefGrade.className = 'px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] sm:text-[11px]';
    }

    debriefCurriculumNote.innerHTML = `<strong>📚 [교과 & 안전 핵심 정리 - ${st.curriculumFocus}]</strong><br/>우측 미니맵에서 나의 실제 이동 궤적(🟢안전 이동, 🔵낮은 자세, 🔴화상·질식 지점)을 복기하고, [🏅 수료증·스킨]에서 배지와 직업 스킨을 확인해 보세요!`;

    renderReplayMinimap();
  }

  // --- Stage Clear / Game Over Handlers (Bug #4 Fix: Record final position in pathHistory) ---
  function handleStageClear() {
    clearAllInputStates();
    SoundFX.win();
    SoundFX.speak('안전하게 탈출에 성공했습니다! 참 잘했어요!');

    // Bug #4 Fix: Push exact exit coordinate so replay trajectory connects to the exit
    pathHistory.push({ x: player.x, y: player.y, state: player.crouching ? 'crouch' : 'safe' });

    if (currentStageIdx === 3 || currentStageIdx === 4 || currentStageIdx === 6) {
      unlockBadge('school_metro');
    }

    const timeBonus = Math.max(0, Math.round((90 - elapsedSeconds) * 8));
    const vitalsBonus = Math.round((player.hp + player.o2) * 2);
    const coopBonus = isCoopMode ? 300 : 0;
    const safetyBonus = (player.wetTowel ? 200 : 0) + (player.fireDoorsClosed * 100) + (player.rescuedNpcs * 250) + (player.rescuedDog ? 300 : 0) + coopBonus;
    score += timeBonus + vitalsBonus + safetyBonus;
    saveBestScore(score);
    updateHUD();

    const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const secs = String(Math.floor(elapsedSeconds % 60)).padStart(2, '0');
    statTime.textContent = `${mins}:${secs}`;
    statVitals.textContent = `${Math.round(player.hp)}% / ${Math.round(player.o2)}%`;
    statScore.textContent = score.toLocaleString();
    overlayStats.classList.remove('hidden');
    overlayStats.classList.add('grid');
    overlayTipsBox.classList.add('hidden');
    btnOpenCertFromOverlay.classList.remove('hidden');
    populateDebriefReport(false);

    const activeSt = activeCustomStage || STAGES[currentStageIdx] || STAGES[0];
    recordClassScore(activeSt.name, score, debriefGrade.textContent);

    if (activeCustomStage) {
      gameState = 'STAGE_CLEAR';
      overlayIcon.textContent = activeCustomStage.isDailyChallenge ? '🎲' : '🛠️';
      overlaySubtitle.textContent = `${activeSt.name} 클리어!`;
      overlayTitle.textContent = activeCustomStage.isDailyChallenge
        ? '오늘의 119 돌발 재난 챌린지를 돌파했습니다!'
        : '직접 설계한 커스텀 대피도를 돌파했습니다!';
      overlayDesc.innerHTML = `${activeCustomStage.isDailyChallenge ? '오늘의 돌발 재난' : '나만의 대피도'} 탈출 성공! (보너스 <strong>+${(timeBonus + vitalsBonus + safetyBonus).toLocaleString()}점</strong>)`;
      btnPrimaryAction.textContent = '1단계 본편으로 이동 ▶';
      btnSecondaryAction.classList.remove('hidden');
      btnSecondaryAction.textContent = '이 맵 다시하기';
    } else if (currentStageIdx === 5) {
      gameState = 'STAGE_CLEAR';
      overlayIcon.textContent = '🔍';
      overlaySubtitle.textContent = '우리 집 화재 예방 사전 점검 완료!';
      overlayTitle.textContent = '집 안의 위험요소 5곳을 모두 해결했습니다!';
      overlayDesc.innerHTML = `훌륭합니다! 문어발 콘센트·가스불·적치물·난방기구·소방시설을 모두 안전하게 조치했습니다. (보너스 <strong>+${(timeBonus + vitalsBonus + safetyBonus).toLocaleString()}점</strong>)`;
      btnPrimaryAction.textContent = '1단계 실전 대피 시작 ▶';
      btnSecondaryAction.classList.remove('hidden');
      btnSecondaryAction.textContent = '예방 점검 다시하기';
    } else if (currentStageIdx < 4 || currentStageIdx === 4) {
      gameState = 'STAGE_CLEAR';
      overlayIcon.textContent = '🎉';
      overlaySubtitle.textContent = `${activeSt.name} 돌파 성공!`;
      overlayTitle.textContent = '안전하게 구역을 탈출했습니다!';
      overlayDesc.innerHTML = `침착한 대처로 위기를 넘겼습니다! (보너스 <strong>+${(timeBonus + vitalsBonus + safetyBonus).toLocaleString()}점</strong>)<br/>아래 안전 진단표와 동선 리플레이를 확인하고 다음 단계로 이동하세요!`;
      btnPrimaryAction.textContent = '다음 단계로 이동 ▶';
      btnSecondaryAction.classList.remove('hidden');
      btnSecondaryAction.textContent = '현재 단계 다시하기';
    } else {
      gameState = 'ALL_CLEAR';
      overlayIcon.textContent = '🏆';
      overlaySubtitle.textContent = '전 스테이지 마스터 달성!';
      overlayTitle.textContent = '모든 재난 현장에서 완벽히 살아남았습니다!';
      overlayDesc.innerHTML = `축하합니다! 가정·학교 과학실·다중이용시설(지하철)·캠핑장 배터리 화재 및 사전 예방 점검까지 모든 화재 안전 수칙을 완벽하게 체득했습니다!`;
      btnPrimaryAction.textContent = '1단계부터 다시 도전';
      btnSecondaryAction.classList.add('hidden');
    }
    gameOverlay.classList.remove('hidden');
    overlaySelectedIndex = 0;
    setTimeout(updateOverlaySelectionUI, 20);
  }

  function handleGameOver(reason) {
    clearAllInputStates();
    gameState = 'GAME_OVER';
    SoundFX.gameOver();

    // Bug #4 Fix: Push exact game-over position to pathHistory
    pathHistory.push({ x: player.x, y: player.y, state: 'hurt' });

    saveBestScore(score);
    updateHUD();

    const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const secs = String(Math.floor(elapsedSeconds % 60)).padStart(2, '0');
    statTime.textContent = `${mins}:${secs}`;
    statVitals.textContent = `0%`;
    statScore.textContent = score.toLocaleString();
    overlayStats.classList.remove('hidden');
    overlayStats.classList.add('grid');
    overlayTipsBox.classList.add('hidden');
    btnOpenCertFromOverlay.classList.remove('hidden');
    populateDebriefReport(true);

    overlayIcon.textContent = '⚠️';
    overlaySubtitle.textContent = '대피 실패 · 동선 리플레이 분석';
    overlayTitle.textContent = reason === 'o2' ? '유독가스에 질식했습니다!' : '불길에 큰 화상을 입었습니다!';
    overlayDesc.innerHTML = reason === 'o2'
      ? '대류 현상으로 뜨거운 연기가 상층부에 가득 차 있습니다. <strong>젖은 수건·방연마스크(😷)</strong>를 쓰고 <strong>낮은 자세(C/Shift)</strong>로 이동하세요.'
      : '옷에 불이 붙었을 때는 뛰지 말고 즉시 <strong>구르기(🔄 버튼 / F키)</strong>를 연타하여 불을 꺼야 합니다!';

    btnPrimaryAction.textContent = '이 단계 다시 도전하기';
    btnSecondaryAction.classList.remove('hidden');
    btnSecondaryAction.textContent = '1단계부터 시작';
    gameOverlay.classList.remove('hidden');
    overlaySelectedIndex = 0;
    setTimeout(updateOverlaySelectionUI, 20);
  }

  // --- Update Loop ---
  function updateGame(dt) {
    if (gameState !== 'PLAYING') return;

    elapsedSeconds += dt;
    fireSpreadTimer += dt;
    pathRecordTimer += dt;
    if (player.hurtCooldown > 0) player.hurtCooldown -= dt;

    const activeSkin = getSelectedSkin();

    let mvX = 0;
    let mvY = 0;
    if (keysPressed.up) mvY -= 1;
    if (keysPressed.down) mvY += 1;
    if (keysPressed.left) mvX -= 1;
    if (keysPressed.right) mvX += 1;

    if (mvX === 0 && mvY === 0 && pointerMoveTarget) {
      const dx = pointerMoveTarget.x - player.x;
      const dy = pointerMoveTarget.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.12) {
        mvX = dx / dist;
        mvY = dy / dist;
      } else {
        pointerMoveTarget = null;
      }
    }

    const isMoving = (mvX !== 0 || mvY !== 0);

    if (isMoving) {
      const len = Math.hypot(mvX, mvY);
      mvX /= len;
      mvY /= len;
      player.dirX = mvX;
      player.dirY = mvY;

      let baseSpeed = player.crouching
        ? 2.45 * (activeSkin.crouchSpeedBonus || 1.0)
        : 3.55;
      if (player.carryingToy) baseSpeed *= 0.72;
      const stepX = mvX * baseSpeed * dt;
      const stepY = mvY * baseSpeed * dt;

      if (canMoveTo(player.x + stepX, player.y, player.radius)) {
        player.x += stepX;
      } else if (Math.abs(mvX) > 0.5) {
        const centerY = Math.floor(player.y) + 0.5;
        const diffY = centerY - player.y;
        if (Math.abs(diffY) > 0.03 && Math.abs(diffY) < 0.42) {
          const nudgeY = Math.sign(diffY) * Math.min(Math.abs(diffY), 2.2 * dt);
          if (canMoveTo(player.x + stepX * 0.5, player.y + nudgeY, player.radius)) {
            player.y += nudgeY;
          }
        }
      }

      if (canMoveTo(player.x, player.y + stepY, player.radius)) {
        player.y += stepY;
      } else if (Math.abs(mvY) > 0.5) {
        const centerX = Math.floor(player.x) + 0.5;
        const diffX = centerX - player.x;
        if (Math.abs(diffX) > 0.03 && Math.abs(diffX) < 0.42) {
          const nudgeX = Math.sign(diffX) * Math.min(Math.abs(diffX), 2.2 * dt);
          if (canMoveTo(player.x + nudgeX, player.y + stepY * 0.5, player.radius)) {
            player.x += nudgeX;
          }
        }
      }
    }

    // 2P Co-op Movement (Player 2 controlled by Arrow Keys or mobile touch pointer when isCoopMode is ON)
    if (isCoopMode) {
      let mv2X = 0;
      let mv2Y = 0;
      if (keysPressed2.up) mv2Y -= 1;
      if (keysPressed2.down) mv2Y += 1;
      if (keysPressed2.left) mv2X -= 1;
      if (keysPressed2.right) mv2X += 1;

      if (mv2X === 0 && mv2Y === 0 && pointerMoveTarget) {
        const dx2 = pointerMoveTarget.x - player2.x;
        const dy2 = pointerMoveTarget.y - player2.y;
        const dist2 = Math.hypot(dx2, dy2);
        if (dist2 > 0.14) {
          mv2X = dx2 / dist2;
          mv2Y = dy2 / dist2;
        }
      }

      if (mv2X !== 0 || mv2Y !== 0) {
        const len2 = Math.hypot(mv2X, mv2Y);
        mv2X /= len2;
        mv2Y /= len2;
        player2.dirX = mv2X;
        player2.dirY = mv2Y;
        const speed2 = player2.crouching ? 2.55 : 3.55;
        const step2X = mv2X * speed2 * dt;
        const step2Y = mv2Y * speed2 * dt;
        if (canMoveTo(player2.x + step2X, player2.y, player2.radius)) {
          player2.x += step2X;
        }
        if (canMoveTo(player2.x, player2.y + step2Y, player2.radius)) {
          player2.y += step2Y;
        }
      }
    }

    const pc = Math.floor(player.x);
    const pr = Math.floor(player.y);
    const p2c = Math.floor(player2.x);
    const p2r = Math.floor(player2.y);

    // Check if standing on EXIT (1P or 2P in Co-op Mode)
    const p1OnExit = grid[pr] && grid[pr][pc] === TILE.EXIT;
    const p2OnExit = isCoopMode && grid[p2r] && grid[p2r][p2c] === TILE.EXIT;
    if (p1OnExit || p2OnExit) {
      if (isCoopMode && !(p1OnExit && p2OnExit) && Math.hypot(player.x - player2.x, player.y - player2.y) > 1.45) {
        if (player.hurtCooldown <= 0) {
          player.hurtCooldown = 1.6;
          SoundFX.warning();
          showToast('👥 [2인 협동 모드] 1P와 2P 두 명 모두 비상구(EXIT)에 모여야 함께 탈출할 수 있습니다!', 'border-indigo-400');
        }
      } else if (currentStageIdx === 1 && !activeCustomStage && (!player.gasClosed || !player.breakerClosed)) {
        if (player.hurtCooldown <= 0) {
          player.hurtCooldown = 1.5;
          SoundFX.warning();
          if (!player.gasClosed) {
            showToast('⚠️ 주방의 가스 밸브(🔴)를 먼저 잠가야 폭발을 막고 탈출할 수 있습니다!', 'border-red-500');
          } else {
            showToast('⚠️ 거실의 전원 차단기(⚡)를 먼저 내려야 누전 화재를 막고 탈출할 수 있습니다!', 'border-sky-500');
          }
        }
      } else if (currentStageIdx === 5 && !activeCustomStage && player.hazardsFixed < player.totalHazards) {
        if (player.hurtCooldown <= 0) {
          player.hurtCooldown = 1.5;
          SoundFX.warning();
          showToast(`🔍 아직 점검하지 않은 화재 위험요소(⚠️)가 ${player.totalHazards - player.hazardsFixed}곳 남아 있습니다!`, 'border-amber-500');
        }
      } else {
        handleStageClear();
        return;
      }
    }

    // Check Fire Damage & Catching Fire Status
    let inFire = false;
    for (const f of fires) {
      const dist = Math.hypot(player.x - (f.c + 0.5), player.y - (f.r + 0.5));
      if (dist < 0.72) {
        inFire = true;
        break;
      }
    }
    if (inFire) {
      player.hp -= 24 * dt;
      if (!player.onFire) {
        player.onFire = true;
        player.rollNeeded = 2;
        SoundFX.speak('옷에 불이 붙었습니다! 뛰지 말고 멈춰서 바닥에 엎드려 구르세요!');
        showToast('🔥 옷에 불이 옮겨붙었습니다! 뛰지 말고 즉시 [🔄 구르기(F키)] 버튼을 연타하세요!', 'border-red-500');
      }
      if (player.hurtCooldown <= 0) {
        player.hurtCooldown = 0.65;
        SoundFX.hurt();
        addFloatText(player.x, player.y - 0.3, '🔥 화상! 구르기(🔄) 필요!', '#f87171');
      }
    }

    if (player.onFire) {
      const burnRate = isMoving ? 9.5 : 3.5;
      player.hp -= burnRate * dt;
      burnBeepTimer += dt;
      if (burnBeepTimer >= 0.9) {
        burnBeepTimer = 0;
        SoundFX.burnAlert();
      }
    } else {
      burnBeepTimer = 0;
    }

    // Check Smoke Oxygen Drain
    let inSmoke = false;
    for (const s of smokes) {
      const dist = Math.hypot(player.x - (s.c + 0.5), player.y - (s.r + 0.5));
      if (dist < 0.85) {
        inSmoke = true;
        break;
      }
    }

    if (inSmoke) {
      metrics.smokeTimeTotal += dt;
      if (player.crouching) metrics.smokeTimeCrouched += dt;

      let drainRate = 18.0 * (activeSkin.o2DrainMult || 1.0);
      if (player.crouching) drainRate *= 0.35;
      if (player.hasMask) drainRate *= 0.15;
      else if (player.wetTowel) drainRate *= 0.4;
      player.o2 -= drainRate * dt;

      if (!player.crouching && !player.wetTowel && !player.hasMask && player.hurtCooldown <= 0) {
        player.hurtCooldown = 1.1;
        SoundFX.hurt();
        addFloatText(player.x, player.y - 0.3, '💨 상층 연기 흡입! (낮은 자세 필요)', '#38bdf8');
      }
    } else {
      player.o2 = Math.min(100, player.o2 + 4.5 * dt);
    }

    // Record breadcrumb for trajectory replay minimap
    if (pathRecordTimer >= 0.28) {
      pathRecordTimer = 0;
      const ptState = (inFire || player.onFire) ? 'hurt' : (player.crouching ? 'crouch' : 'safe');
      pathHistory.push({ x: player.x, y: player.y, state: ptState });
    }

    // Physical Fire Door & Smoke Spread Simulation:
    // Smoke can spread from existing fires or smoke clouds across FLOOR and OPEN_DOOR tiles,
    // but is physically blocked by closed DOOR, LOCKED_DOOR, and WALL tiles!
    const spreadInterval = player.fireDoorsClosed > 0 ? 11.5 : 7.0;
    if (fireSpreadTimer >= spreadInterval) {
      fireSpreadTimer = 0;
      const sources = [...fires, ...smokes];
      if (sources.length > 0 && smokes.length < 36) {
        const src = sources[Math.floor(Math.random() * sources.length)];
        const dirs = [
          { dc: 1, dr: 0 }, { dc: -1, dr: 0 },
          { dc: 0, dr: 1 }, { dc: 0, dr: -1 }
        ];
        const d = dirs[Math.floor(Math.random() * dirs.length)];
        const nc = src.c + d.dc;
        const nr = src.r + d.dr;
        if (
          nc > 0 && nc < COLS - 1 && nr > 0 && nr < ROWS - 1 &&
          (grid[nr][nc] === TILE.FLOOR || grid[nr][nc] === TILE.OPEN_DOOR) &&
          !smokes.some(s => s.c === nc && s.r === nr)
        ) {
          smokes.push({ c: nc, r: nr, phase: Math.random() * 6.28 });
        }
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = floatTexts.length - 1; i >= 0; i--) {
      const ft = floatTexts[i];
      ft.y += ft.vy;
      ft.alpha -= dt * 0.9;
      if (ft.alpha <= 0) floatTexts.splice(i, 1);
    }

    const target = getInteractTarget();
    if (player.onFire) {
      contextPrompt.classList.remove('opacity-0');
      contextPrompt.classList.add('opacity-100');
      contextPrompt.textContent = `🚨 옷에 불이 붙었습니다! [🔄 구르기 버튼 / F키]를 연타하세요! (${player.rollNeeded}회)`;
    } else if (target) {
      contextPrompt.classList.remove('opacity-0');
      contextPrompt.classList.add('opacity-100');
      if (target.kind === 'item') {
        contextPrompt.textContent = `[터치 / Space / 상호작용] ${target.item.icon} ${target.item.name} 획득·구조`;
      } else if (target.tile === TILE.SINK) {
        contextPrompt.textContent = player.hasTowel && !player.wetTowel
          ? `[터치 / 상호작용] 💧 세면대에서 수건 적시기 & 물양동이 채우기`
          : `[터치 / 상호작용] 💧 세면대 산소 회복 & 물양동이 보충`;
      } else if (target.tile === TILE.DOOR) {
        contextPrompt.textContent = `[터치 / 상호작용] 🤚🚪 손등으로 문 온도 확인 후 열기`;
      } else if (target.tile === TILE.OPEN_DOOR) {
        contextPrompt.textContent = `[터치 / 상호작용] 🚪🛡️ 열린 방화문 다시 닫기 (연기 통과 차단!)`;
      } else if (target.tile === TILE.HOT_DOOR) {
        contextPrompt.textContent = `[터치 / 상호작용] 🤚🌡️ 손등으로 문 손잡이 온도 감지하기 (고온 주의!)`;
      } else if (target.tile === TILE.LOCKED_DOOR) {
        contextPrompt.textContent = `[터치 / 상호작용] 🔒 열쇠로 잠긴 문 열기`;
      } else if (target.tile === TILE.GAS_VALVE) {
        contextPrompt.textContent = `[터치 / 상호작용] 🔴 주방 가스 밸브 잠그기 (가연물 차단)`;
      } else if (target.tile === TILE.BREAKER) {
        contextPrompt.textContent = `[터치 / 상호작용] ⚡ 전원 차단기(두꺼비집) 내리기`;
      } else if (target.tile === TILE.PHONE_119) {
        contextPrompt.textContent = `[터치 / 상호작용] 📞 119에 화재 발생 신고하기`;
      } else if (target.tile === TILE.LIFELINE) {
        contextPrompt.textContent = `[터치 / 상호작용] 🪢 베란다 완강기(3단계 절차)로 탈출하기`;
      } else if (target.tile === TILE.PARTITION) {
        contextPrompt.textContent = `[터치 / 상호작용] 🧱 아파트 베란다 경량칸막이 부수고 옆집으로 탈출하기`;
      } else if (target.tile === TILE.HAZARD) {
        contextPrompt.textContent = `[터치 / 상호작용] 🔍 가정 내 화재 위험요소 점검·수리하기`;
      } else if (target.tile === TILE.ALARM_BELL) {
        contextPrompt.textContent = `[터치 / 상호작용] 🔔 화재 비상벨(발신기) 누르고 "불이야!" 외치기`;
      } else if (target.tile === TILE.DEBRIS) {
        contextPrompt.textContent = `[터치 / 상호작용] 🪓 소방 도끼로 장애물 부수기`;
      } else if (target.tile === TILE.ELEVATOR) {
        contextPrompt.textContent = `⚠️ 엘리베이터 (화재 시 탑승 절대 금지!)`;
      }
    } else {
      contextPrompt.classList.remove('opacity-100');
      contextPrompt.classList.add('opacity-0');
    }

    if (player.hp <= 0) {
      player.hp = 0;
      handleGameOver('hp');
      return;
    }
    if (player.o2 <= 0) {
      player.o2 = 0;
      handleGameOver('o2');
      return;
    }

    updateHUD();
  }

  // --- Coordinate Helper for Canvas Touch / Click ---
  function getCanvasGridCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    const tileW = rect.width / COLS;
    const tileH = rect.height / ROWS;
    const tileSize = Math.min(tileW, tileH);
    const offsetX = (rect.width - tileSize * COLS) / 2;
    const offsetY = (rect.height - tileSize * ROWS) / 2;
    const gx = (cx - offsetX) / tileSize;
    const gy = (cy - offsetY) / tileSize;
    return { gx, gy, c: Math.floor(gx), r: Math.floor(gy) };
  }

  // --- Render Canvas (Bug #2 Fix: Real Fog-of-War & Glowing Exit Signs on Dark Stage) ---
  function renderCanvas() {
    const width = cssCanvasW;
    const height = cssCanvasH;
    if (!width || !height || !grid || grid.length < ROWS) return;

    const tileW = width / COLS;
    const tileH = height / ROWS;
    const tileSize = Math.min(tileW, tileH);
    const offsetX = (width - tileSize * COLS) / 2;
    const offsetY = (height - tileSize * ROWS) / 2;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(offsetX, offsetY);

    const now = performance.now() * 0.004;
    const st = activeCustomStage || STAGES[currentStageIdx] || STAGES[0];

    // 1. Draw Grid Tiles
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = grid[r][c];
        const x = c * tileSize;
        const y = r * tileSize;

        ctx.fillStyle = ((c + r) % 2 === 0) ? '#1e293b' : '#192334';
        ctx.fillRect(x, y, tileSize, tileSize);
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.strokeRect(x, y, tileSize, tileSize);

        if (t === TILE.WALL) {
          ctx.fillStyle = '#334155';
          ctx.fillRect(x, y, tileSize, tileSize);
          ctx.fillStyle = '#475569';
          ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize * 0.25);
          ctx.strokeStyle = '#0f172a';
          ctx.strokeRect(x, y, tileSize, tileSize);
        } else if (t === TILE.FURNITURE) {
          ctx.fillStyle = '#451a03';
          ctx.fillRect(x + tileSize * 0.1, y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + tileSize * 0.1, y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
          ctx.lineWidth = 1;
        } else if (t === TILE.DOOR) {
          ctx.fillStyle = '#92400e';
          ctx.fillRect(x + tileSize * 0.12, y + tileSize * 0.12, tileSize * 0.76, tileSize * 0.76);
          ctx.font = `${Math.floor(tileSize * 0.48)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🚪', x + tileSize * 0.5, y + tileSize * 0.52);
        } else if (t === TILE.OPEN_DOOR) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + tileSize * 0.08, y + tileSize * 0.08, tileSize * 0.84, tileSize * 0.84);
          ctx.lineWidth = 1;
          ctx.fillStyle = '#fcd34d';
          ctx.font = `bold ${Math.floor(tileSize * 0.19)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('열린문(닫기)', x + tileSize * 0.5, y + tileSize * 0.84);
        } else if (t === TILE.HOT_DOOR) {
          const pulse = 0.65 + 0.35 * Math.sin(now * 3.5);
          ctx.fillStyle = `rgba(185, 28, 28, ${pulse})`;
          ctx.fillRect(x + tileSize * 0.1, y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + tileSize * 0.1, y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
          ctx.lineWidth = 1;
          ctx.font = `${Math.floor(tileSize * 0.42)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🚪', x + tileSize * 0.45, y + tileSize * 0.48);
          ctx.font = `${Math.floor(tileSize * 0.32)}px sans-serif`;
          ctx.fillText('🌡️', x + tileSize * 0.72, y + tileSize * 0.32);
        } else if (t === TILE.LOCKED_DOOR) {
          ctx.fillStyle = '#7c2d12';
          ctx.fillRect(x + tileSize * 0.1, y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + tileSize * 0.1, y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
          ctx.lineWidth = 1;
          ctx.font = `${Math.floor(tileSize * 0.46)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🔒', x + tileSize * 0.5, y + tileSize * 0.52);
        } else if (t === TILE.SINK) {
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(x + tileSize * 0.1, y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
          ctx.font = `${Math.floor(tileSize * 0.5)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🚰', x + tileSize * 0.5, y + tileSize * 0.52);
        } else if (t === TILE.ELEVATOR) {
          ctx.fillStyle = '#3f3f46';
          ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
          ctx.strokeStyle = '#ef4444';
          ctx.strokeRect(x + 3, y + 3, tileSize - 6, tileSize - 6);
          ctx.font = `bold ${Math.floor(tileSize * 0.22)}px sans-serif`;
          ctx.fillStyle = '#fca5a5';
          ctx.textAlign = 'center';
          ctx.fillText('승강기금지', x + tileSize * 0.5, y + tileSize * 0.82);
          ctx.font = `${Math.floor(tileSize * 0.38)}px sans-serif`;
          ctx.fillText('🛗', x + tileSize * 0.5, y + tileSize * 0.42);
        } else if (t === TILE.EXIT) {
          const glow = 0.65 + 0.35 * Math.sin(now * 2);
          ctx.fillStyle = `rgba(16, 185, 129, ${glow})`;
          ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
          ctx.strokeStyle = '#6ee7b7';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 3, y + 3, tileSize - 6, tileSize - 6);
          ctx.lineWidth = 1;
          ctx.fillStyle = '#ffffff';
          ctx.font = `900 ${Math.floor(tileSize * 0.25)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('EXIT', x + tileSize * 0.5, y + tileSize * 0.35);
          ctx.font = `${Math.floor(tileSize * 0.38)}px sans-serif`;
          ctx.fillText('🏃', x + tileSize * 0.5, y + tileSize * 0.72);
        } else if (t === TILE.DEBRIS) {
          ctx.fillStyle = '#713f12';
          ctx.fillRect(x + tileSize * 0.08, y + tileSize * 0.08, tileSize * 0.84, tileSize * 0.84);
          ctx.font = `${Math.floor(tileSize * 0.5)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🪵', x + tileSize * 0.5, y + tileSize * 0.52);
        } else if (t === TILE.GAS_VALVE) {
          ctx.fillStyle = player.gasClosed ? '#065f46' : '#991b1b';
          ctx.fillRect(x + tileSize * 0.1, y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
          ctx.font = `${Math.floor(tileSize * 0.42)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(player.gasClosed ? '✅' : '🔴', x + tileSize * 0.5, y + tileSize * 0.42);
          ctx.font = `bold ${Math.floor(tileSize * 0.2)}px sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText('가스밸브', x + tileSize * 0.5, y + tileSize * 0.82);
        } else if (t === TILE.BREAKER) {
          ctx.fillStyle = player.breakerClosed ? '#065f46' : '#1e3a8a';
          ctx.fillRect(x + tileSize * 0.1, y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
          ctx.strokeStyle = '#60a5fa';
          ctx.strokeRect(x + tileSize * 0.1, y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
          ctx.font = `${Math.floor(tileSize * 0.4)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(player.breakerClosed ? '✅' : '⚡', x + tileSize * 0.5, y + tileSize * 0.42);
          ctx.font = `bold ${Math.floor(tileSize * 0.2)}px sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText('차단기', x + tileSize * 0.5, y + tileSize * 0.82);
        } else if (t === TILE.PHONE_119) {
          ctx.fillStyle = metrics.called119 ? '#065f46' : '#581c87';
          ctx.fillRect(x + tileSize * 0.1, y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
          ctx.strokeStyle = '#c084fc';
          ctx.strokeRect(x + tileSize * 0.1, y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
          ctx.font = `${Math.floor(tileSize * 0.4)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('📞', x + tileSize * 0.5, y + tileSize * 0.42);
          ctx.font = `bold ${Math.floor(tileSize * 0.2)}px sans-serif`;
          ctx.fillStyle = '#f3e8ff';
          ctx.fillText('119신고', x + tileSize * 0.5, y + tileSize * 0.82);
        } else if (t === TILE.LIFELINE) {
          ctx.fillStyle = '#0f766e';
          ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
          ctx.strokeStyle = '#2dd4bf';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 3, y + 3, tileSize - 6, tileSize - 6);
          ctx.lineWidth = 1;
          ctx.font = `${Math.floor(tileSize * 0.42)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🪢', x + tileSize * 0.5, y + tileSize * 0.42);
          ctx.font = `bold ${Math.floor(tileSize * 0.22)}px sans-serif`;
          ctx.fillStyle = '#ccfbf1';
          ctx.fillText('완강기', x + tileSize * 0.5, y + tileSize * 0.82);
        } else if (t === TILE.PARTITION) {
          ctx.fillStyle = '#854d0e';
          ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
          ctx.strokeStyle = '#fde047';
          ctx.setLineDash([3, 2]);
          ctx.strokeRect(x + 3, y + 3, tileSize - 6, tileSize - 6);
          ctx.setLineDash([]);
          ctx.font = `${Math.floor(tileSize * 0.38)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🧱', x + tileSize * 0.5, y + tileSize * 0.4);
          ctx.font = `bold ${Math.floor(tileSize * 0.19)}px sans-serif`;
          ctx.fillStyle = '#fef08a';
          ctx.fillText('경량칸막이', x + tileSize * 0.5, y + tileSize * 0.82);
        } else if (t === TILE.HAZARD) {
          const pulse = 0.65 + 0.35 * Math.sin(now * 4);
          ctx.fillStyle = `rgba(217, 119, 6, ${pulse})`;
          ctx.fillRect(x + 3, y + 3, tileSize - 6, tileSize - 6);
          ctx.font = `${Math.floor(tileSize * 0.44)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚠️', x + tileSize * 0.5, y + tileSize * 0.45);
          ctx.font = `bold ${Math.floor(tileSize * 0.19)}px sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText('위험요소', x + tileSize * 0.5, y + tileSize * 0.82);
        } else if (t === TILE.ALARM_BELL) {
          ctx.fillStyle = player.alarmRung ? '#065f46' : '#991b1b';
          ctx.fillRect(x + tileSize * 0.1, y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
          ctx.strokeStyle = '#facc15';
          ctx.strokeRect(x + tileSize * 0.1, y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
          ctx.font = `${Math.floor(tileSize * 0.4)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🔔', x + tileSize * 0.5, y + tileSize * 0.42);
          ctx.font = `bold ${Math.floor(tileSize * 0.2)}px sans-serif`;
          ctx.fillStyle = '#fef08a';
          ctx.fillText('비상벨', x + tileSize * 0.5, y + tileSize * 0.82);
        }
      }
    }

    // 1.5 Draw Green Evacuation Guide Signs & Glowing Exits
    function drawGuideSignsAndExits(isGlowLayer = false) {
      for (const gs of guideSigns) {
        const gx = (gs.c + 0.5) * tileSize;
        const gy = (gs.r + 0.5) * tileSize;
        ctx.fillStyle = isGlowLayer ? 'rgba(16, 185, 129, 0.52)' : 'rgba(16, 185, 129, 0.28)';
        ctx.fillRect(gx - tileSize * 0.32, gy - tileSize * 0.2, tileSize * 0.64, tileSize * 0.4);
        ctx.strokeStyle = '#34d399';
        ctx.strokeRect(gx - tileSize * 0.32, gy - tileSize * 0.2, tileSize * 0.64, tileSize * 0.4);
        ctx.fillStyle = '#6ee7b7';
        ctx.font = `900 ${Math.floor(tileSize * 0.26)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`🏃${gs.dir}`, gx, gy);
      }

      if (isGlowLayer) {
        const glow = 0.65 + 0.35 * Math.sin(now * 2);
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (grid[r][c] === TILE.EXIT) {
              const x = c * tileSize;
              const y = r * tileSize;
              ctx.fillStyle = `rgba(16, 185, 129, ${glow * 0.85})`;
              ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
              ctx.strokeStyle = '#6ee7b7';
              ctx.lineWidth = 2;
              ctx.strokeRect(x + 3, y + 3, tileSize - 6, tileSize - 6);
              ctx.lineWidth = 1;
              ctx.fillStyle = '#ffffff';
              ctx.font = `900 ${Math.floor(tileSize * 0.25)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('EXIT', x + tileSize * 0.5, y + tileSize * 0.35);
              ctx.font = `${Math.floor(tileSize * 0.38)}px sans-serif`;
              ctx.fillText('🏃', x + tileSize * 0.5, y + tileSize * 0.72);
            }
          }
        }
      }
    }
    drawGuideSignsAndExits(false);

    // 2. Draw Smoke Clouds
    for (const s of smokes) {
      const sx = (s.c + 0.5) * tileSize;
      const sy = (s.r + 0.5) * tileSize;
      const wobble = Math.sin(now + s.phase) * tileSize * 0.06;
      const grad = ctx.createRadialGradient(sx + wobble, sy, tileSize * 0.1, sx, sy, tileSize * 0.65);
      grad.addColorStop(0, 'rgba(100, 116, 139, 0.72)');
      grad.addColorStop(1, 'rgba(51, 65, 85, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, tileSize * 0.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `${Math.floor(tileSize * 0.36)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💨', sx + wobble, sy);
    }

    // 3. Draw Fires
    for (const f of fires) {
      const fx = (f.c + 0.5) * tileSize;
      const fy = (f.r + 0.5) * tileSize;
      const flicker = 0.85 + 0.2 * Math.sin(now * 3.5 + f.phase);
      const grad = ctx.createRadialGradient(fx, fy, tileSize * 0.08, fx, fy, tileSize * 0.62 * flicker);
      if (f.fireType === 'electric') {
        grad.addColorStop(0, 'rgba(191, 219, 254, 0.95)');
        grad.addColorStop(0.5, 'rgba(59, 130, 246, 0.65)');
        grad.addColorStop(1, 'rgba(37, 99, 235, 0)');
      } else if (f.fireType === 'oil') {
        grad.addColorStop(0, 'rgba(253, 224, 71, 0.95)');
        grad.addColorStop(0.5, 'rgba(217, 119, 6, 0.75)');
        grad.addColorStop(1, 'rgba(180, 83, 9, 0)');
      } else {
        grad.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
        grad.addColorStop(0.5, 'rgba(249, 115, 22, 0.65)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fx, fy, tileSize * 0.62 * flicker, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `${Math.floor(tileSize * 0.5 * flicker)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔥', fx, fy);

      if (f.fireType === 'oil') {
        ctx.font = `${Math.floor(tileSize * 0.3)}px sans-serif`;
        ctx.fillText('🍳', fx + tileSize * 0.22, fy - tileSize * 0.22);
      } else if (f.fireType === 'electric') {
        ctx.font = `${Math.floor(tileSize * 0.3)}px sans-serif`;
        ctx.fillText('⚡', fx + tileSize * 0.22, fy - tileSize * 0.22);
      }
    }

    // 4. Draw Pickup Items
    for (const it of items) {
      const ix = (it.c + 0.5) * tileSize;
      const iy = (it.r + 0.5) * tileSize + Math.sin(now * 2.2 + it.c) * 3;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.beginPath();
      ctx.arc(ix, iy, tileSize * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = it.type === 'toy' ? '#fb7185' : (it.type === 'npc' ? '#4ade80' : '#38bdf8');
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = `${Math.floor(tileSize * 0.44)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(it.icon, ix, iy + 1);
    }

    // 5. Draw Extinguisher / Water Particles
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color === '#60a5fa'
        ? `rgba(96, 165, 250, ${alpha})`
        : `rgba(224, 242, 254, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x * tileSize, p.y * tileSize, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5.5 Draw Touch Target Ring
    if (pointerMoveTarget) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pointerMoveTarget.x * tileSize, pointerMoveTarget.y * tileSize, tileSize * 0.22, 0, Math.PI * 2);
      ctx.stroke();
    }

    const px = player.x * tileSize;
    const py = player.y * tileSize;
    const pRad = 0.32 * tileSize * (player.crouching ? 0.82 : 1.0);
    const auraRadius = tileSize * (player.hasFlashlight ? 4.8 : 2.3);

    // 6. Bug #2 Fix: Real Radial Fog-of-War on Dark Stage (Stage 5)
    if (st.isDarkStage) {
      const innerClear = player.hasFlashlight ? tileSize * 2.2 : tileSize * 0.9;
      const darkOverlay = ctx.createRadialGradient(px, py, innerClear, px, py, auraRadius);
      darkOverlay.addColorStop(0, player.hasFlashlight ? 'rgba(254, 240, 138, 0.08)' : 'rgba(2, 6, 23, 0.1)');
      darkOverlay.addColorStop(0.65, 'rgba(2, 6, 23, 0.62)');
      darkOverlay.addColorStop(1, player.hasFlashlight ? 'rgba(2, 6, 23, 0.78)' : 'rgba(2, 6, 23, 0.90)');
      ctx.fillStyle = darkOverlay;
      ctx.fillRect(0, 0, COLS * tileSize, ROWS * tileSize);

      // Re-draw glowing Green Evacuation Signs & EXIT tiles over the darkness so they shine in the dark!
      drawGuideSignsAndExits(true);
    } else {
      const aura = ctx.createRadialGradient(px, py, pRad * 0.5, px, py, auraRadius);
      aura.addColorStop(0, player.hasFlashlight ? 'rgba(254, 240, 138, 0.26)' : 'rgba(255, 255, 255, 0.14)');
      aura.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(px, py, auraRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Draw Player 1 (with Equipped Character Skin)
    const activeSkin = getSelectedSkin();
    ctx.fillStyle = player.onFire ? '#ef4444' : (player.crouching ? '#10b981' : '#3b82f6');
    ctx.beginPath();
    ctx.arc(px, py, pRad, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = player.hasMask ? '#2dd4bf' : (player.wetTowel ? '#38bdf8' : '#ffffff');
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(
      px + player.dirX * (pRad * 0.75),
      py + player.dirY * (pRad * 0.75),
      Math.max(3, tileSize * 0.08),
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.font = `${Math.floor(tileSize * (player.crouching ? 0.42 : 0.48))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const p1Icon = player.onFire
      ? '🔥'
      : (activeSkin && activeSkin.id !== 'student' ? activeSkin.icon : (player.crouching ? '🧎' : '🏃'));
    ctx.fillText(p1Icon, px, py);

    if (isCoopMode) {
      ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.2))}px sans-serif`;
      ctx.fillStyle = '#93c5fd';
      ctx.fillText('1P', px, py - pRad - 5);
    }

    if (player.wetTowel || player.hasMask) {
      ctx.strokeStyle = player.hasMask ? 'rgba(45, 212, 191, 0.85)' : 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(px, py, pRad + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 7.5 Draw Player 2 (When 2P Co-op Mode is Active)
    if (isCoopMode) {
      const p2x = player2.x * tileSize;
      const p2y = player2.y * tileSize;
      const p2Rad = 0.30 * tileSize * (player2.crouching ? 0.82 : 1.0);

      ctx.fillStyle = player2.crouching ? '#059669' : '#ec4899';
      ctx.beginPath();
      ctx.arc(p2x, p2y, p2Rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fbcfe8';
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(
        p2x + player2.dirX * (p2Rad * 0.75),
        p2y + player2.dirY * (p2Rad * 0.75),
        Math.max(3, tileSize * 0.07),
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.font = `${Math.floor(tileSize * (player2.crouching ? 0.4 : 0.45))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player2.crouching ? '🧎' : '👩‍🚒', p2x, p2y);

      ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.2))}px sans-serif`;
      ctx.fillStyle = '#f9a8d4';
      ctx.fillText('2P', p2x, p2y - p2Rad - 5);
    }

    if (player.rescuedDog) {
      const dogX = px - player.dirX * tileSize * 0.55;
      const dogY = py - player.dirY * tileSize * 0.55;
      ctx.font = `${Math.floor(tileSize * 0.38)}px sans-serif`;
      ctx.fillText('🐶', dogX, dogY);
    }
    if (player.rescuedNpcs > 0) {
      const npcX = px - player.dirX * tileSize * 0.85;
      const npcY = py - player.dirY * tileSize * 0.85;
      ctx.font = `${Math.floor(tileSize * 0.38)}px sans-serif`;
      ctx.fillText('🧒', npcX, npcY);
    }

    // 8. Draw Floating Texts
    for (const ft of floatTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `bold ${Math.max(11, Math.floor(tileSize * 0.26))}px 'Noto Sans KR', sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x * tileSize, ft.y * tileSize);
      ctx.restore();
    }

    ctx.restore();
  }

  // --- Main Animation Loop ---
  function gameLoop(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const dt = Math.min(0.05, (timestamp - lastFrameTime) / 1000);
    lastFrameTime = timestamp;

    if (gameState === 'PLAYING') {
      updateGame(dt);
    }
    renderCanvas();

    animFrameId = requestAnimationFrame(gameLoop);
  }

  // --- High-DPI Canvas Resize ---
  function resizeCanvas() {
    const isBoardZoom = document.body.classList.contains('smartboard-zoom');
    const isMobileViewport = window.innerWidth < 640;
    const containerW = canvasContainer.clientWidth || Math.min(window.innerWidth - 16, isBoardZoom ? 1160 : 980);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssCanvasW = Math.max(280, Math.floor(containerW));
    const aspectH = Math.floor(cssCanvasW * (ROWS / COLS));
    if (isMobileViewport) {
      cssCanvasH = Math.max(200, aspectH);
    } else {
      const maxViewportH = Math.max(320, Math.min(isBoardZoom ? 660 : 540, Math.floor(window.innerHeight * (isBoardZoom ? 0.65 : 0.55))));
      cssCanvasH = Math.max(320, Math.min(Math.max(aspectH, 320), maxViewportH));
    }
    canvasContainer.style.height = cssCanvasH + 'px';
    canvas.style.width = cssCanvasW + 'px';
    canvas.style.height = cssCanvasH + 'px';
    canvas.width = Math.floor(cssCanvasW * dpr);
    canvas.height = Math.floor(cssCanvasH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderCanvas();
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 120);
  });
  if (typeof ResizeObserver !== 'undefined' && canvasContainer.parentElement) {
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(canvasContainer.parentElement);
  }

  // --- Direct Canvas Touch / Pointer Support ---
  let canvasPointerDown = false;
  function handleCanvasPointer(clientX, clientY, isTapStart) {
    if (gameState !== 'PLAYING') return;
    SoundFX.init();
    const { gx, gy, c, r } = getCanvasGridCoords(clientX, clientY);
    if (gx < 0 || gx > COLS || gy < 0 || gy > ROWS) return;

    if (isTapStart) {
      const tappedFire = fires.find(f => f.c === c && f.r === r);
      const distToTap = Math.hypot((c + 0.5) - player.x, (r + 0.5) - player.y);
      if (tappedFire) {
        const dx = (c + 0.5) - player.x;
        const dy = (r + 0.5) - player.y;
        const len = Math.hypot(dx, dy) || 1;
        player.dirX = dx / len;
        player.dirY = dy / len;
        pointerMoveTarget = null;
        if (distToTap <= 2.8) {
          if (player.extinguisherCharges > 0) {
            useExtinguisher();
          } else if (player.waterCharges > 0) {
            useWaterBucket();
          } else {
            showToast('🔥 불길입니다! 소화기(🧯)나 물양동이(🪣)를 획득해 진압하거나 우회하세요!', 'border-red-500');
          }
        } else {
          showToast('🔥 불길이 멀리 있습니다. 불길 근처(2칸 이내)로 이동한 뒤 터치하여 진압하세요!');
        }
        return;
      }

      if (distToTap <= 1.65) {
        const dx = (c + 0.5) - player.x;
        const dy = (r + 0.5) - player.y;
        const len = Math.hypot(dx, dy) || 1;
        player.dirX = dx / len;
        player.dirY = dy / len;

        const tappedItemIdx = items.findIndex(it => it.c === c && it.r === r);
        const tappedTile = (grid[r] && grid[r][c]) || 0;
        if (tappedItemIdx !== -1) {
          pointerMoveTarget = null;
          triggerInteraction({ kind: 'item', index: tappedItemIdx, item: items[tappedItemIdx] });
          return;
        }
        const isStandingInTile = (Math.floor(player.x) === c && Math.floor(player.y) === r);
        if (
          !isStandingInTile &&
          [TILE.DOOR, TILE.OPEN_DOOR, TILE.HOT_DOOR, TILE.LOCKED_DOOR, TILE.SINK, TILE.ELEVATOR, TILE.DEBRIS, TILE.GAS_VALVE, TILE.PHONE_119, TILE.BREAKER, TILE.LIFELINE, TILE.PARTITION, TILE.HAZARD, TILE.ALARM_BELL].includes(tappedTile)
        ) {
          pointerMoveTarget = null;
          triggerInteraction({ kind: 'tile', c, r, tile: tappedTile });
          return;
        }
      }
    }

    pointerMoveTarget = { x: gx, y: gy };
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvasPointerDown = true;
    handleCanvasPointer(e.clientX, e.clientY, true);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!canvasPointerDown || gameState !== 'PLAYING') return;
    handleCanvasPointer(e.clientX, e.clientY, false);
  });

  window.addEventListener('pointerup', () => {
    canvasPointerDown = false;
    pointerMoveTarget = null;
  });

  window.addEventListener('pointercancel', () => {
    canvasPointerDown = false;
    pointerMoveTarget = null;
  });

  // --- Keyboard Controls ---
  window.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
      if (e.code === 'Escape') document.activeElement.blur();
      return;
    }

    if (!eduModal.classList.contains('hidden')) {
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        if (eduChoiceButtons.length > 0) {
          SoundFX.init();
          SoundFX.playTone(480, 'sine', 0.06, 0.08);
          eduSelectedIndex = (eduSelectedIndex - 1 + eduChoiceButtons.length) % eduChoiceButtons.length;
          updateEduSelectionUI();
        }
        return;
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'Tab') {
        e.preventDefault();
        if (eduChoiceButtons.length > 0) {
          SoundFX.init();
          SoundFX.playTone(540, 'sine', 0.06, 0.08);
          eduSelectedIndex = (eduSelectedIndex + 1) % eduChoiceButtons.length;
          updateEduSelectionUI();
        }
        return;
      }
      if ((e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space' || e.code === 'KeyE') && !e.repeat) {
        e.preventDefault();
        if (eduChoiceButtons[eduSelectedIndex]) {
          eduChoiceButtons[eduSelectedIndex].click();
        }
        return;
      }
      if (e.code.startsWith('Digit') || e.code.startsWith('Numpad')) {
        const num = parseInt(e.code.replace('Digit', '').replace('Numpad', ''), 10);
        if (num >= 1 && num <= eduChoiceButtons.length) {
          e.preventDefault();
          eduSelectedIndex = num - 1;
          updateEduSelectionUI();
          eduChoiceButtons[eduSelectedIndex].click();
          return;
        }
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        closeEduModal();
        return;
      }
      return;
    }

    if (!guideModal.classList.contains('hidden')) {
      if ((e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space' || e.code === 'Escape') && !e.repeat) {
        e.preventDefault();
        closeGuideModal();
      }
      return;
    }

    if (!certModal.classList.contains('hidden')) {
      if ((e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space' || e.code === 'Escape') && !e.repeat) {
        e.preventDefault();
        btnConfirmCertModal.click();
      }
      return;
    }

    if (classModal && !classModal.classList.contains('hidden')) {
      if ((e.code === 'Escape' || e.code === 'Enter') && !e.repeat) {
        e.preventDefault();
        closeClassModalFn();
      }
      return;
    }

    if (teacherModal && !teacherModal.classList.contains('hidden')) {
      if ((e.code === 'Escape' || e.code === 'Enter') && !e.repeat) {
        e.preventDefault();
        closeTeacherModalFn();
      }
      return;
    }

    if (!mapEditorModal.classList.contains('hidden')) {
      if (e.code === 'Escape' && !e.repeat) {
        e.preventDefault();
        closeMapEditorModal();
      }
      return;
    }

    if (!gameOverlay.classList.contains('hidden')) {
      const btns = getVisibleOverlayButtons();
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        if (btns.length > 1) {
          SoundFX.init();
          SoundFX.playTone(480, 'sine', 0.06, 0.08);
          overlaySelectedIndex = (overlaySelectedIndex - 1 + btns.length) % btns.length;
          updateOverlaySelectionUI();
        }
        return;
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'Tab') {
        e.preventDefault();
        if (btns.length > 1) {
          SoundFX.init();
          SoundFX.playTone(540, 'sine', 0.06, 0.08);
          overlaySelectedIndex = (overlaySelectedIndex + 1) % btns.length;
          updateOverlaySelectionUI();
        }
        return;
      }
      if ((e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') && !e.repeat) {
        e.preventDefault();
        const targetBtn = btns[overlaySelectedIndex] || btnPrimaryAction;
        if (targetBtn) targetBtn.click();
        return;
      }
      return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'].includes(e.code)) {
      if (gameState === 'PLAYING') e.preventDefault();
    }

    if (isCoopMode) {
      // 1P: WASD / 2P: Arrow Keys
      if (e.code === 'KeyW') { keysPressed.up = true; pointerMoveTarget = null; }
      if (e.code === 'KeyS') { keysPressed.down = true; pointerMoveTarget = null; }
      if (e.code === 'KeyA') { keysPressed.left = true; pointerMoveTarget = null; }
      if (e.code === 'KeyD') { keysPressed.right = true; pointerMoveTarget = null; }

      if (e.code === 'ArrowUp') { keysPressed2.up = true; }
      if (e.code === 'ArrowDown') { keysPressed2.down = true; }
      if (e.code === 'ArrowLeft') { keysPressed2.left = true; }
      if (e.code === 'ArrowRight') { keysPressed2.right = true; }
    } else {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { keysPressed.up = true; pointerMoveTarget = null; }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { keysPressed.down = true; pointerMoveTarget = null; }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keysPressed.left = true; pointerMoveTarget = null; }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { keysPressed.right = true; pointerMoveTarget = null; }
    }

    if ((e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Slash') && !e.repeat) {
      if (gameState === 'PLAYING') {
        if (player.onFire) {
          performStopDropRoll();
          return;
        }
        const is2PKey = isCoopMode && (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Slash');
        const actor = is2PKey ? player2 : player;
        const target = is2PKey ? (getInteractTargetForActor(player2) || getInteractTargetForActor(player)) : getInteractTarget();
        const hasFireAhead = player.extinguisherCharges > 0 && fires.some((f) => {
          const dx = (f.c + 0.5) - actor.x;
          const dy = (f.r + 0.5) - actor.y;
          const dist = Math.hypot(dx, dy);
          const dot = (dx * actor.dirX + dy * actor.dirY) / (dist || 1);
          return dist <= 2.4 && (dot > 0.45 || dist < 1.15);
        });
        const isPassiveTile = target && target.kind === 'tile' && (
          target.tile === TILE.ELEVATOR ||
          target.tile === TILE.OPEN_DOOR ||
          (target.tile === TILE.SINK && (!player.hasTowel || player.wetTowel)) ||
          (target.tile === TILE.GAS_VALVE && player.gasClosed) ||
          (target.tile === TILE.BREAKER && player.breakerClosed) ||
          (target.tile === TILE.ALARM_BELL && player.alarmRung)
        );
        if (hasFireAhead && (!target || isPassiveTile)) {
          useExtinguisher(actor);
        } else if (target) {
          triggerInteraction(target);
        } else {
          useExtinguisher(actor);
        }
      }
    }
    if (e.code === 'KeyQ') {
      if (gameState === 'PLAYING') useWaterBucket();
    }
    if (e.code === 'KeyF') {
      if (gameState === 'PLAYING') performStopDropRoll();
    }
    if (e.code === 'ShiftLeft' || e.code === 'KeyC') {
      if (gameState === 'PLAYING') toggleCrouch();
    }
    if (e.code === 'ShiftRight') {
      if (gameState === 'PLAYING') {
        if (isCoopMode) {
          player2.crouching = !player2.crouching;
          showToast(player2.crouching ? '🧎 [2P 낮은 자세] 2P 대원이 자세를 낮췄습니다!' : '🚶 [2P 서서 이동] 2P 대원이 일어섰습니다.');
        } else {
          toggleCrouch();
        }
      }
    }
    if (e.code === 'KeyR') {
      if (gameState === 'PLAYING' || gameState === 'PAUSED') {
        score = stageStartScore;
        loadStage(currentStageIdx, false, activeCustomStage);
        gameState = 'PLAYING';
        pauseIcon.textContent = '⏸️';
        pauseText.textContent = '일시정지';
        showToast('🔄 현재 스테이지를 처음부터 다시 시작합니다.');
      }
    }
    if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) {
      if (gameState === 'PLAYING' || gameState === 'PAUSED') {
        e.preventDefault();
        btnPause.click();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (isCoopMode) {
      if (e.code === 'KeyW') keysPressed.up = false;
      if (e.code === 'KeyS') keysPressed.down = false;
      if (e.code === 'KeyA') keysPressed.left = false;
      if (e.code === 'KeyD') keysPressed.right = false;
      if (e.code === 'ArrowUp') keysPressed2.up = false;
      if (e.code === 'ArrowDown') keysPressed2.down = false;
      if (e.code === 'ArrowLeft') keysPressed2.left = false;
      if (e.code === 'ArrowRight') keysPressed2.right = false;
    } else {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keysPressed.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keysPressed.down = false;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysPressed.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysPressed.right = false;
    }
  });

  const dpadPad = document.getElementById('dpadPad');
  const dpadKnob = document.getElementById('dpadKnob');
  const btnMoreMenu = document.getElementById('btnMoreMenu');
  const moreToolsDrawer = document.getElementById('moreToolsDrawer');

  if (btnMoreMenu && moreToolsDrawer) {
    btnMoreMenu.addEventListener('click', () => {
      SoundFX.init();
      const isHidden = moreToolsDrawer.classList.contains('hidden');
      if (isHidden) {
        moreToolsDrawer.classList.remove('hidden');
        moreToolsDrawer.classList.add('flex');
      } else {
        moreToolsDrawer.classList.add('hidden');
        moreToolsDrawer.classList.remove('flex');
      }
    });
  }

  function updateDpadVisuals() {
    btnUp.classList.toggle('is-pressed', !!keysPressed.up);
    btnDown.classList.toggle('is-pressed', !!keysPressed.down);
    btnLeft.classList.toggle('is-pressed', !!keysPressed.left);
    btnRight.classList.toggle('is-pressed', !!keysPressed.right);
    if (dpadKnob) {
      const kx = (keysPressed.right ? 10 : 0) - (keysPressed.left ? 10 : 0);
      const ky = (keysPressed.down ? 10 : 0) - (keysPressed.up ? 10 : 0);
      dpadKnob.style.transform = `translate(${kx}px, ${ky}px)`;
    }
  }

  function clearDpadSlideState() {
    keysPressed.up = false;
    keysPressed.down = false;
    keysPressed.left = false;
    keysPressed.right = false;
    updateDpadVisuals();
  }

  if (dpadPad) {
    let dpadPointerId = null;
    const handleDpadMove = (clientX, clientY) => {
      const rect = dpadPad.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      pointerMoveTarget = null;
      if (dist < 8) {
        clearDpadSlideState();
        return;
      }
      const nx = dx / dist;
      const ny = dy / dist;
      keysPressed.right = nx > 0.36;
      keysPressed.left = nx < -0.36;
      keysPressed.down = ny > 0.36;
      keysPressed.up = ny < -0.36;
      updateDpadVisuals();
    };

    dpadPad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      SoundFX.init();
      dpadPointerId = e.pointerId;
      try {
        dpadPad.setPointerCapture(e.pointerId);
      } catch (err) {}
      handleDpadMove(e.clientX, e.clientY);
    });

    dpadPad.addEventListener('pointermove', (e) => {
      if (dpadPointerId === null || e.pointerId !== dpadPointerId) return;
      e.preventDefault();
      handleDpadMove(e.clientX, e.clientY);
    });

    const endDpadSlide = (e) => {
      if (dpadPointerId !== null && e.pointerId === dpadPointerId) {
        dpadPointerId = null;
        clearDpadSlideState();
      }
    };
    dpadPad.addEventListener('pointerup', endDpadSlide);
    dpadPad.addEventListener('pointercancel', endDpadSlide);
    dpadPad.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  btnRoll.addEventListener('click', () => performStopDropRoll());
  btnCrouch.addEventListener('click', () => toggleCrouch());
  btnWaterBucket.addEventListener('click', () => useWaterBucket());
  btnExtinguish.addEventListener('click', () => useExtinguisher());
  btnAction.addEventListener('click', () => {
    if (player.onFire) {
      performStopDropRoll();
    } else {
      triggerInteraction();
    }
  });

  function hideAllModalsAndResume() {
    gameOverlay.classList.add('hidden');
    [eduModal, mapEditorModal, certModal, guideModal, classModal, teacherModal].forEach((m) => {
      if (m) {
        m.classList.add('hidden');
        m.classList.remove('flex');
      }
    });
    gameState = 'PLAYING';
    pauseIcon.textContent = '⏸️';
    pauseText.textContent = '일시정지';
  }

  function selectStageManual(idx) {
    SoundFX.init();
    loadStage(idx, true, null);
    hideAllModalsAndResume();
    if (!STAGES[idx].isPreventionMode) {
      SoundFX.siren();
      SoundFX.speak(`${STAGES[idx].name} 대피 훈련을 시작합니다. 낮은 자세로 안전하게 탈출하세요.`);
    }
    showToast(`🚩 ${STAGES[idx].name} 시작! ${STAGES[idx].mission}`);
  }

  btnStage1.addEventListener('click', () => selectStageManual(0));
  btnStage2.addEventListener('click', () => selectStageManual(1));
  btnStage3.addEventListener('click', () => selectStageManual(2));
  btnStage4.addEventListener('click', () => selectStageManual(3));
  btnStage5.addEventListener('click', () => selectStageManual(4));
  btnStage0.addEventListener('click', () => selectStageManual(5));
  if (btnStage6) {
    btnStage6.addEventListener('click', () => selectStageManual(6));
  }

  // --- Feature 5: Daily Challenge Stage Button ---
  if (btnDailyStage && typeof generateDailyChallengeStage === 'function') {
    btnDailyStage.addEventListener('click', () => {
      SoundFX.init();
      const dailyStage = generateDailyChallengeStage();
      loadStage(0, true, dailyStage);
      hideAllModalsAndResume();
      SoundFX.siren();
      SoundFX.speak('오늘의 일일구 돌발 재난 챌린지를 시작합니다. 침착하게 탈출하세요!');
      showToast(`🎲 ${dailyStage.name} 시작! 매일 자정 새로운 구조로 바뀝니다!`, 'border-amber-400');
    });
  }

  // --- Feature 2: 2-Player Co-op Mode Toggle ---
  if (btnCoopToggle) {
    btnCoopToggle.addEventListener('click', () => {
      SoundFX.init();
      isCoopMode = !isCoopMode;
      if (coopToggleText) {
        coopToggleText.textContent = isCoopMode ? '2인협동:켜짐' : '2인협동:꺼짐';
      }
      btnCoopToggle.className = isCoopMode
        ? 'px-2 py-1 text-[11px] sm:text-xs font-extrabold rounded-lg bg-pink-600 text-white border border-pink-300 transition flex items-center gap-1 shadow'
        : 'px-2 py-1 text-[11px] sm:text-xs font-semibold rounded-lg bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 transition flex items-center gap-1';
      if (isCoopMode) {
        player2.x = canMoveTo(player.x + 0.8, player.y, player2.radius) ? player.x + 0.8 : player.x;
        player2.y = player.y;
        SoundFX.pickup();
        showToast('👥 [2인 협동 대피 모드 ON!] 1P는 [WASD + Space], 2P는 [방향키 + Enter]로 함께 탈출하세요! (+300점 협동 보너스)', 'border-pink-400');
      } else {
        showToast('👤 1인 단독 대피 모드로 전환되었습니다.');
      }
      updateHUD();
      renderCanvas();
    });
  }

  // --- Map Editor Integration ---
  function closeMapEditorModal() {
    clearAllInputStates();
    if (mapEditorInstance) mapEditorInstance.close();
    if (
      gameState === 'PAUSED' &&
      gameOverlay.classList.contains('hidden') &&
      eduModal.classList.contains('hidden') &&
      guideModal.classList.contains('hidden') &&
      certModal.classList.contains('hidden') &&
      (!classModal || classModal.classList.contains('hidden')) &&
      (!teacherModal || teacherModal.classList.contains('hidden'))
    ) {
      gameState = 'PLAYING';
      pauseIcon.textContent = '⏸️';
      pauseText.textContent = '일시정지';
    }
  }

  mapEditorInstance = initMapEditor({
    showToast,
    onCloseEditor: closeMapEditorModal,
    onPlayCustomStage: (customStage, hadExitOriginally) => {
      SoundFX.init();
      unlockBadge('map_creator');
      mapEditorInstance.close();
      gameOverlay.classList.add('hidden');
      loadStage(0, false, customStage);
      gameState = 'PLAYING';
      pauseIcon.textContent = '⏸️';
      pauseText.textContent = '일시정지';
      showToast(
        hadExitOriginally
          ? '🛠️ 나만의 커스텀 대피도 플레이를 시작합니다! (+대피도 설계사 배지 해금!)'
          : '🛠️ 비상구(EXIT)가 없어 우측 하단에 자동 배치 후 플레이를 시작합니다!',
        'border-indigo-400'
      );
    }
  });

  btnMapEditor.addEventListener('click', () => {
    clearAllInputStates();
    [certModal, guideModal, classModal, teacherModal].forEach((m) => {
      if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
    });
    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
      pauseIcon.textContent = '▶️';
      pauseText.textContent = '계속하기';
    }
    mapEditorInstance.open();
  });

  // --- Feature 1 & 6: Certificate PNG Download, Skin Selector & Badge Encyclopedia ---
  function renderCertificateModal() {
    const best = Math.max(score, getSavedBestScore());
    certTotalScore.textContent = `최고 점수: ${best.toLocaleString()}점`;
    const unlockedCount = getUnlockedBadgeCount();
    certBadgeCount.textContent = `획득 배지: ${unlockedCount} / ${BADGE_DEFS.length}개`;

    const currentSkin = getSelectedSkin();
    if (activeSkinBadge && currentSkin) {
      activeSkinBadge.textContent = `장착중: ${currentSkin.icon} ${currentSkin.name}`;
    }

    if (skinSelectionGrid && Array.isArray(CHARACTER_SKINS)) {
      skinSelectionGrid.innerHTML = CHARACTER_SKINS.map((sk) => {
        const isUnlocked = unlockedCount >= sk.minBadges;
        const isEquipped = currentSkin && currentSkin.id === sk.id;
        return `<button type="button" data-skin-id="${sk.id}" class="skin-select-btn p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
          isEquipped
            ? 'bg-emerald-950/80 border-emerald-400 text-white shadow-md'
            : (isUnlocked ? 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-950/40 border-slate-800/80 text-slate-500 opacity-60')
        }">
          <span class="text-2xl shrink-0">${isUnlocked ? sk.icon : '🔒'}</span>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-extrabold flex items-center justify-between gap-1">
              <span class="${isEquipped ? 'text-emerald-300' : (isUnlocked ? 'text-amber-300' : 'text-slate-400')}">${sk.name}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded ${isEquipped ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'}">${
                isEquipped ? '장착중' : (isUnlocked ? '선택가능' : `배지 ${sk.minBadges}개 필요`)
              }</span>
            </div>
            <div class="text-[10px] text-slate-400 leading-tight mt-0.5">${sk.perkDesc}</div>
          </div>
        </button>`;
      }).join('');

      skinSelectionGrid.querySelectorAll('.skin-select-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const skId = btn.getAttribute('data-skin-id');
          const targetSkin = (CHARACTER_SKINS || []).find(s => s.id === skId);
          if (!targetSkin) return;
          if (getUnlockedBadgeCount() < targetSkin.minBadges) {
            SoundFX.warning();
            showToast(`🔒 [${targetSkin.name}] 스킨은 안전 배지 ${targetSkin.minBadges}개 이상 획득 시 해금됩니다!`, 'border-amber-500');
            return;
          }
          selectedSkinId = targetSkin.id;
          try {
            localStorage.setItem('fire_escape_skin', selectedSkinId);
          } catch (e) {}
          if (targetSkin.defaultFlashlight) player.hasFlashlight = true;
          SoundFX.pickup();
          renderCertificateModal();
          updateHUD();
          renderCanvas();
          showToast(`🦸 [${targetSkin.icon} ${targetSkin.name}] 스킨이 장착되었습니다! (${targetSkin.perkDesc})`, 'border-emerald-400');
        });
      });
    }

    badgeCollectionGrid.innerHTML = BADGE_DEFS.map((b) => {
      const has = !!unlockedBadges[b.id];
      return `<div class="p-2 rounded-xl border ${has ? 'bg-slate-950 border-amber-500/50 text-white' : 'bg-slate-950/40 border-slate-800 text-slate-600'} flex flex-col items-center gap-1">
        <span class="text-xl ${has ? '' : 'grayscale opacity-40'}">${b.icon}</span>
        <span class="text-[10px] font-extrabold ${has ? 'text-amber-300' : 'text-slate-500'}">${b.name}</span>
        <span class="text-[9px] leading-tight text-slate-400">${b.desc}</span>
      </div>`;
    }).join('');
  }

  function downloadCertificatePng() {
    SoundFX.init();
    const cleanName = (studentNameInput.value || '').trim() || '용감한 어린이';
    const best = Math.max(score, getSavedBestScore());
    const unlockedCount = getUnlockedBadgeCount();
    const activeSkin = getSelectedSkin();
    const clsText = currentClassCode.trim() || '자유 참가 대원';

    const offCanvas = document.createElement('canvas');
    offCanvas.width = 900;
    offCanvas.height = 620;
    const cctx = offCanvas.getContext('2d');

    // Background & Gold Border
    const bgGrad = cctx.createLinearGradient(0, 0, 900, 620);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.5, '#1e293b');
    bgGrad.addColorStop(1, '#1e1b4b');
    cctx.fillStyle = bgGrad;
    cctx.fillRect(0, 0, 900, 620);

    cctx.strokeStyle = '#f59e0b';
    cctx.lineWidth = 6;
    cctx.strokeRect(20, 20, 860, 580);
    cctx.strokeStyle = '#fde047';
    cctx.lineWidth = 2;
    cctx.strokeRect(30, 30, 840, 560);

    // Header
    cctx.fillStyle = '#fbbf24';
    cctx.font = 'bold 18px "Noto Sans KR", sans-serif';
    cctx.textAlign = 'center';
    cctx.fillText('제 2026-119 호 · 2022 개정 초등 교육과정 연계 안전 인증', 450, 78);

    cctx.fillStyle = '#ffffff';
    cctx.font = '900 38px "Noto Sans KR", sans-serif';
    cctx.fillText('🏅 명예 어린이 소방안전 대원 임명장', 450, 132);

    // Student Name & Class Box
    cctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    cctx.fillRect(140, 158, 620, 86);
    cctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    cctx.strokeRect(140, 158, 620, 86);

    cctx.fillStyle = '#fde047';
    cctx.font = 'bold 28px "Noto Sans KR", sans-serif';
    cctx.fillText(`${activeSkin.icon} 대원 성명 : ${cleanName}`, 450, 198);

    cctx.fillStyle = '#93c5fd';
    cctx.font = 'bold 17px "Noto Sans KR", sans-serif';
    cctx.fillText(`소속 학급: ${clsText}   |   최고 점수: ${best.toLocaleString()}점   |   안전 배지: ${unlockedCount}/${BADGE_DEFS.length}개`, 450, 229);

    // Citation Text
    cctx.fillStyle = '#e2e8f0';
    cctx.font = '18px "Noto Sans KR", sans-serif';
    cctx.fillText('위 어린이는 화재 탈출 넘버원 시뮬레이션을 통해 연소와 소화 원리, 대류 현상 대응,', 450, 286);
    cctx.fillText('완강기·경량칸막이·방화문 닫기 등 실전 화재 대피 요령을 모범적으로 이수하였기에', 450, 316);
    cctx.fillText('명예 어린이 소방안전 대원으로 자랑스럽게 임명합니다.', 450, 346);

    // Unlocked Badges Row
    cctx.fillStyle = '#fbbf24';
    cctx.font = 'bold 15px "Noto Sans KR", sans-serif';
    cctx.fillText('🎖️ 달성한 안전 마스터 배지 컬렉션', 450, 390);

    const startX = 95;
    const gapX = 78;
    BADGE_DEFS.forEach((b, idx) => {
      const bx = startX + idx * gapX;
      const by = 435;
      const has = !!unlockedBadges[b.id];
      cctx.fillStyle = has ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.6)';
      cctx.beginPath();
      cctx.arc(bx, by, 26, 0, Math.PI * 2);
      cctx.fill();
      cctx.strokeStyle = has ? '#fbbf24' : '#475569';
      cctx.lineWidth = 2;
      cctx.stroke();

      cctx.font = '24px sans-serif';
      cctx.fillStyle = has ? '#ffffff' : 'rgba(148, 163, 184, 0.35)';
      cctx.fillText(b.icon, bx, by + 2);

      cctx.font = 'bold 10px "Noto Sans KR", sans-serif';
      cctx.fillStyle = has ? '#fde68a' : '#64748b';
      cctx.fillText(b.name.slice(0, 6), bx, by + 42);
    });

    // Footer Date & Official Stamp
    const now = new Date();
    const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
    cctx.fillStyle = '#cbd5e1';
    cctx.font = 'bold 17px "Noto Sans KR", sans-serif';
    cctx.fillText(dateStr, 450, 522);

    cctx.fillStyle = '#ffffff';
    cctx.font = '900 22px "Noto Sans KR", sans-serif';
    cctx.fillText('화재 탈출 넘버원 어린이 소방안전 교육본부', 450, 558);

    // Red Official Seal
    cctx.save();
    cctx.translate(715, 535);
    cctx.rotate(-0.12);
    cctx.strokeStyle = 'rgba(239, 68, 68, 0.88)';
    cctx.lineWidth = 3.5;
    cctx.strokeRect(-36, -36, 72, 72);
    cctx.fillStyle = 'rgba(239, 68, 68, 0.88)';
    cctx.font = '900 15px "Noto Sans KR", sans-serif';
    cctx.fillText('명예소방', 0, -8);
    cctx.fillText('인증직인', 0, 14);
    cctx.restore();

    try {
      const dataUrl = offCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `명예소방관_수료증_${cleanName}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      SoundFX.win();
      showToast(`🖼️ [${cleanName}] 대원의 고화질 명예 소방관 수료증(PNG)이 저장되었습니다!`, 'border-amber-400');
    } catch (e) {
      showToast('⚠️ 이미지 저장 중 오류가 발생했습니다.', 'border-red-500');
    }
  }

  if (btnDownloadCertPng) {
    btnDownloadCertPng.addEventListener('click', downloadCertificatePng);
  }

  function openCertModalFn() {
    clearAllInputStates();
    if (mapEditorInstance) mapEditorInstance.close();
    [guideModal, classModal, teacherModal].forEach((m) => {
      if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
    });
    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
      pauseIcon.textContent = '▶️';
      pauseText.textContent = '계속하기';
    }
    renderCertificateModal();
    certModal.classList.remove('hidden');
    certModal.classList.add('flex');
  }

  function closeCertModalFn() {
    clearAllInputStates();
    certModal.classList.add('hidden');
    certModal.classList.remove('flex');
    if (
      gameState === 'PAUSED' &&
      gameOverlay.classList.contains('hidden') &&
      eduModal.classList.contains('hidden') &&
      guideModal.classList.contains('hidden') &&
      mapEditorModal.classList.contains('hidden') &&
      (!classModal || classModal.classList.contains('hidden')) &&
      (!teacherModal || teacherModal.classList.contains('hidden'))
    ) {
      gameState = 'PLAYING';
      pauseIcon.textContent = '⏸️';
      pauseText.textContent = '일시정지';
    }
  }

  btnCertModal.addEventListener('click', openCertModalFn);
  btnOpenCertFromOverlay.addEventListener('click', openCertModalFn);
  btnCloseCertModal.addEventListener('click', closeCertModalFn);
  btnConfirmCertModal.addEventListener('click', () => {
    const cleanName = (studentNameInput.value || '').trim() || '용감한 어린이';
    studentNameInput.value = cleanName;
    try {
      localStorage.setItem('fire_escape_student_name', cleanName);
    } catch (e) {}
    closeCertModalFn();
    showToast(`🏅 [${cleanName}] 명예 소방안전 대원 정보가 브라우저에 저장되었습니다!`, 'border-emerald-400');
  });

  // --- Feature 4: Class Safety Ranking & Code Modal Logic ---
  function updateClassBanner() {
    if (!classBanner) return;
    const clean = (currentClassCode || '').trim();
    if (clean) {
      classBanner.textContent = `🏫 ${clean}`;
      classBanner.classList.remove('hidden');
    } else {
      classBanner.classList.add('hidden');
    }
  }

  function renderClassModal() {
    if (!classLeaderboardList) return;
    if (classCodeInput) classCodeInput.value = currentClassCode;
    const filterCode = (currentClassCode || '').trim();
    if (classBoardTitle) {
      classBoardTitle.textContent = filterCode
        ? `🏆 [${filterCode}] 안전 대피 명예의 전당`
        : '🏆 전체 학급 안전 대피 명예의 전당';
    }
    const allRecords = getClassLeaderboard();
    const filtered = filterCode
      ? allRecords.filter(r => r.classCode === filterCode)
      : allRecords;

    if (filtered.length === 0) {
      classLeaderboardList.innerHTML = `<div class="text-slate-500 text-center py-4">아직 등록된 대피 완료 기록이 없습니다. 스테이지를 클리어하면 자동 등재됩니다!</div>`;
    } else {
      classLeaderboardList.innerHTML = filtered.slice(0, 12).map((rec, i) => {
        const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : `${i + 1}위`));
        return `<div class="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <div class="flex items-center gap-2 truncate">
            <span class="font-extrabold text-amber-300 w-7 shrink-0">${medal}</span>
            <span class="font-bold text-white">${rec.studentName}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">${rec.classCode}</span>
            <span class="text-[10px] text-slate-400 truncate">${rec.stageName}</span>
          </div>
          <div class="text-right shrink-0 ml-2">
            <span class="font-mono font-extrabold text-emerald-400">${Number(rec.score || 0).toLocaleString()}점</span>
          </div>
        </div>`;
      }).join('');
    }
  }

  function openClassModalFn() {
    clearAllInputStates();
    if (mapEditorInstance) mapEditorInstance.close();
    [certModal, guideModal, teacherModal].forEach((m) => {
      if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
    });
    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
      pauseIcon.textContent = '▶️';
      pauseText.textContent = '계속하기';
    }
    renderClassModal();
    classModal.classList.remove('hidden');
    classModal.classList.add('flex');
  }

  function closeClassModalFn() {
    if (!classModal) return;
    clearAllInputStates();
    classModal.classList.add('hidden');
    classModal.classList.remove('flex');
    if (
      gameState === 'PAUSED' &&
      gameOverlay.classList.contains('hidden') &&
      eduModal.classList.contains('hidden') &&
      guideModal.classList.contains('hidden') &&
      mapEditorModal.classList.contains('hidden') &&
      certModal.classList.contains('hidden') &&
      (!teacherModal || teacherModal.classList.contains('hidden'))
    ) {
      gameState = 'PLAYING';
      pauseIcon.textContent = '⏸️';
      pauseText.textContent = '일시정지';
    }
  }

  if (btnClassMode) btnClassMode.addEventListener('click', openClassModalFn);
  if (btnCloseClassModal) btnCloseClassModal.addEventListener('click', closeClassModalFn);
  if (btnConfirmClassModal) btnConfirmClassModal.addEventListener('click', closeClassModalFn);

  if (btnApplyClassCode) {
    btnApplyClassCode.addEventListener('click', () => {
      currentClassCode = (classCodeInput.value || '').trim();
      try {
        localStorage.setItem('fire_escape_class_code', currentClassCode);
      } catch (e) {}
      updateClassBanner();
      renderClassModal();
      SoundFX.pickup();
      showToast(
        currentClassCode
          ? `🏫 소속 학급이 [${currentClassCode}](으)로 설정되었습니다!`
          : '🏫 학급 필터가 해제되어 전체 랭킹을 표시합니다.',
        'border-sky-400'
      );
    });
  }

  if (btnCopyClassUrl) {
    btnCopyClassUrl.addEventListener('click', () => {
      const code = (classCodeInput.value || currentClassCode || '서울초 5학년 2반').trim();
      currentClassCode = code;
      if (classCodeInput) classCodeInput.value = code;
      try {
        localStorage.setItem('fire_escape_class_code', currentClassCode);
      } catch (e) {}
      updateClassBanner();
      renderClassModal();
      const baseUrl = window.location.origin && window.location.origin !== 'null'
        ? `${window.location.origin}${window.location.pathname}`
        : window.location.href.split('?')[0];
      const shareUrl = `${baseUrl}?class=${encodeURIComponent(code)}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).catch(() => {});
      }
      showToast(`🔗 [${code}] 우리 반 전용 접속 링크(?class=...)가 복사되었습니다!`, 'border-sky-400');
    });
  }

  if (btnClearClassBoard) {
    btnClearClassBoard.addEventListener('click', () => {
      try {
        localStorage.removeItem('fire_escape_class_board');
      } catch (e) {}
      renderClassModal();
      showToast('🗑️ 학급 명예의 전당 기록이 초기화되었습니다.');
    });
  }

  // --- Feature 10: Teacher Smartboard Mode & Printable Worksheet Modal ---
  function openTeacherModalFn() {
    clearAllInputStates();
    if (mapEditorInstance) mapEditorInstance.close();
    [certModal, guideModal, classModal].forEach((m) => {
      if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
    });
    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
      pauseIcon.textContent = '▶️';
      pauseText.textContent = '계속하기';
    }
    teacherModal.classList.remove('hidden');
    teacherModal.classList.add('flex');
  }

  function closeTeacherModalFn() {
    if (!teacherModal) return;
    clearAllInputStates();
    teacherModal.classList.add('hidden');
    teacherModal.classList.remove('flex');
    if (
      gameState === 'PAUSED' &&
      gameOverlay.classList.contains('hidden') &&
      eduModal.classList.contains('hidden') &&
      guideModal.classList.contains('hidden') &&
      mapEditorModal.classList.contains('hidden') &&
      certModal.classList.contains('hidden') &&
      (!classModal || classModal.classList.contains('hidden'))
    ) {
      gameState = 'PLAYING';
      pauseIcon.textContent = '⏸️';
      pauseText.textContent = '일시정지';
    }
  }

  if (btnTeacherMode) btnTeacherMode.addEventListener('click', openTeacherModalFn);
  if (btnCloseTeacherModal) btnCloseTeacherModal.addEventListener('click', closeTeacherModalFn);
  if (btnConfirmTeacherModal) btnConfirmTeacherModal.addEventListener('click', closeTeacherModalFn);

  if (btnToggleBoardZoom) {
    btnToggleBoardZoom.addEventListener('click', () => {
      const enabled = document.body.classList.toggle('smartboard-zoom');
      btnToggleBoardZoom.textContent = enabled ? '켜짐 (해제)' : '켜기';
      btnToggleBoardZoom.className = enabled
        ? 'px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-extrabold text-white shrink-0'
        : 'px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-extrabold text-white shrink-0';
      resizeCanvas();
      showToast(
        enabled
          ? '🖥️ [전자칠판 대형 화면 모드 ON] 교실 TV/칠판 시연에 맞춰 화면과 자막이 확대되었습니다!'
          : '🖥️ 전자칠판 대형 화면 모드가 해제되었습니다.',
        'border-purple-400'
      );
    });
  }

  if (btnTeacherUnlockAll) {
    btnTeacherUnlockAll.addEventListener('click', () => {
      BADGE_DEFS.forEach((b) => {
        unlockedBadges[b.id] = true;
      });
      try {
        localStorage.setItem('fire_escape_badges', JSON.stringify(unlockedBadges));
      } catch (e) {}
      SoundFX.win();
      updateHUD();
      showToast('🔓 [교사 시연 모드] 안전 배지 10종과 직업 스킨 4종이 모두 해금되었습니다! [수료증·스킨]에서 확인하세요.', 'border-amber-400');
    });
  }

  if (btnPrintWorksheet) {
    btnPrintWorksheet.addEventListener('click', () => {
      const activeSt = activeCustomStage || STAGES[currentStageIdx] || STAGES[0];
      if (printWorksheetClass) printWorksheetClass.textContent = currentClassCode.trim() || '________초등학교 ___학년 ___반';
      if (printWorksheetName) printWorksheetName.textContent = (studentNameInput && studentNameInput.value.trim()) || '______________';
      if (printWorksheetStage) printWorksheetStage.textContent = `${activeSt.name} (${activeSt.curriculumFocus || '안전 대피 실습'})`;
      showToast('🖨️ A4 화재안전 수업 활동지 인쇄 창을 호출합니다!');
      setTimeout(() => {
        try { window.print(); } catch (e) {}
      }, 150);
    });
  }

  // Pause Button
  btnPause.addEventListener('click', () => {
    SoundFX.init();
    clearAllInputStates();
    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
      pauseIcon.textContent = '▶️';
      pauseText.textContent = '계속하기';
      showToast('⏸️ 게임이 일시정지되었습니다.');
    } else if (gameState === 'PAUSED') {
      gameState = 'PLAYING';
      pauseIcon.textContent = '⏸️';
      pauseText.textContent = '일시정지';
      showToast('▶️ 대피를 계속합니다!');
    }
  });

  // Restart Button
  btnRestartTop.addEventListener('click', () => {
    SoundFX.init();
    score = stageStartScore;
    loadStage(currentStageIdx, false, activeCustomStage);
    hideAllModalsAndResume();
    showToast('🔄 현재 단계를 다시 시작합니다!');
  });

  // Sound Mute Toggle
  btnSound.addEventListener('click', () => {
    SoundFX.init();
    SoundFX.muted = !SoundFX.muted;
    btnSound.textContent = SoundFX.muted ? '🔇' : '🔊';
    if (SoundFX.muted && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    showToast(SoundFX.muted ? '🔇 효과음 및 음성 안내가 꺼졌습니다.' : '🔊 효과음 및 음성 안내가 켜졌습니다.');
  });

  // Safety Guide Modal
  btnGuide.addEventListener('click', () => {
    clearAllInputStates();
    if (mapEditorInstance) mapEditorInstance.close();
    [certModal, classModal, teacherModal].forEach((m) => {
      if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
    });
    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
      pauseIcon.textContent = '▶️';
      pauseText.textContent = '계속하기';
    }
    guideModal.classList.remove('hidden');
    guideModal.classList.add('flex');
  });

  function closeGuideModal() {
    clearAllInputStates();
    guideModal.classList.add('hidden');
    guideModal.classList.remove('flex');
    if (
      gameState === 'PAUSED' &&
      gameOverlay.classList.contains('hidden') &&
      eduModal.classList.contains('hidden') &&
      mapEditorModal.classList.contains('hidden') &&
      certModal.classList.contains('hidden') &&
      (!classModal || classModal.classList.contains('hidden')) &&
      (!teacherModal || teacherModal.classList.contains('hidden'))
    ) {
      gameState = 'PLAYING';
      pauseIcon.textContent = '⏸️';
      pauseText.textContent = '일시정지';
    }
  }

  btnCloseGuide.addEventListener('click', closeGuideModal);
  btnConfirmGuide.addEventListener('click', closeGuideModal);

  btnPrimaryAction.addEventListener('click', () => {
    SoundFX.init();
    if (gameState === 'START') {
      loadStage(currentStageIdx, true, activeCustomStage);
      gameOverlay.classList.add('hidden');
      gameState = 'PLAYING';
      SoundFX.siren();
      SoundFX.speak('화재 경보 발생! 젖은 수건으로 코와 입을 막고 낮은 자세로 비상구까지 대피하세요.');
      showToast(
        activeCustomStage
          ? '🛠️ 공유된 커스텀 대피도 플레이를 시작합니다! 안전하게 비상구로 탈출하세요!'
          : '🚨 화재 경보 발생! 수건을 적시고 비상벨(🔔)을 울려 유도등(🟩→)을 따라 대피하세요!'
      );
    } else if (gameState === 'STAGE_CLEAR') {
      let nextIdx = 0;
      if (activeCustomStage || currentStageIdx === 5) {
        nextIdx = 0;
      } else if (currentStageIdx === 4) {
        nextIdx = 6; // Advance from Stage 5 (idx 4) to Stage 6 (idx 6, Camping & Battery Fire)
      } else {
        nextIdx = currentStageIdx + 1;
      }
      loadStage(nextIdx, false, null);
      gameOverlay.classList.add('hidden');
      gameState = 'PLAYING';
      SoundFX.siren();
      SoundFX.speak(`${STAGES[currentStageIdx].name} 대피를 시작합니다.`);
      showToast(`🚩 ${STAGES[currentStageIdx].name}! ${STAGES[currentStageIdx].mission}`);
    } else if (gameState === 'GAME_OVER') {
      score = stageStartScore;
      loadStage(currentStageIdx, false, activeCustomStage);
      gameOverlay.classList.add('hidden');
      gameState = 'PLAYING';
      showToast('🔄 동선 리플레이를 바탕으로 다시 안전하게 탈출해 보세요!');
    } else if (gameState === 'ALL_CLEAR') {
      loadStage(0, true, null);
      gameOverlay.classList.add('hidden');
      gameState = 'PLAYING';
      showToast('🚩 1단계부터 다시 도전합니다!');
    }
  });

  btnSecondaryAction.addEventListener('click', () => {
    SoundFX.init();
    if (gameState === 'STAGE_CLEAR') {
      score = stageStartScore;
      loadStage(currentStageIdx, false, activeCustomStage);
      gameOverlay.classList.add('hidden');
      gameState = 'PLAYING';
    } else if (gameState === 'GAME_OVER') {
      loadStage(0, true, null);
      gameOverlay.classList.add('hidden');
      gameState = 'PLAYING';
    }
  });

  // --- Bug #3 Fix & Feature 4: Automatically Load ?map= and ?class= URL Parameters ---
  let appInitialized = false;
  function initApp() {
    if (appInitialized) return;
    appInitialized = true;

    bestScoreDisplay.textContent = getSavedBestScore().toLocaleString();
    try {
      const savedName = localStorage.getItem('fire_escape_student_name');
      if (savedName && studentNameInput) studentNameInput.value = savedName;
    } catch (e) {}

    let sharedCustomStage = null;
    try {
      const params = new URLSearchParams(window.location.search);
      const sharedClass = params.get('class');
      if (sharedClass && sharedClass.trim()) {
        currentClassCode = sharedClass.trim();
        try {
          localStorage.setItem('fire_escape_class_code', currentClassCode);
        } catch (e) {}
      }
      const sharedMap = params.get('map');
      if (sharedMap && mapEditorInstance) {
        sharedCustomStage = mapEditorInstance.loadFromRawCode(sharedMap, true);
      }
    } catch (e) {}

    updateClassBanner();

    if (sharedCustomStage) {
      loadStage(0, true, sharedCustomStage);
      overlayIcon.textContent = '🛠️';
      overlaySubtitle.textContent = '공유받은 커스텀 대피도 맵';
      overlayTitle.textContent = '나만의 우리 집·교실 대피도 도전!';
      overlayDesc.textContent = '링크로 공유받은 커스텀 대피도 스테이지가 로드되었습니다! [게임 시작하기]를 눌러 탈출에 도전해 보세요.';
      btnPrimaryAction.textContent = '공유받은 커스텀 맵 시작하기 ▶';
    } else {
      loadStage(0, true, null);
    }

    resizeCanvas();
    updateOverlaySelectionUI();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(gameLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
  window.addEventListener('load', resizeCanvas);
})();
