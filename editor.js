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
    if (clean.includes('map=')) {
      const mapMatch = clean.match(/[?&]map=([^&#]+)/);
      if (mapMatch) {
        clean = mapMatch[1];
      } else if (clean.includes('?map=')) {
        clean = clean.split('?map=')[1].split(/[&#]/)[0];
      }
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

  // --- BFS Reachability Check from Player Start (1, 1) to Any Exit (with Key/Locked Door Verification) ---
  function validateCustomMapReachable(gridData, itemsData = []) {
    const dirs = [
      { dc: 1, dr: 0 },
      { dc: -1, dr: 0 },
      { dc: 0, dr: 1 },
      { dc: 0, dr: -1 }
    ];

    function canReachExit(ignoreLocks) {
      const unlockedDoors = new Set();
      const clearedDebris = new Set();
      const collectedKeys = new Set();
      let availableKeys = 0;
      let hasAxe = false;

      while (true) {
        const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
        const queue = [{ c: 1, r: 1 }];
        visited[1][1] = true;
        const frontierLockedDoors = [];
        const frontierDebris = [];
        let foundNewTool = false;

        while (queue.length > 0) {
          const { c, r } = queue.shift();
          const t = gridData[r][c];
          if (t === TILE.EXIT || t === TILE.PARTITION || t === TILE.LIFELINE) {
            return true;
          }

          // Check for keys or axe on this reachable tile
          itemsData.forEach((it, idx) => {
            if (it.c === c && it.r === r && !collectedKeys.has(idx)) {
              if (it.type === 'key') {
                collectedKeys.add(idx);
                availableKeys++;
                foundNewTool = true;
              } else if (it.type === 'axe') {
                collectedKeys.add(idx);
                hasAxe = true;
                foundNewTool = true;
              }
            }
          });

          for (const { dc, dr } of dirs) {
            const nc = c + dc;
            const nr = r + dr;
            if (nc <= 0 || nc >= COLS - 1 || nr <= 0 || nr >= ROWS - 1) continue;
            if (visited[nr][nc]) continue;
            const nt = gridData[nr][nc];
            const doorKey = `${nr},${nc}`;

            if (nt === TILE.LOCKED_DOOR && !ignoreLocks && !unlockedDoors.has(doorKey)) {
              frontierLockedDoors.push(doorKey);
              continue;
            }
            if (nt === TILE.DEBRIS && !ignoreLocks && !hasAxe && !clearedDebris.has(doorKey)) {
              frontierDebris.push(doorKey);
              continue;
            }

            const isPassable = (
              nt === TILE.FLOOR ||
              nt === TILE.DOOR ||
              nt === TILE.OPEN_DOOR ||
              nt === TILE.EXIT ||
              nt === TILE.PARTITION ||
              nt === TILE.LIFELINE ||
              (nt === TILE.LOCKED_DOOR && (ignoreLocks || unlockedDoors.has(doorKey))) ||
              (nt === TILE.DEBRIS && (ignoreLocks || hasAxe || clearedDebris.has(doorKey)))
            );
            if (isPassable) {
              visited[nr][nc] = true;
              queue.push({ c: nc, r: nr });
            }
          }
        }

        if (hasAxe && frontierDebris.length > 0) {
          for (const dk of frontierDebris) clearedDebris.add(dk);
          continue;
        }

        if (availableKeys > 0 && frontierLockedDoors.length > 0) {
          for (const dk of frontierLockedDoors) {
            if (!unlockedDoors.has(dk) && availableKeys > 0) {
              unlockedDoors.add(dk);
              availableKeys--;
            }
          }
          continue;
        }

        if (!foundNewTool) break;
      }

      return false;
    }

    if (canReachExit(false)) {
      return { ok: true };
    }
    if (canReachExit(true)) {
      const hasLockedDoor = gridData.some(row => row.includes(TILE.LOCKED_DOOR));
      const hasDebris = gridData.some(row => row.includes(TILE.DEBRIS));
      const hasKey = itemsData.some(it => it.type === 'key');
      const hasAxeItem = itemsData.some(it => it.type === 'axe');
      if (hasDebris && !hasAxeItem && (!hasLockedDoor || hasKey)) {
        return { ok: false, reason: 'missing_axe' };
      }
      return { ok: false, reason: 'missing_key' };
    }
    return { ok: false, reason: 'blocked' };
  }

  function createCustomStageObject(gridData, firesData, smokesData, itemsData) {
    const hasGasValve = Array.isArray(gridData) && gridData.some(row => Array.isArray(row) && row.includes(TILE.GAS_VALVE));
    const hasBreaker = Array.isArray(gridData) && gridData.some(row => Array.isArray(row) && row.includes(TILE.BREAKER));
    return {
      id: 99,
      name: '커스텀: 나만의 우리 집·교실 대피도',
      mission: '직접 설계한 커스텀 대피도에서 안전하게 비상구(EXIT·경량칸막이·완강기)로 탈출하세요!',
      curriculumFocus: '창작·설계 기반 재난 대피 동선 실습',
      difficultyStars: '★★★☆☆',
      difficultyLabel: '커스텀 대피도',
      requireGasClosed: hasGasValve,
      requireBreakerClosed: hasBreaker,
      requireWetTowelOrMask: Array.isArray(smokesData) && smokesData.length > 0,
      requireRescueNpc: Array.isArray(itemsData) && itemsData.some(it => it.type === 'npc'),
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
    const editorBgImageInput = document.getElementById('editorBgImageInput');
    const btnClearEditorBg = document.getElementById('btnClearEditorBg');
    const editorBgOpacityRange = document.getElementById('editorBgOpacityRange');
    const btnToggleEditor3D = document.getElementById('btnToggleEditor3D');

    let editorBrush = 'floor';
    let editorGrid = [];
    let editorFires = [];
    let editorSmokes = [];
    let editorItems = [];
    let editorBgImg = null;
    let editorBgOpacity = 0.45;
    let isEditor3DPreview = true; // Idea #8: Live 3D Isometric/Diorama Preview in Editor

    if (btnToggleEditor3D) {
      btnToggleEditor3D.addEventListener('click', () => {
        isEditor3DPreview = !isEditor3DPreview;
        btnToggleEditor3D.textContent = isEditor3DPreview
          ? '🧊 3D 실시간 입체뷰: 켜짐'
          : '🗺️ 2D 도면 뷰: 켜짐';
        drawEditorCanvas();
      });
    }

    if (editorBgImageInput) {
      editorBgImageInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            editorBgImg = img;
            drawEditorCanvas();
            if (callbacks && callbacks.showToast) {
              callbacks.showToast('📷 피난안내도 밑그림 사진이 적용되었습니다! 투명도를 조절하며 벽·비상구를 따라 그려보세요.');
            }
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });
    }
    if (btnClearEditorBg) {
      btnClearEditorBg.addEventListener('click', () => {
        editorBgImg = null;
        if (editorBgImageInput) editorBgImageInput.value = '';
        drawEditorCanvas();
        if (callbacks && callbacks.showToast) {
          callbacks.showToast('🗑️ 밑그림 사진을 지웠습니다.');
        }
      });
    }
    if (editorBgOpacityRange) {
      editorBgOpacityRange.addEventListener('input', () => {
        editorBgOpacity = Math.max(0.15, Math.min(0.85, Number(editorBgOpacityRange.value || 45) / 100));
        drawEditorCanvas();
      });
    }

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

      if (editorBgImg) {
        editorCtx.save();
        editorCtx.globalAlpha = editorBgOpacity;
        editorCtx.drawImage(editorBgImg, 0, 0, ew, eh);
        editorCtx.restore();
      }

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = editorGrid[r][c];
          const x = c * tw;
          const y = r * th;
          if (t === TILE.WALL) editorCtx.fillStyle = '#334155';
          else if (t === TILE.FURNITURE) editorCtx.fillStyle = '#451a03';
          else if (t === TILE.EXIT) editorCtx.fillStyle = '#059669';
          else if (t === TILE.HOT_DOOR) editorCtx.fillStyle = '#991b1b';
          else if (t === TILE.PHONE_119) editorCtx.fillStyle = '#581c87';
          else editorCtx.fillStyle = editorBgImg ? 'rgba(30, 41, 59, 0.55)' : (((r + c) & 1) ? '#1e293b' : '#172033');

          editorCtx.fillRect(x, y, tw - 0.8, th - 0.8);

          // Idea #8: Live 3D Extruded Isometric Preview for Walls, Furniture, Doors & Exits
          if (isEditor3DPreview) {
            if (t === TILE.WALL) {
              const ext = Math.max(4, th * 0.28);
              editorCtx.fillStyle = 'rgba(2, 6, 23, 0.45)';
              editorCtx.fillRect(x + 2, y + th - 2, tw, 4);
              editorCtx.fillStyle = '#64748b';
              editorCtx.fillRect(x, y - ext, tw - 0.8, th - ext * 0.35);
              editorCtx.fillStyle = '#334155';
              editorCtx.fillRect(x, y + th - ext * 1.35, tw - 0.8, ext * 1.35);
              editorCtx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
              editorCtx.lineWidth = 1;
              editorCtx.strokeRect(x + 0.5, y - ext + 0.5, tw - 1.8, th - ext * 0.35 - 1);
            } else if (t === TILE.FURNITURE || t === TILE.SINK || t === TILE.DEBRIS) {
              const ext = Math.max(3, th * 0.2);
              editorCtx.fillStyle = t === TILE.SINK ? '#38bdf8' : '#92400e';
              editorCtx.fillRect(x + 2, y - ext + 2, tw - 4, th - 4);
            } else if (t === TILE.EXIT) {
              editorCtx.strokeStyle = '#34d399';
              editorCtx.lineWidth = 2;
              editorCtx.strokeRect(x + 1.5, y + 1.5, tw - 3, th - 3);
            }
          }

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
          else if (t === TILE.PHONE_119) editorCtx.fillText('📞', x + tw / 2, y + th / 2);
          else if (t === TILE.GAS_VALVE) editorCtx.fillText('🔴', x + tw / 2, y + th / 2);
          else if (t === TILE.BREAKER) editorCtx.fillText('⚡', x + tw / 2, y + th / 2);
          else if (t === TILE.ELEVATOR) editorCtx.fillText('🛗', x + tw / 2, y + th / 2);
          else if (t === TILE.DEBRIS) editorCtx.fillText('🪵', x + tw / 2, y + th / 2);
          else if (t === TILE.HAZARD) editorCtx.fillText('⚠️', x + tw / 2, y + th / 2);
          else if (t === TILE.EXIT) editorCtx.fillText('🏃', x + tw / 2, y + th / 2);
        }
      }
      for (const s of editorSmokes) {
        if (isEditor3DPreview) {
          editorCtx.fillStyle = 'rgba(148, 163, 184, 0.32)';
          editorCtx.beginPath();
          editorCtx.arc((s.c + 0.5) * tw, (s.r + 0.5) * th, tw * 0.42, 0, Math.PI * 2);
          editorCtx.fill();
        }
        editorCtx.fillText('💨', (s.c + 0.5) * tw, (s.r + 0.5) * th);
      }
      for (const f of editorFires) {
        if (isEditor3DPreview) {
          editorCtx.fillStyle = 'rgba(249, 115, 22, 0.28)';
          editorCtx.beginPath();
          editorCtx.arc((f.c + 0.5) * tw, (f.r + 0.5) * th, tw * 0.48, 0, Math.PI * 2);
          editorCtx.fill();
        }
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
    let lastPaintC = -1;
    let lastPaintR = -1;

    function applyEditorBrushAt(clientX, clientY) {
      const local = typeof window.getElementLocalCoords === 'function'
        ? window.getElementLocalCoords(editorCanvas, clientX, clientY)
        : (() => {
            const rect = editorCanvas.getBoundingClientRect();
            return { x: clientX - rect.left, y: clientY - rect.top, width: rect.width, height: rect.height };
          })();
      const c = Math.floor((local.x / (local.width || 1)) * COLS);
      const r = Math.floor((local.y / (local.height || 1)) * ROWS);
      if (c <= 0 || c >= COLS - 1 || r <= 0 || r >= ROWS - 1) return;
      if (c === 1 && r === 1) return; // Keep player start tile clear
      if (c === lastPaintC && r === lastPaintR) return;
      lastPaintC = c;
      lastPaintR = r;

      // Idea #8: One-Click 3x3 Room + Fire Door Stamp Brush
      if (editorBrush === 'stamp_room') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr <= 0 || nr >= ROWS - 1 || nc <= 0 || nc >= COLS - 1) continue;
            if (nr === 1 && nc === 1) continue;
            const isBorder = Math.abs(dr) === 1 || Math.abs(dc) === 1;
            const isSouthDoor = dr === 1 && dc === 0;
            editorGrid[nr][nc] = isSouthDoor ? TILE.DOOR : (isBorder ? TILE.WALL : TILE.FLOOR);
          }
        }
        syncEditorCode();
        drawEditorCanvas();
        return;
      }

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
      else if (editorBrush === 'gas_valve') editorGrid[r][c] = TILE.GAS_VALVE;
      else if (editorBrush === 'breaker') editorGrid[r][c] = TILE.BREAKER;
      else if (editorBrush === 'debris') editorGrid[r][c] = TILE.DEBRIS;
      else if (editorBrush === 'bell') editorGrid[r][c] = TILE.ALARM_BELL;
      else if (editorBrush === 'phone_119') editorGrid[r][c] = TILE.PHONE_119;
      else if (editorBrush === 'exit') editorGrid[r][c] = TILE.EXIT;
      else if (editorBrush === 'fire') editorFires.push({ c, r, intensity: 1.0, fireType: 'normal' });
      else if (editorBrush === 'oil_fire') editorFires.push({ c, r, intensity: 1.0, fireType: 'oil' });
      else if (editorBrush === 'elec_fire') editorFires.push({ c, r, intensity: 1.0, fireType: 'electric' });
      else if (editorBrush === 'smoke') editorSmokes.push({ c, r });
      else if (editorBrush === 'extinguisher') editorItems.push({ c, r, type: 'extinguisher', name: '소화기', icon: '🧯', charges: 6 });
      else if (editorBrush === 'bucket') editorItems.push({ c, r, type: 'bucket', name: '물양동이', icon: '🪣', charges: 3 });
      else if (editorBrush === 'towel') editorItems.push({ c, r, type: 'towel', name: '마른 수건', icon: '🧣' });
      else if (editorBrush === 'mask') editorItems.push({ c, r, type: 'mask', name: '방연마스크', icon: '😷' });
      else if (editorBrush === 'flashlight') editorItems.push({ c, r, type: 'flashlight', name: '비상 손전등', icon: '🔦' });
      else if (editorBrush === 'axe') editorItems.push({ c, r, type: 'axe', name: '소방 도끼', icon: '🪓' });
      else if (editorBrush === 'key') editorItems.push({ c, r, type: 'key', name: '비상열쇠', icon: '🔑' });
      else if (editorBrush === 'npc') editorItems.push({ c, r, type: 'npc', name: '이웃/친구(구조)', icon: '🧒' });

      syncEditorCode();
      drawEditorCanvas();
    }

    editorCanvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      isEditorDrawing = true;
      lastPaintC = -1;
      lastPaintR = -1;
      applyEditorBrushAt(e.clientX, e.clientY);
    });
    editorCanvas.addEventListener('pointermove', (e) => {
      if (!isEditorDrawing) return;
      applyEditorBrushAt(e.clientX, e.clientY);
    });
    window.addEventListener('pointerup', () => {
      isEditorDrawing = false;
      lastPaintC = -1;
      lastPaintR = -1;
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

    const btnShowMapQr = document.getElementById('btnShowMapQr');
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    const qrCodeCanvas = document.getElementById('qrCodeCanvas');
    const qrCodeImg = document.getElementById('qrCodeImg');
    const qrShareUrlText = document.getElementById('qrShareUrlText');

    function drawFallbackQrMatrix(canvas, text) {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const size = 21;
      const cell = canvas.width / size;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      function drawFinder(ox, oy) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(ox * cell, oy * cell, 7 * cell, 7 * cell);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect((ox + 1) * cell, (oy + 1) * cell, 5 * cell, 5 * cell);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect((ox + 2) * cell, (oy + 2) * cell, 3 * cell, 3 * cell);
      }

      drawFinder(1, 1);
      drawFinder(size - 8, 1);
      drawFinder(1, size - 8);

      let h = 2166136261;
      for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      ctx.fillStyle = '#0f172a';
      for (let r = 1; r < size - 1; r++) {
        for (let c = 1; c < size - 1; c++) {
          const inFinderTL = r < 9 && c < 9;
          const inFinderTR = r < 9 && c >= size - 9;
          const inFinderBL = r >= size - 9 && c < 9;
          if (inFinderTL || inFinderTR || inFinderBL) continue;
          h ^= (r * 31 + c * 17) & 0xff;
          h = Math.imul(h, 16777619);
          if (((h >>> 8) & 1) === 1) {
            ctx.fillRect(c * cell, r * cell, Math.ceil(cell), Math.ceil(cell));
          }
        }
      }
    }

    if (btnShowMapQr && qrCodeContainer) {
      btnShowMapQr.addEventListener('click', () => {
        syncEditorCode();
        const code = editorMapCodeInput.value.trim();
        const baseUrl = window.location.origin && window.location.origin !== 'null'
          ? `${window.location.origin}${window.location.pathname}`
          : window.location.href.split('?')[0];
        const shareUrl = `${baseUrl}?map=${encodeURIComponent(code)}`;

        const isHidden = qrCodeContainer.classList.contains('hidden');
        if (!isHidden) {
          qrCodeContainer.classList.add('hidden');
          return;
        }
        qrCodeContainer.classList.remove('hidden');
        if (qrShareUrlText) {
          qrShareUrlText.textContent = shareUrl.slice(0, 68) + (shareUrl.length > 68 ? '...' : '');
        }
        drawFallbackQrMatrix(qrCodeCanvas, shareUrl);
        if (qrCodeImg) {
          qrCodeImg.classList.add('hidden');
          if (qrCodeCanvas) qrCodeCanvas.classList.remove('hidden');
          qrCodeImg.onload = () => {
            qrCodeImg.classList.remove('hidden');
            if (qrCodeCanvas) qrCodeCanvas.classList.add('hidden');
          };
          qrCodeImg.onerror = () => {
            qrCodeImg.classList.add('hidden');
            if (qrCodeCanvas) qrCodeCanvas.classList.remove('hidden');
          };
          qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=6&data=${encodeURIComponent(shareUrl)}`;
        }
        callbacks.showToast('📱 스마트기기 스캔용 대피도 QR코드가 생성되었습니다!');
      });
    }

    function loadFromRawCode(rawCode, silent = false) {
      try {
        const decoded = decodeMapData(rawCode);
        if (
          decoded &&
          Array.isArray(decoded.g) &&
          decoded.g.length === ROWS &&
          decoded.g.every(row => Array.isArray(row) && row.length === COLS)
        ) {
          editorGrid = decoded.g.map((row, r) =>
            row.map((val, c) => {
              if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) return TILE.WALL;
              if (r === 1 && c === 1) return TILE.FLOOR;
              return typeof val === 'number' ? val : TILE.FLOOR;
            })
          );
          editorFires = Array.isArray(decoded.f) ? decoded.f : [];
          editorSmokes = Array.isArray(decoded.s) ? decoded.s : [];
          editorItems = Array.isArray(decoded.i) ? decoded.i : [];
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

    // Feature 9: 3 Floor Plan Templates (Apartment 3-Bay / Detached House / School Classroom) + Homework PNG Export
    const btnTplApartment = document.getElementById('btnTplApartment');
    const btnTplHouse = document.getElementById('btnTplHouse');
    const btnTplSchool = document.getElementById('btnTplSchool');
    const btnDownloadMapPng = document.getElementById('btnDownloadMapPng');

    function applyFloorPlanTemplate(kind) {
      resetEditorGrid();
      if (kind === 'apartment') {
        // 3-Bay Apartment Floor Plan (3 Rooms + Central Living Room + South Balcony with Lifeline & Partition)
        editorGrid = [
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
          [1,0,0,0,1,0,5,0,1,0,0,2,0,0,1],
          [1,0,2,0,3,0,0,0,3,0,0,0,0,0,1],
          [1,1,3,1,1,1,3,1,1,1,1,3,1,1,1],
          [1,0,0,0,0,0,0,0,0,0,0,0,0,17,1],
          [1,0,2,0,0,0,2,0,0,0,0,2,0,7,1],
          [1,1,3,1,1,1,3,1,1,1,1,3,1,1,1],
          [1,0,0,0,3,0,0,0,3,0,0,0,0,13,1],
          [1,0,0,14,1,0,0,0,1,0,0,0,0,14,1],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];
        editorFires = [{ c: 7, r: 4, intensity: 1.0, fireType: 'oil' }];
        editorSmokes = [{ c: 6, r: 4 }, { c: 8, r: 4 }];
        editorItems = [
          { c: 2, r: 1, type: 'towel', name: '마른 수건', icon: '🧣' },
          { c: 4, r: 4, type: 'extinguisher', name: '소화기', icon: '🧯', charges: 6 },
          { c: 12, r: 1, type: 'npc', name: '가족', icon: '🧒' }
        ];
        callbacks.showToast('🏢 [아파트 3베이형 템플릿] 안방·작은방·거실·베란다(완강기·경량칸막이) 구조가 적용되었습니다!');
      } else if (kind === 'house') {
        // Detached / Villa Courtyard House Floor Plan
        editorGrid = [
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
          [1,0,0,5,1,0,0,0,0,1,0,0,2,0,1],
          [1,0,2,0,3,0,2,0,0,3,0,0,0,0,1],
          [1,0,0,0,1,1,3,1,1,1,1,3,1,1,1],
          [1,1,3,1,1,0,0,0,0,0,0,0,0,0,1],
          [1,0,0,0,3,0,0,2,0,0,0,2,0,17,1],
          [1,0,2,0,1,1,3,1,1,1,3,1,1,1,1],
          [1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
          [1,7,0,0,3,0,2,0,3,0,0,0,0,7,1],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];
        editorFires = [{ c: 8, r: 4, intensity: 1.0, fireType: 'normal' }];
        editorSmokes = [{ c: 7, r: 4 }, { c: 9, r: 4 }];
        editorItems = [
          { c: 2, r: 1, type: 'mask', name: '방연마스크', icon: '😷' },
          { c: 5, r: 4, type: 'extinguisher', name: '소화기', icon: '🧯', charges: 6 }
        ];
        callbacks.showToast('🏡 [단독·빌라 주택형 템플릿] 양방향 현관·뒷문 탈출구 구조가 적용되었습니다!');
      } else if (kind === 'school') {
        // Elementary / Middle School Classroom & Corridor Floor Plan
        editorGrid = [
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
          [1,0,0,5,1,0,0,0,0,1,0,0,0,0,1],
          [1,0,2,0,1,0,2,2,0,1,0,2,2,0,1],
          [1,0,0,0,1,0,2,2,0,1,0,2,2,0,1],
          [1,1,3,1,1,3,1,1,3,1,3,1,1,3,1],
          [1,17,0,0,0,0,0,0,0,0,0,0,0,0,1],
          [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
          [1,7,1,1,3,1,1,1,1,3,1,1,1,7,1],
          [1,0,1,1,0,0,2,0,0,0,0,2,1,0,1],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];
        editorFires = [{ c: 7, r: 5, intensity: 1.0, fireType: 'electric' }];
        editorSmokes = [{ c: 6, r: 5 }, { c: 8, r: 5 }];
        editorItems = [
          { c: 2, r: 1, type: 'towel', name: '마른 수건', icon: '🧣' },
          { c: 3, r: 5, type: 'extinguisher', name: '소화기', icon: '🧯', charges: 6 },
          { c: 12, r: 1, type: 'npc', name: '짝꿍 친구', icon: '🧒' }
        ];
        callbacks.showToast('🏫 [우리 학교 교실형 템플릿] 앞문·뒷문 복도와 양쪽 비상계단 구조가 적용되었습니다!');
      }
      syncEditorCode();
      drawEditorCanvas();
    }

    if (btnTplApartment) btnTplApartment.addEventListener('click', () => applyFloorPlanTemplate('apartment'));
    if (btnTplHouse) btnTplHouse.addEventListener('click', () => applyFloorPlanTemplate('house'));
    if (btnTplSchool) btnTplSchool.addEventListener('click', () => applyFloorPlanTemplate('school'));

    if (btnDownloadMapPng) {
      btnDownloadMapPng.addEventListener('click', () => {
        drawEditorCanvas();
        const outCanvas = document.createElement('canvas');
        outCanvas.width = 840;
        outCanvas.height = 640;
        const octx = outCanvas.getContext('2d');

        octx.fillStyle = '#0f172a';
        octx.fillRect(0, 0, outCanvas.width, outCanvas.height);
        octx.strokeStyle = '#38bdf8';
        octx.lineWidth = 4;
        octx.strokeRect(14, 14, outCanvas.width - 28, outCanvas.height - 28);

        octx.fillStyle = '#fbbf24';
        octx.font = 'bold 15px "Noto Sans KR", sans-serif';
        octx.textAlign = 'center';
        octx.fillText('2022 개정 교육과정 연계 · 가정·교실 연계 화재 안전 대피도 설계 과제', 420, 46);

        octx.fillStyle = '#ffffff';
        octx.font = '900 26px "Noto Sans KR", sans-serif';
        octx.fillText('🗺️ 내가 직접 만든 우리 집·교실 화재 비상 대피도', 420, 80);

        // Draw Editor Map scaled cleanly in center
        octx.drawImage(editorCanvas, 60, 100, 720, 440);
        octx.strokeStyle = '#64748b';
        octx.lineWidth = 2;
        octx.strokeRect(60, 100, 720, 440);

        // Legend & Family Safety Pledge Footer
        octx.fillStyle = '#cbd5e1';
        octx.font = 'bold 14px "Noto Sans KR", sans-serif';
        octx.fillText('범례: 🧍시작위치   🏃비상구(EXIT)   🚪방화문   🧯소화기   🚰세면대(젖은수건)   🪢완강기   🧱경량칸막이', 420, 568);

        octx.fillStyle = '#34d399';
        octx.font = 'bold 14px "Noto Sans KR", sans-serif';
        octx.fillText('✋ 안전 약속: "불이 나면 젖은 수건으로 코와 입을 막고 낮은 자세로 비상구까지 대피하겠습니다!"', 420, 598);

        try {
          const url = outCanvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = url;
          a.download = `우리집_화재대피도_${new Date().toISOString().slice(0, 10)}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          callbacks.showToast('🖼️ 내가 만든 화재 대피도 이미지(PNG)가 저장되었습니다! 학급 게시판에 제출해 보세요!', 'border-amber-400');
        } catch (e) {
          callbacks.showToast('⚠️ 대피도 이미지 저장 중 오류가 발생했습니다.', 'border-red-500');
        }
      });
    }

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

      // 2. Validate BFS path (including key availability for locked doors) from player start (1,1) to any exit
      const validation = validateCustomMapReachable(editorGrid, editorItems);
      if (!validation.ok) {
        if (validation.reason === 'missing_key') {
          callbacks.showToast('⚠️ 잠긴 문(🔒)으로만 출구가 연결되어 있는데 도달 가능한 열쇠(🔑)가 없습니다! 열쇠를 배치하거나 일반 방화문(🚪)으로 바꿔주세요.', 'border-amber-500');
        } else {
          callbacks.showToast('⚠️ 시작 위치(🧍)에서 비상구까지 이동할 수 있는 통로가 벽이나 가구로 완전히 막혀 있습니다! 통로를 열어주세요.', 'border-red-500');
        }
        return;
      }

      const customStage = createCustomStageObject(editorGrid, editorFires, editorSmokes, editorItems);
      callbacks.onPlayCustomStage(customStage, hasExit);
    });

    btnCloseMapEditor.addEventListener('click', () => {
      callbacks.onCloseEditor();
    });

    resetEditorGrid();

    window.FireEscape.drawFallbackQrMatrix = drawFallbackQrMatrix;

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
      loadFromRawCode,
      applyFloorPlanTemplate
    };
  }

  window.FireEscape.initMapEditor = initMapEditor;
})();
