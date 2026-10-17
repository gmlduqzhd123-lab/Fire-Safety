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
    const exitTile = findNearestTileOfTypes([TILE.EXIT, TILE.LIFELINE, TILE.PARTITION]);
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
    '1,3': 0,
    '1,7': 1,
    '1,8': 1,
    '1,13': 2,
    '7,2': 3,
    '7,8': 4,
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
    if (document.getElementById('btnMainGuide')) document.getElementById('btnMainGuide').classList.add('hidden');
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
    if (gameState !== 'PLAYING') return;

    elapsedSeconds += dt;
    fireSpreadTimer += dt;
    pathRecordTimer += dt;
    if (player.hurtCooldown > 0) player.hurtCooldown -= dt;
    if (autoInteractCooldown > 0) autoInteractCooldown -= dt;

    const activeSkin = getSelectedSkin();
    let baseSpeed = player.crouching
      ? 2.65 * (activeSkin.crouchSpeedBonus || 1.0)
      : 3.75;
    if (player.carryingToy) baseSpeed *= 0.72;

    let mvX = 0;
    let mvY = 0;
    let isMoving = false;
    let targetSurge = 0;
    let targetTurnBias = 0;

    // Unified, Non-Rotating 4-Way Movement in BOTH 3D Modes (Zero Motion Sickness!)
    // ▲(W) = Up (North), ▼(S) = Down (South), ◀(A) = Left (West), ▶(D) = Right (East)
    if (keysPressed.up) mvY -= 1;
    if (keysPressed.down) mvY += 1;
    if (keysPressed.left) mvX -= 1;
    if (keysPressed.right) mvX += 1;

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
      targetSurge = 1.0;
      targetTurnBias = mvX * 0.65;

      // Auto-Interact when walking directly into a closed door, locked door (with key), debris (with axe), or sink/valve/breaker/alarm
      if (autoInteractCooldown <= 0) {
        const probeC = Math.floor(player.x + mvX * 0.56);
        const probeR = Math.floor(player.y + mvY * 0.56);
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
            autoInteractCooldown = 0.38;
            triggerInteraction({ kind: 'tile', c: probeC, r: probeR, tile: probeTile });
          }
        }
      }

      const stepX = mvX * baseSpeed * dt;
      const stepY = mvY * baseSpeed * dt;

      // Horizontal step + strong doorway auto-centering
      if (canMoveTo(player.x + stepX, player.y, player.radius)) {
        player.x += stepX;
      } else if (Math.abs(mvX) > 0.35) {
        const centerY = Math.floor(player.y) + 0.5;
        const diffY = centerY - player.y;
        if (Math.abs(diffY) > 0.01 && Math.abs(diffY) < 0.48) {
          const nudgeY = Math.sign(diffY) * Math.min(Math.abs(diffY), baseSpeed * 0.95 * dt);
          if (canMoveTo(player.x, player.y + nudgeY, player.radius)) {
            player.y += nudgeY;
          }
          if (canMoveTo(player.x + stepX * 0.75, player.y, player.radius)) {
            player.x += stepX * 0.75;
          }
        }
      }

      // Vertical step + strong doorway auto-centering
      if (canMoveTo(player.x, player.y + stepY, player.radius)) {
        player.y += stepY;
      } else if (Math.abs(mvY) > 0.35) {
        const centerX = Math.floor(player.x) + 0.5;
        const diffX = centerX - player.x;
        if (Math.abs(diffX) > 0.01 && Math.abs(diffX) < 0.48) {
          const nudgeX = Math.sign(diffX) * Math.min(Math.abs(diffX), baseSpeed * 0.95 * dt);
          if (canMoveTo(player.x + nudgeX, player.y, player.radius)) {
            player.x += nudgeX;
          }
          if (canMoveTo(player.x, player.y + stepY * 0.75, player.radius)) {
            player.y += stepY * 0.75;
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

    // Smoothly interpolate 3D Follow-Camera position toward player (zero rotational dizziness!)
    fpsCamX += (player.x - fpsCamX) * Math.min(1, dt * 9.0);
    fpsCamY += (player.y - fpsCamY) * Math.min(1, dt * 9.0);

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

    // Physical Fire Door & Smoke Spread Simulation
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

  function computeCloseUp3DLayout(w, h) {
    const tileSize = Math.max(48, Math.min(w, h) * 0.156);
    const wallH = tileSize * 0.62;
    const boardW = COLS * tileSize;
    const boardH = ROWS * tileSize;
    // Center smoothly on the player's 3D follow-cam position (fpsCamX, fpsCamY)
    let offsetX = w * 0.5 - fpsCamX * tileSize;
    let offsetY = h * 0.55 - fpsCamY * tileSize;
    // Clamp gently so outer building walls frame the screen nicely
    const minOffX = Math.min(28, w - boardW - 28);
    const maxOffX = Math.max(28, w - boardW - 28);
    if (boardW + 56 > w) {
      offsetX = Math.max(w - boardW - 36, Math.min(36, offsetX));
    } else {
      offsetX = (w - boardW) * 0.5;
    }
    if (boardH + wallH + 56 > h) {
      offsetY = Math.max(h - boardH - 28, Math.min(wallH + 34, offsetY));
    } else {
      offsetY = wallH + (h - wallH - boardH) * 0.5;
    }
    return { tileSize, wallH, offsetX, offsetY, isCloseUp: true };
  }

  function orientCameraToOpenSpace() {
    fpsCamX = player.x;
    fpsCamY = player.y;
    const nextObj = getNextStepObjective();
    if (nextObj) {
      const dx = (nextObj.c + 0.5) - player.x;
      const dy = (nextObj.r + 0.5) - player.y;
      const len = Math.hypot(dx, dy) || 1;
      player.dirX = dx / len;
      player.dirY = dy / len;
    }
    fpsCamYaw = Math.atan2(player.dirY || 0, player.dirX || 1);
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
      showToast('👁️ [3D 실내 근접 탈출 뷰] 화면 회전 어지러움 없이 ▲▼◀▶ 방향키로 실제 건물 방과 복도를 걸어서 탈출하세요!', 'border-indigo-400');
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
      // Check if user tapped inside the top-right 3D radar minimap
      const mapW = Math.min(165, Math.max(115, local.width * 0.22));
      const mapH = mapW * (ROWS / COLS);
      const mapX = local.width - mapW - 10;
      const mapY = 10;
      if (local.x >= mapX && local.x <= mapX + mapW && local.y >= mapY && local.y <= mapY + mapH) {
        const gx = ((local.x - mapX) / mapW) * COLS;
        const gy = ((local.y - mapY) / mapH) * ROWS;
        return { gx, gy, c: Math.floor(gx), r: Math.floor(gy) };
      }
      const layout = computeCloseUp3DLayout(local.width, local.height);
      const gx = (local.x - layout.offsetX) / layout.tileSize;
      const gy = (local.y - layout.offsetY) / layout.tileSize;
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
      // 3D Wooden Study Desk with Monitor / Book & Chair
      const dw = tileSize * 0.84;
      const dd = tileSize * 0.72;
      const dx = x + tileSize * 0.08;
      const dy = y + tileSize * 0.14;
      const dh = tileSize * 0.34;
      draw3DBox(ctx, dx, dy, dw, dd, dh, '#d97706', '#92400e', '#451a03', '#fcd34d');
      // Laptop / Monitor on desk top
      draw3DBox(ctx, dx + dw * 0.24, dy + dd * 0.12, dw * 0.52, dd * 0.28, tileSize * 0.48, '#38bdf8', '#0f172a', '#1e293b', '#7dd3fc');
    } else {
      // 3D Wooden Cabinet / Wardrobe with Double Doors
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
    ctx.fillText('🗺️ 건물 전체 지도 (터치이동)', mapX + mapW / 2, mapY + mapH + 12);
    ctx.restore();

    // Bottom-Left 3D Interior Follow-Cam Status Badge (Never overlaps top toast banner!)
    const gearSummary = player.wetTowel
      ? '🧣젖은수건 착용'
      : (player.hasMask ? '😷방연마스크 착용' : (player.hasTowel ? '🧣수건 보유' : '문·아이템 자동상호작용'));
    ctx.save();
    const badgeY = height - 34;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(10, badgeY, 265, 24);
    ctx.strokeRect(10, badgeY, 265, 24);
    ctx.fillStyle = '#e0e7ff';
    ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`👁️ 3D실내근접뷰 (${player.crouching ? '🧎낮은자세' : '🚶서있음'} · ${gearSummary})`, 18, badgeY + 12);
    ctx.restore();
  }

  // --- Unified 3D Architectural Building Escape Renderer (Supports Close-Up 3D Follow-Cam & Full-Building 3D Cutaway) ---
  function renderCanvas() {
    const width = cssCanvasW;
    const height = cssCanvasH;
    if (!width || !height || !grid || grid.length < ROWS) return;

    const now = performance.now() * 0.004;
    const st = activeCustomStage || STAGES[currentStageIdx] || STAGES[0];

    // Deep atmospheric 3D building backdrop
    const bgGrad = ctx.createRadialGradient(width * 0.5, height * 0.45, 40, width * 0.5, height * 0.5, Math.max(width, height) * 0.75);
    bgGrad.addColorStop(0, '#1e293b');
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const isCloseUp = cameraMode3D === 'FPS_3D';
    const layout = isCloseUp ? computeCloseUp3DLayout(width, height) : computeDioramaLayout(width, height);
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
        const iy = baseY - tileSize * 0.24 + bob;

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
          // 3D Floating Item Orb
          const ringColor = it.type === 'toy' ? '#fb7185' : (it.type === 'dog' ? '#4ade80' : (it.type === 'key' ? '#facc15' : '#38bdf8'));
          ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
          ctx.beginPath();
          ctx.arc(ix, iy, tileSize * 0.31, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = ringColor;
          ctx.lineWidth = 2.2;
          ctx.stroke();

          ctx.font = `${Math.floor(tileSize * 0.40)}px sans-serif`;
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
    const dt = Math.min(0.05, (timestamp - lastFrameTime) / 1000);
    lastFrameTime = timestamp;

    if (gameState === 'PLAYING') {
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

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
    if (e.code === 'KeyV' && !e.repeat) {
      if (gameState === 'PLAYING') {
        toggleCamera3DMode();
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
    [eduModal, mapEditorModal, certModal, guideModal, classModal, teacherModal, moreToolsDrawer].forEach((m) => {
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
