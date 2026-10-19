(function () {
  'use strict';

  window.FireEscape = window.FireEscape || {};

  function normalizeAngleDiff(targetRad, currentRad) {
    let diff = targetRad - currentRad;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
  }

  // Improvement #4: 3-Second Floor Warning Renderer for DIORAMA_3D
  function drawPendingHazardsDiorama(ctx, pendingHazards, tileSize, now) {
    if (!Array.isArray(pendingHazards) || pendingHazards.length === 0) return;
    ctx.save();
    for (let i = 0; i < pendingHazards.length; i++) {
      const ph = pendingHazards[i];
      const x = ph.c * tileSize;
      const y = ph.r * tileSize;
      const pulse = 0.55 + 0.45 * Math.sin(now * 9.0 + i);
      const isFire = ph.kind === 'fire';

      ctx.fillStyle = isFire
        ? `rgba(239, 68, 68, ${0.22 + 0.16 * pulse})`
        : `rgba(245, 158, 11, ${0.20 + 0.14 * pulse})`;
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

      ctx.strokeStyle = isFire ? '#f87171' : '#fbbf24';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(x + 3, y + 3, tileSize - 6, tileSize - 6);
      ctx.setLineDash([]);

      ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.18))}px "Noto Sans KR", sans-serif`;
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`⚠️${Math.max(0.1, ph.timer).toFixed(1)}s`, x + tileSize * 0.5, y + tileSize * 0.5);
    }
    ctx.restore();
  }

  // Improvement #4: 3-Second Floor Warning Renderer for FPS_3D
  function drawPendingHazardsFPS(ctx, pendingHazards, projectClipped3DPolygon, project3DPoint, isPointVisibleInZBuffer, now) {
    if (!Array.isArray(pendingHazards) || pendingHazards.length === 0) return;
    ctx.save();
    for (let i = 0; i < pendingHazards.length; i++) {
      const ph = pendingHazards[i];
      const poly = projectClipped3DPolygon(
        [
          [ph.c + 0.10, ph.r + 0.10, 0.012],
          [ph.c + 0.90, ph.r + 0.10, 0.012],
          [ph.c + 0.90, ph.r + 0.90, 0.012],
          [ph.c + 0.10, ph.r + 0.90, 0.012]
        ],
        0.16
      );
      if (poly) {
        const pulse = 0.55 + 0.45 * Math.sin(now * 9.0 + i);
        ctx.fillStyle = ph.kind === 'fire'
          ? `rgba(239, 68, 68, ${0.26 + 0.18 * pulse})`
          : `rgba(245, 158, 11, ${0.24 + 0.16 * pulse})`;
        ctx.strokeStyle = ph.kind === 'fire' ? '#f87171' : '#fbbf24';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(poly[0].x, poly[0].y);
        for (let k = 1; k < poly.length; k++) ctx.lineTo(poly[k].x, poly[k].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      const cp = project3DPoint(ph.c + 0.5, ph.r + 0.5, 0.18);
      if (cp && cp.depth < 6.5 && (!isPointVisibleInZBuffer || isPointVisibleInZBuffer(cp.x, cp.depth - 0.1))) {
        ctx.font = `bold ${Math.max(10, Math.min(15, Math.floor(20 / cp.depth)))}px "Noto Sans KR", sans-serif`;
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`⚠️확산예고(${Math.max(0.1, ph.timer).toFixed(1)}s)`, cp.x, cp.y);
      }
    }
    ctx.restore();
  }

  // Improvement #5: 3D Top Compass Bar & Objective Bearing HUD in FPS_3D
  function draw3DCompassBar(ctx, width, height, state) {
    if (!state) return;
    const { player, fpsCamYaw, nextObj } = state;
    const barW = Math.min(310, Math.max(200, width * 0.42));
    const barH = 24;
    const barX = (width - barW) * 0.5;
    const barY = 8;
    const halfSpanRad = Math.PI * 0.55;

    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.86)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 1.3;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeRect(barX, barY, barW, barH);

    // Center heading tick
    const centerX = barX + barW * 0.5;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, barY);
    ctx.lineTo(centerX, barY + 5);
    ctx.stroke();

    // Cardinal bearings (In grid coordinates: E = 0, S = PI/2, W = PI, N = -PI/2)
    const cardinals = [
      { label: '북(N)', ang: -Math.PI * 0.5, col: '#fca5a5' },
      { label: '동(E)', ang: 0, col: '#cbd5e1' },
      { label: '남(S)', ang: Math.PI * 0.5, col: '#cbd5e1' },
      { label: '서(W)', ang: Math.PI, col: '#cbd5e1' }
    ];
    ctx.font = 'bold 10px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < cardinals.length; i++) {
      const c = cardinals[i];
      const diff = normalizeAngleDiff(c.ang, fpsCamYaw);
      if (Math.abs(diff) <= halfSpanRad) {
        const cx = centerX + (diff / halfSpanRad) * (barW * 0.44);
        ctx.fillStyle = c.col;
        ctx.fillText(c.label, cx, barY + barH * 0.52);
      }
    }

    // Objective Bearing Marker on Compass Bar
    if (nextObj && player) {
      const dx = (nextObj.c + 0.5) - player.x;
      const dy = (nextObj.r + 0.5) - player.y;
      const dist = Math.hypot(dx, dy);
      const targetYaw = Math.atan2(dy, dx);
      const diff = normalizeAngleDiff(targetYaw, fpsCamYaw);
      const clampedRatio = Math.max(-0.46, Math.min(0.46, diff / halfSpanRad));
      const markerX = centerX + clampedRatio * barW;

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(markerX, barY + barH * 0.5, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px sans-serif';
      const arrowHint = diff < -halfSpanRad ? '◀' : (diff > halfSpanRad ? '▶' : '🎯');
      ctx.fillText(arrowHint, markerX, barY + barH * 0.52);

      // Tiny distance tag on right side of compass
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 9.5px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${dist.toFixed(1)}m`, barX + barW - 5, barY + barH * 0.52);
    }

    // Left M-key map hint tag
    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 9px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('[M]지도', barX + 5, barY + barH * 0.52);

    ctx.restore();
  }

  function getTacticalMapLayout(width, height, cols, rows) {
    const padX = Math.max(24, width * 0.08);
    const padY = Math.max(42, height * 0.11);
    const maxW = width - padX * 2;
    const maxH = height - padY * 2 - 28;
    const tileS = Math.max(12, Math.min(maxW / cols, maxH / rows));
    const mapW = tileS * cols;
    const mapH = tileS * rows;
    const mapX = (width - mapW) * 0.5;
    const mapY = (height - mapH) * 0.5 + 6;
    return { mapX, mapY, mapW, mapH, tileS };
  }

  function getTacticalMapTileAt(localX, localY, width, height, cols, rows) {
    const { mapX, mapY, mapW, mapH, tileS } = getTacticalMapLayout(width, height, cols, rows);
    if (localX < mapX || localX > mapX + mapW || localY < mapY || localY > mapY + mapH) {
      return null;
    }
    const gx = (localX - mapX) / tileS;
    const gy = (localY - mapY) / tileS;
    const c = Math.max(0, Math.min(cols - 1, Math.floor(gx)));
    const r = Math.max(0, Math.min(rows - 1, Math.floor(gy)));
    return { gx, gy, c, r };
  }

  // Improvement #5: Full-Screen Tactical Building Blueprint Map Overlay (Toggled by 'M' Key or Radar Click)
  function drawFullTacticalMapOverlay(ctx, width, height, state) {
    if (!state || !state.grid) return;
    const {
      grid,
      cols,
      rows,
      TILE,
      player,
      fpsCamYaw,
      fires,
      smokes,
      pendingHazards,
      items,
      nextObj,
      escapePath,
      stageName,
      roomLabels
    } = state;

    const { mapX, mapY, mapW, mapH, tileS } = getTacticalMapLayout(width, height, cols, rows);

    ctx.save();
    // Backdrop dim
    ctx.fillStyle = 'rgba(2, 6, 23, 0.84)';
    ctx.fillRect(0, 0, width, height);

    // Outer tactical blueprint frame
    ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.fillRect(mapX - 14, mapY - 36, mapW + 28, mapH + 68);
    ctx.strokeRect(mapX - 14, mapY - 36, mapW + 28, mapH + 68);

    // Header title
    ctx.fillStyle = '#e0f2fe';
    ctx.font = 'bold 13px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🗺️ 전술 피난안내도 — ${stageName || '현재 구역'} (타일 클릭 시 자동 이동 · 닫기: M키 또는 바깥 클릭)`, mapX - 4, mapY - 18);

    // Draw grid tiles
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = grid[r][c];
        const tx = mapX + c * tileS;
        const ty = mapY + r * tileS;

        if (t === TILE.WALL) ctx.fillStyle = '#475569';
        else if (t === TILE.EXIT) ctx.fillStyle = '#059669';
        else if (t === TILE.LOCKED_DOOR) ctx.fillStyle = '#ca8a04';
        else if (t === TILE.DOOR) ctx.fillStyle = '#b45309';
        else if (t === TILE.OPEN_DOOR) ctx.fillStyle = '#0d9488';
        else if (t === TILE.HOT_DOOR) ctx.fillStyle = '#dc2626';
        else if (t === TILE.SINK) ctx.fillStyle = '#0284c7';
        else if (t === TILE.FURNITURE) ctx.fillStyle = '#78350f';
        else if (t === TILE.DEBRIS) ctx.fillStyle = '#9a3412';
        else ctx.fillStyle = '#1e293b';

        ctx.fillRect(tx, ty, tileS - 0.8, tileS - 0.8);

        if (t === TILE.EXIT) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(8, Math.floor(tileS * 0.34))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('EXIT', tx + tileS * 0.5, ty + tileS * 0.52);
        } else if (t === TILE.LOCKED_DOOR || t === TILE.DOOR || t === TILE.OPEN_DOOR) {
          ctx.font = `${Math.max(9, Math.floor(tileS * 0.42))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(t === TILE.LOCKED_DOOR ? '🔒' : '🚪', tx + tileS * 0.5, ty + tileS * 0.52);
        } else if (t === TILE.GAS_VALVE || t === TILE.BREAKER || t === TILE.ALARM_BELL || t === TILE.PHONE_119) {
          const ico = t === TILE.GAS_VALVE ? '🔴' : (t === TILE.BREAKER ? '⚡' : (t === TILE.ALARM_BELL ? '🔔' : '📞'));
          ctx.font = `${Math.max(9, Math.floor(tileS * 0.45))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(ico, tx + tileS * 0.5, ty + tileS * 0.52);
        }
      }
    }

    // Pending hazards
    if (Array.isArray(pendingHazards)) {
      for (const ph of pendingHazards) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(mapX + ph.c * tileS + 2, mapY + ph.r * tileS + 2, tileS - 4, tileS - 4);
      }
    }

    // Smoke & Fire overlays
    if (Array.isArray(smokes)) {
      for (const s of smokes) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.38)';
        ctx.beginPath();
        ctx.arc(mapX + (s.c + 0.5) * tileS, mapY + (s.r + 0.5) * tileS, tileS * 0.36, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (Array.isArray(fires)) {
      for (const f of fires) {
        ctx.font = `${Math.max(10, Math.floor(tileS * 0.52))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.fireType === 'oil' ? '🍳' : (f.fireType === 'electric' ? '⚡' : '🔥'), mapX + (f.c + 0.5) * tileS, mapY + (f.r + 0.5) * tileS);
      }
    }

    // Items & Trapped NPCs
    if (Array.isArray(items)) {
      for (const it of items) {
        ctx.font = `${Math.max(10, Math.floor(tileS * 0.50))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(it.icon || '📦', mapX + (it.c + 0.5) * tileS, mapY + (it.r + 0.5) * tileS);
      }
    }

    // Shortest Golden Escape Route
    if (Array.isArray(escapePath) && escapePath.length > 0 && player) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.6;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(mapX + player.x * tileS, mapY + player.y * tileS);
      for (const node of escapePath) {
        ctx.lineTo(mapX + (node.c + 0.5) * tileS, mapY + (node.r + 0.5) * tileS);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Room Labels
    if (Array.isArray(roomLabels)) {
      ctx.font = `bold ${Math.max(9, Math.floor(tileS * 0.32))}px "Noto Sans KR", sans-serif`;
      ctx.textAlign = 'center';
      for (const rl of roomLabels) {
        const rx = mapX + rl.c * tileS;
        const ry = mapY + rl.r * tileS;
        ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
        const tw = ctx.measureText(rl.text).width + 8;
        ctx.fillRect(rx - tw * 0.5, ry - 8, tw, 16);
        ctx.fillStyle = '#bae6fd';
        ctx.fillText(rl.text, rx, ry);
      }
    }

    // Player Marker & FOV Cone
    if (player) {
      const px = mapX + player.x * tileS;
      const py = mapY + player.y * tileS;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.arc(px, py, tileS * 1.9, (fpsCamYaw || 0) - 0.45, (fpsCamYaw || 0) + 0.45);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(5, tileS * 0.28), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Legend footer
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    const objLabel = nextObj ? `🎯 현재 목표: ${nextObj.label}` : '🏃 비상구(EXIT)로 이동하세요';
    ctx.fillText(`${objLabel}   |   🔵 내 위치   |   🟡 추천 최단 탈출 경로   |   🔥 화염 · ⚠️ 확산예고`, mapX + mapW * 0.5, mapY + mapH + 18);

    ctx.restore();
  }

  window.FireEscape.Tactical3D = {
    drawPendingHazardsDiorama,
    drawPendingHazardsFPS,
    draw3DCompassBar,
    drawFullTacticalMapOverlay,
    getTacticalMapTileAt
  };
})();
