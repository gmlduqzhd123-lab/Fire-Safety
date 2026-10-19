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
    voiceTts: false,
    goldenBellMode: false
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
      if (typeof savedSettings.goldenBellMode === 'boolean') appSettings.goldenBellMode = savedSettings.goldenBellMode;
      if (['standard', 'relaxed', 'practice'].includes(savedSettings.defaultMode)) {
        nextRunOptions.mode = savedSettings.defaultMode;
        nextRunOptions.hazardLimitSeconds = savedSettings.defaultMode === 'relaxed' ? 480 : (savedSettings.defaultMode === 'practice' ? null : 300);
        runOptions = { ...nextRunOptions };
      }
    }
  } catch (e) {}

  // --- New Engagement Features State (Ideas 1~9) ---
  let goldenBellTimerId = null;
  let isSpeedDrillMode = false;
  let isRelayMode = false;
  let relayCurrentRunner = 1;
  let relayBatonTriggered = {};
  let autoGuideTimer = 0;
  let autoGuidePath = [];
  let lastGameOverReason = 'hp';
  let rescuedCompanions = [];
  let pendingHazards = [];
  let isFullMapOverlayOpen = false;
  let screenShakeTimer = 0;
  let heartbeatTimer = 0;
  let guidePingTimer = 0;
  let customGear = {
    helmetColor: '#ef4444',
    honorTitle: '용감한 대피 대장'
  };
  try {
    const savedGear = JSON.parse(localStorage.getItem('fire_escape_custom_gear') || 'null');
    if (savedGear && typeof savedGear === 'object') {
      if (typeof savedGear.helmetColor === 'string') customGear.helmetColor = savedGear.helmetColor;
      if (typeof savedGear.honorTitle === 'string') customGear.honorTitle = savedGear.honorTitle;
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
    if (activeCustomStage) {
      if (activeCustomStage.isDailyChallenge) {
        clearedStages.daily = true;
      } else {
        return;
      }
    } else {
      clearedStages[`s${currentStageIdx}`] = true;
      clearedStages[String(currentStageIdx)] = true;
    }
    try {
      localStorage.setItem('fire_escape_cleared_stages', JSON.stringify(clearedStages));
    } catch (e) {}
  }

  // Feature 4: Teacher Custom Safe Passcode & Quiz Config (?customQuiz=...)
  let customQuizConfig = null;

  // Feature 2: Grade-Level Difficulty Multipliers
  function getGradeDifficultyMultipliers() {
    if (appSettings.gradePreset === 'low') {
      return { spreadMult: 1.55, damageMult: 0.60, o2Mult: 0.58, fireMult: 0.60, smokeMult: 0.58 };
    }
    if (appSettings.gradePreset === 'advanced') {
      return { spreadMult: 0.78, damageMult: 1.20, o2Mult: 1.20, fireMult: 1.20, smokeMult: 1.20 };
    }
    return { spreadMult: 1.0, damageMult: 1.0, o2Mult: 1.0, fireMult: 1.0, smokeMult: 1.0 };
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
    const reviveBtn = document.getElementById('btnReviveWithQuiz');
    const homeOverlayBtn = document.getElementById('btnHomeFromOverlay');
    const exitOverlayBottomBtn = document.getElementById('btnExitOverlayBottom');
    const exitOverlayBtn = document.getElementById('btnExitGameOverlay');
    const isMainTipsVisible = overlayTipsBox && !overlayTipsBox.classList.contains('hidden');
    return [
      continueBtn,
      reviveBtn,
      btnPrimaryAction,
      btnMainGuide,
      btnOpenCertFromOverlay,
      btnSecondaryAction,
      homeOverlayBtn,
      exitOverlayBottomBtn,
      isMainTipsVisible ? exitOverlayBtn : null
    ].filter((b) => b && !b.classList.contains('hidden') && !b.disabled);
  }

  function updateOverlaySelectionUI() {
    const btns = getVisibleOverlayButtons();
    if (btns.length === 0) return;
    if (overlaySelectedIndex >= btns.length) overlaySelectedIndex = 0;
    if (overlaySelectedIndex < 0) overlaySelectedIndex = btns.length - 1;
    const continueBtn = document.getElementById('btnContinueSaved');
    const reviveBtn = document.getElementById('btnReviveWithQuiz');
    const homeOverlayBtn = document.getElementById('btnHomeFromOverlay');
    const exitOverlayBottomBtn = document.getElementById('btnExitOverlayBottom');
    const exitOverlayBtn = document.getElementById('btnExitGameOverlay');
    [continueBtn, reviveBtn, btnPrimaryAction, btnMainGuide, btnOpenCertFromOverlay, btnSecondaryAction, homeOverlayBtn, exitOverlayBottomBtn, exitOverlayBtn].forEach((b) => {
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

    // Idea 1: Smartboard Classroom Golden Bell 5-Second Finger Voting Countdown
    const gbBox = document.getElementById('eduGoldenBellBox');
    const gbTimerText = document.getElementById('eduGoldenBellTimerText');
    const gbBar = document.getElementById('eduGoldenBellBar');
    if (goldenBellTimerId) {
      clearInterval(goldenBellTimerId);
      goldenBellTimerId = null;
    }
    if (gbBox) {
      if (appSettings.goldenBellMode) {
        gbBox.classList.remove('hidden');
        let remSec = 5;
        if (gbTimerText) gbTimerText.textContent = '5초';
        if (gbBar) gbBar.style.width = '100%';
        goldenBellTimerId = setInterval(() => {
          remSec--;
          if (remSec > 0) {
            if (gbTimerText) gbTimerText.textContent = `${remSec}초`;
            if (gbBar) gbBar.style.width = `${(remSec / 5) * 100}%`;
            SoundFX.pickup();
          } else {
            clearInterval(goldenBellTimerId);
            goldenBellTimerId = null;
            if (gbTimerText) gbTimerText.textContent = '정답 공개!';
            if (gbBar) gbBar.style.width = '0%';
            SoundFX.bell();
          }
        }, 1000);
      } else {
        gbBox.classList.add('hidden');
      }
    }

    eduModal.classList.remove('hidden');
    eduModal.classList.add('flex');
    updateEduSelectionUI();
    speakGuideIfEnabled(`${titleText}. ${String(descText || '').replace(/<[^>]*>/g, ' ')}`);
  }

  function closeOtherModalsExcept(keepEl = null, closeEdu = false) {
    if (mapEditorInstance && keepEl !== mapEditorModal) {
      mapEditorInstance.close();
    }
    const list = [
      closeEdu ? eduModal : null,
      guideModal,
      mapEditorModal,
      certModal,
      classModal,
      teacherModal,
      document.getElementById('notebookModal'),
      document.getElementById('puzzleModal'),
      document.getElementById('settingsModal'),
      document.getElementById('exitGameModal'),
      document.getElementById('moreToolsDrawer')
    ];
    list.forEach((m) => {
      if (m && m !== keepEl) {
        m.classList.add('hidden');
        m.classList.remove('flex');
      }
    });
  }

  function resumeIfNoBlockingModalOpen() {
    const blockingModals = [
      gameOverlay,
      eduModal,
      guideModal,
      mapEditorModal,
      certModal,
      classModal,
      teacherModal,
      document.getElementById('notebookModal'),
      document.getElementById('puzzleModal'),
      document.getElementById('settingsModal'),
      document.getElementById('exitGameModal')
    ];
    const allHidden = blockingModals.every((m) => !m || m.classList.contains('hidden'));
    if (gameState === 'PAUSED' && allHidden) {
      gameState = 'PLAYING';
      pauseIcon.textContent = '▶️' ? '⏸️' : '⏸️';
      pauseText.textContent = '일시정지';
    }
  }

  function closeEduModal() {
    if (goldenBellTimerId) {
      clearInterval(goldenBellTimerId);
      goldenBellTimerId = null;
    }
    clearAllInputStates();
    eduModal.classList.add('hidden');
    eduModal.classList.remove('flex');
    resumeIfNoBlockingModalOpen();
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
    pendingHazards = [];
    isFullMapOverlayOpen = false;
    screenShakeTimer = 0;
    heartbeatTimer = 0;
    guidePingTimer = 0;
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
    player.keys = isSpeedDrillMode ? 2 : 0;
    player.extinguisherCharges = activeSkin.bonusExtinguisher || 0;
    player.waterCharges = activeSkin.bonusWater || 0;
    player.hasAxe = isSpeedDrillMode ? true : false;
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
    player.usedReviveChance = false;
    player.customQuizSolved = false;
    rescuedCompanions = [];
    autoGuideTimer = 0;
    autoGuidePath = [];
    relayCurrentRunner = 1;
    relayBatonTriggered = {};
    if (isSpeedDrillMode && runOptions.mode !== 'practice') {
      runOptions.hazardLimitSeconds = 180;
    }
    const reviveBtnEl = document.getElementById('btnReviveWithQuiz');
    if (reviveBtnEl) reviveBtnEl.classList.add('hidden');

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

    // Improvement #1: Sync Main Screen Illustrated Escape Zone Cards
    const activeMainStageKey = (customStageObj && customStageObj.isDailyChallenge) ? 'daily' : String(currentStageIdx);
    document.querySelectorAll('#mainStageSelectBar .main-stage-pill').forEach((pill) => {
      const key = pill.getAttribute('data-main-stage');
      const badgeEl = pill.querySelector('[data-stage-badge]');
      if (key === activeMainStageKey) {
        pill.className = 'main-stage-pill group p-2 sm:p-2.5 rounded-2xl border-2 border-orange-400 bg-gradient-to-b from-orange-500/20 to-slate-950/95 ring-2 ring-yellow-300/60 flex flex-col justify-between text-left shadow-lg overflow-hidden transition hover:scale-[1.01]';
        if (badgeEl) {
          badgeEl.textContent = '선택됨';
          badgeEl.className = 'absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded font-black text-[9px] shadow bg-orange-400 text-slate-950';
        }
      } else {
        if (key === '5') {
          pill.className = 'main-stage-pill group p-2 sm:p-2.5 rounded-2xl border border-emerald-500/60 bg-emerald-950/35 hover:border-emerald-400 flex flex-col justify-between text-left shadow-lg overflow-hidden transition hover:scale-[1.01]';
        } else if (key === 'daily') {
          pill.className = 'main-stage-pill group p-2 sm:p-2.5 rounded-2xl border border-amber-500/60 bg-amber-950/35 hover:border-amber-400 flex flex-col justify-between text-left shadow-lg overflow-hidden transition hover:scale-[1.01]';
        } else {
          pill.className = 'main-stage-pill group p-2 sm:p-2.5 rounded-2xl border border-slate-700/90 bg-slate-950/90 hover:border-orange-400/70 flex flex-col justify-between text-left shadow-lg overflow-hidden transition hover:scale-[1.01]';
        }
        if (badgeEl) {
          const defBadge = badgeEl.getAttribute('data-default-badge') || '';
          const defClass = badgeEl.getAttribute('data-default-badge-class') || 'bg-slate-900/90 text-orange-200 border border-orange-400/40';
          badgeEl.textContent = defBadge;
          badgeEl.className = `absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded font-black text-[9px] shadow ${defClass}`;
        }
      }
    });

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
    // Equipment, utility controls and rescue interactions must never block evacuation.
    // Retain the hazard checklist only for the separate, non-fire prevention lesson.
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

    // Evacuation comes first. Optional equipment/rescue puzzles must not send
    // learners away from the exit or imply that searching rooms is a prerequisite.
    // Step 9: Final Escape Goal (EXIT)
    const exitTile =
      findNearestTileOfTypes([TILE.EXIT]) || findNearestTileOfTypes([TILE.LIFELINE, TILE.PARTITION]);
    if (exitTile) {
      return {
        c: exitTile.c,
        r: exitTile.r,
        label: '🎯 비상구(EXIT) 탈출!',
        bannerText: player.crouching
          ? '🎯 안전한 대피로로 신속히 탈출하세요! 장비·구조 미션은 탈출 조건이 아닙니다.'
          : '🎯 연기가 있으면 [🧎 낮은 자세]로 안전한 출구로 대피하세요. 장비를 찾느라 지체하지 마세요!'
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

    const flTopBtn = document.getElementById('btnFlashlightTop');
    if (flTopBtn) {
      if (player.hasFlashlight) {
        flTopBtn.classList.remove('hidden');
        flTopBtn.classList.add('flex');
      } else {
        flTopBtn.classList.add('hidden');
        flTopBtn.classList.remove('flex');
      }
    }

    // Update Context-Sensitive Primary Action Button (#btnAction)
    const target = getInteractTarget();
    let actIcon = '✋';
    let actLabel = '반응하기';
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
      } else if (target.tile === TILE.FURNITURE) {
        actIcon = '🔐';
        actLabel = '금고·서가 조사';
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
        ? 'btn-control px-3 py-1.5 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 border-2 border-yellow-200 text-xs sm:text-sm font-black text-slate-950 flex flex-col items-center justify-center gap-0.5 shadow-xl'
        : 'btn-control px-3 py-1.5 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 border-2 border-orange-300/60 text-xs sm:text-sm font-black text-white flex flex-col items-center justify-center gap-0.5 shadow-lg';
    }

    const postureKey = `${st.isPreventionMode ? 1 : 0}:${player.crouching ? 1 : 0}`;
    if (hudCache.postureKey !== postureKey) {
      hudCache.postureKey = postureKey;
      if (st.isPreventionMode) {
        postureStatus.textContent = player.crouching ? '🧎 하층점검' : '🔍 사전점검';
        postureStatus.className = 'text-[10px] font-extrabold text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded-md border border-slate-800 truncate';
        convectionMarker.style.top = player.crouching ? '20px' : '12px';
        convectionHint.textContent = '화재 전 쾌적한 실내 공기';
      } else if (player.crouching) {
        postureStatus.textContent = '🧎 낮은자세';
        postureStatus.className = 'text-[10px] font-extrabold text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded-md border border-slate-800 truncate';
        convectionMarker.style.top = '20px';
        convectionHint.textContent = '바닥 신선한 공기 호흡';
      } else {
        postureStatus.textContent = '🚶 서있음';
        postureStatus.className = 'text-[10px] font-extrabold text-amber-400 bg-slate-950 px-1.5 py-0.5 rounded-md border border-slate-800 truncate';
        convectionMarker.style.top = '3px';
        convectionHint.textContent = '상층 유독가스 주의!';
      }
    }

    if (hudCache.crouchState !== player.crouching) {
      hudCache.crouchState = player.crouching;
      if (crouchBtnIcon) crouchBtnIcon.textContent = player.crouching ? '🧎' : '🚶';
      if (crouchBtnText) crouchBtnText.textContent = player.crouching ? '숙이기 켜짐' : '숙이기';
      btnCrouch.className = player.crouching
        ? 'btn-control px-3 py-1.5 rounded-2xl bg-emerald-600 border-2 border-emerald-300 text-xs sm:text-sm font-black text-white flex flex-col items-center justify-center gap-0.5 shadow-lg'
        : 'btn-control px-3 py-1.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 text-xs sm:text-sm font-extrabold text-amber-300 flex flex-col items-center justify-center gap-0.5 shadow';
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
        badges.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/25 border border-amber-400/50 text-amber-200 text-[11px] font-bold shrink-0">🧣 마른수건(대피 우선)</span>`);
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

  // --- Nearby Interactive Target Detection (Enhanced with 3D Gaze Ray & Furniture Puzzle Stations) ---
  function getInteractTargetForActor(actor) {
    const pc = Math.floor(actor.x);
    const pr = Math.floor(actor.y);
    const isFps = typeof cameraMode3D !== 'undefined' && cameraMode3D === 'FPS_3D';

    let bestItem = null;
    let bestItemDist = Infinity;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const dx = (it.c + 0.5) - actor.x;
      const dy = (it.r + 0.5) - actor.y;
      const dist = Math.hypot(dx, dy);
      const dot = dist > 0.01 ? (dx * (actor.dirX || 0) + dy * (actor.dirY || 0)) / dist : 1;
      const maxItemDist = (isFps && dot > 0.65) ? 1.82 : 1.22;
      if (dist < maxItemDist && dist < bestItemDist) {
        bestItemDist = dist;
        bestItem = { kind: 'item', index: i, item: it };
      }
    }
    if (bestItem) return bestItem;

    const targetC = Math.floor(actor.x + actor.dirX * 0.85);
    const targetR = Math.floor(actor.y + actor.dirY * 0.85);
    const candidates = [
      { c: targetC, r: targetR, fromGaze: true }
    ];
    if (isFps) {
      const farC = Math.floor(actor.x + actor.dirX * 1.48);
      const farR = Math.floor(actor.y + actor.dirY * 1.48);
      if (
        (farC !== targetC || farR !== targetR) &&
        targetR >= 0 && targetR < ROWS && targetC >= 0 && targetC < COLS &&
        (grid[targetR][targetC] === TILE.FLOOR || grid[targetR][targetC] === TILE.OPEN_DOOR)
      ) {
        candidates.push({ c: farC, r: farR, fromGaze: true });
      }
    }
    candidates.push(
      { c: pc + 1, r: pr, fromGaze: false },
      { c: pc - 1, r: pr, fromGaze: false },
      { c: pc, r: pr + 1, fromGaze: false },
      { c: pc, r: pr - 1, fromGaze: false }
    );

    let fallbackFurniture = null;
    let fallbackOpenDoor = null;
    for (let idx = 0; idx < candidates.length; idx++) {
      const cand = candidates[idx];
      if (cand.c < 0 || cand.c >= COLS || cand.r < 0 || cand.r >= ROWS) continue;
      const t = grid[cand.r][cand.c];

      // Improvement #3: Allow closing an adjacent OPEN_DOOR even right after walking through it (when not standing inside the doorway tile itself)
      if (t === TILE.OPEN_DOOR) {
        if (cand.c === pc && cand.r === pr) continue;
        if (cand.fromGaze) {
          return { kind: 'tile', c: cand.c, r: cand.r, tile: t };
        }
        if (!fallbackOpenDoor) {
          fallbackOpenDoor = { kind: 'tile', c: cand.c, r: cand.r, tile: t };
        }
        continue;
      }

      if (
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
      ) {
        return { kind: 'tile', c: cand.c, r: cand.r, tile: t };
      }

      if (t === TILE.FURNITURE && !fallbackFurniture) {
        const stationKind = (cand.r + cand.c * 3) % 3;
        if (stationKind === 1 || stationKind === 2) {
          fallbackFurniture = { kind: 'tile', c: cand.c, r: cand.r, tile: t };
        }
      }
    }

    return fallbackFurniture || fallbackOpenDoor;
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

    // Improvement #4: Cancel nearby pendingHazards when pouring water
    for (let pIdx = pendingHazards.length - 1; pIdx >= 0; pIdx--) {
      const ph = pendingHazards[pIdx];
      if (Math.hypot((ph.c + 0.5) - player.x, (ph.r + 0.5) - player.y) <= 2.6) {
        pendingHazards.splice(pIdx, 1);
        score += 30;
        addFloatText(ph.c + 0.5, ph.r + 0.5, '💧 확산 사전 차단! +30', '#38bdf8');
      }
    }

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
            screenShakeTimer = 0.45;
            if (f.fireType === 'oil' && typeof SoundFX.oilExplosion === 'function') {
              SoundFX.oilExplosion();
            } else {
              SoundFX.hurt();
            }
            // Improvement #6: Spawn dramatic oil-flare or electric-spark particle burst
            for (let k = 0; k < 18; k++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = 1.8 + Math.random() * 2.8;
              particles.push({
                x: fx,
                y: fy,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: 0.45,
                maxLife: 0.5,
                size: 5 + Math.random() * 4,
                color: f.fireType === 'oil' ? '#f97316' : '#38bdf8'
              });
            }
            addFloatText(fx, fy, f.fireType === 'oil' ? '💥 수증기 기름 폭발! (K급소화기/덮기 필수!)' : '⚡ 감전 스파크! (차단기 OFF 필수!)', '#ef4444');
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
      showToast('💥 [식용유(K급) 화재 폭발 경고!] 기름 불에 물을 부으면 수증기 폭발로 불길이 번집니다! 🧯소화기(질식소화)나 냄비 뚜껑·젖은 수건 덮기로 산소를 차단하세요!', 'border-red-500');
    } else if (hazardTriggered === 'electric') {
      showToast('⚡ [전기 감전 경고!] 전기가 통하는 상태에서 물을 뿌리면 감전됩니다! 먼저 ⚡배전판 차단기를 내리거나 🧯소화기를 사용하세요!', 'border-red-500');
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

    // Improvement #4: Cancel nearby pendingHazards when spraying extinguisher
    let canceledPending = 0;
    for (let pIdx = pendingHazards.length - 1; pIdx >= 0; pIdx--) {
      const ph = pendingHazards[pIdx];
      if (Math.hypot((ph.c + 0.5) - actor.x, (ph.r + 0.5) - actor.y) <= 2.9) {
        pendingHazards.splice(pIdx, 1);
        canceledPending++;
        score += 30;
        addFloatText(ph.c + 0.5, ph.r + 0.5, '🧯 확산 사전 차단! +30', '#38bdf8');
      }
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
            addFloatText(fx, fy, f.fireType === 'oil' ? '🧯 K급 질식소화(산소차단)! +200' : '🧯 전기화재 안전진압! +200', '#38bdf8');
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
      showToast(`🧯 [맞춤형 질식 소화 성공] 산소를 차단해 식용유(K급)/전기 화재를 완벽히 진압했습니다! (+${specialExtinguished * 200}점)`, 'border-sky-400');
    } else if (extinguishedCount > 0) {
      showToast(`🧯 소화기로 불길 ${extinguishedCount}곳의 화원(뿌리)을 쓸어 껐습니다! (+${extinguishedCount * 150}점)`, 'border-sky-400');
    } else if (canceledPending > 0) {
      showToast(`🧯 불길 확산 예고 지점 ${canceledPending}곳을 사전에 방어했습니다! (+${canceledPending * 30}점)`, 'border-sky-400');
    } else {
      showToast('🧯 소화기를 분사했습니다. 바람을 등지고 불길 뿌리 쪽을 향해 분사하세요!', 'border-slate-600');
    }

    updateHUD();
  }

  // --- Improvement #7: 2-Step Interactive 119 Emergency Call Simulation Modal ---
  function start119Simulation(c, r) {
    if (metrics.called119) {
      showToast('📞 이미 119에 정확한 위치와 상황을 신고했습니다! 신속히 대피하세요!');
      return;
    }
    const st = activeCustomStage || STAGES[currentStageIdx] || STAGES[0];
    const stageLocName = st.name || '현재 건물';

    function openStep2() {
      openEduModal(
        '119 종합상황실 교신 (2/2단계 · 상황 브리핑)',
        '📞 "위치 확인 완료! 화재 원인과 고립 인원을 알려주세요!"',
        `119 상황실: <strong>"[${stageLocName}] 위치로 소방차 출동 지령을 내렸습니다! 현장 맞춤형 진압을 위해 화재 종류와 남은 요구조자 상황을 알려주세요!"</strong>`,
        [
          {
            label: '1️⃣ "주방·전기·배터리 등 발화 원인과 갇힌 이웃/반려동물 유무를 정확히 알리고 안내에 따라 대피합니다."',
            primary: true,
            onSelect: () => {
              metrics.called119 = true;
              score += 350;
              SoundFX.win();
              SoundFX.speak('119 신고가 완벽히 접수되었습니다. 바닥의 황금색 비상 유도선을 따라 낮은 자세로 즉시 대피하세요.');
              addFloatText(c + 0.5, r + 0.5, '📞 119 교신 완료! +350', '#c084fc');
              closeEduModal();
              const nextObj = getNextStepObjective();
              if (nextObj) {
                autoGuidePath = computeSafeBfsPathToTarget(nextObj.c, nextObj.r);
              }
              showToast('📞 [119 2단계 교신 완벽 성공!] 소방차 출동 완료 & 상황실이 안전 탈출 경로를 브리핑했습니다! (+350점)', 'border-purple-400');
            }
          },
          {
            label: '2️⃣ "잘 모르겠고 일단 제가 아끼는 장난감부터 다 챙긴 뒤에 다시 전화할게요!"',
            primary: false,
            onSelect: () => {
              SoundFX.warning();
              showToast('⚠️ 물건을 챙기느라 지체하면 매우 위험합니다! 화재 상황과 인원만 알리고 즉시 대피해야 합니다.', 'border-amber-500');
            }
          }
        ]
      );
    }

    openEduModal(
      '1~2학년 통합교과 · 119 신고 절차 (1/2단계 · 위치 전달)',
      '📞 119 종합상황실 긴급 화재 신고',
      `119 상황실: <strong>"삐뽀삐뽀! 119 종합상황실입니다. 어디에서 불이 났나요? 가장 먼저 정확한 위치를 말씀해 주세요!"</strong>`,
      [
        {
          label: `1️⃣ "여기는 [${stageLocName}]입니다! 정확한 도로명 주소(또는 건물·층수)를 침착하게 먼저 말합니다."`,
          primary: true,
          onSelect: () => {
            SoundFX.bell();
            openStep2();
          }
        },
        {
          label: '2️⃣ "불이 났어요! 무서워요, 주소는 모르겠지만 무조건 빨리 와주세요!" (정확한 위치 누락)',
          primary: false,
          onSelect: () => {
            SoundFX.warning();
            showToast('⚠️ 당황해서 주소를 말하지 않으면 소방차가 출동할 수 없습니다! 정확한 위치를 먼저 알려주세요.', 'border-amber-500');
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

  function triggerTeacherCustomQuizIfPending(c, r) {
    if (!customQuizConfig || !customQuizConfig.quizTitle || player.customQuizSolved) return false;
    const goodText = customQuizConfig.goodChoice || '✅ 안전 수칙을 준수하여 침착하게 대피한다';
    const badText = customQuizConfig.badChoice || '❌ 위험을 무시하고 성급하게 행동한다';
    openEduModal(
      '✍️ 선생님 출제 · 우리 반 맞춤 안전 퀴즈',
      `🎯 ${customQuizConfig.quizTitle}`,
      '선생님이 출제한 우리 학교·우리 반 맞춤 화재 안전 퀴즈입니다! 올바른 행동을 선택하세요.',
      [
        {
          label: goodText.startsWith('✅') ? goodText : `✅ ${goodText}`,
          primary: true,
          onSelect: () => {
            player.customQuizSolved = true;
            score += 250;
            SoundFX.pickup();
            addFloatText(c + 0.5, r + 0.5, '우리 반 맞춤 퀴즈 정답! +250', '#4ade80');
            closeEduModal();
            showToast('🎯 [우리 반 맞춤 퀴즈 정답!] 선생님이 출제한 안전 문제를 정확히 해결했습니다! (+250점)', 'border-emerald-400');
            updateHUD();
          }
        },
        {
          label: badText.startsWith('❌') ? badText : `❌ ${badText}`,
          primary: false,
          onSelect: () => {
            SoundFX.warning();
            showToast('💡 선생님이 알려주신 안전 수칙을 다시 떠올려 올바른 보기를 선택해 보세요!', 'border-amber-400');
          }
        }
      ]
    );
    return true;
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
        showToast('🧣 수건을 획득했습니다. 코와 입을 가리되, 물을 찾거나 적시느라 대피를 늦추지 마세요!');
      } else if (it.type === 'mask') {
        player.hasMask = true;
        player.wetTowel = true;
        unlockBadge('mask_light');
        score += 300;
        addFloatText(it.c + 0.5, it.r + 0.5, '습식 방연마스크 착용! +300', '#2dd4bf');
        showToast('😷 방연마스크는 종류·제품별 성능이 다릅니다. 초기 대피 보조용이며 안전을 보장하지 않습니다. 신속히 대피하세요! (+300점)', 'border-teal-400');
      } else if (it.type === 'flashlight') {
        player.hasFlashlight = true;
        unlockBadge('mask_light');
        score += 200;
        addFloatText(it.c + 0.5, it.r + 0.5, '비상 손전등 ON! +200', '#fde047');
        showToast('🔦 [비상 손전등 점등!] 어두운 정전 구역과 연기 속에서 시야가 2배 넓어졌습니다! (+200점)', 'border-yellow-400');
      } else if (it.type === 'npc') {
        player.rescuedNpcs++;
        rescuedCompanions.push({
          type: 'npc',
          name: it.name || '고립된 이웃',
          icon: it.icon || '🧒',
          x: it.c + 0.5,
          y: it.r + 0.5
        });
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
        rescuedCompanions.push({
          type: 'dog',
          name: it.name || '초코',
          icon: '🐶',
          x: it.c + 0.5,
          y: it.r + 0.5
        });
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
          showToast('💧 게임 속 수건·물 보충 완료! 수건은 유독가스를 막거나 산소를 공급하지 않습니다. 대피를 늦추지 마세요!', 'border-sky-400');
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
          if (!findNearestTileOfTypes([TILE.ALARM_BELL]) && triggerTeacherCustomQuizIfPending(c, r)) {
            updateHUD();
            return;
          }
        } else {
          addFloatText(c + 0.5, r + 0.5, '문 열기', '#cbd5e1');
          showToast('🚪 문을 다시 열었습니다. (온도 확인 보너스는 문당 최초 1회만 부여됩니다)');
        }
      } else if (tile === TILE.OPEN_DOOR) {
        grid[r][c] = TILE.DOOR;
        nudgePlayerOutOfSolidTile(c, r);
        if (typeof SoundFX.doorShut === 'function') {
          SoundFX.doorShut();
        } else {
          SoundFX.unlock();
        }
        // Improvement #4: Closing a fire door cancels any pendingHazards on or right across the doorway
        for (let pIdx = pendingHazards.length - 1; pIdx >= 0; pIdx--) {
          if (Math.hypot(pendingHazards[pIdx].c - c, pendingHazards[pIdx].r - r) <= 1.2) {
            pendingHazards.splice(pIdx, 1);
          }
        }
        const closeKey = `close:${r},${c}`;
        if (!interactedDoors.has(closeKey)) {
          interactedDoors.add(closeKey);
          player.fireDoorsClosed++;
          unlockBadge('fire_door');
          score += 150;
          addFloatText(c + 0.5, r + 0.5, '방화문 닫기(연기차단)! +150', '#818cf8');
          showToast('🚪🛡️ [방화문 닫기 완료!] 지나온 문을 닫아 불길과 유독가스가 문 너머로 번지는 것을 물리적으로 차단했습니다! (+150점)', 'border-indigo-400');
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
          // Improvement #2: Automatically open Safe Keypad Modal when interacting with a locked door without a key
          if (!safeSolved && typeof openPuzzleModalFn === 'function') {
            openPuzzleModalFn('safe');
            showToast('🔐 잠긴 문입니다! 비상 금고(614 / 0119) 암호 창을 열었습니다. 암호를 입력해 비상 마스터키(🔑)를 획득하세요!', 'border-amber-400');
            return;
          }
          showToast('🔒 잠긴 문입니다! 주변 바닥의 열쇠(🔑)를 줍거나 금고(🔐)에서 마스터키를 해금하세요!', 'border-amber-500');
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
          // Improvement #6: Visually weaken electric fires when breaker is turned off
          fires.forEach((f) => {
            if (f.fireType === 'electric') {
              f.intensity = 0.55;
              addFloatText(f.c + 0.5, f.r + 0.5, '⚡ 전원차단·전기불 약화!', '#38bdf8');
            }
          });
          addFloatText(c + 0.5, r + 0.5, '전원 차단기 OFF! +250', '#38bdf8');
          showToast('⚡ [전기 화재 예방] 전원 차단기를 내려 감전 위험을 없애고 전기 불길을 약화시켰습니다! (+250점 · 한 번 더 누르면 배선 복구 퍼즐)', 'border-sky-400');
        } else if (!wireSolved && typeof openPuzzleModalFn === 'function') {
          // Improvement #2: Open 4-color wire puzzle when interacting with breaker again
          openPuzzleModalFn('wire');
          showToast('⚡ 배전판 비상 배선 복구 창을 열었습니다! (🔴B·🔵D·🟡A·🟢C 연결 시 소화기 +1회 충전)', 'border-sky-400');
          return;
        } else {
          showToast('⚡ 전원 차단기 안전 조치 및 비상 배선 복구가 모두 완료되었습니다.');
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
          if (triggerTeacherCustomQuizIfPending(c, r)) {
            updateHUD();
            return;
          }
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
      } else if (tile === TILE.FURNITURE && typeof openPuzzleModalFn === 'function') {
        const stationKind = (r + c * 3) % 3;
        const tab = stationKind === 1 ? 'safe' : (stationKind === 2 ? (!bookSortSolved ? 'books' : 'dirlock') : 'safe');
        openPuzzleModalFn(tab);
        return;
      }
      updateHUD();
      if (cameraMode3D === 'FPS_3D') orientCameraToOpenSpace();
      if (typeof saveCampaignState === 'function') saveCampaignState();
    }
  }

  function flashButtonPress(btnEl) {
    if (!btnEl) return;
    btnEl.style.transform = 'scale(0.93)';
    btnEl.style.filter = 'brightness(1.22)';
    if (btnEl._flashTimer) clearTimeout(btnEl._flashTimer);
    btnEl._flashTimer = setTimeout(() => {
      btnEl.style.transform = '';
      btnEl.style.filter = '';
    }, 150);
  }

  // --- Toggle Crouch (Shortcut: Shift) ---
  function toggleCrouch() {
    if (gameState !== 'PLAYING') return;
    SoundFX.init();
    SoundFX.playTone(player.crouching ? 440 : 340, 'triangle', 0.08, 0.09);
    player.crouching = !player.crouching;
    if (player.crouching) {
      showToast('🧎 [숙이기 ON · Shift] 대류 현상을 활용해 바닥(30~60cm)의 신선한 공기를 호흡하며 이동합니다!');
    } else {
      showToast('🚶 [서서 이동 · Shift] 이동 속도가 빨라지지만 상층부 유독가스에 주의하세요.');
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
        const stCode = activeCustomStage
          ? (activeCustomStage.isDailyChallenge ? 'DAY' : 'CUS')
          : `S${typeof st.id === 'number' ? st.id : currentStageIdx + 1}`;
        const gTag = debriefGrade.textContent.includes('S등급') ? 'S' : (debriefGrade.textContent.includes('A등급') ? 'A' : 'B');
        const stNum = typeof st.id === 'number' ? st.id : currentStageIdx + 1;
        const checksum = ((stNum + 1) * 17 + (score % 97) + (crouchPct % 31)) % 90 + 10;
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
      const st = activeCustomStage || STAGES[currentStageIdx] || STAGES[0];
      const sName = (studentNameInput && studentNameInput.value.trim()) || '익명 대원';
      const clsTag = currentClassCode ? `[${currentClassCode}] ` : '';
      const stageLabel = activeCustomStage
        ? (activeCustomStage.isDailyChallenge ? '오늘의챌린지' : '커스텀맵')
        : (st.id === 0 ? '예방점검' : `${st.id}단계`);
      const gradeLabel = debriefGrade ? debriefGrade.textContent.trim() : 'S등급';
      const fullCopyLine = `${clsTag}${sName} · ${stageLabel} · ${score}점 · 등급:${gradeLabel} · ${code}`;
      if (code && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullCopyLine).catch(() => {});
      }
      SoundFX.pickup();
      showToast(`🔐 클리어 인증 기록 [${fullCopyLine}]이 복사되었습니다! 학급 게시판이나 과제 제출란에 붙여넣으세요.`, 'border-emerald-400');
    });
  }

  // --- Stage Clear / Game Over Handlers (Bug #4 Fix: Record final position in pathHistory) ---
  function handleStageClear() {
    clearAllInputStates();
    closeOtherModalsExcept(null, true);
    SoundFX.win();
    SoundFX.speak('대피했습니다. 다시 들어가지 말고, 남은 사람과 반려동물의 위치를 119에 알리세요.');
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
    const reviveBtnClear = document.getElementById('btnReviveWithQuiz');
    if (reviveBtnClear) reviveBtnClear.classList.add('hidden');
    const worldBar = document.getElementById('worldSelectBar');
    if (worldBar) worldBar.classList.add('hidden');

    overlayStats.classList.remove('hidden');
    overlayStats.classList.add('grid');
    overlayTipsBox.classList.add('hidden');
    if (document.getElementById('btnMainGuide')) document.getElementById('btnMainGuide').classList.add('hidden');
    const homeFromOverlayClear = document.getElementById('btnHomeFromOverlay');
    if (homeFromOverlayClear) homeFromOverlayClear.classList.remove('hidden');
    const exitBottomClear = document.getElementById('btnExitOverlayBottom');
    if (exitBottomClear) exitBottomClear.classList.remove('hidden');
    const resultTopBarClear = document.getElementById('overlayResultTopBar');
    if (resultTopBarClear) {
      resultTopBarClear.classList.remove('hidden');
      resultTopBarClear.classList.add('flex');
    }
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
    const overlayCardClear = document.getElementById('overlayCard');
    if (overlayCardClear) overlayCardClear.scrollTop = 0;
    overlaySelectedIndex = 0;
    setTimeout(updateOverlaySelectionUI, 20);
  }

  function handleGameOver(reason) {
    clearAllInputStates();
    closeOtherModalsExcept(null, true);
    gameState = 'GAME_OVER';
    lastGameOverReason = reason || 'hp';
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
    const reviveBtn = document.getElementById('btnReviveWithQuiz');
    if (reviveBtn) {
      if (!player.usedReviveChance) {
        reviveBtn.classList.remove('hidden');
      } else {
        reviveBtn.classList.add('hidden');
      }
    }
    const worldBar = document.getElementById('worldSelectBar');
    if (worldBar) worldBar.classList.add('hidden');

    overlayStats.classList.remove('hidden');
    overlayStats.classList.add('grid');
    overlayTipsBox.classList.add('hidden');
    if (document.getElementById('btnMainGuide')) document.getElementById('btnMainGuide').classList.add('hidden');
    const homeFromOverlayOver = document.getElementById('btnHomeFromOverlay');
    if (homeFromOverlayOver) homeFromOverlayOver.classList.remove('hidden');
    const exitBottomOver = document.getElementById('btnExitOverlayBottom');
    if (exitBottomOver) exitBottomOver.classList.remove('hidden');
    const resultTopBarOver = document.getElementById('overlayResultTopBar');
    if (resultTopBarOver) {
      resultTopBarOver.classList.remove('hidden');
      resultTopBarOver.classList.add('flex');
    }
    btnOpenCertFromOverlay.classList.remove('hidden');
    populateDebriefReport(true);

    overlayIcon.textContent = '⚠️';
    overlaySubtitle.textContent = '대피 실패 · 동선 리플레이 분석';
    if (reason === 'exposure') {
      overlayTitle.textContent = `위험 노출 허용 시간(${runOptions.hazardLimitSeconds || 300}초)을 초과했습니다!`;
      overlayDesc.innerHTML = `화재 현장에 너무 오래 머물러 골든타임을 놓쳤습니다. <strong>[🛡️ 안전 퀴즈 풀고 부활!]</strong> 버튼을 눌러 오답노트를 풀고 이어서 탈출해 보세요!`;
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
    const overlayCardOver = document.getElementById('overlayCard');
    if (overlayCardOver) overlayCardOver.scrollTop = 0;
    overlaySelectedIndex = 0;
    setTimeout(updateOverlaySelectionUI, 20);
  }

  // --- Idea 4: AI Firefighter Captain 5s Safe BFS Path Finder ---
  function computeSafeBfsPathToTarget(targetC, targetR) {
    const startC = Math.max(0, Math.min(COLS - 1, Math.floor(player.x)));
    const startR = Math.max(0, Math.min(ROWS - 1, Math.floor(player.y)));
    const fireSet = new Set(fires.map(f => `${f.r},${f.c}`));
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const parent = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    const q = [{ c: startC, r: startR }];
    visited[startR][startC] = true;
    const dirs = [
      { dc: 1, dr: 0 },
      { dc: -1, dr: 0 },
      { dc: 0, dr: 1 },
      { dc: 0, dr: -1 }
    ];
    let reached = null;
    while (q.length > 0) {
      const cur = q.shift();
      if (cur.c === targetC && cur.r === targetR) {
        reached = cur;
        break;
      }
      for (const { dc, dr } of dirs) {
        const nc = cur.c + dc;
        const nr = cur.r + dr;
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS || visited[nr][nc]) continue;
        if (nc === targetC && nr === targetR) {
          visited[nr][nc] = true;
          parent[nr][nc] = cur;
          reached = { c: nc, r: nr };
          q.length = 0;
          break;
        }
        if (fireSet.has(`${nr},${nc}`)) continue;
        const t = grid[nr][nc];
        const passable = (
          t === TILE.FLOOR ||
          t === TILE.OPEN_DOOR ||
          t === TILE.DOOR ||
          (t === TILE.LOCKED_DOOR && player.keys > 0) ||
          (t === TILE.DEBRIS && player.hasAxe) ||
          t === TILE.EXIT ||
          t === TILE.PARTITION ||
          t === TILE.LIFELINE
        );
        if (passable) {
          visited[nr][nc] = true;
          parent[nr][nc] = cur;
          q.push({ c: nc, r: nr });
        }
      }
    }
    if (!reached) return [];
    const path = [];
    let curr = reached;
    while (curr && !(curr.c === startC && curr.r === startR)) {
      path.unshift(curr);
      curr = parent[curr.r][curr.c];
    }
    return path;
  }

  function triggerAiCaptainAutoGuide() {
    SoundFX.init();
    const notebookEl = document.getElementById('notebookModal');
    if (notebookEl && !notebookEl.classList.contains('hidden')) {
      notebookEl.classList.add('hidden');
      notebookEl.classList.remove('flex');
    }
    const moreDrawerEl = document.getElementById('moreToolsDrawer');
    if (moreDrawerEl) moreDrawerEl.classList.add('hidden');
    if (gameState === 'PAUSED') {
      resumeIfNoBlockingModalOpen();
    }
    if (gameState !== 'PLAYING') {
      showToast('🧑‍🚒 게임을 시작한 뒤 [대장님 5초 길안내]를 눌러보세요!', 'border-amber-400');
      return;
    }
    const nextObj = getNextStepObjective();
    if (!nextObj) {
      showToast('🎯 현재 안내할 목표가 없습니다. 초록색 비상구(EXIT)로 이동하세요!');
      return;
    }
    autoGuideTimer = 5.0;
    autoGuidePath = computeSafeBfsPathToTarget(nextObj.c, nextObj.r);
    if (!player.crouching && smokes.some(s => Math.hypot(s.c + 0.5 - player.x, s.r + 0.5 - player.y) < 2.2)) {
      player.crouching = true;
    }
    SoundFX.pickup();
    showToast(`🧑‍🚒 [소방관 대장님 출동!] 5초 동안 안전한 경로로 [${nextObj.label}]까지 안내합니다!`, 'border-amber-400');
    speakGuideIfEnabled(`소방관 대장님이 5초 동안 ${nextObj.label}까지 안전한 길로 안내합니다.`);
  }

  // --- 3D Walkthrough Kinematics, Follow-Camera & World-Space Footsteps State ---
  let cameraMode3D = 'DIORAMA_3D';
  let fpsCamYaw = 0;
  let fpsCamX = 1.5;
  let fpsCamY = 1.5;
  let fpsCamEyeZ = 0.50;
  let fpsHorizonRatio = 0.44;
  let crouchVisualLerp = 0;
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

    // Idea 8: 4-Player Group Relay Mode Baton-Pass Check
    if (isRelayMode) {
      if (relayCurrentRunner === 1 && (player.wetTowel || player.hasMask) && !relayBatonTriggered.r2) {
        relayBatonTriggered.r2 = true;
        relayCurrentRunner = 2;
        SoundFX.bell();
        addFloatText(player.x, player.y, '🤝 바통 터치! 2번 주자 차례!', '#2dd4bf');
        showToast('🤝 [4인 모둠 릴레이 바통 터치!] 1번 주자(호흡기 보호) 성공! 👉 2번 주자(비상벨·차단·소화기)에게 기기를 넘겨주세요!', 'border-teal-400');
      } else if (
        relayCurrentRunner === 2 &&
        (player.alarmRung || (st.requireGasClosed && player.gasClosed) || player.extinguisherCharges > 0 || player.keys > 0) &&
        !relayBatonTriggered.r3
      ) {
        relayBatonTriggered.r3 = true;
        relayCurrentRunner = 3;
        SoundFX.bell();
        addFloatText(player.x, player.y, '🤝 바통 터치! 3번 주자 차례!', '#38bdf8');
        showToast('🤝 [4인 모둠 릴레이 바통 터치!] 2번 주자 미션 성공! 👉 3번 주자(열쇠·이웃/반려견 구출)에게 기기를 넘겨주세요!', 'border-sky-400');
      } else if (
        relayCurrentRunner === 3 &&
        (player.rescuedNpcs > 0 || player.rescuedDog || !items.some(it => it.type === 'npc' || it.type === 'dog')) &&
        !relayBatonTriggered.r4
      ) {
        relayBatonTriggered.r4 = true;
        relayCurrentRunner = 4;
        SoundFX.bell();
        addFloatText(player.x, player.y, '🤝 바통 터치! 4번 최종 주자!', '#facc15');
        showToast('🤝 [4인 모둠 릴레이 바통 터치!] 3번 주자 구출 완료! 👉 4번 주자(비상구 최종 탈출)에게 기기를 넘겨주세요!', 'border-amber-400');
      }
    }

    // Idea 4: AI Firefighter Captain 5s BFS Auto-Guide Execution
    if (autoGuideTimer > 0) {
      autoGuideTimer = Math.max(0, autoGuideTimer - dt);
      const nextObj = getNextStepObjective();
      if (nextObj) {
        autoGuidePath = computeSafeBfsPathToTarget(nextObj.c, nextObj.r);
        if (autoGuidePath.length > 0) {
          const wp = autoGuidePath[0];
          const wpTile = grid[wp.r] && grid[wp.r][wp.c];
          if (
            (wpTile === TILE.DOOR ||
              (wpTile === TILE.LOCKED_DOOR && player.keys > 0) ||
              (wpTile === TILE.DEBRIS && player.hasAxe)) &&
            Math.hypot(wp.c + 0.5 - player.x, wp.r + 0.5 - player.y) <= 1.35 &&
            autoInteractCooldown <= 0
          ) {
            autoInteractCooldown = 0.35;
            triggerInteraction({ kind: 'tile', c: wp.c, r: wp.r, tile: wpTile, dist: 1.0 });
          }
          pointerMoveTarget = { x: wp.c + 0.5, y: wp.r + 0.5 };
        } else {
          pointerMoveTarget = { x: nextObj.c + 0.5, y: nextObj.r + 0.5 };
        }
        const distToObj = Math.hypot(nextObj.c + 0.5 - player.x, nextObj.r + 0.5 - player.y);
        if (distToObj <= 1.15 && autoInteractCooldown <= 0) {
          const nearTarget = getInteractTarget();
          if (nearTarget) {
            autoInteractCooldown = 0.4;
            triggerInteraction(nearTarget);
          }
        }
      }
      if (autoGuideTimer <= 0) {
        autoGuidePath = [];
        pointerMoveTarget = null;
      }
    }

    // Idea 7: Smooth Breadcrumb Following for Rescued Companions (NPCs & Dog)
    if (rescuedCompanions.length > 0) {
      rescuedCompanions.forEach((comp, idx) => {
        const desiredDist = 0.62 * (idx + 1);
        const dx = player.x - comp.x;
        const dy = player.y - comp.y;
        const dist = Math.hypot(dx, dy);
        if (dist > desiredDist) {
          const step = Math.min(dist - desiredDist, dt * 2.2);
          comp.x += (dx / (dist || 1)) * step;
          comp.y += (dy / (dist || 1)) * step;
        }
      });
    }

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
    // 1/2 Movement Speed in 3D Modes (1.88 tiles/s standing, 1.32 tiles/s crouching) for calm, non-dizzying navigation
    let baseSpeed = player.crouching
      ? 1.32 * (activeSkin.crouchSpeedBonus || 1.0)
      : 1.88;
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
    const motionMult = appSettings.reduceMotion ? 0.25 : 0.65;

    if (cameraMode3D === 'FPS_3D') {
      // Smooth, Non-Dizzying 1st-Person 3D Perspective Walkthrough Controls:
      // ▲(W) = Walk Forward into the 3D room/corridor, ▼(S) = Step Backward, ◀(A)/▶(D) = Calm Smooth Turn
      const turnInput = ((keysPressed.right ? 1 : 0) - (keysPressed.left ? 1 : 0)) || gpAxesX;
      const forwardInput = ((keysPressed.up ? 1 : 0) - (keysPressed.down ? 1 : 0)) || -gpAxesY;

      if (turnInput !== 0 || forwardInput !== 0) {
        pointerMoveTarget = null;
      }

      if (turnInput !== 0) {
        // Gentle, non-dizzying turn rate (~45% slower than before)
        const turnSpeed = (forwardInput !== 0 ? 0.72 : 0.86) * sensMult;
        fpsCamYaw += turnInput * turnSpeed * dt;
        targetTurnBias = turnInput * 0.45 * motionMult;
        player.dirX = Math.cos(fpsCamYaw);
        player.dirY = Math.sin(fpsCamYaw);
      } else if (forwardInput > 0) {
        // Gentle Corridor Alignment Assist: when walking forward without turning, softly align toward nearest 90° corridor axis if close
        const snapAxis = Math.round(fpsCamYaw / (Math.PI * 0.5)) * (Math.PI * 0.5);
        let axisDiff = snapAxis - fpsCamYaw;
        while (axisDiff > Math.PI) axisDiff -= Math.PI * 2;
        while (axisDiff < -Math.PI) axisDiff += Math.PI * 2;
        if (Math.abs(axisDiff) < 0.24) {
          fpsCamYaw += axisDiff * Math.min(1, dt * 2.6);
        }
      }

      if (forwardInput !== 0) {
        const moveMult = forwardInput > 0 ? 1.0 : 0.68;
        mvX = Math.cos(fpsCamYaw) * forwardInput * moveMult;
        mvY = Math.sin(fpsCamYaw) * forwardInput * moveMult;
        isMoving = true;
        targetSurge = (forwardInput > 0 ? 0.55 : -0.25) * motionMult;
      } else if (pointerMoveTarget) {
        const dx = pointerMoveTarget.x - player.x;
        const dy = pointerMoveTarget.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.14) {
          const desiredYaw = Math.atan2(dy, dx);
          let diff = desiredYaw - fpsCamYaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          fpsCamYaw += diff * Math.min(1, dt * 2.8 * sensMult);
          targetTurnBias = Math.max(-0.5, Math.min(0.5, diff * 0.6)) * motionMult;
          mvX = dx / dist;
          mvY = dy / dist;
          isMoving = true;
          targetSurge = 0.5 * motionMult;
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

    // Smoothly interpolate 3D Follow-Camera position & Crouch Eye-Height / Horizon toward player
    fpsCamX += (player.x - fpsCamX) * Math.min(1, dt * 10.0);
    fpsCamY += (player.y - fpsCamY) * Math.min(1, dt * 10.0);
    const camPostureStep = Math.min(1, dt * 9.5);
    fpsCamEyeZ += ((player.crouching ? 0.30 : 0.50) - fpsCamEyeZ) * camPostureStep;
    fpsHorizonRatio += ((player.crouching ? 0.385 : 0.445) - fpsHorizonRatio) * camPostureStep;
    crouchVisualLerp += ((player.crouching ? 1.0 : 0.0) - crouchVisualLerp) * camPostureStep;

    // Update 3D Walk Stride Phase & World-Space 3D Footprints (Calm 1/2 cadence)
    fpsForwardSurge += (targetSurge - fpsForwardSurge) * Math.min(1, dt * 6.5);
    fpsTurnBias += (targetTurnBias - fpsTurnBias) * Math.min(1, dt * 6.5);
    if (isMoving) {
      const strideSpeed = player.crouching ? 4.2 : 5.4;
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
        const speed2 = player2.crouching ? 1.30 : 1.85;
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
      // Fictional game balance only: these multipliers are NOT filtration ratings.
      if (player.hasMask) drainRate *= 0.15;
      else if (player.wetTowel) drainRate *= 0.4;
      player.o2 -= drainRate * dt;

      if (!player.crouching && !player.wetTowel && !player.hasMask && player.hurtCooldown <= 0) {
        player.hurtCooldown = 1.25;
        if (typeof SoundFX.coughWarning === 'function') {
          SoundFX.coughWarning();
        } else {
          SoundFX.hurt();
        }
        addFloatText(player.x, player.y - 0.3, '💨 상층 연기 흡입! (Shift 숙이기 필요)', '#38bdf8');
      }
    } else {
      player.o2 = Math.min(100, player.o2 + 4.5 * dt);
    }

    // Improvement #6 & #8: Screen Shake Decay, Low-Vital Heartbeat & Dark-Stage Exit Acoustic Beacon
    if (screenShakeTimer > 0) {
      screenShakeTimer = Math.max(0, screenShakeTimer - dt);
    }
    if ((player.hp <= 30 || player.o2 <= 30) && !st.isPreventionMode) {
      heartbeatTimer -= dt;
      if (heartbeatTimer <= 0) {
        heartbeatTimer = 1.25;
        if (typeof SoundFX.heartbeat === 'function') SoundFX.heartbeat();
      }
    } else {
      heartbeatTimer = 0;
    }
    if (st.isDarkStage) {
      guidePingTimer -= dt;
      if (guidePingTimer <= 0) {
        const nearestExit = findNearestTileOfTypes([TILE.EXIT]);
        if (nearestExit && nearestExit.dist <= 6.0) {
          guidePingTimer = Math.max(0.55, Math.min(1.8, nearestExit.dist * 0.28));
          if (typeof SoundFX.guidePing === 'function') SoundFX.guidePing();
        } else {
          guidePingTimer = 1.2;
        }
      }
    }

    // Record breadcrumb for trajectory replay minimap
    if (pathRecordTimer >= 0.28) {
      pathRecordTimer = 0;
      const ptState = (inFire || player.onFire) ? 'hurt' : (player.crouching ? 'crouch' : 'safe');
      pathHistory.push({ x: player.x, y: player.y, state: ptState });
    }

    // Improvement #4: Update 3-Second Pending Hazard Floor Warnings & Spawn When Timer Expires
    for (let i = pendingHazards.length - 1; i >= 0; i--) {
      const ph = pendingHazards[i];
      ph.timer -= dt;
      // If the player closed a fire door on this tile while it was pending, cancel it immediately!
      if (grid[ph.r] && grid[ph.r][ph.c] === TILE.DOOR) {
        pendingHazards.splice(i, 1);
        continue;
      }
      if (ph.timer <= 0) {
        pendingHazards.splice(i, 1);
        if (
          grid[ph.r] &&
          (grid[ph.r][ph.c] === TILE.FLOOR || grid[ph.r][ph.c] === TILE.OPEN_DOOR) &&
          !smokes.some(s => s.c === ph.c && s.r === ph.r)
        ) {
          smokes.push({ c: ph.c, r: ph.r, phase: Math.random() * 6.28 });
        }
      }
    }

    // Physical Fire Door & Smoke Spread Simulation (Queues 3s Floor Warning before spreading!)
    const baseSpread = (st.fireSpreadInterval || 11.0) * 1.45 * gradeMults.spreadMult;
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
          !smokes.some(s => s.c === nc && s.r === nr) &&
          !pendingHazards.some(ph => ph.c === nc && ph.r === nr)
        ) {
          pendingHazards.push({ c: nc, r: nr, kind: 'smoke', timer: 3.0, maxTimer: 3.0 });
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
      promptText = `🚨 옷에 불이 붙었습니다! [🔄 구르기 버튼 / Space·F키]를 연타하세요! (${player.rollNeeded}회)`;
    } else if (target) {
      if (target.kind === 'item') {
        promptText = `[Space / 반응하기] ${target.item.icon} ${target.item.name} 획득·구조`;
      } else if (target.tile === TILE.SINK) {
        promptText = player.hasTowel && !player.wetTowel
          ? `[Space / 반응하기] 💧 세면대에서 수건 적시기 & 물양동이 채우기`
          : `[Space / 반응하기] 💧 세면대 산소 회복 & 물양동이 보충`;
      } else if (target.tile === TILE.DOOR) {
        promptText = `[Space / 반응하기] 🤚🚪 손등으로 문 온도 확인 후 열기`;
      } else if (target.tile === TILE.OPEN_DOOR) {
        promptText = `[Space / 반응하기] 🚪🛡️ 열린 방화문 다시 닫기 (연기 통과 차단!)`;
      } else if (target.tile === TILE.HOT_DOOR) {
        promptText = `[Space / 반응하기] 🤚🌡️ 손등으로 문 손잡이 온도 감지하기 (고온 주의!)`;
      } else if (target.tile === TILE.LOCKED_DOOR) {
        promptText = `[Space / 반응하기] 🔒 열쇠로 잠긴 문 열기`;
      } else if (target.tile === TILE.GAS_VALVE) {
        promptText = `[Space / 반응하기] 🔴 주방 가스 밸브 잠그기 (가연물 차단)`;
      } else if (target.tile === TILE.BREAKER) {
        promptText = `[Space / 반응하기] ⚡ 전원 차단기(두꺼비집) 내리기`;
      } else if (target.tile === TILE.PHONE_119) {
        promptText = `[Space / 반응하기] 📞 119에 화재 발생 신고하기`;
      } else if (target.tile === TILE.LIFELINE) {
        promptText = `[Space / 반응하기] 🪢 베란다 완강기(3단계 절차)로 탈출하기`;
      } else if (target.tile === TILE.PARTITION) {
        promptText = `[Space / 반응하기] 🧱 아파트 베란다 경량칸막이 부수고 옆집으로 탈출하기`;
      } else if (target.tile === TILE.HAZARD) {
        promptText = `[Space / 반응하기] 🔍 가정 내 화재 위험요소 점검·수리하기`;
      } else if (target.tile === TILE.ALARM_BELL) {
        promptText = `[Space / 반응하기] 🔔 화재 비상벨(발신기) 누르고 "불이야!" 외치기`;
      } else if (target.tile === TILE.DEBRIS) {
        promptText = `[Space / 반응하기] 🪓 소방 도끼로 장애물 부수기`;
      } else if (target.tile === TILE.FURNITURE) {
        promptText = `[Space / 반응하기] 🔐 비상 금고·단서 서가 조사하기`;
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

  let dioramaZoom = 1.0;

  function computeDioramaLayout(w, h) {
    const isCompact = h < 540;
    const padX = isCompact ? 4 : 8;
    const padTop = isCompact ? 4 : 10;
    const padBottom = isCompact ? 4 : 6;
    const wallRatio = isCompact ? 0.36 : 0.44;
    const slabRatio = isCompact ? 0.16 : 0.22;
    const rawTileW = (w - padX * 2) / COLS;
    const tileH = (h - padTop - padBottom) / (ROWS + wallRatio + slabRatio);
    const tileSize = Math.max(12, Math.min(rawTileW, tileH));
    const stretchX = Math.max(1, Math.min(1.52, rawTileW / Math.max(1, tileSize)));
    const zoom = dioramaZoom || 1;
    const wallH = tileSize * wallRatio;
    const slabH = tileSize * slabRatio;
    const boardW = tileSize * COLS * stretchX;
    const boardH = tileSize * ROWS;
    let offsetX = (w - boardW * zoom) / 2;
    let offsetY = (padTop + wallH) * zoom + (h - (padTop + padBottom + wallH + boardH + slabH) * zoom) / 2;
    if (zoom > 1.01 && typeof player !== 'undefined' && player) {
      const targetX = w * 0.5 - (player.x * tileSize * stretchX) * zoom;
      const targetY = h * 0.52 - (player.y * tileSize) * zoom;
      const minX = w - (boardW + padX) * zoom;
      const maxX = padX * zoom;
      const minY = h - (boardH + slabH + padBottom) * zoom;
      const maxY = (padTop + wallH) * zoom;
      offsetX = Math.min(Math.max(targetX, Math.min(minX, maxX)), Math.max(minX, maxX));
      offsetY = Math.min(Math.max(targetY, Math.min(minY, maxY)), Math.max(minY, maxY));
    }
    return { tileSize, stretchX, zoom, wallH, slabH, offsetX, offsetY, isCloseUp: zoom > 1.05 };
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
    const zoomBtnEl = document.getElementById('btnMapZoomToggle');
    if (cameraMode3D === 'FPS_3D') {
      orientCameraToOpenSpace();
      if (iconEl) iconEl.textContent = '👁️';
      if (textEl) textEl.textContent = '1인칭3D';
      if (zoomBtnEl) zoomBtnEl.classList.add('hidden');
      showToast('👁️ [1인칭 3D 건물 탈출 뷰] ▲ 전진 · ▼ 후진 · ◀/▶ 방향전환으로 실제 3D 건물 속을 걸어 탈출하세요!', 'border-indigo-400');
    } else {
      if (iconEl) iconEl.textContent = '🧊';
      if (textEl) textEl.textContent = '3D입체뷰';
      if (zoomBtnEl) zoomBtnEl.classList.remove('hidden');
      showToast('🧊 [3D 전체 건물 입체 뷰] 건물 전체 방 구조와 탈출 동선을 한눈에 보는 3D 입체 시점입니다!', 'border-indigo-400');
    }
    renderCanvas();
  }

  const btnCamera3D = document.getElementById('btnCamera3D');
  if (btnCamera3D) {
    btnCamera3D.addEventListener('click', toggleCamera3DMode);
  }

  function toggleMapZoomMode() {
    SoundFX.init();
    SoundFX.pickup();
    dioramaZoom = dioramaZoom > 1.05 ? 1.0 : 1.4;
    const zIcon = document.getElementById('mapZoomIcon');
    const zText = document.getElementById('mapZoomText');
    if (dioramaZoom > 1.05) {
      if (zIcon) zIcon.textContent = '🗺️';
      if (zText) zText.textContent = '전체맵뷰';
      showToast('🔍 [1.4배 플레이어 중심 확대뷰] 캐릭터와 방 구조를 크게 확대했습니다! (우측 상단 미니맵 표시)', 'border-sky-400');
    } else {
      if (zIcon) zIcon.textContent = '🔍';
      if (zText) zText.textContent = '화면확대';
      showToast('🗺️ [와이드 전체 건물 뷰] 건물 전체 대피 동선을 한눈에 표시합니다!', 'border-sky-400');
    }
    renderCanvas();
  }

  const btnMapZoomToggle = document.getElementById('btnMapZoomToggle');
  if (btnMapZoomToggle) {
    btnMapZoomToggle.addEventListener('click', toggleMapZoomMode);
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
    const gx = (local.x - layout.offsetX) / (layout.tileSize * (layout.stretchX || 1) * (layout.zoom || 1));
    const gy = (local.y - layout.offsetY) / (layout.tileSize * (layout.zoom || 1));
    return { gx, gy, c: Math.floor(gx), r: Math.floor(gy) };
  }

  // --- Helper: Draw 3D Extruded Box with Ambient Contact Shadow, Vertical Shading & Specular Rim ---
  function draw3DBox(ctx, x, y, w, d, h, topColor, frontColor, sideColor, strokeColor) {
    const bevelX = Math.max(2, w * 0.12);
    const frontY = y + d * 0.55 - h;
    const frontH = h + d * 0.45;
    const topH = d * 0.62;

    // 0. Soft 3D Floor Contact Ambient Occlusion Shadow
    ctx.fillStyle = 'rgba(2, 6, 23, 0.42)';
    ctx.fillRect(x - 1, y + d - 2, w + bevelX + 3, 5);

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
    // 2. Front vertical face (extruded down from roof to floor base) + 3D Vertical Depth Shading
    ctx.fillStyle = frontColor;
    ctx.fillRect(x, frontY, w, frontH);
    const vShade = ctx.createLinearGradient(x, frontY, x, frontY + frontH);
    vShade.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
    vShade.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
    vShade.addColorStop(1, 'rgba(2, 6, 23, 0.34)');
    ctx.fillStyle = vShade;
    ctx.fillRect(x, frontY, w, frontH);

    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, frontY, w, frontH);
    }
    // 3. Top roof face + Specular Front-Edge Bevel Highlight
    ctx.fillStyle = topColor;
    ctx.fillRect(x, y - h, w, topH);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillRect(x + 1, y - h + 1, Math.max(1, w - 2), Math.max(1.5, topH * 0.18));
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.strokeRect(x, y - h, w, topH);
    }
  }

  // --- Helper: Multi-Layered 3D Volumetric Flame Plume + Rising Embers + Floor Heat Scorch ---
  function drawRealisticVolumetricFire(ctx, cx, cy, baseRadius, now, phase = 0, fireType = 'normal') {
    const r = Math.max(8, baseRadius);
    const flicker = 0.88 + 0.16 * Math.sin(now * 6.2 + phase);
    const sway = Math.sin(now * 4.5 + phase * 1.7) * (r * 0.14);

    ctx.save();
    // 1. Floor Heat Scorch & Ambient Firelight Halo
    const haloGrad = ctx.createRadialGradient(cx, cy + r * 0.12, r * 0.08, cx, cy + r * 0.12, r * 1.35 * flicker);
    if (fireType === 'electric') {
      haloGrad.addColorStop(0, 'rgba(224, 242, 254, 0.92)');
      haloGrad.addColorStop(0.35, 'rgba(56, 189, 248, 0.65)');
      haloGrad.addColorStop(0.7, 'rgba(37, 99, 235, 0.28)');
      haloGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    } else if (fireType === 'oil' || fireType === 'metal') {
      haloGrad.addColorStop(0, 'rgba(254, 249, 195, 0.95)');
      haloGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.72)');
      haloGrad.addColorStop(0.7, 'rgba(180, 83, 9, 0.30)');
      haloGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    } else {
      haloGrad.addColorStop(0, 'rgba(254, 249, 195, 0.95)');
      haloGrad.addColorStop(0.35, 'rgba(249, 115, 22, 0.72)');
      haloGrad.addColorStop(0.72, 'rgba(220, 38, 38, 0.28)');
      haloGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    }
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.10, r * 1.25 * flicker, r * 0.75 * flicker, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Dark Thermal Smoke Plume Rising Above Flame Tip
    const smokeY = cy - r * 1.05;
    const smokeGrad = ctx.createRadialGradient(cx + sway * 0.8, smokeY, r * 0.05, cx + sway * 0.8, smokeY, r * 0.72);
    smokeGrad.addColorStop(0, 'rgba(30, 41, 59, 0.52)');
    smokeGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = smokeGrad;
    ctx.beginPath();
    ctx.arc(cx + sway * 0.8, smokeY, r * 0.72, 0, Math.PI * 2);
    ctx.fill();

    // 3. Outer, Mid, and Inner Volumetric 3D Flame Tongues (Procedural Bezier Teardrops)
    const tongues = [
      { ox: -r * 0.28, w: r * 0.42, h: r * 0.88, col: fireType === 'electric' ? '#1d4ed8' : '#dc2626', ph: 0.8 },
      { ox: r * 0.26, w: r * 0.40, h: r * 0.84, col: fireType === 'electric' ? '#2563eb' : '#ea580c', ph: 2.1 },
      { ox: 0, w: r * 0.56, h: r * 1.18 * flicker, col: fireType === 'electric' ? '#0284c7' : '#ef4444', ph: 0.0 },
      { ox: sway * 0.25, w: r * 0.38, h: r * 0.86 * flicker, col: fireType === 'electric' ? '#38bdf8' : '#f97316', ph: 1.4 },
      { ox: sway * 0.15, w: r * 0.22, h: r * 0.54 * flicker, col: fireType === 'electric' ? '#e0f2fe' : '#fef08a', ph: 2.8 }
    ];
    for (const tg of tongues) {
      const tipSway = Math.sin(now * 5.8 + phase + tg.ph) * (r * 0.14);
      const bx = cx + tg.ox;
      const by = cy + r * 0.22;
      ctx.fillStyle = tg.col;
      ctx.beginPath();
      ctx.moveTo(bx - tg.w, by);
      ctx.quadraticCurveTo(bx - tg.w * 0.85, by - tg.h * 0.55, bx + tipSway, by - tg.h);
      ctx.quadraticCurveTo(bx + tg.w * 0.85, by - tg.h * 0.55, bx + tg.w, by);
      ctx.quadraticCurveTo(bx, by + tg.w * 0.38, bx - tg.w, by);
      ctx.closePath();
      ctx.fill();
    }

    // 4. Rising Glowing Ember Sparks
    for (let sIdx = 0; sIdx < 4; sIdx++) {
      const sparkProg = ((now * 1.35 + phase * 0.5 + sIdx * 0.27) % 1);
      const sx = cx + Math.sin(now * 4 + sIdx * 2.1 + phase) * (r * 0.45);
      const sy = cy + r * 0.05 - sparkProg * (r * 1.45);
      const sr = Math.max(1.2, (1 - sparkProg) * (r * 0.09));
      ctx.fillStyle = fireType === 'electric' ? '#bae6fd' : '#fde047';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- Helper: Draw Realistic Articulated 3D-Shaded Human Character Limb ---
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
    // 3D Cylindrical Volume Highlight along center of limb
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = Math.max(1, radius * 0.42);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.18);
    ctx.lineTo(len, -radius * 0.15);
    ctx.stroke();
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
    let helmetCol = (skinId !== 'npc' && skinId !== 'p2' && customGear && customGear.helmetColor) ? customGear.helmetColor : null;

    if (skinId === 'firefighter') {
      jacketMain = '#ea580c';
      jacketDark = '#9a3412';
      stripeCol = '#fde047';
      pantsCol = '#1e293b';
      shoeCol = '#fbbf24';
      helmetCol = (customGear && customGear.helmetColor) || '#dc2626';
    } else if (skinId === 'safety_officer') {
      jacketMain = '#10b981';
      jacketDark = '#047857';
      stripeCol = '#fef08a';
      pantsCol = '#1e3a8a';
      shoeCol = '#38bdf8';
      helmetCol = (customGear && customGear.helmetColor) || '#f8fafc';
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
      helmetCol = null;
    } else if (skinId === 'p2') {
      jacketMain = '#ec4899';
      jacketDark = '#be185d';
      stripeCol = '#fbcfe8';
      pantsCol = '#1e293b';
      shoeCol = '#f43f5e';
      helmetCol = null;
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
    let helmetCol = (skinId !== 'npc' && skinId !== 'p2' && customGear && customGear.helmetColor) ? customGear.helmetColor : null;

    if (skinId === 'firefighter') {
      jacketMain = '#ea580c';
      jacketDark = '#9a3412';
      stripeCol = '#fde047';
      pantsCol = '#1e293b';
      shoeCol = '#fbbf24';
      helmetCol = (customGear && customGear.helmetColor) || '#dc2626';
    } else if (skinId === 'safety_officer') {
      jacketMain = '#10b981';
      jacketDark = '#047857';
      stripeCol = '#fef08a';
      pantsCol = '#1e3a8a';
      shoeCol = '#38bdf8';
      helmetCol = (customGear && customGear.helmetColor) || '#f8fafc';
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
      helmetCol = null;
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
      const tx = rightHandPos.hdX - u * 0.048;
      const ty = rightHandPos.hdY - u * 0.04;
      const tw = u * 0.096;
      const th = u * 0.19;
      // Metallic Valve & Lever Handle on Top
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(tx + tw * 0.32, ty - u * 0.038, tw * 0.36, u * 0.04);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(tx + tw * 0.15, ty - u * 0.048, tw * 0.72, u * 0.018);
      // Black Discharge Hose
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(1.5, u * 0.022);
      ctx.beginPath();
      ctx.moveTo(tx + tw * 0.75, ty - u * 0.02);
      ctx.lineTo(tx + tw * 1.12, ty + th * 0.45);
      ctx.stroke();
      // Red Cylinder Body
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 1.2;
      ctx.fillRect(tx, ty, tw, th);
      ctx.strokeRect(tx, ty, tw, th);
      // White Safety Instruction Label Band
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(tx + tw * 0.12, ty + th * 0.28, tw * 0.76, th * 0.34);
    } else if (rightTool === 'axe') {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(rightHandPos.hdX - u * 0.02, rightHandPos.hdY - u * 0.18, u * 0.04, u * 0.26);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(rightHandPos.hdX - u * 0.012, rightHandPos.hdY - u * 0.17, u * 0.07, u * 0.085);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(rightHandPos.hdX + u * 0.055, rightHandPos.hdY - u * 0.18, u * 0.045, u * 0.105);
    } else if (rightTool === 'bucket') {
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1.2;
      ctx.fillRect(rightHandPos.hdX - u * 0.055, rightHandPos.hdY - u * 0.01, u * 0.11, u * 0.12);
      ctx.strokeRect(rightHandPos.hdX - u * 0.055, rightHandPos.hdY - u * 0.01, u * 0.11, u * 0.12);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(rightHandPos.hdX - u * 0.06, rightHandPos.hdY - u * 0.02, u * 0.12, u * 0.024);
    } else if (rightTool === 'flashlight') {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.2;
      ctx.fillRect(rightHandPos.hdX - u * 0.028, rightHandPos.hdY - u * 0.05, u * 0.056, u * 0.11);
      ctx.strokeRect(rightHandPos.hdX - u * 0.028, rightHandPos.hdY - u * 0.05, u * 0.056, u * 0.11);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(rightHandPos.hdX - u * 0.032, rightHandPos.hdY - u * 0.068, u * 0.064, u * 0.022);
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
    draw3DBox(ctx, sx, sy, sw, sd, sh, '#f1f5f9', '#0284c7', '#0369a1', '#7dd3fc');
    // Recessed Blue Water Basin on Top Face
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.fillRect(sx + sw * 0.16, sy - sh + sd * 0.12, sw * 0.68, sd * 0.38);
    ctx.strokeRect(sx + sw * 0.16, sy - sh + sd * 0.12, sw * 0.68, sd * 0.38);
    // Chrome Faucet Spout
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(sx + sw * 0.46, sy - sh + sd * 0.04, sw * 0.08, sd * 0.16);
    // Wall Mirror with Aluminum Frame
    ctx.fillStyle = '#bae6fd';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(sx + sw * 0.22, sy - sh - wallH * 0.38, sw * 0.56, wallH * 0.34);
    ctx.strokeRect(sx + sw * 0.22, sy - sh - wallH * 0.38, sw * 0.56, wallH * 0.34);
    ctx.font = `bold ${Math.max(10, Math.floor(tileSize * 0.19))}px "Noto Sans KR", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚰세면대', x + tileSize * 0.5, y + tileSize * 0.76);
  }

  function isVerticalWallDoor(c, r) {
    if (!grid || r == null || c == null) return false;
    const nWall = r > 0 && grid[r - 1] && grid[r - 1][c] === TILE.WALL;
    const sWall = r < ROWS - 1 && grid[r + 1] && grid[r + 1][c] === TILE.WALL;
    const wWall = c > 0 && grid[r] && grid[r][c - 1] === TILE.WALL;
    const eWall = c < COLS - 1 && grid[r] && grid[r][c + 1] === TILE.WALL;
    if (nWall && sWall) return true;
    if (wWall && eWall) return false;
    return nWall || sWall;
  }

  function draw3DDoorway(ctx, x, y, tileSize, wallH, t, now, r, c) {
    const dh = wallH * 0.94;
    const vertWall = isVerticalWallDoor(c, r);

    if (t === TILE.OPEN_DOOR) {
      if (vertWall) {
        // Doorway in North-South wall (passage runs East-West)
        ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.fillRect(x + tileSize * 0.36, y + tileSize * 0.04, tileSize * 0.28, tileSize * 0.92);
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.78)';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(x + tileSize * 0.10, y + tileSize * 0.16, tileSize * 0.80, tileSize * 0.68);
        // North & South Door Frame Jambs hugging wall edges
        draw3DBox(ctx, x + tileSize * 0.34, y + tileSize * 0.02, tileSize * 0.32, tileSize * 0.14, dh, '#78350f', '#451a03', '#291507', '#d97706');
        draw3DBox(ctx, x + tileSize * 0.34, y + tileSize * 0.84, tileSize * 0.32, tileSize * 0.14, dh, '#78350f', '#451a03', '#291507', '#d97706');
        // 90-degree Swung Open Door Leaf resting flat against North wall edge
        draw3DBox(ctx, x + tileSize * 0.50, y + tileSize * 0.04, tileSize * 0.44, tileSize * 0.12, dh * 0.90, '#b45309', '#8c4a19', '#451a03', '#fcd34d');
      } else {
        // Doorway in East-West wall (passage runs North-South)
        ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.fillRect(x + tileSize * 0.04, y + tileSize * 0.36, tileSize * 0.92, tileSize * 0.28);
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.78)';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(x + tileSize * 0.16, y + tileSize * 0.10, tileSize * 0.68, tileSize * 0.80);
        // West & East Door Frame Jambs hugging wall edges
        draw3DBox(ctx, x + tileSize * 0.02, y + tileSize * 0.34, tileSize * 0.14, tileSize * 0.32, dh, '#78350f', '#451a03', '#291507', '#d97706');
        draw3DBox(ctx, x + tileSize * 0.84, y + tileSize * 0.34, tileSize * 0.14, tileSize * 0.32, dh, '#78350f', '#451a03', '#291507', '#d97706');
        // 90-degree Swung Open Door Leaf resting flat against West wall edge
        draw3DBox(ctx, x + tileSize * 0.05, y + tileSize * 0.48, tileSize * 0.12, tileSize * 0.44, dh * 0.90, '#b45309', '#8c4a19', '#451a03', '#fcd34d');
      }
      ctx.fillStyle = '#6ee7b7';
      ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.16))}px "Noto Sans KR", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('열린문(통과)', x + tileSize * 0.50, y + tileSize * 0.52);
      return;
    }

    const pulse = t === TILE.HOT_DOOR ? (0.65 + 0.35 * Math.sin(now * 3.5)) : 1;
    const topCol = t === TILE.LOCKED_DOOR ? '#ca8a04' : (t === TILE.HOT_DOOR ? '#dc2626' : '#b45309');
    const frontCol = t === TILE.LOCKED_DOOR ? '#854d0e' : (t === TILE.HOT_DOOR ? `rgba(153, 27, 27, ${pulse})` : '#7c3f10');
    const strokeCol = t === TILE.LOCKED_DOOR ? '#fef08a' : (t === TILE.HOT_DOOR ? '#fca5a5' : '#fcd34d');

    // Outer Architectural Door Frame Casing Pillars
    draw3DBox(ctx, x + tileSize * 0.02, y + tileSize * 0.12, tileSize * 0.10, tileSize * 0.76, dh * 1.02, '#451a03', '#291507', '#1c0f05', '#78350f');
    draw3DBox(ctx, x + tileSize * 0.88, y + tileSize * 0.12, tileSize * 0.10, tileSize * 0.76, dh * 1.02, '#451a03', '#291507', '#1c0f05', '#78350f');

    const dx = x + tileSize * 0.10;
    const dy = y + tileSize * 0.16;
    const dw = tileSize * 0.80;
    const dd = tileSize * 0.68;

    // Recessed Door Leaf Body
    draw3DBox(ctx, dx, dy, dw, dd, dh * 0.96, topCol, frontCol, '#3b1906', strokeCol);

    const frontTopY = dy + dd * 0.55 - dh * 0.96;
    const frontH = dh * 0.96 + dd * 0.45;

    // Overhead Hydraulic Door Closer (도어클로저)
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(dx + dw * 0.16, frontTopY + 2, dw * 0.24, Math.max(3, frontH * 0.07));

    // Upper Wired-Glass Vision Panel (망입유리 시야창)
    const winX = dx + dw * 0.20;
    const winY = frontTopY + frontH * 0.14;
    const winW = dw * 0.60;
    const winH = frontH * 0.30;
    ctx.fillStyle = t === TILE.HOT_DOOR ? `rgba(251, 146, 60, ${0.85 * pulse})` : '#0f2942';
    ctx.fillRect(winX, winY, winW, winH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.1;
    ctx.strokeRect(winX, winY, winW, winH);
    // Wired-glass diagonal mesh line
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
    ctx.beginPath();
    ctx.moveTo(winX, winY + winH);
    ctx.lineTo(winX + winW, winY);
    ctx.stroke();

    // Lower Recessed Architectural Panel & Stainless Kickplate
    ctx.fillStyle = 'rgba(28, 15, 5, 0.38)';
    ctx.fillRect(dx + dw * 0.18, frontTopY + frontH * 0.54, dw * 0.64, frontH * 0.26);
    ctx.strokeStyle = 'rgba(254, 243, 199, 0.45)';
    ctx.strokeRect(dx + dw * 0.18, frontTopY + frontH * 0.54, dw * 0.64, frontH * 0.26);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(dx + 2, frontTopY + frontH * 0.86, dw - 4, frontH * 0.11);

    // 3D Metallic Lever Handle (레버 손잡이)
    ctx.fillStyle = '#334155';
    ctx.fillRect(dx + dw * 0.74, frontTopY + frontH * 0.45, Math.max(3, dw * 0.08), Math.max(6, frontH * 0.12));
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(dx + dw * 0.64, frontTopY + frontH * 0.49, Math.max(6, dw * 0.16), Math.max(2.5, frontH * 0.045));

    const doorIcon = t === TILE.LOCKED_DOOR ? '🔒' : (t === TILE.HOT_DOOR ? '🌡️🔥' : '🚪');
    const doorLabel = t === TILE.LOCKED_DOOR ? '잠긴문(열쇠)' : (t === TILE.HOT_DOOR ? '고온위험문' : '방문(열기)');
    ctx.font = `${Math.floor(tileSize * 0.26)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(doorIcon, x + tileSize * 0.5, winY + winH * 0.52);
    ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.16))}px "Noto Sans KR", sans-serif`;
    ctx.fillStyle = '#fef9c3';
    ctx.fillText(doorLabel, x + tileSize * 0.5, y + tileSize * 0.80);
  }

  function draw3DExitPortal(ctx, x, y, tileSize, wallH, now) {
    const glow = 0.75 + 0.25 * Math.sin(now * 2.8);
    const eh = wallH * 0.96;
    // Glowing green emergency exit stairwell floor pad
    ctx.fillStyle = `rgba(16, 185, 129, ${0.35 * glow})`;
    ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
    // Steel Fire-Exit Frame & Recessed Green Exit Door
    draw3DBox(
      ctx,
      x + tileSize * 0.04,
      y + tileSize * 0.08,
      tileSize * 0.92,
      tileSize * 0.84,
      eh,
      '#10b981',
      `rgba(4, 120, 87, ${glow})`,
      '#064e3b',
      '#a7f3d0'
    );
    // Horizontal Stainless Panic Push-Bar (비상구 패닉바)
    const frontTopY = y + tileSize * 0.08 + tileSize * 0.84 * 0.55 - eh;
    const frontH = eh + tileSize * 0.84 * 0.45;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(x + tileSize * 0.18, frontTopY + frontH * 0.52, tileSize * 0.64, Math.max(3, frontH * 0.06));
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + tileSize * 0.30, frontTopY + frontH * 0.53, tileSize * 0.40, Math.max(2, frontH * 0.04));

    // Illuminated Green Emergency Exit Sign Box above Doorway
    const signW = tileSize * 0.80;
    const signH = Math.max(14, tileSize * 0.28);
    const signX = x + (tileSize - signW) * 0.5;
    const signY = y - eh + 2;
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
    const gearSummary = player.hasMask
      ? '😷방연마스크 착용'
      : (player.wetTowel ? '🧣젖은수건 착용' : (player.hasTowel ? '🧣수건 보유' : 'Space:반응 · Shift:숙이기'));
    ctx.save();
    const badgeY = height - 34;
    const badgeText = `👁️ 1인칭 3D 뷰 (${player.crouching ? '🧎낮은자세[Shift]' : '🚶서있음[Shift]'} · ${gearSummary})`;
    ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
    const badgeW = Math.ceil(ctx.measureText(badgeText).width) + 18;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = player.crouching ? '#10b981' : '#818cf8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(10, badgeY, badgeW, 24);
    ctx.strokeRect(10, badgeY, badgeW, 24);
    ctx.fillStyle = '#e0e7ff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, 19, badgeY + 12);
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
  const HEX_RGB_CACHE = Object.create(null);
  let cachedEscapePathKey = '';
  let cachedEscapePathResult = [];

  function getCachedHexRgb(hex) {
    let rgb = HEX_RGB_CACHE[hex];
    if (!rgb) {
      const n = parseInt(hex.slice(1), 16);
      rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      HEX_RGB_CACHE[hex] = rgb;
    }
    return rgb;
  }

  function getCachedShortestEscapePath(sc, sr, tc, tr) {
    const key = `${currentStageIdx}:${sc},${sr}->${tc},${tr}:f${fires.length}`;
    if (key !== cachedEscapePathKey) {
      cachedEscapePathKey = key;
      cachedEscapePathResult = computeShortestEscapePath(sc, sr, tc, tr);
    }
    return cachedEscapePathResult;
  }

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
    const camEyeZ = fpsCamEyeZ;
    const walkBobY = reduceMot ? 0 : Math.sin(fpsWalkPhase * 2) * (fpsForwardSurge * 0.45);
    const horizon = height * fpsHorizonRatio + walkBobY;
    const vertScale = height * 0.74;
    const halfW = width * 0.5;

    // Pre-compute fire light pulse & exit light coordinates ONCE per frame (eliminates thousands of Math.sin calls)
    const activeFireLights = [];
    if (fires && fires.length > 0) {
      for (let k = 0; k < fires.length; k++) {
        const f = fires[k];
        const fx = f.c + 0.5;
        const fy = f.r + 0.5;
        if (Math.abs(fx - camWorldX) > 10.5 || Math.abs(fy - camWorldY) > 10.5) continue;
        const pulse = 0.84 + 0.16 * Math.sin(now * 6.2 + (f.phase || k));
        activeFireLights.push({ x: fx, y: fy, strength: 0.52 * pulse });
      }
    }

    const exitLightSources = [];
    for (let er = 0; er < ROWS; er++) {
      for (let ec = 0; ec < COLS; ec++) {
        if (grid[er][ec] === TILE.EXIT) {
          exitLightSources.push({ x: ec + 0.5, y: er + 0.5 });
        }
      }
    }

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

    function shadeHexColor(hex, factor, fireWarmth = 0, exitGlow = 0) {
      const f = Math.max(0.18, Math.min(1.68, factor * brightMul));
      const rgb = getCachedHexRgb(hex);
      const fw = fireWarmth > 0 ? Math.min(0.85, fireWarmth) : 0;
      const eg = exitGlow > 0 ? Math.min(0.65, exitGlow) : 0;
      const r = Math.min(255, Math.max(0, (rgb[0] * f + fw * 125 - eg * 14) | 0));
      const g = Math.min(255, Math.max(0, (rgb[1] * f + fw * 52 + eg * 95) | 0));
      const b = Math.min(255, Math.max(0, (rgb[2] * f - fw * 18 + eg * 56) | 0));
      return `rgb(${r},${g},${b})`;
    }

    function getFireLightAt(wx, wy) {
      const len = activeFireLights.length;
      if (len === 0) return 0;
      let warmth = 0;
      for (let k = 0; k < len; k++) {
        const fl = activeFireLights[k];
        const dx = fl.x - wx;
        if (dx > 3.4 || dx < -3.4) continue;
        const dy = fl.y - wy;
        if (dy > 3.4 || dy < -3.4) continue;
        const dSq = dx * dx + dy * dy;
        if (dSq < 11.5) {
          warmth += (1 - dSq * 0.08695) * fl.strength;
        }
      }
      return warmth > 0.78 ? 0.78 : warmth;
    }

    function getExitLightAt(wx, wy) {
      const len = exitLightSources.length;
      if (len === 0) return 0;
      let glow = 0;
      for (let k = 0; k < len; k++) {
        const ex = exitLightSources[k];
        const dx = ex.x - wx;
        if (dx > 3.0 || dx < -3.0) continue;
        const dy = ex.y - wy;
        if (dy > 3.0 || dy < -3.0) continue;
        const dSq = dx * dx + dy * dy;
        if (dSq < 9.0) {
          glow += (1 - dSq * 0.1111) * 0.42;
        }
      }
      return glow > 0.55 ? 0.55 : glow;
    }

    // 1. 3D Ceiling & Perspective Floor Base Backdrop with Power/Lighting Atmosphere
    const powerRestored = !!(player.breakerClosed || wireSolved);
    const ceilGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    ceilGrad.addColorStop(0, powerRestored ? '#0b1324' : '#060a12');
    ceilGrad.addColorStop(0.58, powerRestored ? '#19253b' : '#0f172a');
    ceilGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, 0, width, horizon);

    const floorGrad = ctx.createLinearGradient(0, horizon, 0, height);
    floorGrad.addColorStop(0, '#0f172a');
    floorGrad.addColorStop(0.35, '#1e293b');
    floorGrad.addColorStop(0.75, '#293548');
    floorGrad.addColorStop(1, '#172030');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizon, width, height - horizon);

    // 2. Frustum-Culled & Near-Plane Clipped 3D Perspective Floor Quads & Ceiling Panels
    const floorTiles = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === TILE.WALL) continue;
        const dx = c + 0.5 - camWorldX;
        const dy = r + 0.5 - camWorldY;
        const distSq = dx * dx + dy * dy;
        if (distSq > 72) continue;
        const centerDepth = dx * cosYaw + dy * sinYaw;
        if (centerDepth < -0.65) continue;
        // Horizontal FOV frustum culling: skip tiles completely outside left/right view cone
        if (centerDepth > 0.85) {
          const centerRight = -dx * sinYaw + dy * cosYaw;
          if (Math.abs(centerRight) > (centerDepth + 0.9) * tanHalfFov + 0.85) continue;
        }
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
      const tileFireWarmth = getFireLightAt(c + 0.5, r + 0.5);
      const tileExitGlow = getExitLightAt(c + 0.5, r + 0.5);
      const ceilLightBoost = ((r % 2 === 1) && (c % 2 === 1)) ? (powerRestored ? 0.14 : 0.07) : 0;
      const depthShade = Math.max(0.36, Math.min(1.26, (1.10 + ceilLightBoost + tileFireWarmth * 0.25 + tileExitGlow * 0.20) / (1 + dist * 0.14)));

      let baseHex = even ? '#3b4c63' : '#2e3d52';
      let strokeCol = 'rgba(148, 163, 184, 0.28)';

      if (t === TILE.EXIT) {
        baseHex = '#10b981';
        strokeCol = '#a7f3d0';
      } else if (c <= 3 && r <= 3) {
        baseHex = even ? '#854d0e' : '#713f12';
        strokeCol = 'rgba(253, 224, 71, 0.22)';
      } else if (c >= 4 && c <= 7 && r <= 3) {
        baseHex = even ? '#0e7490' : '#155e75';
        strokeCol = 'rgba(103, 232, 249, 0.28)';
      } else if (c <= 5 && r >= 5) {
        baseHex = even ? '#7f1d1d' : '#651a1a';
        strokeCol = 'rgba(253, 164, 175, 0.22)';
      }

      ctx.fillStyle = shadeHexColor(baseHex, depthShade, tileFireWarmth, tileExitGlow);
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let k = 1; k < poly.length; k++) ctx.lineTo(poly[k].x, poly[k].y);
      ctx.closePath();
      ctx.fill();
      if (dist < 5.6) {
        ctx.strokeStyle = strokeCol;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Subtle Floor Specular Reflection Under Ceiling Lights, Firelight, or Emergency Exit Light
      if (dist < 5.4 && (((r % 2 === 1) && (c % 2 === 1)) || tileFireWarmth > 0.18 || tileExitGlow > 0.16)) {
        const sheenPoly = projectClipped3DPolygon(
          [[c + 0.22, r + 0.22, 0.003], [c + 0.78, r + 0.22, 0.003], [c + 0.78, r + 0.78, 0.003], [c + 0.22, r + 0.78, 0.003]],
          0.12
        );
        if (sheenPoly) {
          ctx.fillStyle = tileFireWarmth > 0.18
            ? `rgba(251, 146, 60, ${Math.min(0.28, tileFireWarmth * 0.36)})`
            : (tileExitGlow > 0.16
              ? `rgba(52, 211, 153, ${Math.min(0.24, tileExitGlow * 0.38)})`
              : (powerRestored ? 'rgba(254, 249, 195, 0.08)' : 'rgba(148, 163, 184, 0.04)'));
          ctx.beginPath();
          ctx.moveTo(sheenPoly[0].x, sheenPoly[0].y);
          for (let k = 1; k < sheenPoly.length; k++) ctx.lineTo(sheenPoly[k].x, sheenPoly[k].y);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Corridor Photoluminescent Guide Strip
      if ((r === 4 || c === 8) && dist < 6.5) {
        const stripPoly = projectClipped3DPolygon(
          [[c + 0.38, r + 0.38, 0.005], [c + 0.62, r + 0.38, 0.005], [c + 0.62, r + 0.62, 0.005], [c + 0.38, r + 0.62, 0.005]],
          0.10
        );
        if (stripPoly) {
          ctx.fillStyle = 'rgba(52, 211, 153, 0.68)';
          ctx.beginPath();
          ctx.moveTo(stripPoly[0].x, stripPoly[0].y);
          for (let k = 1; k < stripPoly.length; k++) ctx.lineTo(stripPoly[k].x, stripPoly[k].y);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Recessed 3D Ceiling LED Light Panel & Fast Translucent Halo (no per-tile createRadialGradient overhead)
      if ((r % 2 === 1) && (c % 2 === 1) && dist < 7.2) {
        const ceilPoly = projectClipped3DPolygon(
          [[c + 0.20, r + 0.20, 0.99], [c + 0.80, r + 0.20, 0.99], [c + 0.80, r + 0.80, 0.99], [c + 0.20, r + 0.80, 0.99]],
          0.18
        );
        if (ceilPoly) {
          const lightPt = project3DPoint(c + 0.5, r + 0.5, 0.98, 0.22);
          if (lightPt && dist < 5.5) {
            const haloR = Math.max(14, Math.min(54, 72 / lightPt.depth));
            ctx.fillStyle = st.isDarkStage ? 'rgba(56, 189, 248, 0.09)' : 'rgba(254, 249, 195, 0.11)';
            ctx.beginPath();
            ctx.arc(lightPt.x, lightPt.y, haloR, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = st.isDarkStage
            ? 'rgba(56, 189, 248, 0.42)'
            : (powerRestored ? 'rgba(254, 249, 195, 0.92)' : 'rgba(253, 224, 71, 0.76)');
          ctx.beginPath();
          ctx.moveTo(ceilPoly[0].x, ceilPoly[0].y);
          for (let k = 1; k < ceilPoly.length; k++) ctx.lineTo(ceilPoly[k].x, ceilPoly[k].y);
          ctx.closePath();
          ctx.fill();
        }
      } else if ((r % 2 === 0) && (c % 2 === 0) && dist < 5.2) {
        // Ceiling Optical Smoke Detector Dome & Red Sensing LED
        const detPt = project3DPoint(c + 0.5, r + 0.5, 0.985, 0.25);
        if (detPt) {
          const dr = Math.max(2.5, Math.min(7, 10 / detPt.depth));
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.arc(detPt.x, detPt.y, dr, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(detPt.x + dr * 0.25, detPt.y, Math.max(1.2, dr * 0.32), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (((r + c) % 2 === 1) && dist < 4.6) {
        // 3D Ceiling Fire Sprinkler Nozzle & Thermal Bulb
        const spkPt = project3DPoint(c + 0.5, r + 0.5, 0.975, 0.25);
        if (spkPt) {
          const sr = Math.max(2.0, Math.min(6.0, 8.0 / spkPt.depth));
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(spkPt.x - sr * 0.7, spkPt.y - sr * 0.3, sr * 1.4, sr * 0.5);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(spkPt.x - sr * 0.22, spkPt.y + sr * 0.15, sr * 0.44, sr * 0.55);
        }
      }
    }

    // 2B. Discrete 3D Glowing Floor Guide Pads, Interactive Target Focus Ring & World-Space 3D Footprints
    const nextObj = getNextStepObjective();
    const routePath = nextObj
      ? getCachedShortestEscapePath(Math.floor(player.x), Math.floor(player.y), nextObj.c, nextObj.r)
      : [];

    if (routePath && routePath.length >= 2) {
      for (let i = 1; i < routePath.length; i++) {
        const prev = routePath[i - 1];
        const curr = routePath[i];
        const cp = toCamSpace(curr.c + 0.5, curr.r + 0.5, 0.015);
        if (cp.depth < 0.65 || cp.depth > 8.5) continue;
        if (Math.abs(cp.right) > (cp.depth + 0.6) * tanHalfFov + 0.5) continue;
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
          ctx.lineWidth = 1.5;
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

    // 3D Pulsing Interactive Target Floor Ring when an object/door/item is in [Space] reaction range
    const activeInteract3D = getInteractTarget();
    if (activeInteract3D) {
      const tc = activeInteract3D.kind === 'item' ? activeInteract3D.item.c : activeInteract3D.c;
      const tr = activeInteract3D.kind === 'item' ? activeInteract3D.item.r : activeInteract3D.r;
      const pulsePad = 0.10 + 0.03 * Math.sin(now * 5.2);
      const focusPoly = projectClipped3DPolygon(
        [
          [tc + pulsePad, tr + pulsePad, 0.016],
          [tc + 1 - pulsePad, tr + pulsePad, 0.016],
          [tc + 1 - pulsePad, tr + 1 - pulsePad, 0.016],
          [tc + pulsePad, tr + 1 - pulsePad, 0.016]
        ],
        0.18
      );
      if (focusPoly) {
        ctx.save();
        ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(focusPoly[0].x, focusPoly[0].y);
        for (let k = 1; k < focusPoly.length; k++) ctx.lineTo(focusPoly[k].x, focusPoly[k].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    for (const fs of footsteps3D) {
      const fp = project3DPoint(fs.x, fs.y, 0.01, 0.25);
      if (!fp || fp.depth > 4.5) continue;
      const alpha = Math.max(0, (fs.life / fs.maxLife) * 0.55);
      const rx = Math.max(2.5, 8 / fp.depth);
      const ry = Math.max(1.4, 3.8 / fp.depth);
      ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(fp.x, fp.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Optimized 3D Architectural Wall Shader with Adaptive Ray Count (4x fewer draw calls with crisp 2-3px columns)
    const qSetting = (appSettings && appSettings.graphicsQuality) || 'auto';
    const rayBudget = qSetting === 'low' ? 160 : (qSetting === 'normal' ? 220 : (qSetting === 'high' ? 380 : 240));
    const numRays = Math.min(rayBudget, Math.max(140, Math.floor(width * 0.40)));
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
      const sw = Math.max(1, x1 - x0) + 0.65;

      let wallX = side === 0 ? (camWorldY + rawDist * rayDirY) : (camWorldX + rawDist * rayDirX);
      wallX -= Math.floor(wallX);

      const isSideLit = side === 0;
      const isEdgeSeam = wallX < 0.032 || wallX > 0.968;
      const edgeDist = Math.min(wallX, 1 - wallX);
      const cornerAO = edgeDist < 0.075 ? (0.86 + (edgeDist / 0.075) * 0.14) : 1.0;

      // Dynamic Distance Shading + 3D Flashlight Cone (F) + Power Recovery Boost + Corner AO + Fire Point-Light
      const hitWorldX = camWorldX + rawDist * rayDirX;
      const hitWorldY = camWorldY + rawDist * rayDirY;
      const wallFireWarmth = getFireLightAt(hitWorldX, hitWorldY);

      let lightFactor = ((isSideLit ? 1.04 : 0.84) * cornerAO) / (1 + perpDist * 0.14);
      if (powerRestored) lightFactor *= 1.12;
      if (st.isDarkStage && !powerRestored) lightFactor *= 0.62;
      if (flashlightSpotEnabled || player.hasFlashlight) {
        const coneDist = Math.abs(camX);
        if (coneDist < 0.45) {
          const spotStrength = (1 - (coneDist / 0.45) ** 2) * (player.hasFlashlight ? 0.38 : 0.22);
          lightFactor += spotStrength / (1 + perpDist * 0.12);
        }
      }
      lightFactor = Math.min(1.12, lightFactor + wallFireWarmth * 0.22);

      if (hitTile === TILE.DOOR || hitTile === TILE.LOCKED_DOOR || hitTile === TILE.HOT_DOOR) {
        // High-Realism 3D Architectural Door Embedded in Building Wall
        const isWallShoulder = wallX < 0.08 || wallX > 0.92;
        const isFrameJamb = !isWallShoulder && (wallX < 0.145 || wallX > 0.855);
        const isInnerReveal = !isWallShoulder && ((wallX >= 0.132 && wallX < 0.145) || (wallX > 0.855 && wallX <= 0.868));

        if (isWallShoulder) {
          // Surrounding Building Wall Shoulder (Crown Molding + Upper Slate + Green Guide Line + Baseboard)
          ctx.fillStyle = shadeHexColor('#64748b', lightFactor, wallFireWarmth);
          ctx.fillRect(x0, wallTop, sw, projH * 0.62);
          ctx.fillStyle = shadeHexColor('#cbd5e1', lightFactor, wallFireWarmth);
          ctx.fillRect(x0, wallTop, sw, projH * 0.045);
          ctx.fillStyle = shadeHexColor('#334155', lightFactor, wallFireWarmth);
          ctx.fillRect(x0, wallTop + projH * 0.62, sw, projH * 0.38);
          ctx.fillStyle = shadeHexColor('#10b981', Math.max(0.75, lightFactor));
          ctx.fillRect(x0, wallTop + projH * 0.59, sw, projH * 0.035);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(x0, wallBottom - projH * 0.065, sw, projH * 0.065);
        } else {
          // Top Wall Header above Door Frame Lintel
          ctx.fillStyle = shadeHexColor('#cbd5e1', lightFactor, wallFireWarmth);
          ctx.fillRect(x0, wallTop, sw, projH * 0.045);
          ctx.fillStyle = shadeHexColor('#64748b', lightFactor, wallFireWarmth);
          ctx.fillRect(x0, wallTop + projH * 0.045, sw, projH * 0.03);

          if (isFrameJamb) {
            // 3D Recessed Walnut/Steel Door Frame Casing & Inner Shadow Reveal
            const frameCol = isInnerReveal ? '#1c0d02' : '#3b1d08';
            ctx.fillStyle = shadeHexColor(frameCol, lightFactor, wallFireWarmth);
            ctx.fillRect(x0, wallTop + projH * 0.075, sw, projH * 0.925);

            // 3-Stage Brushed Steel Hinges (경첩) on Left Jamb
            if (wallX >= 0.128 && wallX <= 0.145) {
              ctx.fillStyle = shadeHexColor('#cbd5e1', lightFactor * 1.05, wallFireWarmth);
              ctx.fillRect(x0, wallTop + projH * 0.21, sw, projH * 0.045);
              ctx.fillRect(x0, wallTop + projH * 0.51, sw, projH * 0.045);
              ctx.fillRect(x0, wallTop + projH * 0.79, sw, projH * 0.045);
            }
          } else {
            // Overhead Door Frame Lintel & Shadow Reveal (0.075 .. 0.125)
            ctx.fillStyle = shadeHexColor('#3b1d08', lightFactor, wallFireWarmth);
            ctx.fillRect(x0, wallTop + projH * 0.075, sw, projH * 0.038);
            ctx.fillStyle = shadeHexColor('#1c0d02', lightFactor, wallFireWarmth);
            ctx.fillRect(x0, wallTop + projH * 0.113, sw, projH * 0.012);

            // Realistic Wood-Grain / Fire-Door Texture Modulation
            const grainMod = 0.96 + 0.04 * Math.sin(wallX * 92);
            let leafHex = '#8c4a19';
            if (hitTile === TILE.LOCKED_DOOR) leafHex = '#9a6b13';
            else if (hitTile === TILE.HOT_DOOR) leafHex = '#991b1b';

            ctx.fillStyle = shadeHexColor(leafHex, lightFactor * grainMod, wallFireWarmth);
            ctx.fillRect(x0, wallTop + projH * 0.125, sw, projH * 0.85);

            // Overhead Hydraulic Door Closer (도어클로저) & Articulated Arm
            if (wallX >= 0.28 && wallX <= 0.52) {
              ctx.fillStyle = shadeHexColor('#64748b', lightFactor, wallFireWarmth);
              ctx.fillRect(x0, wallTop + projH * 0.095, sw, projH * 0.022);
            }
            if (wallX >= 0.22 && wallX <= 0.42) {
              ctx.fillStyle = shadeHexColor('#94a3b8', lightFactor * 1.05, wallFireWarmth);
              ctx.fillRect(x0, wallTop + projH * 0.13, sw, projH * 0.042);
            }

            // Upper Wired-Glass Vision Window (망입유리 시야창: 0.20 .. 0.46)
            if (wallX >= 0.26 && wallX <= 0.74) {
              const isWinSideBorder = wallX < 0.295 || wallX > 0.705;
              // Top & Bottom Window Molding Trim
              ctx.fillStyle = shadeHexColor('#3b1906', lightFactor, wallFireWarmth);
              ctx.fillRect(x0, wallTop + projH * 0.20, sw, projH * 0.26);

              if (!isWinSideBorder) {
                if (hitTile === TILE.HOT_DOOR) {
                  // Fiery Orange-Red Backdraft Glow Behind Vision Glass
                  const hotPulse = 0.88 + 0.12 * Math.sin(now * 4.5 + wallX * 6);
                  ctx.fillStyle = shadeHexColor('#f97316', lightFactor * 1.22 * hotPulse, 0.35);
                  ctx.fillRect(x0, wallTop + projH * 0.225, sw, projH * 0.21);
                  ctx.fillStyle = shadeHexColor('#fde047', lightFactor * 1.25, 0.25);
                  ctx.fillRect(x0, wallTop + projH * 0.29, sw, projH * 0.09);
                } else {
                  // Dark Architectural Tinted Glass + Diagonal Sky Reflection + Wired Mesh
                  const isReflBand = (wallX > 0.34 && wallX < 0.43) || (wallX > 0.55 && wallX < 0.60);
                  const isWireMesh = Math.abs(((wallX * 18) % 1) - 0.5) < 0.085;
                  const glassHex = isReflBand ? '#38bdf8' : (isWireMesh ? '#475569' : '#0f2942');
                  ctx.fillStyle = shadeHexColor(glassHex, lightFactor * (isReflBand ? 1.05 : 0.94), wallFireWarmth);
                  ctx.fillRect(x0, wallTop + projH * 0.225, sw, projH * 0.21);
                  // Horizontal wire mesh cross-lines inside vision glass
                  if (isWireMesh) {
                    ctx.fillStyle = shadeHexColor('#94a3b8', lightFactor * 0.90, wallFireWarmth);
                    ctx.fillRect(x0, wallTop + projH * 0.275, sw, Math.max(1, projH * 0.008));
                    ctx.fillRect(x0, wallTop + projH * 0.335, sw, Math.max(1, projH * 0.008));
                    ctx.fillRect(x0, wallTop + projH * 0.395, sw, Math.max(1, projH * 0.008));
                  }
                }
              }
            }

            // Lower Recessed Architectural Molding Panel (하단 음각 몰딩 패널: 0.56 .. 0.84)
            if (wallX >= 0.24 && wallX <= 0.76) {
              const isCenterStile = Math.abs(wallX - 0.50) < 0.022;
              if (!isCenterStile) {
                const isLeftBevel = wallX < 0.265 || (wallX > 0.522 && wallX < 0.545);
                const isRightBevel = wallX > 0.735 || (wallX > 0.455 && wallX < 0.478);
                const panelHex = hitTile === TILE.HOT_DOOR ? '#7f1d1d' : (hitTile === TILE.LOCKED_DOOR ? '#784f0d' : '#6b3410');
                const bevelHex = isLeftBevel ? '#291103' : (isRightBevel ? '#b4692e' : panelHex);
                ctx.fillStyle = shadeHexColor(bevelHex, lightFactor * grainMod, wallFireWarmth);
                ctx.fillRect(x0, wallTop + projH * 0.56, sw, projH * 0.28);
                // Top & bottom panel bevel lines
                ctx.fillStyle = shadeHexColor('#291103', lightFactor, wallFireWarmth);
                ctx.fillRect(x0, wallTop + projH * 0.56, sw, projH * 0.015);
                ctx.fillStyle = shadeHexColor('#b4692e', lightFactor, wallFireWarmth);
                ctx.fillRect(x0, wallTop + projH * 0.825, sw, projH * 0.015);
              }
            }

            // Bottom Stainless Steel Kickplate (하단 스텐 킥플레이트) & Aluminum Threshold
            ctx.fillStyle = shadeHexColor('#64748b', lightFactor * 0.98, wallFireWarmth);
            ctx.fillRect(x0, wallTop + projH * 0.89, sw, projH * 0.085);
            ctx.fillStyle = shadeHexColor('#334155', lightFactor, wallFireWarmth);
            ctx.fillRect(x0, wallTop + projH * 0.975, sw, projH * 0.025);

            // Digital Security Lock Keypad for LOCKED_DOOR
            if (hitTile === TILE.LOCKED_DOOR && wallX >= 0.755 && wallX <= 0.835) {
              ctx.fillStyle = shadeHexColor('#0f172a', lightFactor, wallFireWarmth);
              ctx.fillRect(x0, wallTop + projH * 0.37, sw, projH * 0.085);
              ctx.fillStyle = '#ef4444';
              ctx.fillRect(x0, wallTop + projH * 0.385, sw, projH * 0.018);
            }

            // 3D Metallic Lever Handle & Escutcheon Rosette (입체 레버 손잡이)
            if (wallX >= 0.765 && wallX <= 0.828) {
              ctx.fillStyle = shadeHexColor('#334155', lightFactor, wallFireWarmth);
              ctx.fillRect(x0, wallTop + projH * 0.465, sw, projH * 0.105);
            }
            if (wallX >= 0.675 && wallX <= 0.818) {
              ctx.fillStyle = shadeHexColor('#f8fafc', Math.max(0.88, lightFactor * 1.12), wallFireWarmth);
              ctx.fillRect(x0, wallTop + projH * 0.502, sw, projH * 0.028);
              ctx.fillStyle = shadeHexColor('#1e293b', lightFactor, wallFireWarmth);
              ctx.fillRect(x0, wallTop + projH * 0.530, sw, projH * 0.014);
            }
          }
        }
      } else if (hitTile === TILE.EXIT) {
        // High-Realism 3D Fire-Rated Emergency Exit Door with Illuminated EXIT Sign & Panic Push-Bar
        const isWallShoulder = wallX < 0.07 || wallX > 0.93;
        const isFrame = !isWallShoulder && (wallX < 0.135 || wallX > 0.865);
        if (isWallShoulder) {
          ctx.fillStyle = shadeHexColor('#64748b', lightFactor, wallFireWarmth);
          ctx.fillRect(x0, wallTop, sw, projH);
        } else if (isFrame) {
          ctx.fillStyle = shadeHexColor('#064e3b', lightFactor * 1.05, wallFireWarmth);
          ctx.fillRect(x0, wallTop, sw, projH);
        } else {
          // Fire-Rated Emerald Steel Door Leaf
          ctx.fillStyle = shadeHexColor('#047857', lightFactor * 1.10, wallFireWarmth);
          ctx.fillRect(x0, wallTop, sw, projH);

          // Overhead Illuminated Green Emergency Exit Sign Box (0.04 .. 0.15)
          if (wallX >= 0.20 && wallX <= 0.80) {
            ctx.fillStyle = '#ecfdf5';
            ctx.fillRect(x0, wallTop + projH * 0.04, sw, projH * 0.11);
            ctx.fillStyle = '#10b981';
            ctx.fillRect(x0, wallTop + projH * 0.055, sw, projH * 0.08);
          }

          // Upper Wired-Glass Vision Window on Exit Door (0.21 .. 0.43)
          if (wallX >= 0.30 && wallX <= 0.70) {
            const isWinBorder = wallX < 0.33 || wallX > 0.67;
            ctx.fillStyle = isWinBorder ? '#064e3b' : shadeHexColor('#6ee7b7', lightFactor * 1.15, wallFireWarmth);
            ctx.fillRect(x0, wallTop + projH * 0.21, sw, projH * 0.22);
          }

          // Horizontal Stainless Steel Panic Push-Bar (비상문 수평 패닉바: 0.49 .. 0.545)
          if (wallX >= 0.18 && wallX <= 0.82) {
            ctx.fillStyle = shadeHexColor('#e2e8f0', Math.max(0.88, lightFactor * 1.1), wallFireWarmth);
            ctx.fillRect(x0, wallTop + projH * 0.49, sw, projH * 0.048);
            if (wallX >= 0.28 && wallX <= 0.72) {
              ctx.fillStyle = '#ef4444';
              ctx.fillRect(x0, wallTop + projH * 0.502, sw, projH * 0.022);
            }
          }

          // Stainless Steel Kickplate
          ctx.fillStyle = shadeHexColor('#94a3b8', lightFactor, wallFireWarmth);
          ctx.fillRect(x0, wallTop + projH * 0.89, sw, projH * 0.085);
        }
      } else if (hitTile === TILE.ELEVATOR) {
        ctx.fillStyle = shadeHexColor(isEdgeSeam || Math.abs(wallX - 0.5) < 0.025 ? '#0f172a' : '#64748b', lightFactor, wallFireWarmth);
        ctx.fillRect(x0, wallTop, sw, projH);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x0, wallTop + projH * 0.08, sw, projH * 0.07);
      } else if (hitTile === TILE.PARTITION || hitTile === TILE.LIFELINE) {
        const baseHex = hitTile === TILE.LIFELINE ? '#0284c7' : '#ea580c';
        ctx.fillStyle = shadeHexColor(baseHex, lightFactor, wallFireWarmth);
        ctx.fillRect(x0, wallTop, sw, projH);
        if (wallX > 0.15 && wallX < 0.85) {
          ctx.fillStyle = shadeHexColor(hitTile === TILE.LIFELINE ? '#bae6fd' : '#fdba74', lightFactor, wallFireWarmth);
          ctx.fillRect(x0, wallTop + projH * 0.22, sw, projH * 0.52);
        }
      } else {
        // High-Realism 3D Building Interior Wall Architecture (Multi-Band Vertical Lighting + Recessed Fixtures + 3D Handrail + Floor/Ceiling AO)
        const wallFeature = (mapX * 5 + mapY * 13) % 7;
        const isPanelJoint = isEdgeSeam || Math.abs(wallX - 0.5) < 0.012;
        const microTex = 0.985 + 0.015 * Math.cos(wallX * 37.7);
        const upperHex = isPanelJoint ? '#334155' : '#64748b';
        const lowerHex = isEdgeSeam ? '#0f172a' : '#334155';

        // Upper Acoustic Slate Wall (2-Zone Vertical Lighting Gradient + Horizontal Courses)
        ctx.fillStyle = shadeHexColor(upperHex, lightFactor * 0.94 * microTex, wallFireWarmth);
        ctx.fillRect(x0, wallTop, sw, projH * 0.28);
        ctx.fillStyle = shadeHexColor(upperHex, lightFactor * 1.03 * microTex, wallFireWarmth);
        ctx.fillRect(x0, wallTop + projH * 0.28, sw, projH * 0.34);

        ctx.fillStyle = shadeHexColor('#475569', lightFactor * 0.86, wallFireWarmth);
        ctx.fillRect(x0, wallTop + projH * 0.22, sw, Math.max(1.5, projH * 0.011));
        ctx.fillRect(x0, wallTop + projH * 0.42, sw, Math.max(1.5, projH * 0.011));

        // Ceiling Crown Molding & Cove Shadow Strip
        ctx.fillStyle = shadeHexColor('#cbd5e1', lightFactor * 1.04, wallFireWarmth);
        ctx.fillRect(x0, wallTop, sw, projH * 0.042);
        ctx.fillStyle = shadeHexColor('#0f172a', lightFactor * 0.78, wallFireWarmth);
        ctx.fillRect(x0, wallTop + projH * 0.042, sw, projH * 0.018);

        // 3D Recessed Architectural Wall Fixtures (Naturally Spaced Across Building Walls)
        if (wallX > 0.22 && wallX < 0.78) {
          const isFixtureBorder = wallX < 0.25 || wallX > 0.75;
          if (wallFeature === 0) {
            // Framed Safety Evacuation Blueprint Board (피난안내도: Aluminum Frame + Floor Plan Grid + Green Route + Red '현위치' Dot)
            ctx.fillStyle = shadeHexColor(isFixtureBorder ? '#1e293b' : '#0c4a6e', lightFactor, wallFireWarmth);
            ctx.fillRect(x0, wallTop + projH * 0.145, sw, projH * 0.31);
            if (!isFixtureBorder) {
              ctx.fillStyle = shadeHexColor('#059669', lightFactor * 1.05, wallFireWarmth);
              ctx.fillRect(x0, wallTop + projH * 0.16, sw, projH * 0.038);
              ctx.fillStyle = shadeHexColor('#e0f2fe', lightFactor * 0.98, wallFireWarmth);
              ctx.fillRect(x0, wallTop + projH * 0.205, sw, projH * 0.225);
              const isBlueprintGrid = Math.abs(wallX - 0.38) < 0.012 || Math.abs(wallX - 0.52) < 0.012 || Math.abs(wallX - 0.64) < 0.012;
              if (isBlueprintGrid) {
                ctx.fillStyle = shadeHexColor('#0284c7', lightFactor, wallFireWarmth);
                ctx.fillRect(x0, wallTop + projH * 0.22, sw, projH * 0.19);
              } else {
                ctx.fillStyle = shadeHexColor('#38bdf8', lightFactor * 0.85, wallFireWarmth);
                ctx.fillRect(x0, wallTop + projH * 0.25, sw, projH * 0.012);
                ctx.fillRect(x0, wallTop + projH * 0.37, sw, projH * 0.012);
              }
              if (wallX >= 0.30 && wallX <= 0.70) {
                ctx.fillStyle = '#10b981';
                ctx.fillRect(x0, wallTop + projH * 0.31, sw, projH * 0.022);
              }
              if (wallX >= 0.32 && wallX <= 0.36) {
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(x0, wallTop + projH * 0.298, sw, projH * 0.044);
              }
            }
            if (wallX > 0.46 && wallX < 0.54 && perpDist < 5.2) {
              const fKey = `${mapX},${mapY},${side}`;
              if (!visibleWallFixtures.has(fKey)) {
                visibleWallFixtures.set(fKey, { x: x0, y: wallTop + projH * 0.30, depth: perpDist, label: '🗺️ 피난안내도(614)' });
              }
            }
          } else if (wallFeature === 1) {
            // Exterior / Corridor Night Window with Aluminum Mullion, Venetian Blind Slats & Glass Reflection
            const isMullion = isFixtureBorder || Math.abs(wallX - 0.50) < 0.02;
            ctx.fillStyle = shadeHexColor(isMullion ? '#1e293b' : '#0f172a', lightFactor, wallFireWarmth);
            ctx.fillRect(x0, wallTop + projH * 0.14, sw, projH * 0.32);
            if (!isMullion) {
              const isRefl = (wallX > 0.31 && wallX < 0.39) || (wallX > 0.56 && wallX < 0.63);
              ctx.fillStyle = shadeHexColor(isRefl ? '#38bdf8' : '#1e3a8a', lightFactor * (isRefl ? 0.95 : 0.85), wallFireWarmth);
              ctx.fillRect(x0, wallTop + projH * 0.155, sw, projH * 0.29);
              ctx.fillStyle = shadeHexColor('#cbd5e1', lightFactor * 0.92, wallFireWarmth);
              ctx.fillRect(x0, wallTop + projH * 0.155, sw, projH * 0.014);
              ctx.fillRect(x0, wallTop + projH * 0.178, sw, projH * 0.014);
              ctx.fillRect(x0, wallTop + projH * 0.201, sw, projH * 0.014);
              ctx.fillStyle = shadeHexColor('#334155', lightFactor, wallFireWarmth);
              ctx.fillRect(x0, wallTop + projH * 0.295, sw, projH * 0.018);
            }
          } else if (wallFeature === 2) {
            // Recessed 2-Tier Wall Archive Bookshelf (매뉴얼서가: Walnut Frame, 2 Wooden Planks, Varied Book Heights & Spine Labels)
            ctx.fillStyle = shadeHexColor(isFixtureBorder ? '#451a03' : '#1c0d06', lightFactor, wallFireWarmth);
            ctx.fillRect(x0, wallTop + projH * 0.14, sw, projH * 0.34);
            if (!isFixtureBorder) {
              const slotIdx = Math.floor((wallX - 0.25) * 24);
              const inSlot = ((wallX - 0.25) * 24) % 1;
              const isBookGap = inSlot < 0.14;
              if (!isBookGap) {
                const bookPalette = ['#dc2626', '#2563eb', '#059669', '#d97706', '#7c3aed', '#0891b2'];
                const topHex = bookPalette[Math.abs(slotIdx) % bookPalette.length];
                const botHex = bookPalette[Math.abs(slotIdx + 3) % bookPalette.length];
                const topHMod = (slotIdx % 3) * 0.012;
                const botHMod = ((slotIdx + 1) % 3) * 0.012;

                ctx.fillStyle = shadeHexColor(topHex, lightFactor, wallFireWarmth);
                ctx.fillRect(x0, wallTop + projH * (0.175 + topHMod), sw, projH * (0.11 - topHMod));
                ctx.fillStyle = shadeHexColor('#f8fafc', lightFactor * 0.95, wallFireWarmth);
                ctx.fillRect(x0, wallTop + projH * 0.245, sw, projH * 0.018);

                ctx.fillStyle = shadeHexColor(botHex, lightFactor, wallFireWarmth);
                ctx.fillRect(x0, wallTop + projH * (0.325 + botHMod), sw, projH * (0.115 - botHMod));
                ctx.fillStyle = shadeHexColor('#fde047', lightFactor * 0.95, wallFireWarmth);
                ctx.fillRect(x0, wallTop + projH * 0.402, sw, projH * 0.018);
              }
              ctx.fillStyle = shadeHexColor('#78350f', lightFactor * 1.05, wallFireWarmth);
              ctx.fillRect(x0, wallTop + projH * 0.285, sw, projH * 0.022);
              ctx.fillRect(x0, wallTop + projH * 0.440, sw, projH * 0.024);
            }
            if (wallX > 0.46 && wallX < 0.54 && perpDist < 5.0) {
              const fKey = `${mapX},${mapY},${side}`;
              if (!visibleWallFixtures.has(fKey)) {
                visibleWallFixtures.set(fKey, { x: x0, y: wallTop + projH * 0.31, depth: perpDist, label: '📚 매뉴얼서가(425.12)' });
              }
            }
          } else if (wallFeature === 3) {
            // Recessed Indoor Fire Hydrant Cabinet (옥내소화전함: Steel Cabinet Door + Red Transmitter Lamp + Hose Reel Window)
            const isDoorSeam = Math.abs(wallX - 0.28) < 0.01 || Math.abs(wallX - 0.72) < 0.01;
            ctx.fillStyle = shadeHexColor(isFixtureBorder ? '#334155' : (isDoorSeam ? '#64748b' : '#cbd5e1'), lightFactor * 0.96, wallFireWarmth);
            ctx.fillRect(x0, wallTop + projH * 0.14, sw, projH * 0.34);
            if (wallX > 0.45 && wallX < 0.55) {
              ctx.fillStyle = '#ef4444';
              ctx.fillRect(x0, wallTop + projH * 0.158, sw, projH * 0.045);
              if (wallX > 0.48 && wallX < 0.52) {
                ctx.fillStyle = '#fef08a';
                ctx.fillRect(x0, wallTop + projH * 0.168, sw, projH * 0.024);
              }
            }
            if (wallX > 0.33 && wallX < 0.67) {
              ctx.fillStyle = shadeHexColor('#b91c1c', lightFactor, wallFireWarmth);
              ctx.fillRect(x0, wallTop + projH * 0.23, sw, projH * 0.18);
              if (wallX > 0.38 && wallX < 0.62) {
                ctx.fillStyle = shadeHexColor('#f8fafc', lightFactor * 0.9, wallFireWarmth);
                ctx.fillRect(x0, wallTop + projH * 0.26, sw, projH * 0.03);
                ctx.fillStyle = shadeHexColor('#7f1d1d', lightFactor, wallFireWarmth);
                ctx.fillRect(x0, wallTop + projH * 0.31, sw, projH * 0.07);
              }
            }
            if (wallX > 0.68 && wallX < 0.705) {
              ctx.fillStyle = shadeHexColor('#475569', lightFactor, wallFireWarmth);
              ctx.fillRect(x0, wallTop + projH * 0.30, sw, projH * 0.06);
            }
            if (wallX > 0.46 && wallX < 0.54 && perpDist < 4.8) {
              const fKey = `${mapX},${mapY},${side}`;
              if (!visibleWallFixtures.has(fKey)) {
                visibleWallFixtures.set(fKey, { x: x0, y: wallTop + projH * 0.32, depth: perpDist, label: '🚒 옥내소화전함' });
              }
            }
          } else if (wallFeature === 4 && wallX > 0.38 && wallX < 0.62) {
            // Architectural Emergency Wall Sconce Light & Up/Down Light Cone
            const sconceGlow = 1 - Math.abs(wallX - 0.5) / 0.12;
            ctx.fillStyle = `rgba(254, 240, 138, ${0.18 * sconceGlow})`;
            ctx.fillRect(x0, wallTop + projH * 0.08, sw, projH * 0.34);
            ctx.fillStyle = shadeHexColor('#1e293b', lightFactor, wallFireWarmth);
            ctx.fillRect(x0, wallTop + projH * 0.21, sw, projH * 0.09);
            if (wallX > 0.41 && wallX < 0.59) {
              ctx.fillStyle = powerRestored ? '#fef08a' : '#38bdf8';
              ctx.fillRect(x0, wallTop + projH * 0.225, sw, projH * 0.055);
            }
          }
        }

        // 3D Brushed Steel Corridor Handrail on Plain Architectural Wall Segments
        if (wallFeature >= 4 && wallX > 0.08 && wallX < 0.92) {
          ctx.fillStyle = shadeHexColor('#cbd5e1', lightFactor * 1.08, wallFireWarmth);
          ctx.fillRect(x0, wallTop + projH * 0.535, sw, projH * 0.022);
          ctx.fillStyle = shadeHexColor('#0f172a', lightFactor * 0.72, wallFireWarmth);
          ctx.fillRect(x0, wallTop + projH * 0.557, sw, projH * 0.012);
        }

        // Lower Wainscoting Wall
        ctx.fillStyle = shadeHexColor(lowerHex, lightFactor * microTex, wallFireWarmth);
        ctx.fillRect(x0, wallTop + projH * 0.62, sw, projH * 0.38);

        if (wallX > 0.16 && wallX < 0.84) {
          ctx.fillStyle = shadeHexColor('#1e293b', lightFactor * 0.92, wallFireWarmth);
          ctx.fillRect(x0, wallTop + projH * 0.68, sw, projH * 0.20);
          ctx.fillStyle = shadeHexColor('#0f172a', lightFactor * 0.80, wallFireWarmth);
          ctx.fillRect(x0, wallTop + projH * 0.68, sw, projH * 0.014);
        }

        // Photoluminescent Green Emergency Wall Guide Ribbon & Golden Trim
        ctx.fillStyle = shadeHexColor('#10b981', Math.max(0.78, lightFactor));
        ctx.fillRect(x0, wallTop + projH * 0.59, sw, projH * 0.035);
        ctx.fillStyle = shadeHexColor('#fde047', Math.max(0.78, lightFactor));
        ctx.fillRect(x0, wallTop + projH * 0.58, sw, projH * 0.012);

        // Dark Architectural Floor Baseboard
        ctx.fillStyle = shadeHexColor('#0f172a', lightFactor * 0.85, wallFireWarmth * 0.5);
        ctx.fillRect(x0, wallBottom - projH * 0.065, sw, projH * 0.065);
      }

      // Universal Ceiling Cove Ambient Occlusion & Floor Baseboard Contact Shadow + Floor Gloss Reflection
      ctx.fillStyle = 'rgba(2, 6, 23, 0.34)';
      ctx.fillRect(x0, wallTop, sw, Math.max(2, projH * 0.024));
      ctx.fillStyle = 'rgba(2, 6, 23, 0.44)';
      ctx.fillRect(x0, wallBottom - Math.max(1.5, projH * 0.018), sw, Math.max(2.5, projH * 0.036));
      if (perpDist < 6.5 && wallBottom < height) {
        ctx.fillStyle = wallFireWarmth > 0.12
          ? `rgba(251, 146, 60, ${Math.min(0.18, wallFireWarmth * 0.25)})`
          : 'rgba(148, 163, 184, 0.05)';
        ctx.fillRect(x0, wallBottom, sw, Math.min(height - wallBottom, projH * 0.07));
      }
    }

    // Draw Crisp Badges on Visible Escape-Room Wall Fixtures (Blueprints, Archive Bookshelves & Fire Hydrants)
    for (const wf of visibleWallFixtures.values()) {
      ctx.save();
      ctx.font = `bold ${Math.max(10, Math.min(13, Math.floor(18 / wf.depth)))}px "Noto Sans KR", sans-serif`;
      const tw = ctx.measureText(wf.label).width + 12;
      const clampedWfX = Math.max(tw * 0.5 + 8, Math.min(width - tw * 0.5 - 8, wf.x));
      if (Math.abs(clampedWfX - wf.x) > 45) {
        ctx.restore();
        continue;
      }
      ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.1;
      ctx.fillRect(clampedWfX - tw * 0.5, wf.y - 9, tw, 18);
      ctx.strokeRect(clampedWfX - tw * 0.5, wf.y - 9, tw, 18);
      ctx.fillStyle = '#e0f2fe';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(wf.label, clampedWfX, wf.y);
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
      // Do not draw boxes behind/intersecting camera lens (< 0.36m), far away (> 8.5m), or outside horizontal FOV
      if (centerCam.depth <= 0.36 || centerCam.depth > 8.5) return;
      if (Math.abs(centerCam.right) > (centerCam.depth + 0.85) * tanHalfFov + 0.65) return;

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
      if (startRay > endRay) return;

      // Merge contiguous visible Z-buffer columns into spans; skip ctx.clip() entirely if 100% unoccluded!
      const totalCols = endRay - startRay + 1;
      let visibleCols = 0;
      const spans = [];
      let spanStart = -1;
      for (let rIdx = startRay; rIdx <= endRay; rIdx++) {
        if (centerCam.depth < zBuffer[rIdx] + 0.20) {
          visibleCols++;
          if (spanStart === -1) spanStart = rIdx;
        } else if (spanStart !== -1) {
          spans.push([spanStart, rIdx - 1]);
          spanStart = -1;
        }
      }
      if (spanStart !== -1) {
        spans.push([spanStart, endRay]);
      }
      if (visibleCols === 0) return;

      const needsClip = visibleCols < totalCols;
      if (needsClip) {
        ctx.save();
        ctx.beginPath();
        for (let s = 0; s < spans.length; s++) {
          const rx0 = Math.floor((spans[s][0] * width) / numRays);
          const rx1 = Math.ceil(((spans[s][1] + 1) * width) / numRays);
          ctx.rect(rx0, 0, Math.max(1, rx1 - rx0), height);
        }
        ctx.clip();
      }

      // Ground Contact Ambient Occlusion Shadow Beneath 3D Furniture & Escape-Room Stations
      if (wz0 <= 0.04 && centerCam.depth < 6.0) {
        const aoPoly = projectClipped3DPolygon(
          [
            [wx0 - 0.05, wy0 - 0.05, 0.004],
            [wx1 + 0.05, wy0 - 0.05, 0.004],
            [wx1 + 0.05, wy1 + 0.05, 0.004],
            [wx0 - 0.05, wy1 + 0.05, 0.004]
          ],
          0.26
        );
        if (aoPoly) {
          ctx.fillStyle = 'rgba(2, 6, 23, 0.36)';
          ctx.beginPath();
          ctx.moveTo(aoPoly[0].x, aoPoly[0].y);
          for (let k = 1; k < aoPoly.length; k++) ctx.lineTo(aoPoly[k].x, aoPoly[k].y);
          ctx.closePath();
          ctx.fill();
        }
      }

      const boxFireWarmth = getFireLightAt(cx, cy);
      const distFactor = Math.max(0.45, Math.min(1.18, (1.08 + boxFireWarmth * 0.22) / (1 + centerCam.depth * 0.12)));
      for (const pf of projectedFaces) {
        ctx.fillStyle = pf.col.startsWith('#') ? shadeHexColor(pf.col, distFactor, boxFireWarmth) : pf.col;
        ctx.beginPath();
        ctx.moveTo(pf.poly[0].x, pf.poly[0].y);
        for (let k = 1; k < pf.poly.length; k++) ctx.lineTo(pf.poly[k].x, pf.poly[k].y);
        ctx.closePath();
        ctx.fill();
        if (strokeCol && centerCam.depth < 6.0) {
          ctx.strokeStyle = strokeCol;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      if (needsClip) {
        ctx.restore();
      }
    }

    // Collect all 3D room objects, open doors, items, fires, smokes, and door labels with FOV frustum culling
    const objects3D = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = grid[r][c];
        if (t === TILE.FLOOR || t === TILE.WALL) continue;
        const cp = toCamSpace(c + 0.5, r + 0.5, 0.25);
        if (cp.depth <= 0.15 || cp.depth > 8.5) continue;
        if (Math.abs(cp.right) > (cp.depth + 0.85) * tanHalfFov + 0.65) continue;
        objects3D.push({ kind: 'tileObj', r, c, t, depth: cp.depth });
      }
    }

    for (const it of items) {
      const cp = toCamSpace(it.c + 0.5, it.r + 0.5, 0.20);
      if (cp.depth > 0.15 && cp.depth <= 8.5 && Math.abs(cp.right) <= (cp.depth + 0.8) * tanHalfFov + 0.6) {
        objects3D.push({ kind: 'item', it, depth: cp.depth });
      }
    }

    for (const f of fires) {
      const cp = toCamSpace(f.c + 0.5, f.r + 0.5, 0.25);
      if (cp.depth > 0.15 && cp.depth <= 8.5 && Math.abs(cp.right) <= (cp.depth + 0.8) * tanHalfFov + 0.6) {
        objects3D.push({ kind: 'fire', f, depth: cp.depth });
      }
    }

    for (const s of smokes) {
      const cp = toCamSpace(s.c + 0.5, s.r + 0.5, 0.75);
      if (cp.depth > 0.15 && cp.depth <= 7.5 && Math.abs(cp.right) <= (cp.depth + 0.8) * tanHalfFov + 0.6) {
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
          // 3D Porcelain Washbasin Vanity + Recessed Water Basin + Chrome Faucet + Mirror Backsplash
          draw3DPerspectiveBox(c + 0.14, r + 0.18, c + 0.86, r + 0.84, 0, 0.36, '#f1f5f9', '#0284c7', '#0369a1', '#7dd3fc');
          draw3DPerspectiveBox(c + 0.24, r + 0.28, c + 0.76, r + 0.74, 0.36, 0.42, '#38bdf8', '#0284c7', '#0369a1', '#ffffff');
          draw3DPerspectiveBox(c + 0.45, r + 0.20, c + 0.55, r + 0.32, 0.42, 0.52, '#f8fafc', '#cbd5e1', '#94a3b8', '#ffffff');
          draw3DPerspectiveBox(c + 0.22, r + 0.14, c + 0.78, r + 0.20, 0.44, 0.80, '#bae6fd', '#38bdf8', '#0284c7', '#e0f2fe');
          const sp = project3DPoint(c + 0.5, r + 0.5, 0.58);
          if (sp && isPointVisibleInZBuffer(sp.x, sp.depth - 0.15)) {
            ctx.font = `bold ${Math.max(11, Math.min(20, Math.floor(26 / sp.depth)))}px "Noto Sans KR", sans-serif`;
            ctx.fillStyle = '#bae6fd';
            ctx.textAlign = 'center';
            ctx.fillText('🚰세면대(수건적시기)', sp.x, sp.y);
          }
        } else if (t === TILE.OPEN_DOOR) {
          // Wall-Orientation-Aware 3D Open Doorway (Jambs hug actual wall edges; 90°-swung door leaf rests flat against side wall; center 100% open!)
          const distToCam = Math.hypot(c + 0.5 - camWorldX, r + 0.5 - camWorldY);
          const vertWall = isVerticalWallDoor(c, r);
          if (distToCam > 0.48) {
            if (vertWall) {
              draw3DPerspectiveBox(c + 0.36, r + 0.08, c + 0.64, r + 0.92, 0.0, 0.018, '#94a3b8', '#64748b', '#475569', '#cbd5e1');
              draw3DPerspectiveBox(c + 0.35, r + 0.00, c + 0.65, r + 0.08, 0.0, 0.90, '#3f2305', '#5c2808', '#291507', '#92400e');
              draw3DPerspectiveBox(c + 0.35, r + 0.92, c + 0.65, r + 1.00, 0.0, 0.90, '#3f2305', '#5c2808', '#291507', '#92400e');
              draw3DPerspectiveBox(c + 0.35, r + 0.00, c + 0.65, r + 1.00, 0.88, 1.00, '#3f2305', '#5c2808', '#291507', '#92400e');
              draw3DPerspectiveBox(c + 0.56, r + 0.06, c + 0.95, r + 0.11, 0.02, 0.86, '#92400e', '#8c4a19', '#5c2808', '#d97706');
              draw3DPerspectiveBox(c + 0.64, r + 0.055, c + 0.86, r + 0.115, 0.50, 0.76, '#38bdf8', '#0284c7', '#0369a1', '#bae6fd');
            } else {
              draw3DPerspectiveBox(c + 0.08, r + 0.36, c + 0.92, r + 0.64, 0.0, 0.018, '#94a3b8', '#64748b', '#475569', '#cbd5e1');
              draw3DPerspectiveBox(c + 0.00, r + 0.35, c + 0.08, r + 0.65, 0.0, 0.90, '#3f2305', '#5c2808', '#291507', '#92400e');
              draw3DPerspectiveBox(c + 0.92, r + 0.35, c + 1.00, r + 0.65, 0.0, 0.90, '#3f2305', '#5c2808', '#291507', '#92400e');
              draw3DPerspectiveBox(c + 0.00, r + 0.35, c + 1.00, r + 0.65, 0.88, 1.00, '#3f2305', '#5c2808', '#291507', '#92400e');
              draw3DPerspectiveBox(c + 0.06, r + 0.56, c + 0.11, r + 0.95, 0.02, 0.86, '#92400e', '#8c4a19', '#5c2808', '#d97706');
              draw3DPerspectiveBox(c + 0.055, r + 0.64, c + 0.115, r + 0.86, 0.50, 0.76, '#38bdf8', '#0284c7', '#0369a1', '#bae6fd');
            }
          }
          const dp = project3DPoint(c + 0.5, r + 0.5, 0.84);
          if (dp && dp.depth > 0.7 && dp.depth < 5.2 && isPointVisibleInZBuffer(dp.x, dp.depth - 0.1)) {
            ctx.font = `bold ${Math.max(10, Math.min(15, Math.floor(20 / dp.depth)))}px "Noto Sans KR", sans-serif`;
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
          if (t === TILE.GAS_VALVE) {
            draw3DPerspectiveBox(c + 0.26, r + 0.26, c + 0.74, r + 0.74, 0, 0.38, '#eab308', '#ca8a04', '#854d0e', '#fef08a');
            const vCol = player.gasClosed ? '#10b981' : '#ef4444';
            draw3DPerspectiveBox(c + 0.34, r + 0.34, c + 0.66, r + 0.66, 0.38, 0.50, vCol, vCol, '#0f172a', '#ffffff');
          } else if (t === TILE.BREAKER) {
            draw3DPerspectiveBox(c + 0.22, r + 0.24, c + 0.78, r + 0.76, 0, 0.52, '#475569', '#334155', '#1e293b', '#94a3b8');
            const bCol = player.breakerClosed ? '#10b981' : '#3b82f6';
            draw3DPerspectiveBox(c + 0.32, r + 0.32, c + 0.68, r + 0.68, 0.52, 0.58, bCol, '#1e293b', '#0f172a', '#7dd3fc');
          } else if (t === TILE.ALARM_BELL) {
            draw3DPerspectiveBox(c + 0.28, r + 0.28, c + 0.72, r + 0.72, 0, 0.44, '#dc2626', '#b91c1c', '#7f1d1d', '#fca5a5');
            draw3DPerspectiveBox(c + 0.36, r + 0.36, c + 0.64, r + 0.64, 0.44, 0.56, '#fde047', '#eab308', '#a16207', '#ffffff');
          } else if (t === TILE.PHONE_119) {
            draw3DPerspectiveBox(c + 0.26, r + 0.26, c + 0.74, r + 0.74, 0, 0.46, '#ef4444', '#dc2626', '#991b1b', '#fecaca');
            draw3DPerspectiveBox(c + 0.34, r + 0.34, c + 0.66, r + 0.66, 0.46, 0.54, '#f8fafc', '#cbd5e1', '#64748b', '#38bdf8');
          } else {
            draw3DPerspectiveBox(c + 0.22, r + 0.22, c + 0.78, r + 0.78, 0, 0.42, '#f97316', '#c2410c', '#7c2d12', '#fdba74');
          }
          const fp = project3DPoint(c + 0.5, r + 0.5, 0.62);
          if (fp && isPointVisibleInZBuffer(fp.x, fp.depth - 0.15)) {
            const label = t === TILE.GAS_VALVE ? (player.gasClosed ? '✅가스밸브(차단됨)' : '🔴가스밸브(잠그기)')
              : t === TILE.BREAKER ? (player.breakerClosed ? '✅배전판(복구완료)' : '⚡배전판(전원·배선)')
              : t === TILE.ALARM_BELL ? '🔔비상벨(작동)'
              : t === TILE.PHONE_119 ? '📞119비상전화'
              : '⚠️화재위험요소';
            ctx.font = `bold ${Math.max(11, Math.min(19, Math.floor(26 / fp.depth)))}px "Noto Sans KR", sans-serif`;
            ctx.fillStyle = '#fef047';
            ctx.textAlign = 'center';
            ctx.fillText(label, fp.x, fp.y);
          }
        } else if (t === TILE.DOOR || t === TILE.LOCKED_DOOR || t === TILE.HOT_DOOR || t === TILE.EXIT) {
          const wp = project3DPoint(c + 0.5, r + 0.5, 0.66);
          if (wp && wp.depth < 6.5 && isPointVisibleInZBuffer(wp.x, wp.depth - 0.45)) {
            const badgeText = t === TILE.EXIT ? '🏃 EXIT 비상구'
              : t === TILE.LOCKED_DOOR ? '🔒 잠긴문 (열쇠/금고614)'
              : t === TILE.HOT_DOOR ? '🌡️🔥 고온 위험문 (열지마세요!)'
              : '🚪 방문 (행동키로 열기)';
            ctx.save();
            ctx.font = `bold ${Math.max(10, Math.min(16, Math.floor(22 / wp.depth)))}px "Noto Sans KR", sans-serif`;
            const tw = ctx.measureText(badgeText).width + 12;
            const th = Math.max(17, Math.min(24, Math.floor(28 / wp.depth)));
            ctx.fillStyle = t === TILE.EXIT ? 'rgba(5, 150, 105, 0.90)' : 'rgba(15, 23, 42, 0.84)';
            ctx.strokeStyle = t === TILE.EXIT ? '#6ee7b7' : '#fbbf24';
            ctx.lineWidth = 1.4;
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
        const glowPad = projectClipped3DPolygon(
          [[it.c + 0.22, it.r + 0.22, 0.008], [it.c + 0.78, it.r + 0.22, 0.008], [it.c + 0.78, it.r + 0.78, 0.008], [it.c + 0.22, it.r + 0.78, 0.008]],
          0.18
        );
        if (glowPad) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
          ctx.strokeStyle = 'rgba(125, 211, 252, 0.65)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(glowPad[0].x, glowPad[0].y);
          for (let k = 1; k < glowPad.length; k++) ctx.lineTo(glowPad[k].x, glowPad[k].y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        draw3DPerspectiveBox(it.c + 0.32, it.r + 0.32, it.c + 0.68, it.r + 0.68, 0, 0.08, '#1e293b', '#0f172a', '#020617', '#38bdf8');
        const ip = project3DPoint(it.c + 0.5, it.r + 0.5, 0.22 + Math.sin(now * 3.5) * 0.035);
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
        const emberPoly = projectClipped3DPolygon(
          [
            [f.c + 0.16, f.r + 0.16, 0.008],
            [f.c + 0.84, f.r + 0.16, 0.008],
            [f.c + 0.84, f.r + 0.84, 0.008],
            [f.c + 0.16, f.r + 0.84, 0.008]
          ],
          0.18
        );
        if (emberPoly) {
          ctx.fillStyle = f.fireType === 'electric' ? 'rgba(59, 130, 246, 0.36)' : 'rgba(249, 115, 22, 0.38)';
          ctx.beginPath();
          ctx.moveTo(emberPoly[0].x, emberPoly[0].y);
          for (let k = 1; k < emberPoly.length; k++) ctx.lineTo(emberPoly[k].x, emberPoly[k].y);
          ctx.closePath();
          ctx.fill();
        }
        const fp = project3DPoint(f.c + 0.5, f.r + 0.5, 0.12);
        if (fp && isPointVisibleInZBuffer(fp.x, fp.depth - 0.14)) {
          const frad = Math.max(16, Math.min(54, 62 / fp.depth));
          drawRealisticVolumetricFire(ctx, fp.x, fp.y, frad * 0.82, now, f.phase || 0, f.fireType || 'normal');
        }
      } else if (obj.kind === 'smoke') {
        const { s } = obj;
        const sp = project3DPoint(s.c + 0.5, s.r + 0.5, 0.78);
        if (sp && isPointVisibleInZBuffer(sp.x, sp.depth - 0.1)) {
          const srad = Math.max(18, Math.min(58, 68 / sp.depth));
          const pAng = now * 1.4 + (s.phase || 0);
          const ox = Math.cos(pAng) * srad * 0.18;
          const oy = Math.sin(pAng * 0.8) * srad * 0.12;
          ctx.fillStyle = 'rgba(51, 65, 85, 0.34)';
          ctx.beginPath();
          ctx.arc(sp.x + ox, sp.y + oy, srad, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(30, 41, 59, 0.42)';
          ctx.beginPath();
          ctx.arc(sp.x - ox * 0.6, sp.y - oy * 0.5, srad * 0.66, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 4A-2. 3D Perspective Extinguisher Foam & Water Spray Particles in 1st-Person 3D View
    if (particles && particles.length > 0) {
      for (const p of particles) {
        const lifeRatio = Math.max(0, Math.min(1, p.life / (p.maxLife || 0.5)));
        const pz = 0.24 + (1 - lifeRatio) * 0.16;
        const pp = project3DPoint(p.x, p.y, pz, 0.12);
        if (pp && isPointVisibleInZBuffer(pp.x, pp.depth - 0.08)) {
          const prad = Math.max(4, Math.min(34, (p.size * 7.2) / pp.depth));
          const isWater = p.color === '#60a5fa';
          ctx.fillStyle = isWater ? `rgba(96, 165, 250, ${lifeRatio * 0.75})` : `rgba(224, 242, 254, ${lifeRatio * 0.78})`;
          ctx.beginPath();
          ctx.arc(pp.x, pp.y, prad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 4B. Realistic Upper-Ceiling Toxic Smoke Accumulation Layer & Fresh-Air Floor Zone (Smoothly responds to crouchVisualLerp via Shift!)
    if (smokes && smokes.length > 0) {
      const smokeHazeRatio = 0.80 - crouchVisualLerp * 0.42;
      const smokeHazeH = horizon * smokeHazeRatio;
      const topAlpha = 0.66 - crouchVisualLerp * 0.30;
      const midAlpha = 0.32 - crouchVisualLerp * 0.18;
      const hazeGrad = ctx.createLinearGradient(0, 0, 0, smokeHazeH);
      hazeGrad.addColorStop(0, `rgba(15, 23, 42, ${topAlpha.toFixed(2)})`);
      hazeGrad.addColorStop(0.62, `rgba(51, 65, 85, ${midAlpha.toFixed(2)})`);
      hazeGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = hazeGrad;
      ctx.fillRect(0, 0, width, smokeHazeH);

      // When crouching (Shift), highlight the clear 30~60cm fresh air floor zone!
      if (crouchVisualLerp > 0.25) {
        ctx.save();
        const freshAlpha = Math.min(1, crouchVisualLerp) * 0.16;
        const freshGrad = ctx.createLinearGradient(0, height - 90, 0, height);
        freshGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
        freshGrad.addColorStop(1, `rgba(16, 185, 129, ${freshAlpha.toFixed(3)})`);
        ctx.fillStyle = freshGrad;
        ctx.fillRect(0, height - 90, width, 90);
        ctx.restore();
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
          action: d <= 1.85 ? '✋ 반응하기(Space): 즉시 획득/구출' : '더 가까이 이동하세요'
        };
        break;
      }
      const tt = grid[tr][tc];
      if (tt !== TILE.FLOOR && tt !== TILE.OPEN_DOOR) {
        if (tt === TILE.WALL) break;
        const tNames = {
          [TILE.DOOR]: ['🚪 일반 방문', '✋ 반응하기(Space): 문 열기'],
          [TILE.LOCKED_DOOR]: ['🔒 잠긴 방문', player.keys > 0 ? '🔑 반응하기(Space): 열쇠로 즉시 개방!' : '🔐 금고(614) 또는 열쇠(🔑) 필요'],
          [TILE.HOT_DOOR]: ['🌡️🔥 고온 위험문', '✋ 반응하기(Space): 손등 온도 확인 (열지마세요!)'],
          [TILE.SINK]: ['🚰 욕실 세면대', player.hasTowel && !player.wetTowel ? '✋ 반응하기(Space): 수건 물에 적시기' : '💧 반응하기(Space): 산소회복·물보충'],
          [TILE.GAS_VALVE]: ['🔴 주방 가스밸브', player.gasClosed ? '✅ 이미 안전하게 잠김' : '✋ 반응하기(Space): 가스밸브 잠그기'],
          [TILE.BREAKER]: ['⚡ 비상 배전판', player.breakerClosed ? '✅ 배선·전원 복구 완료' : '✋ 반응하기(Space): 차단기 작동 / 배선 퍼즐'],
          [TILE.DEBRIS]: ['🪵 목재 장애물', player.hasAxe ? '🪓 반응하기(Space): 소방도끼로 즉시 돌파!' : '🪓 소방도끼 필요 (서가 정렬 퍼즐/탐색)'],
          [TILE.EXIT]: ['🏃 비상구(EXIT)', '✋ 모든 목표 달성 후 최종 탈출!'],
          [TILE.FURNITURE]: ['🔐 단서 서가 · 비상 금고', '✋ 반응하기(Space): 금고·서가 단서 조사'],
          [TILE.ALARM_BELL]: ['🔔 화재 비상벨', '✋ 반응하기(Space): 비상 경보 울리기'],
          [TILE.PHONE_119]: ['📞 119 비상전화', '✋ 반응하기(Space): 119 화재 신고']
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
      const clampedHudX = Math.max(tw * 0.5 + 8, Math.min(width - tw * 0.5 - 8, halfW));
      ctx.fillStyle = 'rgba(2, 6, 23, 0.90)';
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.5;
      ctx.fillRect(clampedHudX - tw * 0.5, hudY - 12, tw, 24);
      ctx.strokeRect(clampedHudX - tw * 0.5, hudY - 12, tw, 24);
      ctx.fillStyle = '#ecfeff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hudText, clampedHudX, hudY);
    }
    ctx.restore();

    // 5B. Floating 3D Objective Beacon in 1st-Person 3D View (Clamped by exact half-badge width so it NEVER clips!)
    if (nextObj && !player.onFire) {
      const op = project3DPoint(nextObj.c + 0.5, nextObj.r + 0.5, 0.68);
      if (op && op.depth < 12) {
        ctx.save();
        ctx.font = 'bold 11.5px "Noto Sans KR", sans-serif';
        const rawLabel = nextObj.label || '🎯 목표 지점';
        const label = `${rawLabel.startsWith('🎯') ? rawLabel : '🎯 ' + rawLabel} (${op.depth.toFixed(1)}m)`;
        const bw = ctx.measureText(label).width + 16;
        const halfBW = bw * 0.5 + 8;
        const clampedX = Math.max(halfBW, Math.min(width - halfBW, op.x));
        const clampedY = Math.max(46, Math.min(height - 110, op.y));
        ctx.fillStyle = '#facc15';
        ctx.fillRect(clampedX - bw * 0.5, clampedY - 12, bw, 24);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(clampedX - bw * 0.5, clampedY - 12, bw, 24);
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, clampedX, clampedY);
        ctx.restore();
      }
    }

    // 6. Volumetric Flashlight Beam Cone + Compact Ground-Locked 3D Runner Avatar Holding Active Equipment
    if (flashlightSpotEnabled && player.hasFlashlight) {
      ctx.save();
      const beamGrad = ctx.createRadialGradient(halfW, horizon, 10, halfW, horizon, width * 0.36);
      beamGrad.addColorStop(0, 'rgba(254, 249, 195, 0.16)');
      beamGrad.addColorStop(0.6, 'rgba(253, 224, 71, 0.06)');
      beamGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

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

    // Improvement #4 & #5: Draw 3-Second Pending Floor Hazards & 3D Top Compass Bar in FPS_3D
    const Tac3D = window.FireEscape && window.FireEscape.Tactical3D;
    if (Tac3D) {
      if (pendingHazards && pendingHazards.length > 0 && typeof Tac3D.drawPendingHazardsFPS === 'function') {
        Tac3D.drawPendingHazardsFPS(ctx, pendingHazards, projectClipped3DPolygon, project3DPoint, isPointVisibleInZBuffer, now);
      }
      if (typeof Tac3D.draw3DCompassBar === 'function') {
        Tac3D.draw3DCompassBar(ctx, width, height, { player, fpsCamYaw, nextObj });
      }
    }

    // 7. Top-Right 3D Radar Minimap & Bottom-Left Status Pill
    draw3DRadarMinimapOverlay(ctx, width, height, nextObj);
  }

  // --- Offscreen Static Floor Cache for DIORAMA_3D ---
  let dioramaFloorCacheCanvas = null;
  let dioramaFloorCacheKey = '';

  function getDioramaFloorCache(tileSize) {
    const stageKey = activeCustomStage ? 'custom' : String(currentStageIdx);
    // Include door/debris state hash so wall AO stays accurate
    let gridSig = '';
    for (let r = 0; r < ROWS; r++) {
      gridSig += grid[r].join('') + '|';
    }
    const key = `${stageKey}_${tileSize}_${gridSig}`;
    const boardW = COLS * tileSize;
    const boardH = ROWS * tileSize;
    if (dioramaFloorCacheCanvas && dioramaFloorCacheKey === key && dioramaFloorCacheCanvas.width === boardW && dioramaFloorCacheCanvas.height === boardH) {
      return dioramaFloorCacheCanvas;
    }
    if (!dioramaFloorCacheCanvas) {
      dioramaFloorCacheCanvas = document.createElement('canvas');
    }
    dioramaFloorCacheCanvas.width = Math.max(1, Math.ceil(boardW));
    dioramaFloorCacheCanvas.height = Math.max(1, Math.ceil(boardH));
    dioramaFloorCacheKey = key;
    const fctx = dioramaFloorCacheCanvas.getContext('2d');
    if (!fctx) return null;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * tileSize;
        const y = r * tileSize;
        const even = (c + r) % 2 === 0;
        const isBedroom = r < 4 && c < 5;
        const isBathroom = r < 4 && c >= 5 && c <= 8;
        const isKitchen = r < 4 && c > 8;

        if (isBedroom) {
          fctx.fillStyle = even ? '#4a3728' : '#3f2e21';
          fctx.fillRect(x, y, tileSize, tileSize);
          fctx.strokeStyle = 'rgba(253, 230, 138, 0.12)';
          fctx.lineWidth = 1;
          fctx.beginPath();
          fctx.moveTo(x, y + tileSize * 0.5);
          fctx.lineTo(x + tileSize, y + tileSize * 0.5);
          fctx.stroke();
        } else if (isBathroom) {
          fctx.fillStyle = even ? '#1e3a4c' : '#173040';
          fctx.fillRect(x, y, tileSize, tileSize);
        } else if (isKitchen) {
          fctx.fillStyle = even ? '#432822' : '#36201b';
          fctx.fillRect(x, y, tileSize, tileSize);
        } else {
          fctx.fillStyle = even ? '#283548' : '#202b3b';
          fctx.fillRect(x, y, tileSize, tileSize);
          if (grid[r][c] !== TILE.WALL && (r === 4 || r === 6 || r === 8)) {
            fctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
            fctx.fillRect(x + tileSize * 0.1, y + tileSize * 0.46, tileSize * 0.8, Math.max(2, tileSize * 0.07));
          }
        }

        fctx.strokeStyle = 'rgba(203, 213, 225, 0.15)';
        fctx.lineWidth = 1;
        fctx.strokeRect(x, y, tileSize, tileSize);
        fctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        fctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize * 0.16);

        const northTile = r > 0 ? grid[r - 1][c] : TILE.WALL;
        if (northTile === TILE.WALL || northTile === TILE.FURNITURE || northTile === TILE.DOOR || northTile === TILE.LOCKED_DOOR) {
          fctx.fillStyle = 'rgba(2, 6, 23, 0.34)';
          fctx.fillRect(x, y, tileSize, tileSize * 0.18);
          fctx.fillStyle = 'rgba(2, 6, 23, 0.16)';
          fctx.fillRect(x, y + tileSize * 0.18, tileSize, tileSize * 0.16);
        }
        const westTile = c > 0 ? grid[r][c - 1] : TILE.WALL;
        if (westTile === TILE.WALL || westTile === TILE.FURNITURE) {
          fctx.fillStyle = 'rgba(2, 6, 23, 0.28)';
          fctx.fillRect(x, y, tileSize * 0.12, tileSize);
          fctx.fillStyle = 'rgba(2, 6, 23, 0.12)';
          fctx.fillRect(x + tileSize * 0.12, y, tileSize * 0.10, tileSize);
        }
      }
    }
    return dioramaFloorCacheCanvas;
  }

  // --- Unified 3D Architectural Building Escape Renderer (Dispatches 'FPS_3D' vs 'DIORAMA_3D') ---
  function renderCanvas() {
    const width = cssCanvasW;
    const height = cssCanvasH;
    if (!width || !height || !grid || grid.length < ROWS) return;

    const now = performance.now() * 0.004;
    const st = activeCustomStage || STAGES[currentStageIdx] || STAGES[0];
    const nextObj = getNextStepObjective();

    if (cameraMode3D === 'FPS_3D') {
      renderFirstPerson3D(width, height, now, st);
      if (isFullMapOverlayOpen && window.FireEscape && window.FireEscape.Tactical3D) {
        const escapePath = nextObj ? getCachedShortestEscapePath(Math.floor(player.x), Math.floor(player.y), nextObj.c, nextObj.r) : [];
        window.FireEscape.Tactical3D.drawFullTacticalMapOverlay(ctx, width, height, {
          grid, cols: COLS, rows: ROWS, TILE, player, fpsCamYaw, fires, smokes, pendingHazards, items, nextObj, escapePath, stageName: st.name, roomLabels: st.roomLabels
        });
      }
      return;
    }

    // Deep atmospheric 3D building backdrop
    ctx.fillStyle = '#0c1322';
    ctx.fillRect(0, 0, width, height);

    const layout = computeDioramaLayout(width, height);
    const { tileSize, stretchX = 1, zoom = 1, wallH, offsetX, offsetY, isCloseUp } = layout;
    const boardW = COLS * tileSize;
    const boardH = ROWS * tileSize;
    const sideBevel = Math.max(3, tileSize * 0.12);
    const slabH = layout.slabH || Math.max(6, tileSize * 0.22);

    ctx.save();
    const shakeX = screenShakeTimer > 0 && !(appSettings && appSettings.reduceMotion) ? Math.sin(now * 65) * 4.5 : 0;
    const shakeY = screenShakeTimer > 0 && !(appSettings && appSettings.reduceMotion) ? Math.cos(now * 58) * 3.5 : 0;
    ctx.translate(offsetX + shakeX, offsetY + shakeY);
    ctx.scale(stretchX * zoom, zoom);

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

    // 1. Floor Pass: Draw Cached 3D Architectural Room Flooring in 1 blit
    const floorCache = getDioramaFloorCache(tileSize);
    if (floorCache) {
      ctx.drawImage(floorCache, 0, 0, boardW, boardH);
    }

    // Improvement #4: Draw 3-Second Floor Hazard Warnings in DIORAMA_3D
    if (pendingHazards && pendingHazards.length > 0 && window.FireEscape && window.FireEscape.Tactical3D) {
      window.FireEscape.Tactical3D.drawPendingHazardsDiorama(ctx, pendingHazards, tileSize, now);
    }

    // 1.2 Dynamic 3D Firelight & Emergency Exit Floor Illumination Pools
    for (const f of fires) {
      const fx = (f.c + 0.5) * tileSize;
      const fy = (f.r + 0.5) * tileSize;
      const flickerR = tileSize * (1.45 + 0.14 * Math.sin(now * 5.8 + (f.phase || 0)));
      ctx.fillStyle = f.fireType === 'electric' ? 'rgba(56, 189, 248, 0.16)' : 'rgba(251, 146, 60, 0.18)';
      ctx.beginPath();
      ctx.arc(fx, fy, flickerR, 0, Math.PI * 2);
      ctx.fill();
    }

    // 1.25 3D Pulsing Interactive Target Aura for [Space] Reaction Target
    const activeTargetDiorama = getInteractTarget();
    if (activeTargetDiorama) {
      const tc = activeTargetDiorama.kind === 'item' ? activeTargetDiorama.item.c : activeTargetDiorama.c;
      const tr = activeTargetDiorama.kind === 'item' ? activeTargetDiorama.item.r : activeTargetDiorama.r;
      const tx = tc * tileSize;
      const ty = tr * tileSize;
      const pulse = 0.65 + 0.35 * Math.sin(now * 5.5);
      ctx.save();
      ctx.fillStyle = `rgba(250, 204, 21, ${0.18 * pulse})`;
      ctx.strokeStyle = `rgba(253, 224, 71, ${0.88 * pulse})`;
      ctx.lineWidth = 2.2;
      ctx.fillRect(tx + 2, ty + 2, tileSize - 4, tileSize - 4);
      ctx.strokeRect(tx + 2, ty + 2, tileSize - 4, tileSize - 4);
      ctx.restore();
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

          if (!hasBottomWall) {
            const wallTopY = y - curWallH * 0.28;
            const totalFrontH = tileSize + curWallH * 0.28;
            const upperH = totalFrontH * 0.58;
            ctx.fillStyle = '#7588a3';
            ctx.fillRect(x, wallTopY, tileSize, upperH);
            ctx.fillStyle = '#5c2809';
            ctx.fillRect(x, wallTopY + upperH, tileSize, totalFrontH - upperH);

            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, wallTopY + upperH);
            ctx.lineTo(x + tileSize, wallTopY + upperH);
            ctx.stroke();

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(x, y + tileSize - Math.max(3, tileSize * 0.09), tileSize, Math.max(3, tileSize * 0.09));
          } else {
            ctx.fillStyle = '#475569';
            ctx.fillRect(x, y - curWallH * 0.25, tileSize, tileSize + curWallH * 0.25);
          }

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
          draw3DDoorway(ctx, x, y, tileSize, wallH, t, now, r, c);
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
        const fy = (f.r + 0.62) * tileSize;
        drawRealisticVolumetricFire(ctx, fx, fy, tileSize * 0.52, now, f.phase || 0, f.fireType || 'normal');

        if (f.fireType === 'oil' || f.fireType === 'electric') {
          ctx.font = `${Math.floor(tileSize * 0.28)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(f.fireType === 'oil' ? '🍳' : '⚡', fx + tileSize * 0.28, fy - tileSize * 0.44);
        }
      }

      // 2D. Realistic Articulated Human Player 1 ('나') & Rescued Companions in Row r
      if (pRow === r) {
        const pRad = 0.32 * tileSize;
        const footY = py + tileSize * 0.16;

        if (flashlightSpotEnabled && player.hasFlashlight) {
          ctx.save();
          const fAngle = Math.atan2(player.dirY || 0, player.dirX || 1);
          const coneLen = tileSize * (player.hasFlashlight ? 2.6 : 1.9);
          ctx.fillStyle = 'rgba(253, 224, 71, 0.22)';
          ctx.beginPath();
          ctx.moveTo(px, py - tileSize * 0.18);
          ctx.arc(px, py - tileSize * 0.18, coneLen, fAngle - 0.42, fAngle + 0.42);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

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

        if (player.rescuedDog || player.rescuedNpcs > 0 || rescuedCompanions.length > 0) {
          const dogComp = rescuedCompanions.find(c => c.type === 'dog');
          if (player.rescuedDog || dogComp) {
            const dogX = dogComp ? dogComp.x * tileSize : (px - player.dirX * tileSize * 0.55);
            const dogY = dogComp ? (dogComp.y * tileSize - tileSize * 0.12) : (py - player.dirY * tileSize * 0.55 - tileSize * 0.14);
            ctx.font = `${Math.floor(tileSize * 0.38)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🐶', dogX, dogY);
          }
          const npcComp = rescuedCompanions.find(c => c.type === 'npc');
          if (player.rescuedNpcs > 0 || npcComp) {
            const npcX = npcComp ? npcComp.x * tileSize : (px - player.dirX * tileSize * 0.78);
            const npcY = npcComp ? (npcComp.y * tileSize + tileSize * 0.12) : (footY - player.dirY * tileSize * 0.65);
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
          const bubbleComp = rescuedCompanions[0] || {
            x: player.x - player.dirX * 0.68,
            y: player.y - player.dirY * 0.68,
            icon: player.rescuedDog ? '🐶' : '🧒'
          };
          const bx = bubbleComp.x * tileSize;
          const by = bubbleComp.y * tileSize - tileSize * 0.78;
          const tipText = !player.crouching && smokes.length > 0
            ? '💬 "연기 속에선 낮은 자세(🧎)로 가요!"'
            : '💬 "함께 비상구(EXIT)로 탈출해요! 힘내요!"';
          ctx.save();
          ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.17))}px "Noto Sans KR", sans-serif`;
          const bw = ctx.measureText(tipText).width + 10;
          const bh = Math.max(13, Math.floor(tileSize * 0.23));
          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(bx - bw / 2, by - bh / 2, bw, bh);
          ctx.fillStyle = '#a7f3d0';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(tipText, bx, by);
          ctx.restore();
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

        ctx.save();
        const titlePrefix = (customGear && customGear.honorTitle) ? `[${customGear.honorTitle}] ` : '';
        const relayTag = isRelayMode ? `🤝${relayCurrentRunner}주자 · ` : '';
        const guideTag = autoGuideTimer > 0 ? `🧑‍🚒길안내(${autoGuideTimer.toFixed(0)}s) · ` : '';
        const meTag = `${guideTag}${relayTag}${isCoopMode ? '1P 나' : (isCloseUp ? `${titlePrefix}나` : '나')}`;
        ctx.font = `900 ${Math.max(10, Math.floor(tileSize * 0.20))}px "Noto Sans KR", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const mw = ctx.measureText(meTag).width + 10;
        const mh = Math.max(14, Math.floor(tileSize * 0.26));
        const headTopY = footY - (player.crouching ? humanH * 0.78 : humanH * 0.96);
        const my = Math.max(mh / 2 - wallH, headTopY - mh / 2 - 4);
        ctx.fillStyle = autoGuideTimer > 0 ? '#d97706' : (player.crouching ? '#059669' : '#2563eb');
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

      // 2E. 3D Elevated Ceiling Smoke Plumes in Row r (Fast layered circles instead of per-tile radial gradient)
      for (const s of smokes) {
        if (s.r !== r) continue;
        const sx = (s.c + 0.5) * tileSize;
        const floorY = (s.r + 0.52) * tileSize;
        const sy = (s.r + 0.5) * tileSize - wallH * (player.crouching ? 0.68 : 0.55);
        const wobble = Math.sin(now + s.phase) * tileSize * 0.06;

        ctx.fillStyle = player.crouching ? 'rgba(16, 185, 129, 0.14)' : 'rgba(2, 6, 23, 0.32)';
        ctx.beginPath();
        ctx.ellipse(sx + wobble * 0.4, floorY, tileSize * 0.38, tileSize * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = player.crouching ? 'rgba(51, 65, 85, 0.34)' : 'rgba(71, 85, 105, 0.52)';
        ctx.beginPath();
        ctx.arc(sx, sy, tileSize * 0.60, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = player.crouching ? 'rgba(71, 85, 105, 0.42)' : 'rgba(100, 116, 139, 0.68)';
        ctx.beginPath();
        ctx.arc(sx + wobble, sy, tileSize * 0.36, 0, Math.PI * 2);
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

    // 3. Draw Volumetric Extinguisher / Water Particles in 3D Space (Fast layered circles)
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      const px3d = p.x * tileSize;
      const py3d = p.y * tileSize - tileSize * 0.24 - (1 - alpha) * tileSize * 0.14;
      const rad = Math.max(1.5, p.size * (1.25 - alpha * 0.25));
      ctx.fillStyle = p.color === '#60a5fa'
        ? `rgba(96, 165, 250, ${alpha * 0.65})`
        : `rgba(224, 242, 254, ${alpha * 0.68})`;
      ctx.beginPath();
      ctx.arc(px3d, py3d, rad * 1.35, 0, Math.PI * 2);
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
      ctx.fillStyle = player.hasFlashlight ? 'rgba(254, 240, 138, 0.09)' : 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.arc(px, py - tileSize * 0.2, auraRadius * 0.75, 0, Math.PI * 2);
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

    // Improvement #5: Render Full-Screen Tactical Blueprint Map Overlay when toggled ('M' key or #btnTacticalMapTop)
    if (isFullMapOverlayOpen && window.FireEscape && window.FireEscape.Tactical3D) {
      const escapePath = nextObj ? getCachedShortestEscapePath(Math.floor(player.x), Math.floor(player.y), nextObj.c, nextObj.r) : [];
      window.FireEscape.Tactical3D.drawFullTacticalMapOverlay(ctx, width, height, {
        grid, cols: COLS, rows: ROWS, TILE, player, fpsCamYaw, fires, smokes, pendingHazards, items, nextObj, escapePath, stageName: st.name, roomLabels: st.roomLabels
      });
    }
  }

  // --- Main Animation Loop ---
  let idleModalFrameSkip = 0;
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

    // Avoid heavy 60fps 3D canvas redraws while a full-screen modal/overlay is covering the canvas and player isn't moving
    const isOverlayVisible = gameOverlay && !gameOverlay.classList.contains('hidden');
    const isModalCovering = isOverlayVisible || isReadingNotebook || (puzzleModal && !puzzleModal.classList.contains('hidden'));
    if (isModalCovering && !keysPressed.up && !keysPressed.down && !keysPressed.left && !keysPressed.right) {
      idleModalFrameSkip = (idleModalFrameSkip + 1) % 6;
      if (idleModalFrameSkip === 0) {
        renderCanvas();
      }
    } else {
      renderCanvas();
    }

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

  function isFullscreenActive() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  function syncFullscreenUI() {
    const active = isFullscreenActive();
    const iconEl = document.getElementById('fullscreenTopIcon');
    const textEl = document.getElementById('fullscreenTopText');
    if (iconEl) iconEl.textContent = active ? '🗗' : '⛶';
    if (textEl) textEl.textContent = active ? '축소' : '전체화면';
    document.querySelectorAll('.ys-chip[data-fullscreen-btn]').forEach((btn) => {
      btn.textContent = active ? '🗗 전체화면 해제' : '⛶ 전체화면';
    });
  }

  function requestGameFullscreen(quiet = true) {
    const docEl = document.documentElement;
    const req =
      docEl.requestFullscreen ||
      docEl.webkitRequestFullscreen ||
      docEl.mozRequestFullScreen ||
      docEl.msRequestFullscreen;
    if (req && !isFullscreenActive()) {
      try {
        const res = req.call(docEl, { navigationUI: 'hide' });
        if (res && typeof res.then === 'function') {
          res.then(() => {
            if (screen.orientation && typeof screen.orientation.lock === 'function') {
              screen.orientation.lock('landscape').catch(() => {});
            }
            syncFullscreenUI();
            setTimeout(resizeCanvas, 80);
            if (!quiet) {
              showToast('⛶ [전체화면 모드 ON] 상단 주소창을 숨기고 화면 전체로 플레이합니다!', 'border-emerald-400');
            }
          }).catch(() => {
            if (!quiet) {
              dioramaZoom = dioramaZoom > 1.05 ? 1.0 : 1.4;
              resizeCanvas();
              showToast('🔍 현재 브라우저(인앱)에서 전체화면이 제한되어 플레이 화면을 크게 확대했습니다!', 'border-sky-400');
            }
          });
        }
      } catch (e) {}
    }
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
      try {
        screen.orientation.lock('landscape').catch(() => {});
      } catch (e) {}
    }
    try {
      window.scrollTo(0, 1);
    } catch (e) {}
  }

  function toggleGameFullscreen() {
    SoundFX.init();
    SoundFX.pickup();
    if (isFullscreenActive()) {
      const exitFn =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.mozCancelFullScreen ||
        document.msExitFullscreen;
      if (exitFn) {
        try {
          const p = exitFn.call(document);
          if (p && typeof p.then === 'function') {
            p.then(() => {
              syncFullscreenUI();
              setTimeout(resizeCanvas, 80);
            }).catch(() => {});
          }
        } catch (e) {}
      }
      showToast('🗗 전체화면 모드를 해제했습니다.');
    } else {
      requestGameFullscreen(false);
    }
  }

  document.querySelectorAll('[data-fullscreen-btn]').forEach((btn) => {
    btn.addEventListener('click', toggleGameFullscreen);
  });
  document.addEventListener('fullscreenchange', () => {
    syncFullscreenUI();
    setTimeout(resizeCanvas, 60);
  });
  document.addEventListener('webkitfullscreenchange', () => {
    syncFullscreenUI();
    setTimeout(resizeCanvas, 60);
  });

  function syncViewportOrientation() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const visH = (window.visualViewport && window.visualViewport.height) ? Math.round(window.visualViewport.height) : vh;
    document.documentElement.style.setProperty('--vp-w', `${vw}px`);
    document.documentElement.style.setProperty('--vp-h', `${vh}px`);
    document.documentElement.style.setProperty('--app-vh', `${visH}px`);

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
    syncFullscreenUI();
  }

  function resizeCanvas() {
    syncViewportOrientation();
    const q = appSettings ? appSettings.graphicsQuality : 'auto';
    const maxDpr = q === 'low' ? 1 : (q === 'high' ? 1.5 : 1.25);
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

    canvasContainer.style.height = '';
    const availW = canvasContainer.clientWidth || Math.max(280, Math.max(window.innerWidth, window.innerHeight) - 228);
    const availH = canvasContainer.clientHeight || Math.max(200, Math.min(window.innerWidth, window.innerHeight) - 38);
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
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resizeCanvas);
  }
  window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 120);
  });
  if (typeof ResizeObserver !== 'undefined' && canvasContainer.parentElement) {
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(canvasContainer.parentElement);
  }

  // --- Improvement #5: Full-Screen Tactical Blueprint Map Toggle ('M' Key / Top Button) ---
  const btnTacticalMapTop = document.getElementById('btnTacticalMapTop');
  function toggleFullTacticalMap() {
    SoundFX.init();
    isFullMapOverlayOpen = !isFullMapOverlayOpen;
    SoundFX.playTone(isFullMapOverlayOpen ? 560 : 420, 'sine', 0.06, 0.08);
    if (btnTacticalMapTop) {
      btnTacticalMapTop.className = isFullMapOverlayOpen
        ? 'px-2 py-0.5 sm:py-1 text-xs font-extrabold rounded-lg bg-sky-500 border border-sky-200 text-slate-950 transition flex items-center gap-1 shadow-sm whitespace-nowrap'
        : 'px-2 py-0.5 sm:py-1 text-xs font-extrabold rounded-lg bg-sky-600/30 hover:bg-sky-600/50 border border-sky-400/60 text-sky-100 transition flex items-center gap-1 shadow-sm whitespace-nowrap';
    }
    if (isFullMapOverlayOpen) {
      showToast('🗺️ [전술 피난안내도 열림 · M키] 건물 전체 구조와 추천 황금 탈출 경로를 확인하세요! (타일 클릭 시 자동 이동)', 'border-sky-400');
    }
    renderCanvas();
  }
  if (btnTacticalMapTop) {
    btnTacticalMapTop.addEventListener('click', toggleFullTacticalMap);
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

    // Improvement #5: Handle click inside Full-Screen Tactical Blueprint Map Overlay
    if (isFullMapOverlayOpen && isTapStart) {
      const local = window.getElementLocalCoords(canvas, clientX, clientY);
      const Tac3D = window.FireEscape && window.FireEscape.Tactical3D;
      const hitTile = Tac3D && typeof Tac3D.getTacticalMapTileAt === 'function'
        ? Tac3D.getTacticalMapTileAt(local.x, local.y, local.width, local.height, COLS, ROWS)
        : null;
      if (hitTile) {
        pointerMoveTarget = { x: hitTile.c + 0.5, y: hitTile.r + 0.5 };
        isFullMapOverlayOpen = false;
        if (btnTacticalMapTop) {
          btnTacticalMapTop.className = 'px-2 py-0.5 sm:py-1 text-xs font-extrabold rounded-lg bg-sky-600/30 hover:bg-sky-600/50 border border-sky-400/60 text-sky-100 transition flex items-center gap-1 shadow-sm whitespace-nowrap';
        }
        showToast(`🗺️ 피난안내도 목표 지점(${hitTile.c + 1}, ${hitTile.r + 1})으로 이동합니다!`, 'border-sky-400');
      } else {
        toggleFullTacticalMap();
      }
      renderCanvas();
      return;
    }

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
    if (!canvasPointerDown || gameState !== 'PLAYING' || isFullMapOverlayOpen) return;
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

    const exitModalEl = document.getElementById('exitGameModal');
    if (exitModalEl && !exitModalEl.classList.contains('hidden')) {
      if (e.code === 'Escape' && !e.repeat) {
        e.preventDefault();
        const closeExitBtn = document.getElementById('btnCloseExitModal');
        if (closeExitBtn) closeExitBtn.click();
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

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
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

    // [반응하기 단축키: Space (보조: E / Enter)]
    if ((e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Slash') && !e.repeat) {
      if (gameState === 'PLAYING') {
        flashButtonPress(btnAction);
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
    if (e.code === 'KeyQ' && !e.repeat) {
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
    // [숙이기 단축키: Shift (보조: C)]
    if ((e.code === 'ShiftLeft' || e.code === 'KeyC') && !e.repeat) {
      if (gameState === 'PLAYING') toggleCrouch();
    }
    if (e.code === 'ShiftRight' && !e.repeat) {
      if (gameState === 'PLAYING') {
        if (isCoopMode) {
          player2.crouching = !player2.crouching;
          flashButtonPress(btnCrouch);
          showToast(player2.crouching ? '🧎 [2P 숙이기 ON] 2P 대원이 자세를 낮췄습니다!' : '🚶 [2P 숙이기 해제] 2P 대원이 일어섰습니다.');
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
    if (e.code === 'KeyM' && !e.repeat) {
      if (gameState === 'PLAYING' || gameState === 'PAUSED') {
        e.preventDefault();
        toggleFullTacticalMap();
      }
    }
    if (e.code === 'KeyZ' && !e.repeat) {
      if (gameState === 'PLAYING' && cameraMode3D === 'DIORAMA_3D') {
        toggleMapZoomMode();
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
      if (isFullMapOverlayOpen) {
        e.preventDefault();
        toggleFullTacticalMap();
        return;
      }
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
  const btnToggleExtraTools = document.getElementById('btnToggleExtraTools');
  const extraToolsRow = document.getElementById('extraToolsRow');
  const extraToolsToggleIcon = document.getElementById('extraToolsToggleIcon');
  const extraToolsToggleText = document.getElementById('extraToolsToggleText');

  if (btnToggleExtraTools && extraToolsRow) {
    btnToggleExtraTools.addEventListener('click', () => {
      SoundFX.init();
      const isHidden = extraToolsRow.classList.contains('hidden');
      if (isHidden) {
        extraToolsRow.classList.remove('hidden');
        extraToolsRow.classList.add('flex');
        if (extraToolsToggleIcon) extraToolsToggleIcon.textContent = '➖';
        if (extraToolsToggleText) extraToolsToggleText.textContent = '부가기능·수업도구 접기';
      } else {
        extraToolsRow.classList.add('hidden');
        extraToolsRow.classList.remove('flex');
        if (extraToolsToggleIcon) extraToolsToggleIcon.textContent = '➕';
        if (extraToolsToggleText) extraToolsToggleText.textContent = '부가기능·수업도구 더보기';
      }
    });
  }

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
      if (!navigator.webdriver) {
        requestGameFullscreen(true);
      } else if (screen.orientation && typeof screen.orientation.lock === 'function') {
        try {
          screen.orientation.lock('landscape').catch(() => {});
        } catch (e) {}
      }
      resizeCanvas();
      showToast('📱 화면 회전 잠금 상태에서도 플레이할 수 있도록 가로 전체화면으로 전환했습니다!');
    });
  }

  function showMainTitleScreen() {
    if (gameState === 'PLAYING' && elapsedSeconds > 0 && typeof saveCampaignState === 'function') {
      saveCampaignState();
    }
    clearAllInputStates();
    closeOtherModalsExcept(null, true);
    gameState = 'START';
    overlayIcon.textContent = '🚨';
    overlaySubtitle.textContent = '생명 최우선 · 즉시 대피 훈련';
    overlayTitle.innerHTML = '화재 탈출<br class="hidden lg:inline"/> 넘버원 3D';
    overlayDesc.innerHTML = '연기 속 <span class="text-emerald-300 underline underline-offset-4">낮은 자세</span>로 <span class="text-amber-300">비상구(EXIT)</span>까지 신속히 탈출하세요!';
    overlayTipsBox.classList.remove('hidden');
    overlayStats.classList.add('hidden');
    overlayStats.classList.remove('grid');
    debriefReportBox.classList.add('hidden');
    const worldBar = document.getElementById('worldSelectBar');
    if (worldBar) worldBar.classList.add('hidden');
    const reviveBtnMain = document.getElementById('btnReviveWithQuiz');
    if (reviveBtnMain) reviveBtnMain.classList.add('hidden');
    const homeFromOverlayMain = document.getElementById('btnHomeFromOverlay');
    if (homeFromOverlayMain) homeFromOverlayMain.classList.add('hidden');
    const exitBottomMain = document.getElementById('btnExitOverlayBottom');
    if (exitBottomMain) exitBottomMain.classList.add('hidden');
    const resultTopBarMain = document.getElementById('overlayResultTopBar');
    if (resultTopBarMain) {
      resultTopBarMain.classList.add('hidden');
      resultTopBarMain.classList.remove('flex');
    }
    if (typeof selectWorldCard === 'function') selectWorldCard('fire');
    if (typeof syncContinueButtonUI === 'function') syncContinueButtonUI();
    if (btnMainGuide) btnMainGuide.classList.remove('hidden');
    btnOpenCertFromOverlay.classList.remove('hidden');
    btnSecondaryAction.classList.add('hidden');
    btnPrimaryAction.textContent = '▶️ 전체화면으로 게임 시작';
    gameOverlay.classList.remove('hidden');
    const overlayCardMain = document.getElementById('overlayCard');
    if (overlayCardMain) overlayCardMain.scrollTop = 0;
    overlaySelectedIndex = 0;
    setTimeout(updateOverlaySelectionUI, 20);
  }

  // Improvement #1: Main Screen Quick Stage Selector Bar (#mainStageSelectBar) 1-Click Stage Launch
  document.querySelectorAll('#mainStageSelectBar .main-stage-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      SoundFX.init();
      if (!navigator.webdriver) {
        requestGameFullscreen(true);
      }
      const stageAttr = pill.getAttribute('data-main-stage');
      if (stageAttr === 'daily' && typeof generateDailyChallengeStage === 'function') {
        const dailySt = generateDailyChallengeStage();
        loadStage(0, true, dailySt);
        hideAllModalsAndResume();
        SoundFX.siren();
        SoundFX.speak('오늘의 일일구 돌발 재난 챌린지를 시작합니다. 침착하게 탈출하세요!');
        showToast(`🎲 ${dailySt.name} 시작! 매일 자정 새로운 구조로 바뀝니다!`, 'border-amber-400');
      } else {
        const idx = parseInt(stageAttr || '0', 10);
        if (!isNaN(idx) && idx >= 0 && idx < STAGES.length) {
          selectStageManual(idx);
        }
      }
    });
  });

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

  const btnHomeFromOverlay = document.getElementById('btnHomeFromOverlay');
  if (btnHomeFromOverlay) {
    btnHomeFromOverlay.addEventListener('click', () => {
      SoundFX.init();
      showMainTitleScreen();
      showToast('🏠 메인 타이틀 화면으로 돌아왔습니다!');
    });
  }

  const btnHomeOverlayTop = document.getElementById('btnHomeOverlayTop');
  if (btnHomeOverlayTop) {
    btnHomeOverlayTop.addEventListener('click', () => {
      SoundFX.init();
      showMainTitleScreen();
      showToast('🏠 메인 타이틀 화면으로 돌아왔습니다!');
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
    closeOtherModalsExcept(null, true);
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
    resumeIfNoBlockingModalOpen();
    updateHUD();
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
    closeOtherModalsExcept(mapEditorModal);
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
        legacyKey: String(idx),
        icon: ['🏡', '🏢', '🏬', '🏫', '🚇', '🔍', '🏕️'][idx] || '🏢',
        shortName: stItem.name.replace(/^\d+단계:\s*/, '').replace(/^사전예방:\s*/, '예방:').split('[')[0].trim()
      })),
      { key: 'daily', legacyKey: 'daily', icon: '🎲', shortName: '오늘의 119 챌린지' }
    ];
    const clearedCount = stampDefs.reduce((acc, d) => acc + ((clearedStages[d.key] || clearedStages[d.legacyKey]) ? 1 : 0), 0);
    if (stageStampCountBadge) {
      stageStampCountBadge.textContent = `${clearedCount} / ${stampDefs.length} 완주`;
    }
    if (stageStampGrid) {
      stageStampGrid.innerHTML = stampDefs.map((d) => {
        const isCleared = !!(clearedStages[d.key] || clearedStages[d.legacyKey]);
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
    const clearedCount = [
      ['s0', '0'], ['s1', '1'], ['s2', '2'], ['s3', '3'], ['s4', '4'], ['s5', '5'], ['s6', '6'], ['daily', 'daily']
    ].reduce((acc, [k1, k2]) => acc + ((clearedStages[k1] || clearedStages[k2]) ? 1 : 0), 0);
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
    cctx.font = 'bold 26px "Noto Sans KR", sans-serif';
    const titleStr = (customGear && customGear.honorTitle) ? `[${customGear.honorTitle}] ` : '';
    cctx.fillText(`${activeSkin.icon} ${titleStr}대원 성명 : ${cleanName}`, 450, 198);

    cctx.fillStyle = '#93c5fd';
    cctx.font = 'bold 16px "Noto Sans KR", sans-serif';
    cctx.fillText(`소속: ${clsText}  |  최고점수: ${best.toLocaleString()}점  |  배지: ${unlockedCount}/${BADGE_DEFS.length}개  |  완주도장: ${clearedCount}/8곳`, 450, 229);

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
    closeOtherModalsExcept(certModal);
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
    resumeIfNoBlockingModalOpen();
    updateHUD();
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
    closeOtherModalsExcept(classModal);
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
    resumeIfNoBlockingModalOpen();
    updateHUD();
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
    closeOtherModalsExcept(teacherModal);
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
    resumeIfNoBlockingModalOpen();
    updateHUD();
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
        localStorage.setItem('fire_escape_cleared_stages', JSON.stringify(clearedStages));
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
      closeOtherModalsExcept(null, true);
      if (gameOverlay.classList.contains('hidden')) {
        gameState = 'PLAYING';
        pauseIcon.textContent = '⏸️';
        pauseText.textContent = '일시정지';
        showToast('▶️ 대피를 계속합니다!');
      }
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
    closeOtherModalsExcept(guideModal);
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
    resumeIfNoBlockingModalOpen();
    updateHUD();
  }

  btnCloseGuide.addEventListener('click', closeGuideModal);
  btnConfirmGuide.addEventListener('click', closeGuideModal);

  btnPrimaryAction.addEventListener('click', () => {
    SoundFX.init();
    if (!navigator.webdriver) {
      requestGameFullscreen(true);
    }
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
      SoundFX.speak('화재 경보 발생! 안전한 출구로 신속히 대피하세요. 연기가 있으면 낮은 자세로 이동하고 장비를 찾느라 지체하지 마세요.');
      showToast(
        activeCustomStage
          ? '🛠️ 공유된 커스텀 대피도 플레이를 시작합니다! 안전하게 비상구로 탈출하세요!'
          : '🚨 화재 경보 발생! 안전한 대피로로 신속히 이동하세요. 장비·물건을 찾느라 지체하지 마세요!'
      );
    } else if (gameState === 'STAGE_CLEAR') {
      let nextIdx = 0;
      if (activeCustomStage || currentStageIdx === 5 || currentStageIdx >= STAGES.length - 1) {
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
        btnPrimaryAction.textContent = '▶️ 전체화면으로 게임 시작';
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
      const fullStageName = String(saved.stageName || `${(saved.stageIdx || 0) + 1}단계`).split('[')[0].trim();
      const shortBadge = fullStageName.includes(':') ? fullStageName.split(':')[0].trim() : fullStageName.slice(0, 5).trim();
      btnContinueSaved.textContent = `⏯️ 이어하기 (${shortBadge})`;
      btnContinueSaved.title = `${fullStageName} (경과 ${mins}:${secs}) 이어서 시작하기`;
      btnContinueSaved.classList.remove('hidden');
    } else {
      btnContinueSaved.classList.add('hidden');
    }
  }

  if (btnContinueSaved) {
    btnContinueSaved.addEventListener('click', () => {
      SoundFX.init();
      if (!navigator.webdriver) {
        requestGameFullscreen(true);
      }
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

    // 1. Checklist & Clues Panel (Concise 1-line items with whitespace-nowrap)
    if (notebookTaskList) {
      const tasks = [];
      if (st.isPreventionMode) {
        const doneHaz = player.hazardsFixed >= player.totalHazards;
        tasks.push({
          status: doneHaz ? '[완료]' : '[진행중]',
          done: doneHaz,
          text: `가정 내 화재 위험요소 5곳 안전 점검하기 (${player.hazardsFixed}/${player.totalHazards}곳)`
        });
      } else {
        const hasResp = player.wetTowel || player.hasMask;
        tasks.push({
          status: hasResp ? '[완료]' : '[미완료]',
          done: hasResp,
          text: '선택 체험: 가까이 있는 수건·마스크 사용 (찾거나 적시느라 대피 지연 금지)'
        });
        if (st.requireGasClosed) {
          tasks.push({
            status: player.gasClosed ? '[완료]' : '[미완료]',
            done: player.gasClosed,
            text: '선택 게임 장치: 가스밸브(🔴) 조작 (대피 선행 조건 아님)'
          });
        }
        const hasLockedDoor = findNearestTileOfTypes([TILE.LOCKED_DOOR]) !== null;
        const keyOrUnlocked = !hasLockedDoor || player.keys > 0 || safeSolved;
        tasks.push({
          status: !hasLockedDoor ? '[완료]' : (keyOrUnlocked ? '[진행중]' : '[미완료]'),
          done: !hasLockedDoor,
          text: `잠긴 방문(🔒) 열기: 열쇠(🔑)를 줍거나 비상 금고(암호 ${safeCode}) 해금하기`
        });
        if (st.requireRescueNpc || st.requireRescueDog) {
          const remainingRescue = items.some(it => it.type === 'npc' || it.type === 'dog');
          tasks.push({
            status: !remainingRescue ? '[완료]' : '[미완료]',
            done: !remainingRescue,
            text: '선택 게임 체험: 동행하기 (위험한 곳을 수색하지 말고 남은 위치는 119에 알리기)'
          });
        }
      }
      tasks.push({
        status: '[진행중]',
        done: false,
        text: '대피 우선: 안전한 출구로 신속히 이동 · 탈출 후 재진입 금지 · 119에 위치 알리기'
      });

      const sizeCls = isClueZoomed ? 'text-sm leading-snug' : 'text-xs leading-snug';
      notebookTaskList.className = `space-y-1 text-slate-200 overflow-x-auto no-scrollbar ${sizeCls}`;
      notebookTaskList.innerHTML = tasks.map((t) => `
        <div class="px-2.5 py-1.5 rounded-lg border ${t.done ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-slate-900 border-slate-700 text-slate-200'} flex items-center gap-2 whitespace-nowrap">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${t.done ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500/25 text-amber-300 border border-amber-400/40'}">${t.status}</span>
          <span class="whitespace-nowrap">${t.text}</span>
        </div>
      `).join('');
    }

    if (notebookClueList) {
      const sizeCls = isClueZoomed ? 'text-sm leading-snug' : 'text-xs leading-snug';
      notebookClueList.className = `space-y-1 text-slate-300 overflow-x-auto no-scrollbar ${sizeCls}`;
      const customClueBody = (customQuizConfig && customQuizConfig.safeClue)
        ? `🎯 [우리 반 암호] ${customQuizConfig.safeClue} → 정답: <strong>${safeCode}</strong>`
        : `비상 금고 비밀번호는 <strong>[ ${safeCode} ]</strong> (또는 <strong>614</strong> / <strong>0119</strong>) → 비상 열쇠(🔑) 획득`;
      const clueNotes = [
        {
          badge: '[안전수칙]',
          title: '📄 대피 핵심 수칙',
          body: '연기는 위로 올라가므로 <strong>[🧎 낮은 자세(Shift)]</strong>로 대피하고 뜨거운 문(🌡️)은 절대 열지 마세요.'
        },
        {
          badge: safeSolved ? '[완료]' : '[단서 1]',
          title: '🔢 퍼즐 1 · 금고 암호',
          body: customClueBody
        },
        {
          badge: wireSolved ? '[완료]' : '[단서 2]',
          title: '⚡ 퍼즐 2 · 배전판 배선',
          body: '단자 연결: <strong>🔴빨강=[B] · 🔵파랑=[D] · 🟡노랑=[A] · 🟢초록=[C]</strong> → 전원 차단 및 소화기 충전'
        },
        {
          badge: dirLockSolved ? '[완료]' : '[단서 3]',
          title: '🧭 퍼즐 3 · 방향 자물쇠',
          body: '화살표 순서: <strong>[ ⬆️위 → ➡️오른쪽 → ➡️오른쪽 → ⬇️아래 → ⬅️왼쪽 → ⬆️위 ]</strong> → 방연마스크·손전등 획득'
        },
        {
          badge: bookSortSolved ? '[완료]' : '[단서 4]',
          title: '📚 퍼즐 4 · 매뉴얼 정렬',
          body: '청구기호 오름차순: <strong>[ 425.12 → 425.2 → 430 → 440 → 450 → 480 ]</strong> → 소방도끼(🪓) 획득'
        }
      ];
      notebookClueList.innerHTML = clueNotes.map(cn => `
        <div class="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-between gap-2 whitespace-nowrap">
          <div class="flex items-center gap-2 min-w-0 whitespace-nowrap">
            <span class="font-extrabold text-amber-300 shrink-0">${cn.title}:</span>
            <span class="text-slate-200 whitespace-nowrap">${cn.body}</span>
          </div>
          <span class="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[10px] font-black shrink-0">${cn.badge}</span>
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
        ? `<strong>[열람됨]</strong> 안전한 출구로 신속히 대피하세요. 장비를 찾거나 사람·반려동물을 수색하느라 지체하지 말고, 밖에서 119에 위치를 알리세요.`
        : '힌트 열기를 누르면 현재 목표의 위치와 안전 수칙을 한 줄로 안내합니다.';
    }
    if (btnUnlockHint1) {
      btnUnlockHint1.textContent = open1 ? '✅ 1단계 힌트 열람됨' : '💡 1단계 힌트 열기 (+1회)';
      btnUnlockHint1.className = open1
        ? 'px-3 py-1 rounded-lg bg-slate-800 border border-emerald-500/50 text-emerald-300 font-extrabold text-xs transition whitespace-nowrap shrink-0'
        : 'px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs transition whitespace-nowrap shrink-0';
    }
    if (hintStep2Text) {
      hintStep2Text.innerHTML = open2
        ? `<strong>[정답]</strong> ①금고: <strong>${safeCode}</strong>(614) · ②배선: <strong>빨B·파D·노A·초C</strong> · ③방향: <strong>위·우·우·하·좌·위</strong> · ④서가: <strong>425.12→425.2→430→440→450→480</strong>`
        : '1단계 힌트 확인 후 모든 퍼즐 정답 코드를 한 줄로 바로 확인할 수 있습니다.';
    }
    if (btnUnlockHint2) {
      btnUnlockHint2.textContent = open2 ? '✅ 2단계 정답 열람됨' : '🔑 2단계 정답 열기 (+1회)';
      btnUnlockHint2.className = open2
        ? 'px-3 py-1 rounded-lg bg-slate-800 border border-emerald-500/50 text-emerald-300 font-extrabold text-xs transition whitespace-nowrap shrink-0'
        : 'px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs transition whitespace-nowrap shrink-0';
    }
    if (hintHistoryList) {
      if (hintLog.length === 0) {
        hintHistoryList.innerHTML = '<div class="text-slate-500 whitespace-nowrap">아직 열람한 힌트가 없습니다.</div>';
      } else {
        hintHistoryList.innerHTML = hintLog.map((id, idx) => `
          <div class="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 whitespace-nowrap">
            <strong>#${idx + 1} [${id}]</strong> — ${id.endsWith('_1') ? '1단계 탐색 방향 힌트 열람 완료' : '2단계 결정적 정답 힌트 열람 완료'}
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
          desc: '잠긴 방문(🔒) 앞에서 문을 즉시 개방합니다.',
          onUse: () => {
            const adjLocked = findNearestTileOfTypes([TILE.LOCKED_DOOR]);
            if (adjLocked && adjLocked.dist <= 2.2) {
              triggerInteraction({ kind: 'tile', c: adjLocked.c, r: adjLocked.r, tile: TILE.LOCKED_DOOR });
              return '🔓 근처의 잠긴 방문(🔒)을 열쇠로 개방했습니다!';
            }
            return 'ℹ️ 현재 잠긴 문(🔒) 앞이 아닙니다. 열쇠는 소멸되지 않고 보관됩니다.';
          }
        },
        {
          id: 'clue_safe',
          cat: 'record',
          icon: '📄',
          name: `금고 암호 메모 (${safeCode})`,
          owned: true,
          desc: `금고 비밀번호 단서(${safeCode} / 614 / 0119) 기록표입니다.`,
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
          name: '배전판 도면 (R=B, B=D, Y=A, G=C)',
          owned: true,
          desc: '배전판 비상 배선 연결 도면입니다.',
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
          name: '방향 자물쇠 표식 (위·우·우·하·좌·위)',
          owned: true,
          desc: '구호장비 보관함 6단계 방향 해제 기록입니다.',
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
          name: '청구기호 정렬표 (425.12~480)',
          owned: true,
          desc: '425.12 → 425.2 → 430 → 440 → 450 → 480 서가 배열 기록입니다.',
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
          desc: '연기 구역에서 산소 고갈 속도를 줄여 주는 호흡기 보호구입니다.',
          onUse: () => {
            if (player.hasMask || player.wetTowel) {
              return '✅ 이미 호흡기 보호구(젖은 수건/방연마스크)를 착용하고 있습니다!';
            }
            return '🧣 수건으로 코와 입을 가리되, 적시느라 대피를 늦추지 마세요. 유독가스 차단을 보장하지 않습니다.';
          }
        },
        {
          id: 'extinguisher',
          cat: 'tool',
          icon: '🧯',
          name: `ABC 분말소화기 (${player.extinguisherCharges}회)`,
          owned: player.extinguisherCharges > 0,
          desc: '일반·식용유·전기 화재를 모두 진압하는 다목적 소화기입니다.',
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
          desc: '나무 장애물(🪵)이나 경량칸막이(🧱)를 돌파할 때 사용합니다.',
          onUse: () => {
            const adjDebris = findNearestTileOfTypes([TILE.DEBRIS]);
            if (adjDebris && adjDebris.dist <= 2.2) {
              triggerInteraction({ kind: 'tile', c: adjDebris.c, r: adjDebris.r, tile: TILE.DEBRIS });
              return '🪓 근처의 나무 장애물(🪵)을 소방 도끼로 부쉈습니다!';
            }
            return 'ℹ️ 근처에 부술 장애물(🪵)이 없습니다. 소방 도끼는 그대로 유지됩니다.';
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
                <span class="text-xs font-extrabold whitespace-nowrap truncate ${entry.owned ? 'text-amber-300' : 'text-slate-400'}">${entry.name}</span>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${entry.owned ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}">${entry.owned ? '[보유중]' : '[미보유]'}</span>
              </div>
              <p class="text-[11px] text-slate-300 mt-0.5 whitespace-nowrap overflow-x-auto no-scrollbar">${entry.desc}</p>
            </div>
          </div>
          <button type="button" data-inv-id="${entry.id}" class="inv-use-btn w-full py-1.5 rounded-lg text-[11px] font-extrabold transition whitespace-nowrap ${
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
          ? 'py-1.5 px-2 rounded-lg bg-amber-500 text-slate-950 transition whitespace-nowrap truncate'
          : 'py-1.5 px-2 rounded-lg text-slate-300 hover:text-white transition whitespace-nowrap truncate';
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
    closeOtherModalsExcept(notebookModal);
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
    resumeIfNoBlockingModalOpen();
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
      btnToggleClueZoom.textContent = isClueZoomed ? '🔎 기본글자' : '🔍 글자확대';
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
    closeOtherModalsExcept(puzzleModal);
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
    resumeIfNoBlockingModalOpen();
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
    closeOtherModalsExcept(settingsModal);
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
    resumeIfNoBlockingModalOpen();
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
  const teacherQrImg = document.getElementById('teacherQrImg');
  const teacherQrSummaryText = document.getElementById('teacherQrSummaryText');
  const teacherPresetUrlPreview = document.getElementById('teacherQrUrlText') || document.getElementById('teacherPresetUrlPreview');

  if (teacherQrClassInput) {
    if (currentClassCode) teacherQrClassInput.value = currentClassCode;
    teacherQrClassInput.addEventListener('change', () => {
      const val = teacherQrClassInput.value.trim();
      if (val) {
        currentClassCode = val;
        if (classCodeInput) classCodeInput.value = val;
        persistAppSettings();
      }
    });
  }

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
    if (
      customQuizConfig &&
      (customQuizConfig.safeCode || customQuizConfig.safeClue || customQuizConfig.quizTitle || customQuizConfig.goodChoice || customQuizConfig.badChoice)
    ) {
      try {
        p.set('customQuiz', btoa(encodeURIComponent(JSON.stringify(customQuizConfig))));
      } catch (e) {}
    }
    return `${baseUrl}?${p.toString()}`;
  }

  function renderTeacherPresetQr() {
    const url = buildTeacherPresetUrl();
    if (teacherPresetUrlPreview) teacherPresetUrlPreview.textContent = url;
    if (teacherQrSummaryText) {
      const cls = (teacherQrClassInput && teacherQrClassInput.value.trim()) || currentClassCode || '서울초 5-2';
      const stgText = teacherQrStageSelect && teacherQrStageSelect.options[teacherQrStageSelect.selectedIndex]
        ? teacherQrStageSelect.options[teacherQrStageSelect.selectedIndex].textContent
        : '1단계';
      const grdText = teacherQrGradeSelect && teacherQrGradeSelect.options[teacherQrGradeSelect.selectedIndex]
        ? teacherQrGradeSelect.options[teacherQrGradeSelect.selectedIndex].textContent
        : '3~4학년 표준';
      const tmText = teacherQrTimeSelect && teacherQrTimeSelect.options[teacherQrTimeSelect.selectedIndex]
        ? teacherQrTimeSelect.options[teacherQrTimeSelect.selectedIndex].textContent
        : '수업 연습 모드';
      teacherQrSummaryText.textContent = `🏫 [${cls}] · ${stgText} · ${grdText} · ${tmText}`;
    }
    if (teacherQrCanvas && window.FireEscape && typeof window.FireEscape.drawFallbackQrMatrix === 'function') {
      window.FireEscape.drawFallbackQrMatrix(teacherQrCanvas, url);
    }
    if (teacherQrImg) {
      const qrApiUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=' + encodeURIComponent(url);
      teacherQrImg.onload = () => {
        teacherQrImg.classList.remove('hidden');
        if (teacherQrCanvas) teacherQrCanvas.classList.add('hidden');
      };
      teacherQrImg.onerror = () => {
        teacherQrImg.classList.add('hidden');
        if (teacherQrCanvas) teacherQrCanvas.classList.remove('hidden');
      };
      teacherQrImg.src = qrApiUrl;
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
      if (stgVal === 'daily' && typeof generateDailyChallengeStage === 'function') {
        loadStage(0, false, generateDailyChallengeStage());
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
      body: '화재 연기는 유독하며 낮은 곳도 안전을 보장하지 않습니다. <strong>안전한 대피로로 신속히 이동</strong>하고, 연기를 지나야 한다면 <strong>낮은 자세(🧎)</strong>를 유지하세요. 가까이 있는 수건·옷으로 코와 입을 가릴 수 있지만 <strong>장비를 찾거나 수건을 적시느라 대피를 늦추지 마세요.</strong> 수건과 마스크가 모든 유독가스를 막거나 산소 부족을 해결하지는 못합니다.'
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
  const customQuizFeedback = document.getElementById('customQuizFeedback');

  function collectCustomQuizFromInputs() {
    const safeCode = (customSafeCodeInput && customSafeCodeInput.value.trim()) || '';
    const safeClue = (customSafeClueInput && customSafeClueInput.value.trim()) || '';
    const quizTitle = (customQuizTitleInput && customQuizTitleInput.value.trim()) || '';
    const goodChoice = (customQuizGoodInput && customQuizGoodInput.value.trim()) || '';
    const badChoice = (customQuizBadInput && customQuizBadInput.value.trim()) || '';
    return { safeCode, safeClue, quizTitle, goodChoice, badChoice };
  }

  function updateCustomQuizFeedbackUI() {
    if (!customQuizFeedback) return;
    if (
      customQuizConfig &&
      (customQuizConfig.safeCode || customQuizConfig.safeClue || customQuizConfig.quizTitle)
    ) {
      customQuizFeedback.textContent = `현재 적용됨: 금고 암호 [${getStageSafePasscode()}]${customQuizConfig.quizTitle ? ` · 맞춤 퀴즈 [${customQuizConfig.quizTitle}]` : ''} (수업 프리셋 QR 자동 연동됨)`;
      customQuizFeedback.className = 'text-[10px] text-emerald-300 font-bold';
    } else {
      customQuizFeedback.textContent = '현재 기본 교육과정 문제와 스테이지별 금고 암호(614 / 3322 / 0119)가 적용되어 있습니다.';
      customQuizFeedback.className = 'text-[10px] text-slate-400';
    }
  }

  if (btnApplyCustomQuizNow) {
    btnApplyCustomQuizNow.addEventListener('click', () => {
      SoundFX.init();
      customQuizConfig = collectCustomQuizFromInputs();
      renderNotebookModal();
      updateSafeLockUI();
      updateCustomQuizFeedbackUI();
      renderTeacherPresetQr();
      SoundFX.pickup();
      showToast(`🔐 우리 반 맞춤 금고 암호(${getStageSafePasscode()})와 안전 퀴즈가 현재 게임 및 수업 QR에 즉시 적용되었습니다!`, 'border-emerald-400');
    });
  }

  if (btnCopyCustomQuizUrl) {
    btnCopyCustomQuizUrl.addEventListener('click', () => {
      SoundFX.init();
      customQuizConfig = collectCustomQuizFromInputs();
      renderNotebookModal();
      updateSafeLockUI();
      updateCustomQuizFeedbackUI();
      const shareUrl = renderTeacherPresetQr();
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

  // --- Game Exit (🚪 게임 종료) Modal & Handlers ---
  const btnExitGameOverlay = document.getElementById('btnExitGameOverlay');
  const btnExitGameTop = document.getElementById('btnExitGameTop');
  const btnExitFromSettings = document.getElementById('btnExitFromSettings');
  const exitGameModal = document.getElementById('exitGameModal');
  const exitModalTitle = document.getElementById('exitModalTitle');
  const exitModalSaveNotice = document.getElementById('exitModalSaveNotice');
  const exitModalFarewellBox = document.getElementById('exitModalFarewellBox');
  const btnCloseExitModal = document.getElementById('btnCloseExitModal');
  const btnConfirmExitClose = document.getElementById('btnConfirmExitClose');
  const btnExitToMainTitle = document.getElementById('btnExitToMainTitle');
  const btnCancelExitGame = document.getElementById('btnCancelExitGame');
  let isExitFarewellState = false;

  function openExitGameModalFn() {
    if (!exitGameModal) return;
    SoundFX.init();
    clearAllInputStates();
    if (gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'STAGE_CLEAR') {
      saveCampaignState();
    }
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    closeOtherModalsExcept(exitGameModal);
    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
      pauseIcon.textContent = '▶️';
      pauseText.textContent = '계속하기';
    }
    isExitFarewellState = false;
    if (exitModalTitle) exitModalTitle.textContent = '🚪 게임을 종료하시겠습니까?';
    if (exitModalSaveNotice) exitModalSaveNotice.classList.remove('hidden');
    if (exitModalFarewellBox) exitModalFarewellBox.classList.add('hidden');
    if (btnConfirmExitClose) btnConfirmExitClose.classList.remove('hidden');
    if (btnExitToMainTitle) {
      const isAlreadyMain = gameState === 'START' && !gameOverlay.classList.contains('hidden');
      btnExitToMainTitle.classList.toggle('hidden', isAlreadyMain);
    }
    if (btnCancelExitGame) btnCancelExitGame.textContent = '▶️ 취소 (게임으로 돌아가기)';

    exitGameModal.classList.remove('hidden');
    exitGameModal.classList.add('flex');
  }

  function closeExitGameModalFn() {
    if (!exitGameModal) return;
    clearAllInputStates();
    exitGameModal.classList.add('hidden');
    exitGameModal.classList.remove('flex');
    if (isExitFarewellState) {
      isExitFarewellState = false;
      showMainTitleScreen();
      return;
    }
    resumeIfNoBlockingModalOpen();
    updateHUD();
  }

  const btnExitOverlayTop = document.getElementById('btnExitOverlayTop');
  const btnExitOverlayBottom = document.getElementById('btnExitOverlayBottom');
  const btnExitGameDrawer = document.getElementById('btnExitGameDrawer');
  if (btnExitGameOverlay) btnExitGameOverlay.addEventListener('click', openExitGameModalFn);
  if (btnExitOverlayTop) btnExitOverlayTop.addEventListener('click', openExitGameModalFn);
  if (btnExitOverlayBottom) btnExitOverlayBottom.addEventListener('click', openExitGameModalFn);
  if (btnExitGameTop) btnExitGameTop.addEventListener('click', openExitGameModalFn);
  if (btnExitGameDrawer) btnExitGameDrawer.addEventListener('click', openExitGameModalFn);
  if (btnExitFromSettings) btnExitFromSettings.addEventListener('click', openExitGameModalFn);
  if (btnCloseExitModal) btnCloseExitModal.addEventListener('click', closeExitGameModalFn);
  if (btnCancelExitGame) btnCancelExitGame.addEventListener('click', closeExitGameModalFn);

  if (btnExitToMainTitle) {
    btnExitToMainTitle.addEventListener('click', () => {
      SoundFX.init();
      saveCampaignState();
      isExitFarewellState = false;
      if (exitGameModal) {
        exitGameModal.classList.add('hidden');
        exitGameModal.classList.remove('flex');
      }
      showMainTitleScreen();
      showToast('💾 현재 진행 상태를 안전하게 저장하고 메인 타이틀 화면으로 이동했습니다!', 'border-amber-400');
    });
  }

  if (btnConfirmExitClose) {
    btnConfirmExitClose.addEventListener('click', () => {
      SoundFX.init();
      saveCampaignState();
      if (window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }
      try {
        window.close();
      } catch (e) {}
      isExitFarewellState = true;
      if (exitModalTitle) exitModalTitle.textContent = '🚒 게임이 안전하게 종료되었습니다';
      if (exitModalFarewellBox) exitModalFarewellBox.classList.remove('hidden');
      if (btnConfirmExitClose) btnConfirmExitClose.classList.add('hidden');
      if (btnExitToMainTitle) btnExitToMainTitle.classList.add('hidden');
      if (btnCancelExitGame) btnCancelExitGame.textContent = '🔄 다시 게임 시작하기 (타이틀 화면)';
      showToast('🚒 진행 상태가 자동 저장되었으며 게임이 안전하게 종료되었습니다.', 'border-emerald-400');
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

  // --- Ideas 1~9: New Classroom & Student Engagement Feature Handlers ---
  const btnToggleGoldenBell = document.getElementById('btnToggleGoldenBell');
  const btnSpeedDrillMode = document.getElementById('btnSpeedDrillMode');
  const speedDrillToggleText = document.getElementById('speedDrillToggleText');
  const btnStartSpeedDrillTeacher = document.getElementById('btnStartSpeedDrillTeacher');
  const btnRelayModeToggle = document.getElementById('btnRelayModeToggle');
  const relayToggleText = document.getElementById('relayToggleText');
  const btnAutoPilotGuide = document.getElementById('btnAutoPilotGuide');
  const btnNotebookAutoGuide = document.getElementById('btnNotebookAutoGuide');
  const btnReviveWithQuiz = document.getElementById('btnReviveWithQuiz');
  const btnSeasonSpring = document.getElementById('btnSeasonSpring');
  const btnSeasonSummer = document.getElementById('btnSeasonSummer');
  const btnSeasonAutumn = document.getElementById('btnSeasonAutumn');
  const btnSeasonWinter = document.getElementById('btnSeasonWinter');
  const seasonPackNotice = document.getElementById('seasonPackNotice');
  const teacherBatchCodeInput = document.getElementById('teacherBatchCodeInput');
  const btnAnalyzeBatchCodes = document.getElementById('btnAnalyzeBatchCodes');
  const btnSampleBatchCodes = document.getElementById('btnSampleBatchCodes');
  const btnDownloadBatchCsv = document.getElementById('btnDownloadBatchCsv');
  const teacherBatchSummaryBox = document.getElementById('teacherBatchSummaryBox');
  const helmetColorSelect = document.getElementById('helmetColorSelect');
  const honorTitleSelect = document.getElementById('honorTitleSelect');
  const customGearPreviewBadge = document.getElementById('customGearPreviewBadge');

  function syncGoldenBellUI() {
    if (!btnToggleGoldenBell) return;
    if (appSettings.goldenBellMode) {
      btnToggleGoldenBell.textContent = '🔔 골든벨:켜짐';
      btnToggleGoldenBell.className = 'px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-extrabold text-slate-950 shrink-0';
    } else {
      btnToggleGoldenBell.textContent = '골든벨 켜기';
      btnToggleGoldenBell.className = 'px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-extrabold text-slate-950 shrink-0';
    }
  }

  if (btnToggleGoldenBell) {
    btnToggleGoldenBell.addEventListener('click', () => {
      SoundFX.init();
      appSettings.goldenBellMode = !appSettings.goldenBellMode;
      syncGoldenBellUI();
      persistAppSettings();
      SoundFX.pickup();
      showToast(
        appSettings.goldenBellMode
          ? '🔔 [전자칠판 골든벨 모드 ON] 모든 퀴즈 창에서 학급 손가락 투표 5초 카운트다운이 작동합니다!'
          : '🔔 전자칠판 골든벨 모드를 껐습니다.',
        'border-amber-400'
      );
    });
  }

  function syncSpeedDrillUI() {
    if (speedDrillToggleText) {
      speedDrillToggleText.textContent = isSpeedDrillMode ? '3분핵심대피:켜짐' : '3분핵심대피:꺼짐';
    }
    if (btnStartSpeedDrillTeacher) {
      btnStartSpeedDrillTeacher.textContent = isSpeedDrillMode ? '⚡ 3분모드:켜짐' : '⚡ 3분모드 시작';
    }
  }

  function toggleSpeedDrillMode(startImmediately = false) {
    SoundFX.init();
    isSpeedDrillMode = !isSpeedDrillMode;
    syncSpeedDrillUI();
    if (isSpeedDrillMode) {
      player.keys = Math.max(2, player.keys);
      player.hasAxe = true;
      if (runOptions.mode !== 'practice') runOptions.hazardLimitSeconds = 180;
      SoundFX.pickup();
      showToast('⚡ [3분 스피드 핵심 대피 모드 ON] 열쇠·도끼가 기본 지급되어 4대 핵심 수칙만 3분 내 체험합니다!', 'border-orange-400');
      if (startImmediately) {
        if (teacherModal) {
          teacherModal.classList.add('hidden');
          teacherModal.classList.remove('flex');
        }
        loadStage(currentStageIdx, true, activeCustomStage);
        gameOverlay.classList.add('hidden');
        gameState = 'PLAYING';
        pauseIcon.textContent = '⏸️';
        pauseText.textContent = '일시정지';
      }
    } else {
      if (runOptions.mode !== 'practice') {
        runOptions.hazardLimitSeconds = runOptions.mode === 'relaxed' ? 480 : 300;
      }
      showToast('⚡ 3분 스피드 핵심 대피 모드를 껐습니다. (표준 방탈출 퍼즐 모드)');
    }
    updateHUD();
  }

  if (btnSpeedDrillMode) {
    btnSpeedDrillMode.addEventListener('click', () => toggleSpeedDrillMode(false));
  }
  if (btnStartSpeedDrillTeacher) {
    btnStartSpeedDrillTeacher.addEventListener('click', () => {
      if (!isSpeedDrillMode) {
        toggleSpeedDrillMode(true);
      } else {
        if (teacherModal) {
          teacherModal.classList.add('hidden');
          teacherModal.classList.remove('flex');
        }
        loadStage(currentStageIdx, true, activeCustomStage);
        gameOverlay.classList.add('hidden');
        gameState = 'PLAYING';
        pauseIcon.textContent = '⏸️';
        pauseText.textContent = '일시정지';
      }
    });
  }

  // Idea 8: 4-Player Group Relay Mode Toggle
  if (btnRelayModeToggle) {
    btnRelayModeToggle.addEventListener('click', () => {
      SoundFX.init();
      isRelayMode = !isRelayMode;
      relayCurrentRunner = 1;
      relayBatonTriggered = {};
      if (relayToggleText) {
        relayToggleText.textContent = isRelayMode ? '4인릴레이:켜짐' : '4인릴레이:꺼짐';
      }
      SoundFX.pickup();
      showToast(
        isRelayMode
          ? '🤝 [4인 모둠 릴레이 모드 ON] ①호흡기보호 → ②비상벨·차단 → ③이웃구출 → ④비상구탈출 구간마다 바통 터치 알림이 뜹니다!'
          : '🤝 4인 모둠 릴레이 모드를 껐습니다.',
        'border-teal-400'
      );
      renderCanvas();
    });
  }

  // Idea 4: AI Firefighter Captain 5s BFS Auto-Guide Buttons & KeyG Shortcut
  if (btnAutoPilotGuide) {
    btnAutoPilotGuide.addEventListener('click', triggerAiCaptainAutoGuide);
  }
  if (btnNotebookAutoGuide) {
    btnNotebookAutoGuide.addEventListener('click', triggerAiCaptainAutoGuide);
  }
  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.code === 'KeyG' && !e.repeat && gameState === 'PLAYING') {
      e.preventDefault();
      triggerAiCaptainAutoGuide();
    }
  });

  // Idea 5: 7 School Safety Standards Seasonal 1-Click Lesson Packs
  function applySeasonalLessonPack(seasonKey) {
    SoundFX.init();
    const packs = {
      spring: {
        stageIdx: 3,
        slideIdx: 1,
        label: '🌱 봄 학기(3~5월) 안전 팩: [4단계: 초등학교 과학실 화재] + 화학·실험실 소화 원리 슬라이드가 자동 세팅되었습니다!'
      },
      summer: {
        stageIdx: 4,
        slideIdx: 0,
        label: '☀️ 여름 학기(6~8월) 안전 팩: [5단계: 지하철 정전 미로] + 어두운 다중이용시설 유도등 대피 슬라이드가 자동 세팅되었습니다!'
      },
      autumn: {
        stageIdx: 2,
        slideIdx: 3,
        label: '🍁 가을 학기(9~10월) 안전 팩: [3단계: 아파트 베란다] + 완강기·경량칸막이 피난 설비 슬라이드가 자동 세팅되었습니다!'
      },
      winter: {
        stageIdx: 1,
        slideIdx: 2,
        label: '❄️ 겨울 학기(11~2월) 안전 팩: [2단계: 1층 주방·난방기] + 식용유(K급)·전기 화재 진압 슬라이드가 자동 세팅되었습니다!'
      }
    };
    const pack = packs[seasonKey] || packs.spring;
    loadStage(pack.stageIdx, true, null);
    if (teacherQrStageSelect) teacherQrStageSelect.value = String(pack.stageIdx);
    if (typeof currentBriefingSlideIdx !== 'undefined') {
      currentBriefingSlideIdx = pack.slideIdx;
      if (typeof renderBriefingSlide === 'function') renderBriefingSlide();
    }
    if (typeof renderTeacherPresetQr === 'function') renderTeacherPresetQr();
    if (seasonPackNotice) {
      seasonPackNotice.textContent = pack.label;
    }
    SoundFX.pickup();
    showToast(pack.label, 'border-teal-400');
  }

  if (btnSeasonSpring) btnSeasonSpring.addEventListener('click', () => applySeasonalLessonPack('spring'));
  if (btnSeasonSummer) btnSeasonSummer.addEventListener('click', () => applySeasonalLessonPack('summer'));
  if (btnSeasonAutumn) btnSeasonAutumn.addEventListener('click', () => applySeasonalLessonPack('autumn'));
  if (btnSeasonWinter) btnSeasonWinter.addEventListener('click', () => applySeasonalLessonPack('winter'));

  // Idea 3: Student Clear Verification Code 1-Second Batch Aggregator & CSV Exporter
  let parsedBatchRecords = [];

  function parseStudentVerificationCodes(rawText) {
    const lines = String(rawText || '')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
    const results = [];
    lines.forEach((line, idx) => {
      const nameMatch = line.match(/\]\s*([^·|]+?)\s*·/) || line.match(/^(?!119\b)([^·,:]+?)\s*[·,:]/);
      const extractedName = nameMatch ? nameMatch[1].trim() : `학생_${idx + 1}`;
      const stageMatch = line.match(/(\d+단계|커스텀맵|커스텀|예방점검|오늘의챌린지|챌린지)/);

      // Format A: 119-S1-S1850-42 (with or without preceding student name / class info)
      const shortMatch = line.match(/119-(CUS|DAY|S\d+)-([SAB])(\d+)-(\d+)/i);
      if (shortMatch) {
        const rawStg = shortMatch[1].toUpperCase();
        const stgLabel = stageMatch
          ? stageMatch[1]
          : (rawStg === 'CUS' ? '커스텀맵' : (rawStg === 'DAY' ? '오늘의챌린지' : (rawStg === 'S0' ? '예방점검' : `${rawStg.replace('S', '')}단계`)));
        results.push({
          index: idx + 1,
          student: extractedName,
          stage: stgLabel,
          grade: `${shortMatch[2].toUpperCase()}등급`,
          score: parseInt(shortMatch[3], 10) || 0,
          raw: line
        });
        return;
      }
      // Format B: Descriptive line containing stage / score / grade without 119-... code
      const scoreMatch = line.match(/(\d{2,6})\s*점/) || line.match(/#FS-(\d+)/i);
      const gradeMatch = line.match(/([SAB])\s*등급|\(([SAB])\)/i);
      if (scoreMatch || gradeMatch || stageMatch) {
        const gLetter = gradeMatch ? (gradeMatch[1] || gradeMatch[2] || 'A').toUpperCase() : 'A';
        results.push({
          index: idx + 1,
          student: extractedName,
          stage: stageMatch ? stageMatch[1] : '1단계',
          grade: `${gLetter}등급`,
          score: scoreMatch ? (parseInt(scoreMatch[1], 10) || 1000) : 1200,
          raw: line
        });
      }
    });
    return results;
  }

  function analyzeBatchCodesNow() {
    SoundFX.init();
    const raw = teacherBatchCodeInput ? teacherBatchCodeInput.value : '';
    parsedBatchRecords = parseStudentVerificationCodes(raw);
    if (!teacherBatchSummaryBox) return;
    if (parsedBatchRecords.length === 0) {
      teacherBatchSummaryBox.innerHTML = '⚠️ 인식된 클리어 인증코드가 없습니다. [🧪 예시 데이터 넣기]를 눌러 형식을 확인해 보세요.';
      return;
    }
    const total = parsedBatchRecords.length;
    const sumScore = parsedBatchRecords.reduce((acc, r) => acc + r.score, 0);
    const avgScore = Math.round(sumScore / total);
    const sCount = parsedBatchRecords.filter(r => r.grade.startsWith('S')).length;
    const aCount = parsedBatchRecords.filter(r => r.grade.startsWith('A')).length;
    const bCount = total - sCount - aCount;
    teacherBatchSummaryBox.innerHTML = `
      <div class="font-extrabold text-emerald-300">✅ 총 ${total}명 제출 완료 · 학급 평균 ${avgScore.toLocaleString()}점</div>
      <div class="text-slate-300 mt-0.5">• 등급 분포: <strong>S등급 ${sCount}명</strong> / <strong>A등급 ${aCount}명</strong> / <strong>B등급 ${bCount}명</strong></div>
      <div class="text-slate-400 text-[10px] mt-0.5">• 명단 미리보기: ${parsedBatchRecords.slice(0, 5).map(r => `${r.student}(${r.stage}·${r.score}점)`).join(', ')}${total > 5 ? ` 외 ${total - 5}명` : ''}</div>
    `;
    SoundFX.pickup();
    showToast(`📊 총 ${total}명의 클리어 인증코드 집계가 완료되었습니다! (평균 ${avgScore.toLocaleString()}점)`, 'border-indigo-400');
  }

  if (btnAnalyzeBatchCodes) {
    btnAnalyzeBatchCodes.addEventListener('click', analyzeBatchCodesNow);
  }
  if (btnSampleBatchCodes) {
    btnSampleBatchCodes.addEventListener('click', () => {
      if (!teacherBatchCodeInput) return;
      teacherBatchCodeInput.value = [
        '[서울초 5-2] 김안전 · 1단계 · 1850점 · 등급:안전 박사 (S) · 119-S1-S1850-42',
        '[서울초 5-2] 이소방 · 2단계 · 1620점 · 등급:안전 박사 (S) · 119-S2-S1620-38',
        '[서울초 5-2] 박대피 · 3단계 · 1390점 · 등급:우수 대원 (A) · 119-S3-A1390-55',
        '119-S4-S1940-61'
      ].join('\n');
      analyzeBatchCodesNow();
    });
  }
  if (btnDownloadBatchCsv) {
    btnDownloadBatchCsv.addEventListener('click', () => {
      SoundFX.init();
      if (parsedBatchRecords.length === 0) {
        analyzeBatchCodesNow();
      }
      if (parsedBatchRecords.length === 0) {
        showToast('⚠️ 먼저 분석할 학생 인증코드를 입력해 주세요!', 'border-amber-500');
        return;
      }
      const csvRows = [
        ['연번', '학생명', '클리어단계', '안전등급', '획득점수', '원본인증코드'].join(','),
        ...parsedBatchRecords.map(r =>
          [
            r.index,
            `"${String(r.student).replace(/"/g, '""')}"`,
            `"${String(r.stage).replace(/"/g, '""')}"`,
            `"${String(r.grade).replace(/"/g, '""')}"`,
            r.score,
            `"${String(r.raw).replace(/"/g, '""')}"`
          ].join(',')
        )
      ].join('\r\n');
      try {
        const blob = new Blob(['\uFEFF' + csvRows], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `학급_화재대피_인증집계_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        SoundFX.pickup();
        showToast('📥 학급 클리어 통계 엑셀(CSV) 파일이 다운로드되었습니다!', 'border-emerald-400');
      } catch (e) {}
    });
  }

  // Idea 6: Safety Review Quiz In-Place Revive on Game Over
  if (btnReviveWithQuiz) {
    btnReviveWithQuiz.addEventListener('click', () => {
      SoundFX.init();
      if (player.usedReviveChance) return;

      let qTitle = '💨 유독가스 질식 위기 극복 안전 퀴즈!';
      let qDesc = '화재 현장에서 뜨거운 유독가스와 연기는 <strong>대류 현상</strong> 때문에 천장(위쪽)부터 차오릅니다. 연기를 피하며 대피하는 가장 올바른 방법은 무엇일까요?';
      let goodLabel = '✅ 젖은 수건·방연마스크로 코와 입을 막고 [낮은 자세(🧎)]로 벽을 짚으며 이동한다';
      let badLabel = '❌ 연기를 빨리 통과하기 위해 서서 전속력으로 달린다';

      if (lastGameOverReason === 'hp') {
        qTitle = '🔥 화상 위기 극복 안전 오답노트 퀴즈!';
        qDesc = '대피 도중 내 옷에 불이 옮겨붙었을 때, 불길이 얼굴로 번지는 것을 막고 가장 안전하게 불을 끄는 행동은 무엇일까요?';
        goodLabel = '✅ 뛰지 말고 즉시 멈춰 바닥에 엎드린 뒤, 두 손으로 얼굴을 가리고 뒹군다 (멈추기·엎드리기·구르기)';
        badLabel = '❌ 바람으로 불을 끄기 위해 복도를 따라 빠르게 뛰어간다';
      } else if (lastGameOverReason === 'exposure') {
        qTitle = '⏱️ 골든타임 초과 위기 극복 안전 퀴즈!';
        qDesc = '불이 났을 때 장난감이나 귀중품을 챙기느라 대피 시간을 지체하면 매우 위험합니다. 올바른 대피 원칙은 무엇일까요?';
        goodLabel = '✅ 물건에 미련을 두지 않고 즉시 젖은 수건으로 호흡기를 보호하며 비상구(EXIT)로 대피한다';
        badLabel = '❌ 아끼는 물건을 모두 가방에 챙긴 뒤 천천히 엘리베이터를 탄다';
      }

      gameOverlay.classList.add('hidden');
      openEduModal('🛡️ 안전 오답노트 · 그 자리 부활 찬스 (1회)', qTitle, qDesc, [
        {
          label: goodLabel,
          primary: true,
          onSelect: () => {
            player.usedReviveChance = true;
            player.hp = 80;
            player.o2 = 85;
            player.onFire = false;
            player.rollNeeded = 0;
            player.crouching = true;
            player.hurtCooldown = 3.0;
            // Remove any fire right on the player's current tile so they don't immediately burn again
            const pc = Math.floor(player.x);
            const pr = Math.floor(player.y);
            fires = fires.filter(f => !(f.c === pc && f.r === pr));
            if (lastGameOverReason === 'exposure' && typeof runOptions.hazardLimitSeconds === 'number') {
              runOptions.hazardLimitSeconds += 120;
            }
            if (btnReviveWithQuiz) btnReviveWithQuiz.classList.add('hidden');
            SoundFX.win();
            closeEduModal();
            gameState = 'PLAYING';
            pauseIcon.textContent = '⏸️';
            pauseText.textContent = '일시정지';
            addFloatText(player.x, player.y, '🛡️ 안전 퀴즈 부활 성공!', '#34d399');
            showToast('🛡️ [안전 오답노트 정답!] 그 자리에서 체력 80%·산소 85%로 부활했습니다! 끝까지 비상구로 탈출하세요!', 'border-emerald-400');
            updateHUD();
            renderCanvas();
          }
        },
        {
          label: badLabel,
          primary: false,
          onSelect: () => {
            SoundFX.warning();
            showToast('💡 아쉽습니다! 안전 수칙을 다시 생각하며 올바른 보기를 선택해 보세요!', 'border-amber-400');
          }
        }
      ]);
    });
  }

  // Idea 9: 3D Character Safety Helmet Color & Honor Title Customizer
  function syncCustomGearUI() {
    if (helmetColorSelect && customGear.helmetColor) {
      helmetColorSelect.value = customGear.helmetColor;
    }
    if (honorTitleSelect && customGear.honorTitle) {
      honorTitleSelect.value = customGear.honorTitle;
    }
    if (customGearPreviewBadge) {
      const colorNames = {
        '#ef4444': '소방 레드 안전모',
        '#facc15': '골든 히어로 안전모',
        '#38bdf8': '네온 블루 안전모',
        '#10b981': '에메랄드 구조대 안전모'
      };
      const cName = colorNames[customGear.helmetColor] || '맞춤 안전모';
      customGearPreviewBadge.textContent = `[${customGear.honorTitle}] · ${cName}`;
    }
  }

  function saveAndApplyCustomGear() {
    if (helmetColorSelect) customGear.helmetColor = helmetColorSelect.value || '#ef4444';
    if (honorTitleSelect) customGear.honorTitle = honorTitleSelect.value || '용감한 대피 대장';
    try {
      localStorage.setItem('fire_escape_custom_gear', JSON.stringify(customGear));
    } catch (e) {}
    syncCustomGearUI();
    renderCanvas();
    SoundFX.pickup();
    showToast(`⛑️ [${customGear.honorTitle}] 칭호와 3D 안전모 색상이 캐릭터 및 수료증에 적용되었습니다!`, 'border-cyan-400');
  }

  if (helmetColorSelect) helmetColorSelect.addEventListener('change', saveAndApplyCustomGear);
  if (honorTitleSelect) honorTitleSelect.addEventListener('change', saveAndApplyCustomGear);

  // --- Bug #3 Fix & Features 1, 2, 4, 10: Automatically Load ?map=, ?class=, ?stage=, ?grade=, ?timeMode=, ?customQuiz= & Register PWA ---
  let appInitialized = false;
  function initApp() {
    if (appInitialized) return;
    appInitialized = true;
    window.fireEscapeAPI = Object.assign(window.fireEscapeAPI || {}, {
      triggerStageClear: handleStageClear,
      triggerGameOver: handleGameOver,
      showMainTitleScreen
    });
    syncGoldenBellUI();
    syncSpeedDrillUI();
    syncCustomGearUI();

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
        if (teacherQrClassInput) teacherQrClassInput.value = currentClassCode;
        try {
          localStorage.setItem('fire_escape_class_code', currentClassCode);
        } catch (e) {}
      }
      const gradeParam = params.get('grade');
      if (gradeParam === 'low' || gradeParam === 'standard' || gradeParam === 'advanced') {
        applyGradePreset(gradeParam, false);
        if (teacherQrGradeSelect) teacherQrGradeSelect.value = gradeParam;
      }
      const timeParam = params.get('timeMode');
      if (timeParam === 'standard' || timeParam === 'relaxed' || timeParam === 'practice') {
        applyTimePolicyMode(timeParam);
        if (teacherQrTimeSelect) teacherQrTimeSelect.value = timeParam;
      }
      const stageParam = params.get('stage');
      if (stageParam === 'daily' && typeof generateDailyChallengeStage === 'function') {
        sharedCustomStage = generateDailyChallengeStage();
        if (teacherQrStageSelect) teacherQrStageSelect.value = 'daily';
      } else if (stageParam !== null && stageParam !== '') {
        const parsedStage = parseInt(stageParam, 10);
        if (!isNaN(parsedStage) && parsedStage >= 0 && parsedStage < STAGES.length) {
          initialStageIdx = parsedStage;
          if (teacherQrStageSelect) teacherQrStageSelect.value = String(parsedStage);
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
    updateCustomQuizFeedbackUI();
    renderBriefingSlide();
    updateSchoolRecordText();
    renderTeacherPresetQr();

    if (sharedCustomStage) {
      loadStage(0, true, sharedCustomStage);
      if (sharedCustomStage.isDailyChallenge) {
        overlayIcon.textContent = '🎲';
        overlaySubtitle.textContent = '수업 프리셋 · 오늘의 119 챌린지';
        overlayTitle.textContent = sharedCustomStage.name;
        overlayDesc.textContent = '선생님이 지정한 오늘의 119 돌발 재난 챌린지가 로드되었습니다! [게임 시작하기]를 눌러 탈출에 도전해 보세요.';
        btnPrimaryAction.textContent = '오늘의 챌린지 시작하기 ▶';
      } else {
        overlayIcon.textContent = '🛠️';
        overlaySubtitle.textContent = '공유받은 커스텀 대피도 맵';
        overlayTitle.textContent = '나만의 우리 집·교실 대피도 도전!';
        overlayDesc.textContent = '링크로 공유받은 커스텀 대피도 스테이지가 로드되었습니다! [게임 시작하기]를 눌러 탈출에 도전해 보세요.';
        btnPrimaryAction.textContent = '공유받은 커스텀 맵 시작하기 ▶';
      }
    } else {
      loadStage(initialStageIdx, true, null);
    }

    selectWorldCard('fire');
    syncContinueButtonUI();
    resizeCanvas();
    updateOverlaySelectionUI();

    // Automatically attempt Fullscreen on launch & on first user gesture so the web app runs in full screen from the start
    if (!navigator.webdriver) {
      requestGameFullscreen(true);
      let autoFsTriggered = false;
      const triggerInitialFullscreen = (ev) => {
        if (autoFsTriggered) return;
        if (ev && ev.target && typeof ev.target.closest === 'function') {
          if (ev.target.closest('[data-fullscreen-btn], #btnExitGameOverlay, #btnExitGameTop, #btnConfirmExitClose')) {
            return;
          }
        }
        autoFsTriggered = true;
        if (!isFullscreenActive()) {
          requestGameFullscreen(true);
        }
      };
      window.addEventListener('pointerdown', triggerInitialFullscreen, { once: true, passive: true });
      window.addEventListener('keydown', triggerInitialFullscreen, { once: true, passive: true });
    }

    // Feature 10: Register Offline PWA Service Worker
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
        if (reg && typeof reg.update === 'function') reg.update().catch(() => {});
      }).catch(() => {});
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
