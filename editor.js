(function () {
  'use strict';

  window.FireEscape = window.FireEscape || {};
  const { TILE, COLS, ROWS } = window.FireEscape;

  // --- Modern UTF-8 Base64 Encode / Decode (Replaces deprecated escape/unescape) ---
  function encodeMapData(obj) {
    const jsonStr = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(jsonStr);
    let binStr = '';
    for (let i = 0; i < bytes.length; i++) {
      binStr += String.fromCharCode(bytes[i]);
    }
    return btoa(binStr);
  }

  function decodeMapData(rawInput) {
    let clean = (rawInput || '').trim();
    if (clean.includes('?map=')) {
      clean = clean.split('?map=')[1].split('&')[0];
    }
    clean = decodeURIComponent(clean);
    const binStr = atob(clean);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr);
  }

  // --- BFS Reachability Check from Player Start (1, 1) to Any Exit ---
  function validateCustomMapReachable(gridData) {
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const queue = [{ c: 1, r: 1 }];
    visited[1][1] = true;

    const dirs = [
      { dc: 1, dr: 0 },
      { dc: -1, dr: 0 },
      { dc: 0, dr: 1 },
      { dc: 0, dr: -1 }
    ];

    while (queue.length > 0) {
      const { c, r } = queue.shift();
      const t = gridData[r][c];
      if (t === TILE.EXIT || t === TILE.PARTITION || t === TILE.LIFELINE) {
        return true;
      }
      for (const { dc, dr } of dirs) {
        const nc = c + dc;
        const nr = r + dr;
        if (nc <= 0 || nc >= COLS - 1 || nr <= 0 || nr >= ROWS - 1) continue;
        if (visited[nr][nc]) continue;
        const nt = gridData[nr][nc];
        // Walls, furniture, sinks, elevators, and alarm bells block movement; doors/exits/floors are passable
        const isPassable = (
          nt === TILE.FLOOR ||
          nt === TILE.DOOR ||
          nt === TILE.OPEN_DOOR ||
          nt === TILE.LOCKED_DOOR ||
          nt === TILE.EXIT ||
          nt === TILE.PARTITION ||
          nt === TILE.LIFELINE ||
          nt === TILE.DEBRIS
        );
        if (isPassable) {
          visited[nr][nc] = true;
          queue.push({ c: nc, r: nr });
        }
      }
    }
    return false;
  }

  function createCustomStageObject(gridData, firesData, smokesData, itemsData) {
    return {
      id: 99,
      name: '커스텀: 나만의 우리 집·교실 대피도',
      mission: '직접 설계한 커스텀 대피도에서 안전하게 비상구(EXIT·경량칸막이·완강기)로 탈출하세요!',
      curriculumFocus: '창작·설계 기반 재난 대피 동선 실습',
      map: gridData.map(row => [...row]),
      playerStart: { x: 1.5, y: 1.5 },
      guideSigns: [],
      fires: firesData.map(f => ({ ...f })),
      smokes: smokesData.map(s => ({ ...s })),
      items: itemsData.map(it => ({ ...it }))
    };
  }

  function initMapEditor(callbacks) {
    const mapEditorModal = document.getElementById('mapEditorModal');
    const btnCloseMapEditor = document.getElementById('btnCloseMapEditor');
    const editorCanvas = document.getElementById('editorCanvas');
    const editorCtx = editorCanvas.getContext('2d');
    const editorMapCodeInput = document.getElementById('editorMapCodeInput');
    const btnCopyMapCode = document.getElementById('btnCopyMapCode');
    const btnCopyMapUrl = document.getElementById('btnCopyMapUrl');
    const btnLoadMapCode = document.getElementById('btnLoadMapCode');
    const btnPlayCustomMap = document.getElementById('btnPlayCustomMap');
    const btnResetCustomMap = document.getElementById('btnResetCustomMap');

    let editorBrush = 'floor';
    let editorGrid = [];
    let editorFires = [];
    let editorSmokes = [];
    let editorItems = [];

    function syncEditorCode() {
      const data = { g: editorGrid, f: editorFires, s: editorSmokes, i: editorItems };
      try {
        editorMapCodeInput.value = encodeMapData(data);
      } catch (e) {}
    }

    function drawEditorCanvas() {
      const ew = editorCanvas.width;
      const eh = editorCanvas.height;
      const tw = ew / COLS;
      const th = eh / ROWS;

      editorCtx.fillStyle = '#0f172a';
      editorCtx.fillRect(0, 0, ew, eh);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = editorGrid[r][c];
          const x = c * tw;
          const y = r * th;
          if (t === TILE.WALL) editorCtx.fillStyle = '#334155';
          else if (t === TILE.FURNITURE) editorCtx.fillStyle = '#451a03';
          else if (t === TILE.EXIT) editorCtx.fillStyle = '#059669';
          else if (t === TILE.HOT_DOOR) editorCtx.fillStyle = '#991b1b';
          else editorCtx.fillStyle = '#1e293b';

          editorCtx.fillRect(x, y, tw - 1, th - 1);
          editorCtx.font = '13px sans-serif';
          editorCtx.textAlign = 'center';
          editorCtx.textBaseline = 'middle';
          if (t === TILE.DOOR) editorCtx.fillText('🚪', x + tw / 2, y + th / 2);
          else if (t === TILE.LOCKED_DOOR) editorCtx.fillText('🔒', x + tw / 2, y + th / 2);
          else if (t === TILE.HOT_DOOR) editorCtx.fillText('🌡️', x + tw / 2, y + th / 2);
          else if (t === TILE.FURNITURE) editorCtx.fillText('🪑', x + tw / 2, y + th / 2);
          else if (t === TILE.PARTITION) editorCtx.fillText('🧱', x + tw / 2, y + th / 2);
          else if (t === TILE.LIFELINE) editorCtx.fillText('🪢', x + tw / 2, y + th / 2);
          else if (t === TILE.SINK) editorCtx.fillText('🚰', x + tw / 2, y + th / 2);
          else if (t === TILE.ALARM_BELL) editorCtx.fillText('🔔', x + tw / 2, y + th / 2);
          else if (t === TILE.EXIT) editorCtx.fillText('🏃', x + tw / 2, y + th / 2);
        }
      }
      for (const s of editorSmokes) {
        editorCtx.fillText('💨', (s.c + 0.5) * tw, (s.r + 0.5) * th);
      }
      for (const f of editorFires) {
        const icon = f.fireType === 'oil' ? '🍳' : (f.fireType === 'electric' ? '⚡' : '🔥');
        editorCtx.fillText(icon, (sOrFCoord(f.c)) * tw, (sOrFCoord(f.r)) * th);
      }
      for (const it of editorItems) {
        editorCtx.fillText(it.icon, (it.c + 0.5) * tw, (it.r + 0.5) * th);
      }
      editorCtx.fillText('🧍', 1.5 * tw, 1.5 * th);
    }

    function sOrFCoord(val) {
      return val + 0.5;
    }

    function resetEditorGrid() {
      editorGrid = [];
      for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
          if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) row.push(TILE.WALL);
          else row.push(TILE.FLOOR);
        }
        editorGrid.push(row);
      }
      editorGrid[1][3] = TILE.SINK;
      editorGrid[8][13] = TILE.EXIT;
      editorGrid[1][13] = TILE.PARTITION;
      editorGrid[5][2] = TILE.ALARM_BELL;
      editorFires = [{ c: 7, r: 5, intensity: 1.0, fireType: 'normal' }];
      editorSmokes = [{ c: 6, r: 5 }, { c: 8, r: 5 }];
      editorItems = [
        { c: 2, r: 2, type: 'extinguisher', name: '소화기', icon: '🧯', charges: 6 },
        { c: 4, r: 2, type: 'mask', name: '방연마스크', icon: '😷' }
      ];
      syncEditorCode();
      drawEditorCanvas();
    }

    document.querySelectorAll('.editor-brush').forEach((btn) => {
      btn.addEventListener('click', () => {
        editorBrush = btn.getAttribute('data-brush');
        document.querySelectorAll('.editor-brush').forEach(b => {
          b.className = 'editor-brush px-2 py-1 rounded bg-slate-800 text-slate-200';
        });
        btn.className = 'editor-brush px-2 py-1 rounded bg-orange-600 text-white font-bold';
      });
    });

    let isEditorDrawing = false;
    function applyEditorBrushAt(clientX, clientY) {
      const rect = editorCanvas.getBoundingClientRect();
      const c = Math.floor(((clientX - rect.left) / rect.width) * COLS);
      const r = Math.floor(((clientY - rect.top) / rect.height) * ROWS);
      if (c <= 0 || c >= COLS - 1 || r <= 0 || r >= ROWS - 1) return;
      if (c === 1 && r === 1) return; // Keep player start tile clear

      editorFires = editorFires.filter(f => !(f.c === c && f.r === r));
      editorSmokes = editorSmokes.filter(s => !(s.c === c && s.r === r));
      editorItems = editorItems.filter(i => !(i.c === c && i.r === r));
      editorGrid[r][c] = TILE.FLOOR;

      if (editorBrush === 'wall') editorGrid[r][c] = TILE.WALL;
      else if (editorBrush === 'furniture') editorGrid[r][c] = TILE.FURNITURE;
      else if (editorBrush === 'door') editorGrid[r][c] = TILE.DOOR;
      else if (editorBrush === 'locked_door') editorGrid[r][c] = TILE.LOCKED_DOOR;
      else if (editorBrush === 'hot_door') editorGrid[r][c] = TILE.HOT_DOOR;
      else if (editorBrush === 'partition') editorGrid[r][c] = TILE.PARTITION;
      else if (editorBrush === 'lifeline') editorGrid[r][c] = TILE.LIFELINE;
      else if (editorBrush === 'sink') editorGrid[r][c] = TILE.SINK;
      else if (editorBrush === 'bell') editorGrid[r][c] = TILE.ALARM_BELL;
      else if (editorBrush === 'exit') editorGrid[r][c] = TILE.EXIT;
      else if (editorBrush === 'fire') editorFires.push({ c, r, intensity: 1.0, fireType: 'normal' });
      else if (editorBrush === 'oil_fire') editorFires.push({ c, r, intensity: 1.0, fireType: 'oil' });
      else if (editorBrush === 'elec_fire') editorFires.push({ c, r, intensity: 1.0, fireType: 'electric' });
      else if (editorBrush === 'smoke') editorSmokes.push({ c, r });
      else if (editorBrush === 'extinguisher') editorItems.push({ c, r, type: 'extinguisher', name: '소화기', icon: '🧯', charges: 6 });
      else if (editorBrush === 'mask') editorItems.push({ c, r, type: 'mask', name: '방연마스크', icon: '😷' });
      else if (editorBrush === 'key') editorItems.push({ c, r, type: 'key', name: '비상열쇠', icon: '🔑' });

      syncEditorCode();
      drawEditorCanvas();
    }

    editorCanvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      isEditorDrawing = true;
      applyEditorBrushAt(e.clientX, e.clientY);
    });
    editorCanvas.addEventListener('pointermove', (e) => {
      if (!isEditorDrawing) return;
      applyEditorBrushAt(e.clientX, e.clientY);
    });
    window.addEventListener('pointerup', () => {
      isEditorDrawing = false;
    });

    function copyTextWithFallback(text, successMsg) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          callbacks.showToast(successMsg);
        }).catch(() => {
          editorMapCodeInput.value = text;
          editorMapCodeInput.select();
          try { document.execCommand('copy'); } catch (e) {}
          callbacks.showToast(successMsg);
        });
      } else {
        editorMapCodeInput.value = text;
        editorMapCodeInput.select();
        try { document.execCommand('copy'); } catch (e) {}
        callbacks.showToast(successMsg);
      }
    }

    btnCopyMapCode.addEventListener('click', () => {
      syncEditorCode();
      copyTextWithFallback(editorMapCodeInput.value.trim(), '📋 커스텀 대피도 맵 코드가 클립보드에 복사되었습니다!');
    });

    if (btnCopyMapUrl) {
      btnCopyMapUrl.addEventListener('click', () => {
        syncEditorCode();
        const code = editorMapCodeInput.value.trim();
        const baseUrl = window.location.origin && window.location.origin !== 'null'
          ? `${window.location.origin}${window.location.pathname}`
          : window.location.href.split('?')[0];
        const shareUrl = `${baseUrl}?map=${encodeURIComponent(code)}`;
        copyTextWithFallback(shareUrl, '🔗 커스텀 맵 공유 링크(?map=...)가 클립보드에 복사되었습니다!');
      });
    }

    function loadFromRawCode(rawCode, silent = false) {
      try {
        const decoded = decodeMapData(rawCode);
        if (decoded && Array.isArray(decoded.g) && decoded.g.length === ROWS) {
          editorGrid = decoded.g;
          editorFires = decoded.f || [];
          editorSmokes = decoded.s || [];
          editorItems = decoded.i || [];
          syncEditorCode();
          drawEditorCanvas();
          if (!silent) {
            callbacks.showToast('📥 커스텀 맵 코드를 성공적으로 불러왔습니다!');
          }
          return createCustomStageObject(editorGrid, editorFires, editorSmokes, editorItems);
        }
        if (!silent) callbacks.showToast('⚠️ 맵 규격이 올바르지 않습니다.', 'border-red-500');
      } catch (e) {
        if (!silent) callbacks.showToast('⚠️ 올바른 맵 코드가 아닙니다.', 'border-red-500');
      }
      return null;
    }

    btnLoadMapCode.addEventListener('click', () => {
      loadFromRawCode(editorMapCodeInput.value);
    });

    btnResetCustomMap.addEventListener('click', resetEditorGrid);

    btnPlayCustomMap.addEventListener('click', () => {
      // 1. Ensure at least one exit exists
      let hasExit = false;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = editorGrid[r][c];
          if (t === TILE.EXIT || t === TILE.PARTITION || t === TILE.LIFELINE) {
            hasExit = true;
          }
        }
      }
      if (!hasExit) {
        editorGrid[ROWS - 2][COLS - 2] = TILE.EXIT;
        syncEditorCode();
        drawEditorCanvas();
      }

      // 2. Validate BFS path from player start (1,1) to any exit
      if (!validateCustomMapReachable(editorGrid)) {
        callbacks.showToast('⚠️ 시작 위치(🧍)에서 비상구까지 이동할 수 있는 통로가 벽이나 가구로 완전히 막혀 있습니다! 통로를 열어주세요.', 'border-red-500');
        return;
      }

      const customStage = createCustomStageObject(editorGrid, editorFires, editorSmokes, editorItems);
      callbacks.onPlayCustomStage(customStage, hasExit);
    });

    btnCloseMapEditor.addEventListener('click', () => {
      callbacks.onCloseEditor();
    });

    resetEditorGrid();

    return {
      open() {
        if (editorGrid.length === 0) resetEditorGrid();
        mapEditorModal.classList.remove('hidden');
        mapEditorModal.classList.add('flex');
        drawEditorCanvas();
      },
      close() {
        mapEditorModal.classList.add('hidden');
        mapEditorModal.classList.remove('flex');
      },
      loadFromRawCode
    };
  }

  window.FireEscape.initMapEditor = initMapEditor;
})();
