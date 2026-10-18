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

  let cachedSelectedSkin = null;

  function unlockBadge(badgeId) {
    if (!unlockedBadges[badgeId]) {
      unlockedBadges[badgeId] = true;
      cachedSelectedSkin = null;
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
    if (cachedSelectedSkin && cachedSelectedSkin.id === selectedSkinId) {
      return cachedSelectedSkin;
    }
    const unlockedCount = getUnlockedBadgeCount();
    const list = CHARACTER_SKINS || [];
    const found = list.find(s => s.id === selectedSkinId && unlockedCount >= s.minBadges);
    cachedSelectedSkin = found || list[0] || {
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
    return cachedSelectedSkin;
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

  let cachedBestScore = 0;
  try {
    cachedBestScore = parseInt(localStorage.getItem('fire_escape_best_score') || '0', 10) || 0;
  } catch (e) {
    cachedBestScore = 0;
  }

  function getSavedBestScore() {
    return cachedBestScore;
  }

  function saveBestScore(val) {
    if (val > cachedBestScore) {
      cachedBestScore = val;
      try {
        localStorage.setItem('fire_escape_best_score', String(val));
      } catch (e) {}
    }
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
    radius: 0.20,
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
    radius: 0.20,
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
  let hazardExposure = 0;
  let fireSpreadTimer = 0;
  let autoSaveTimer = 0;
  let lastFrameTime = 0;
  let animFrameId = null;
  let toastTimeout = null;
  let mapEditorInstance = null;

  // --- PRD v1.0 Escape-Room State (Hints, Safe/Wire Puzzles, Time/Tension Policy, Settings & Campaign Save) ---
  const SESSION_ID = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  let campaignSaveSeq = 0;
  let selectedWorldId = 'fire';
  let hintLog = []; // Unique opened hint IDs (idempotent: re-opening never increments count)
  let safeInputBuffer = '';
  let safeWrongCount = 0;
  let safeLockUntil = 0; // Active elapsedSeconds timestamp until which safe keypad is locked (30s after 3rd wrong attempt)
  let safeSolved = false;
  let wireSolved = false;
  let dirLockSolved = false;
  let dirLockBuffer = [];
  let bookSortSolved = false;
  let bookSortOrder = ['430', '425.2', '480', '425.12', '450', '440'];
  let runOptions = {
    mode: 'standard', // 'standard' | 'relaxed' | 'practice'
    hazardLimitSeconds: 300
  };
  let nextRunOptions = {
    mode: 'standard',
    hazardLimitSeconds: 300
  };
  let appSettings = {
    graphicsQuality: 'auto',
    brightness: 100,
    sensitivity: 100,
    reduceMotion: false,
    gradePreset: 'standard', // 'low' | 'standard' | 'advanced'
    voiceTts: false
  };
  try {
    const savedSettings = JSON.parse(localStorage.getItem('fire-safety:settings:v1') || 'null');
    if (savedSettings && typeof savedSettings === 'object') {
      if (['auto', 'high', 'normal', 'low'].includes(savedSettings.graphicsQuality)) appSettings.graphicsQuality = savedSettings.graphicsQuality;
      if (typeof savedSettings.brightness === 'number') appSettings.brightness = Math.max(80, Math.min(180, savedSettings.brightness));
      if (typeof savedSettings.sensitivity === 'number') appSettings.sensitivity = Math.max(50, Math.min(200, savedSettings.sensitivity));
      if (typeof savedSettings.reduceMotion === 'boolean') appSettings.reduceMotion = savedSettings.reduceMotion;
      if (['low', 'standard', 'advanced'].includes(savedSettings.gradePreset)) appSettings.gradePreset = savedSettings.gradePreset;
      if (typeof savedSettings.voiceTts === 'boolean') appSettings.voiceTts = savedSettings.voiceTts;
      if (['standard', 'relaxed', 'practice'].includes(savedSettings.defaultMode)) {
        nextRunOptions.mode = savedSettings.defaultMode;
        nextRunOptions.hazardLimitSeconds = savedSettings.defaultMode === 'relaxed' ? 480 : (savedSettings.defaultMode === 'practice' ? null : 300);
        runOptions = { ...nextRunOptions };
      }
    }
  } catch (e) {}

  // Feature 7: 8-Stage Completion Stamp Passport Storage
  let clearedStages = {};
  try {
    clearedStages = JSON.parse(localStorage.getItem('fire_escape_cleared_stages') || '{}') || {};
  } catch (e) {
    clearedStages = {};
  }
  function markCurrentStageCleared() {
    const key = activeCustomStage
      ? (activeCustomStage.isDailyChallenge ? 'daily' : 'custom')
      : String(currentStageIdx);
    if (key !== 'custom') {
      clearedStages[key] = true;
      try {
        localStorage.setItem('fire_escape_cleared_stages', JSON.stringify(clearedStages));
      } catch (e) {}
    }
  }

  // Feature 4: Teacher Custom Safe Passcode & Quiz Config (?customQuiz=...)
  let customQuizConfig = null;

  // Feature 2: Grade-Level Difficulty Multipliers
  function getGradeDifficultyMultipliers() {
    if (appSettings.gradePreset === 'low') {
      return { spreadMult: 1.55, damageMult: 0.60, o2Mult: 0.58 };
    }
    if (appSettings.gradePreset === 'advanced') {
      return { spreadMult: 0.78, damageMult: 1.20, o2Mult: 1.20 };
    }
    return { spreadMult: 1.0, damageMult: 1.0, o2Mult: 1.0 };
  }

  // Feature 6: Korean TTS Helper for Low-Grade / Multicultural Students
  function speakGuideIfEnabled(rawText) {
    if (!appSettings.voiceTts || SoundFX.muted) return;
    const clean = String(rawText || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/[^\w\s가-힣0-9.,!?()·~-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (clean) {
      SoundFX.speak(clean, 1.06, 1.0);
    }
  }

  let isPerfDiagEnabled = false;
  try {
    isPerfDiagEnabled = new URLSearchParams(window.location.search).get('perf') === '1';
  } catch (e) {}
  let perfFrameTimes = [];
  let perfLongFrames = 0;
  let perfUiTimer = 0;

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
  function showToast(msg, borderClass = 'border-amber-500/60') {
    toastBanner.textContent = msg;
    toastBanner.className = `pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 z-20 px-3 py-0.5 rounded-full bg-slate-950/90 border ${borderClass} text-amber-200 text-[10.5px] sm:text-xs font-bold shadow-md transition-all duration-300 opacity-100 translate-y-0 max-w-[94%] truncate text-center`;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastBanner.classList.remove('opacity-100', 'translate-y-0');
      toastBanner.classList.add('opacity-0', '-translate-y-2');
    }, 2800);
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
    const continueBtn = document.getElementById('btnContinueSaved');
    return [continueBtn, btnPrimaryAction, btnOpenCertFromOverlay, btnSecondaryAction].filter(
      (b) => b && !b.classList.contains('hidden') && !b.disabled
    );
  }

  function updateOverlaySelectionUI() {
    const btns = getVisibleOverlayButtons();
    if (btns.length === 0) return;
    if (overlaySelectedIndex >= btns.length) overlaySelectedIndex = 0;
    if (overlaySelectedIndex < 0) overlaySelectedIndex = btns.length - 1;
    const continueBtn = document.getElementById('btnContinueSaved');
    [continueBtn, btnPrimaryAction, btnOpenCertFromOverlay, btnSecondaryAction].forEach((b) => {
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
    speakGuideIfEnabled(`${titleText}. ${String(descText || '').replace(/<[^>]*>/g, ' ')}`);
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
      hintLog = [];
      runOptions = { ...nextRunOptions };
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

    const p2Offsets = [
      { dx: 0.85, dy: 0 },
      { dx: -0.85, dy: 0 },
      { dx: 0, dy: 0.85 },
      { dx: 0, dy: -0.85 }
    ];
    const safeP2 = p2Offsets.find(off =>
      canMoveTo(st.playerStart.x + off.dx, st.playerStart.y + off.dy, player2.radius)
    );
    player2.x = safeP2 ? st.playerStart.x + safeP2.dx : st.playerStart.x;
    player2.y = safeP2 ? st.playerStart.y + safeP2.dy : st.playerStart.y;
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
    hazardExposure = 0;
    fireSpreadTimer = 0;
    autoSaveTimer = 0;
    safeInputBuffer = '';
    safeWrongCount = 0;
    safeLockUntil = 0;
    safeSolved = false;
    wireSolved = false;
    dirLockSolved = false;
    dirLockBuffer = [];
    bookSortSolved = false;
    bookSortOrder = ['430', '425.2', '480', '425.12', '450', '440'];

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
          : 'px-1 sm:px-2 py-0.5 sm:text-xs font-bold rounded-md text-slate-300 hover:text-white transition shrink-0';
      }
    });

    if (btnDailyStage) {
      btnDailyStage.className = (customStageObj && customStageObj.isDailyChallenge)
        ? 'px-1 sm:px-2 py-0.5 sm:py-1 text-[9.5px] sm:text-xs font-bold rounded-md bg-amber-600 text-white transition shrink-0'
        : 'px-1 sm:px-2 py-0.5 sm:py-1 text-[9.5px] sm:text-xs font-bold rounded-md text-amber-300 hover:text-white transition shrink-0';
    }

    orientCameraToOpenSpace();
    updateHUD();
    renderCanvas();
  }

  // --- Smart Next-Step Objective Helper (For At-a-Glance Guidance) ---
  function findNearestTileOfTypes(typeArray) {
    let best = null;
    let bestDist = Infinity;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r] && typeArray.includes(grid[r][c])) {
          const d = Math.hypot((c + 0.5) - player.x, (r + 0.5) - player.y);
          if (d < bestDist) {
            bestDist = d;
            best = { c, r, tile: grid[r][c], dist: d };
          }
        }
      }
    }
    return best;
  }

  function getIncompleteEscapeReason() {
    const st = activeCustomStage || STAGES[currentStageIdx] || STAGES[0];
    if (st.isPreventionMode && player.hazardsFixed < player.totalHazards) {
      return `🔍 아직 점검하지 않은 화재 위험요소(⚠️)가 ${player.totalHazards - player.hazardsFixed}곳 남아 있습니다!`;
    }
    if (st.requireWetTowelOrMask && !player.wetTowel && !player.hasMask) {
      return '🧣 호흡기 보호 필수! 수건을 세면대(🚰) 물에 적시거나 방연마스크(😷)를 먼저 착용해야 탈출할 수 있습니다!';
    }
    if (st.requireGasClosed && !player.gasClosed) {
      return '🔴 주방의 가스밸브(🔴)를 먼저 잠가야 폭발을 막고 탈출할 수 있습니다!';
    }
    if (st.requireRescueNpc) {
      const unrescuedNpc = items.find(it => it.type === 'npc');
      if (unrescuedNpc) {
        return `🧒 잠긴 방에 갇힌 [${unrescuedNpc.name}]을(를) 두고 탈출할 수 없습니다! 열쇠(🔑)로 방문을 열고 구출하세요!`;
      }
    }
    if (st.requireRescueDog) {
      const unrescuedDog = items.find(it => it.type === 'dog');
      if (unrescuedDog) {
        return `🐶 다용도실에 갇힌 반려견 [${unrescuedDog.name}]을(를) 먼저 구출해야 함께 탈출할 수 있습니다!`;
      }
    }
    return null;
  }

  function getNextStepObjective() {
    const st = activeCustomStage || STAGES[currentStageIdx] || STAGES[0];

    if (player.onFire) {
      return {
        c: Math.floor(player.x),
        r: Math.floor(player.y),
        label: '🔄 구르기 연타!',
        bannerText: `🚨 옷에 불이 붙었어요! 우측 [🔄 구르기] 버튼을 연타하세요! (${player.rollNeeded}회)`
      };
    }

    if (st.isPreventionMode) {
      const haz = findNearestTileOfTypes([TILE.HAZARD]);
      if (haz) {
        const rem = Math.max(1, player.totalHazards - player.hazardsFixed);
        return {
          c: haz.c,
          r: haz.r,
          label: '🎯 위험요소 점검',
          bannerText: `🎯 방탈출 미션: 노란 화살표의 ⚠️ 위험요소(${rem}곳 남음)로 가서 [✋ 점검하기]를 누르세요!`
        };
      }
      const ex = findNearestTileOfTypes([TILE.EXIT]);
      if (ex) {
        return {
          c: ex.c,
          r: ex.r,
          label: '🎯 점검 완료! EXIT',
          bannerText: '🎯 모든 점검 완료! 초록색 [EXIT 비상구]로 이동하세요!'
        };
      }
    }

    // Step 1: Respiratory protection (Mask or Wet Towel)
    if (!player.wetTowel && !player.hasMask) {
      if (player.hasTowel) {
        const sink = findNearestTileOfTypes([TILE.SINK]);
        if (sink) {
          return {
            c: sink.c,
            r: sink.r,
            label: '🎯 수건 적시기',
            bannerText: '🎯 방탈출 1단계: 🚰 세면대로 가서 [✋ 수건 적시기]를 누르세요!'
          };
        }
      } else {
        const maskOrTowel = items.find(it => it.type === 'mask' || it.type === 'towel');
        if (maskOrTowel) {
          return {
            c: maskOrTowel.c,
            r: maskOrTowel.r,
            label: `🎯 ${maskOrTowel.name} 줍기`,
            bannerText: `🎯 방탈출 1단계: 노란 화살표의 ${maskOrTowel.icon} ${maskOrTowel.name}을(를) 먼저 챙기세요!`
          };
        }
      }
    }

    // Step 2: Flashlight in dark stage
    if (st.isDarkStage && !player.hasFlashlight) {
      const fl = items.find(it => it.type === 'flashlight');
      if (fl) {
        return {
          c: fl.c,
          r: fl.r,
          label: '🎯 손전등 줍기',
          bannerText: '🎯 방탈출 미션: 어두운 시야를 밝히기 위해 🔦 손전등을 먼저 챙기세요!'
        };
      }
    }

    // Step 3: Nearby Extinguisher if player has 0 charges
    if (player.extinguisherCharges === 0) {
      const ext = items.find(it => it.type === 'extinguisher');
      if (ext) {
        return {
          c: ext.c,
          r: ext.r,
          label: '🎯 소화기 챙기기',
          bannerText: '🎯 방탈출 미션: 불길을 제압할 수 있도록 🧯 소화기를 챙기세요!'
        };
      }
    }

    // Step 4: Gas Valve (if required by stage)
    if (st.requireGasClosed && !player.gasClosed) {
      const gv = findNearestTileOfTypes([TILE.GAS_VALVE]);
      if (gv) {
        return {
          c: gv.c,
          r: gv.r,
          label: '🎯 가스밸브 잠그기',
          bannerText: '🎯 방탈출 미션: 주방의 🔴 가스밸브를 잠가 2차 폭발을 막으세요!'
        };
      }
    }

    // Step 5: Escape-Room Key & Locked Door & Debris Barricade Puzzle
    const lockedDoor = findNearestTileOfTypes([TILE.LOCKED_DOOR]);
    const debrisTile = findNearestTileOfTypes([TILE.DEBRIS]);

    // In Stage 3, the debris blocks the corridor to the veranda key, so check Axe -> Debris before Key if key is behind debris
    if (currentStageIdx === 2 && !activeCustomStage && debrisTile) {
      if (!player.hasAxe) {
        const axeItem = items.find(it => it.type === 'axe');
        if (axeItem) {
          return {
            c: axeItem.c,
            r: axeItem.r,
            label: '🎯 소방 도끼 찾기',
            bannerText: '🎯 방탈출 퍼즐: 나무 장애물(🪵)을 부수기 위해 창고에서 🪓 소방 도끼를 찾으세요!'
          };
        }
      } else {
        return {
          c: debrisTile.c,
          r: debrisTile.r,
          label: '🎯 장애물 부수기',
          bannerText: '🎯 방탈출 퍼즐: 🪓 소방 도끼로 복도 입구의 🪵 나무 장애물을 부수세요!'
        };
      }
    }

    if (lockedDoor) {
      if (player.keys === 0) {
        const keyItem = items.find(it => it.type === 'key');
        if (keyItem) {
          return {
            c: keyItem.c,
            r: keyItem.r,
            label: `🎯 ${keyItem.name} 찾기`,
            bannerText: `🎯 방탈출 퍼즐: 잠긴 문(🔒)을 열기 위해 🔑 ${keyItem.name}을(를) 찾으세요!`
          };
        }
      } else {
        return {
          c: lockedDoor.c,
          r: lockedDoor.r,
          label: '🎯 잠긴 문(🔒) 열기',
          bannerText: '🎯 방탈출 퍼즐: 획득한 🔑 열쇠로 🔒 잠긴 방문을 여세요!'
        };
      }
    }

    // Step 6: Rescue trapped family / friend / dog inside the unlocked room
    const rescueTarget = items.find(it => it.type === 'npc' || it.type === 'dog');
    if (rescueTarget) {
      return {
        c: rescueTarget.c,
        r: rescueTarget.r,
        label: `🎯 ${rescueTarget.name} 구출`,
        bannerText: `🎯 방탈출 미션: 방 안에 고립된 ${rescueTarget.icon} ${rescueTarget.name}을(를) 구출하세요!`
      };
    }

    // Step 7: Break any remaining wooden barricade (TILE.DEBRIS) blocking the exit
    if (debrisTile) {
      if (!player.hasAxe) {
        const axeItem = items.find(it => it.type === 'axe');
        if (axeItem) {
          return {
            c: axeItem.c,
            r: axeItem.r,
            label: '🎯 소방 도끼 줍기',
            bannerText: '🎯 방탈출 퍼즐: 탈출로를 막은 장애물(🪵)을 부수기 위해 🪓 소방 도끼를 챙기세요!'
          };
        }
      } else {
        return {
          c: debrisTile.c,
          r: debrisTile.r,
          label: '🎯 장애물(🪵) 파괴',
          bannerText: '🎯 방탈출 퍼즐: 🪓 소방 도끼로 탈출로를 막은 🪵 장애물을 부수세요!'
        };
      }
    }

    // Step 8: Stage 3 Veranda Lifeline / Partition
    if (currentStageIdx === 2 && !activeCustomStage) {
      const verandaEscape = findNearestTileOfTypes([TILE.LIFELINE, TILE.PARTITION]);
      if (verandaEscape) {
        return {
          c: verandaEscape.c,
          r: verandaEscape.r,
          label: verandaEscape.tile === TILE.LIFELINE ? '🎯 완강기 탈출!' : '🎯 경량칸막이 탈출!',
          bannerText: '🎯 최종 탈출: 베란다 대피실의 🪢 완강기 또는 🧱 경량칸막이로 탈출하세요!'
        };
      }
    }

    // Step 9: Final Escape Goal (EXIT)
    const exitTile =
      findNearestTileOfTypes([TILE.EXIT]) || findNearestTileOfTypes([TILE.LIFELINE, TILE.PARTITION]);
    if (exitTile) {
      return {
        c: exitTile.c,
        r: exitTile.r,
        label: '🎯 비상구(EXIT) 탈출!',
        bannerText: player.crouching
          ? '🎯 모든 방탈출 퍼즐 완료! 초록색 [EXIT 비상구]로 탈출하세요!'
          : '🎯 모든 퍼즐 완료! 연기 구역에선 [🧎 낮은 자세]로 초록색 [EXIT 비상구]까지 탈출하세요!'
      };
    }
    return null;
  }

  // --- HUD Update (with State Diff Cache to Prevent 60fps DOM Thrashing) ---
  const stepGuideBanner = document.getElementById('stepGuideBanner');
  const actionBtnIcon = document.getElementById('actionBtnIcon');
  const actionBtnText = document.getElementById('actionBtnText');
  const crouchBtnIcon = document.getElementById('crouchBtnIcon');
  const crouchBtnText = document.getElementById('crouchBtnText');

  const hudCache = {
    hpPct: -1,
    o2Pct: -1,
    dangerPulse: null,
    bannerText: '',
    onFireKey: '',
    extVisible: null,
    waterVisible: null,
    actIcon: '',
    actLabel: '',
    actHighlight: null,
    postureKey: '',
    crouchState: null,
    timeStr: '',
    scoreVal: -1,
    bestVal: -1,
    extCharges: -1,
    waterCharges: -1,
    invKey: ''
  };

  function updateHUD() {
    const st = activeCustomStage || STAGES[currentStageIdx] || STAGES[0];
    const hpPct = Math.max(0, Math.min(100, Math.round(player.hp)));
    const o2Pct = Math.max(0, Math.min(100, Math.round(player.o2)));

    if (hudCache.hpPct !== hpPct) {
      hudCache.hpPct = hpPct;
      hpBar.style.width = hpPct + '%';
      hpValue.textContent = hpPct + '%';
    }
    if (hudCache.o2Pct !== o2Pct) {
      hudCache.o2Pct = o2Pct;
      o2Bar.style.width = o2Pct + '%';
      o2Value.textContent = o2Pct + '%';
    }

    const dangerPulse = (hpPct <= 30 || o2Pct <= 30 || player.onFire);
    if (hudCache.dangerPulse !== dangerPulse) {
      hudCache.dangerPulse = dangerPulse;
      if (dangerPulse) {
        canvasContainer.classList.add('pulse-danger');
      } else {
        canvasContainer.classList.remove('pulse-danger');
      }
    }

    // Update Live Step-by-Step Banner in Top Header only when text changes
    const nextObj = getNextStepObjective();
    const bannerText = (nextObj && nextObj.bannerText) || '';
    if (stepGuideBanner && bannerText && hudCache.bannerText !== bannerText) {
      hudCache.bannerText = bannerText;
      stepGuideBanner.innerHTML = `<span id="stepGuideText">${bannerText}</span>`;
      if (gameState === 'PLAYING') {
        speakGuideIfEnabled(bannerText);
      }
    }

    // Show/Hide conditional item buttons only on state change
    const onFireKey = player.onFire ? `1:${player.rollNeeded}` : '0';
    if (hudCache.onFireKey !== onFireKey) {
      hudCache.onFireKey = onFireKey;
      if (player.onFire) {
        rollStatusBadge.textContent = `(${player.rollNeeded}회연타!)`;
        btnRoll.classList.remove('hidden');
        btnRoll.classList.add('flex');
      } else {
        rollStatusBadge.textContent = `(안전)`;
        btnRoll.classList.add('hidden');
        btnRoll.classList.remove('flex');
      }
    }

    const extVisible = player.extinguisherCharges > 0;
    if (hudCache.extVisible !== extVisible) {
      hudCache.extVisible = extVisible;
      if (extVisible) {
        btnExtinguish.classList.remove('hidden');
        btnExtinguish.classList.add('flex');
      } else {
        btnExtinguish.classList.add('hidden');
        btnExtinguish.classList.remove('flex');
      }
    }

    const waterVisible = player.waterCharges > 0 && !player.onFire;
    if (hudCache.waterVisible !== waterVisible) {
      hudCache.waterVisible = waterVisible;
      if (waterVisible) {
        btnWaterBucket.classList.remove('hidden');
        btnWaterBucket.classList.add('flex');
      } else {
        btnWaterBucket.classList.add('hidden');
        btnWaterBucket.classList.remove('flex');
      }
    }

    // Update Context-Sensitive Primary Action Button (#btnAction)
    const target = getInteractTarget();
    let actIcon = '✋';
    let actLabel = '행동하기';
    let actHighlight = false;

    if (player.onFire) {
      actIcon = '🔄';
      actLabel = `구르기(${player.rollNeeded})`;
      actHighlight = true;
    } else if (target) {
      actHighlight = true;
      if (target.kind === 'item') {
        actIcon = target.item.icon;
        actLabel = `${target.item.name} 줍기`;
      } else if (target.tile === TILE.SINK) {
        actIcon = '🚰';
        actLabel = player.hasTowel && !player.wetTowel ? '수건 적시기' : '물 받기';
      } else if (target.tile === TILE.DOOR) {
        actIcon = '🚪';
        actLabel = '방문 열기';
      } else if (target.tile === TILE.OPEN_DOOR) {
        actIcon = '🚪';
        actLabel = '방화문 닫기';
      } else if (target.tile === TILE.HOT_DOOR) {
        actIcon = '🌡️';
        actLabel = '문 온도 확인';
      } else if (target.tile === TILE.LOCKED_DOOR) {
        actIcon = '🔑';
        actLabel = '잠긴문 열기';
      } else if (target.tile === TILE.GAS_VALVE) {
        actIcon = '🔴';
        actLabel = '가스 잠그기';
      } else if (target.tile === TILE.BREAKER) {
        actIcon = '⚡';
        actLabel = '차단기 내리기';
      } else if (target.tile === TILE.PHONE_119) {
        actIcon = '📞';
        actLabel = '119 신고';
      } else if (target.tile === TILE.LIFELINE) {
        actIcon = '🪢';
        actLabel = '완강기 탈출';
      } else if (target.tile === TILE.PARTITION) {
        actIcon = '🧱';
        actLabel = '칸막이 돌파';
      } else if (target.tile === TILE.HAZARD) {
        actIcon = '🔍';
        actLabel = '위험요소 점검';
      } else if (target.tile === TILE.ALARM_BELL) {
        actIcon = '🔔';
        actLabel = '비상벨 누르기';
      } else if (target.tile === TILE.DEBRIS) {
        actIcon = '🪓';
        actLabel = '장애물 파괴';
      } else if (target.tile === TILE.ELEVATOR) {
        actIcon = '⚠️';
        actLabel = '탑승 금지!';
      }
    } else if (player.extinguisherCharges > 0 && fires.some(f => Math.hypot((f.c + 0.5) - player.x, (f.r + 0.5) - player.y) <= 2.4)) {
      actIcon = '🧯';
      actLabel = '불 끄기!';
      actHighlight = true;
    }

    if (actionBtnIcon && hudCache.actIcon !== actIcon) {
      hudCache.actIcon = actIcon;
      actionBtnIcon.textContent = actIcon;
    }
    if (actionBtnText && hudCache.actLabel !== actLabel) {
      hudCache.actLabel = actLabel;
      actionBtnText.textContent = actLabel;
    }
    if (hudCache.actHighlight !== actHighlight) {
      hudCache.actHighlight = actHighlight;
      btnAction.className = actHighlight
        ? 'btn-control px-3 py-2 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 border-2 border-yellow-200 text-xs sm:text-sm font-black text-slate-950 flex flex-col items-center justify-center gap-1 shadow-xl'
        : 'btn-control px-3 py-2 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 border-2 border-orange-300/60 text-xs sm:text-sm font-black text-white flex flex-col items-center justify-center gap-1 shadow-lg';
    }

    const postureKey = `${st.isPreventionMode ? 1 : 0}:${player.crouching ? 1 : 0}`;
    if (hudCache.postureKey !== postureKey) {
      hudCache.postureKey = postureKey;
      if (st.isPreventionMode) {
        postureStatus.textContent = player.crouching ? '🧎 하층점검' : '🔍 사전점검';
        postureStatus.className = 'text-[11px] font-extrabold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 whitespace-nowrap';
        convectionMarker.style.top = player.crouching ? '20px' : '12px';
        convectionHint.textContent = '화재 전 쾌적한 실내 공기';
      } else if (player.crouching) {
        postureStatus.textContent = '🧎 낮은자세(안전)';
        postureStatus.className = 'text-[11px] font-extrabold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 whitespace-nowrap';
        convectionMarker.style.top = '20px';
        convectionHint.textContent = '바닥 신선한 공기 호흡';
      } else {
        postureStatus.textContent = '🚶 서있음';
        postureStatus.className = 'text-[11px] font-extrabold text-amber-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 whitespace-nowrap';
        convectionMarker.style.top = '3px';
        convectionHint.textContent = '상층 유독가스 주의!';
      }
    }

    if (hudCache.crouchState !== player.crouching) {
      hudCache.crouchState = player.crouching;
      if (crouchBtnIcon) crouchBtnIcon.textContent = player.crouching ? '🧎' : '🚶';
      if (crouchBtnText) crouchBtnText.textContent = player.crouching ? '낮은자세 켜짐' : '자세 낮추기';
      btnCrouch.className = player.crouching
        ? 'btn-control px-3 py-2 rounded-2xl bg-emerald-600 border-2 border-emerald-300 text-xs sm:text-sm font-black text-white flex flex-col items-center justify-center gap-1 shadow-lg'
        : 'btn-control px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 text-xs sm:text-sm font-extrabold text-amber-300 flex flex-col items-center justify-center gap-1 shadow';
    }

    const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const secs = String(Math.floor(elapsedSeconds % 60)).padStart(2, '0');
    const timeStr = `${mins}:${secs}`;
    if (hudCache.timeStr !== timeStr) {
      hudCache.timeStr = timeStr;
      timerDisplay.textContent = timeStr;
    }

    if (hudCache.scoreVal !== score) {
      hudCache.scoreVal = score;
      scoreDisplay.textContent = score.toLocaleString();
    }
    const bestVal = getSavedBestScore();
    if (hudCache.bestVal !== bestVal) {
      hudCache.bestVal = bestVal;
      bestScoreDisplay.textContent = bestVal.toLocaleString();
    }
    if (hudCache.extCharges !== player.extinguisherCharges) {
      hudCache.extCharges = player.extinguisherCharges;
      extAmmoBadge.textContent = `(${player.extinguisherCharges})`;
    }
    if (hudCache.waterCharges !== player.waterCharges) {
      hudCache.waterCharges = player.waterCharges;
      waterAmmoBadge.textContent = `(${player.waterCharges})`;
    }

    const activeSkin = getSelectedSkin();
    const invKey = `${isCoopMode ? 1 : 0}|${activeSkin ? activeSkin.id : ''}|${player.hasMask ? 1 : 0}|${player.wetTowel ? 1 : 0}|${player.hasTowel ? 1 : 0}|${player.hasFlashlight ? 1 : 0}|${player.extinguisherCharges}|${player.waterCharges}|${player.keys}|${player.hasAxe ? 1 : 0}|${player.rescuedDog ? 1 : 0}|${player.rescuedNpcs}|${player.hazardsFixed}/${player.totalHazards}`;
    if (hudCache.invKey !== invKey) {
      hudCache.invKey = invKey;
      const badges = [];
      if (isCoopMode) {
        badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-500/20 border border-pink-400/40 text-pink-200 text-[11px] font-bold shrink-0">👥 2인협동</span>`);
      }
      if (activeSkin && activeSkin.id !== 'student') {
        badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-400/40 text-purple-200 text-[11px] font-bold shrink-0">${activeSkin.icon} ${activeSkin.name}</span>`);
      }
      if (player.hasMask) {
        badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-500/25 border border-teal-400/50 text-teal-200 text-[11px] font-bold shrink-0">😷 마스크 착용</span>`);
      } else if (player.wetTowel) {
        badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/25 border border-sky-400/50 text-sky-200 text-[11px] font-bold shrink-0">💧 젖은수건 착용</span>`);
      } else if (player.hasTowel) {
        badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/25 border border-amber-400/50 text-amber-200 text-[11px] font-bold shrink-0">🧣 마른수건(적시기 필요)</span>`);
      }
      if (player.hasFlashlight) {
        badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/20 border border-yellow-400/40 text-yellow-200 text-[11px] font-bold shrink-0">🔦 손전등</span>`);
      }
      if (player.extinguisherCharges > 0) {
        badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/20 border border-red-400/40 text-red-200 text-[11px] font-bold shrink-0">🧯 소화기(${player.extinguisherCharges})</span>`);
      }
      if (player.waterCharges > 0) {
        badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/40 text-blue-200 text-[11px] font-bold shrink-0">🪣 물(${player.waterCharges})</span>`);
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
      if (player.totalHazards > 0) {
        badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] font-bold shrink-0">🔍 점검(${player.hazardsFixed}/${player.totalHazards})</span>`);
      }

      if (badges.length === 0) {
        inventoryList.innerHTML = `<span class="text-[11px] text-slate-400 font-semibold whitespace-nowrap shrink-0">🎒 가방: 비어 있음</span>`;
      } else {
        inventoryList.innerHTML = badges.join('');
      }
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
    const incompleteReason = getIncompleteEscapeReason();
    if (incompleteReason) {
      SoundFX.warning();
      showToast(incompleteReason, 'border-amber-500');
      return;
    }
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
    const incompleteReason = getIncompleteEscapeReason();
    if (incompleteReason) {
      SoundFX.warning();
      showToast(incompleteReason, 'border-amber-500');
      return;
    }
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
    '1,2': 0,
    '1,3': 0,
    '1,7': 1,
    '1,8': 1,
    '1,12': 1,
    '1,13': 2,
    '8,12': 2,
    '7,2': 3,
    '8,2': 3,
    '2,7': 4,
    '7,8': 4,
    '8,8': 4
  };

  function inspectHazardTile(c, r) {
    const mappedIdx = HAZARD_COORD_MAP[`${r},${c}`];
    const quizIdx = typeof mappedIdx === 'number' ? mappedIdx : (player.hazardsFixed % HAZARD_QUIZZES.length);
    const baseQ = HAZARD_QUIZZES[quizIdx % HAZARD_QUIZZES.length];
    const useCustom = customQuizConfig && customQuizConfig.quizTitle && player.hazardsFixed === 0;
    const q = useCustom
      ? {
          title: `🎯 [우리 반 맞춤 퀴즈] ${customQuizConfig.quizTitle}`,
          desc: '선생님이 출제한 우리 학교·우리 반 맞춤 화재 안전 퀴즈입니다! 올바른 행동을 선택하세요.',
          good: customQuizConfig.goodChoice || baseQ.good,
          bad: customQuizConfig.badChoice || baseQ.bad
        }
      : baseQ;
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
      if (cameraMode3D === 'FPS_3D') orientCameraToOpenSpace();
      if (typeof saveCampaignState === 'function') saveCampaignState();
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
          showToast('🔒 잠긴 문입니다! 주변에서 열쇠(🔑)를 찾거나 [🔐 금고·배선퍼즐]에서 비상 마스터키를 해금하세요!', 'border-amber-500');
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
      if (cameraMode3D === 'FPS_3D') orientCameraToOpenSpace();
      if (typeof saveCampaignState === 'function') saveCampaignState();
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
    itemsHtml.push(`<div>${(player.alarmRung || player.rescuedNpcs > 0 || metrics.called119 || isCoopMode) ? '✅' : '💡'} <strong>협동·신고·퍼즐:</strong> ${player.alarmRung ? '🔔비상벨 발신 ' : ''}${player.rescuedNpcs > 0 ? `· 🧒이웃구출 ${player.rescuedNpcs}명 ` : ''}${metrics.called119 ? '· 📞119 신고 완료 ' : ''}${safeSolved ? '· 🔐금고해제 ' : ''}${wireSolved ? '· ⚡배선복구 ' : ''}${isCoopMode ? '· 👥2인 협동' : ''} (힌트 ${hintLog.length}회)</div>`);

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

    // Feature 5: Tailored 1-line safety prescription based on actual trajectory & behavior metrics
    const prescriptionBox = document.getElementById('debriefPrescriptionBox');
    if (prescriptionBox) {
      let prescHtml = '';
      if (metrics.backdraftTriggered > 0) {
        prescHtml = `🩺 <strong>[맞춤 안전 처방전]</strong> 닫힌 문을 열기 전 손등으로 문손잡이 온도를 확인하지 않아 <strong>백드래프트 폭발(${metrics.backdraftTriggered}회)</strong>이 발생했습니다! 뜨거운 문은 절대 열지 말고 다른 비상구를 찾으세요.`;
      } else if (metrics.waterOnSpecialFireMistake > 0) {
        prescHtml = `🩺 <strong>[맞춤 안전 처방전]</strong> 전기·식용유·금속 화재에 물을 뿌려 <strong>역화 위험(${metrics.waterOnSpecialFireMistake}회)</strong>이 발생했습니다! 특수 화재에는 반드시 용도에 맞는 소화기(🧯)나 모래를 사용하세요.`;
      } else if (!st.isPreventionMode && crouchPct < 65) {
        prescHtml = `🩺 <strong>[맞춤 안전 처방전]</strong> 연기 구역에서 <strong>낮은 자세 유지율(${crouchPct}%)</strong>이 낮아 유독가스를 많이 마셨습니다! 연기 속에서는 젖은 수건(😷)을 코와 입에 대고 <strong>[🧎 낮은 자세(C키)]</strong>로 이동하세요.`;
      } else if (!st.isPreventionMode && player.fireDoorsClosed === 0) {
        prescHtml = `🩺 <strong>[맞춤 안전 처방전]</strong> 대피 후 <strong>방화문 닫기(🚪)</strong>를 실천하면 연기 확산 속도를 45% 이상 늦춰 뒤따르는 이웃의 생명을 구할 수 있습니다!`;
      } else {
        prescHtml = `🩺 <strong>[맞춤 안전 처방전]</strong> 호흡기 보호, 낮은 자세 유지(${crouchPct}%), 문 온도 확인(${metrics.doorHeatChecked}회)까지 <strong>완벽한 표준 대피 동선</strong>으로 탈출했습니다!`;
      }
      prescriptionBox.innerHTML = prescHtml;
    }

    // Feature 8: Deterministic classroom clear verification code (for Google Forms / Padlet / Klas)
    const verifyBox = document.getElementById('clearVerifyCodeBox');
    const verifyText = document.getElementById('verifyCodeText');
    if (verifyBox && verifyText) {
      if (isGameOver) {
        verifyBox.classList.add('hidden');
        verifyBox.classList.remove('flex');
      } else {
        const stCode = activeCustomStage ? 'CUS' : `S${currentStageIdx + 1}`;
        const gTag = debriefGrade.textContent.includes('S등급') ? 'S' : (debriefGrade.textContent.includes('A등급') ? 'A' : 'B');
        const checksum = ((currentStageIdx + 1) * 17 + (score % 97) + (crouchPct % 31)) % 90 + 10;
        const codeStr = `119-${stCode}-${gTag}${score}-${checksum}`;
        verifyText.textContent = codeStr;
        verifyBox.classList.remove('hidden');
        verifyBox.classList.add('flex');
      }
    }

    renderReplayMinimap();
  }

  const btnCopyVerifyCode = document.getElementById('btnCopyVerifyCode');
  if (btnCopyVerifyCode) {
    btnCopyVerifyCode.addEventListener('click', () => {
      const verifyText = document.getElementById('verifyCodeText');
      const code = verifyText ? verifyText.textContent.trim() : '';
      if (code && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).catch(() => {});
      }
      SoundFX.pickup();
      showToast(`🔐 클리어 인증코드 [${code}]가 복사되었습니다! 학급 게시판이나 과제 제출란에 붙여넣으세요.`, 'border-emerald-400');
    });
  }

  // --- Stage Clear / Game Over Handlers (Bug #4 Fix: Record final position in pathHistory) ---
  function handleStageClear() {
    clearAllInputStates();
    SoundFX.win();
    SoundFX.speak('안전하게 탈출에 성공했습니다! 참 잘했어요!');
    markCurrentStageCleared();

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
    const statHintsEl = document.getElementById('statHints');
    if (statHintsEl) statHintsEl.textContent = `${hintLog.length}회`;
    const continueBtn = document.getElementById('btnContinueSaved');
    if (continueBtn) continueBtn.classList.add('hidden');
    const worldBar = document.getElementById('worldSelectBar');
    if (worldBar) worldBar.classList.add('hidden');

    overlayStats.classList.remove('hidden');
    overlayStats.classList.add('grid');
    overlayTipsBox.classList.add('hidden');
    if (document.getElementById('btnMainGuide')) document.getElementById('btnMainGuide').classList.add('hidden');
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
    if (typeof saveCampaignState === 'function') saveCampaignState();
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
    statVitals.textContent = reason === 'exposure' ? `${Math.round(player.hp)}% / ${Math.round(player.o2)}%` : `0%`;
    statScore.textContent = score.toLocaleString();
    const statHintsEl = document.getElementById('statHints');
    if (statHintsEl) statHintsEl.textContent = `${hintLog.length}회`;
    const continueBtn = document.getElementById('btnContinueSaved');
    if (continueBtn) continueBtn.classList.add('hidden');
    const worldBar = document.getElementById('worldSelectBar');
    if (worldBar) worldBar.classList.add('hidden');

    overlayStats.classList.remove('hidden');
    overlayStats.classList.add('grid');
    overlayTipsBox.classList.add('hidden');
    if (document.getElementById('btnMainGuide')) document.getElementById('btnMainGuide').classList.add('hidden');
    btnOpenCertFromOverlay.classList.remove('hidden');
    populateDebriefReport(true);

    overlayIcon.textContent = '⚠️';
    overlaySubtitle.textContent = '대피 실패 · 동선 리플레이 분석';
    if (reason === 'exposure') {
      overlayTitle.textContent = `위험 노출 허용 시간(${runOptions.hazardLimitSeconds || 300}초)을 초과했습니다!`;
      overlayDesc.innerHTML = `화재 현장에 너무 오래 머물러 골든타임을 놓쳤습니다. <strong>[🎛️ 설정·저장]</strong>에서 <strong>긴장 완화 모드(480초)</strong> 또는 <strong>연습 모드</strong>로 전환하거나, 수첩(H키) 힌트를 확인해 신속히 탈출하세요!`;
    } else {
      overlayTitle.textContent = reason === 'o2' ? '유독가스에 질식했습니다!' : '불길에 큰 화상을 입었습니다!';
      overlayDesc.innerHTML = reason === 'o2'
        ? '대류 현상으로 뜨거운 연기가 상층부에 가득 차 있습니다. <strong>젖은 수건·방연마스크(😷)</strong>를 쓰고 <strong>낮은 자세(C/Shift)</strong>로 이동하세요.'
        : '옷에 불이 붙었을 때는 뛰지 말고 즉시 <strong>구르기(🔄 버튼 / F키)</strong>를 연타하여 불을 꺼야 합니다!';
    }

    btnPrimaryAction.textContent = '이 단계 다시 도전하기';
    btnSecondaryAction.classList.remove('hidden');
    btnSecondaryAction.textContent = '1단계부터 시작';
    gameOverlay.classList.remove('hidden');
    overlaySelectedIndex = 0;
    setTimeout(updateOverlaySelectionUI, 20);
  }

  // --- 3D Walkthrough Kinematics, Follow-Camera & World-Space Footsteps State ---
  let cameraMode3D = 'DIORAMA_3D';
  let fpsCamYaw = 0;
  let fpsCamX = 1.5;
  let fpsCamY = 1.5;
  let fpsWalkPhase = 0;
  let fpsLastStepHalf = 0;
  let fpsForwardSurge = 0;
  let fpsTurnBias = 0;
  let autoInteractCooldown = 0;
  let footsteps3D = [];
  let lastContextPrompt = '';

  // --- Update Loop ---
  function updateGame(dt) {
    // PRD Section 6.2 Activity Time Rule:
    // While reading Notebook/Clues (#notebookModal open), active elapsedSeconds and safeLockUntil advance,
    // while hazardExposure and fire/smoke spread pause!
    const notebookEl = document.getElementById('notebookModal');
    const isReadingNotebook = notebookEl && !notebookEl.classList.contains('hidden');
    if (isReadingNotebook && (gameState === 'PLAYING' || gameState === 'PAUSED')) {
      elapsedSeconds += dt;
      if (typeof updateSafeLockUI === 'function') updateSafeLockUI();
      if (typeof updateTimePolicyModalUI === 'function') updateTimePolicyModalUI();
      updateHUD();
      return;
    }

    if (gameState !== 'PLAYING') return;

    const st = activeCustomStage || STAGES[currentStageIdx] || STAGES[0];
    elapsedSeconds += dt;
    if (!st.isPreventionMode) {
      hazardExposure += dt;
    }
    fireSpreadTimer += dt;
    pathRecordTimer += dt;
    autoSaveTimer += dt;
    if (autoSaveTimer >= 5.0) {
      autoSaveTimer = 0;
      if (typeof saveCampaignState === 'function') saveCampaignState();
    }
    if (typeof updateSafeLockUI === 'function') updateSafeLockUI();
    if (player.hurtCooldown > 0) player.hurtCooldown -= dt;
    if (autoInteractCooldown > 0) autoInteractCooldown -= dt;

    // Check PRD Hazard Exposure Limit (300s Standard / 480s Relaxed / null Practice)
    if (
      !st.isPreventionMode &&
      runOptions.mode !== 'practice' &&
      typeof runOptions.hazardLimitSeconds === 'number' &&
      hazardExposure >= runOptions.hazardLimitSeconds
    ) {
      handleGameOver('exposure');
      return;
    }

    const activeSkin = getSelectedSkin();
    let baseSpeed = player.crouching
      ? 2.65 * (activeSkin.crouchSpeedBonus || 1.0)
      : 3.75;
    if (player.carryingToy) baseSpeed *= 0.72;

    // Feature 10: Automatic Bluetooth / USB Gamepad Support (Zero UI clutter)
    let gpAxesX = 0;
    let gpAxesY = 0;
    if (navigator.getGamepads) {
      try {
        const pads = navigator.getGamepads();
        const gp = pads && (pads[0] || pads[1] || pads[2] || pads[3]);
        if (gp && gp.connected) {
          const ax0 = gp.axes && gp.axes.length > 0 ? gp.axes[0] : 0;
          const ax1 = gp.axes && gp.axes.length > 1 ? gp.axes[1] : 0;
          if (Math.abs(ax0) > 0.25) gpAxesX = ax0;
          if (Math.abs(ax1) > 0.25) gpAxesY = ax1;
          if (gp.buttons && gp.buttons[12] && gp.buttons[12].pressed) gpAxesY = -1;
          if (gp.buttons && gp.buttons[13] && gp.buttons[13].pressed) gpAxesY = 1;
          if (gp.buttons && gp.buttons[14] && gp.buttons[14].pressed) gpAxesX = -1;
          if (gp.buttons && gp.buttons[15] && gp.buttons[15].pressed) gpAxesX = 1;
          if (gp.buttons && gp.buttons[0] && gp.buttons[0].pressed && autoInteractCooldown <= 0) {
            autoInteractCooldown = 0.35;
            triggerInteraction();
          }
          if (gp.buttons && gp.buttons[1] && gp.buttons[1].pressed && autoInteractCooldown <= 0) {
            autoInteractCooldown = 0.35;
            player.crouching = !player.crouching;
            updateHUD();
          }
        }
      } catch (e) {}
    }

    let mvX = 0;
    let mvY = 0;
    let isMoving = false;
    let targetSurge = 0;
    let targetTurnBias = 0;
    const sensMult = Math.max(0.6, Math.min(1.4, (appSettings.sensitivity || 100) / 100));
    const motionMult = appSettings.reduceMotion ? 0.35 : 1.0;

    if (cameraMode3D === 'FPS_3D') {
      // Smooth, Non-Dizzying 1st-Person 3D Perspective Walkthrough Controls:
      // ▲(W) = Walk Forward into the 3D room/corridor, ▼(S) = Step Backward, ◀(A)/▶(D) = Smooth Turn + Strafe Assist
      const turnInput = ((keysPressed.right ? 1 : 0) - (keysPressed.left ? 1 : 0)) || gpAxesX;
      const forwardInput = ((keysPressed.up ? 1 : 0) - (keysPressed.down ? 1 : 0)) || -gpAxesY;

      if (turnInput !== 0 || forwardInput !== 0) {
        pointerMoveTarget = null;
      }

      if (turnInput !== 0) {
        // Calm, steady turn rate scaled by user sensitivity setting
        const turnSpeed = (forwardInput !== 0 ? 1.35 : 1.55) * sensMult;
        fpsCamYaw += turnInput * turnSpeed * dt;
        targetTurnBias = turnInput * 0.82 * motionMult;
        player.dirX = Math.cos(fpsCamYaw);
        player.dirY = Math.sin(fpsCamYaw);
      } else if (forwardInput > 0) {
        // Gentle Corridor Alignment Assist: when walking forward without turning, softly align toward nearest 90° corridor axis if close
        const snapAxis = Math.round(fpsCamYaw / (Math.PI * 0.5)) * (Math.PI * 0.5);
        let axisDiff = snapAxis - fpsCamYaw;
        while (axisDiff > Math.PI) axisDiff -= Math.PI * 2;
        while (axisDiff < -Math.PI) axisDiff += Math.PI * 2;
        if (Math.abs(axisDiff) < 0.28) {
          fpsCamYaw += axisDiff * Math.min(1, dt * 4.2);
        }
      }

      if (forwardInput !== 0) {
        const moveMult = forwardInput > 0 ? 1.0 : 0.68;
        mvX = Math.cos(fpsCamYaw) * forwardInput * moveMult;
        mvY = Math.sin(fpsCamYaw) * forwardInput * moveMult;
        isMoving = true;
        targetSurge = (forwardInput > 0 ? 1.0 : -0.45) * motionMult;
      } else if (turnInput !== 0) {
        // Subtle forward step while turning in place so the character never feels stuck on a corner
        mvX = Math.cos(fpsCamYaw) * 0.22;
        mvY = Math.sin(fpsCamYaw) * 0.22;
        isMoving = true;
        targetSurge = 0.25 * motionMult;
      } else if (pointerMoveTarget) {
        const dx = pointerMoveTarget.x - player.x;
        const dy = pointerMoveTarget.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.14) {
          const desiredYaw = Math.atan2(dy, dx);
          let diff = desiredYaw - fpsCamYaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          fpsCamYaw += diff * Math.min(1, dt * 5.2 * sensMult);
          targetTurnBias = Math.max(-0.85, Math.min(0.85, diff * 1.1)) * motionMult;
          mvX = dx / dist;
          mvY = dy / dist;
          isMoving = true;
          targetSurge = 0.9 * motionMult;
        } else {
          pointerMoveTarget = null;
        }
      }

      player.dirX = Math.cos(fpsCamYaw);
      player.dirY = Math.sin(fpsCamYaw);
    } else {
      // Full-Building 3D Cutaway ('DIORAMA_3D') 4-Way Movement
      if (keysPressed.up) mvY -= 1;
      if (keysPressed.down) mvY += 1;
      if (keysPressed.left) mvX -= 1;
      if (keysPressed.right) mvX += 1;
      if (mvX === 0 && mvY === 0 && (gpAxesX !== 0 || gpAxesY !== 0)) {
        mvX = gpAxesX;
        mvY = gpAxesY;
      }

      if (mvX !== 0 || mvY !== 0) {
        pointerMoveTarget = null;
      } else if (pointerMoveTarget) {
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

      isMoving = (mvX !== 0 || mvY !== 0);
      if (isMoving) {
        const len = Math.hypot(mvX, mvY);
        mvX /= len;
        mvY /= len;
        player.dirX = mvX;
        player.dirY = mvY;
        fpsCamYaw = Math.atan2(mvY, mvX);
        targetSurge = 1.0 * motionMult;
        targetTurnBias = mvX * 0.65 * motionMult;
      }
    }

    if (isMoving) {
      const probeDirX = player.dirX || mvX;
      const probeDirY = player.dirY || mvY;

      // Auto-Interact when walking toward a closed door, locked door (with key), debris (with axe), or sink/valve/breaker/alarm
      if (autoInteractCooldown <= 0) {
        const probeAngles = cameraMode3D === 'FPS_3D' ? [0, 0.45, -0.45] : [0];
        let interacted = false;
        for (const angOff of probeAngles) {
          if (interacted) break;
          const pCos = cameraMode3D === 'FPS_3D' ? Math.cos(fpsCamYaw + angOff) : probeDirX;
          const pSin = cameraMode3D === 'FPS_3D' ? Math.sin(fpsCamYaw + angOff) : probeDirY;
          for (const probeDist of [0.52, 0.84]) {
            const probeC = Math.floor(player.x + pCos * probeDist);
            const probeR = Math.floor(player.y + pSin * probeDist);
            if (probeC >= 0 && probeC < COLS && probeR >= 0 && probeR < ROWS) {
              const probeTile = grid[probeR][probeC];
              if (
                probeTile === TILE.DOOR ||
                (probeTile === TILE.LOCKED_DOOR && player.keys > 0) ||
                (probeTile === TILE.DEBRIS && player.hasAxe) ||
                (probeTile === TILE.SINK && ((player.hasTowel && !player.wetTowel) || player.o2 < 85)) ||
                (probeTile === TILE.GAS_VALVE && !player.gasClosed) ||
                (probeTile === TILE.BREAKER && !player.breakerClosed) ||
                (probeTile === TILE.ALARM_BELL && !player.alarmRung)
              ) {
                autoInteractCooldown = 0.36;
                triggerInteraction({ kind: 'tile', c: probeC, r: probeR, tile: probeTile });
                interacted = true;
                break;
              }
            }
          }
        }
      }

      const stepX = mvX * baseSpeed * dt;
      const stepY = mvY * baseSpeed * dt;
      let movedX = false;
      let movedY = false;

      // Horizontal step + strong doorway auto-centering & wall-sliding
      if (canMoveTo(player.x + stepX, player.y, player.radius)) {
        player.x += stepX;
        movedX = true;
      } else if (Math.abs(mvX) > 0.25) {
        const centerY = Math.floor(player.y) + 0.5;
        const diffY = centerY - player.y;
        if (Math.abs(diffY) > 0.01 && Math.abs(diffY) < 0.49) {
          const nudgeY = Math.sign(diffY) * Math.min(Math.abs(diffY), baseSpeed * 1.05 * dt);
          if (canMoveTo(player.x, player.y + nudgeY, player.radius)) {
            player.y += nudgeY;
          }
          if (canMoveTo(player.x + stepX * 0.8, player.y, player.radius)) {
            player.x += stepX * 0.8;
            movedX = true;
          }
        }
      }

      // Vertical step + strong doorway auto-centering & wall-sliding
      if (canMoveTo(player.x, player.y + stepY, player.radius)) {
        player.y += stepY;
        movedY = true;
      } else if (Math.abs(mvY) > 0.25) {
        const centerX = Math.floor(player.x) + 0.5;
        const diffX = centerX - player.x;
        if (Math.abs(diffX) > 0.01 && Math.abs(diffX) < 0.49) {
          const nudgeX = Math.sign(diffX) * Math.min(Math.abs(diffX), baseSpeed * 1.05 * dt);
          if (canMoveTo(player.x + nudgeX, player.y, player.radius)) {
            player.x += nudgeX;
          }
          if (canMoveTo(player.x, player.y + stepY * 0.8, player.radius)) {
            player.y += stepY * 0.8;
            movedY = true;
          }
        }
      }

      // Smart 3D Corridor & Doorway Slide Assist in FPS_3D:
      // If pressing ▲ (forward) into a wall near a corner or doorway, smoothly glide along the wall toward the next escape route tile!
      if (cameraMode3D === 'FPS_3D' && keysPressed.up && !movedX && !movedY) {
        const nextObj = getNextStepObjective();
        if (nextObj) {
          const route = computeShortestEscapePath(Math.floor(player.x), Math.floor(player.y), nextObj.c, nextObj.r);
          if (route && route.length >= 2) {
            const wp = route[1];
            const wdx = (wp.c + 0.5) - player.x;
            const wdy = (wp.r + 0.5) - player.y;
            const wlen = Math.hypot(wdx, wdy) || 1;
            const slideX = (wdx / wlen) * baseSpeed * 0.85 * dt;
            const slideY = (wdy / wlen) * baseSpeed * 0.85 * dt;
            if (canMoveTo(player.x + slideX, player.y, player.radius)) player.x += slideX;
            if (canMoveTo(player.x, player.y + slideY, player.radius)) player.y += slideY;
            const desiredYaw = Math.atan2(wdy, wdx);
            let yawDiff = desiredYaw - fpsCamYaw;
            while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
            while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
            fpsCamYaw += yawDiff * Math.min(1, dt * 2.8);
          }
        }
      }
    }

    // Walk-Over Auto-Pickup for Safety Items & Trapped Companions (except 'toy' which asks a moral choice)
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.type === 'toy') continue;
      const dist = Math.hypot(player.x - (it.c + 0.5), player.y - (it.r + 0.5));
      if (dist < 0.76) {
        triggerInteraction({ kind: 'item', index: i, item: it });
        break;
      }
    }

    // Smoothly interpolate 3D Follow-Camera position toward player
    fpsCamX += (player.x - fpsCamX) * Math.min(1, dt * 10.0);
    fpsCamY += (player.y - fpsCamY) * Math.min(1, dt * 10.0);

    // Update 3D Walk Stride Phase & World-Space 3D Footprints
    fpsForwardSurge += (targetSurge - fpsForwardSurge) * Math.min(1, dt * 9.0);
    fpsTurnBias += (targetTurnBias - fpsTurnBias) * Math.min(1, dt * 8.5);
    if (isMoving) {
      const strideSpeed = player.crouching ? 8.5 : 10.8;
      fpsWalkPhase += dt * strideSpeed;
      const curHalf = Math.floor(fpsWalkPhase / Math.PI);
      if (curHalf !== fpsLastStepHalf) {
        fpsLastStepHalf = curHalf;
        const side = (curHalf % 2 === 0) ? -1 : 1;
        const perpX = -Math.sin(fpsCamYaw) * side * 0.13;
        const perpY = Math.cos(fpsCamYaw) * side * 0.13;
        footsteps3D.push({
          x: player.x + perpX,
          y: player.y + perpY,
          yaw: fpsCamYaw,
          side,
          life: 1.35,
          maxLife: 1.35
        });
        if (footsteps3D.length > 14) footsteps3D.shift();
      }
    } else {
      const modPhase = fpsWalkPhase % Math.PI;
      if (modPhase > 0.05 && modPhase < Math.PI - 0.05) {
        fpsWalkPhase += (modPhase > Math.PI * 0.5 ? (Math.PI - modPhase) : -modPhase) * Math.min(1, dt * 10);
      }
    }

    for (let i = footsteps3D.length - 1; i >= 0; i--) {
      footsteps3D[i].life -= dt;
      if (footsteps3D[i].life <= 0) footsteps3D.splice(i, 1);
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
      const incompleteReason = getIncompleteEscapeReason();
      if (isCoopMode && !(p1OnExit && p2OnExit) && Math.hypot(player.x - player2.x, player.y - player2.y) > 1.45) {
        if (player.hurtCooldown <= 0) {
          player.hurtCooldown = 1.6;
          SoundFX.warning();
          showToast('👥 [2인 협동 모드] 1P와 2P 두 명 모두 비상구(EXIT)에 모여야 함께 탈출할 수 있습니다!', 'border-indigo-400');
        }
      } else if (incompleteReason) {
        if (player.hurtCooldown <= 0) {
          player.hurtCooldown = 1.6;
          SoundFX.warning();
          showToast(incompleteReason, 'border-amber-500');
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
    const gradeMults = getGradeDifficultyMultipliers();
    if (inFire) {
      const fireMult = (st.fireDamageMult || 1.0) * gradeMults.fireMult;
      player.hp -= 24 * fireMult * dt;
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
      const burnRate = (isMoving ? 9.5 : 3.5) * (st.fireDamageMult || 1.0) * gradeMults.fireMult;
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

      let drainRate = 18.0 * (activeSkin.o2DrainMult || 1.0) * (st.smokeO2DrainMult || 1.0) * gradeMults.smokeMult;
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

    // Physical Fire Door & Smoke Spread Simulation (Scaled by Stage Difficulty)
    const baseSpread = (st.fireSpreadInterval || 11.0) * gradeMults.spreadMult;
    const spreadInterval = player.fireDoorsClosed > 0 ? baseSpread * 1.45 : baseSpread;
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
    let promptText = '';
    if (player.onFire) {
      promptText = `🚨 옷에 불이 붙었습니다! [🔄 구르기 버튼 / F키]를 연타하세요! (${player.rollNeeded}회)`;
    } else if (target) {
      if (target.kind === 'item') {
        promptText = `[터치 / Space / 상호작용] ${target.item.icon} ${target.item.name} 획득·구조`;
      } else if (target.tile === TILE.SINK) {
        promptText = player.hasTowel && !player.wetTowel
          ? `[터치 / 상호작용] 💧 세면대에서 수건 적시기 & 물양동이 채우기`
          : `[터치 / 상호작용] 💧 세면대 산소 회복 & 물양동이 보충`;
      } else if (target.tile === TILE.DOOR) {
        promptText = `[터치 / 상호작용] 🤚🚪 손등으로 문 온도 확인 후 열기`;
      } else if (target.tile === TILE.OPEN_DOOR) {
        promptText = `[터치 / 상호작용] 🚪🛡️ 열린 방화문 다시 닫기 (연기 통과 차단!)`;
      } else if (target.tile === TILE.HOT_DOOR) {
        promptText = `[터치 / 상호작용] 🤚🌡️ 손등으로 문 손잡이 온도 감지하기 (고온 주의!)`;
      } else if (target.tile === TILE.LOCKED_DOOR) {
        promptText = `[터치 / 상호작용] 🔒 열쇠로 잠긴 문 열기`;
      } else if (target.tile === TILE.GAS_VALVE) {
        promptText = `[터치 / 상호작용] 🔴 주방 가스 밸브 잠그기 (가연물 차단)`;
      } else if (target.tile === TILE.BREAKER) {
        promptText = `[터치 / 상호작용] ⚡ 전원 차단기(두꺼비집) 내리기`;
      } else if (target.tile === TILE.PHONE_119) {
        promptText = `[터치 / 상호작용] 📞 119에 화재 발생 신고하기`;
      } else if (target.tile === TILE.LIFELINE) {
        promptText = `[터치 / 상호작용] 🪢 베란다 완강기(3단계 절차)로 탈출하기`;
      } else if (target.tile === TILE.PARTITION) {
        promptText = `[터치 / 상호작용] 🧱 아파트 베란다 경량칸막이 부수고 옆집으로 탈출하기`;
      } else if (target.tile === TILE.HAZARD) {
        promptText = `[터치 / 상호작용] 🔍 가정 내 화재 위험요소 점검·수리하기`;
      } else if (target.tile === TILE.ALARM_BELL) {
        promptText = `[터치 / 상호작용] 🔔 화재 비상벨(발신기) 누르고 "불이야!" 외치기`;
      } else if (target.tile === TILE.DEBRIS) {
        promptText = `[터치 / 상호작용] 🪓 소방 도끼로 장애물 부수기`;
      } else if (target.tile === TILE.ELEVATOR) {
        promptText = `⚠️ 엘리베이터 (화재 시 탑승 절대 금지!)`;
      }
    }

    if (lastContextPrompt !== promptText) {
      lastContextPrompt = promptText;
      if (promptText) {
        contextPrompt.classList.remove('opacity-0');
        contextPrompt.classList.add('opacity-100');
        contextPrompt.textContent = promptText;
      } else {
        contextPrompt.classList.remove('opacity-100');
        contextPrompt.classList.add('opacity-0');
      }
    }

    if (runOptions.mode === 'practice') {
      player.hp = Math.max(10, player.hp);
      player.o2 = Math.max(10, player.o2);
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

  // --- Coordinate Helper for Canvas & D-Pad Touch / Click (Supports Forced 90deg Landscape Rotation) ---
  window.getElementLocalCoords = function (el, clientX, clientY) {
    const rect = el.getBoundingClientRect();
    if (
      document.body.classList.contains('force-landscape') &&
      document.body.classList.contains('is-portrait-viewport')
    ) {
      return {
        x: clientY - rect.top,
        y: rect.right - clientX,
        width: rect.height,
        height: rect.width
      };
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      width: rect.width,
      height: rect.height
    };
  };

  function computeDioramaLayout(w, h) {
    const padX = 18;
    const padTop = 22;
    const padBottom = 14;
    const tileW = (w - padX * 2) / COLS;
    const tileH = (h - padTop - padBottom) / (ROWS + 0.48);
    const tileSize = Math.max(12, Math.min(tileW, tileH));
    const wallH = tileSize * 0.50;
    const offsetX = (w - tileSize * COLS) / 2;
    const offsetY = padTop + wallH + (h - padTop - padBottom - wallH - tileSize * ROWS) / 2;
    return { tileSize, wallH, offsetX, offsetY, isCloseUp: false };
  }

  function computeShortestEscapePath(startC, startR, goalC, goalR) {
    if (!grid || grid.length < ROWS) return [];
    const sc = Math.max(0, Math.min(COLS - 1, startC));
    const sr = Math.max(0, Math.min(ROWS - 1, startR));
    const gc = Math.max(0, Math.min(COLS - 1, goalC));
    const gr = Math.max(0, Math.min(ROWS - 1, goalR));
    if (sc === gc && sr === gr) return [{ c: sc, r: sr }];

    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const parent = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    const queue = [{ c: sc, r: sr }];
    visited[sr][sc] = true;

    const dirs = [
      { dc: 1, dr: 0 },
      { dc: -1, dr: 0 },
      { dc: 0, dr: 1 },
      { dc: 0, dr: -1 }
    ];

    while (queue.length > 0) {
      const curr = queue.shift();
      if (curr.c === gc && curr.r === gr) break;

      for (const d of dirs) {
        const nc = curr.c + d.dc;
        const nr = curr.r + d.dr;
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS || visited[nr][nc]) continue;
        const t = grid[nr][nc];
        const isGoal = (nc === gc && nr === gr);
        const walkable =
          isGoal ||
          t === TILE.FLOOR ||
          t === TILE.DOOR ||
          t === TILE.OPEN_DOOR ||
          t === TILE.EXIT ||
          (t === TILE.LOCKED_DOOR && player.keys > 0) ||
          (t === TILE.DEBRIS && player.hasAxe);
        if (!walkable) continue;
        visited[nr][nc] = true;
        parent[nr][nc] = curr;
        queue.push({ c: nc, r: nr });
      }
    }

    if (!visited[gr][gc]) {
      return [{ c: sc, r: sr }, { c: gc, r: gr }];
    }

    const path = [];
    let cur = { c: gc, r: gr };
    while (cur) {
      path.push(cur);
      cur = parent[cur.r][cur.c];
    }
    path.reverse();
    return path;
  }

  function orientCameraToOpenSpace() {
    fpsCamX = player.x;
    fpsCamY = player.y;
    const nextObj = getNextStepObjective();
    let bestYaw = Math.atan2(player.dirY || 0, player.dirX || 1);
    if (nextObj) {
      // Use the first step of the BFS escape route from player to nextObj so the 1st-person 3D camera looks straight down the open room/corridor!
      const route = computeShortestEscapePath(Math.floor(player.x), Math.floor(player.y), nextObj.c, nextObj.r);
      if (route && route.length >= 2) {
        const stepTile = route[Math.min(2, route.length - 1)];
        bestYaw = Math.atan2((stepTile.r + 0.5) - player.y, (stepTile.c + 0.5) - player.x);
      } else {
        bestYaw = Math.atan2((nextObj.r + 0.5) - player.y, (nextObj.c + 0.5) - player.x);
      }
    }
    fpsCamYaw = bestYaw;
    player.dirX = Math.cos(fpsCamYaw);
    player.dirY = Math.sin(fpsCamYaw);
    footsteps3D = [];
    fpsForwardSurge = 0;
    fpsTurnBias = 0;
  }

  function toggleCamera3DMode() {
    SoundFX.init();
    SoundFX.pickup();
    cameraMode3D = cameraMode3D === 'DIORAMA_3D' ? 'FPS_3D' : 'DIORAMA_3D';
    const iconEl = document.getElementById('camera3DIcon');
    const textEl = document.getElementById('camera3DText');
    if (cameraMode3D === 'FPS_3D') {
      orientCameraToOpenSpace();
      if (iconEl) iconEl.textContent = '👁️';
      if (textEl) textEl.textContent = '1인칭3D';
      showToast('👁️ [1인칭 3D 건물 탈출 뷰] ▲ 전진 · ▼ 후진 · ◀/▶ 방향전환으로 실제 3D 건물 속을 걸어 탈출하세요!', 'border-indigo-400');
    } else {
      if (iconEl) iconEl.textContent = '🧊';
      if (textEl) textEl.textContent = '3D입체뷰';
      showToast('🧊 [3D 전체 건물 입체 뷰] 건물 전체 방 구조와 탈출 동선을 한눈에 보는 3D 입체 시점입니다!', 'border-indigo-400');
    }
    renderCanvas();
  }

  const btnCamera3D = document.getElementById('btnCamera3D');
  if (btnCamera3D) {
    btnCamera3D.addEventListener('click', toggleCamera3DMode);
  }

  function getCanvasGridCoords(clientX, clientY) {
    const local = window.getElementLocalCoords(canvas, clientX, clientY);
    if (cameraMode3D === 'FPS_3D') {
      // 1. Check if user tapped inside the top-right 3D radar minimap
      const mapW = Math.min(165, Math.max(115, local.width * 0.22));
      const mapH = mapW * (ROWS / COLS);
      const mapX = local.width - mapW - 10;
      const mapY = 10;
      if (local.x >= mapX && local.x <= mapX + mapW && local.y >= mapY && local.y <= mapY + mapH) {
        const gx = ((local.x - mapX) / mapW) * COLS;
        const gy = ((local.y - mapY) / mapH) * ROWS;
        return { gx, gy, c: Math.floor(gx), r: Math.floor(gy) };
      }
      // 2. Otherwise, unproject 3D perspective viewport tap into a point ahead in the 3D corridor
      const fov = Math.PI * 0.42;
      const relX = (local.x / Math.max(1, local.width) - 0.5) * 2;
      const rayAngle = fpsCamYaw + relX * (fov * 0.5);
      const horizon = player.crouching ? local.height * 0.38 : local.height * 0.43;
      const dyScreen = Math.max(18, local.y - horizon);
      const stepDist = Math.min(3.5, Math.max(0.85, (local.height * 0.35) / dyScreen));
      const gx = Math.max(0.5, Math.min(COLS - 0.5, player.x + Math.cos(rayAngle) * stepDist));
      const gy = Math.max(0.5, Math.min(ROWS - 0.5, player.y + Math.sin(rayAngle) * stepDist));
      return { gx, gy, c: Math.floor(gx), r: Math.floor(gy) };
    }
    const layout = computeDioramaLayout(local.width, local.height);
    const gx = (local.x - layout.offsetX) / layout.tileSize;
    const gy = (local.y - layout.offsetY) / layout.tileSize;
    return { gx, gy, c: Math.floor(gx), r: Math.floor(gy) };
  }

  // --- Helper: Draw 3D Extruded Box (Isometric/Perspective Cutaway Block) ---
  function draw3DBox(ctx, x, y, w, d, h, topColor, frontColor, sideColor, strokeColor) {
    const bevelX = Math.max(2, w * 0.12);
    // 1. Right 3D depth face
    if (sideColor) {
      ctx.fillStyle = sideColor;
      ctx.beginPath();
      ctx.moveTo(x + w, y - h);
      ctx.lineTo(x + w + bevelX, y - h + bevelX * 0.55);
      ctx.lineTo(x + w + bevelX, y + d);
      ctx.lineTo(x + w, y + d);
      ctx.closePath();
      ctx.fill();
    }
    // 2. Front vertical face (extruded down from roof to floor base)
    ctx.fillStyle = frontColor;
    ctx.fillRect(x, y + d * 0.55 - h, w, h + d * 0.45);
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y + d * 0.55 - h, w, h + d * 0.45);
    }
    // 3. Top roof face
    ctx.fillStyle = topColor;
    ctx.fillRect(x, y - h, w, d * 0.62);
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.strokeRect(x, y - h, w, d * 0.62);
    }
  }

  // --- Helper: Draw Realistic Articulated 3D-Shaded Human Character ---
  function drawLimbSegment(ctx, x1, y1, x2, y2, radius, fillStyle, strokeStyle) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    const len = Math.hypot(dx, dy);
    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.arc(0, 0, radius, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(len, 0, radius * 0.88, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = Math.max(1, radius * 0.22);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHumanCharacter(ctx, footX, footY, charHeight, opts = {}) {
    const {
      crouching = false,
      moving = false,
      now = 0,
      dirX = 1,
      dirY = 0,
      skinId = 'student',
      wetTowel = false,
      hasTowel = false,
      hasMask = false,
      rightTool = 'none',
      onFire = false
    } = opts;

    // When walking North (▲ Up into the building), render the 3D back-view human with backpack & safety stripes!
    if (dirY < -0.55 && Math.abs(dirY) >= Math.abs(dirX)) {
      drawHumanCharacter3DWalk(ctx, footX, footY, charHeight, {
        crouching,
        moving,
        walkPhase: moving ? now * 9.5 : 0,
        turnBias: dirX * 0.5,
        skinId,
        wetTowel,
        hasTowel,
        hasMask,
        rightTool,
        onFire
      });
      return;
    }

    const u = Math.max(24, charHeight);
    const facing = dirX < -0.15 ? -1 : 1;
    const walkPhase = moving ? now * 9.5 : now * 2.2;
    const stride = moving ? Math.sin(walkPhase) : Math.sin(walkPhase) * 0.12;
    const bounce = moving ? Math.abs(Math.cos(walkPhase)) * (u * 0.035) : Math.sin(walkPhase) * (u * 0.012);

    // Outfit palette based on character role/skin
    let jacketMain = '#2563eb';
    let jacketDark = '#1d4ed8';
    let stripeCol = '#facc15';
    let pantsCol = '#1e293b';
    let pantsBackCol = '#0f172a';
    let shoeCol = '#ef4444';
    let hairCol = '#27170e';
    let helmetCol = null;

    if (skinId === 'firefighter') {
      jacketMain = '#ea580c';
      jacketDark = '#9a3412';
      stripeCol = '#fde047';
      pantsCol = '#1e293b';
      shoeCol = '#fbbf24';
      helmetCol = '#dc2626';
    } else if (skinId === 'safety_officer') {
      jacketMain = '#10b981';
      jacketDark = '#047857';
      stripeCol = '#fef08a';
      pantsCol = '#1e3a8a';
      shoeCol = '#38bdf8';
      helmetCol = '#f8fafc';
    } else if (skinId === 'master') {
      jacketMain = '#4f46e5';
      jacketDark = '#312e81';
      stripeCol = '#38bdf8';
      pantsCol = '#1e1b4b';
      shoeCol = '#f59e0b';
    } else if (skinId === 'npc') {
      jacketMain = '#14b8a6';
      jacketDark = '#0f766e';
      stripeCol = '#a7f3d0';
      pantsCol = '#334155';
      shoeCol = '#38bdf8';
      hairCol = '#3f2314';
    } else if (skinId === 'p2') {
      jacketMain = '#ec4899';
      jacketDark = '#be185d';
      stripeCol = '#fbcfe8';
      pantsCol = '#1e293b';
      shoeCol = '#f43f5e';
    }

    ctx.save();
    ctx.translate(footX, footY - bounce);

    // Posture kinematics (Standing vs Low Fire-Escape Crouch)
    const hipY = crouching ? -u * 0.30 : -u * 0.44;
    const hipX = crouching ? -facing * u * 0.06 : 0;
    const torsoLen = u * 0.28;
    const torsoLean = crouching ? facing * 0.46 : facing * (moving ? 0.10 : 0.04);
    const shoulderX = hipX + Math.sin(torsoLean) * torsoLen;
    const shoulderY = hipY - Math.cos(torsoLean) * torsoLen;
    const headX = shoulderX + facing * (crouching ? u * 0.05 : u * 0.02);
    const headY = shoulderY - u * 0.145;
    const headR = u * 0.125;
    const limbR = Math.max(2.2, u * 0.048);

    // 1. Back Leg (Thigh -> Knee -> Ankle -> Shoe)
    const backStep = -stride;
    const backKneeX = hipX + facing * (crouching ? u * 0.11 : u * 0.04) + backStep * u * 0.08;
    const backKneeY = crouching ? -u * 0.16 : -u * 0.23;
    const backFootX = hipX - facing * u * 0.04 + backStep * u * 0.13;
    const backFootY = -u * 0.03 + (backStep < 0 ? backStep * u * 0.03 : 0);

    drawLimbSegment(ctx, hipX, hipY, backKneeX, backKneeY, limbR, pantsBackCol, '#020617');
    drawLimbSegment(ctx, backKneeX, backKneeY, backFootX, backFootY, limbR * 0.88, pantsBackCol, '#020617');

    // Back Shoe
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.ellipse(backFootX + facing * u * 0.03, backFootY + u * 0.015, u * 0.065, u * 0.032, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Back Arm
    const backArmSwing = stride * 0.45;
    const backElbowX = shoulderX - facing * u * 0.04 + Math.sin(backArmSwing) * u * 0.10;
    const backElbowY = shoulderY + u * 0.12;
    const backHandX = backElbowX + facing * u * 0.06 + Math.sin(backArmSwing) * u * 0.08;
    const backHandY = backElbowY + u * 0.10;
    drawLimbSegment(ctx, shoulderX, shoulderY + u * 0.02, backElbowX, backElbowY, limbR * 0.82, jacketDark, '#0f172a');
    drawLimbSegment(ctx, backElbowX, backElbowY, backHandX, backHandY, limbR * 0.72, jacketDark, '#0f172a');
    ctx.fillStyle = '#fdba74';
    ctx.beginPath();
    ctx.arc(backHandX, backHandY, limbR * 0.75, 0, Math.PI * 2);
    ctx.fill();

    // 3. Articulated Human Torso (3D Shaded Jacket + Reflective Safety Stripe)
    ctx.save();
    ctx.translate(hipX, hipY);
    ctx.rotate(torsoLean);
    const torsoW = u * 0.21;
    const tGrad = ctx.createLinearGradient(-torsoW * 0.5, -torsoLen, torsoW * 0.5, 0);
    tGrad.addColorStop(0, jacketMain);
    tGrad.addColorStop(1, jacketDark);
    ctx.fillStyle = tGrad;
    ctx.beginPath();
    ctx.moveTo(-torsoW * 0.45, 0);
    ctx.lineTo(-torsoW * 0.56, -torsoLen * 0.92);
    ctx.quadraticCurveTo(0, -torsoLen * 1.06, torsoW * 0.56, -torsoLen * 0.92);
    ctx.lineTo(torsoW * 0.45, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = Math.max(1.2, u * 0.018);
    ctx.stroke();

    // High-visibility safety reflective stripes on torso
    ctx.fillStyle = stripeCol;
    ctx.fillRect(-torsoW * 0.48, -torsoLen * 0.44, torsoW * 0.96, torsoLen * 0.14);
    ctx.fillRect(-torsoW * 0.22, -torsoLen * 0.90, torsoW * 0.12, torsoLen * 0.48);
    ctx.fillRect(torsoW * 0.10, -torsoLen * 0.90, torsoW * 0.12, torsoLen * 0.48);

    // Belt
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-torsoW * 0.46, -torsoLen * 0.10, torsoW * 0.92, torsoLen * 0.10);
    ctx.restore();

    // 4. Front Leg (Thigh -> Knee -> Ankle -> Sneaker)
    const frontStep = stride;
    const frontKneeX = hipX + facing * (crouching ? u * 0.14 : u * 0.05) + frontStep * u * 0.09;
    const frontKneeY = crouching ? -u * 0.15 : -u * 0.22;
    const frontFootX = hipX + facing * u * 0.03 + frontStep * u * 0.14;
    const frontFootY = -u * 0.025 - (frontStep > 0 ? frontStep * u * 0.03 : 0);

    drawLimbSegment(ctx, hipX, hipY, frontKneeX, frontKneeY, limbR * 1.04, pantsCol, '#0f172a');
    drawLimbSegment(ctx, frontKneeX, frontKneeY, frontFootX, frontFootY, limbR * 0.92, pantsCol, '#0f172a');

    // Front Sneaker with white sole
    ctx.fillStyle = shoeCol;
    ctx.beginPath();
    ctx.ellipse(frontFootX + facing * u * 0.035, frontFootY + u * 0.01, u * 0.072, u * 0.036, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.2, u * 0.018);
    ctx.stroke();

    // 5. Human Neck, Head, Ears, Eyes, Hair/Helmet & Respiratory Protection
    // Neck
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(headX - u * 0.035, headY + headR * 0.65, u * 0.07, u * 0.065);

    // Head sphere with warm human skin shading
    const skinGrad = ctx.createRadialGradient(
      headX - facing * headR * 0.2, headY - headR * 0.25, headR * 0.15,
      headX, headY, headR
    );
    skinGrad.addColorStop(0, '#ffedd5');
    skinGrad.addColorStop(0.55, '#fed7aa');
    skinGrad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = skinGrad;
    ctx.beginPath();
    ctx.arc(headX, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = Math.max(1.1, u * 0.016);
    ctx.stroke();

    // Ear
    ctx.fillStyle = '#fdba74';
    ctx.beginPath();
    ctx.arc(headX - facing * headR * 0.78, headY + headR * 0.05, headR * 0.24, 0, Math.PI * 2);
    ctx.fill();

    // Hair or Safety Helmet (drawn around top of head so eyes & eyebrows are 100% visible!)
    if (helmetCol) {
      ctx.fillStyle = helmetCol;
      ctx.beginPath();
      ctx.arc(headX, headY - headR * 0.25, headR * 1.10, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = Math.max(1.5, u * 0.022);
      ctx.stroke();
      // Helmet brim
      ctx.fillStyle = '#facc15';
      ctx.fillRect(headX - headR * 1.22, headY - headR * 0.32, headR * 2.44, headR * 0.18);
    } else {
      ctx.fillStyle = hairCol;
      // Top crown hair cap (stays cleanly above eyebrows & forehead)
      ctx.beginPath();
      ctx.arc(headX - facing * headR * 0.06, headY - headR * 0.14, headR * 1.04, Math.PI * 1.12, Math.PI * 1.92);
      ctx.fill();
      // Back hair / sideburn on back side of head
      ctx.beginPath();
      ctx.ellipse(headX - facing * headR * 0.78, headY - headR * 0.12, headR * 0.28, headR * 0.52, -facing * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }

    // Expressive Human Eyes & Eyebrows
    const eyeCenterX = headX + facing * headR * 0.34;
    const eyeY = headY - headR * 0.02;
    const eyeOffset = headR * 0.26;

    // White sclera
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(eyeCenterX - eyeOffset * 0.5, eyeY, headR * 0.16, headR * 0.19, 0, 0, Math.PI * 2);
    ctx.ellipse(eyeCenterX + eyeOffset * 0.5, eyeY, headR * 0.16, headR * 0.19, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark pupils
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(eyeCenterX - eyeOffset * 0.5 + facing * headR * 0.04, eyeY, headR * 0.095, 0, Math.PI * 2);
    ctx.arc(eyeCenterX + eyeOffset * 0.5 + facing * headR * 0.04, eyeY, headR * 0.095, 0, Math.PI * 2);
    ctx.fill();

    // Eye catchlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeCenterX - eyeOffset * 0.5 - headR * 0.02, eyeY - headR * 0.05, headR * 0.04, 0, Math.PI * 2);
    ctx.arc(eyeCenterX + eyeOffset * 0.5 - headR * 0.02, eyeY - headR * 0.05, headR * 0.04, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows
    ctx.strokeStyle = hairCol;
    ctx.lineWidth = Math.max(1.3, u * 0.020);
    ctx.beginPath();
    ctx.moveTo(eyeCenterX - eyeOffset * 0.9, eyeY - headR * 0.24);
    ctx.lineTo(eyeCenterX - eyeOffset * 0.15, eyeY - headR * 0.27);
    ctx.moveTo(eyeCenterX + eyeOffset * 0.15, eyeY - headR * 0.27);
    ctx.lineTo(eyeCenterX + eyeOffset * 0.9, eyeY - headR * 0.24);
    ctx.stroke();

    // Blush, Nose & Mouth (visible when not covered by towel/mask)
    if (!wetTowel && !hasTowel && !hasMask) {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.32)';
      ctx.beginPath();
      ctx.arc(headX + facing * headR * 0.08, headY + headR * 0.20, headR * 0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = Math.max(1.2, u * 0.016);
      ctx.beginPath();
      ctx.arc(headX + facing * headR * 0.30, headY + headR * 0.30, headR * 0.16, 0.15, Math.PI - 0.15);
      ctx.stroke();
    }

    // 3D Gas Mask worn on face
    if (hasMask) {
      const mx = headX + facing * headR * 0.36;
      const my = headY + headR * 0.32;
      ctx.fillStyle = '#0f766e';
      ctx.beginPath();
      ctx.ellipse(mx, my, headR * 0.58, headR * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5eead4';
      ctx.lineWidth = Math.max(1.2, u * 0.018);
      ctx.stroke();
      // Filter cartridge
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(mx + facing * headR * 0.35, my + headR * 0.08, headR * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Front Arm + Held Wet Towel on Mouth/Nose OR Held Rescue Tool
    let frontElbowX, frontElbowY, frontHandX, frontHandY;
    if ((wetTowel || hasTowel) && !hasMask) {
      // Realistic Fire-Safety Posture: Front hand holds the Wet Towel right over nose & mouth!
      frontElbowX = shoulderX + facing * u * 0.13;
      frontElbowY = shoulderY + u * 0.06;
      frontHandX = headX + facing * headR * 0.48;
      frontHandY = headY + headR * 0.34;
    } else {
      const frontSwing = -stride * 0.45;
      frontElbowX = shoulderX + facing * u * 0.06 + Math.sin(frontSwing) * u * 0.10;
      frontElbowY = shoulderY + u * 0.12;
      frontHandX = frontElbowX + facing * u * 0.11 + Math.sin(frontSwing) * u * 0.08;
      frontHandY = frontElbowY + u * 0.06;
    }

    drawLimbSegment(ctx, shoulderX, shoulderY + u * 0.03, frontElbowX, frontElbowY, limbR * 0.88, jacketMain, '#0f172a');
    drawLimbSegment(ctx, frontElbowX, frontElbowY, frontHandX, frontHandY, limbR * 0.78, jacketMain, '#0f172a');

    // Folded Cloth Towel held across nose & mouth
    if ((wetTowel || hasTowel) && !hasMask) {
      ctx.fillStyle = wetTowel ? '#38bdf8' : '#facc15';
      ctx.strokeStyle = wetTowel ? '#bae6fd' : '#fef08a';
      ctx.lineWidth = Math.max(1.2, u * 0.018);
      const twW = headR * 1.15;
      const twH = headR * 0.68;
      ctx.fillRect(frontHandX - twW * 0.55, frontHandY - twH * 0.55, twW, twH);
      ctx.strokeRect(frontHandX - twW * 0.55, frontHandY - twH * 0.55, twW, twH);
      if (wetTowel) {
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.arc(frontHandX + facing * headR * 0.35, frontHandY + headR * 0.45, headR * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Human Hand
    ctx.fillStyle = '#fed7aa';
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(frontHandX, frontHandY, limbR * 0.82, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 7. Render 3D Equipped Tool (Extinguisher, Axe, Bucket, Flashlight, Key)
    const toolAnchorX = ((wetTowel || hasTowel) && !hasMask) ? backHandX + facing * u * 0.14 : frontHandX + facing * u * 0.08;
    const toolAnchorY = ((wetTowel || hasTowel) && !hasMask) ? backHandY : frontHandY;

    if (rightTool === 'extinguisher') {
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.2;
      ctx.fillRect(toolAnchorX - u * 0.05, toolAnchorY - u * 0.08, u * 0.10, u * 0.20);
      ctx.strokeRect(toolAnchorX - u * 0.05, toolAnchorY - u * 0.08, u * 0.10, u * 0.20);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(toolAnchorX - u * 0.03, toolAnchorY - u * 0.12, u * 0.06, u * 0.04);
    } else if (rightTool === 'axe') {
      ctx.save();
      ctx.translate(toolAnchorX, toolAnchorY);
      ctx.rotate(facing * 0.35);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-u * 0.02, -u * 0.18, u * 0.04, u * 0.26);
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(0, -u * 0.17);
      ctx.lineTo(facing * u * 0.13, -u * 0.22);
      ctx.lineTo(facing * u * 0.13, -u * 0.09);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = Math.max(1.5, u * 0.02);
      ctx.stroke();
      ctx.restore();
    } else if (rightTool === 'bucket') {
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1.2;
      ctx.fillRect(toolAnchorX - u * 0.06, toolAnchorY - u * 0.02, u * 0.12, u * 0.13);
      ctx.strokeRect(toolAnchorX - u * 0.06, toolAnchorY - u * 0.02, u * 0.12, u * 0.13);
    } else if (rightTool === 'flashlight') {
      ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
      ctx.beginPath();
      ctx.moveTo(toolAnchorX, toolAnchorY);
      ctx.lineTo(toolAnchorX + facing * u * 0.55, toolAnchorY - u * 0.22);
      ctx.lineTo(toolAnchorX + facing * u * 0.55, toolAnchorY + u * 0.22);
      ctx.closePath();
      ctx.fill();
    }

    if (onFire) {
      ctx.fillStyle = 'rgba(249, 115, 22, 0.55)';
      ctx.beginPath();
      ctx.arc(0, -u * 0.45, u * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // --- Helper: 3D Over-the-Shoulder / Back-3/4 Articulated Human Renderer for 1st-Person 3D Walkthrough ---
  function drawHumanCharacter3DWalk(ctx, footX, footY, charHeight, opts = {}) {
    const {
      crouching = false,
      moving = false,
      walkPhase = 0,
      turnBias = 0,
      skinId = 'student',
      wetTowel = false,
      hasTowel = false,
      hasMask = false,
      rightTool = 'none',
      onFire = false
    } = opts;

    const u = Math.max(28, charHeight);
    const stride = moving ? Math.sin(walkPhase) : Math.sin(walkPhase) * 0.08;
    const strideCos = moving ? Math.cos(walkPhase) : 0;
    const bounce = moving ? Math.abs(stride) * (u * 0.042) : 0;
    const hipSwayX = strideCos * (u * 0.028) + turnBias * (u * 0.035);
    const shoulderTwistX = -stride * (u * 0.032) + turnBias * (u * 0.065);

    let jacketMain = '#2563eb';
    let jacketDark = '#1d4ed8';
    let stripeCol = '#facc15';
    let pantsCol = '#1e293b';
    let pantsBackCol = '#0f172a';
    let shoeCol = '#ef4444';
    let hairCol = '#27170e';
    let helmetCol = null;

    if (skinId === 'firefighter') {
      jacketMain = '#ea580c';
      jacketDark = '#9a3412';
      stripeCol = '#fde047';
      pantsCol = '#1e293b';
      shoeCol = '#fbbf24';
      helmetCol = '#dc2626';
    } else if (skinId === 'safety_officer') {
      jacketMain = '#10b981';
      jacketDark = '#047857';
      stripeCol = '#fef08a';
      pantsCol = '#1e3a8a';
      shoeCol = '#38bdf8';
      helmetCol = '#f8fafc';
    } else if (skinId === 'master') {
      jacketMain = '#4f46e5';
      jacketDark = '#312e81';
      stripeCol = '#38bdf8';
      pantsCol = '#1e1b4b';
      shoeCol = '#f59e0b';
    } else if (skinId === 'npc') {
      jacketMain = '#14b8a6';
      jacketDark = '#0f766e';
      stripeCol = '#a7f3d0';
      pantsCol = '#334155';
      shoeCol = '#38bdf8';
      hairCol = '#3f2314';
    }

    ctx.save();
    ctx.translate(footX, footY);

    const hipSpan = u * 0.082;
    const hipCenterY = (crouching ? -u * 0.31 : -u * 0.45) - bounce;
    const torsoLen = crouching ? u * 0.24 : u * 0.29;
    const shoulderCenterX = hipSwayX + shoulderTwistX;
    const shoulderCenterY = hipCenterY - torsoLen;
    const shoulderSpan = u * 0.135;
    const limbR = Math.max(2.6, u * 0.052);

    // 1. Left & Right Legs Stepping Into 3D Depth (leftDepth > 0 means stepping forward into the corridor)
    const leftDepth = stride;
    const rightDepth = -stride;

    function computeLeg3D(sideSign, depthVal) {
      const hipX = hipSwayX + sideSign * hipSpan;
      const hipY = hipCenterY;
      // Forward step (depthVal > 0) moves foot UP into the 3D floor (negative Y) and slightly inward in perspective
      const fX = hipX + sideSign * (crouching ? u * 0.03 : u * 0.01) + turnBias * depthVal * (u * 0.05);
      const liftY = depthVal < 0 ? Math.abs(depthVal) * (u * 0.055) : 0;
      const depthShiftY = -depthVal * (u * 0.11);
      const fY = depthShiftY - liftY;
      const kneeX = (hipX + fX) * 0.5 + sideSign * (crouching ? u * 0.055 : u * 0.018);
      const kneeY = (hipY + fY) * 0.5 + (crouching ? u * 0.04 : 0) - (depthVal > 0 ? depthVal * u * 0.04 : 0);
      return { sideSign, depthVal, hipX, hipY, kneeX, kneeY, fX, fY, liftY };
    }

    const leftLeg = computeLeg3D(-1, leftDepth);
    const rightLeg = computeLeg3D(1, rightDepth);

    // Draw natural 3D floor contact shadow directly under each individual shoe on the floor tile
    for (const lg of [leftLeg, rightLeg]) {
      const shadowScale = Math.max(0.55, 1 - lg.liftY / (u * 0.12));
      ctx.fillStyle = 'rgba(2, 6, 23, 0.52)';
      ctx.beginPath();
      ctx.ellipse(
        lg.fX,
        -lg.depthVal * (u * 0.11) + u * 0.02,
        u * 0.075 * shadowScale,
        u * 0.032 * shadowScale,
        0, 0, Math.PI * 2
      );
      ctx.fill();
    }

    // Sort legs back-to-front (farther leg in 3D corridor drawn first, closer leg drawn second)
    const legsSorted = leftLeg.depthVal >= rightLeg.depthVal ? [leftLeg, rightLeg] : [rightLeg, leftLeg];
    for (const lg of legsSorted) {
      const legCol = lg.depthVal > 0.15 ? pantsBackCol : pantsCol;
      const scalePersp = 1 - lg.depthVal * 0.08;
      drawLimbSegment(ctx, lg.hipX, lg.hipY, lg.kneeX, lg.kneeY, limbR * scalePersp, legCol, '#020617');
      drawLimbSegment(ctx, lg.kneeX, lg.kneeY, lg.fX, lg.fY, limbR * 0.90 * scalePersp, legCol, '#020617');

      // 3D Sneaker (shows white rubber sole tread when foot kicks back toward camera!)
      ctx.fillStyle = shoeCol;
      ctx.beginPath();
      ctx.ellipse(lg.fX + turnBias * u * 0.018, lg.fY + u * 0.01, u * 0.066 * scalePersp, u * 0.036 * scalePersp, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.3, u * 0.018);
      ctx.stroke();

      if (lg.depthVal < -0.15 && moving) {
        // Raised sneaker sole facing the camera during push-off stride
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(lg.fX, lg.fY + u * 0.018, u * 0.052, u * 0.026, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Forward-Swinging Arm (drawn behind torso in 3D depth)
    function drawArm3D(sideSign, armDepth) {
      const shX = shoulderCenterX + sideSign * shoulderSpan;
      const shY = shoulderCenterY + u * 0.03;
      let elX, elY, hdX, hdY;
      if (sideSign === -1 && (wetTowel || hasTowel) && !hasMask) {
        // Left hand holds wet towel up to mouth/nose
        elX = shX - u * 0.06;
        elY = shY + u * 0.07;
        hdX = shoulderCenterX + (turnBias < 0 ? -u * 0.08 : u * 0.04);
        hdY = shoulderCenterY - u * 0.08;
      } else {
        elX = shX + sideSign * u * 0.03 + turnBias * armDepth * u * 0.04;
        elY = shY + u * 0.11 - armDepth * u * 0.05;
        hdX = elX + sideSign * u * 0.02 + turnBias * u * 0.03;
        hdY = elY + u * 0.09 - armDepth * u * 0.06;
      }
      const armCol = armDepth > 0 ? jacketDark : jacketMain;
      drawLimbSegment(ctx, shX, shY, elX, elY, limbR * 0.82, armCol, '#0f172a');
      drawLimbSegment(ctx, elX, elY, hdX, hdY, limbR * 0.74, armCol, '#0f172a');
      ctx.fillStyle = '#fed7aa';
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hdX, hdY, limbR * 0.76, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return { hdX, hdY };
    }

    const leftArmDepth = -leftDepth;
    const rightArmDepth = -rightDepth;
    if (leftArmDepth >= 0) drawArm3D(-1, leftArmDepth);
    if (rightArmDepth >= 0) drawArm3D(1, rightArmDepth);

    // 3. 3D Torso, Safety Vest Reflective H-Stripes & Contoured Backpack
    ctx.save();
    const torsoGrad = ctx.createLinearGradient(shoulderCenterX - shoulderSpan, shoulderCenterY, shoulderCenterX + shoulderSpan, hipCenterY);
    torsoGrad.addColorStop(0, jacketMain);
    torsoGrad.addColorStop(1, jacketDark);
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.moveTo(hipSwayX - hipSpan * 1.18, hipCenterY + u * 0.02);
    ctx.lineTo(shoulderCenterX - shoulderSpan * 1.05, shoulderCenterY + u * 0.02);
    ctx.quadraticCurveTo(shoulderCenterX, shoulderCenterY - u * 0.03, shoulderCenterX + shoulderSpan * 1.05, shoulderCenterY + u * 0.02);
    ctx.lineTo(hipSwayX + hipSpan * 1.18, hipCenterY + u * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = Math.max(1.3, u * 0.018);
    ctx.stroke();

    // High-visibility safety vest reflective stripes across back & shoulders
    ctx.fillStyle = stripeCol;
    const midTorsoX = (hipSwayX + shoulderCenterX) * 0.5;
    const midTorsoY = (hipCenterY + shoulderCenterY) * 0.5;
    ctx.fillRect(midTorsoX - shoulderSpan * 0.88, midTorsoY, shoulderSpan * 1.76, u * 0.036);
    ctx.fillRect(shoulderCenterX - shoulderSpan * 0.55, shoulderCenterY + u * 0.02, u * 0.032, torsoLen * 0.55);
    ctx.fillRect(shoulderCenterX + shoulderSpan * 0.55 - u * 0.032, shoulderCenterY + u * 0.02, u * 0.032, torsoLen * 0.55);

    // Contoured 3D Backpack / Oxygen Tank on back (shifts oppositely to turnBias for 3D parallax!)
    const packX = midTorsoX - turnBias * u * 0.035;
    const packY = midTorsoY - u * 0.02;
    const packW = u * 0.16;
    const packH = torsoLen * 0.68;
    ctx.fillStyle = skinId === 'firefighter' ? '#f59e0b' : '#1e293b';
    ctx.strokeStyle = skinId === 'firefighter' ? '#fef08a' : '#475569';
    ctx.lineWidth = 1.4;
    ctx.fillRect(packX - packW * 0.5, packY - packH * 0.45, packW, packH);
    ctx.strokeRect(packX - packW * 0.5, packY - packH * 0.45, packW, packH);
    ctx.fillStyle = stripeCol;
    ctx.fillRect(packX - packW * 0.36, packY - packH * 0.12, packW * 0.72, u * 0.024);
    ctx.restore();

    // 4. Backward-Swinging Arm (closer to camera, drawn in front of torso) + Equipped 3D Tool
    if (leftArmDepth < 0) drawArm3D(-1, leftArmDepth);
    let rightHandPos = { hdX: shoulderCenterX + shoulderSpan, hdY: shoulderCenterY + u * 0.18 };
    if (rightArmDepth < 0) {
      rightHandPos = drawArm3D(1, rightArmDepth);
    }

    if (rightTool === 'extinguisher') {
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.2;
      ctx.fillRect(rightHandPos.hdX - u * 0.045, rightHandPos.hdY - u * 0.05, u * 0.09, u * 0.18);
      ctx.strokeRect(rightHandPos.hdX - u * 0.045, rightHandPos.hdY - u * 0.05, u * 0.09, u * 0.18);
    } else if (rightTool === 'axe') {
      ctx.fillStyle = '#92400e';
      ctx.fillRect(rightHandPos.hdX - u * 0.018, rightHandPos.hdY - u * 0.16, u * 0.036, u * 0.24);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(rightHandPos.hdX - u * 0.01, rightHandPos.hdY - u * 0.16, u * 0.11, u * 0.08);
    } else if (rightTool === 'bucket') {
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#bae6fd';
      ctx.fillRect(rightHandPos.hdX - u * 0.055, rightHandPos.hdY - u * 0.01, u * 0.11, u * 0.12);
      ctx.strokeRect(rightHandPos.hdX - u * 0.055, rightHandPos.hdY - u * 0.01, u * 0.11, u * 0.12);
    }

    // 5. Neck, Head, Ears, Hair/Safety Helmet & 3/4 Turn Facial Profile
    const headX = shoulderCenterX + turnBias * u * 0.035;
    const headY = shoulderCenterY - u * 0.135;
    const headR = u * 0.122;

    // Neck
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(headX - u * 0.035, headY + headR * 0.62, u * 0.07, u * 0.065);

    // Left & Right Ears
    ctx.fillStyle = '#fdba74';
    ctx.beginPath();
    ctx.arc(headX - headR * 0.92, headY + headR * 0.06, headR * 0.22, 0, Math.PI * 2);
    ctx.arc(headX + headR * 0.92, headY + headR * 0.06, headR * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Head Sphere
    ctx.fillStyle = '#fed7aa';
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = Math.max(1.1, u * 0.016);
    ctx.beginPath();
    ctx.arc(headX, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // When turning left or right (or holding wet towel), show 3/4 cheek, eye & towel/mask on the turned side!
    const profileDir = Math.abs(turnBias) > 0.12 ? Math.sign(turnBias) : 1;
    const profileAmount = Math.max(0.35, Math.min(1, Math.abs(turnBias) + 0.35));
    const eyeX = headX + profileDir * headR * (0.52 * profileAmount + 0.22);
    const eyeY = headY - headR * 0.04;

    // Back/Crown Hair or Safety Helmet (leaves side 3/4 face visible when turning)
    if (helmetCol) {
      ctx.fillStyle = helmetCol;
      ctx.beginPath();
      ctx.arc(headX, headY - headR * 0.12, headR * 1.08, Math.PI * 0.85, Math.PI * 2.15);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.fillRect(headX - headR * 1.12, headY - headR * 0.18, headR * 2.24, headR * 0.16);
    } else {
      ctx.fillStyle = hairCol;
      ctx.beginPath();
      // Full natural hair on back of head, shifted slightly away from the turned face side
      ctx.arc(headX - profileDir * headR * 0.16, headY - headR * 0.06, headR * 0.96, 0, Math.PI * 2);
      ctx.fill();
      // Top hair crown
      ctx.beginPath();
      ctx.arc(headX, headY - headR * 0.18, headR * 1.02, Math.PI * 1.05, Math.PI * 1.95);
      ctx.fill();
    }

    // 3/4 Profile Eye & Eyebrow on the side the character is looking toward
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, headR * 0.14, headR * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(eyeX + profileDir * headR * 0.04, eyeY, headR * 0.085, 0, Math.PI * 2);
    ctx.fill();

    // Wet Towel or Mask visible on the 3/4 cheek/mouth
    if (wetTowel || hasTowel || hasMask) {
      ctx.fillStyle = hasMask ? '#0f766e' : (wetTowel ? '#38bdf8' : '#facc15');
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 1.2;
      const maskX = headX + profileDir * headR * 0.55;
      const maskY = headY + headR * 0.28;
      ctx.fillRect(maskX - headR * 0.36, maskY - headR * 0.24, headR * 0.72, headR * 0.48);
      ctx.strokeRect(maskX - headR * 0.36, maskY - headR * 0.24, headR * 0.72, headR * 0.48);
    }

    if (onFire) {
      ctx.fillStyle = 'rgba(249, 115, 22, 0.55)';
      ctx.beginPath();
      ctx.arc(0, -u * 0.45, u * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // --- 3D Architectural Interior Helpers (3D Beds, Desks, Wardrobes, Washbasins, Doors & Exit Portals) ---
  function draw3DFurniturePiece(ctx, x, y, tileSize, wallH, r, c) {
    const kind = (r + c * 3) % 3;
    if (kind === 0) {
      // 3D Bedroom Bed (Wooden Frame + Headboard + White Pillow + Quilted Blue Blanket)
      const bedW = tileSize * 0.84;
      const bedD = tileSize * 0.78;
      const bx = x + tileSize * 0.08;
      const by = y + tileSize * 0.14;
      const frameH = tileSize * 0.24;
      // Headboard at back (north edge)
      draw3DBox(ctx, bx, by, bedW, tileSize * 0.18, wallH * 0.58, '#92400e', '#78350f', '#451a03', '#b45309');
      // Mattress base
      draw3DBox(ctx, bx, by + tileSize * 0.12, bedW, bedD * 0.85, frameH, '#f8fafc', '#cbd5e1', '#64748b', '#94a3b8');
      // Quilted Blanket (covering lower 65% of mattress)
      draw3DBox(ctx, bx + 2, by + tileSize * 0.34, bedW - 4, bedD * 0.56, frameH + 2, '#3b82f6', '#1d4ed8', '#1e3a8a', '#93c5fd');
      // Fluffy White Pillow near headboard
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.fillRect(bx + bedW * 0.18, by - frameH + tileSize * 0.16, bedW * 0.64, tileSize * 0.15);
      ctx.strokeRect(bx + bedW * 0.18, by - frameH + tileSize * 0.16, bedW * 0.64, tileSize * 0.15);
    } else if (kind === 1) {
      // 3D Wooden Study Desk with Monitor & Escape-Room Digital Safe (🔐 614)
      const dw = tileSize * 0.84;
      const dd = tileSize * 0.72;
      const dx = x + tileSize * 0.08;
      const dy = y + tileSize * 0.14;
      const dh = tileSize * 0.34;
      draw3DBox(ctx, dx, dy, dw, dd, dh, '#d97706', '#92400e', '#451a03', '#fcd34d');
      // 3D Digital Safe & Monitor on desk top
      draw3DBox(ctx, dx + dw * 0.14, dy + dd * 0.14, dw * 0.38, dd * 0.32, tileSize * 0.42, '#475569', '#1e293b', '#0f172a', '#fde047');
      draw3DBox(ctx, dx + dw * 0.56, dy + dd * 0.12, dw * 0.32, dd * 0.28, tileSize * 0.44, '#38bdf8', '#0f172a', '#1e293b', '#7dd3fc');
      ctx.font = `bold ${Math.max(8, Math.floor(tileSize * 0.17))}px "Noto Sans KR", sans-serif`;
      ctx.fillStyle = safeSolved ? '#4ade80' : '#fde047';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(safeSolved ? '🔓금고해제' : '🔐금고·614', x + tileSize * 0.5, y + tileSize * 0.78);
    } else {
      // 3D Wooden Archive Bookshelf & Direction-Lock Cabinet with Double Doors
      const cw = tileSize * 0.82;
      const cd = tileSize * 0.74;
      const cx = x + tileSize * 0.09;
      const cy = y + tileSize * 0.14;
      const ch = wallH * 0.68;
      draw3DBox(ctx, cx, cy, cw, cd, ch, '#b45309', '#78350f', '#451a03', '#f59e0b');
      // Double cabinet door seam & brass handles
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + cw * 0.5, cy + cd * 0.55 - ch + 4);
      ctx.lineTo(cx + cw * 0.5, cy + cd - 3);
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.fillRect(cx + cw * 0.42, cy + cd * 0.55 - ch * 0.45, 2.5, 5);
      ctx.fillRect(cx + cw * 0.55, cy + cd * 0.55 - ch * 0.45, 2.5, 5);
      ctx.font = `bold ${Math.max(8, Math.floor(tileSize * 0.17))}px "Noto Sans KR", sans-serif`;
      ctx.fillStyle = (bookSortSolved && dirLockSolved) ? '#4ade80' : '#a78bfa';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((bookSortSolved && dirLockSolved) ? '📚보관함해제' : '📚서가·🧭자물쇠', x + tileSize * 0.5, y + tileSize * 0.78);
    }
  }

  function draw3DSinkFixture(ctx, x, y, tileSize, wallH) {
    const sx = x + tileSize * 0.08;
    const sy = y + tileSize * 0.14;
    const sw = tileSize * 0.84;
    const sd = tileSize * 0.74;
    const sh = tileSize * 0.38;
    // 3D Porcelain Vanity Counter
    draw3DBox(ctx, sx, sy, sw, sd, sh, '#e0f2fe', '#0284c7', '#0369a1', '#7dd3fc');
    // Recessed Blue Water Basin on Top Face
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.fillRect(sx + sw * 0.16, sy - sh + sd * 0.12, sw * 0.68, sd * 0.38);
    ctx.strokeRect(sx + sw * 0.16, sy - sh + sd * 0.12, sw * 0.68, sd * 0.38);
    // Wall Mirror & Chrome Faucet
    ctx.fillStyle = '#bae6fd';
    ctx.strokeStyle = '#38bdf8';
    ctx.fillRect(sx + sw * 0.22, sy - sh - wallH * 0.36, sw * 0.56, wallH * 0.32);
    ctx.strokeRect(sx + sw * 0.22, sy - sh - wallH * 0.36, sw * 0.56, wallH * 0.32);
    ctx.font = `bold ${Math.max(10, Math.floor(tileSize * 0.19))}px "Noto Sans KR", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚰세면대', x + tileSize * 0.5, y + tileSize * 0.76);
  }

  function draw3DDoorway(ctx, x, y, tileSize, wallH, t, now) {
    const dh = wallH * 0.92;
    if (t === TILE.OPEN_DOOR) {
      // Threshold plate on floor
      ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
      ctx.fillRect(x + tileSize * 0.08, y + tileSize * 0.10, tileSize * 0.84, tileSize * 0.80);
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + tileSize * 0.08, y + tileSize * 0.10, tileSize * 0.84, tileSize * 0.80);
      // Left & Right 3D Door Jamb Pillars
      draw3DBox(ctx, x + tileSize * 0.04, y + tileSize * 0.08, tileSize * 0.14, tileSize * 0.82, dh, '#fbbf24', '#78350f', '#451a03', '#fde68a');
      draw3DBox(ctx, x + tileSize * 0.82, y + tileSize * 0.08, tileSize * 0.14, tileSize * 0.82, dh, '#fbbf24', '#78350f', '#451a03', '#fde68a');
      // Swung-open 3D door leaf resting against left jamb
      draw3DBox(ctx, x + tileSize * 0.14, y + tileSize * 0.06, tileSize * 0.18, tileSize * 0.76, dh * 0.88, '#f59e0b', '#92400e', '#451a03', '#fef08a');
      ctx.fillStyle = '#6ee7b7';
      ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.17))}px "Noto Sans KR", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('열린문(통과)', x + tileSize * 0.53, y + tileSize * 0.52);
      return;
    }

    const pulse = t === TILE.HOT_DOOR ? (0.65 + 0.35 * Math.sin(now * 3.5)) : 1;
    const topCol = t === TILE.LOCKED_DOOR ? '#eab308' : (t === TILE.HOT_DOOR ? '#ef4444' : '#d97706');
    const frontCol = t === TILE.LOCKED_DOOR ? '#854d0e' : (t === TILE.HOT_DOOR ? `rgba(185, 28, 28, ${pulse})` : '#92400e');
    const strokeCol = t === TILE.LOCKED_DOOR ? '#fef08a' : (t === TILE.HOT_DOOR ? '#fca5a5' : '#fcd34d');

    const dx = x + tileSize * 0.06;
    const dy = y + tileSize * 0.14;
    const dw = tileSize * 0.88;
    const dd = tileSize * 0.74;

    draw3DBox(ctx, dx, dy, dw, dd, dh, topCol, frontCol, '#451a03', strokeCol);

    // Recessed architectural door panels & doorknob
    const frontTopY = dy + dd * 0.55 - dh;
    const frontH = dh + dd * 0.45;
    ctx.strokeStyle = 'rgba(254, 243, 199, 0.42)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(dx + dw * 0.14, frontTopY + frontH * 0.12, dw * 0.72, frontH * 0.34);
    ctx.strokeRect(dx + dw * 0.14, frontTopY + frontH * 0.54, dw * 0.72, frontH * 0.34);

    // Glowing Brass Door Handle
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(dx + dw * 0.78, frontTopY + frontH * 0.50, Math.max(2.5, tileSize * 0.055), 0, Math.PI * 2);
    ctx.fill();

    const doorIcon = t === TILE.LOCKED_DOOR ? '🔒' : (t === TILE.HOT_DOOR ? '🌡️🔥' : '🚪');
    const doorLabel = t === TILE.LOCKED_DOOR ? '잠긴문(열쇠)' : (t === TILE.HOT_DOOR ? '고온위험문' : '방문(열기)');
    ctx.font = `${Math.floor(tileSize * 0.30)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(doorIcon, x + tileSize * 0.5, frontTopY + frontH * 0.32);
    ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.17))}px "Noto Sans KR", sans-serif`;
    ctx.fillStyle = '#fef9c3';
    ctx.fillText(doorLabel, x + tileSize * 0.5, y + tileSize * 0.78);
  }

  function draw3DExitPortal(ctx, x, y, tileSize, wallH, now) {
    const glow = 0.75 + 0.25 * Math.sin(now * 2.8);
    const eh = wallH * 0.96;
    // Glowing green emergency exit stairwell floor pad
    ctx.fillStyle = `rgba(16, 185, 129, ${0.35 * glow})`;
    ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
    draw3DBox(
      ctx,
      x + tileSize * 0.04,
      y + tileSize * 0.08,
      tileSize * 0.92,
      tileSize * 0.84,
      eh,
      '#34d399',
      `rgba(5, 150, 105, ${glow})`,
      '#064e3b',
      '#a7f3d0'
    );
    // Illuminated Green Emergency Exit Sign Box above Doorway
    const signW = tileSize * 0.78;
    const signH = Math.max(14, tileSize * 0.28);
    const signX = x + (tileSize - signW) * 0.5;
    const signY = y - eh + 3;
    ctx.fillStyle = '#ecfdf5';
    ctx.fillRect(signX, signY, signW, signH);
    ctx.fillStyle = '#059669';
    ctx.fillRect(signX + 2, signY + 2, signW - 4, signH - 4);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.max(10, Math.floor(tileSize * 0.20))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏃 EXIT 비상구', x + tileSize * 0.5, signY + signH * 0.52);
  }

  function draw3DRadarMinimapOverlay(ctx, width, height, nextObj) {
    const mapW = Math.min(165, Math.max(115, width * 0.22));
    const mapH = mapW * (ROWS / COLS);
    const mapX = width - mapW - 10;
    const mapY = 10;
    const mtw = mapW / COLS;
    const mth = mapH / ROWS;

    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.90)';
    ctx.fillRect(mapX - 4, mapY - 4, mapW + 8, mapH + 22);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mapX - 4, mapY - 4, mapW + 8, mapH + 22);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = grid[r][c];
        if (t === TILE.WALL) ctx.fillStyle = '#64748b';
        else if (t === TILE.EXIT) ctx.fillStyle = '#10b981';
        else if (t === TILE.LOCKED_DOOR) ctx.fillStyle = '#eab308';
        else if (t === TILE.DOOR) ctx.fillStyle = '#d97706';
        else if (t === TILE.OPEN_DOOR) ctx.fillStyle = '#059669';
        else if (t === TILE.DEBRIS) ctx.fillStyle = '#ea580c';
        else if (t === TILE.FURNITURE) ctx.fillStyle = '#92400e';
        else ctx.fillStyle = '#1e293b';
        ctx.fillRect(mapX + c * mtw, mapY + r * mth, mtw - 0.4, mth - 0.4);
      }
    }
    if (nextObj) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mapX + player.x * mtw, mapY + player.y * mth);
      ctx.lineTo(mapX + (nextObj.c + 0.5) * mtw, mapY + (nextObj.r + 0.5) * mth);
      ctx.stroke();
    }
    const mpx = mapX + player.x * mtw;
    const mpy = mapY + player.y * mth;
    // Draw 3D Camera FOV Cone on Radar Minimap
    ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.beginPath();
    ctx.moveTo(mpx, mpy);
    ctx.arc(mpx, mpy, mtw * 2.8, fpsCamYaw - 0.42, fpsCamYaw + 0.42);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mpx, mpy, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e0e7ff';
    ctx.font = 'bold 10px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🗺️ 3D 레이더 지도 (터치이동)', mapX + mapW / 2, mapY + mapH + 12);
    ctx.restore();

    // Bottom-Left 1st-Person 3D Walkthrough Status Badge (Never overlaps top toast banner!)
    const gearSummary = player.wetTowel
      ? '🧣젖은수건 착용'
      : (player.hasMask ? '😷방연마스크 착용' : (player.hasTowel ? '🧣수건 보유' : '▲전진·▼후진·◀▶회전'));
    ctx.save();
    const badgeY = height - 34;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(10, badgeY, 275, 24);
    ctx.strokeRect(10, badgeY, 275, 24);
    ctx.fillStyle = '#e0e7ff';
    ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`👁️ 1인칭 3D 탈출뷰 (${player.crouching ? '🧎낮은자세' : '🚶서있음'} · ${gearSummary})`, 18, badgeY + 12);
    ctx.restore();
  }

  // --- True 1st-Person / Over-the-Shoulder 3D Perspective Building Escape Engine ('FPS_3D') ---
  // Incorporates ESCAPE PRD v1.0 F05, F06, Section 5 & Section 9:
  // 1) Exact 3D Near-Plane Sutherland-Hodgman Polygon Clipping (zero missing floor tiles, zero giant exploding polygons)
  // 2) Per-Column Z-Buffer Occlusion Clipping for 3D Multi-Part Furniture & Escape-Room Puzzle Stations
  // 3) Dynamic Distance Attenuation, 3D Flashlight Spotlight Cone (F), Fire Point-Lights & Wall Architecture
  // 4) Center Raycast Reticle (⌖) with Real-Time Target Name, Distance (m) & Required Action HUD
  // 5) 1st-Person 3D Held Equipment (Flashlight / Wet Towel / Extinguisher / Axe) + Ground-Locked 3D Avatar
  let flashlightSpotEnabled = true;

  function renderFirstPerson3D(width, height, now, st) {
    const fov = Math.PI * 0.44;
    const tanHalfFov = Math.tan(fov * 0.5);
    const cosYaw = Math.cos(fpsCamYaw);
    const sinYaw = Math.sin(fpsCamYaw);

    // Position 3D camera eye slightly behind the player inside open room space (never inside a wall)
    let camWorldX = player.x;
    let camWorldY = player.y;
    for (let d = 0.06; d <= 0.54; d += 0.06) {
      const tx = player.x - cosYaw * d;
      const ty = player.y - sinYaw * d;
      if (canMoveTo(tx, ty, 0.16)) {
        camWorldX = tx;
        camWorldY = ty;
      } else {
        break;
      }
    }

    const reduceMot = !!(appSettings && appSettings.reduceMotion);
    const brightMul = Math.max(0.75, Math.min(1.85, ((appSettings && appSettings.brightness) || 100) / 100));
    const camEyeZ = player.crouching ? 0.32 : 0.50;
    const walkBobY = reduceMot ? 0 : Math.sin(fpsWalkPhase * 2) * (fpsForwardSurge * 1.6);
    const horizon = (player.crouching ? height * 0.39 : height * 0.44) + walkBobY;
    const vertScale = height * 0.74;
    const halfW = width * 0.5;

    function toCamSpace(wx, wy, wz = 0) {
      const dx = wx - camWorldX;
      const dy = wy - camWorldY;
      return {
        right: -dx * sinYaw + dy * cosYaw,
        up: wz - camEyeZ,
        depth: dx * cosYaw + dy * sinYaw
      };
    }

    function projectCamPoint(cp) {
      const d = Math.max(0.08, cp.depth);
      return {
        x: halfW + (cp.right / (d * tanHalfFov)) * halfW,
        y: horizon - (cp.up * vertScale) / d,
        depth: d
      };
    }

    function project3DPoint(wx, wy, wz = 0, minDepth = 0.12) {
      const cp = toCamSpace(wx, wy, wz);
      if (cp.depth <= minDepth) return null;
      return projectCamPoint(cp);
    }

    // Sutherland-Hodgman 3D Near-Plane Polygon Clipper (Eliminates missing floor tiles & polygon explosions!)
    function projectClipped3DPolygon(worldPts, nearZ = 0.11) {
      const camPts = worldPts.map(([wx, wy, wz]) => toCamSpace(wx, wy, wz));
      const clipped = [];
      for (let i = 0; i < camPts.length; i++) {
        const curr = camPts[i];
        const prev = camPts[(i + camPts.length - 1) % camPts.length];
        const currIn = curr.depth >= nearZ;
        const prevIn = prev.depth >= nearZ;
        if (currIn !== prevIn) {
          const t = (nearZ - prev.depth) / (curr.depth - prev.depth);
          clipped.push({
            right: prev.right + (curr.right - prev.right) * t,
            up: prev.up + (curr.up - prev.up) * t,
            depth: nearZ
          });
        }
        if (currIn) clipped.push(curr);
      }
      if (clipped.length < 3) return null;
      return clipped.map(projectCamPoint);
    }

    function shadeHexColor(hex, factor) {
      const f = Math.max(0.18, Math.min(1.65, factor * brightMul));
      const n = parseInt(hex.slice(1), 16);
      const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
      const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
      const b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
      return `rgb(${r},${g},${b})`;
    }

    // 1. 3D Ceiling & Perspective Floor Base Backdrop with Power/Lighting Atmosphere
    const powerRestored = !!(player.breakerClosed || wireSolved);
    const ceilGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    ceilGrad.addColorStop(0, powerRestored ? '#0f172a' : '#090d16');
    ceilGrad.addColorStop(0.65, powerRestored ? '#1e293b' : '#111827');
    ceilGrad.addColorStop(1, '#334155');
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, 0, width, horizon);

    const floorGrad = ctx.createLinearGradient(0, horizon, 0, height);
    floorGrad.addColorStop(0, '#1e293b');
    floorGrad.addColorStop(0.4, '#334155');
    floorGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizon, width, height - horizon);

    // 2. Near-Plane Clipped 3D Perspective Floor Quads & Ceiling Acoustic Panels (100% Continuous Floor!)
    const floorTiles = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === TILE.WALL) continue;
        const dx = c + 0.5 - camWorldX;
        const dy = r + 0.5 - camWorldY;
        const distSq = dx * dx + dy * dy;
        if (distSq > 120) continue;
        const centerDepth = dx * cosYaw + dy * sinYaw;
        if (centerDepth < -0.75) continue;
        floorTiles.push({ r, c, distSq, centerDepth });
      }
    }

    floorTiles.sort((a, b) => b.distSq - a.distSq);

    for (const ft of floorTiles) {
      const { r, c, distSq } = ft;
      const dist = Math.sqrt(distSq);
      const poly = projectClipped3DPolygon(
        [[c, r, 0], [c + 1, r, 0], [c + 1, r + 1, 0], [c, r + 1, 0]],
        0.09
      );
      if (!poly) continue;

      const even = (r + c) % 2 === 0;
      const t = grid[r][c];
      const depthShade = Math.max(0.38, Math.min(1.18, 1.12 / (1 + dist * 0.14)));

      let baseHex = even ? '#3b4c63' : '#2e3d52';
      let strokeCol = 'rgba(148, 163, 184, 0.34)';

      if (t === TILE.EXIT) {
        baseHex = '#10b981';
        strokeCol = '#a7f3d0';
      } else if (c <= 3 && r <= 3) {
        // Warm Oak Parquet Bedroom Floor
        baseHex = even ? '#854d0e' : '#713f12';
        strokeCol = 'rgba(253, 224, 71, 0.28)';
      } else if (c >= 4 && c <= 7 && r <= 3) {
        // Clean Aqua Ceramic Bathroom Tile
        baseHex = even ? '#0e7490' : '#155e75';
        strokeCol = 'rgba(103, 232, 249, 0.35)';
      } else if (c <= 5 && r >= 5) {
        // Warm Terracotta Kitchen/Lab Tile
        baseHex = even ? '#7f1d1d' : '#651a1a';
        strokeCol = 'rgba(253, 164, 175, 0.28)';
      }

      ctx.fillStyle = shadeHexColor(baseHex, depthShade);
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let k = 1; k < poly.length; k++) ctx.lineTo(poly[k].x, poly[k].y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = Math.max(0.8, Math.min(2.0, 2.6 / Math.max(0.4, dist)));
      ctx.stroke();

      // Wood Parquet Plank Sub-Line or Corridor Photoluminescent Guide Strip
      if (r === 4 || c === 8) {
        const stripPoly = projectClipped3DPolygon(
          [[c + 0.38, r + 0.38, 0.005], [c + 0.62, r + 0.38, 0.005], [c + 0.62, r + 0.62, 0.005], [c + 0.38, r + 0.62, 0.005]],
          0.10
        );
        if (stripPoly) {
          ctx.fillStyle = 'rgba(52, 211, 153, 0.65)';
          ctx.beginPath();
          ctx.moveTo(stripPoly[0].x, stripPoly[0].y);
          for (let k = 1; k < stripPoly.length; k++) ctx.lineTo(stripPoly[k].x, stripPoly[k].y);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Recessed 3D Ceiling LED Light Panel & Emergency Strobe above open rooms
      if ((r % 2 === 1) && (c % 2 === 1) && dist < 9.5) {
        const ceilPoly = projectClipped3DPolygon(
          [[c + 0.22, r + 0.22, 0.99], [c + 0.78, r + 0.22, 0.99], [c + 0.78, r + 0.78, 0.99], [c + 0.22, r + 0.78, 0.99]],
          0.18
        );
        if (ceilPoly) {
          ctx.fillStyle = st.isDarkStage
            ? 'rgba(56, 189, 248, 0.32)'
            : (powerRestored ? 'rgba(254, 249, 195, 0.88)' : 'rgba(253, 224, 71, 0.68)');
          ctx.beginPath();
          ctx.moveTo(ceilPoly[0].x, ceilPoly[0].y);
          for (let k = 1; k < ceilPoly.length; k++) ctx.lineTo(ceilPoly[k].x, ceilPoly[k].y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // 2B. Discrete 3D Glowing Floor Guide Pads & World-Space 3D Footprints (Never clips into a giant yellow polygon under the camera!)
    const nextObj = getNextStepObjective();
    const routePath = nextObj
      ? computeShortestEscapePath(Math.floor(player.x), Math.floor(player.y), nextObj.c, nextObj.r)
      : [];

    if (routePath && routePath.length >= 2) {
      for (let i = 1; i < routePath.length; i++) {
        const prev = routePath[i - 1];
        const curr = routePath[i];
        const cp = toCamSpace(curr.c + 0.5, curr.r + 0.5, 0.015);
        if (cp.depth < 0.65 || cp.depth > 9.5) continue;
        const padPoly = projectClipped3DPolygon(
          [
            [curr.c + 0.32, curr.r + 0.32, 0.012],
            [curr.c + 0.68, curr.r + 0.32, 0.012],
            [curr.c + 0.68, curr.r + 0.68, 0.012],
            [curr.c + 0.32, curr.r + 0.68, 0.012]
          ],
          0.35
        );
        if (padPoly) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.38)';
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.88)';
          ctx.lineWidth = Math.max(1, 2.2 / cp.depth);
          ctx.beginPath();
          ctx.moveTo(padPoly[0].x, padPoly[0].y);
          for (let k = 1; k < padPoly.length; k++) ctx.lineTo(padPoly[k].x, padPoly[k].y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          const centerPt = project3DPoint(curr.c + 0.5, curr.r + 0.5, 0.02, 0.35);
          if (centerPt) {
            const dc = curr.c - prev.c;
            const dr = curr.r - prev.r;
            const arrowChar = dc > 0 ? '▶' : (dc < 0 ? '◀' : (dr > 0 ? '▼' : '▲'));
            ctx.font = `900 ${Math.max(10, Math.min(18, Math.floor(22 / cp.depth)))}px sans-serif`;
            ctx.fillStyle = '#fde047';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(arrowChar, centerPt.x, centerPt.y);
          }
        }
      }
    }

    for (const fs of footsteps3D) {
      const fp = project3DPoint(fs.x, fs.y, 0.01, 0.25);
      if (!fp || fp.depth > 5.0) continue;
      const alpha = Math.max(0, (fs.life / fs.maxLife) * 0.55);
      const rx = Math.max(2.5, 8 / fp.depth);
      const ry = Math.max(1.4, 3.8 / fp.depth);
      ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(fp.x, fp.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. High-Resolution 1px 3D Architectural Wall Shader with Distance Lighting, Flashlight Cone & Escape-Room Wall Fixtures
    const qSetting = (appSettings && appSettings.graphicsQuality) || 'auto';
    const rayBudget = qSetting === 'low' ? 320 : 960;
    const numRays = Math.min(rayBudget, Math.max(240, Math.floor(width)));
    const zBuffer = new Float32Array(numRays);
    const visibleWallFixtures = new Map();

    function isFullHeightWallTile(t) {
      return (
        t === TILE.WALL ||
        t === TILE.DOOR ||
        t === TILE.LOCKED_DOOR ||
        t === TILE.HOT_DOOR ||
        t === TILE.EXIT ||
        t === TILE.ELEVATOR ||
        t === TILE.PARTITION ||
        t === TILE.LIFELINE
      );
    }

    for (let i = 0; i < numRays; i++) {
      const camX = (2 * (i + 0.5)) / numRays - 1;
      const rayAngle = fpsCamYaw + Math.atan(camX * tanHalfFov);
      const rayDirX = Math.cos(rayAngle);
      const rayDirY = Math.sin(rayAngle);

      let mapX = Math.floor(camWorldX);
      let mapY = Math.floor(camWorldY);
      const deltaDistX = Math.abs(rayDirX) < 1e-6 ? 1e6 : Math.abs(1 / rayDirX);
      const deltaDistY = Math.abs(rayDirY) < 1e-6 ? 1e6 : Math.abs(1 / rayDirY);

      let stepX, sideDistX;
      let stepY, sideDistY;
      if (rayDirX < 0) {
        stepX = -1;
        sideDistX = (camWorldX - mapX) * deltaDistX;
      } else {
        stepX = 1;
        sideDistX = (mapX + 1.0 - camWorldX) * deltaDistX;
      }
      if (rayDirY < 0) {
        stepY = -1;
        sideDistY = (camWorldY - mapY) * deltaDistY;
      } else {
        stepY = 1;
        sideDistY = (mapY + 1.0 - camWorldY) * deltaDistY;
      }

      let hit = false;
      let side = 0;
      let hitTile = TILE.WALL;
      let steps = 0;

      while (!hit && steps < 36) {
        steps++;
        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0;
        } else {
          sideDistY += deltaDistY;
          mapY += stepY;
          side = 1;
        }
        if (mapX < 0 || mapX >= COLS || mapY < 0 || mapY >= ROWS) {
          hit = true;
          hitTile = TILE.WALL;
        } else if (isFullHeightWallTile(grid[mapY][mapX])) {
          hit = true;
          hitTile = grid[mapY][mapX];
        }
      }

      const rawDist = side === 0 ? (sideDistX - deltaDistX) : (sideDistY - deltaDistY);
      const perpDist = Math.max(0.14, rawDist * Math.cos(rayAngle - fpsCamYaw));
      zBuffer[i] = perpDist;

      const projH = vertScale / perpDist;
      const wallBottom = horizon + projH * camEyeZ;
      const wallTop = wallBottom - projH;

      const x0 = Math.floor((i * width) / numRays);
      const x1 = Math.ceil(((i + 1) * width) / numRays);
      const sw = Math.max(1, x1 - x0);

      let wallX = side === 0 ? (camWorldY + rawDist * rayDirY) : (camWorldX + rawDist * rayDirX);
      wallX -= Math.floor(wallX);

      const isSideLit = side === 0;
      const isEdgeSeam = wallX < 0.035 || wallX > 0.965;

      // Dynamic Distance Shading + 3D Flashlight Cone (F) + Power Recovery Boost
      let lightFactor = (isSideLit ? 1.02 : 0.84) / (1 + perpDist * 0.14);
      if (powerRestored) lightFactor *= 1.10;
      if (st.isDarkStage && !powerRestored) lightFactor *= 0.62;
      if (flashlightSpotEnabled || player.hasFlashlight) {
        const coneDist = Math.abs(camX);
        if (coneDist < 0.45) {
          const spotStrength = (1 - (coneDist / 0.45) ** 2) * (player.hasFlashlight ? 0.36 : 0.20);
          lightFactor += spotStrength / (1 + perpDist * 0.12);
        }
      }
      lightFactor = Math.min(1.06, lightFactor);

      if (hitTile === TILE.DOOR || hitTile === TILE.LOCKED_DOOR || hitTile === TILE.HOT_DOOR) {
        // 3D Architectural Door Frame + Glass Vision Window + Recessed Wood Panels + Brass Handle
        const isFrameJamb = wallX < 0.11 || wallX > 0.89;
        if (isFrameJamb) {
          ctx.fillStyle = shadeHexColor('#5c2808', lightFactor);
          ctx.fillRect(x0, wallTop, sw, projH);
        } else {
          let leafHex = '#b45309';
          if (hitTile === TILE.LOCKED_DOOR) leafHex = '#ca8a04';
          else if (hitTile === TILE.HOT_DOOR) leafHex = '#dc2626';

          ctx.fillStyle = shadeHexColor('#451a03', lightFactor);
          ctx.fillRect(x0, wallTop, sw, projH * 0.08);

          ctx.fillStyle = shadeHexColor(leafHex, lightFactor);
          ctx.fillRect(x0, wallTop + projH * 0.08, sw, projH * 0.92);

          // Upper Glass Observation Window with Muntin Frame & Lower Recessed Panel
          if (wallX > 0.24 && wallX < 0.76) {
            const isWindowBorder = wallX < 0.27 || wallX > 0.73 || Math.abs(wallX - 0.5) < 0.018;
            ctx.fillStyle = isWindowBorder
              ? shadeHexColor('#451a03', lightFactor)
              : (hitTile === TILE.HOT_DOOR
                ? shadeHexColor('#fca5a5', lightFactor * 1.15)
                : shadeHexColor('#38bdf8', lightFactor * 0.92));
            ctx.fillRect(x0, wallTop + projH * 0.15, sw, projH * 0.24);

            const panelHex = hitTile === TILE.HOT_DOOR ? '#7f1d1d' : (hitTile === TILE.LOCKED_DOOR ? '#713f12' : '#78350f');
            ctx.fillStyle = shadeHexColor(panelHex, lightFactor);
            ctx.fillRect(x0, wallTop + projH * 0.52, sw, projH * 0.34);
          }

          // 3D Brass Lever Handle & Keyhole Plate
          if (wallX >= 0.72 && wallX <= 0.83) {
            ctx.fillStyle = '#fde047';
            ctx.fillRect(x0, wallTop + projH * 0.45, sw, projH * 0.055);
          }
        }
      } else if (hitTile === TILE.EXIT) {
        // 3D Illuminated Emergency Exit Portal
        const isFrame = wallX < 0.10 || wallX > 0.90;
        ctx.fillStyle = shadeHexColor(isFrame ? '#064e3b' : '#10b981', lightFactor * 1.15);
        ctx.fillRect(x0, wallTop, sw, projH);

        if (wallX > 0.18 && wallX < 0.82) {
          ctx.fillStyle = '#ecfdf5';
          ctx.fillRect(x0, wallTop + projH * 0.06, sw, projH * 0.16);
          ctx.fillStyle = '#047857';
          ctx.fillRect(x0, wallTop + projH * 0.08, sw, projH * 0.12);
          ctx.fillStyle = '#6ee7b7';
          ctx.fillRect(x0, wallTop + projH * 0.28, sw, projH * 0.68);
        }
      } else if (hitTile === TILE.ELEVATOR) {
        ctx.fillStyle = shadeHexColor(isEdgeSeam || Math.abs(wallX - 0.5) < 0.025 ? '#0f172a' : '#64748b', lightFactor);
        ctx.fillRect(x0, wallTop, sw, projH);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x0, wallTop + projH * 0.08, sw, projH * 0.07);
      } else if (hitTile === TILE.PARTITION || hitTile === TILE.LIFELINE) {
        const baseHex = hitTile === TILE.LIFELINE ? '#0284c7' : '#ea580c';
        ctx.fillStyle = shadeHexColor(baseHex, lightFactor);
        ctx.fillRect(x0, wallTop, sw, projH);
        if (wallX > 0.15 && wallX < 0.85) {
          ctx.fillStyle = shadeHexColor(hitTile === TILE.LIFELINE ? '#bae6fd' : '#fdba74', lightFactor);
          ctx.fillRect(x0, wallTop + projH * 0.22, sw, projH * 0.52);
        }
      } else {
        // Clean, Modern 3D Escape-Room Wall Architecture (Acoustic Slate Panels + Framed Wainscoting + Emergency Guide Ribbon)
        const wallFeature = (mapX * 7 + mapY * 13) % 4;
        const isPanelJoint = isEdgeSeam || Math.abs(wallX - 0.5) < 0.014;
        const upperHex = isPanelJoint ? '#334155' : '#64748b';
        const lowerHex = isEdgeSeam ? '#0f172a' : '#334155';

        // Upper Acoustic Slate Wall + Horizontal Perspective Courses
        ctx.fillStyle = shadeHexColor(upperHex, lightFactor);
        ctx.fillRect(x0, wallTop, sw, projH * 0.62);
        ctx.fillStyle = shadeHexColor('#475569', lightFactor * 0.88);
        ctx.fillRect(x0, wallTop + projH * 0.22, sw, Math.max(1.5, projH * 0.012));
        ctx.fillRect(x0, wallTop + projH * 0.42, sw, Math.max(1.5, projH * 0.012));

        // Ceiling Crown Molding & Ambient Occlusion Strip
        ctx.fillStyle = shadeHexColor('#cbd5e1', lightFactor);
        ctx.fillRect(x0, wallTop, sw, projH * 0.045);
        ctx.fillStyle = shadeHexColor('#1e293b', lightFactor * 0.85);
        ctx.fillRect(x0, wallTop + projH * 0.045, sw, projH * 0.015);

        // 3D Recessed Architectural Wall Fixtures on Every Wall Segment
        if (wallX > 0.22 && wallX < 0.78) {
          const isFixtureBorder = wallX < 0.25 || wallX > 0.75;
          if (wallFeature === 0) {
            // Framed Safety Blueprint Board (Dark Slate Frame + Deep Blueprint Interior)
            ctx.fillStyle = shadeHexColor(isFixtureBorder ? '#0f172a' : '#0c4a6e', lightFactor);
            ctx.fillRect(x0, wallTop + projH * 0.15, sw, projH * 0.30);
            if (wallX > 0.46 && wallX < 0.54 && perpDist < 5.2) {
              const fKey = `${mapX},${mapY},${side}`;
              if (!visibleWallFixtures.has(fKey)) {
                visibleWallFixtures.set(fKey, { x: x0, y: wallTop + projH * 0.30, depth: perpDist, label: '🗺️ 피난안내도(614)' });
              }
            }
          } else if (wallFeature === 1) {
            // Exterior / Corridor Night Window with Aluminum Mullion Crossbars
            const isMullion = isFixtureBorder || Math.abs(wallX - 0.50) < 0.02;
            ctx.fillStyle = shadeHexColor(isMullion ? '#1e293b' : '#1e3a8a', lightFactor);
            ctx.fillRect(x0, wallTop + projH * 0.14, sw, projH * 0.32);
            if (!isMullion) {
              ctx.fillStyle = shadeHexColor('#38bdf8', lightFactor * 0.90);
              ctx.fillRect(x0, wallTop + projH * 0.16, sw, projH * 0.06);
            }
          } else if (wallFeature === 2) {
            // Recessed Wall Archive Bookshelf (자정의 서가 단서 책장)
            ctx.fillStyle = shadeHexColor(isFixtureBorder ? '#451a03' : '#291507', lightFactor);
            ctx.fillRect(x0, wallTop + projH * 0.14, sw, projH * 0.34);
            if (!isFixtureBorder) {
              const bookBand = Math.floor(wallX * 14) % 4;
              const bookHex = bookBand === 0 ? '#dc2626' : (bookBand === 1 ? '#2563eb' : (bookBand === 2 ? '#059669' : '#d97706'));
              ctx.fillStyle = shadeHexColor(bookHex, lightFactor);
              ctx.fillRect(x0, wallTop + projH * 0.18, sw, projH * 0.11);
              ctx.fillRect(x0, wallTop + projH * 0.33, sw, projH * 0.11);
            }
            if (wallX > 0.46 && wallX < 0.54 && perpDist < 5.0) {
              const fKey = `${mapX},${mapY},${side}`;
              if (!visibleWallFixtures.has(fKey)) {
                visibleWallFixtures.set(fKey, { x: x0, y: wallTop + projH * 0.31, depth: perpDist, label: '📚 매뉴얼서가(425.12)' });
              }
            }
          } else {
            // Framed Acoustic Wall Relief + Emergency Wall Sconce
            ctx.fillStyle = shadeHexColor(isFixtureBorder ? '#1e293b' : '#475569', lightFactor * 0.94);
            ctx.fillRect(x0, wallTop + projH * 0.15, sw, projH * 0.30);
            if (wallX > 0.43 && wallX < 0.57) {
              ctx.fillStyle = shadeHexColor('#38bdf8', Math.max(0.85, lightFactor));
              ctx.fillRect(x0, wallTop + projH * 0.24, sw, projH * 0.08);
            }
          }
        }

        // Lower Wainscoting Wall
        ctx.fillStyle = shadeHexColor(lowerHex, lightFactor);
        ctx.fillRect(x0, wallTop + projH * 0.62, sw, projH * 0.38);

        if (wallX > 0.16 && wallX < 0.84) {
          ctx.fillStyle = shadeHexColor('#1e293b', lightFactor * 0.94);
          ctx.fillRect(x0, wallTop + projH * 0.68, sw, projH * 0.20);
        }

        // Photoluminescent Green Emergency Wall Guide Ribbon & Golden Trim
        ctx.fillStyle = shadeHexColor('#10b981', Math.max(0.75, lightFactor));
        ctx.fillRect(x0, wallTop + projH * 0.59, sw, projH * 0.035);
        ctx.fillStyle = shadeHexColor('#fde047', Math.max(0.75, lightFactor));
        ctx.fillRect(x0, wallTop + projH * 0.58, sw, projH * 0.012);

        // Dark Architectural Floor Baseboard
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x0, wallBottom - projH * 0.065, sw, projH * 0.065);
      }
    }

    // Draw Crisp Badges on Visible Escape-Room Wall Fixtures (Blueprints & Archive Bookshelves)
    for (const wf of visibleWallFixtures.values()) {
      if (wf.x < 60 || wf.x > width - 60) continue;
      ctx.save();
      ctx.font = `bold ${Math.max(10, Math.min(14, Math.floor(19 / wf.depth)))}px "Noto Sans KR", sans-serif`;
      const tw = ctx.measureText(wf.label).width + 10;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.fillRect(wf.x - tw * 0.5, wf.y - 9, tw, 18);
      ctx.strokeRect(wf.x - tw * 0.5, wf.y - 9, tw, 18);
      ctx.fillStyle = '#e0f2fe';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(wf.label, wf.x, wf.y);
      ctx.restore();
    }

    // 4. Per-Column Z-Buffer Clipped + Near-Plane Clipped Multi-Part 3D Room Furniture & Escape-Room Stations
    // (Completely eliminates the giant flat brown polygon bug and prevents furniture from bleeding through walls!)
    function isPointVisibleInZBuffer(screenX, depth) {
      const rayIdx = Math.max(0, Math.min(numRays - 1, Math.floor((screenX / width) * numRays)));
      return depth < zBuffer[rayIdx] + 0.22;
    }

    function draw3DPerspectiveBox(wx0, wy0, wx1, wy1, wz0, wz1, topCol, sideColLit, sideColShade, strokeCol) {
      const cx = (wx0 + wx1) * 0.5;
      const cy = (wy0 + wy1) * 0.5;
      const cz = (wz0 + wz1) * 0.5;
      const centerCam = toCamSpace(cx, cy, cz);
      // Do not draw boxes behind or intersecting the camera lens (< 0.36m) to prevent screen-filling flat polygons
      if (centerCam.depth <= 0.36 || centerCam.depth > 10.5) return;

      const faces = [];
      if (camWorldY < wy0) {
        faces.push({ pts: [[wx0, wy0, wz0], [wx1, wy0, wz0], [wx1, wy0, wz1], [wx0, wy0, wz1]], col: sideColShade });
      }
      if (camWorldY > wy1) {
        faces.push({ pts: [[wx0, wy1, wz0], [wx1, wy1, wz0], [wx1, wy1, wz1], [wx0, wy1, wz1]], col: sideColShade });
      }
      if (camWorldX < wx0) {
        faces.push({ pts: [[wx0, wy0, wz0], [wx0, wy1, wz0], [wx0, wy1, wz1], [wx0, wy0, wz1]], col: sideColLit });
      }
      if (camWorldX > wx1) {
        faces.push({ pts: [[wx1, wy0, wz0], [wx1, wy1, wz0], [wx1, wy1, wz1], [wx1, wy0, wz1]], col: sideColLit });
      }
      if (camEyeZ >= wz1 - 0.04) {
        faces.push({ pts: [[wx0, wy0, wz1], [wx1, wy0, wz1], [wx1, wy1, wz1], [wx0, wy1, wz1]], col: topCol });
      }

      if (faces.length === 0) return;

      // Build a per-column Z-buffer visibility clip path so walls ALWAYS occlude furniture behind them!
      let minScreenX = width;
      let maxScreenX = 0;
      const projectedFaces = [];
      for (const f of faces) {
        const poly = projectClipped3DPolygon(f.pts, 0.28);
        if (!poly) continue;
        for (const p of poly) {
          if (p.x < minScreenX) minScreenX = p.x;
          if (p.x > maxScreenX) maxScreenX = p.x;
        }
        projectedFaces.push({ poly, col: f.col });
      }
      if (projectedFaces.length === 0) return;

      const startRay = Math.max(0, Math.floor((minScreenX / width) * numRays));
      const endRay = Math.min(numRays - 1, Math.ceil((maxScreenX / width) * numRays));
      let anyVisibleCol = false;

      ctx.save();
      ctx.beginPath();
      for (let rIdx = startRay; rIdx <= endRay; rIdx++) {
        if (centerCam.depth < zBuffer[rIdx] + 0.20) {
          anyVisibleCol = true;
          const rx0 = Math.floor((rIdx * width) / numRays);
          const rx1 = Math.ceil(((rIdx + 1) * width) / numRays);
          ctx.rect(rx0, 0, Math.max(1, rx1 - rx0), height);
        }
      }
      if (!anyVisibleCol) {
        ctx.restore();
        return;
      }
      ctx.clip();

      const distFactor = Math.max(0.45, Math.min(1.15, 1.08 / (1 + centerCam.depth * 0.12)));
      for (const pf of projectedFaces) {
        ctx.fillStyle = pf.col.startsWith('#') ? shadeHexColor(pf.col, distFactor) : pf.col;
        ctx.beginPath();
        ctx.moveTo(pf.poly[0].x, pf.poly[0].y);
        for (let k = 1; k < pf.poly.length; k++) ctx.lineTo(pf.poly[k].x, pf.poly[k].y);
        ctx.closePath();
        ctx.fill();
        if (strokeCol) {
          ctx.strokeStyle = strokeCol;
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // Collect all 3D room objects, open doors, items, fires, smokes, and door labels for back-to-front depth sorting
    const objects3D = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = grid[r][c];
        if (t === TILE.FLOOR || t === TILE.WALL) continue;
        const cp = toCamSpace(c + 0.5, r + 0.5, 0.25);
        if (cp.depth <= 0.15 || cp.depth > 10.5) continue;
        objects3D.push({ kind: 'tileObj', r, c, t, depth: cp.depth });
      }
    }

    for (const it of items) {
      const cp = toCamSpace(it.c + 0.5, it.r + 0.5, 0.20);
      if (cp.depth > 0.15 && cp.depth <= 10.5) {
        objects3D.push({ kind: 'item', it, depth: cp.depth });
      }
    }

    for (const f of fires) {
      const cp = toCamSpace(f.c + 0.5, f.r + 0.5, 0.25);
      if (cp.depth > 0.15 && cp.depth <= 10.5) {
        objects3D.push({ kind: 'fire', f, depth: cp.depth });
      }
    }

    for (const s of smokes) {
      const cp = toCamSpace(s.c + 0.5, s.r + 0.5, 0.75);
      if (cp.depth > 0.15 && cp.depth <= 10.5) {
        objects3D.push({ kind: 'smoke', s, depth: cp.depth });
      }
    }

    objects3D.sort((a, b) => b.depth - a.depth);

    for (const obj of objects3D) {
      if (obj.kind === 'tileObj') {
        const { r, c, t } = obj;
        if (t === TILE.FURNITURE) {
          const fKind = (r + c * 3) % 3;
          if (fKind === 0) {
            // 3D Bedroom Bed on Floor (Mattress + Blue Blanket + Wooden Headboard + White Pillow)
            draw3DPerspectiveBox(c + 0.12, r + 0.14, c + 0.88, r + 0.86, 0, 0.24, '#3b82f6', '#2563eb', '#1d4ed8', '#93c5fd');
            draw3DPerspectiveBox(c + 0.12, r + 0.12, c + 0.88, r + 0.26, 0, 0.46, '#92400e', '#78350f', '#451a03', '#fbbf24');
            draw3DPerspectiveBox(c + 0.24, r + 0.24, c + 0.76, r + 0.42, 0.24, 0.30, '#ffffff', '#e2e8f0', '#cbd5e1', '#94a3b8');
          } else if (fKind === 1) {
            // 3D Study Desk + Digital Safe (🔐 614)
            draw3DPerspectiveBox(c + 0.14, r + 0.18, c + 0.86, r + 0.82, 0, 0.32, '#d97706', '#b45309', '#78350f', '#fde68a');
            draw3DPerspectiveBox(c + 0.28, r + 0.30, c + 0.72, r + 0.56, 0.32, 0.54, '#0284c7', '#0369a1', '#0f172a', '#38bdf8');
            const sp = project3DPoint(c + 0.5, r + 0.5, 0.60);
            if (sp && sp.depth < 6.0 && isPointVisibleInZBuffer(sp.x, sp.depth - 0.15)) {
              ctx.font = `bold ${Math.max(10, Math.min(16, Math.floor(22 / sp.depth)))}px "Noto Sans KR", sans-serif`;
              ctx.fillStyle = safeSolved ? '#6ee7b7' : '#fde047';
              ctx.textAlign = 'center';
              ctx.fillText(safeSolved ? '🔓금고(해제됨)' : '🔐비상금고(614)', sp.x, sp.y);
            }
          } else {
            // 3D Escape-Room Archive Bookshelf & Direction-Lock Cabinet
            draw3DPerspectiveBox(c + 0.18, r + 0.18, c + 0.82, r + 0.82, 0, 0.30, '#475569', '#334155', '#1e293b', '#94a3b8');
            draw3DPerspectiveBox(c + 0.24, r + 0.24, c + 0.76, r + 0.76, 0.30, 0.52, '#0f172a', '#1e293b', '#090d16', '#22d3ee');
            const sp = project3DPoint(c + 0.5, r + 0.5, 0.60);
            if (sp && sp.depth < 6.0 && isPointVisibleInZBuffer(sp.x, sp.depth - 0.15)) {
              ctx.font = `bold ${Math.max(10, Math.min(16, Math.floor(22 / sp.depth)))}px "Noto Sans KR", sans-serif`;
              ctx.fillStyle = (bookSortSolved && dirLockSolved) ? '#6ee7b7' : '#c4b5fd';
              ctx.textAlign = 'center';
              ctx.fillText((bookSortSolved && dirLockSolved) ? '📚보관함(해제됨)' : '📚서가·🧭자물쇠', sp.x, sp.y);
            }
          }
        } else if (t === TILE.SINK) {
          // 3D Porcelain Washbasin Vanity + Water Basin
          draw3DPerspectiveBox(c + 0.14, r + 0.16, c + 0.86, r + 0.84, 0, 0.36, '#e0f2fe', '#0284c7', '#0369a1', '#7dd3fc');
          draw3DPerspectiveBox(c + 0.24, r + 0.26, c + 0.76, r + 0.74, 0.36, 0.42, '#38bdf8', '#0284c7', '#0369a1', '#ffffff');
          const sp = project3DPoint(c + 0.5, r + 0.5, 0.54);
          if (sp && isPointVisibleInZBuffer(sp.x, sp.depth - 0.15)) {
            ctx.font = `bold ${Math.max(11, Math.min(20, Math.floor(26 / sp.depth)))}px "Noto Sans KR", sans-serif`;
            ctx.fillStyle = '#bae6fd';
            ctx.textAlign = 'center';
            ctx.fillText('🚰세면대(수건적시기)', sp.x, sp.y);
          }
        } else if (t === TILE.OPEN_DOOR) {
          // 3D Open Doorway Arch
          draw3DPerspectiveBox(c + 0.02, r + 0.08, c + 0.16, r + 0.92, 0, 0.90, '#78350f', '#92400e', '#451a03', '#fbbf24');
          draw3DPerspectiveBox(c + 0.84, r + 0.08, c + 0.98, r + 0.92, 0, 0.90, '#78350f', '#92400e', '#451a03', '#fbbf24');
          const dp = project3DPoint(c + 0.5, r + 0.5, 0.72);
          if (dp && dp.depth < 5.5 && isPointVisibleInZBuffer(dp.x, dp.depth - 0.1)) {
            ctx.font = `bold ${Math.max(10, Math.min(16, Math.floor(22 / dp.depth)))}px "Noto Sans KR", sans-serif`;
            ctx.fillStyle = '#6ee7b7';
            ctx.textAlign = 'center';
            ctx.fillText('🚪열린문(통과)', dp.x, dp.y);
          }
        } else if (t === TILE.DEBRIS) {
          // 3D Layered Wooden Planks Barricade (Not a single giant block)
          draw3DPerspectiveBox(c + 0.14, r + 0.18, c + 0.86, r + 0.46, 0, 0.22, '#d97706', '#b45309', '#78350f', '#fde68a');
          draw3DPerspectiveBox(c + 0.18, r + 0.52, c + 0.82, r + 0.82, 0, 0.34, '#b45309', '#92400e', '#451a03', '#fb923c');
          const dp = project3DPoint(c + 0.5, r + 0.5, 0.48);
          if (dp && isPointVisibleInZBuffer(dp.x, dp.depth - 0.15)) {
            ctx.font = `bold ${Math.max(11, Math.min(18, Math.floor(24 / dp.depth)))}px "Noto Sans KR", sans-serif`;
            ctx.fillStyle = '#fed7aa';
            ctx.textAlign = 'center';
            ctx.fillText('🪵장애물(소방도끼)', dp.x, dp.y);
          }
        } else if (
          t === TILE.GAS_VALVE ||
          t === TILE.BREAKER ||
          t === TILE.ALARM_BELL ||
          t === TILE.PHONE_119 ||
          t === TILE.HAZARD
        ) {
          const boxTop = t === TILE.GAS_VALVE
            ? (player.gasClosed ? '#10b981' : '#ef4444')
            : (t === TILE.BREAKER ? (player.breakerClosed ? '#10b981' : '#3b82f6') : '#475569');
          draw3DPerspectiveBox(c + 0.22, r + 0.22, c + 0.78, r + 0.78, 0, 0.42, boxTop, '#1e293b', '#0f172a', '#38bdf8');
          const fp = project3DPoint(c + 0.5, r + 0.5, 0.56);
          if (fp && isPointVisibleInZBuffer(fp.x, fp.depth - 0.15)) {
            const label = t === TILE.GAS_VALVE ? (player.gasClosed ? '✅가스밸브(차단됨)' : '🔴가스밸브(잠그기)')
              : t === TILE.BREAKER ? (player.breakerClosed ? '✅배전판(복구완료)' : '⚡배전판(전원·배선)')
              : t === TILE.ALARM_BELL ? '🔔비상벨(작동)'
              : t === TILE.PHONE_119 ? '📞119비상전화'
              : '⚠️화재위험요소';
            ctx.font = `bold ${Math.max(11, Math.min(19, Math.floor(26 / fp.depth)))}px "Noto Sans KR", sans-serif`;
            ctx.fillStyle = '#fef08a';
            ctx.textAlign = 'center';
            ctx.fillText(label, fp.x, fp.y);
          }
        } else if (t === TILE.DOOR || t === TILE.LOCKED_DOOR || t === TILE.HOT_DOOR || t === TILE.EXIT) {
          const wp = project3DPoint(c + 0.5, r + 0.5, 0.55);
          if (wp && wp.depth < 6.5 && isPointVisibleInZBuffer(wp.x, wp.depth - 0.45)) {
            const badgeText = t === TILE.EXIT ? '🏃 EXIT 비상구'
              : t === TILE.LOCKED_DOOR ? '🔒 잠긴문 (열쇠/금고614)'
              : t === TILE.HOT_DOOR ? '🌡️🔥 고온 위험문 (열지마세요!)'
              : '🚪 방문 (행동키로 열기)';
            ctx.save();
            ctx.font = `bold ${Math.max(11, Math.min(18, Math.floor(25 / wp.depth)))}px "Noto Sans KR", sans-serif`;
            const tw = ctx.measureText(badgeText).width + 12;
            const th = Math.max(18, Math.min(26, Math.floor(32 / wp.depth)));
            ctx.fillStyle = t === TILE.EXIT ? 'rgba(5, 150, 105, 0.92)' : 'rgba(15, 23, 42, 0.88)';
            ctx.strokeStyle = t === TILE.EXIT ? '#6ee7b7' : '#fbbf24';
            ctx.lineWidth = 1.5;
            ctx.fillRect(wp.x - tw * 0.5, wp.y - th * 0.5, tw, th);
            ctx.strokeRect(wp.x - tw * 0.5, wp.y - th * 0.5, tw, th);
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeText, wp.x, wp.y);
            ctx.restore();
          }
        }
      } else if (obj.kind === 'item') {
        const { it } = obj;
        // Draw a 3D Pedestal Cushion under the Item + Floating 3D Item Orb
        draw3DPerspectiveBox(it.c + 0.32, it.r + 0.32, it.c + 0.68, it.r + 0.68, 0, 0.08, '#1e293b', '#0f172a', '#020617', '#38bdf8');
        const ip = project3DPoint(it.c + 0.5, it.r + 0.5, 0.22 + Math.sin(now * 3.5) * 0.04);
        if (ip && isPointVisibleInZBuffer(ip.x, ip.depth - 0.12)) {
          const rad = Math.max(12, Math.min(34, 42 / ip.depth));
          ctx.save();
          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(ip.x, ip.y, rad, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.font = `${Math.floor(rad * 1.15)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(it.icon, ip.x, ip.y);
          ctx.font = `bold ${Math.max(10, Math.floor(rad * 0.55))}px "Noto Sans KR", sans-serif`;
          ctx.fillStyle = '#fef08a';
          ctx.fillText(it.name, ip.x, ip.y + rad + 10);
          ctx.restore();
        }
      } else if (obj.kind === 'fire') {
        const { f } = obj;
        const fp = project3DPoint(f.c + 0.5, f.r + 0.5, 0.25);
        if (fp && isPointVisibleInZBuffer(fp.x, fp.depth - 0.12)) {
          const frad = Math.max(14, Math.min(48, 56 / fp.depth));
          const fGrad = ctx.createRadialGradient(fp.x, fp.y, frad * 0.15, fp.x, fp.y, frad);
          fGrad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
          fGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.80)');
          fGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
          ctx.fillStyle = fGrad;
          ctx.beginPath();
          ctx.arc(fp.x, fp.y, frad, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = `${Math.floor(frad * 1.1)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🔥', fp.x, fp.y);
        }
      } else if (obj.kind === 'smoke') {
        const { s } = obj;
        const sp = project3DPoint(s.c + 0.5, s.r + 0.5, 0.78);
        if (sp && isPointVisibleInZBuffer(sp.x, sp.depth - 0.1)) {
          const srad = Math.max(18, Math.min(58, 68 / sp.depth));
          const sGrad = ctx.createRadialGradient(sp.x, sp.y, srad * 0.1, sp.x, sp.y, srad);
          sGrad.addColorStop(0, 'rgba(100, 116, 139, 0.62)');
          sGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
          ctx.fillStyle = sGrad;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, srad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 5. PRD F05 Center Raycast Reticle (⌖) & Real-Time Target Distance / Required Action Inspector HUD
    let aimedTargetInfo = null;
    for (let d = 0.4; d <= 3.8; d += 0.25) {
      const tx = player.x + cosYaw * d;
      const ty = player.y + sinYaw * d;
      const tc = Math.floor(tx);
      const tr = Math.floor(ty);
      if (tc < 0 || tc >= COLS || tr < 0 || tr >= ROWS) break;
      const hitItem = items.find(it => it.c === tc && it.r === tr);
      if (hitItem) {
        aimedTargetInfo = {
          name: `${hitItem.icon} ${hitItem.name}`,
          dist: d,
          action: d <= 1.8 ? '✋ 행동하기(Space/E): 즉시 획득/구출' : '더 가까이 이동하세요'
        };
        break;
      }
      const tt = grid[tr][tc];
      if (tt !== TILE.FLOOR && tt !== TILE.OPEN_DOOR) {
        if (tt === TILE.WALL) break;
        const tNames = {
          [TILE.DOOR]: ['🚪 일반 방문', '✋ 행동하기(Space/E): 문 열기'],
          [TILE.LOCKED_DOOR]: ['🔒 잠긴 방문', player.keys > 0 ? '🔑 열쇠로 즉시 개방 가능!' : '🔐 금고(614) 또는 열쇠(🔑) 필요'],
          [TILE.HOT_DOOR]: ['🌡️🔥 고온 위험문', '⚠️ 백드래프트 위험! 절대 열지 마세요'],
          [TILE.SINK]: ['🚰 욕실 세면대', player.hasTowel && !player.wetTowel ? '✋ 수건 물에 적시기' : '💧 깨끗한 물 공급원'],
          [TILE.GAS_VALVE]: ['🔴 주방 가스밸브', player.gasClosed ? '✅ 이미 안전하게 잠김' : '✋ 행동하기: 가스밸브 잠그기'],
          [TILE.BREAKER]: ['⚡ 비상 배전판', player.breakerClosed ? '✅ 배선·전원 복구 완료' : '✋ 행동하기 / 🔐 배선 퍼즐(R=B,B=D,Y=A,G=C)'],
          [TILE.DEBRIS]: ['🪵 목재 장애물', player.hasAxe ? '🪓 소방도끼로 즉시 돌파 가능!' : '🪓 소방도끼 필요 (서가 정렬 퍼즐/탐색)'],
          [TILE.EXIT]: ['🏃 비상구(EXIT)', '✋ 모든 목표 달성 후 최종 탈출!'],
          [TILE.FURNITURE]: ['🔐 단서 서가 · 비상 금고', '🔐 상단 [퍼즐조사(Q)]로 금고·서가 조사'],
          [TILE.ALARM_BELL]: ['🔔 화재 비상벨', '✋ 행동하기: 비상 경보 울리기'],
          [TILE.PHONE_119]: ['📞 119 비상전화', '✋ 행동하기: 119 화재 신고']
        };
        if (tNames[tt]) {
          aimedTargetInfo = { name: tNames[tt][0], dist: d, action: tNames[tt][1] };
        }
        break;
      }
    }

    // Draw Center 3D Reticle (⌖)
    ctx.save();
    const reticleY = horizon;
    const isAimingInteractive = !!aimedTargetInfo;
    ctx.strokeStyle = isAimingInteractive ? '#22d3ee' : 'rgba(226, 232, 240, 0.55)';
    ctx.lineWidth = isAimingInteractive ? 2.2 : 1.5;
    ctx.beginPath();
    ctx.arc(halfW, reticleY, isAimingInteractive ? 9 : 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(halfW - 14, reticleY);
    ctx.lineTo(halfW - 5, reticleY);
    ctx.moveTo(halfW + 5, reticleY);
    ctx.lineTo(halfW + 14, reticleY);
    ctx.moveTo(halfW, reticleY - 14);
    ctx.lineTo(halfW, reticleY - 5);
    ctx.moveTo(halfW, reticleY + 5);
    ctx.lineTo(halfW, reticleY + 14);
    ctx.stroke();

    if (aimedTargetInfo) {
      const hudText = `🎯 ${aimedTargetInfo.name} (${aimedTargetInfo.dist.toFixed(1)}m) — ${aimedTargetInfo.action}`;
      ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
      const tw = ctx.measureText(hudText).width + 18;
      const hudY = Math.min(height - 135, reticleY + 26);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.90)';
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.5;
      ctx.fillRect(halfW - tw * 0.5, hudY - 12, tw, 24);
      ctx.strokeRect(halfW - tw * 0.5, hudY - 12, tw, 24);
      ctx.fillStyle = '#ecfeff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hudText, halfW, hudY);
    }
    ctx.restore();

    // 5B. Floating 3D Objective Beacon in 1st-Person 3D View
    if (nextObj && !player.onFire) {
      const op = project3DPoint(nextObj.c + 0.5, nextObj.r + 0.5, 0.68);
      if (op && op.depth < 12) {
        const clampedX = Math.max(70, Math.min(width - 70, op.x));
        const clampedY = Math.max(46, Math.min(height - 110, op.y));
        ctx.save();
        ctx.font = 'bold 12px "Noto Sans KR", sans-serif';
        const rawLabel = nextObj.label || '🎯 목표 지점';
        const label = `${rawLabel.startsWith('🎯') ? rawLabel : '🎯 ' + rawLabel} (${op.depth.toFixed(1)}m)`;
        const bw = ctx.measureText(label).width + 16;
        ctx.fillStyle = '#facc15';
        ctx.fillRect(clampedX - bw * 0.5, clampedY - 13, bw, 26);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(clampedX - bw * 0.5, clampedY - 13, bw, 26);
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, clampedX, clampedY);
        ctx.restore();
      }
    }

    // 6. 1st-Person 3D Held Equipment Hands (Left: 3D Flashlight Beam / Wet Towel, Right: Extinguisher / Axe)
    // + Compact Ground-Locked 3D Runner Avatar
    const handBobX = reduceMot ? 0 : Math.cos(fpsWalkPhase) * 3.5;
    const handBobY = reduceMot ? 0 : Math.abs(Math.sin(fpsWalkPhase)) * 4.5;

    ctx.save();
    // Left Hand: 3D Tactical Flashlight casting volumetric light cone
    if (flashlightSpotEnabled || player.hasFlashlight) {
      const lx = width * 0.34 + handBobX;
      const ly = height - 18 + handBobY;
      const beamGrad = ctx.createRadialGradient(halfW, horizon, 10, halfW, horizon, width * 0.36);
      beamGrad.addColorStop(0, 'rgba(254, 249, 195, 0.16)');
      beamGrad.addColorStop(0.6, 'rgba(253, 224, 71, 0.06)');
      beamGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, 0, width, height);

      // Flashlight 3D Cylinder Body
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx - 18, height + 8);
      ctx.lineTo(lx + 14, ly - 26);
      ctx.lineTo(lx + 34, ly - 16);
      ctx.lineTo(lx + 6, height + 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(lx + 24, ly - 21, 10, 6, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Right Hand: Active Safety Gear (Extinguisher / Axe)
    const rx = width * 0.66 - handBobX;
    const ry = height - 22 + handBobY;
    if (player.extinguisherCharges > 0 || player.hasAxe) {
      ctx.fillStyle = player.extinguisherCharges > 0 ? '#dc2626' : '#b45309';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.fillRect(rx - 16, ry - 32, 32, 56);
      ctx.strokeRect(rx - 16, ry - 32, 32, 56);
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.extinguisherCharges > 0 ? '🧯' : '🪓', rx, ry - 8);
    }
    ctx.restore();

    // Compact Ground-Anchored 3D Character ('나') — Scaled cleanly so it never blocks the center reticle
    const activeSkin = getSelectedSkin();
    let rightTool = 'none';
    if (player.extinguisherCharges > 0) rightTool = 'extinguisher';
    else if (player.hasAxe) rightTool = 'axe';
    else if (player.waterCharges > 0) rightTool = 'bucket';
    else if (player.hasFlashlight) rightTool = 'flashlight';

    const isMovingNow = Math.abs(fpsForwardSurge) > 0.08 || Math.abs(fpsTurnBias) > 0.08;
    const charFootX = width * 0.5 + fpsTurnBias * (width * 0.045);
    const charFootY = height * 0.91 - fpsForwardSurge * (height * 0.025);
    const charHeight = Math.min(width, height) * (player.crouching ? 0.19 : 0.23);

    drawHumanCharacter3DWalk(ctx, charFootX, charFootY, charHeight, {
      crouching: player.crouching,
      moving: isMovingNow,
      walkPhase: fpsWalkPhase,
      turnBias: fpsTurnBias,
      skinId: activeSkin.id || 'student',
      wetTowel: player.wetTowel,
      hasTowel: player.hasTowel,
      hasMask: player.hasMask,
      rightTool,
      onFire: player.onFire
    });

    const headTopY = charFootY - (player.crouching ? charHeight * 0.74 : charHeight * 0.94);
    ctx.save();
    const pBadgeText = player.crouching ? '나 (🧎낮은자세 · 신선한 공기층)' : '나 (🚶서있음)';
    ctx.font = 'bold 10.5px "Noto Sans KR", sans-serif';
    const pbW = ctx.measureText(pBadgeText).width + 12;
    ctx.fillStyle = player.crouching ? 'rgba(5, 150, 105, 0.92)' : 'rgba(37, 99, 235, 0.92)';
    ctx.fillRect(charFootX - pbW * 0.5, headTopY - 20, pbW, 17);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(charFootX - pbW * 0.5, headTopY - 20, pbW, 17);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pBadgeText, charFootX, headTopY - 11.5);
    ctx.restore();

    // 7. Top-Right 3D Radar Minimap & Bottom-Left Status Pill
    draw3DRadarMinimapOverlay(ctx, width, height, nextObj);
  }

  // --- Unified 3D Architectural Building Escape Renderer (Dispatches 'FPS_3D' vs 'DIORAMA_3D') ---
  function renderCanvas() {
    const width = cssCanvasW;
    const height = cssCanvasH;
    if (!width || !height || !grid || grid.length < ROWS) return;

    const now = performance.now() * 0.004;
    const st = activeCustomStage || STAGES[currentStageIdx] || STAGES[0];

    if (cameraMode3D === 'FPS_3D') {
      renderFirstPerson3D(width, height, now, st);
      return;
    }

    // Deep atmospheric 3D building backdrop
    const bgGrad = ctx.createRadialGradient(width * 0.5, height * 0.45, 40, width * 0.5, height * 0.5, Math.max(width, height) * 0.75);
    bgGrad.addColorStop(0, '#1e293b');
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const isCloseUp = false;
    const layout = computeDioramaLayout(width, height);
    const { tileSize, wallH, offsetX, offsetY } = layout;
    const boardW = COLS * tileSize;
    const boardH = ROWS * tileSize;
    const sideBevel = Math.max(4, tileSize * 0.16);
    const slabH = Math.max(8, tileSize * 0.28);

    ctx.save();
    ctx.translate(offsetX, offsetY);

    // 0. Draw 3D Architectural Building Plinth / Foundation Slab & Outer Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(-6, -wallH + 10, boardW + sideBevel + 16, boardH + wallH + slabH + 10);

    // Foundation Front Slab
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, boardH, boardW, slabH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(0, boardH, boardW, slabH);

    // Foundation Right 3D Bevel
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.moveTo(boardW, -wallH);
    ctx.lineTo(boardW + sideBevel, -wallH + sideBevel * 0.55);
    ctx.lineTo(boardW + sideBevel, boardH + slabH);
    ctx.lineTo(boardW, boardH + slabH);
    ctx.closePath();
    ctx.fill();

    // 1. Floor Pass: Draw 3D Architectural Room Flooring (Oak Parquet Bedrooms, Ceramic Bathrooms, Checkered Kitchens, Slate Hallways)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * tileSize;
        const y = r * tileSize;
        const even = (c + r) % 2 === 0;
        const isBedroom = r < 4 && c < 5;
        const isBathroom = r < 4 && c >= 5 && c <= 8;
        const isKitchen = r < 4 && c > 8;

        if (isBedroom) {
          // Warm Oak Hardwood Parquet Planks
          ctx.fillStyle = even ? '#4a3728' : '#3f2e21';
          ctx.fillRect(x, y, tileSize, tileSize);
          ctx.strokeStyle = 'rgba(253, 230, 138, 0.12)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y + tileSize * 0.5);
          ctx.lineTo(x + tileSize, y + tileSize * 0.5);
          ctx.stroke();
        } else if (isBathroom) {
          // Clean Aqua Ceramic Bathroom Tiles
          ctx.fillStyle = even ? '#1e3a4c' : '#173040';
          ctx.fillRect(x, y, tileSize, tileSize);
        } else if (isKitchen) {
          // Warm Terracotta Kitchen Checkered Tiles
          ctx.fillStyle = even ? '#432822' : '#36201b';
          ctx.fillRect(x, y, tileSize, tileSize);
        } else {
          // Polished Slate Corridor Stones with Green Photoluminescent Emergency Strip
          ctx.fillStyle = even ? '#283548' : '#202b3b';
          ctx.fillRect(x, y, tileSize, tileSize);
          if (grid[r][c] !== TILE.WALL && (r === 4 || r === 6 || r === 8)) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
            ctx.fillRect(x + tileSize * 0.1, y + tileSize * 0.46, tileSize * 0.8, Math.max(2, tileSize * 0.07));
          }
        }

        // Subtle 3D floor tile bevel
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, tileSize, tileSize);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize * 0.16);

        // 3D Ambient Occlusion Shadows cast by North and West Walls/Furniture
        const northTile = r > 0 ? grid[r - 1][c] : TILE.WALL;
        if (northTile === TILE.WALL || northTile === TILE.FURNITURE || northTile === TILE.DOOR || northTile === TILE.LOCKED_DOOR) {
          const nShadow = ctx.createLinearGradient(x, y, x, y + tileSize * 0.36);
          nShadow.addColorStop(0, 'rgba(2, 6, 23, 0.46)');
          nShadow.addColorStop(1, 'rgba(2, 6, 23, 0)');
          ctx.fillStyle = nShadow;
          ctx.fillRect(x, y, tileSize, tileSize * 0.36);
        }
        const westTile = c > 0 ? grid[r][c - 1] : TILE.WALL;
        if (westTile === TILE.WALL || westTile === TILE.FURNITURE) {
          const wShadow = ctx.createLinearGradient(x, y, x + tileSize * 0.24, y);
          wShadow.addColorStop(0, 'rgba(2, 6, 23, 0.36)');
          wShadow.addColorStop(1, 'rgba(2, 6, 23, 0)');
          ctx.fillStyle = wShadow;
          ctx.fillRect(x, y, tileSize * 0.24, tileSize);
        }
      }
    }

    // 1.3 Draw 3D Floor Footstep Ripples (Visual feedback as the character walks through rooms)
    for (const fp of footsteps3D) {
      const alpha = Math.max(0, (fp.life / fp.maxLife) * 0.55);
      ctx.strokeStyle = player.crouching ? `rgba(52, 211, 153, ${alpha})` : `rgba(56, 189, 248, ${alpha})`;
      ctx.fillStyle = `rgba(15, 23, 42, ${alpha * 0.45})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(fp.x * tileSize, fp.y * tileSize + tileSize * 0.12, tileSize * 0.14, tileSize * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 1.4 Draw Glowing 3D Floor Evacuation Guide Signs
    function drawGuideSignsAndExits(isGlowLayer = false) {
      for (const gs of guideSigns) {
        const gx = (gs.c + 0.5) * tileSize;
        const gy = (gs.r + 0.5) * tileSize;
        ctx.fillStyle = isGlowLayer ? 'rgba(16, 185, 129, 0.55)' : 'rgba(16, 185, 129, 0.28)';
        ctx.fillRect(gx - tileSize * 0.32, gy - tileSize * 0.18, tileSize * 0.64, tileSize * 0.36);
        ctx.strokeStyle = '#34d399';
        ctx.strokeRect(gx - tileSize * 0.32, gy - tileSize * 0.18, tileSize * 0.64, tileSize * 0.36);
        ctx.fillStyle = '#6ee7b7';
        ctx.font = `900 ${Math.floor(tileSize * 0.24)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`🏃${gs.dir}`, gx, gy);
      }
    }
    drawGuideSignsAndExits(false);

    // 1.6 Draw Live Golden 3D Floor Path ([나] ---> [🎯 목표])
    const px = player.x * tileSize;
    const py = player.y * tileSize;
    const nextObj = getNextStepObjective();
    if (nextObj && !player.onFire) {
      const tx = (nextObj.c + 0.5) * tileSize;
      const ty = (nextObj.r + 0.5) * tileSize;
      const distPx = Math.hypot(tx - px, ty - py);
      if (distPx > tileSize * 0.65) {
        ctx.save();
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.82)';
        ctx.lineWidth = Math.max(2.5, tileSize * 0.08);
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -now * 16;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    // 2. Painter's Algorithm Row-by-Row 3D Extrusion Pass (r = 0 .. ROWS - 1)
    const activeSkin = getSelectedSkin();
    const pCol = Math.min(COLS - 1, Math.max(0, Math.floor(player.x)));
    const pRow = Math.min(ROWS - 1, Math.max(0, Math.floor(player.y)));
    const p2Row = Math.min(ROWS - 1, Math.max(0, Math.floor(player2.y)));
    const activelyMoving = (
      keysPressed.up || keysPressed.down || keysPressed.left || keysPressed.right ||
      pointerMoveTarget !== null
    );

    for (let r = 0; r < ROWS; r++) {
      // 2A. Extruded 3D Walls, Doors, Furniture & Escape-Room Fixtures in Row r
      for (let c = 0; c < COLS; c++) {
        const t = grid[r][c];
        const x = c * tileSize;
        const y = r * tileSize;

        if (t === TILE.WALL) {
          // Automatic Smart Cutaway:
          // 1) Front-most south wall (r === ROWS - 1)
          // 2) Wall directly south of a vertical room Door / Locked Door / Debris so doors are 100% visible!
          // 3) Wall directly south of the player in Close-Up 3D mode
          const northT = r > 0 ? grid[r - 1][c] : TILE.WALL;
          const isSouthOfDoor = (
            northT === TILE.DOOR ||
            northT === TILE.OPEN_DOOR ||
            northT === TILE.LOCKED_DOOR ||
            northT === TILE.HOT_DOOR ||
            northT === TILE.DEBRIS ||
            northT === TILE.PARTITION
          );
          const isSouthOfPlayer = (r > pRow && r <= pRow + 2 && Math.abs(c - pCol) <= 2);
          const isCutawayWall = (r === ROWS - 1) || isSouthOfDoor || (isCloseUp && isSouthOfPlayer);
          const curWallH = isCutawayWall ? wallH * 0.16 : wallH;
          const hasRightWall = c < COLS - 1 && grid[r][c + 1] === TILE.WALL;
          const hasBottomWall = r < ROWS - 1 && grid[r + 1][c] === TILE.WALL;
          const bX = Math.max(3, tileSize * 0.14);

          ctx.save();
          if (isSouthOfPlayer && r !== ROWS - 1) {
            ctx.globalAlpha = 0.72;
          }

          // Right 3D depth face when right neighbor is not a wall
          if (!hasRightWall) {
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.moveTo(x + tileSize, y - curWallH);
            ctx.lineTo(x + tileSize + bX, y - curWallH + bX * 0.55);
            ctx.lineTo(x + tileSize + bX, y + tileSize);
            ctx.lineTo(x + tileSize, y + tileSize);
            ctx.closePath();
            ctx.fill();
          }

          // Front 3D Wall Face (Wallpaper + Warm Wooden Wainscoting + Baseboard)
          if (!hasBottomWall) {
            const wallTopY = y - curWallH * 0.28;
            const totalFrontH = tileSize + curWallH * 0.28;
            const frontGrad = ctx.createLinearGradient(x, wallTopY, x, y + tileSize);
            frontGrad.addColorStop(0, '#94a3b8');
            frontGrad.addColorStop(0.58, '#64748b');
            frontGrad.addColorStop(0.59, '#78350f');
            frontGrad.addColorStop(1, '#451a03');
            ctx.fillStyle = frontGrad;
            ctx.fillRect(x, wallTopY, tileSize, totalFrontH);

            // Chair-rail molding line between upper wallpaper and lower wood wainscoting
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, wallTopY + totalFrontH * 0.58);
            ctx.lineTo(x + tileSize, wallTopY + totalFrontH * 0.58);
            ctx.stroke();

            // Dark 3D baseboard at floor junction
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(x, y + tileSize - Math.max(3, tileSize * 0.09), tileSize, Math.max(3, tileSize * 0.09));
          } else {
            ctx.fillStyle = '#475569';
            ctx.fillRect(x, y - curWallH * 0.25, tileSize, tileSize + curWallH * 0.25);
          }

          // Raised 3D Architectural Roof Top Cap with Crown Molding
          const roofH = hasBottomWall ? tileSize : tileSize * 0.76;
          ctx.fillStyle = isCutawayWall ? '#64748b' : '#cbd5e1';
          ctx.fillRect(x, y - curWallH, tileSize, roofH);
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(x + 2, y - curWallH + 2, tileSize - 4, Math.max(3, tileSize * 0.13));
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.50)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y - curWallH, tileSize, roofH);
          ctx.restore();
        } else if (t === TILE.FURNITURE) {
          draw3DFurniturePiece(ctx, x, y, tileSize, wallH, r, c);
        } else if (t === TILE.DOOR || t === TILE.LOCKED_DOOR || t === TILE.HOT_DOOR || t === TILE.OPEN_DOOR) {
          draw3DDoorway(ctx, x, y, tileSize, wallH, t, now);
        } else if (t === TILE.SINK) {
          draw3DSinkFixture(ctx, x, y, tileSize, wallH);
        } else if (t === TILE.DEBRIS) {
          draw3DBox(
            ctx,
            x + tileSize * 0.06,
            y + tileSize * 0.12,
            tileSize * 0.88,
            tileSize * 0.78,
            tileSize * 0.40,
            '#d97706',
            '#713f12',
            '#422006',
            '#fde68a'
          );
          ctx.font = `${Math.floor(tileSize * 0.36)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🪵', x + tileSize * 0.5, y + tileSize * 0.24);
          ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.17))}px "Noto Sans KR", sans-serif`;
          ctx.fillStyle = '#fef08a';
          ctx.fillText('장애물(도끼)', x + tileSize * 0.5, y + tileSize * 0.76);
        } else if (t === TILE.GAS_VALVE) {
          draw3DBox(
            ctx,
            x + tileSize * 0.10,
            y + tileSize * 0.12,
            tileSize * 0.80,
            tileSize * 0.76,
            tileSize * 0.40,
            player.gasClosed ? '#10b981' : '#ef4444',
            player.gasClosed ? '#065f46' : '#991b1b',
            '#022c22',
            '#fca5a5'
          );
          ctx.font = `${Math.floor(tileSize * 0.36)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(player.gasClosed ? '✅' : '🔴', x + tileSize * 0.5, y + tileSize * 0.24);
          ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.17))}px "Noto Sans KR", sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText('가스밸브', x + tileSize * 0.5, y + tileSize * 0.76);
        } else if (t === TILE.BREAKER) {
          draw3DBox(
            ctx,
            x + tileSize * 0.10,
            y + tileSize * 0.12,
            tileSize * 0.80,
            tileSize * 0.76,
            tileSize * 0.42,
            player.breakerClosed ? '#10b981' : '#3b82f6',
            player.breakerClosed ? '#065f46' : '#1e3a8a',
            '#172554',
            '#93c5fd'
          );
          ctx.font = `${Math.floor(tileSize * 0.36)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(player.breakerClosed ? '✅' : '⚡', x + tileSize * 0.5, y + tileSize * 0.24);
          ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.17))}px "Noto Sans KR", sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText('차단기', x + tileSize * 0.5, y + tileSize * 0.76);
        } else if (t === TILE.PHONE_119) {
          draw3DBox(
            ctx,
            x + tileSize * 0.10,
            y + tileSize * 0.12,
            tileSize * 0.80,
            tileSize * 0.76,
            tileSize * 0.40,
            metrics.called119 ? '#10b981' : '#a855f7',
            metrics.called119 ? '#065f46' : '#581c87',
            '#3b0764',
            '#e9d5ff'
          );
          ctx.font = `${Math.floor(tileSize * 0.36)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('📞', x + tileSize * 0.5, y + tileSize * 0.24);
          ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.17))}px "Noto Sans KR", sans-serif`;
          ctx.fillStyle = '#f3e8ff';
          ctx.fillText('119신고', x + tileSize * 0.5, y + tileSize * 0.76);
        } else if (t === TILE.LIFELINE) {
          draw3DBox(
            ctx,
            x + tileSize * 0.06,
            y + tileSize * 0.10,
            tileSize * 0.88,
            tileSize * 0.80,
            wallH * 0.82,
            '#2dd4bf',
            '#0f766e',
            '#134e4a',
            '#99f6e4'
          );
          ctx.font = `${Math.floor(tileSize * 0.36)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🪢', x + tileSize * 0.5, y + tileSize * 0.22);
          ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.18))}px "Noto Sans KR", sans-serif`;
          ctx.fillStyle = '#ccfbf1';
          ctx.fillText('완강기', x + tileSize * 0.5, y + tileSize * 0.76);
        } else if (t === TILE.PARTITION) {
          draw3DBox(
            ctx,
            x + tileSize * 0.06,
            y + tileSize * 0.10,
            tileSize * 0.88,
            tileSize * 0.80,
            wallH * 0.82,
            '#facc15',
            '#854d0e',
            '#422006',
            '#fef08a'
          );
          ctx.font = `${Math.floor(tileSize * 0.36)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🧱', x + tileSize * 0.5, y + tileSize * 0.22);
          ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.17))}px "Noto Sans KR", sans-serif`;
          ctx.fillStyle = '#fef08a';
          ctx.fillText('경량칸막이', x + tileSize * 0.5, y + tileSize * 0.76);
        } else if (t === TILE.HAZARD) {
          const pulse = 0.65 + 0.35 * Math.sin(now * 4);
          draw3DBox(
            ctx,
            x + tileSize * 0.08,
            y + tileSize * 0.12,
            tileSize * 0.84,
            tileSize * 0.76,
            tileSize * 0.38,
            '#fbbf24',
            `rgba(217, 119, 6, ${pulse})`,
            '#78350f',
            '#fef08a'
          );
          ctx.font = `${Math.floor(tileSize * 0.38)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚠️', x + tileSize * 0.5, y + tileSize * 0.24);
          ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.17))}px "Noto Sans KR", sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText('위험요소', x + tileSize * 0.5, y + tileSize * 0.76);
        } else if (t === TILE.ALARM_BELL) {
          draw3DBox(
            ctx,
            x + tileSize * 0.10,
            y + tileSize * 0.12,
            tileSize * 0.80,
            tileSize * 0.76,
            tileSize * 0.40,
            player.alarmRung ? '#10b981' : '#facc15',
            player.alarmRung ? '#065f46' : '#991b1b',
            '#450a0a',
            '#fef08a'
          );
          ctx.font = `${Math.floor(tileSize * 0.36)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🔔', x + tileSize * 0.5, y + tileSize * 0.24);
          ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.17))}px "Noto Sans KR", sans-serif`;
          ctx.fillStyle = '#fef08a';
          ctx.fillText('비상벨', x + tileSize * 0.5, y + tileSize * 0.76);
        } else if (t === TILE.ELEVATOR) {
          draw3DBox(
            ctx,
            x + tileSize * 0.06,
            y + tileSize * 0.08,
            tileSize * 0.88,
            tileSize * 0.84,
            wallH * 0.90,
            '#52525b',
            '#27272a',
            '#18181b',
            '#ef4444'
          );
          ctx.font = `${Math.floor(tileSize * 0.34)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🛗', x + tileSize * 0.5, y + tileSize * 0.20);
          ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.17))}px "Noto Sans KR", sans-serif`;
          ctx.fillStyle = '#fca5a5';
          ctx.fillText('승강기금지', x + tileSize * 0.5, y + tileSize * 0.78);
        } else if (t === TILE.EXIT) {
          draw3DExitPortal(ctx, x, y, tileSize, wallH, now);
        }
      }

      // 2B. 3D Floating Pickup Items & Trapped Human NPCs in Row r
      for (const it of items) {
        if (it.r !== r) continue;
        const ix = (it.c + 0.5) * tileSize;
        const baseY = (it.r + 0.58) * tileSize;
        const bob = Math.sin(now * 2.4 + it.c) * 3;
        const iy = baseY - tileSize * 0.28 + bob;

        // 3D Floor Shadow & Pedestal Ring
        ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
        ctx.beginPath();
        ctx.ellipse(ix, baseY + tileSize * 0.08, tileSize * 0.28, tileSize * 0.13, 0, 0, Math.PI * 2);
        ctx.fill();

        if (it.type === 'npc') {
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(ix, baseY + tileSize * 0.08, tileSize * 0.30, tileSize * 0.14, 0, 0, Math.PI * 2);
          ctx.stroke();
          drawHumanCharacter(ctx, ix, baseY + tileSize * 0.08, tileSize * 0.88, {
            crouching: true,
            moving: false,
            now: now + it.c,
            dirX: -1,
            dirY: 0,
            skinId: 'npc'
          });
        } else {
          // 3D Extruded Supply Pedestal + Floating Item Orb
          const ringColor = it.type === 'toy' ? '#fb7185' : (it.type === 'dog' ? '#4ade80' : (it.type === 'key' ? '#facc15' : '#38bdf8'));
          draw3DBox(
            ctx,
            ix - tileSize * 0.22,
            baseY - tileSize * 0.06,
            tileSize * 0.44,
            tileSize * 0.20,
            tileSize * 0.14,
            '#334155',
            '#1e293b',
            '#0f172a',
            ringColor
          );
          ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
          ctx.beginPath();
          ctx.arc(ix, iy, tileSize * 0.29, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = ringColor;
          ctx.lineWidth = 2.2;
          ctx.stroke();

          ctx.font = `${Math.floor(tileSize * 0.38)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(it.icon, ix, iy);
        }

        const shortName = (it.name || '').split('(')[0].trim();
        if (shortName) {
          ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.19))}px "Noto Sans KR", sans-serif`;
          const tw = ctx.measureText(shortName).width + 6;
          const th = Math.max(11, Math.floor(tileSize * 0.23));
          ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
          ctx.fillRect(ix - tw / 2, baseY + tileSize * 0.06, tw, th);
          ctx.fillStyle = '#f0f9ff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(shortName, ix, baseY + tileSize * 0.06 + th / 2);
        }
      }

      // 2C. 3D Volumetric Flame Pillars in Row r
      for (const f of fires) {
        if (f.r !== r) continue;
        const fx = (f.c + 0.5) * tileSize;
        const fy = (f.r + 0.55) * tileSize;
        const flicker = 0.85 + 0.2 * Math.sin(now * 3.8 + f.phase);
        const grad = ctx.createRadialGradient(fx, fy - tileSize * 0.18, tileSize * 0.08, fx, fy, tileSize * 0.65 * flicker);
        if (f.fireType === 'electric') {
          grad.addColorStop(0, 'rgba(191, 219, 254, 0.95)');
          grad.addColorStop(0.5, 'rgba(59, 130, 246, 0.70)');
          grad.addColorStop(1, 'rgba(37, 99, 235, 0)');
        } else if (f.fireType === 'oil') {
          grad.addColorStop(0, 'rgba(253, 224, 71, 0.95)');
          grad.addColorStop(0.5, 'rgba(217, 119, 6, 0.75)');
          grad.addColorStop(1, 'rgba(180, 83, 9, 0)');
        } else {
          grad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
          grad.addColorStop(0.5, 'rgba(249, 115, 22, 0.72)');
          grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(fx, fy - tileSize * 0.12, tileSize * 0.65 * flicker, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `${Math.floor(tileSize * 0.54 * flicker)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔥', fx, fy - tileSize * 0.16);

        if (f.fireType === 'oil' || f.fireType === 'electric') {
          ctx.font = `${Math.floor(tileSize * 0.28)}px sans-serif`;
          ctx.fillText(f.fireType === 'oil' ? '🍳' : '⚡', fx + tileSize * 0.24, fy - tileSize * 0.36);
        }
      }

      // 2D. Realistic Articulated Human Player 1 ('나') & Rescued Companions in Row r
      if (pRow === r) {
        const pRad = 0.32 * tileSize;
        const footY = py + tileSize * 0.16;

        // 3D Volumetric Flashlight Cone in Player's Facing Direction (F key / Top Button)
        if (flashlightSpotEnabled || player.hasFlashlight) {
          ctx.save();
          const fAngle = Math.atan2(player.dirY || 0, player.dirX || 1);
          const coneLen = tileSize * (player.hasFlashlight ? 2.6 : 1.9);
          const coneGrad = ctx.createRadialGradient(px, py - tileSize * 0.18, tileSize * 0.1, px, py - tileSize * 0.18, coneLen);
          coneGrad.addColorStop(0, 'rgba(254, 249, 195, 0.38)');
          coneGrad.addColorStop(0.6, 'rgba(253, 224, 71, 0.16)');
          coneGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
          ctx.fillStyle = coneGrad;
          ctx.beginPath();
          ctx.moveTo(px, py - tileSize * 0.18);
          ctx.arc(px, py - tileSize * 0.18, coneLen, fAngle - 0.42, fAngle + 0.42);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // 3D Floor Shadow & Glowing Safety Ring under Player
        ctx.fillStyle = 'rgba(2, 6, 23, 0.68)';
        ctx.beginPath();
        ctx.ellipse(px, footY, pRad * 1.15, pRad * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = player.onFire ? '#ef4444' : (player.crouching ? '#10b981' : '#fde047');
        ctx.lineWidth = 2.2;
        ctx.stroke();

        if (player.wetTowel || player.hasMask) {
          ctx.strokeStyle = player.hasMask ? 'rgba(45, 212, 191, 0.92)' : 'rgba(56, 189, 248, 0.90)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.ellipse(px, footY, pRad * 1.38, pRad * 0.58, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        if (player.rescuedDog) {
          const dogX = px - player.dirX * tileSize * 0.55;
          const dogY = py - player.dirY * tileSize * 0.55 - tileSize * 0.14;
          ctx.font = `${Math.floor(tileSize * 0.38)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🐶', dogX, dogY);
        }
        if (player.rescuedNpcs > 0) {
          const npcX = px - player.dirX * tileSize * 0.78;
          const npcY = footY - player.dirY * tileSize * 0.65;
          drawHumanCharacter(ctx, npcX, npcY, tileSize * 0.85, {
            crouching: player.crouching,
            moving: activelyMoving,
            now: now + 0.6,
            dirX: player.dirX,
            dirY: player.dirY,
            skinId: 'npc',
            wetTowel: player.wetTowel
          });
        }

        const rightTool = player.extinguisherCharges > 0
          ? 'extinguisher'
          : (player.hasAxe ? 'axe' : (player.waterCharges > 0 ? 'bucket' : (player.hasFlashlight ? 'flashlight' : 'none')));
        const humanH = tileSize * 1.06;
        drawHumanCharacter(ctx, px, footY, humanH, {
          crouching: player.crouching,
          moving: activelyMoving,
          now,
          dirX: player.dirX,
          dirY: player.dirY,
          skinId: activeSkin.id || 'student',
          wetTowel: player.wetTowel,
          hasTowel: player.hasTowel,
          hasMask: player.hasMask,
          rightTool,
          onFire: player.onFire
        });

        // Bold '나' 3D Floating Tag above Human Head
        ctx.save();
        const meTag = isCoopMode ? '1P 나' : (isCloseUp ? (player.crouching ? '나 · 🧎낮은자세' : '나') : '나');
        ctx.font = `900 ${Math.max(10, Math.floor(tileSize * 0.21))}px "Noto Sans KR", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const mw = ctx.measureText(meTag).width + 10;
        const mh = Math.max(14, Math.floor(tileSize * 0.26));
        const headTopY = footY - (player.crouching ? humanH * 0.78 : humanH * 0.96);
        const my = Math.max(mh / 2 - wallH, headTopY - mh / 2 - 4);
        ctx.fillStyle = player.crouching ? '#059669' : '#2563eb';
        ctx.fillRect(px - mw / 2, my - mh / 2, mw, mh);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px - mw / 2, my - mh / 2, mw, mh);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(meTag, px, my);
        ctx.restore();
      }

      if (isCoopMode && p2Row === r) {
        const p2x = player2.x * tileSize;
        const p2y = player2.y * tileSize + tileSize * 0.16;
        drawHumanCharacter(ctx, p2x, p2y, tileSize * 0.98, {
          crouching: player2.crouching,
          moving: keysPressed2.up || keysPressed2.down || keysPressed2.left || keysPressed2.right,
          now: now + 1.2,
          dirX: player2.dirX,
          dirY: player2.dirY,
          skinId: 'p2'
        });
      }

      // 2E. 3D Elevated Ceiling Smoke Plumes in Row r (Floating near roof level)
      for (const s of smokes) {
        if (s.r !== r) continue;
        const sx = (s.c + 0.5) * tileSize;
        const sy = (s.r + 0.5) * tileSize - wallH * 0.55;
        const wobble = Math.sin(now + s.phase) * tileSize * 0.06;
        const grad = ctx.createRadialGradient(sx + wobble, sy, tileSize * 0.08, sx, sy, tileSize * 0.66);
        grad.addColorStop(0, 'rgba(100, 116, 139, 0.72)');
        grad.addColorStop(1, 'rgba(30, 41, 59, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, tileSize * 0.66, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `${Math.floor(tileSize * 0.34)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💨', sx + wobble, sy);
      }
    }

    // 2.8 Draw Floating 3D Architectural Room Header Badges (Above 3D Roofs/Furniture)
    if (Array.isArray(st.roomLabels)) {
      ctx.save();
      ctx.font = `bold ${Math.max(10, Math.floor(tileSize * 0.22))}px "Noto Sans KR", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const rl of st.roomLabels) {
        const rx = rl.c * tileSize;
        const ry = rl.r * tileSize - wallH * 0.72;
        const textW = ctx.measureText(rl.text).width + 10;
        const pillH = Math.max(14, Math.floor(tileSize * 0.32));
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(rx - textW / 2, ry - pillH / 2, textW, pillH);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx - textW / 2, ry - pillH / 2, textW, pillH);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(rl.text, rx, ry);
      }
      ctx.restore();
    }

    // 3. Draw Extinguisher / Water Particles in 3D Space
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color === '#60a5fa'
        ? `rgba(96, 165, 250, ${alpha})`
        : `rgba(224, 242, 254, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x * tileSize, p.y * tileSize - tileSize * 0.22, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Touch Target Ring
    if (pointerMoveTarget) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pointerMoveTarget.x * tileSize, pointerMoveTarget.y * tileSize, tileSize * 0.22, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Radial Fog-of-War on Dark Stage (Stage 5) or 3D Flashlight Cone
    const pRad = 0.32 * tileSize;
    const auraRadius = tileSize * (player.hasFlashlight ? 4.8 : 2.3);
    if (st.isDarkStage) {
      const innerClear = player.hasFlashlight ? tileSize * 2.2 : tileSize * 0.9;
      const darkOverlay = ctx.createRadialGradient(px, py - tileSize * 0.2, innerClear, px, py - tileSize * 0.2, auraRadius);
      darkOverlay.addColorStop(0, player.hasFlashlight ? 'rgba(254, 240, 138, 0.08)' : 'rgba(2, 6, 23, 0.1)');
      darkOverlay.addColorStop(0.65, 'rgba(2, 6, 23, 0.64)');
      darkOverlay.addColorStop(1, player.hasFlashlight ? 'rgba(2, 6, 23, 0.78)' : 'rgba(2, 6, 23, 0.90)');
      ctx.fillStyle = darkOverlay;
      ctx.fillRect(-10, -wallH - 10, boardW + sideBevel + 20, boardH + wallH + slabH + 20);
      drawGuideSignsAndExits(true);
    } else {
      const aura = ctx.createRadialGradient(px, py - tileSize * 0.2, pRad * 0.4, px, py - tileSize * 0.2, auraRadius);
      aura.addColorStop(0, player.hasFlashlight ? 'rgba(254, 240, 138, 0.22)' : 'rgba(255, 255, 255, 0.12)');
      aura.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(px, py - tileSize * 0.2, auraRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Floating 3D Objective Target Highlight & Badge (Always Visible Above 3D Walls)
    if (nextObj && !player.onFire) {
      const tx = (nextObj.c + 0.5) * tileSize;
      const ty = (nextObj.r + 0.5) * tileSize;
      const ringPulse = 0.40 + 0.08 * Math.sin(now * 4);
      ctx.save();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(tx, ty - tileSize * 0.15, tileSize * ringPulse, 0, Math.PI * 2);
      ctx.stroke();

      const bounceY = Math.sin(now * 4) * 3;
      ctx.font = `bold ${Math.max(10, Math.floor(tileSize * 0.23))}px "Noto Sans KR", sans-serif`;
      const badgeLabel = nextObj.label || '🎯 목표';
      const bw = ctx.measureText(badgeLabel).width + 10;
      const bh = Math.max(15, Math.floor(tileSize * 0.32));
      const by = Math.max(-wallH + bh / 2, ty - wallH - tileSize * 0.32 + bounceY);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(tx - bw / 2, by - bh / 2, bw, bh);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tx - bw / 2, by - bh / 2, bw, bh);
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeLabel, tx, by);
      ctx.restore();
    }

    // 7. Floating 3D Combat/Score Texts
    for (const ft of floatTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `bold ${Math.max(11, Math.floor(tileSize * 0.26))}px 'Noto Sans KR', sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x * tileSize, ft.y * tileSize - wallH * 0.6);
      ctx.restore();
    }

    ctx.restore();

    // 8. When in Close-Up 3D Interior Follow-Cam ('FPS_3D'), draw the Top-Right Building Radar Minimap & Status Pill
    if (isCloseUp) {
      draw3DRadarMinimapOverlay(ctx, width, height, nextObj);
    }
  }

  // --- Main Animation Loop ---
  function gameLoop(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const rawDeltaMs = Math.max(0, timestamp - lastFrameTime);
    const dt = Math.min(0.05, rawDeltaMs / 1000);
    lastFrameTime = timestamp;

    if (isPerfDiagEnabled && rawDeltaMs > 0 && rawDeltaMs < 500) {
      perfFrameTimes.push(rawDeltaMs);
      if (perfFrameTimes.length > 120) perfFrameTimes.shift();
      if (rawDeltaMs > 33.3) perfLongFrames++;
      perfUiTimer += dt;
      if (perfUiTimer >= 0.25) {
        perfUiTimer = 0;
        const avgMs = perfFrameTimes.reduce((a, b) => a + b, 0) / (perfFrameTimes.length || 1);
        const fps = Math.min(120, Math.round(1000 / Math.max(1, avgMs)));
        const sorted = [...perfFrameTimes].sort((a, b) => a - b);
        const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
        const p95Ms = sorted[p95Idx] || avgMs;
        const perfMetricsEl = document.getElementById('perfMetricsText');
        if (perfMetricsEl) {
          perfMetricsEl.textContent = `FPS: ${fps} | p95: ${p95Ms.toFixed(1)}ms | LongFrames: ${perfLongFrames}`;
        }
      }
    }

    const notebookEl = document.getElementById('notebookModal');
    const isReadingNotebook = notebookEl && !notebookEl.classList.contains('hidden');
    if (gameState === 'PLAYING' || isReadingNotebook) {
      updateGame(dt);
    }
    renderCanvas();

    animFrameId = requestAnimationFrame(gameLoop);
  }

  // --- Landscape-Only Mode & Smartphone Portrait '가로로 돌려주세요' Prompt ---
  const rotateNoticeOverlay = document.getElementById('rotateNoticeOverlay');
  const btnForceLandscapeFallback = document.getElementById('btnForceLandscapeFallback');
  const btnHomeMain = document.getElementById('btnHomeMain');
  const btnMainGuide = document.getElementById('btnMainGuide');
  const btnLandscapeToggle = document.getElementById('btnLandscapeToggle');
  const landscapeToggleText = document.getElementById('landscapeToggleText');
  let userForceRotateFallback = false;

  function syncViewportOrientation() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    document.documentElement.style.setProperty('--vp-w', `${vw}px`);
    document.documentElement.style.setProperty('--vp-h', `${vh}px`);

    const isPortraitViewport = vw < vh;
    if (!isPortraitViewport) {
      userForceRotateFallback = false;
    }

    // Always run in horizontal console layout (가로 모드 전용)
    document.body.classList.add('landscape-console');
    document.body.classList.toggle('is-portrait-viewport', isPortraitViewport);

    const showPortraitNotice = isPortraitViewport && !userForceRotateFallback;
    const enableForceRotation = isPortraitViewport && userForceRotateFallback;
    document.body.classList.toggle('force-landscape', enableForceRotation);

    if (rotateNoticeOverlay) {
      if (showPortraitNotice) {
        rotateNoticeOverlay.classList.remove('hidden');
        rotateNoticeOverlay.classList.add('flex');
      } else {
        rotateNoticeOverlay.classList.add('hidden');
        rotateNoticeOverlay.classList.remove('flex');
      }
    }

    if (landscapeToggleText) {
      landscapeToggleText.textContent = '가로전용';
    }
  }

  function resizeCanvas() {
    syncViewportOrientation();
    const q = appSettings ? appSettings.graphicsQuality : 'auto';
    const maxDpr = q === 'low' ? 1 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

    canvasContainer.style.height = '';
    const availW = canvasContainer.clientWidth || Math.max(280, Math.max(window.innerWidth, window.innerHeight) - 290);
    const availH = canvasContainer.clientHeight || Math.max(200, Math.min(window.innerWidth, window.innerHeight) - 52);
    cssCanvasW = Math.max(240, Math.floor(availW));
    cssCanvasH = Math.max(180, Math.floor(availH));

    canvas.style.width = cssCanvasW + 'px';
    canvas.style.height = cssCanvasH + 'px';
    canvas.width = Math.floor(cssCanvasW * dpr);
    canvas.height = Math.floor(cssCanvasH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (appSettings && typeof appSettings.brightness === 'number') {
      canvas.style.filter = appSettings.brightness !== 100 ? `brightness(${appSettings.brightness}%)` : '';
    }
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

  // --- 3D Tactical Flashlight Toggle (PRD F05 & Section 5: F Key / Top Button) ---
  const btnFlashlightTop = document.getElementById('btnFlashlightTop');
  function toggle3DFlashlight() {
    SoundFX.init();
    flashlightSpotEnabled = !flashlightSpotEnabled;
    if (flashlightSpotEnabled) {
      player.hasFlashlight = true;
      SoundFX.pickup();
      showToast('🔦 [3D 손전등 스포트라이트 ON] 전방 원뿔 조명으로 어두운 복도와 벽면 단서를 밝힙니다!', 'border-amber-400');
    } else {
      SoundFX.playTone(380, 'sine', 0.05, 0.06);
      showToast('🔦 [3D 손전등 OFF] 손전등 스포트라이트를 껐습니다. (F키 또는 상단 버튼으로 재점등)', 'border-slate-500');
    }
    if (btnFlashlightTop) {
      btnFlashlightTop.className = flashlightSpotEnabled
        ? 'px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-amber-500/30 hover:bg-amber-500/40 border border-amber-300 text-[10px] sm:text-xs font-extrabold text-amber-100 transition shrink-0'
        : 'px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] sm:text-xs font-extrabold text-slate-400 transition shrink-0';
    }
    updateHUD();
    renderCanvas();
  }
  if (btnFlashlightTop) {
    btnFlashlightTop.addEventListener('click', toggle3DFlashlight);
  }

  // --- Direct Canvas Touch / Pointer Support + PRD Section 5 & 10 3D Drag-to-Look Rotation ---
  let canvasPointerDown = false;
  let canvasDragStartX = 0;
  let canvasDragStartY = 0;
  let canvasLastClientX = 0;
  let canvasIsDraggingLook = false;

  function isClientPointIn3DRadarMinimap(clientX, clientY) {
    if (cameraMode3D !== 'FPS_3D') return false;
    const local = window.getElementLocalCoords(canvas, clientX, clientY);
    const mapW = Math.min(165, Math.max(115, local.width * 0.22));
    const mapH = mapW * (ROWS / COLS);
    const mapX = local.width - mapW - 10;
    const mapY = 10;
    return local.x >= mapX && local.x <= mapX + mapW && local.y >= mapY && local.y <= mapY + mapH;
  }

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

      if (distToTap <= 1.85) {
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
        if (tappedTile === TILE.FURNITURE && typeof openPuzzleModalFn === 'function') {
          pointerMoveTarget = null;
          const stationKind = (r + c * 3) % 3;
          const tab = stationKind === 1 ? 'safe' : (stationKind === 2 ? (!bookSortSolved ? 'books' : 'dirlock') : 'safe');
          openPuzzleModalFn(tab);
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
    canvasDragStartX = e.clientX;
    canvasDragStartY = e.clientY;
    canvasLastClientX = e.clientX;
    canvasIsDraggingLook = false;
    handleCanvasPointer(e.clientX, e.clientY, true);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!canvasPointerDown || gameState !== 'PLAYING') return;
    if (cameraMode3D === 'FPS_3D' && !isClientPointIn3DRadarMinimap(e.clientX, e.clientY)) {
      const totalDx = e.clientX - canvasDragStartX;
      const totalDy = e.clientY - canvasDragStartY;
      if (Math.abs(totalDx) > 9 && Math.abs(totalDx) > Math.abs(totalDy) * 0.8) {
        canvasIsDraggingLook = true;
      }
      if (canvasIsDraggingLook) {
        const stepDx = e.clientX - canvasLastClientX;
        canvasLastClientX = e.clientX;
        const sensMult = Math.max(0.6, Math.min(1.4, ((appSettings && appSettings.sensitivity) || 100) / 100));
        fpsCamYaw += (stepDx / Math.max(240, cssCanvasW)) * 2.6 * sensMult;
        player.dirX = Math.cos(fpsCamYaw);
        player.dirY = Math.sin(fpsCamYaw);
        pointerMoveTarget = null;
        return;
      }
    }
    canvasLastClientX = e.clientX;
    handleCanvasPointer(e.clientX, e.clientY, false);
  });

  window.addEventListener('pointerup', () => {
    canvasPointerDown = false;
    canvasIsDraggingLook = false;
    pointerMoveTarget = null;
  });

  window.addEventListener('pointercancel', () => {
    canvasPointerDown = false;
    canvasIsDraggingLook = false;
    pointerMoveTarget = null;
  });

  // --- Keyboard Controls ---
  window.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
      if (e.code === 'Escape') document.activeElement.blur();
      return;
    }

    const nbModal = document.getElementById('notebookModal');
    const pzModal = document.getElementById('puzzleModal');
    const stModal = document.getElementById('settingsModal');
    if (nbModal && !nbModal.classList.contains('hidden')) {
      if ((e.code === 'Escape' || e.code === 'KeyH' || e.code === 'KeyI') && !e.repeat) {
        e.preventDefault();
        if (typeof closeNotebookModalFn === 'function') closeNotebookModalFn();
      }
      return;
    }
    if (pzModal && !pzModal.classList.contains('hidden')) {
      if (e.code === 'Escape' && !e.repeat) {
        e.preventDefault();
        if (typeof closePuzzleModalFn === 'function') closePuzzleModalFn();
      }
      return;
    }
    if (stModal && !stModal.classList.contains('hidden')) {
      if (e.code === 'Escape' && !e.repeat) {
        e.preventDefault();
        if (typeof closeSettingsModalFn === 'function') closeSettingsModalFn();
      }
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
      if (gameState === 'PLAYING') {
        if (player.onFire) {
          performStopDropRoll();
        } else if (!e.repeat) {
          toggle3DFlashlight();
        }
      }
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
    if (e.code === 'KeyV' && !e.repeat) {
      if (gameState === 'PLAYING') {
        toggleCamera3DMode();
      }
    }
    if (e.code === 'KeyH' && !e.repeat) {
      if (gameState === 'PLAYING' || gameState === 'PAUSED') {
        e.preventDefault();
        if (typeof openNotebookModalFn === 'function') openNotebookModalFn('clues');
      }
    }
    if (e.code === 'KeyI' && !e.repeat) {
      if (gameState === 'PLAYING' || gameState === 'PAUSED') {
        e.preventDefault();
        if (typeof openNotebookModalFn === 'function') openNotebookModalFn('inv');
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

  if (btnForceLandscapeFallback) {
    btnForceLandscapeFallback.addEventListener('click', () => {
      SoundFX.init();
      userForceRotateFallback = true;
      if (screen.orientation && typeof screen.orientation.lock === 'function') {
        try {
          screen.orientation.lock('landscape').catch(() => {});
        } catch (e) {}
      }
      resizeCanvas();
      showToast('📱 화면 회전 잠금 상태에서도 플레이할 수 있도록 가로 화면으로 전환했습니다!');
    });
  }

  function showMainTitleScreen() {
    if (gameState === 'PLAYING' && elapsedSeconds > 0 && typeof saveCampaignState === 'function') {
      saveCampaignState();
    }
    clearAllInputStates();
    gameState = 'START';
    overlayIcon.textContent = '🔥';
    overlaySubtitle.textContent = '2022 개정 교육과정 연계 · 3D 방탈출 화재 안전 게임';
    overlayTitle.textContent = '화재 탈출 넘버원 3D';
    overlayDesc.innerHTML = '불타는 다중 미로 건물 속에서 <strong>젖은 수건·열쇠·소방도끼·차단기 퍼즐</strong>을 풀고 고립된 가족과 친구를 구출해 <strong>비상구(EXIT)</strong>로 탈출하는 3D 방탈출 게임입니다.';
    overlayTipsBox.classList.remove('hidden');
    overlayStats.classList.add('hidden');
    overlayStats.classList.remove('grid');
    debriefReportBox.classList.add('hidden');
    const worldBar = document.getElementById('worldSelectBar');
    if (worldBar) worldBar.classList.remove('hidden');
    if (typeof selectWorldCard === 'function') selectWorldCard('fire');
    if (typeof syncContinueButtonUI === 'function') syncContinueButtonUI();
    if (btnMainGuide) btnMainGuide.classList.remove('hidden');
    btnOpenCertFromOverlay.classList.remove('hidden');
    btnSecondaryAction.classList.add('hidden');
    btnPrimaryAction.textContent = '▶️ 게임 시작하기';
    gameOverlay.classList.remove('hidden');
    overlaySelectedIndex = 0;
    setTimeout(updateOverlaySelectionUI, 20);
  }

  if (btnHomeMain) {
    btnHomeMain.addEventListener('click', () => {
      SoundFX.init();
      if (moreToolsDrawer) {
        moreToolsDrawer.classList.add('hidden');
        moreToolsDrawer.classList.remove('flex');
      }
      showMainTitleScreen();
    });
  }

  if (btnMainGuide) {
    btnMainGuide.addEventListener('click', () => {
      if (btnGuide) btnGuide.click();
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
      const local = window.getElementLocalCoords(dpadPad, clientX, clientY);
      const cx = local.width / 2;
      const cy = local.height / 2;
      const dx = local.x - cx;
      const dy = local.y - cy;
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
    const nbModal = document.getElementById('notebookModal');
    const pzModal = document.getElementById('puzzleModal');
    const stModal = document.getElementById('settingsModal');
    [eduModal, mapEditorModal, certModal, guideModal, classModal, teacherModal, nbModal, pzModal, stModal, moreToolsDrawer].forEach((m) => {
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

    // Feature 7: 8-Building Stage Completion Stamp Board (7 Campaign Stages + Daily Challenge)
    const stageStampGrid = document.getElementById('stageStampGrid');
    const stageStampCountBadge = document.getElementById('stageStampCountBadge');
    const stampDefs = [
      ...STAGES.map((stItem, idx) => ({
        key: `s${idx}`,
        icon: ['🏡', '🏢', '🏬', '🏫', '🚇', '🔍', '🏕️'][idx] || '🏢',
        shortName: stItem.name.replace(/^\d+단계:\s*/, '').replace(/^사전예방:\s*/, '예방:').split('[')[0].trim()
      })),
      { key: 'daily', icon: '🎲', shortName: '오늘의 119 챌린지' }
    ];
    const clearedCount = stampDefs.reduce((acc, d) => acc + (clearedStages[d.key] ? 1 : 0), 0);
    if (stageStampCountBadge) {
      stageStampCountBadge.textContent = `${clearedCount} / ${stampDefs.length} 완주`;
    }
    if (stageStampGrid) {
      stageStampGrid.innerHTML = stampDefs.map((d) => {
        const isCleared = !!clearedStages[d.key];
        return `<div class="p-2 rounded-xl border ${isCleared ? 'bg-emerald-950/50 border-emerald-400/60 text-white' : 'bg-slate-950/40 border-slate-800 text-slate-500'} flex flex-col items-center gap-0.5 relative">
          <span class="text-lg ${isCleared ? '' : 'grayscale opacity-40'}">${d.icon}</span>
          <span class="text-[10px] font-extrabold ${isCleared ? 'text-emerald-300' : 'text-slate-500'} truncate max-w-full">${d.shortName}</span>
          <span class="text-[9px] font-black px-1.5 py-0.2 rounded ${isCleared ? 'bg-rose-500/30 text-rose-200 border border-rose-400/50' : 'bg-slate-800 text-slate-500'}">${isCleared ? '💮 완주도장' : '미클리어'}</span>
        </div>`;
      }).join('');
    }
  }

  function downloadCertificatePng() {
    SoundFX.init();
    const cleanName = (studentNameInput.value || '').trim() || '용감한 어린이';
    const best = Math.max(score, getSavedBestScore());
    const unlockedCount = getUnlockedBadgeCount();
    const clearedCount = ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 'daily'].reduce((acc, k) => acc + (clearedStages[k] ? 1 : 0), 0);
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
    cctx.font = 'bold 16px "Noto Sans KR", sans-serif';
    cctx.fillText(`소속: ${clsText}  |  최고점수: ${best.toLocaleString()}점  |  배지: ${unlockedCount}/${BADGE_DEFS.length}개  |  완주도장: ${clearedCount}/${STAGES.length}곳`, 450, 229);

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
    if (teacherQrClassInput && currentClassCode && !teacherQrClassInput.value) {
      teacherQrClassInput.value = currentClassCode;
    }
    if (typeof renderTeacherPresetQr === 'function') renderTeacherPresetQr();
    if (typeof renderBriefingSlide === 'function') renderBriefingSlide();
    if (typeof updateSchoolRecordText === 'function') updateSchoolRecordText();
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
      STAGES.forEach((_, idx) => {
        clearedStages[`s${idx}`] = true;
      });
      clearedStages.daily = true;
      try {
        localStorage.setItem('fire_escape_badges', JSON.stringify(unlockedBadges));
        localStorage.setItem(CLEARED_STAGES_KEY, JSON.stringify(clearedStages));
      } catch (e) {}
      SoundFX.win();
      updateHUD();
      showToast('🔓 [교사 시연 모드] 안전 배지 10종, 직업 스킨 4종, 8대 건물 완주 도장이 모두 해금되었습니다!', 'border-amber-400');
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
      if (selectedWorldId !== 'fire') {
        SoundFX.warning();
        showToast('🔒 선택한 세계관은 [콘셉트 미리보기] 상태입니다. [🔥 화재 탈출 넘버원]을 선택해 입장하세요!', 'border-amber-400');
        return;
      }
      if (typeof backupCurrentCampaignSave === 'function') {
        backupCurrentCampaignSave();
      }
      loadStage(currentStageIdx, true, activeCustomStage);
      gameOverlay.classList.add('hidden');
      gameState = 'PLAYING';
      if (typeof saveCampaignState === 'function') saveCampaignState();
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
      if (typeof saveCampaignState === 'function') saveCampaignState();
      SoundFX.siren();
      SoundFX.speak(`${STAGES[currentStageIdx].name} 대피를 시작합니다.`);
      showToast(`🚩 ${STAGES[currentStageIdx].name}! ${STAGES[currentStageIdx].mission}`);
    } else if (gameState === 'GAME_OVER') {
      score = stageStartScore;
      loadStage(currentStageIdx, false, activeCustomStage);
      gameOverlay.classList.add('hidden');
      gameState = 'PLAYING';
      if (typeof saveCampaignState === 'function') saveCampaignState();
      showToast('🔄 동선 리플레이를 바탕으로 다시 안전하게 탈출해 보세요!');
    } else if (gameState === 'ALL_CLEAR') {
      loadStage(0, true, null);
      gameOverlay.classList.add('hidden');
      gameState = 'PLAYING';
      if (typeof saveCampaignState === 'function') saveCampaignState();
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

  // =========================================================================
  // --- PRD v1.0 ESCAPE GAME SYSTEMS IMPLEMENTATION ---
  // 1. Portal World Selection & Concept Preview Separation (F01, F02, T01)
  // 2. Single-Slot Campaign Auto-Save, Continue, Backup, 1MiB JSON Export/Import & Multi-Tab Sync (F04, F12, Section 7, T12, T13, T18)
  // 3. Notebook, Clue Zoom, 2-Stage Hints (Idempotent hintLog) & Categorized Inventory (F07, F08, T04, T06)
  // 4. Object Inspection & Escape-Room Puzzles: Digital Safe (614/3322/0119, 3-strike 30s lock) & Accessible Wiring (Red=B, Blue=D, Yellow=A, Green=C) (F06, Section 5, Section 16, T05, T10)
  // 5. Time & Tension-Relief Policy (300s / 480s / Practice Mode, Reading State Timer Separation) (Section 6, F09, T07~T11)
  // 6. Post-Activity Reflection Export & ?perf=1 Diagnostics (Section 10, Section 11)
  // =========================================================================

  const CAMPAIGN_SAVE_KEY = 'fire-safety:campaign:v2';
  const CAMPAIGN_BACKUP_KEY = 'fire-safety:campaign:backup';
  const APP_SETTINGS_KEY = 'fire-safety:settings:v1';

  const btnWorldFire = document.getElementById('btnWorldFire');
  const btnWorldAbyss = document.getElementById('btnWorldAbyss');
  const btnWorldTrain = document.getElementById('btnWorldTrain');
  const worldPreviewNotice = document.getElementById('worldPreviewNotice');
  const btnContinueSaved = document.getElementById('btnContinueSaved');

  function selectWorldCard(worldId) {
    selectedWorldId = worldId;
    const cards = [
      { btn: btnWorldFire, id: 'fire' },
      { btn: btnWorldAbyss, id: 'abyss' },
      { btn: btnWorldTrain, id: 'train' }
    ];
    cards.forEach(({ btn, id }) => {
      if (!btn) return;
      const isSel = id === worldId;
      if (id === 'fire') {
        btn.className = isSel
          ? 'world-card-btn p-2 rounded-xl border-2 border-emerald-400 bg-emerald-950/50 text-left transition flex flex-col justify-between shadow-md'
          : 'world-card-btn p-2 rounded-xl border border-slate-700 bg-slate-900/70 hover:bg-slate-800/80 text-left transition flex flex-col justify-between';
      } else {
        btn.className = isSel
          ? 'world-card-btn p-2 rounded-xl border-2 border-amber-400 bg-amber-950/40 text-left transition flex flex-col justify-between shadow-md'
          : 'world-card-btn p-2 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800/70 text-left transition flex flex-col justify-between opacity-85';
      }
    });

    if (worldId === 'fire') {
      if (worldPreviewNotice) worldPreviewNotice.classList.add('hidden');
      if (btnPrimaryAction && gameState === 'START') {
        btnPrimaryAction.disabled = false;
        btnPrimaryAction.classList.remove('opacity-50', 'cursor-not-allowed');
        btnPrimaryAction.textContent = '▶️ 게임 시작하기';
      }
    } else {
      const worldNames = {
        abyss: '🌊 심해 관측소 (THE ABYSS) — 수압 격벽·산소 밸브·비상 부상 포드 탈출 시나리오',
        train: '🚂 마지막 열차 (LAST TRAIN) — 객차 분리 레버·비상 제동장치·기관실 코드 시나리오'
      };
      if (worldPreviewNotice) {
        worldPreviewNotice.innerHTML = `ℹ️ <strong>[${worldNames[worldId] || '차기 세계관'}]</strong>은 현재 <strong>[콘셉트 미리보기 · 공개 일정 미정]</strong> 상태입니다. 미구현 세계는 입장이 차단되며, 플레이 가능한 <strong>[🔥 화재 탈출 넘버원]</strong> 카드를 선택해 입장하세요.`;
        worldPreviewNotice.classList.remove('hidden');
      }
      if (btnPrimaryAction && gameState === 'START') {
        btnPrimaryAction.disabled = true;
        btnPrimaryAction.classList.add('opacity-50', 'cursor-not-allowed');
        btnPrimaryAction.textContent = '🔒 준비 중인 세계관 (콘셉트 미리보기)';
      }
    }
  }

  if (btnWorldFire) btnWorldFire.addEventListener('click', () => { SoundFX.init(); selectWorldCard('fire'); });
  if (btnWorldAbyss) btnWorldAbyss.addEventListener('click', () => { SoundFX.init(); selectWorldCard('abyss'); });
  if (btnWorldTrain) btnWorldTrain.addEventListener('click', () => { SoundFX.init(); selectWorldCard('train'); });

  // --- Section 7: Campaign Save Schema Validation, Auto-Save, Continue, Backup, Export/Import ---
  function validateCampaignSave(obj) {
    if (!obj || typeof obj !== 'object') {
      return { valid: false, reason: '저장 데이터가 올바른 JSON 객체가 아닙니다.' };
    }
    if (obj.version !== 2 || obj.layoutVersion !== 5) {
      return { valid: false, reason: `지원하지 않는 저장 버전입니다 (version=${obj.version}, layoutVersion=${obj.layoutVersion}).` };
    }
    if (obj.worldId !== 'fire') {
      return { valid: false, reason: '유효하지 않은 세계관 ID입니다.' };
    }
    if (typeof obj.stageIdx !== 'number' || obj.stageIdx < 0 || obj.stageIdx >= STAGES.length) {
      return { valid: false, reason: '유효하지 않은 스테이지 인덱스입니다.' };
    }
    if (typeof obj.elapsedSeconds !== 'number' || !Number.isFinite(obj.elapsedSeconds) || obj.elapsedSeconds < 0) {
      return { valid: false, reason: '경과 시간 데이터가 손상되었습니다.' };
    }
    if (
      !obj.player ||
      typeof obj.player.x !== 'number' ||
      typeof obj.player.y !== 'number' ||
      typeof obj.player.hp !== 'number' ||
      typeof obj.player.o2 !== 'number' ||
      !Number.isFinite(obj.player.x) ||
      !Number.isFinite(obj.player.y)
    ) {
      return { valid: false, reason: '플레이어 위치·체력 데이터가 손상되었습니다.' };
    }
    if (
      !Array.isArray(obj.grid) ||
      obj.grid.length !== ROWS ||
      !obj.grid.every(r => Array.isArray(r) && r.length === COLS)
    ) {
      return { valid: false, reason: '건물 격자(Grid) 배열 규격이 일치하지 않습니다.' };
    }
    if (!Array.isArray(obj.items) || !Array.isArray(obj.fires) || !Array.isArray(obj.smokes)) {
      return { valid: false, reason: '아이템·화재·연기 배열 데이터가 누락되었습니다.' };
    }
    return { valid: true };
  }

  function buildCampaignSnapshot() {
    const st = activeCustomStage || STAGES[currentStageIdx] || STAGES[0];
    return {
      version: 2,
      layoutVersion: 5,
      worldId: 'fire',
      stageIdx: currentStageIdx,
      stageName: st.name || `${currentStageIdx + 1}단계`,
      isCustomStage: !!activeCustomStage,
      score,
      stageStartScore,
      elapsedSeconds: Number(elapsedSeconds.toFixed(2)),
      hazardExposure: Number(hazardExposure.toFixed(2)),
      runOptions: { ...runOptions },
      player: { ...player },
      grid: grid.map(row => [...row]),
      items: items.map(it => ({ ...it })),
      fires: fires.map(f => ({ ...f })),
      smokes: smokes.map(s => ({ ...s })),
      interactedDoors: Array.from(interactedDoors),
      metrics: { ...metrics },
      hintLog: Array.isArray(hintLog) ? [...hintLog] : [],
      safeWrongCount,
      safeLockUntil: Number(safeLockUntil.toFixed(2)),
      safeSolved: !!safeSolved,
      wireSolved: !!wireSolved,
      dirLockSolved: !!dirLockSolved,
      bookSortSolved: !!bookSortSolved,
      savedAt: new Date().toISOString(),
      sessionId: SESSION_ID,
      saveSeq: ++campaignSaveSeq
    };
  }

  function saveCampaignState() {
    if (activeCustomStage) return;
    if (gameState !== 'PLAYING' && gameState !== 'PAUSED' && gameState !== 'STAGE_CLEAR') return;
    if (!grid || grid.length !== ROWS) return;
    try {
      const snap = buildCampaignSnapshot();
      localStorage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify(snap));
      updateSaveStatusUI();
    } catch (e) {}
  }

  function loadValidCampaignSave() {
    try {
      const raw = localStorage.getItem(CAMPAIGN_SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const check = validateCampaignSave(parsed);
      if (!check.valid) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function backupCurrentCampaignSave() {
    try {
      const existing = loadValidCampaignSave();
      if (existing) {
        localStorage.setItem(CAMPAIGN_BACKUP_KEY, JSON.stringify(existing));
      }
    } catch (e) {}
  }

  function restoreCampaignState(saved) {
    const check = validateCampaignSave(saved);
    if (!check.valid) {
      showToast(`⚠️ 저장 데이터를 불러올 수 없습니다: ${check.reason}`, 'border-red-500');
      return false;
    }
    loadStage(saved.stageIdx, false, null);
    score = Number(saved.score) || 0;
    stageStartScore = Number(saved.stageStartScore) || 0;
    elapsedSeconds = Number(saved.elapsedSeconds) || 0;
    hazardExposure = Number(saved.hazardExposure) || 0;
    if (saved.runOptions && typeof saved.runOptions === 'object') {
      runOptions = {
        mode: saved.runOptions.mode || 'standard',
        hazardLimitSeconds: saved.runOptions.hazardLimitSeconds !== undefined ? saved.runOptions.hazardLimitSeconds : 300
      };
    }
    Object.assign(player, saved.player);
    grid = saved.grid.map(row => [...row]);
    items = saved.items.map(it => ({ ...it }));
    fires = saved.fires.map(f => ({ ...f, phase: f.phase || 0 }));
    smokes = saved.smokes.map(s => ({ ...s, phase: s.phase || 0 }));
    interactedDoors = new Set(Array.isArray(saved.interactedDoors) ? saved.interactedDoors : []);
    if (saved.metrics && typeof saved.metrics === 'object') {
      Object.assign(metrics, saved.metrics);
    }
    hintLog = Array.isArray(saved.hintLog) ? [...new Set(saved.hintLog.map(String))] : [];
    safeWrongCount = Number(saved.safeWrongCount) || 0;
    safeLockUntil = Number(saved.safeLockUntil) || 0;
    safeSolved = !!saved.safeSolved;
    wireSolved = !!saved.wireSolved;
    dirLockSolved = !!saved.dirLockSolved;
    bookSortSolved = !!saved.bookSortSolved;
    if (bookSortSolved) {
      bookSortOrder = ['425.12', '425.2', '430', '440', '450', '480'];
    }

    orientCameraToOpenSpace();
    hideAllModalsAndResume();
    updateHUD();
    renderCanvas();
    showToast(`⏯️ [${saved.stageName || '저장된 캠페인'}] 진행 상태를 이어서 시작합니다!`, 'border-emerald-400');
    return true;
  }

  function syncContinueButtonUI() {
    if (!btnContinueSaved) return;
    const saved = loadValidCampaignSave();
    if (saved && gameState === 'START') {
      const mins = String(Math.floor((saved.elapsedSeconds || 0) / 60)).padStart(2, '0');
      const secs = String(Math.floor((saved.elapsedSeconds || 0) % 60)).padStart(2, '0');
      btnContinueSaved.textContent = `⏯️ 이어하기 (${saved.stageName || `${saved.stageIdx + 1}단계`} · ${mins}:${secs})`;
      btnContinueSaved.classList.remove('hidden');
    } else {
      btnContinueSaved.classList.add('hidden');
    }
  }

  if (btnContinueSaved) {
    btnContinueSaved.addEventListener('click', () => {
      SoundFX.init();
      const saved = loadValidCampaignSave();
      if (saved) {
        restoreCampaignState(saved);
      } else {
        btnContinueSaved.classList.add('hidden');
        showToast('⚠️ 유효한 자동 저장 데이터가 없어 새 게임을 시작해 주세요.', 'border-amber-500');
      }
    });
  }

  // Save on pagehide / visibilitychange & detect multi-tab save conflicts
  window.addEventListener('pagehide', () => {
    if (gameState === 'PLAYING' || gameState === 'PAUSED') {
      saveCampaignState();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (gameState === 'PLAYING' || gameState === 'PAUSED')) {
      saveCampaignState();
    }
  });
  window.addEventListener('storage', (e) => {
    if (e.key === CAMPAIGN_SAVE_KEY && e.newValue) {
      try {
        const incoming = JSON.parse(e.newValue);
        if (incoming && incoming.sessionId && incoming.sessionId !== SESSION_ID) {
          showToast('⚠️ 다른 탭에서 캠페인 저장 데이터가 갱신되었습니다. 최신 저장본이 우선 유지됩니다.', 'border-amber-400');
          syncContinueButtonUI();
          updateSaveStatusUI();
        }
      } catch (err) {}
    }
  });

  // --- Section 4, F07, F08, T04, T06: Notebook, Clue Zoom, 2-Stage Hints (Idempotent) & Categorized Inventory ---
  const notebookModal = document.getElementById('notebookModal');
  const btnNotebookTop = document.getElementById('btnNotebookTop');
  const btnCloseNotebookModal = document.getElementById('btnCloseNotebookModal');
  const btnConfirmNotebookModal = document.getElementById('btnConfirmNotebookModal');
  const tabBtnTasks = document.getElementById('tabBtnTasks');
  const tabBtnHints = document.getElementById('tabBtnHints');
  const tabBtnInventory = document.getElementById('tabBtnInventory');
  const panelNotebookTasks = document.getElementById('panelNotebookTasks');
  const panelNotebookHints = document.getElementById('panelNotebookHints');
  const panelNotebookInventory = document.getElementById('panelNotebookInventory');
  const btnToggleClueZoom = document.getElementById('btnToggleClueZoom');
  const notebookStageName = document.getElementById('notebookStageName');
  const notebookTaskList = document.getElementById('notebookTaskList');
  const notebookClueList = document.getElementById('notebookClueList');
  const notebookHintUsedCount = document.getElementById('notebookHintUsedCount');
  const hintTotalBadge = document.getElementById('hintTotalBadge');
  const hintCurrentObjectiveTitle = document.getElementById('hintCurrentObjectiveTitle');
  const hintStep1Text = document.getElementById('hintStep1Text');
  const btnUnlockHint1 = document.getElementById('btnUnlockHint1');
  const hintStep2Text = document.getElementById('hintStep2Text');
  const btnUnlockHint2 = document.getElementById('btnUnlockHint2');
  const hintHistoryList = document.getElementById('hintHistoryList');
  const categorizedInventoryGrid = document.getElementById('categorizedInventoryGrid');

  let activeNotebookTab = 'tasks';
  let isClueZoomed = false;
  let activeInvCategory = 'all';

  function getStageSafePasscode() {
    if (customQuizConfig && customQuizConfig.safeCode && /^\d{3,4}$/.test(String(customQuizConfig.safeCode).trim())) {
      return String(customQuizConfig.safeCode).trim();
    }
    if (currentStageIdx === 0) return '614';
    if (currentStageIdx === 1) return '3322';
    return '0119';
  }

  function renderNotebookModal() {
    const st = activeCustomStage || STAGES[currentStageIdx] || STAGES[0];
    const safeCode = getStageSafePasscode();

    // Update Hint Badges
    if (notebookHintUsedCount) notebookHintUsedCount.textContent = String(hintLog.length);
    if (hintTotalBadge) hintTotalBadge.textContent = String(hintLog.length);
    if (notebookStageName) notebookStageName.textContent = st.name;

    // 1. Checklist & Clues Panel (Explicit text status tags [완료] / [진행중] / [미완료] — never color alone)
    if (notebookTaskList) {
      const tasks = [];
      if (st.isPreventionMode) {
        const doneHaz = player.hazardsFixed >= player.totalHazards;
        tasks.push({
          status: doneHaz ? '[완료]' : '[진행중]',
          done: doneHaz,
          text: `가정 내 화재 위험요소 5곳 안전 점검 (${player.hazardsFixed} / ${player.totalHazards}곳)`
        });
      } else {
        const hasResp = player.wetTowel || player.hasMask;
        tasks.push({
          status: hasResp ? '[완료]' : '[미완료]',
          done: hasResp,
          text: '호흡기 보호: 수건을 줍고 세면대(🚰) 물에 적시거나 방연마스크(😷) 착용하기'
        });
        if (st.requireGasClosed) {
          tasks.push({
            status: player.gasClosed ? '[완료]' : '[미완료]',
            done: player.gasClosed,
            text: '2차 폭발 방지: 주방 가스밸브(🔴) 잠그기'
          });
        }
        const hasLockedDoor = findNearestTileOfTypes([TILE.LOCKED_DOOR]) !== null;
        const keyOrUnlocked = !hasLockedDoor || player.keys > 0 || safeSolved;
        tasks.push({
          status: !hasLockedDoor ? '[완료]' : (keyOrUnlocked ? '[진행중]' : '[미완료]'),
          done: !hasLockedDoor,
          text: '잠긴 방문(🔒) 개방: 열쇠(🔑)를 찾거나 [🔐 금고·배선퍼즐]에서 비상 금고 해금하기'
        });
        if (st.requireRescueNpc || st.requireRescueDog) {
          const remainingRescue = items.some(it => it.type === 'npc' || it.type === 'dog');
          tasks.push({
            status: !remainingRescue ? '[완료]' : '[미완료]',
            done: !remainingRescue,
            text: '고립된 가족·친구·반려견 구출하여 동행하기'
          });
        }
      }
      tasks.push({
        status: '[진행중]',
        done: false,
        text: '최종 탈출: 낮은 자세(🧎)를 유지하며 초록색 비상구(EXIT) 또는 완강기(🪢)로 탈출하기'
      });

      const sizeCls = isClueZoomed ? 'text-sm sm:text-base leading-relaxed' : 'text-xs leading-relaxed';
      notebookTaskList.className = `space-y-1.5 text-slate-200 ${sizeCls}`;
      notebookTaskList.innerHTML = tasks.map((t) => `
        <div class="p-2 rounded-lg border ${t.done ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-slate-900 border-slate-700 text-slate-200'} flex items-start gap-2">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${t.done ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500/25 text-amber-300 border border-amber-400/40'}">${t.status}</span>
          <span>${t.text}</span>
        </div>
      `).join('');
    }

    if (notebookClueList) {
      const sizeCls = isClueZoomed ? 'text-sm sm:text-base leading-relaxed' : 'text-xs leading-relaxed';
      notebookClueList.className = `space-y-1.5 text-slate-300 ${sizeCls}`;
      const customClueBody = (customQuizConfig && customQuizConfig.safeClue)
        ? `🎯 <strong>[선생님 출제 우리 반 암호 단서]</strong> ${customQuizConfig.safeClue} (정답 암호: <strong>${safeCode}</strong>)`
        : `우리 반 안전 대피소 호실 번호는 <strong>6층 14호(614)</strong>이며, 구역별 비상 암호(<strong>${safeCode}</strong> 또는 긴급 직통번호 <strong>0119</strong>) 입력으로 비상 마스터 열쇠(🔑)를 꺼낼 수 있습니다.`;
      const clueNotes = [
        {
          badge: '[새 기록]',
          title: `📄 현장 소방 안전 지침서 (${st.name})`,
          body: `연기는 위쪽으로 빠르게 이동(대류 현상)하므로 바닥에서 30~60cm 아래의 신선한 공기층을 따라 <strong>[🧎 낮은 자세]</strong>로 대피하십시오. 뜨거운 문(🌡️)은 백드래프트 폭발 위험이 있으므로 절대 열지 말고 우회하십시오.`
        },
        {
          badge: safeSolved ? '[완료]' : '[단서 원문]',
          title: '🔢 퍼즐 1 · 비상 금고 잠금장치 암호 단서 메모',
          body: customClueBody
        },
        {
          badge: wireSolved ? '[완료]' : '[단서 원문]',
          title: '⚡ 퍼즐 2 · 배전판 비상 배선 복구 도면 (색약 배려 문자 병기)',
          body: `배전판 단자 연결 규칙: <strong>🔴 빨강(RED) → [B]단자</strong>, <strong>🔵 파랑(BLUE) → [D]단자</strong>, <strong>🟡 노랑(YELLOW) → [A]단자</strong>, <strong>🟢 초록(GREEN) → [C]단자</strong>로 연결하면 누전이 차단되고 비상 소화기가 충전됩니다.`
        },
        {
          badge: dirLockSolved ? '[완료]' : '[단서 원문]',
          title: '🧭 퍼즐 3 · 구호장비 보관함 6단계 방향 자물쇠 (비상대피 동선)',
          body: `벽면 피난안내도 화살표 순서: <strong>[⬆️ 위 → ➡️ 오른쪽 → ➡️ 오른쪽 → ⬇️ 아래 → ⬅️ 왼쪽 → ⬆️ 위]</strong> 순서대로 방향 자물쇠를 조작하면 방연마스크(😷)와 손전등(🔦)이 지급됩니다.`
        },
        {
          badge: bookSortSolved ? '[완료]' : '[단서 원문]',
          title: '📚 퍼즐 4 · 소방 안전 매뉴얼 십진 청구기호 정렬 규칙',
          body: `소수점 아래 숫자는 자릿수가 아니라 크기 순서로 비교합니다(<code>.12 &lt; .2</code>). 올바른 오름차순 배열: <strong>425.12 → 425.2 → 430 → 440 → 450 → 480</strong> (완료 시 🪓소방도끼 + 🧯소화기 보급).`
        }
      ];
      notebookClueList.innerHTML = clueNotes.map(cn => `
        <div class="p-2.5 rounded-lg bg-slate-900 border border-slate-700/80">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="font-extrabold text-amber-300">${cn.title}</span>
            <span class="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[10px] font-black">${cn.badge}</span>
          </div>
          <p class="text-slate-300">${cn.body}</p>
        </div>
      `).join('');
    }

    // 2. 2-Stage Hints Panel (Idempotent hintLog tracking: re-viewing never increments count)
    const nextObj = getNextStepObjective();
    const h1Id = `s${currentStageIdx}_hint_1`;
    const h2Id = `s${currentStageIdx}_hint_2`;
    const open1 = hintLog.includes(h1Id) || appSettings.gradePreset === 'low';
    const open2 = hintLog.includes(h2Id);

    if (hintCurrentObjectiveTitle) {
      hintCurrentObjectiveTitle.textContent = `현재 목표: ${nextObj ? nextObj.bannerText : '초록색 비상구(EXIT)로 안전하게 탈출하기'}`;
    }
    if (hintStep1Text) {
      hintStep1Text.innerHTML = open1
        ? `<strong>[열람됨 · 재열람 시 횟수 미증가]</strong> 먼저 세면대(🚰)에서 젖은 수건을 착용하거나 방향 자물쇠(<strong>위·오른쪽·오른쪽·아래·왼쪽·위</strong>)로 방연마스크를 획득하고, 금고 단서(<strong>${safeCode}</strong>)와 배전판 도면(R=B, B=D, Y=A, G=C)을 확인하세요.`
        : '힌트 열기를 누르면 현재 목표의 위치와 안전 원리를 안내합니다.';
    }
    if (btnUnlockHint1) {
      btnUnlockHint1.textContent = open1 ? '✅ 1단계 힌트 다시 보기 (횟수 유지)' : '💡 1단계 힌트 열기 (+1회)';
      btnUnlockHint1.className = open1
        ? 'w-full py-1.5 rounded-lg bg-slate-800 border border-emerald-500/50 text-emerald-300 font-extrabold text-xs transition'
        : 'w-full py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs transition';
    }
    if (hintStep2Text) {
      hintStep2Text.innerHTML = open2
        ? `<strong>[열람됨 · 재열람 시 횟수 미증가]</strong> 상단 <strong>[🔐 퍼즐조사]</strong>에서 ① 금고 암호 <strong>${safeCode}</strong>(또는 <strong>614</strong> / <strong>0119</strong>) → 열쇠(🔑), ② 배전판 <strong>빨강=B, 파랑=D, 노랑=A, 초록=C</strong> → 소화기, ③ 방향자물쇠 <strong>위·오른쪽·오른쪽·아래·왼쪽·위</strong> → 마스크, ④ 청구기호 <strong>425.12 → 425.2 → 430 → 440 → 450 → 480</strong> → 소방도끼를 획득할 수 있습니다.`
        : '1단계 힌트를 확인한 뒤 결정적 해답과 암호를 확인할 수 있습니다.';
    }
    if (btnUnlockHint2) {
      btnUnlockHint2.textContent = open2 ? '✅ 2단계 결정적 힌트 다시 보기 (횟수 유지)' : '🔑 2단계 결정적 힌트 열기 (+1회)';
      btnUnlockHint2.className = open2
        ? 'w-full py-1.5 rounded-lg bg-slate-800 border border-emerald-500/50 text-emerald-300 font-extrabold text-xs transition'
        : 'w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs transition';
    }
    if (hintHistoryList) {
      if (hintLog.length === 0) {
        hintHistoryList.innerHTML = '<div class="text-slate-500">아직 열람한 힌트가 없습니다.</div>';
      } else {
        hintHistoryList.innerHTML = hintLog.map((id, idx) => `
          <div class="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            <strong>#${idx + 1} [${id}]</strong> — ${id.endsWith('_1') ? '1단계 탐색 방향 힌트 열람 완료 (재열람 무제한)' : '2단계 결정적 해답·암호 힌트 열람 완료 (재열람 무제한)'}
          </div>
        `).join('');
      }
    }

    // 3. Categorized Inventory Panel (all / key / record / tool)
    if (categorizedInventoryGrid) {
      const invEntries = [
        {
          id: 'key',
          cat: 'key',
          icon: '🔑',
          name: `비상 열쇠 (${player.keys}개)`,
          owned: player.keys > 0,
          desc: '잠긴 방문(🔒) 앞에서 사용하면 문을 즉시 개방합니다.',
          onUse: () => {
            const adjLocked = findNearestTileOfTypes([TILE.LOCKED_DOOR]);
            if (adjLocked && adjLocked.dist <= 2.2) {
              triggerInteraction({ kind: 'tile', c: adjLocked.c, r: adjLocked.r, tile: TILE.LOCKED_DOOR });
              return '🔓 근처의 잠긴 방문(🔒)을 열쇠로 개방했습니다!';
            }
            return 'ℹ️ 현재 잠긴 문(🔒) 앞이 아닙니다. 열쇠는 절대 소멸되지 않고 안전하게 보관됩니다.';
          }
        },
        {
          id: 'clue_safe',
          cat: 'record',
          icon: '📄',
          name: `비상 금고 암호 기록표 (${safeCode})`,
          owned: true,
          desc: `현재 구역 디지털 금고 비밀번호 단서(${safeCode} / 614 / 0119)가 적힌 소방 점검표입니다.`,
          onUse: () => {
            closeNotebookModalFn();
            openPuzzleModalFn('safe');
            return `🔐 디지털 금고 조사 창을 열었습니다 (암호 단서: ${safeCode}).`;
          }
        },
        {
          id: 'clue_wire',
          cat: 'record',
          icon: '📐',
          name: '배전판 배선 복구 도면 (R=B, B=D, Y=A, G=C)',
          owned: true,
          desc: '색약 배려 문자 표기가 포함된 배전판 비상 배선 연결 도면입니다.',
          onUse: () => {
            closeNotebookModalFn();
            openPuzzleModalFn('wire');
            return '⚡ 배전판 배선 퍼즐 조사 창을 열었습니다.';
          }
        },
        {
          id: 'clue_dirlock',
          cat: 'record',
          icon: '🧭',
          name: '비상대피 동선 방향 자물쇠 표식',
          owned: true,
          desc: '위 → 오른쪽 → 오른쪽 → 아래 → 왼쪽 → 위 순서의 구호장비 보관함 해제 기록입니다.',
          onUse: () => {
            closeNotebookModalFn();
            openPuzzleModalFn('dirlock');
            return '🧭 방향 자물쇠 퍼즐 조사 창을 열었습니다.';
          }
        },
        {
          id: 'clue_books',
          cat: 'record',
          icon: '📚',
          name: '소방 매뉴얼 청구기호 정렬표 (425.12~480)',
          owned: true,
          desc: '425.12 → 425.2 → 430 → 440 → 450 → 480 오름차순 서가 배열 기록입니다.',
          onUse: () => {
            closeNotebookModalFn();
            openPuzzleModalFn('books');
            return '📚 소방 매뉴얼 서가 정렬 퍼즐 창을 열었습니다.';
          }
        },
        {
          id: 'towel_mask',
          cat: 'tool',
          icon: player.hasMask ? '😷' : (player.wetTowel ? '💧' : '🧣'),
          name: player.hasMask ? '방연마스크 (착용중)' : (player.wetTowel ? '젖은 수건 (착용중)' : '마른 수건'),
          owned: player.hasMask || player.wetTowel || player.hasTowel,
          desc: '유독가스 연기 구역에서 산소 고갈 속도를 대폭 줄여 주는 필수 호흡기 보호구입니다.',
          onUse: () => {
            if (player.hasMask || player.wetTowel) {
              return '✅ 이미 호흡기 보호구(젖은 수건/방연마스크)를 착용하고 있어 유독가스로부터 보호받고 있습니다!';
            }
            return '💧 마른 수건 상태입니다. 세면대(🚰) 앞으로 이동해 물에 적셔 주세요! (아이템은 소멸되지 않습니다)';
          }
        },
        {
          id: 'extinguisher',
          cat: 'tool',
          icon: '🧯',
          name: `ABC 분말소화기 (${player.extinguisherCharges}회)`,
          owned: player.extinguisherCharges > 0,
          desc: '일반·식용유·전기 화재를 모두 안전하게 진압할 수 있는 다목적 소화기입니다.',
          onUse: () => {
            useExtinguisher();
            return '🧯 소화기 분사를 시도했습니다!';
          }
        },
        {
          id: 'axe',
          cat: 'tool',
          icon: '🪓',
          name: '소방 도끼',
          owned: player.hasAxe,
          desc: '복도를 가로막는 나무 장애물(🪵)이나 경량칸막이(🧱)를 돌파할 때 사용합니다.',
          onUse: () => {
            const adjDebris = findNearestTileOfTypes([TILE.DEBRIS]);
            if (adjDebris && adjDebris.dist <= 2.2) {
              triggerInteraction({ kind: 'tile', c: adjDebris.c, r: adjDebris.r, tile: TILE.DEBRIS });
              return '🪓 근처의 나무 장애물(🪵)을 소방 도끼로 부쉈습니다!';
            }
            return 'ℹ️ 근처에 부술 장애물(🪵)이 없습니다. 소방 도끼는 소멸되지 않고 그대로 유지됩니다.';
          }
        }
      ];

      const filtered = activeInvCategory === 'all'
        ? invEntries
        : invEntries.filter(e => e.cat === activeInvCategory);

      categorizedInventoryGrid.innerHTML = filtered.map((entry) => `
        <div class="p-2.5 rounded-xl border ${entry.owned ? 'bg-slate-900 border-emerald-500/40 text-white' : 'bg-slate-950/60 border-slate-800 text-slate-500'} flex flex-col justify-between gap-2">
          <div class="flex items-start gap-2.5">
            <span class="text-2xl shrink-0">${entry.icon}</span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-1">
                <span class="text-xs font-extrabold ${entry.owned ? 'text-amber-300' : 'text-slate-400'}">${entry.name}</span>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-black ${entry.owned ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}">${entry.owned ? '[보유중]' : '[미보유]'}</span>
              </div>
              <p class="text-[11px] text-slate-300 mt-0.5 leading-snug">${entry.desc}</p>
            </div>
          </div>
          <button type="button" data-inv-id="${entry.id}" class="inv-use-btn w-full py-1.5 rounded-lg text-[11px] font-extrabold transition ${
            entry.owned
              ? 'bg-sky-600 hover:bg-sky-500 text-white'
              : 'bg-slate-800 text-slate-400'
          }">${entry.owned ? '🔍 점검 / 사용하기' : '🔒 미보유 (사용 불가 안내)'}</button>
        </div>
      `).join('');

      categorizedInventoryGrid.querySelectorAll('.inv-use-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          SoundFX.init();
          const id = btn.getAttribute('data-inv-id');
          const found = invEntries.find(e => e.id === id);
          if (!found) return;
          if (!found.owned) {
            SoundFX.warning();
            showToast(`⚠️ [${found.name}] 아이템을 아직 보유하고 있지 않아 사용할 수 없습니다. 건물 내부를 탐색해 먼저 획득하세요!`, 'border-amber-500');
            return;
          }
          const resultMsg = found.onUse();
          if (resultMsg) showToast(resultMsg, 'border-sky-400');
          updateHUD();
        });
      });
    }
  }

  function unlockNotebookHint(stepNum) {
    SoundFX.init();
    const hId = `s${currentStageIdx}_hint_${stepNum}`;
    if (!hintLog.includes(hId)) {
      hintLog.push(hId);
      SoundFX.pickup();
      saveCampaignState();
    } else {
      SoundFX.playTone(520, 'sine', 0.05, 0.06);
    }
    renderNotebookModal();
  }

  if (btnUnlockHint1) btnUnlockHint1.addEventListener('click', () => unlockNotebookHint(1));
  if (btnUnlockHint2) btnUnlockHint2.addEventListener('click', () => unlockNotebookHint(2));

  function switchNotebookTab(tabName) {
    activeNotebookTab = tabName;
    const tabs = [
      { btn: tabBtnTasks, panel: panelNotebookTasks, id: 'tasks' },
      { btn: tabBtnHints, panel: panelNotebookHints, id: 'hints' },
      { btn: tabBtnInventory, panel: panelNotebookInventory, id: 'inv' }
    ];
    tabs.forEach(({ btn, panel, id }) => {
      const active = id === tabName;
      if (btn) {
        btn.className = active
          ? 'py-1.5 rounded-lg bg-amber-500 text-slate-950 transition'
          : 'py-1.5 rounded-lg text-slate-300 hover:text-white transition';
      }
      if (panel) {
        panel.classList.toggle('hidden', !active);
      }
    });
    renderNotebookModal();
  }

  function openNotebookModalFn(defaultTab = 'tasks') {
    if (!notebookModal) return;
    clearAllInputStates();
    if (mapEditorInstance) mapEditorInstance.close();
    const pzModal = document.getElementById('puzzleModal');
    const stModal = document.getElementById('settingsModal');
    [certModal, guideModal, classModal, teacherModal, pzModal, stModal, moreToolsDrawer].forEach((m) => {
      if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
    });
    // PRD Section 6.2: Reading Notebook pauses hazard exposure & fire spread while active elapsed time continues
    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
      pauseIcon.textContent = '▶️';
      pauseText.textContent = '계속하기';
    }
    const normalizedTab = defaultTab === 'clues' ? 'tasks' : defaultTab;
    switchNotebookTab(normalizedTab);
    notebookModal.classList.remove('hidden');
    notebookModal.classList.add('flex');
  }

  function closeNotebookModalFn() {
    if (!notebookModal) return;
    clearAllInputStates();
    notebookModal.classList.add('hidden');
    notebookModal.classList.remove('flex');
    if (
      gameState === 'PAUSED' &&
      gameOverlay.classList.contains('hidden') &&
      eduModal.classList.contains('hidden') &&
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

  if (btnNotebookTop) btnNotebookTop.addEventListener('click', () => { SoundFX.init(); openNotebookModalFn('tasks'); });
  if (btnCloseNotebookModal) btnCloseNotebookModal.addEventListener('click', closeNotebookModalFn);
  if (btnConfirmNotebookModal) btnConfirmNotebookModal.addEventListener('click', closeNotebookModalFn);
  if (tabBtnTasks) tabBtnTasks.addEventListener('click', () => switchNotebookTab('tasks'));
  if (tabBtnHints) tabBtnHints.addEventListener('click', () => switchNotebookTab('hints'));
  if (tabBtnInventory) tabBtnInventory.addEventListener('click', () => switchNotebookTab('inv'));

  if (btnToggleClueZoom) {
    btnToggleClueZoom.addEventListener('click', () => {
      isClueZoomed = !isClueZoomed;
      btnToggleClueZoom.textContent = isClueZoomed ? '🔎 기본 글자크기' : '🔍 글자크게(확대)';
      renderNotebookModal();
    });
  }

  document.querySelectorAll('.inv-cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeInvCategory = btn.getAttribute('data-inv-cat') || 'all';
      document.querySelectorAll('.inv-cat-btn').forEach((b) => {
        const isAct = (b.getAttribute('data-inv-cat') || 'all') === activeInvCategory;
        b.className = isAct
          ? 'inv-cat-btn px-2.5 py-1 rounded-lg bg-sky-600 text-white font-bold'
          : 'inv-cat-btn px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-bold';
      });
      renderNotebookModal();
    });
  });

  // --- Section 5, Section 16, F06, T05, T10: 4-Type Escape-Room Object Inspection & Puzzles ---
  const puzzleModal = document.getElementById('puzzleModal');
  const btnPuzzleTop = document.getElementById('btnPuzzleTop');
  const btnPuzzleInspector = document.getElementById('btnPuzzleInspector');
  const btnClosePuzzleModal = document.getElementById('btnClosePuzzleModal');
  const btnSelectSafePuzzle = document.getElementById('btnSelectSafePuzzle');
  const btnSelectWirePuzzle = document.getElementById('btnSelectWirePuzzle');
  const btnSelectDirLockPuzzle = document.getElementById('btnSelectDirLockPuzzle');
  const btnSelectBookSortPuzzle = document.getElementById('btnSelectBookSortPuzzle');
  const safePuzzleBox = document.getElementById('safePuzzleBox');
  const wirePuzzleBox = document.getElementById('wirePuzzleBox');
  const dirLockPuzzleBox = document.getElementById('dirLockPuzzleBox');
  const bookSortPuzzleBox = document.getElementById('bookSortPuzzleBox');
  const safeWrongBadge = document.getElementById('safeWrongBadge');
  const safeCodeInput = document.getElementById('safeCodeInput');
  const btnSubmitSafeCode = document.getElementById('btnSubmitSafeCode');
  const btnSafeClear = document.getElementById('btnSafeClear');
  const safeFeedbackMsg = document.getElementById('safeFeedbackMsg');
  const wireSelectRed = document.getElementById('wireSelectRed');
  const wireSelectBlue = document.getElementById('wireSelectBlue');
  const wireSelectYellow = document.getElementById('wireSelectYellow');
  const wireSelectGreen = document.getElementById('wireSelectGreen');
  const btnSubmitWirePuzzle = document.getElementById('btnSubmitWirePuzzle');
  const wireFeedbackMsg = document.getElementById('wireFeedbackMsg');
  const dirLockSeqDisplay = document.getElementById('dirLockSeqDisplay');
  const btnDirLockClear = document.getElementById('btnDirLockClear');
  const btnSubmitDirLock = document.getElementById('btnSubmitDirLock');
  const dirLockFeedbackMsg = document.getElementById('dirLockFeedbackMsg');
  const bookSortListContainer = document.getElementById('bookSortListContainer');
  const btnSubmitBookSort = document.getElementById('btnSubmitBookSort');
  const bookSortFeedbackMsg = document.getElementById('bookSortFeedbackMsg');

  function switchPuzzleSubTab(which) {
    const tabs = [
      { id: 'safe', btn: btnSelectSafePuzzle, box: safePuzzleBox },
      { id: 'wire', btn: btnSelectWirePuzzle, box: wirePuzzleBox },
      { id: 'dirlock', btn: btnSelectDirLockPuzzle, box: dirLockPuzzleBox },
      { id: 'books', btn: btnSelectBookSortPuzzle, box: bookSortPuzzleBox }
    ];
    const targetId = tabs.some(t => t.id === which) ? which : 'safe';
    tabs.forEach(({ id, btn, box }) => {
      const active = id === targetId;
      if (box) box.classList.toggle('hidden', !active);
      if (btn) {
        btn.className = active
          ? 'py-1.5 rounded-lg bg-cyan-600 text-white transition'
          : 'py-1.5 rounded-lg text-slate-300 hover:text-white transition';
      }
    });
    updateSafeLockUI();
    updateWirePuzzleUI();
    updateDirLockPuzzleUI();
    renderBookSortPuzzleUI();
  }

  if (btnSelectSafePuzzle) btnSelectSafePuzzle.addEventListener('click', () => switchPuzzleSubTab('safe'));
  if (btnSelectWirePuzzle) btnSelectWirePuzzle.addEventListener('click', () => switchPuzzleSubTab('wire'));
  if (btnSelectDirLockPuzzle) btnSelectDirLockPuzzle.addEventListener('click', () => switchPuzzleSubTab('dirlock'));
  if (btnSelectBookSortPuzzle) btnSelectBookSortPuzzle.addEventListener('click', () => switchPuzzleSubTab('books'));

  function updateSafeLockUI() {
    if (safeWrongBadge) {
      safeWrongBadge.textContent = `오답: ${safeWrongCount} / 3회`;
    }
    if (!safeFeedbackMsg) return;
    const targetCode = getStageSafePasscode();
    if (safeSolved) {
      if (safeCodeInput) safeCodeInput.value = 'OPEN';
      safeFeedbackMsg.textContent = `✅ 금고 잠금 해제 완료! (정답 ${targetCode} · 비상 마스터 열쇠 🔑 지급 완료)`;
      safeFeedbackMsg.className = 'p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 font-bold text-center';
      return;
    }

    if (safeLockUntil > 0 && elapsedSeconds < safeLockUntil) {
      const rem = Math.max(1, Math.ceil(safeLockUntil - elapsedSeconds));
      safeFeedbackMsg.textContent = `⏳ 3회 연속 오답으로 금고가 잠겼습니다! (남은 대기시간: ${rem}초 — 플레이·수첩 열람 중 감소)`;
      safeFeedbackMsg.className = 'p-2 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 font-bold text-center';
      return;
    }

    if (safeLockUntil > 0 && elapsedSeconds >= safeLockUntil) {
      safeLockUntil = 0;
      safeWrongCount = 0;
      if (safeWrongBadge) safeWrongBadge.textContent = '오답: 0 / 3회';
      saveCampaignState();
    }

    safeFeedbackMsg.textContent = `현재 구역 암호(${targetCode} 또는 614 / 0119)를 입력한 뒤 [잠금 해제]를 누르세요. (오답: ${safeWrongCount}/3회)`;
    safeFeedbackMsg.className = 'p-2 rounded-lg bg-slate-900 border border-slate-800 text-amber-200 font-bold text-center';
  }

  function updateWirePuzzleUI() {
    if (!wireFeedbackMsg) return;
    if (wireSolved) {
      if (wireSelectRed) wireSelectRed.value = 'B';
      if (wireSelectBlue) wireSelectBlue.value = 'D';
      if (wireSelectYellow) wireSelectYellow.value = 'A';
      if (wireSelectGreen) wireSelectGreen.value = 'C';
      wireFeedbackMsg.textContent = '✅ 배전판 비상 배선 복구 완료! (전원 차단 + 소화기 1회 추가 충전 완료)';
      wireFeedbackMsg.className = 'p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 font-bold text-center';
    } else {
      wireFeedbackMsg.textContent = '색상과 영문 기호(RED·BLUE·YELLOW·GREEN)를 확인해 알맞은 단자(A·B·C·D)를 선택하세요.';
      wireFeedbackMsg.className = 'p-2 rounded-lg bg-slate-900 border border-slate-800 text-emerald-200 font-bold text-center';
    }
  }

  const TARGET_DIR_SEQUENCE = ['위', '오른쪽', '오른쪽', '아래', '왼쪽', '위'];
  function updateDirLockPuzzleUI() {
    if (dirLockSeqDisplay) {
      if (dirLockSolved) {
        dirLockSeqDisplay.textContent = 'UNLOCKED (위 · 오른쪽 · 오른쪽 · 아래 · 왼쪽 · 위)';
      } else if (dirLockBuffer.length === 0) {
        dirLockSeqDisplay.textContent = '(방향 버튼을 순서대로 6회 누르세요)';
      } else {
        dirLockSeqDisplay.textContent = dirLockBuffer.join(' → ');
      }
    }
    if (!dirLockFeedbackMsg) return;
    if (dirLockSolved) {
      dirLockFeedbackMsg.textContent = '✅ 구호장비 보관함 방향 자물쇠 해제 완료! (😷방연마스크 + 🔦3D 손전등 지급 완료)';
      dirLockFeedbackMsg.className = 'p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 font-bold text-center';
    } else {
      dirLockFeedbackMsg.textContent = `피난안내도 동선 순서(위·오른쪽·오른쪽·아래·왼쪽·위)를 입력한 뒤 [잠금 해제]를 누르세요. (${dirLockBuffer.length}/6단계)`;
      dirLockFeedbackMsg.className = 'p-2 rounded-lg bg-slate-900 border border-slate-800 text-purple-200 font-bold text-center';
    }
  }

  document.querySelectorAll('.dir-lock-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      SoundFX.init();
      if (dirLockSolved) return;
      const token = btn.getAttribute('data-dir-token');
      if (token && dirLockBuffer.length < 6) {
        dirLockBuffer.push(token);
        SoundFX.playTone(580, 'sine', 0.04, 0.06);
        updateDirLockPuzzleUI();
      }
    });
  });

  if (btnDirLockClear) {
    btnDirLockClear.addEventListener('click', () => {
      SoundFX.init();
      if (dirLockSolved) return;
      dirLockBuffer = [];
      updateDirLockPuzzleUI();
    });
  }

  if (btnSubmitDirLock) {
    btnSubmitDirLock.addEventListener('click', () => {
      SoundFX.init();
      if (dirLockSolved) {
        showToast('✅ 이미 구호장비 보관함 방향 자물쇠가 해제되었습니다.', 'border-emerald-400');
        return;
      }
      if (dirLockBuffer.length < 6) {
        SoundFX.warning();
        if (dirLockFeedbackMsg) {
          dirLockFeedbackMsg.textContent = `⚠️ 방향 6단계를 모두 입력해 주세요! (현재 ${dirLockBuffer.length}/6단계 입력됨)`;
          dirLockFeedbackMsg.className = 'p-2 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-300 font-bold text-center';
        }
        return;
      }
      const isMatch = TARGET_DIR_SEQUENCE.every((v, idx) => dirLockBuffer[idx] === v);
      if (isMatch) {
        dirLockSolved = true;
        player.hasMask = true;
        player.hasFlashlight = true;
        flashlightSpotEnabled = true;
        score += 200;
        SoundFX.win();
        updateDirLockPuzzleUI();
        updateHUD();
        saveCampaignState();
        showToast('🧭 [방향 자물쇠 해제 성공!] 방연마스크(😷)와 3D 전술 손전등(🔦)을 획득했습니다! (+200점)', 'border-purple-400');
      } else {
        dirLockBuffer = [];
        SoundFX.warning();
        updateDirLockPuzzleUI();
        if (dirLockFeedbackMsg) {
          dirLockFeedbackMsg.textContent = '❌ 방향 순서가 일치하지 않습니다! 단서: 위 → 오른쪽 → 오른쪽 → 아래 → 왼쪽 → 위';
          dirLockFeedbackMsg.className = 'p-2 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 font-bold text-center';
        }
      }
    });
  }

  const TARGET_BOOK_ORDER = ['425.12', '425.2', '430', '440', '450', '480'];
  const BOOK_TITLES = {
    '425.12': '화재 대류 현상과 연기 이동 원리',
    '425.2': '젖은 수건·방연마스크 호흡기 보호법',
    '430': 'ABC 분말소화기 PASS 분사 수칙',
    '440': '백드래프트 예방과 문 손잡이 온도 감지',
    '450': '완강기 3단계 착용 및 경량칸막이 탈출',
    '480': '119 긴급 신고 및 다중이용시설 피난'
  };

  function renderBookSortPuzzleUI() {
    if (!bookSortListContainer) return;
    bookSortListContainer.innerHTML = bookSortOrder.map((code, idx) => `
      <div class="p-2 rounded-lg bg-slate-900 border ${bookSortSolved ? 'border-emerald-500/50' : 'border-slate-700'} flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-300 font-mono font-black text-xs shrink-0">#${idx + 1} [${code}]</span>
          <span class="text-slate-200 font-bold text-xs truncate">${BOOK_TITLES[code] || '소방 안전 매뉴얼'}</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button type="button" data-book-idx="${idx}" data-book-dir="-1" class="book-move-btn px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] font-black text-slate-200" ${idx === 0 || bookSortSolved ? 'disabled' : ''}>◀ 앞</button>
          <button type="button" data-book-idx="${idx}" data-book-dir="1" class="book-move-btn px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] font-black text-slate-200" ${idx === bookSortOrder.length - 1 || bookSortSolved ? 'disabled' : ''}>뒤 ▶</button>
        </div>
      </div>
    `).join('');

    bookSortListContainer.querySelectorAll('.book-move-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        SoundFX.init();
        if (bookSortSolved) return;
        const idx = parseInt(btn.getAttribute('data-book-idx') || '0', 10);
        const dir = parseInt(btn.getAttribute('data-book-dir') || '0', 10);
        const swapIdx = idx + dir;
        if (swapIdx >= 0 && swapIdx < bookSortOrder.length) {
          const tmp = bookSortOrder[idx];
          bookSortOrder[idx] = bookSortOrder[swapIdx];
          bookSortOrder[swapIdx] = tmp;
          SoundFX.playTone(540, 'sine', 0.04, 0.06);
          renderBookSortPuzzleUI();
        }
      });
    });

    if (bookSortFeedbackMsg) {
      if (bookSortSolved) {
        bookSortFeedbackMsg.textContent = '✅ 십진 청구기호(425.12 → 425.2 → 430 → 440 → 450 → 480) 정렬 완료! (🪓소방도끼 + 🧯소화기 지급 완료)';
        bookSortFeedbackMsg.className = 'p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 font-bold text-center';
      } else {
        bookSortFeedbackMsg.textContent = '청구기호 소수점 크기(425.12 < 425.2)에 유의하여 오름차순으로 배열한 뒤 [정렬 검증]을 누르세요.';
        bookSortFeedbackMsg.className = 'p-2 rounded-lg bg-slate-900 border border-slate-800 text-sky-200 font-bold text-center';
      }
    }
  }

  if (btnSubmitBookSort) {
    btnSubmitBookSort.addEventListener('click', () => {
      SoundFX.init();
      if (bookSortSolved) {
        showToast('✅ 이미 소방 안전 매뉴얼 서가 정렬이 완료되었습니다.', 'border-emerald-400');
        return;
      }
      const ok = TARGET_BOOK_ORDER.every((c, idx) => bookSortOrder[idx] === c);
      if (ok) {
        bookSortSolved = true;
        player.hasAxe = true;
        player.extinguisherCharges += 1;
        score += 250;
        SoundFX.win();
        renderBookSortPuzzleUI();
        updateHUD();
        saveCampaignState();
        showToast('📚 [서가 청구기호 정렬 완료!] 비밀 격실이 열려 🪓소방도끼와 🧯소화기(+1회)를 획득했습니다! (+250점)', 'border-sky-400');
      } else {
        SoundFX.warning();
        if (bookSortFeedbackMsg) {
          bookSortFeedbackMsg.textContent = '❌ 정렬 순서가 올바르지 않습니다! 정답 순서: 425.12 → 425.2 → 430 → 440 → 450 → 480';
          bookSortFeedbackMsg.className = 'p-2 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 font-bold text-center';
        }
      }
    });
  }

  document.querySelectorAll('.safe-digit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      SoundFX.init();
      if (safeSolved || !safeCodeInput) return;
      if (safeLockUntil > 0 && elapsedSeconds < safeLockUntil) {
        SoundFX.warning();
        updateSafeLockUI();
        return;
      }
      const digit = btn.getAttribute('data-safe-digit') || '';
      if (safeCodeInput.value.length < 4) {
        safeCodeInput.value += String(digit);
        safeInputBuffer = safeCodeInput.value;
        SoundFX.playTone(620, 'sine', 0.04, 0.06);
      }
    });
  });

  if (btnSafeClear) {
    btnSafeClear.addEventListener('click', () => {
      SoundFX.init();
      if (safeSolved) return;
      safeInputBuffer = '';
      if (safeCodeInput) safeCodeInput.value = '';
      updateSafeLockUI();
    });
  }

  if (btnSubmitSafeCode) {
    btnSubmitSafeCode.addEventListener('click', () => {
      SoundFX.init();
      const targetCode = getStageSafePasscode();
      if (safeSolved) {
        showToast('✅ 이미 잠금이 해제된 비상 금고입니다.', 'border-emerald-400');
        return;
      }
      if (safeLockUntil > 0 && elapsedSeconds < safeLockUntil) {
        SoundFX.warning();
        updateSafeLockUI();
        return;
      }
      const rawVal = safeCodeInput ? safeCodeInput.value.trim() : safeInputBuffer.trim();
      // PRD T05 Rule: Empty or incomplete (< 3 digits) input shows guidance and NEVER increments wrong attempt count!
      if (!rawVal || rawVal.length < 3) {
        SoundFX.warning();
        if (safeFeedbackMsg) {
          safeFeedbackMsg.textContent = '⚠️ 비밀번호 3~4자리를 모두 입력해 주세요! (빈 입력·미완성 입력은 오답 횟수에 포함되지 않습니다)';
          safeFeedbackMsg.className = 'p-2 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-300 font-bold text-center';
        }
        return;
      }

      // PRD T05 Rule: Exact string comparison (preserves leading '0' in '0119', accepts stage code, '614', or '0119')
      if (String(rawVal) === String(targetCode) || String(rawVal) === '614' || String(rawVal) === '0119') {
        safeSolved = true;
        safeWrongCount = 0;
        safeLockUntil = 0;
        player.keys += 1;
        score += 200;
        SoundFX.win();
        updateSafeLockUI();
        updateHUD();
        saveCampaignState();
        showToast(`🔓 [비상 금고 해제 성공!] 정답(${rawVal}) 확인! 비상 마스터 열쇠(🔑 +1)와 +200점을 획득했습니다!`, 'border-emerald-400');
      } else {
        safeWrongCount += 1;
        safeInputBuffer = '';
        if (safeCodeInput) safeCodeInput.value = '';
        SoundFX.hurt();
        if (safeWrongCount >= 3) {
          safeLockUntil = elapsedSeconds + 30;
          saveCampaignState();
          updateSafeLockUI();
          showToast('⏳ 금고 비밀번호 3회 연속 오답! 30초 동안 입력이 잠깁니다. 수첩(H키)에서 단서를 확인하세요!', 'border-red-500');
        } else {
          saveCampaignState();
          updateSafeLockUI();
          if (safeFeedbackMsg) {
            safeFeedbackMsg.textContent = `❌ 비밀번호가 일치하지 않습니다! (오답 횟수: ${safeWrongCount} / 3회 — 수첩 단서 원문을 확인하세요)`;
            safeFeedbackMsg.className = 'p-2 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 font-bold text-center';
          }
        }
      }
    });
  }

  if (btnSubmitWirePuzzle) {
    btnSubmitWirePuzzle.addEventListener('click', () => {
      SoundFX.init();
      if (wireSolved) {
        showToast('✅ 이미 배전판 비상 배선 복구가 완료되었습니다.', 'border-emerald-400');
        return;
      }
      const rVal = wireSelectRed ? wireSelectRed.value : '';
      const bVal = wireSelectBlue ? wireSelectBlue.value : '';
      const yVal = wireSelectYellow ? wireSelectYellow.value : '';
      const gVal = wireSelectGreen ? wireSelectGreen.value : '';
      if (!rVal || !bVal || !yVal || !gVal) {
        SoundFX.warning();
        if (wireFeedbackMsg) {
          wireFeedbackMsg.textContent = '⚠️ 4개의 전선(빨강·파랑·노랑·초록) 단자를 모두 선택해 주세요!';
          wireFeedbackMsg.className = 'p-2 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-300 font-bold text-center';
        }
        return;
      }
      if (rVal === 'B' && bVal === 'D' && yVal === 'A' && gVal === 'C') {
        wireSolved = true;
        player.breakerClosed = true;
        player.extinguisherCharges += 1;
        score += 250;
        SoundFX.win();
        updateWirePuzzleUI();
        updateHUD();
        saveCampaignState();
        showToast('⚡ [배전판 배선 복구 완료!] 전원 차단기 안전 조치 완료 & 소화기(+1회)가 충전되었습니다! (+250점)', 'border-sky-400');
      } else {
        SoundFX.warning();
        if (wireFeedbackMsg) {
          wireFeedbackMsg.textContent = '❌ 배선 연결이 올바르지 않습니다! 단서: 🔴빨강(RED)=B, 🔵파랑(BLUE)=D, 🟡노랑(YELLOW)=A, 🟢초록(GREEN)=C';
          wireFeedbackMsg.className = 'p-2 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 font-bold text-center';
        }
      }
    });
  }

  function openPuzzleModalFn(defaultSubTab = 'safe') {
    if (!puzzleModal) return;
    clearAllInputStates();
    if (mapEditorInstance) mapEditorInstance.close();
    const stModal = document.getElementById('settingsModal');
    [certModal, guideModal, classModal, teacherModal, notebookModal, stModal, moreToolsDrawer].forEach((m) => {
      if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
    });
    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
      pauseIcon.textContent = '▶️';
      pauseText.textContent = '계속하기';
    }
    switchPuzzleSubTab(defaultSubTab);
    puzzleModal.classList.remove('hidden');
    puzzleModal.classList.add('flex');
  }

  function closePuzzleModalFn() {
    if (!puzzleModal) return;
    clearAllInputStates();
    puzzleModal.classList.add('hidden');
    puzzleModal.classList.remove('flex');
    if (
      gameState === 'PAUSED' &&
      gameOverlay.classList.contains('hidden') &&
      eduModal.classList.contains('hidden') &&
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

  if (btnPuzzleTop) btnPuzzleTop.addEventListener('click', () => { SoundFX.init(); openPuzzleModalFn('safe'); });
  if (btnPuzzleInspector) btnPuzzleInspector.addEventListener('click', () => { SoundFX.init(); openPuzzleModalFn('safe'); });
  if (btnClosePuzzleModal) btnClosePuzzleModal.addEventListener('click', closePuzzleModalFn);

  // --- Section 6, F09, T07~T11: Settings, Time/Tension-Relief Policy & Save Export/Import (1MiB limit) ---
  const settingsModal = document.getElementById('settingsModal');
  const btnSettingsTop = document.getElementById('btnSettingsTop');
  const btnCloseSettingsModal = document.getElementById('btnCloseSettingsModal');
  const btnResumeFromSettings = document.getElementById('btnResumeFromSettings');
  const settingsTimeSummary = document.getElementById('settingsTimeSummary');
  const btnModeStandard = document.getElementById('btnModeStandard');
  const btnModeRelaxed = document.getElementById('btnModeRelaxed');
  const btnModePractice = document.getElementById('btnModePractice');
  const tensionPolicyNotice = document.getElementById('tensionPolicyNotice');
  const btnTogglePracticeMode = document.getElementById('btnTogglePracticeMode');
  const selectGraphicsQuality = document.getElementById('selectGraphicsQuality');
  const rangeBrightness = document.getElementById('rangeBrightness');
  const lblBrightness = document.getElementById('lblBrightness');
  const rangeSensitivity = document.getElementById('rangeSensitivity');
  const lblSensitivity = document.getElementById('lblSensitivity');
  const chkReduceMotion = document.getElementById('chkReduceMotion');
  const saveSlotStatusBadge = document.getElementById('saveSlotStatusBadge');
  const btnManualSaveNow = document.getElementById('btnManualSaveNow');
  const btnExportSaveJson = document.getElementById('btnExportSaveJson');
  const inputImportSaveJson = document.getElementById('inputImportSaveJson');
  const saveImportPreviewBox = document.getElementById('saveImportPreviewBox');
  const saveImportPreviewText = document.getElementById('saveImportPreviewText');
  const btnConfirmImportSave = document.getElementById('btnConfirmImportSave');
  const btnCancelImportSave = document.getElementById('btnCancelImportSave');
  const saveActionFeedback = document.getElementById('saveActionFeedback');
  const btnSaveAndExitMain = document.getElementById('btnSaveAndExitMain');

  let pendingImportedSave = null;

  function persistAppSettings() {
    try {
      localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({
        ...appSettings,
        defaultMode: nextRunOptions.mode
      }));
    } catch (e) {}
  }

  function updateTimePolicyModalUI() {
    if (settingsTimeSummary) {
      const m = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
      const s = String(Math.floor(elapsedSeconds % 60)).padStart(2, '0');
      const curExp = Math.floor(hazardExposure);
      const limitStr = runOptions.mode === 'practice' || runOptions.hazardLimitSeconds === null
        ? '무제한(연습)'
        : `${runOptions.hazardLimitSeconds}s`;
      settingsTimeSummary.textContent = `경과 ${m}:${s} | 위험노출 ${curExp}s / ${limitStr}`;
    }

    const modeBtns = [
      { btn: btnModeStandard, mode: 'standard' },
      { btn: btnModeRelaxed, mode: 'relaxed' },
      { btn: btnModePractice, mode: 'practice' }
    ];
    modeBtns.forEach(({ btn, mode }) => {
      if (!btn) return;
      const isCur = nextRunOptions.mode === mode;
      btn.className = isCur
        ? 'py-1.5 px-2 rounded-lg bg-emerald-600 text-white font-extrabold text-[11px]'
        : 'py-1.5 px-2 rounded-lg bg-slate-800 text-slate-300 font-bold text-[11px]';
    });

    if (btnTogglePracticeMode) {
      const isPrac = runOptions.mode === 'practice';
      btnTogglePracticeMode.textContent = isPrac ? '켜짐 (해제)' : '연습 모드 켜기';
      btnTogglePracticeMode.className = isPrac
        ? 'px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-extrabold text-white shrink-0'
        : 'px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-extrabold text-white shrink-0';
    }
  }

  // PRD Section 6.3 & T11 Rule:
  // - 300s -> 480s (Relaxed): Applies immediately to current run AND next run.
  // - 480s -> 300s (Standard): Keeps 480s for current run if already in progress (elapsedSeconds > 0) so turning off Relaxed Mode at 350s NEVER causes instant failure! Applies 300s starting next new game.
  function applyTimePolicyMode(targetMode) {
    if (targetMode === 'relaxed') {
      runOptions = { mode: 'relaxed', hazardLimitSeconds: 480 };
      nextRunOptions = { mode: 'relaxed', hazardLimitSeconds: 480 };
      if (tensionPolicyNotice) {
        tensionPolicyNotice.textContent = '✅ [긴장 완화 모드(480초)]가 현재 진행 중인 게임부터 즉시 적용되었습니다!';
      }
      showToast('🛡️ [긴장 완화 모드 ON] 위험 노출 허용 시간이 480초로 즉시 완화되었습니다!', 'border-emerald-400');
    } else if (targetMode === 'standard') {
      nextRunOptions = { mode: 'standard', hazardLimitSeconds: 300 };
      if (elapsedSeconds > 0 && runOptions.mode === 'relaxed') {
        if (tensionPolicyNotice) {
          tensionPolicyNotice.textContent = 'ℹ️ 진행 중인 게임은 즉사 방지를 위해 480초가 유지되며, 다음 새 게임부터 기본 모드(300초)가 적용됩니다.';
        }
        showToast('ℹ️ 현재 판은 480초를 유지하며, 다음 새 게임부터 기본 모드(300초)가 적용됩니다.', 'border-sky-400');
      } else {
        runOptions = { mode: 'standard', hazardLimitSeconds: 300 };
        if (tensionPolicyNotice) {
          tensionPolicyNotice.textContent = '✅ 기본 모드(300초)가 적용되었습니다.';
        }
        showToast('⏱️ 기본 모드(위험 노출 300초 기준)로 설정되었습니다.');
      }
    } else if (targetMode === 'practice') {
      runOptions = { mode: 'practice', hazardLimitSeconds: null };
      nextRunOptions = { mode: 'practice', hazardLimitSeconds: null };
      if (tensionPolicyNotice) {
        tensionPolicyNotice.textContent = '✅ [연습·수업 모드(시간 실패 없음)]가 현재 진행 중인 게임부터 즉시 적용되었습니다!';
      }
      showToast('🏫 [연습·수업 모드 ON] 시간 초과 실패 없이 모든 퍼즐과 대피 경로를 안전하게 실습할 수 있습니다!', 'border-amber-400');
    }
    persistAppSettings();
    saveCampaignState();
    updateTimePolicyModalUI();
  }

  if (btnModeStandard) btnModeStandard.addEventListener('click', () => { SoundFX.init(); applyTimePolicyMode('standard'); });
  if (btnModeRelaxed) btnModeRelaxed.addEventListener('click', () => { SoundFX.init(); applyTimePolicyMode('relaxed'); });
  if (btnModePractice) btnModePractice.addEventListener('click', () => { SoundFX.init(); applyTimePolicyMode('practice'); });

  if (btnTogglePracticeMode) {
    btnTogglePracticeMode.addEventListener('click', () => {
      SoundFX.init();
      if (runOptions.mode === 'practice') {
        applyTimePolicyMode('standard');
      } else {
        applyTimePolicyMode('practice');
      }
    });
  }

  function updateSaveStatusUI() {
    const saved = loadValidCampaignSave();
    if (!saved) {
      if (saveSlotStatusBadge) saveSlotStatusBadge.textContent = '슬롯 비어 있음';
      if (saveActionFeedback) saveActionFeedback.textContent = '현재 자동 저장 슬롯(fire-safety:campaign:v2): 비어 있음 (게임을 시작하면 5초마다 및 주요 행동 시 자동 저장됩니다)';
    } else {
      const m = String(Math.floor((saved.elapsedSeconds || 0) / 60)).padStart(2, '0');
      const s = String(Math.floor((saved.elapsedSeconds || 0) % 60)).padStart(2, '0');
      if (saveSlotStatusBadge) saveSlotStatusBadge.textContent = `저장됨 (${saved.stageName})`;
      if (saveActionFeedback) {
        saveActionFeedback.textContent = `자동 저장됨: [${saved.stageName}] · 점수 ${Number(saved.score || 0).toLocaleString()}점 · 경과 ${m}:${s} · 힌트 ${Array.isArray(saved.hintLog) ? saved.hintLog.length : 0}회`;
      }
    }
  }

  if (btnManualSaveNow) {
    btnManualSaveNow.addEventListener('click', () => {
      SoundFX.init();
      saveCampaignState();
      updateSaveStatusUI();
      showToast('💾 현재 진행 상태가 이 브라우저에 즉시 저장되었습니다!', 'border-emerald-400');
    });
  }

  // --- Feature 2 & 6: Grade-Level One-Click Preset & TTS Voice Guide in Settings Modal ---
  const btnGradeLow = document.getElementById('btnGradeLow');
  const btnGradeStandard = document.getElementById('btnGradeStandard');
  const btnGradeAdvanced = document.getElementById('btnGradeAdvanced');
  const gradePresetActiveBadge = document.getElementById('gradePresetBadge') || document.getElementById('gradePresetActiveBadge');
  const gradePresetDescText = document.getElementById('gradePresetNotice') || document.getElementById('gradePresetDescText');
  const chkVoiceTts = document.getElementById('chkVoiceTts');

  function updateGradePresetModalUI() {
    const gp = appSettings.gradePreset || 'standard';
    const activeCls = 'py-1.5 px-2 rounded-lg bg-emerald-600 text-white font-extrabold text-[11px] transition shadow';
    const idleCls = 'py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] transition';
    if (btnGradeLow) btnGradeLow.className = gp === 'low' ? activeCls : idleCls;
    if (btnGradeStandard) btnGradeStandard.className = gp === 'standard' ? activeCls : idleCls;
    if (btnGradeAdvanced) btnGradeAdvanced.className = gp === 'advanced' ? activeCls : idleCls;
    if (gradePresetActiveBadge) {
      gradePresetActiveBadge.textContent = gp === 'low'
        ? '초등 1~2학년 입문'
        : (gp === 'advanced' ? '중등·심화 챌린지' : '초등 3~6학년 표준');
    }
    if (gradePresetDescText) {
      if (gp === 'low') {
        gradePresetDescText.innerHTML = '• <strong>초등 1~2학년(입문)</strong>: 불길·연기 피해 45% 완화 · 연기 확산 속도 완화 · 수첩 1단계 힌트 자동 개방 · 음성 읽어주기 권장.';
      } else if (gp === 'advanced') {
        gradePresetDescText.innerHTML = '• <strong>중등·심화(도전)</strong>: 불길·연기 피해 25% 강화 · 연기 확산 가속 · 실전 위기 대응력 극대화.';
      } else {
        gradePresetDescText.innerHTML = '• <strong>초등 3~6학년(표준)</strong>: 기본 화염 확산 속도 및 4종 방탈출 퍼즐 표준 난이도가 적용됩니다.';
      }
    }
    if (chkVoiceTts) chkVoiceTts.checked = !!appSettings.voiceTts;
  }

  function applyGradePreset(presetKey, showNotice = true) {
    appSettings.gradePreset = presetKey;
    if (presetKey === 'low') {
      applyTimePolicyMode('relaxed');
    } else if (presetKey === 'standard') {
      applyTimePolicyMode('standard');
    }
    persistAppSettings();
    updateGradePresetModalUI();
    if (showNotice) {
      const label = presetKey === 'low' ? '🌱 초등 1~2학년 입문' : (presetKey === 'advanced' ? '🔥 중등·심화' : '🏫 초등 3~6학년 표준');
      SoundFX.pickup();
      showToast(`🎓 학년군 맞춤 난이도가 [${label}] 모드로 설정되었습니다!`, 'border-emerald-400');
    }
  }

  if (btnGradeLow) btnGradeLow.addEventListener('click', () => applyGradePreset('low', true));
  if (btnGradeStandard) btnGradeStandard.addEventListener('click', () => applyGradePreset('standard', true));
  if (btnGradeAdvanced) btnGradeAdvanced.addEventListener('click', () => applyGradePreset('advanced', true));

  if (chkVoiceTts) {
    chkVoiceTts.addEventListener('change', () => {
      appSettings.voiceTts = !!chkVoiceTts.checked;
      persistAppSettings();
      if (appSettings.voiceTts) {
        SoundFX.init();
        speakGuideIfEnabled('음성 내비게이션 자동 읽어주기 기능이 켜졌습니다.');
        showToast('🔊 [음성 내비게이션 ON] 상단 대피 목표와 안전 퀴즈 지문을 한국어 음성으로 읽어줍니다!', 'border-sky-400');
      } else {
        showToast('🔇 음성 내비게이션 자동 읽어주기가 해제되었습니다.');
      }
    });
  }

  function openSettingsModalFn() {
    if (!settingsModal) return;
    clearAllInputStates();
    if (mapEditorInstance) mapEditorInstance.close();
    [certModal, guideModal, classModal, teacherModal, notebookModal, puzzleModal, moreToolsDrawer].forEach((m) => {
      if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
    });
    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
      pauseIcon.textContent = '▶️';
      pauseText.textContent = '계속하기';
    }
    if (selectGraphicsQuality) selectGraphicsQuality.value = appSettings.graphicsQuality || 'auto';
    const bRatio = Number(((appSettings.brightness || 100) / 100).toFixed(1));
    const sRatio = Number(((appSettings.sensitivity || 100) / 100).toFixed(1));
    if (rangeBrightness) rangeBrightness.value = String(bRatio);
    if (lblBrightness) lblBrightness.textContent = bRatio.toFixed(1);
    if (rangeSensitivity) rangeSensitivity.value = String(sRatio);
    if (lblSensitivity) lblSensitivity.textContent = sRatio.toFixed(1);
    if (chkReduceMotion) chkReduceMotion.checked = !!appSettings.reduceMotion;
    updateTimePolicyModalUI();
    updateGradePresetModalUI();
    updateSaveStatusUI();
    settingsModal.classList.remove('hidden');
    settingsModal.classList.add('flex');
  }

  function closeSettingsModalFn() {
    if (!settingsModal) return;
    clearAllInputStates();
    settingsModal.classList.add('hidden');
    settingsModal.classList.remove('flex');
    if (
      gameState === 'PAUSED' &&
      gameOverlay.classList.contains('hidden') &&
      eduModal.classList.contains('hidden') &&
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

  if (btnSettingsTop) btnSettingsTop.addEventListener('click', () => { SoundFX.init(); openSettingsModalFn(); });
  if (btnCloseSettingsModal) btnCloseSettingsModal.addEventListener('click', closeSettingsModalFn);
  if (btnResumeFromSettings) btnResumeFromSettings.addEventListener('click', closeSettingsModalFn);

  if (selectGraphicsQuality) {
    selectGraphicsQuality.addEventListener('change', () => {
      appSettings.graphicsQuality = selectGraphicsQuality.value || 'auto';
      persistAppSettings();
      resizeCanvas();
    });
  }
  if (rangeBrightness) {
    rangeBrightness.addEventListener('input', () => {
      const val = parseFloat(rangeBrightness.value) || 1.0;
      appSettings.brightness = Math.round(val * 100);
      if (lblBrightness) lblBrightness.textContent = val.toFixed(1);
      persistAppSettings();
      resizeCanvas();
    });
  }
  if (rangeSensitivity) {
    rangeSensitivity.addEventListener('input', () => {
      const val = parseFloat(rangeSensitivity.value) || 1.0;
      appSettings.sensitivity = Math.round(val * 100);
      if (lblSensitivity) lblSensitivity.textContent = val.toFixed(1);
      persistAppSettings();
    });
  }
  if (chkReduceMotion) {
    chkReduceMotion.addEventListener('change', () => {
      appSettings.reduceMotion = !!chkReduceMotion.checked;
      persistAppSettings();
    });
  }

  // --- Features 1, 3, 4, 8: Teacher Modal Classroom Enhancements ---
  const teacherQrClassInput = document.getElementById('teacherQrClassInput');
  const teacherQrStageSelect = document.getElementById('teacherQrStageSelect');
  const teacherQrGradeSelect = document.getElementById('teacherQrGradeSelect');
  const teacherQrTimeSelect = document.getElementById('teacherQrModeSelect') || document.getElementById('teacherQrTimeSelect');
  const btnGenerateTeacherQr = document.getElementById('btnGenerateTeacherQr');
  const btnCopyTeacherPresetUrl = document.getElementById('btnCopyTeacherPresetUrl');
  const teacherQrBox = document.getElementById('teacherQrBox');
  const teacherQrCanvas = document.getElementById('teacherQrCanvas');
  const teacherPresetUrlPreview = document.getElementById('teacherQrUrlText') || document.getElementById('teacherPresetUrlPreview');

  function buildTeacherPresetUrl() {
    const baseUrl = window.location.origin && window.location.origin !== 'null'
      ? `${window.location.origin}${window.location.pathname}`
      : window.location.href.split('?')[0];
    const p = new URLSearchParams();
    const cls = (teacherQrClassInput && teacherQrClassInput.value.trim()) || currentClassCode || '서울초 5-2';
    const stg = (teacherQrStageSelect && teacherQrStageSelect.value) || '0';
    const grd = (teacherQrGradeSelect && teacherQrGradeSelect.value) || 'standard';
    const tm = (teacherQrTimeSelect && teacherQrTimeSelect.value) || 'practice';
    if (cls) p.set('class', cls);
    p.set('stage', stg);
    p.set('grade', grd);
    p.set('timeMode', tm);
    return `${baseUrl}?${p.toString()}`;
  }

  function renderTeacherPresetQr() {
    const url = buildTeacherPresetUrl();
    if (teacherPresetUrlPreview) teacherPresetUrlPreview.textContent = url;
    if (teacherQrCanvas && window.FireEscape && typeof window.FireEscape.drawFallbackQrMatrix === 'function') {
      window.FireEscape.drawFallbackQrMatrix(teacherQrCanvas, url);
    }
    return url;
  }

  if (btnGenerateTeacherQr) {
    btnGenerateTeacherQr.addEventListener('click', () => {
      SoundFX.init();
      if (teacherQrBox) {
        teacherQrBox.classList.remove('hidden');
        teacherQrBox.classList.add('flex');
      }
      const stgVal = (teacherQrStageSelect && teacherQrStageSelect.value) || '0';
      const grdVal = (teacherQrGradeSelect && teacherQrGradeSelect.value) || 'standard';
      const tmVal = (teacherQrTimeSelect && teacherQrTimeSelect.value) || 'practice';
      applyGradePreset(grdVal, false);
      applyTimePolicyMode(tmVal);
      if (stgVal === 'daily') {
        loadStage(0, false, getDailyChallengeStage());
      } else {
        const idx = parseInt(stgVal, 10);
        if (!isNaN(idx) && idx >= 0 && idx < STAGES.length) {
          loadStage(idx, false, null);
        }
      }
      renderTeacherPresetQr();
      SoundFX.pickup();
      showToast('📱 전자칠판용 수업 프리셋 QR 코드가 표시되고 현재 게임에도 적용되었습니다!', 'border-sky-400');
    });
  }

  if (btnCopyTeacherPresetUrl) {
    btnCopyTeacherPresetUrl.addEventListener('click', () => {
      SoundFX.init();
      const url = renderTeacherPresetQr();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).catch(() => {});
      }
      SoundFX.pickup();
      showToast('🔗 학급·단계·난이도가 포함된 수업 프리셋 링크가 복사되었습니다!', 'border-sky-400');
    });
  }

  // Feature 3: 4-Slide Pre-Class Briefing Deck
  const BRIEFING_SLIDES = [
    {
      badge: '1 / 4',
      title: '① 연기 대류 현상과 젖은 수건·낮은 자세',
      body: '불이 나면 뜨거워진 유독가스와 연기는 밀도가 낮아져 <strong>천장(위쪽)부터 빠르게 차오르고</strong>, 비교적 차갑고 깨끗한 공기는 바닥 30~60cm 부근에 남습니다. 따라서 <strong>젖은 수건이나 방연마스크로 코와 입을 막고 낮은 자세(🧎)</strong>로 벽을 짚으며 이동해야 질식을 막을 수 있습니다.'
    },
    {
      badge: '2 / 4',
      title: '② 연소의 3요소와 화재 유형별 맞춤 소화 원리',
      body: '불이 타오르려면 <strong>가연물·산소·발화점 이상의 온도</strong>가 필요합니다. 일반 화재는 물(🪣냉각 소화)로 끄지만, <strong>식용유(K급)·전기 콘센트(C급)·배터리/마그네슘 금속 화재(D급)</strong>에 물을 부으면 폭발·감전 위험이 있으므로 반드시 전용 소화기(🧯질식 소화)나 모래를 사용해야 합니다!'
    },
    {
      badge: '3 / 4',
      title: '③ 백드래프트(Backdraft) 예방과 방화문 닫기',
      body: '실내에 뜨거운 가스가 가득 찬 상태에서 문을 갑자기 열면 산소가 유입되며 화염이 폭발하는 <strong>백드래프트</strong>가 일어납니다! 문을 열기 전 <strong>손등으로 문손잡이 온도를 확인(🌡️)</strong>하고, 대피한 뒤에는 <strong>방화문을 닫아(🚪)</strong> 연기 확산을 차단하세요.'
    },
    {
      badge: '4 / 4',
      title: '④ 현관이 막혔을 때의 생명줄: 경량칸막이 & 완강기',
      body: '아파트 발코니 벽면의 <strong>9mm 경량칸막이(🧱)</strong>는 발로 차서 부수고 옆집으로 대피할 수 있습니다. 고층 건물에서는 <strong>완강기(🪢)</strong> 속도조절기와 안전벨트를 가슴 높이에 단단히 조이고 벽면을 짚으며 안전하게 하강합니다!'
    }
  ];
  let currentBriefingSlideIdx = 0;
  const briefingSlideBadge = document.getElementById('briefingSlideBadge');
  const briefingSlideTitle = document.getElementById('briefingSlideTitle');
  const briefingSlideDesc = document.getElementById('briefingSlideDesc');
  const briefingSlideBox = document.getElementById('briefingSlideBox');
  const btnBriefingPrev = document.getElementById('btnBriefingPrev');
  const btnBriefingNext = document.getElementById('btnBriefingNext');

  function renderBriefingSlide() {
    const sl = BRIEFING_SLIDES[currentBriefingSlideIdx] || BRIEFING_SLIDES[0];
    if (briefingSlideBadge) briefingSlideBadge.textContent = sl.badge;
    if (briefingSlideTitle) briefingSlideTitle.textContent = sl.title;
    if (briefingSlideDesc) briefingSlideDesc.innerHTML = sl.body;
    if (briefingSlideBox) {
      briefingSlideBox.innerHTML = `<div class="text-sm sm:text-base font-black text-amber-300 mb-1">${sl.title}</div><p class="text-xs sm:text-sm text-slate-200 leading-relaxed">${sl.body}</p>`;
    }
  }

  if (btnBriefingPrev) {
    btnBriefingPrev.addEventListener('click', () => {
      currentBriefingSlideIdx = (currentBriefingSlideIdx - 1 + BRIEFING_SLIDES.length) % BRIEFING_SLIDES.length;
      renderBriefingSlide();
    });
  }
  if (btnBriefingNext) {
    btnBriefingNext.addEventListener('click', () => {
      currentBriefingSlideIdx = (currentBriefingSlideIdx + 1) % BRIEFING_SLIDES.length;
      renderBriefingSlide();
    });
  }

  // Feature 4: Custom Safe Passcode & Escape Quiz Builder
  const customSafeCodeInput = document.getElementById('customSafeCodeInput');
  const customSafeClueInput = document.getElementById('customSafeClueInput');
  const customQuizTitleInput = document.getElementById('customQuizTitleInput');
  const customQuizGoodInput = document.getElementById('customQuizGoodInput');
  const customQuizBadInput = document.getElementById('customQuizBadInput');
  const btnApplyCustomQuizNow = document.getElementById('btnApplyCustomQuizNow');
  const btnCopyCustomQuizUrl = document.getElementById('btnCopyCustomQuizUrl');

  function collectCustomQuizFromInputs() {
    const safeCode = (customSafeCodeInput && customSafeCodeInput.value.trim()) || '';
    const safeClue = (customSafeClueInput && customSafeClueInput.value.trim()) || '';
    const quizTitle = (customQuizTitleInput && customQuizTitleInput.value.trim()) || '';
    const goodChoice = (customQuizGoodInput && customQuizGoodInput.value.trim()) || '';
    const badChoice = (customQuizBadInput && customQuizBadInput.value.trim()) || '';
    return { safeCode, safeClue, quizTitle, goodChoice, badChoice };
  }

  if (btnApplyCustomQuizNow) {
    btnApplyCustomQuizNow.addEventListener('click', () => {
      SoundFX.init();
      customQuizConfig = collectCustomQuizFromInputs();
      renderNotebookModal();
      SoundFX.pickup();
      showToast(`🔐 우리 반 맞춤 금고 암호(${getStageSafePasscode()})와 안전 퀴즈가 현재 게임에 즉시 적용되었습니다!`, 'border-emerald-400');
    });
  }

  if (btnCopyCustomQuizUrl) {
    btnCopyCustomQuizUrl.addEventListener('click', () => {
      SoundFX.init();
      customQuizConfig = collectCustomQuizFromInputs();
      renderNotebookModal();
      const baseUrl = window.location.origin && window.location.origin !== 'null'
        ? `${window.location.origin}${window.location.pathname}`
        : window.location.href.split('?')[0];
      const encoded = btoa(encodeURIComponent(JSON.stringify(customQuizConfig)));
      const p = new URLSearchParams();
      if (currentClassCode) p.set('class', currentClassCode);
      p.set('customQuiz', encoded);
      const shareUrl = `${baseUrl}?${p.toString()}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).catch(() => {});
      }
      SoundFX.pickup();
      showToast('🔗 선생님이 출제한 우리 반 맞춤 금고 암호·퀴즈 링크(?customQuiz=...)가 복사되었습니다!', 'border-emerald-400');
    });
  }

  // Feature 8: School Record (학교생활기록부) Example Sentence Auto-Generator
  const selectSchoolRecordType = document.getElementById('selectSchoolRecordType');
  const schoolRecordStudentInput = document.getElementById('schoolRecordStudentInput');
  const schoolRecordTextarea = document.getElementById('schoolRecordOutput') || document.getElementById('schoolRecordTextarea');
  const btnCopySchoolRecord = document.getElementById('btnCopySchoolRecord');

  function updateSchoolRecordText() {
    if (!schoolRecordTextarea) return;
    const type = (selectSchoolRecordType && selectSchoolRecordType.value) || 'science';
    const stName = (schoolRecordStudentInput && schoolRecordStudentInput.value.trim()) || '';
    const prefix = stName ? `${stName} 학생은 ` : '';
    const templates = {
      science: `${prefix}연소와 소화 단원과 연계한 3D 화재 진압 시뮬레이션에서 가연물·산소·발화점의 연소 3요소와 연기 대류 현상을 이해하고, 일반·전기·식용유·금속 화재 등 화재 원인별로 냉각 소화와 질식 소화(분말·K급 소화기, 모래)를 올바르게 구분하여 적용하는 과학적 탐구 역량을 보임.`,
      facility: `${prefix}다중이용시설 및 아파트 화재 대피 시뮬레이션에서 닫힌 문 개방 전 손등 온도 확인(백드래프트 예방), 방화문 닫기를 통한 연기 확산 차단, 경량칸막이 파괴 및 완강기 하강 절차를 정확히 숙지하고 침착하게 완수함.`,
      coop: `${prefix}모둠원들과 조작·관찰·기록·설명 역할을 순환하며 협력적으로 방탈출 단서를 해결하고, 가정과 교실의 5대 화재 위험요소를 사전 점검하여 우리 집 맞춤 비상 대피도를 직접 설계·공유하는 등 공동체 안전 의식이 돋보임.`
    };
    schoolRecordTextarea.value = templates[type] || templates.science;
  }

  if (selectSchoolRecordType) selectSchoolRecordType.addEventListener('change', updateSchoolRecordText);
  if (schoolRecordStudentInput) schoolRecordStudentInput.addEventListener('input', updateSchoolRecordText);
  if (btnCopySchoolRecord) {
    btnCopySchoolRecord.addEventListener('click', () => {
      SoundFX.init();
      updateSchoolRecordText();
      const txt = schoolRecordTextarea ? schoolRecordTextarea.value : '';
      if (txt && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).catch(() => {});
      }
      SoundFX.pickup();
      showToast('📋 학교생활기록부(창체·교과 세특) 예시 문구가 클립보드에 복사되었습니다!', 'border-amber-400');
    });
  }

  // Export Save JSON (exportVersion: 1)
  if (btnExportSaveJson) {
    btnExportSaveJson.addEventListener('click', () => {
      SoundFX.init();
      if (gameState === 'PLAYING' || gameState === 'PAUSED') {
        saveCampaignState();
      }
      const campaign = loadValidCampaignSave() || buildCampaignSnapshot();
      const exportPayload = {
        exportVersion: 1,
        exportedAt: new Date().toISOString(),
        app: 'fire-safety-3d',
        campaign
      };
      try {
        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fire-safety-save-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        SoundFX.pickup();
        showToast('📤 현재 캠페인 저장 데이터가 JSON 파일로 내보내기 되었습니다!', 'border-emerald-400');
      } catch (e) {
        showToast('⚠️ JSON 내보내기 중 오류가 발생했습니다.', 'border-red-500');
      }
    });
  }

  // Import Save JSON with 1MiB (1,048,576 bytes) limit & schema validation & preview (T12, T13)
  if (inputImportSaveJson) {
    inputImportSaveJson.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 1048576) {
        SoundFX.warning();
        showToast('⚠️ 가져오기 실패: 파일 크기가 1MiB(1,048,576 바이트) 제한을 초과합니다!', 'border-red-500');
        inputImportSaveJson.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result || ''));
          const candidate = (parsed && parsed.exportVersion === 1 && parsed.campaign) ? parsed.campaign : parsed;
          const validation = validateCampaignSave(candidate);
          if (!validation.valid) {
            SoundFX.warning();
            showToast(`⚠️ 손상되었거나 호환되지 않는 저장 파일입니다: ${validation.reason}`, 'border-red-500');
            inputImportSaveJson.value = '';
            return;
          }
          pendingImportedSave = candidate;
          if (saveImportPreviewText && saveImportPreviewBox) {
            const mins = String(Math.floor((candidate.elapsedSeconds || 0) / 60)).padStart(2, '0');
            const secs = String(Math.floor((candidate.elapsedSeconds || 0) % 60)).padStart(2, '0');
            saveImportPreviewText.innerHTML = `✅ <strong>검증 통과:</strong> [${candidate.stageName || `${candidate.stageIdx + 1}단계`}] · 점수 <strong>${Number(candidate.score || 0).toLocaleString()}점</strong> · 경과 <strong>${mins}:${secs}</strong> · 힌트 <strong>${Array.isArray(candidate.hintLog) ? candidate.hintLog.length : 0}회</strong><br/><span class="text-slate-400">기존 슬롯은 자동으로 <code>fire-safety:campaign:backup</code>에 백업됩니다.</span>`;
            saveImportPreviewBox.classList.remove('hidden');
          }
        } catch (err) {
          SoundFX.warning();
          showToast('⚠️ JSON 파싱 실패: 올바른 저장 파일 형식이 아닙니다.', 'border-red-500');
        }
        inputImportSaveJson.value = '';
      };
      reader.readAsText(file);
    });
  }

  if (btnConfirmImportSave) {
    btnConfirmImportSave.addEventListener('click', () => {
      if (!pendingImportedSave) return;
      backupCurrentCampaignSave();
      try {
        localStorage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify(pendingImportedSave));
      } catch (e) {}
      const toRestore = pendingImportedSave;
      pendingImportedSave = null;
      if (saveImportPreviewBox) saveImportPreviewBox.classList.add('hidden');
      restoreCampaignState(toRestore);
    });
  }

  if (btnCancelImportSave) {
    btnCancelImportSave.addEventListener('click', () => {
      pendingImportedSave = null;
      if (saveImportPreviewBox) saveImportPreviewBox.classList.add('hidden');
    });
  }

  if (btnSaveAndExitMain) {
    btnSaveAndExitMain.addEventListener('click', () => {
      SoundFX.init();
      saveCampaignState();
      closeSettingsModalFn();
      showMainTitleScreen();
      showToast('💾 현재 진행 상태를 안전하게 저장하고 메인 화면으로 돌아왔습니다!', 'border-amber-400');
    });
  }

  // --- Section 11.4: Post-Activity Reflection .txt Export ---
  const btnExportReflection = document.getElementById('btnExportReflection');
  const reflectClueInput = document.getElementById('reflectClueInput');
  const reflectStrategyInput = document.getElementById('reflectStrategyInput');

  if (btnExportReflection) {
    btnExportReflection.addEventListener('click', () => {
      SoundFX.init();
      const studentName = (studentNameInput && studentNameInput.value.trim()) || '용감한 어린이';
      const cls = currentClassCode.trim() || '자유 참가반';
      const st = activeCustomStage || STAGES[currentStageIdx] || STAGES[0];
      const q1 = (reflectClueInput && reflectClueInput.value.trim()) || '(미작성)';
      const q2 = (reflectStrategyInput && reflectStrategyInput.value.trim()) || '(미작성)';
      const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
      const secs = String(Math.floor(elapsedSeconds % 60)).padStart(2, '0');

      const lines = [
        '====================================================',
        '[화재 탈출 넘버원 3D - 수업 후 성찰·토의 활동 기록]',
        '====================================================',
        `작성 일시: ${new Date().toLocaleString('ko-KR')}`,
        `학급 / 성명: ${cls} / ${studentName}`,
        `참여 단계: ${st.name} (${st.curriculumFocus || '화재 안전 실습'})`,
        `최종 등급 / 점수: ${debriefGrade ? debriefGrade.textContent : '-'} / ${score.toLocaleString()}점`,
        `소요 시간 / 힌트 사용: ${mins}:${secs} / ${hintLog.length}회`,
        '----------------------------------------------------',
        '[질문 1] 오늘 가장 결정적이었던 단서·안전 수칙 1가지:',
        q1,
        '',
        '[질문 2] 다시 도전한다면 바꾸고 싶은 대피 전략 1가지:',
        q2,
        '===================================================='
      ].join('\n');

      try {
        const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `화재안전_성찰기록_${studentName}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        SoundFX.pickup();
        showToast('💾 수업 후 성찰 기록(.txt) 파일이 저장되었습니다!', 'border-emerald-400');
      } catch (e) {
        showToast('⚠️ 성찰 기록 저장 중 오류가 발생했습니다.', 'border-red-500');
      }
    });
  }

  // --- Section 10: ?perf=1 Performance Diagnostic Overlay & JSON Export ---
  const perfDiagOverlay = document.getElementById('perfDiagOverlay');
  const btnExportPerfJson = document.getElementById('btnExportPerfJson');

  if (btnExportPerfJson) {
    btnExportPerfJson.addEventListener('click', () => {
      const avgMs = perfFrameTimes.reduce((a, b) => a + b, 0) / (perfFrameTimes.length || 1);
      const sorted = [...perfFrameTimes].sort((a, b) => a - b);
      const p95Ms = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] || avgMs;
      const report = {
        timestamp: new Date().toISOString(),
        fps: Math.min(120, Math.round(1000 / Math.max(1, avgMs))),
        p95FrameMs: Number(p95Ms.toFixed(2)),
        longFramesOver33ms: perfLongFrames,
        stageIdx: currentStageIdx,
        cameraMode3D,
        graphicsQuality: appSettings.graphicsQuality,
        recentSamplesMs: perfFrameTimes.map(v => Number(v.toFixed(2)))
      };
      try {
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fire-safety-perf-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('📊 성능 진단 리포트(JSON)가 내보내기 되었습니다!');
      } catch (e) {}
    });
  }

  // --- Bug #3 Fix & Features 1, 2, 4, 10: Automatically Load ?map=, ?class=, ?stage=, ?grade=, ?timeMode=, ?customQuiz= & Register PWA ---
  let appInitialized = false;
  function initApp() {
    if (appInitialized) return;
    appInitialized = true;

    if (isPerfDiagEnabled && perfDiagOverlay) {
      perfDiagOverlay.classList.remove('hidden');
      perfDiagOverlay.classList.add('flex');
    }

    bestScoreDisplay.textContent = getSavedBestScore().toLocaleString();
    try {
      const savedName = localStorage.getItem('fire_escape_student_name');
      if (savedName && studentNameInput) studentNameInput.value = savedName;
    } catch (e) {}

    let sharedCustomStage = null;
    let initialStageIdx = 0;
    try {
      const params = new URLSearchParams(window.location.search);
      const sharedClass = params.get('class');
      if (sharedClass && sharedClass.trim()) {
        currentClassCode = sharedClass.trim();
        try {
          localStorage.setItem('fire_escape_class_code', currentClassCode);
        } catch (e) {}
      }
      const gradeParam = params.get('grade');
      if (gradeParam === 'low' || gradeParam === 'standard' || gradeParam === 'advanced') {
        applyGradePreset(gradeParam, false);
      }
      const timeParam = params.get('timeMode');
      if (timeParam === 'standard' || timeParam === 'relaxed' || timeParam === 'practice') {
        applyTimePolicyMode(timeParam);
      }
      const stageParam = params.get('stage');
      if (stageParam !== null && stageParam !== '') {
        const parsedStage = parseInt(stageParam, 10);
        if (!isNaN(parsedStage) && parsedStage >= 0 && parsedStage < STAGES.length) {
          initialStageIdx = parsedStage;
        }
      }
      const customQuizParam = params.get('customQuiz');
      if (customQuizParam) {
        try {
          const decoded = JSON.parse(decodeURIComponent(atob(customQuizParam)));
          if (decoded && typeof decoded === 'object') {
            customQuizConfig = decoded;
            if (customSafeCodeInput && decoded.safeCode) customSafeCodeInput.value = decoded.safeCode;
            if (customSafeClueInput && decoded.safeClue) customSafeClueInput.value = decoded.safeClue;
            if (customQuizTitleInput && decoded.quizTitle) customQuizTitleInput.value = decoded.quizTitle;
            if (customQuizGoodInput && decoded.goodChoice) customQuizGoodInput.value = decoded.goodChoice;
            if (customQuizBadInput && decoded.badChoice) customQuizBadInput.value = decoded.badChoice;
          }
        } catch (err) {}
      }
      const sharedMap = params.get('map');
      if (sharedMap && mapEditorInstance) {
        sharedCustomStage = mapEditorInstance.loadFromRawCode(sharedMap, true);
      }
    } catch (e) {}

    updateClassBanner();
    updateGradePresetModalUI();
    renderBriefingSlide();
    updateSchoolRecordText();
    renderTeacherPresetQr();

    if (sharedCustomStage) {
      loadStage(0, true, sharedCustomStage);
      overlayIcon.textContent = '🛠️';
      overlaySubtitle.textContent = '공유받은 커스텀 대피도 맵';
      overlayTitle.textContent = '나만의 우리 집·교실 대피도 도전!';
      overlayDesc.textContent = '링크로 공유받은 커스텀 대피도 스테이지가 로드되었습니다! [게임 시작하기]를 눌러 탈출에 도전해 보세요.';
      btnPrimaryAction.textContent = '공유받은 커스텀 맵 시작하기 ▶';
    } else {
      loadStage(initialStageIdx, true, null);
    }

    selectWorldCard('fire');
    syncContinueButtonUI();
    resizeCanvas();
    updateOverlaySelectionUI();

    // Feature 10: Register Offline PWA Service Worker
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

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
