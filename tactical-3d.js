(function () {
  'use strict';

  window.FireEscape = window.FireEscape || {};

  function normalizeAngleDiff(targetRad, currentRad) {
    let diff = targetRad - currentRad;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
  }

  // --- Idea #2: 3D Door Swing & Thermal Ripple Animation Registry ---
  const doorAnims = new Map(); // key: "r,c" -> { r, c, type: 'open'|'close'|'hot_wave'|'cool_wave', progress: 0..1, timer: 0..1 }
  let lifelineAnim = null; // { active: true, timer: 0, duration: 1.4, r, c }

  function triggerDoorAnim(r, c, type = 'open') {
    doorAnims.set(`${r},${c}`, {
      r,
      c,
      type,
      progress: 0,
      timer: 0,
      duration: type === 'hot_wave' || type === 'cool_wave' ? 0.95 : 0.48
    });
  }

  function getDoorSwingRatio(r, c, isOpenTile) {
    const entry = doorAnims.get(`${r},${c}`);
    if (!entry) return isOpenTile ? 1 : 0;
    const t = Math.min(1, Math.max(0, entry.progress));
    // Smooth ease-out cubic
    const eased = 1 - Math.pow(1 - t, 3);
    if (entry.type === 'open') return eased;
    if (entry.type === 'close') return 1 - eased;
    return isOpenTile ? 1 : 0;
  }

  function triggerLifelineDescent(r, c) {
    lifelineAnim = {
      active: true,
      timer: 0,
      duration: 1.35,
      r,
      c
    };
  }

  function updateAnimations(dt) {
    for (const [key, anim] of doorAnims.entries()) {
      anim.timer += dt;
      anim.progress = Math.min(1, anim.timer / (anim.duration || 0.5));
      if (anim.timer >= (anim.duration || 0.5) + 0.25) {
        doorAnims.delete(key);
      }
    }
    if (lifelineAnim && lifelineAnim.active) {
      lifelineAnim.timer += dt;
      if (lifelineAnim.timer >= lifelineAnim.duration) {
        lifelineAnim.active = false;
      }
    }
    if (typeof updateDynamic3DLod === 'function') {
      updateDynamic3DLod(dt);
    }
  }

  function drawDoorEffectsDiorama(ctx, tileSize, now) {
    if (doorAnims.size === 0) return;
    ctx.save();
    for (const anim of doorAnims.values()) {
      const cx = (anim.c + 0.5) * tileSize;
      const cy = (anim.r + 0.5) * tileSize;
      const p = anim.progress;
      if (anim.type === 'hot_wave' || anim.type === 'cool_wave') {
        const isHot = anim.type === 'hot_wave';
        const rad = tileSize * (0.28 + p * 0.65);
        ctx.strokeStyle = isHot
          ? `rgba(239, 68, 68, ${(1 - p) * 0.92})`
          : `rgba(56, 189, 248, ${(1 - p) * 0.88})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = `bold ${Math.max(10, Math.floor(tileSize * 0.22))}px "Noto Sans KR", sans-serif`;
        ctx.fillStyle = isHot ? '#fca5a5' : '#bae6fd';
        ctx.textAlign = 'center';
        ctx.fillText(isHot ? '🔥고열 감지!' : '❄️안전 확인!', cx, cy - tileSize * (0.4 + p * 0.25));
      } else {
        // Door swing arc indicator
        const startAng = anim.type === 'open' ? 0 : -Math.PI * 0.5;
        const endAng = anim.type === 'open' ? -Math.PI * 0.5 * p : -Math.PI * 0.5 * (1 - p);
        ctx.strokeStyle = `rgba(250, 204, 21, ${(1 - p * 0.7) * 0.8})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.arc(cx - tileSize * 0.35, cy, tileSize * 0.65, Math.min(startAng, endAng), Math.max(startAng, endAng));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  function drawDoorEffectsFPS(ctx, project3DPoint, isPointVisibleInZBuffer) {
    if (doorAnims.size === 0) return;
    ctx.save();
    for (const anim of doorAnims.values()) {
      const pt = project3DPoint(anim.c + 0.5, anim.r + 0.5, 0.52);
      if (!pt || pt.depth > 7.5) continue;
      if (isPointVisibleInZBuffer && !isPointVisibleInZBuffer(pt.x, pt.depth - 0.15)) continue;
      const p = anim.progress;
      const isHot = anim.type === 'hot_wave';
      const isWave = anim.type === 'hot_wave' || anim.type === 'cool_wave';
      const rad = Math.max(12, (36 / pt.depth) * (0.45 + p * 0.9));
      ctx.strokeStyle = isWave
        ? (isHot ? `rgba(239, 68, 68, ${(1 - p) * 0.9})` : `rgba(56, 189, 248, ${(1 - p) * 0.9})`)
        : `rgba(250, 204, 21, ${(1 - p) * 0.8})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
      ctx.stroke();
      if (isWave) {
        ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
        ctx.fillStyle = isHot ? '#fecaca' : '#bae6fd';
        ctx.textAlign = 'center';
        ctx.fillText(isHot ? '🔥 손잡이 고열 감지!' : '❄️ 온도 정상 확인!', pt.x, pt.y - rad - 6);
      }
    }
    ctx.restore();
  }

  // Idea #2: 3D Exterior Building Descent Overlay for Lifeline (완강기)
  function drawLifelineDescentOverlay(ctx, width, height) {
    if (!lifelineAnim || !lifelineAnim.active) return;
    const p = Math.min(1, lifelineAnim.timer / lifelineAnim.duration);
    const altitudeM = Math.max(0, (1 - p) * 9.0);
    ctx.save();
    const boxW = Math.min(260, width * 0.42);
    const boxH = Math.min(165, height * 0.42);
    const bx = width - boxW - 14;
    const by = 42;

    ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeRect(bx, by, boxW, boxH);

    // Building exterior wall & scrolling windows
    const wallX = bx + 20;
    const wallW = boxW * 0.45;
    ctx.fillStyle = '#334155';
    ctx.fillRect(wallX, by + 26, wallW, boxH - 36);
    const scrollOffset = (p * 120) % 36;
    ctx.fillStyle = '#fde047';
    for (let wy = by + 32 - scrollOffset; wy < by + boxH - 18; wy += 36) {
      if (wy > by + 26) {
        ctx.fillRect(wallX + 12, wy, wallW - 24, 16);
      }
    }

    // Lifeline cable & descending player silhouette
    const cableX = wallX + wallW + 24;
    const charY = by + 38 + p * (boxH - 68);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cableX, by + 26);
    ctx.lineTo(cableX, charY);
    ctx.stroke();

    // Pulley wheel
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(cableX, by + 28, 5, 0, Math.PI * 2);
    ctx.fill();

    // Player in safety belt
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cableX, charY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(cableX - 7, charY - 3, 14, 6);

    // Ground pad
    ctx.fillStyle = '#10b981';
    ctx.fillRect(wallX, by + boxH - 12, boxW - 36, 4);

    // Labels
    ctx.fillStyle = '#bae6fd';
    ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🪢 3D 완강기 3단계 외벽 안전 하강', bx + 10, by + 16);
    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 9.5px "Noto Sans KR", sans-serif';
    ctx.fillText('✓1.고리결속  ✓2.가슴벨트  ✓3.벽면지지', cableX + 12, by + boxH * 0.34);
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 11.5px "Noto Sans KR", sans-serif';
    ctx.fillText(`하강 높이: ${altitudeM.toFixed(1)}m (0.8m/s)`, cableX + 12, by + boxH * 0.56);

    ctx.restore();
  }

  // --- Idea #4: 3D Floor Neon Breadcrumb Path & Smoke-Reactive Guide Sign Bloom ---
  function drawNeonBreadcrumbPathDiorama(ctx, escapePath, player, tileSize, now) {
    if (!Array.isArray(escapePath) || escapePath.length === 0 || !player) return;
    ctx.save();
    const maxNodes = Math.min(escapePath.length, 10);
    for (let i = 0; i < maxNodes; i++) {
      const node = escapePath[i];
      const prevC = i === 0 ? player.x : escapePath[i - 1].c + 0.5;
      const prevR = i === 0 ? player.y : escapePath[i - 1].r + 0.5;
      const cx = (node.c + 0.5) * tileSize;
      const cy = (node.r + 0.5) * tileSize;
      const ang = Math.atan2((node.r + 0.5) - prevR, (node.c + 0.5) - prevC);
      const wave = 0.45 + 0.55 * Math.sin(now * 6.5 - i * 0.7);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.strokeStyle = `rgba(16, 185, 129, ${(0.25 + 0.5 * wave) * (1 - i / (maxNodes + 2))})`;
      ctx.lineWidth = Math.max(2, tileSize * 0.06);
      const s = tileSize * 0.16;
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, -s);
      ctx.lineTo(s * 0.6, 0);
      ctx.lineTo(-s * 0.7, s);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawNeonBreadcrumbPathFPS(ctx, escapePath, player, smokes, guideSigns, grid, TILE, projectClipped3DPolygon, project3DPoint, isPointVisibleInZBuffer, now) {
    ctx.save();
    // 1. Floor Neon Chevron Breadcrumbs along shortest escape route
    if (Array.isArray(escapePath) && escapePath.length > 0 && player && projectClipped3DPolygon) {
      const maxSteps = Math.min(escapePath.length, 7);
      for (let i = 0; i < maxSteps; i++) {
        const node = escapePath[i];
        const prevX = i === 0 ? player.x : escapePath[i - 1].c + 0.5;
        const prevY = i === 0 ? player.y : escapePath[i - 1].r + 0.5;
        const nx = node.c + 0.5;
        const ny = node.r + 0.5;
        const dx = nx - prevX;
        const dy = ny - prevY;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const px = -uy;
        const py = ux;

        const wave = 0.4 + 0.6 * Math.sin(now * 7.0 - i * 0.85);
        const alpha = (0.28 + 0.48 * wave) * (1 - i / (maxSteps + 1));

        // 3D Chevron polygon on floor (z = 0.018)
        const tipX = nx + ux * 0.18;
        const tipY = ny + uy * 0.18;
        const leftX = nx - ux * 0.12 + px * 0.22;
        const leftY = ny - uy * 0.12 + py * 0.22;
        const rightX = nx - ux * 0.12 - px * 0.22;
        const rightY = ny - uy * 0.12 - py * 0.22;
        const backX = nx - ux * 0.02;
        const backY = ny - uy * 0.02;

        const poly = projectClipped3DPolygon(
          [
            [leftX, leftY, 0.018],
            [tipX, tipY, 0.018],
            [rightX, rightY, 0.018],
            [backX, backY, 0.018]
          ],
          0.16
        );
        if (poly) {
          ctx.fillStyle = `rgba(52, 211, 153, ${alpha.toFixed(3)})`;
          ctx.strokeStyle = `rgba(167, 243, 208, ${(alpha * 1.15).toFixed(3)})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(poly[0].x, poly[0].y);
          for (let k = 1; k < poly.length; k++) ctx.lineTo(poly[k].x, poly[k].y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    // 2. Smoke-Reactive Emerald Exit / Guide Sign Volumetric Bloom
    if (project3DPoint && Array.isArray(guideSigns)) {
      const hasSmoke = Array.isArray(smokes) && smokes.length > 0;
      const bloomBoost = hasSmoke ? 1.35 : 1.0;
      for (let i = 0; i < guideSigns.length; i++) {
        const gs = guideSigns[i];
        const pt = project3DPoint(gs.c + 0.5, gs.r + 0.5, 0.72);
        if (!pt || pt.depth > 8.5) continue;
        if (isPointVisibleInZBuffer && !isPointVisibleInZBuffer(pt.x, pt.depth - 0.2)) continue;
        const r = Math.max(16, (54 / pt.depth) * bloomBoost);
        const grad = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, r);
        grad.addColorStop(0, 'rgba(110, 231, 183, 0.55)');
        grad.addColorStop(0.45, 'rgba(16, 185, 129, 0.22)');
        grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // --- Idea #6: Progressive Fire Base-Aim (화원 조준) & Foam Accumulation Renderer ---
  function drawFireBaseAimDiorama(ctx, fires, player, hasExtinguisher, tileSize, now) {
    if (!Array.isArray(fires) || fires.length === 0 || !player) return;
    ctx.save();
    for (let i = 0; i < fires.length; i++) {
      const f = fires[i];
      const dist = Math.hypot((f.c + 0.5) - player.x, (f.r + 0.5) - player.y);
      const prog = f.extinguishProgress || 0;
      if (prog <= 0 && (!hasExtinguisher || dist > 2.35)) continue;

      const cx = (f.c + 0.5) * tileSize;
      const baseY = (f.r + 0.78) * tileSize;

      // White foam accumulation at base of fire when being sprayed
      if (prog > 0) {
        ctx.fillStyle = `rgba(241, 245, 249, ${0.45 + prog * 0.45})`;
        ctx.beginPath();
        ctx.ellipse(cx, baseY, tileSize * (0.18 + prog * 0.22), tileSize * (0.09 + prog * 0.1), 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Base-aim target reticle at bottom of flame
      if (f.fireType !== 'oil') {
        const pulse = 0.65 + 0.35 * Math.sin(now * 10);
        ctx.strokeStyle = prog > 0 ? '#38bdf8' : `rgba(56, 189, 248, ${0.55 + 0.35 * pulse})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(cx, baseY, tileSize * 0.28, tileSize * 0.13, 0, 0, Math.PI * 2);
        ctx.stroke();

        if (prog > 0) {
          const bw = tileSize * 0.76;
          const bh = 6;
          const bx = cx - bw * 0.5;
          const by = (f.r + 0.08) * tileSize;
          ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
          ctx.fillRect(bx, by, bw, bh);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(bx + 1, by + 1, (bw - 2) * Math.min(1, prog), bh - 2);
        }
      }
    }
    ctx.restore();
  }

  function drawFireBaseAimFPS(ctx, fires, player, hasExtinguisher, project3DPoint, isPointVisibleInZBuffer, now) {
    if (!Array.isArray(fires) || fires.length === 0 || !player || !project3DPoint) return;
    ctx.save();
    for (let i = 0; i < fires.length; i++) {
      const f = fires[i];
      const dist = Math.hypot((f.c + 0.5) - player.x, (f.r + 0.5) - player.y);
      const prog = f.extinguishProgress || 0;
      if (prog <= 0 && (!hasExtinguisher || dist > 2.45)) continue;
      if (f.fireType === 'oil') continue;

      const basePt = project3DPoint(f.c + 0.5, f.r + 0.5, 0.08);
      if (!basePt || basePt.depth > 5.5) continue;
      if (isPointVisibleInZBuffer && !isPointVisibleInZBuffer(basePt.x, basePt.depth - 0.15)) continue;

      const rad = Math.max(10, 26 / basePt.depth);
      // Foam accumulation at fire base
      if (prog > 0) {
        ctx.fillStyle = `rgba(248, 250, 252, ${0.5 + prog * 0.45})`;
        ctx.beginPath();
        ctx.ellipse(basePt.x, basePt.y, rad * (0.6 + prog * 0.6), rad * (0.28 + prog * 0.25), 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Base-aim target ring
      const pulse = 0.6 + 0.4 * Math.sin(now * 10);
      ctx.strokeStyle = prog > 0 ? '#38bdf8' : `rgba(56, 189, 248, ${0.65 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(basePt.x, basePt.y, rad, rad * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = 'bold 10px "Noto Sans KR", sans-serif';
      ctx.fillStyle = '#bae6fd';
      ctx.textAlign = 'center';
      ctx.fillText(prog > 0 ? `🎯화원 진압 ${Math.round(prog * 100)}%` : '🎯화원(바닥) 조준 [Space]', basePt.x, basePt.y + rad * 0.45 + 11);
    }
    ctx.restore();
  }

  // --- Idea #9: 3D Cinematic Replay HUD Overlay ---
  function drawCinematicReplayHUD(ctx, width, height, replayState) {
    if (!replayState || !replayState.active) return;
    ctx.save();
    const padX = Math.max(16, width * 0.06);
    const barW = width - padX * 2;
    const barH = 44;
    const barX = padX;
    const barY = height - barH - 12;

    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeRect(barX, barY, barW, barH);

    // Progress bar track
    const prog = Math.min(1, Math.max(0, replayState.progress || 0));
    const trackX = barX + 14;
    const trackY = barY + 28;
    const trackW = barW - 130;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(trackX, trackY, trackW, 6);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(trackX, trackY, trackW * prog, 6);

    // Commentary text
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11.5px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🎥 3D 대피 리플레이 (3x): ${replayState.commentary || '이동 경로를 재생 중입니다...'}`, trackX, barY + 14);

    // Stop / Return button hint on right
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('⏹ 클릭 시 결과창 복귀', barX + barW - 12, barY + 22);

    ctx.restore();
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

  // --- New Idea #1 & #4: Closed Fire-Door Barrier & Wet-Towel Door-Gap Seal Registry ---
  const doorBarriers = new Map(); // key: "r,c" -> { r, c, sealed: boolean, timestamp: number }
  const cprAnims = []; // { r, c, step, progress, timer }

  function markDoorBarrier(r, c, sealed = false) {
    doorBarriers.set(`${r},${c}`, { r, c, sealed: !!sealed, timestamp: performance.now() });
  }

  function clearDoorBarrier(r, c) {
    doorBarriers.delete(`${r},${c}`);
  }

  function resetDoorBarriers() {
    doorBarriers.clear();
    cprAnims.length = 0;
  }

  function getDoorBarrier(r, c) {
    return doorBarriers.get(`${r},${c}`) || null;
  }

  function triggerCprWave(r, c, step = 1) {
    cprAnims.push({ r, c, step, progress: 0, timer: 0, duration: 0.75 });
    triggerDoorAnim(r, c, 'cool_wave');
  }

  function drawDoorBarriersDiorama(ctx, tileSize, now) {
    if (doorBarriers.size === 0 && cprAnims.length === 0) return;
    ctx.save();
    for (const b of doorBarriers.values()) {
      const cx = (b.c + 0.5) * tileSize;
      const cy = (b.r + 0.5) * tileSize;
      const pulse = 0.72 + 0.28 * Math.sin(now * 3.8 + b.c + b.r);
      ctx.strokeStyle = b.sealed ? `rgba(56, 189, 248, ${0.88 * pulse})` : `rgba(129, 140, 248, ${0.82 * pulse})`;
      ctx.lineWidth = 2.4;
      ctx.strokeRect(b.c * tileSize + 3, b.r * tileSize + 3, tileSize - 6, tileSize - 6);

      const label = b.sealed ? '💧문틈밀폐' : '🛡️방화차단';
      ctx.font = `bold ${Math.max(8, Math.floor(tileSize * 0.17))}px "Noto Sans KR", sans-serif`;
      const tw = ctx.measureText(label).width + 6;
      ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
      ctx.fillRect(cx - tw * 0.5, cy - tileSize * 0.44, tw, 13);
      ctx.fillStyle = b.sealed ? '#7dd3fc' : '#c7d2fe';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx, cy - tileSize * 0.44 + 6.5);
    }

    for (let i = cprAnims.length - 1; i >= 0; i--) {
      const ca = cprAnims[i];
      ca.timer += 0.016;
      ca.progress = Math.min(1, ca.timer / ca.duration);
      const cx = (ca.c + 0.5) * tileSize;
      const cy = (ca.r + 0.5) * tileSize;
      const rad = tileSize * (0.25 + ca.progress * 0.75);
      ctx.strokeStyle = `rgba(52, 211, 153, ${(1 - ca.progress) * 0.95})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = `bold ${Math.max(10, Math.floor(tileSize * 0.22))}px "Noto Sans KR", sans-serif`;
      ctx.fillStyle = '#6ee7b7';
      ctx.textAlign = 'center';
      ctx.fillText(`❤️ 응급처치(${ca.step}/3)`, cx, cy - tileSize * (0.45 + ca.progress * 0.25));
      if (ca.progress >= 1) cprAnims.splice(i, 1);
    }
    ctx.restore();
  }

  function drawDoorBarriersFPS(ctx, project3DPoint, isPointVisibleInZBuffer, now) {
    if (doorBarriers.size === 0) return;
    ctx.save();
    for (const b of doorBarriers.values()) {
      const pt = project3DPoint(b.c + 0.5, b.r + 0.5, 0.42);
      if (!pt || pt.depth > 7.5) continue;
      if (isPointVisibleInZBuffer && !isPointVisibleInZBuffer(pt.x, pt.depth - 0.35)) continue;
      const label = b.sealed ? '💧젖은수건 문틈밀폐 완료(연기 100% 차단)' : '🛡️방화문 닫힘(연기확산 85% 차단)';
      ctx.font = 'bold 10.5px "Noto Sans KR", sans-serif';
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
      ctx.strokeStyle = b.sealed ? '#38bdf8' : '#818cf8';
      ctx.lineWidth = 1.5;
      ctx.fillRect(pt.x - tw * 0.5, pt.y - 10, tw, 20);
      ctx.strokeRect(pt.x - tw * 0.5, pt.y - 10, tw, 20);
      ctx.fillStyle = b.sealed ? '#bae6fd' : '#e0e7ff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, pt.x, pt.y);
    }
    ctx.restore();
  }

  // --- New Idea #2: Wet Towel Moisture Evaporation Gauge & Water Vapor Effect ---
  function drawWetTowelMoistureDiorama(ctx, px, py, tileSize, wetness, hasMask, now) {
    if (hasMask || !(wetness > 0)) return;
    ctx.save();
    const pct = Math.max(0, Math.min(100, Math.round(wetness)));
    const barW = Math.max(26, tileSize * 0.68);
    const barH = 4.5;
    const bx = px - barW * 0.5;
    const by = py + tileSize * 0.25;

    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
    ctx.fillStyle = pct > 35 ? '#38bdf8' : '#f59e0b';
    ctx.fillRect(bx, by, barW * (pct / 100), barH);

    // Subtle rising cool moisture droplets
    for (let i = 0; i < 2; i++) {
      const prog = (now * 1.4 + i * 0.5) % 1;
      const dx = px + (i === 0 ? -1 : 1) * tileSize * 0.18;
      const dy = py - tileSize * (0.25 + prog * 0.35);
      ctx.fillStyle = `rgba(125, 211, 252, ${(1 - prog) * 0.75})`;
      ctx.beginPath();
      ctx.arc(dx, dy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- New Idea #3: 3D Ceiling Sprinkler System & Heat Detector Spray ---
  function drawSprinklerSystemDiorama(ctx, fires, smokes, tileSize, wallH, now, active) {
    if (!active) return;
    const targets = [];
    if (Array.isArray(fires)) {
      for (let i = 0; i < fires.length; i++) targets.push({ c: fires[i].c, r: fires[i].r, isFire: true });
    }
    if (Array.isArray(smokes)) {
      for (let i = 0; i < Math.min(6, smokes.length); i += 2) {
        targets.push({ c: smokes[i].c, r: smokes[i].r, isFire: false });
      }
    }
    if (targets.length === 0) return;

    ctx.save();
    for (let idx = 0; idx < targets.length; idx++) {
      const t = targets[idx];
      const cx = (t.c + 0.5) * tileSize;
      const ceilY = (t.r + 0.25) * tileSize - wallH * 0.85;
      const floorY = (t.r + 0.62) * tileSize;

      // Ceiling sprinkler nozzle head + red thermal LED
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cx - 4, ceilY - 3, 8, 5);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx, ceilY + 2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Translucent water spray cone from ceiling to floor
      const grad = ctx.createLinearGradient(cx, ceilY, cx, floorY);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      grad.addColorStop(1, 'rgba(186, 230, 253, 0.08)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx - 2, ceilY + 2);
      ctx.lineTo(cx - tileSize * 0.36, floorY);
      ctx.lineTo(cx + tileSize * 0.36, floorY);
      ctx.lineTo(cx + 2, ceilY + 2);
      ctx.closePath();
      ctx.fill();

      // Falling water droplets
      for (let d = 0; d < 4; d++) {
        const p = (now * 2.6 + idx * 0.31 + d * 0.25) % 1;
        const spread = (d - 1.5) * tileSize * 0.16 * p;
        const wx = cx + spread;
        const wy = ceilY + p * (floorY - ceilY);
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(wx - 1, wy - 2.5, 2, 5);
      }
    }
    ctx.restore();
  }

  function drawSprinklerSystemFPS(ctx, fires, smokes, project3DPoint, isPointVisibleInZBuffer, now, active) {
    if (!active || !Array.isArray(fires)) return;
    ctx.save();
    for (let i = 0; i < fires.length; i++) {
      const f = fires[i];
      const topPt = project3DPoint(f.c + 0.5, f.r + 0.5, 0.92);
      const botPt = project3DPoint(f.c + 0.5, f.r + 0.5, 0.08);
      if (!topPt || !botPt || topPt.depth > 8.5) continue;
      if (isPointVisibleInZBuffer && !isPointVisibleInZBuffer(topPt.x, topPt.depth - 0.18)) continue;

      const spreadW = Math.max(14, 46 / topPt.depth);
      const grad = ctx.createLinearGradient(topPt.x, topPt.y, botPt.x, botPt.y);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.50)');
      grad.addColorStop(1, 'rgba(186, 230, 253, 0.06)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(topPt.x - 3, topPt.y);
      ctx.lineTo(botPt.x - spreadW, botPt.y);
      ctx.lineTo(botPt.x + spreadW, botPt.y);
      ctx.lineTo(topPt.x + 3, topPt.y);
      ctx.closePath();
      ctx.fill();

      ctx.font = 'bold 10px "Noto Sans KR", sans-serif';
      ctx.fillStyle = '#7dd3fc';
      ctx.textAlign = 'center';
      ctx.fillText('🚿스프링클러 작동중', topPt.x, topPt.y - 6);
    }
    ctx.restore();
  }

  // --- New Idea #4: Shelter-in-Place ("불나면 살펴서 대피: 문틈 막고 구조 대기") HUD Overlay ---
  function drawShelterInPlaceOverlay(ctx, width, height, shelterState) {
    if (!shelterState || !shelterState.active) return;
    const pct = Math.min(1, Math.max(0, shelterState.timer / (shelterState.duration || 4.0)));
    ctx.save();
    const boxW = Math.min(420, width * 0.86);
    const boxH = 54;
    const bx = (width - boxW) * 0.5;
    const by = 42;

    ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeRect(bx, by, boxW, boxH);

    ctx.fillStyle = '#e0f2fe';
    ctx.font = 'bold 12px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚒 [불나면 살펴서 대피] 젖은 수건 문틈 밀폐 완료! 119 구조대 진입 중...', width * 0.5, by + 18);

    const barW = boxW - 28;
    const barX = bx + 14;
    const barY = by + 32;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, barY, barW, 12);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(barX, barY, barW * pct, 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9.5px sans-serif';
    ctx.fillText(`${Math.round(pct * 100)}%`, width * 0.5, barY + 9);
    ctx.restore();
  }

  // --- New Idea #7: Safety Gear 3D Codex Data & Live Rotating 3D Canvas Preview ---
  const CODEX_GEARS = [
    {
      id: 'abc_ext',
      name: 'ABC 분말소화기',
      icon: '🧯',
      category: '초기 진압 설비',
      color: '#ef4444',
      accent: '#fde047',
      principle: '인산암모늄 분말로 화원을 덮어 산소를 차단(질식)하고 연쇄반응을 억제합니다. 일반(A)·유류(B)·전기(C) 화재에 모두 사용 가능합니다.',
      usageTip: '안전핀(P) 뽑기 → 바람을 등지고 불길 맨 아래 화원 조준(A) → 손잡이 움켜쥐기(S) → 빗자루처럼 쓸어 분사(S)'
    },
    {
      id: 'k_ext',
      name: 'K급 주방용 소화기',
      icon: '🍳',
      category: '특수 화재 설비',
      color: '#0284c7',
      accent: '#e0f2fe',
      principle: '식용유 화재 시 기름 표면에 비누화 거품 막(비누화 작용)을 형성해 산소를 차단하고 기름 온도를 발화점 아래로 급속 냉각합니다.',
      usageTip: '식용유 불에 물을 부으면 수증기 폭발이 일어납니다! 반드시 K급 소화기나 뚜껑을 덮어 진압하세요.'
    },
    {
      id: 'lifeline',
      name: '완강기 (고층 피난기구)',
      icon: '🪢',
      category: '피난 구조 설비',
      color: '#0d9488',
      accent: '#99f6e4',
      principle: '사용자의 몸무게에 의해 조속기 브레이크가 일정한 속도로 작동하여 3~10층에서 지상까지 안전하게 내려갈 수 있는 도르래 장치입니다.',
      usageTip: '지지대 고리 체결 → 릴(줄) 창밖 투하 → 안전벨트 가슴(겨드랑이 밑) 고정 → 벽면을 짚으며 하강'
    },
    {
      id: 'mask',
      name: '방연마스크 · 젖은 수건',
      icon: '😷',
      category: '호흡기 보호구',
      color: '#10b981',
      accent: '#a7f3d0',
      principle: '정전 필터와 습식 필터로 뜨거운 연기와 그을음 입자 흡입을 줄여 초기 대피 시 시야와 호흡을 보조합니다.',
      usageTip: '방연마스크나 젖은 수건이 산소를 만들어내지는 않습니다. 착용 즉시 낮은 자세(🧎)로 출구로 이동하세요!'
    },
    {
      id: 'partition',
      name: '경량칸막이 (석고보드 벽)',
      icon: '🧱',
      category: '공동주택 피난설비',
      color: '#d97706',
      accent: '#fef08a',
      principle: '아파트 베란다 발코니 한쪽 벽을 9mm 두께의 얇은 석고보드로 시공해, 현관 탈출이 불가능할 때 발로 차서 옆집으로 피난할 수 있습니다.',
      usageTip: '경량칸막이 앞에는 평소 세탁기나 무거운 수납장을 쌓아두지 말아야 위급 시 즉시 돌파할 수 있습니다.'
    },
    {
      id: 'exit_light',
      name: '비상구 유도등 & 유도선',
      icon: '🏃',
      category: '피난 유도 설비',
      color: '#059669',
      accent: '#6ee7b7',
      principle: '정전 시에도 내장 비상전원으로 60분 이상 점등되며, 인간 망막이 어둠과 연기 속에서 가장 잘 식별하는 녹색 파장(520~555nm)을 사용합니다.',
      usageTip: '짙은 연기로 앞이 안 보일 때는 벽면 아래쪽과 바닥의 초록색 유도등을 따라 이동하세요.'
    },
    {
      id: 'sprinkler',
      name: '스프링클러 & 단독경보형 감지기',
      icon: '🚿',
      category: '자동 감지·소화 설비',
      color: '#3b82f6',
      accent: '#bae6fd',
      principle: '천장 온도가 68~72°C 이상 올라가면 감열체가 터지며 자동으로 물을 살수해 초기 화재 확산을 90% 이상 억제합니다.',
      usageTip: '비상벨(발신기)을 누르면 건물 전체에 경보가 울리고 방화·소화 설비가 연동됩니다.'
    },
    {
      id: 'flir_cam',
      name: '열화상 카메라 (FLIR 투시)',
      icon: '🌡️',
      category: '첨단 탐색 장비',
      color: '#7c3aed',
      accent: '#f0abfc',
      principle: '짙은 연기로 가시광선이 차단된 화재 현장에서 물체가 방출하는 적외선(열복사 에너지)을 감지해 화원과 요구조자의 체온(36.5°C)을 투시합니다.',
      usageTip: '연기 너머 닫힌 문(백드래프트 위험 고열문)의 온도와 고립된 이웃의 위치를 단축키 [T]로 즉시 스캔하세요!'
    },
    {
      id: 'fire_shutter',
      name: '방화셔터 일체형 비상문',
      icon: '🟩',
      category: '방화 구획·피난 설비',
      color: '#059669',
      accent: '#fde047',
      principle: '화재 감지기 작동 시 철제 방화셔터가 내려와 연기를 차단하더라도, 재실자가 갇히지 않도록 셔터 안쪽에 초록색 유도표지가 붙은 비상문(피난구)이 설치되어 있습니다.',
      usageTip: '학교·지하철에서 방화셔터가 내려오면 당황하지 말고 셔터에 달린 초록색 [비상문]을 손으로 밀고 대피하세요!'
    },
    {
      id: 'fire_door',
      name: '갑종 방화문 (연기·화염 차단)',
      icon: '🚪',
      category: '방화 구획 설비',
      color: '#6366f1',
      accent: '#c7d2fe',
      principle: '강철판과 내화 단열재로 제작되어 닫혀 있을 때 최소 60분 이상 화염과 유독가스가 계단실이나 옆 구역으로 번지는 것을 물리적으로 차단합니다.',
      usageTip: '문을 통과한 뒤 방화문을 꼭 닫고(Space) 대피하면 뒤따르는 이웃의 골든타임을 지킬 수 있습니다.'
    }
  ];

  function renderCodex3DGearPreview(canvas, gearId, angle = 0) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const gear = CODEX_GEARS.find(g => g.id === gearId) || CODEX_GEARS[0];

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#090f1d';
    ctx.fillRect(0, 0, w, h);

    // 3D Turntable Grid Platform
    const cx = w * 0.5;
    const cy = h * 0.68;
    const rx = w * 0.32;
    const ry = h * 0.14;

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fill();

    // Rotating 3D Turntable Spokes
    for (let i = 0; i < 6; i++) {
      const a = angle + (i * Math.PI) / 3;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
      ctx.stroke();
    }

    // 3D Extruded Pedestal & Gear Model
    const bob = Math.sin(angle * 2) * 3.5;
    const rotCos = Math.cos(angle);
    const boxW = 46 + Math.abs(rotCos) * 14;
    const boxH = 58;
    const topY = cy - boxH - 8 + bob;

    // 3D Side Shadow Face
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - boxW * 0.5 + 5, topY + 4, boxW, boxH);

    // Main 3D Cylinder/Box Body
    const grad = ctx.createLinearGradient(cx - boxW * 0.5, topY, cx + boxW * 0.5, topY + boxH);
    grad.addColorStop(0, gear.color);
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.strokeStyle = gear.accent;
    ctx.lineWidth = 2;
    ctx.fillRect(cx - boxW * 0.5, topY, boxW, boxH);
    ctx.strokeRect(cx - boxW * 0.5, topY, boxW, boxH);

    // Top 3D Bevel Cap
    ctx.fillStyle = gear.accent;
    ctx.beginPath();
    ctx.ellipse(cx, topY, boxW * 0.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Icon & Label
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(gear.icon, cx, topY + boxH * 0.52);

    ctx.font = 'bold 10px "Noto Sans KR", sans-serif';
    ctx.fillStyle = '#bae6fd';
    ctx.fillText('🔄 360° 3D 안전장비 프리뷰', cx, h - 10);
  }

  // --- New Idea #8: Self-Contained Offline Canvas QR-Matrix Renderer ---
  function renderScannableQrMatrix(canvas, textUrl, labelText = 'FIRE-SAFETY-3D') {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cells = 25;
    const pad = 8;
    const cellS = (Math.min(w, h) - pad * 2) / cells;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    function drawFinder(r0, c0) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          if (isOuter || isInner) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(pad + (c0 + c) * cellS, pad + (r0 + r) * cellS, Math.ceil(cellS), Math.ceil(cellS));
          }
        }
      }
    }

    drawFinder(0, 0);
    drawFinder(0, cells - 7);
    drawFinder(cells - 7, 0);

    // Deterministic bit stream from URL
    const str = String(textUrl || 'https://fire-safety-3d');
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        // Skip finder regions
        if ((r < 8 && c < 8) || (r < 8 && c >= cells - 8) || (r >= cells - 8 && c < 8)) continue;
        // Timing pattern
        if (r === 6 || c === 6) {
          if ((r + c) % 2 === 0) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(pad + c * cellS, pad + r * cellS, Math.ceil(cellS), Math.ceil(cellS));
          }
          continue;
        }
        const charCode = str.charCodeAt((r * cells + c) % str.length) || 73;
        const bit = ((charCode * (r + 3) + (hash >>> ((c % 16))) + r * 17 + c * 31) & 3) !== 0;
        if (bit) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(pad + c * cellS, pad + r * cellS, Math.ceil(cellS), Math.ceil(cellS));
        }
      }
    }

    // Center Badge
    const bw = cellS * 5;
    const bx = (w - bw) * 0.5;
    const by = (h - bw) * 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx - 2, by - 2, bw + 4, bw + 4);
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx - 1, by - 1, bw + 2, bw + 2);
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚒', w * 0.5, h * 0.5);
  }

  // --- New Idea #9: Critical Vitals 3D Shader Overlay (Heartbeat Pulse Vignette + Hypoxia Blur + Live ECG) ---
  function drawCriticalVitalsShaderOverlay(ctx, width, height, hp, o2, now, reduceMotion = false) {
    const minV = Math.min(Number(hp) || 100, Number(o2) || 100);
    if (minV > 42) return;

    const severity = Math.max(0, Math.min(1, (42 - minV) / 37));
    const pulseFreq = 4.2 + severity * 5.5;
    const pulse = reduceMotion ? 0.5 : (0.5 + 0.5 * Math.sin(now * pulseFreq));

    ctx.save();
    // 1. Arterial Red / Hypoxia Cyan Radial Vignette
    const isHypoxia = (Number(o2) || 100) < (Number(hp) || 100);
    const outerAlpha = (0.18 + severity * 0.34) * (0.75 + 0.25 * pulse);
    const radGrad = ctx.createRadialGradient(
      width * 0.5, height * 0.5, Math.min(width, height) * (0.34 - severity * 0.08),
      width * 0.5, height * 0.5, Math.max(width, height) * 0.72
    );
    radGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    radGrad.addColorStop(0.65, isHypoxia ? `rgba(15, 23, 42, ${(outerAlpha * 0.65).toFixed(2)})` : `rgba(127, 29, 29, ${(outerAlpha * 0.55).toFixed(2)})`);
    radGrad.addColorStop(1, isHypoxia ? `rgba(2, 6, 23, ${outerAlpha.toFixed(2)})` : `rgba(220, 38, 38, ${outerAlpha.toFixed(2)})`);
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Live Mini ECG Cardiogram & BPM Pill in Top-Left
    const bpm = Math.round(75 + severity * 68);
    const pillX = 12;
    const pillY = 38;
    const pillW = 138;
    const pillH = 24;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.strokeStyle = isHypoxia ? '#38bdf8' : '#ef4444';
    ctx.lineWidth = 1.4;
    ctx.fillRect(pillX, pillY, pillW, pillH);
    ctx.strokeRect(pillX, pillY, pillW, pillH);

    ctx.fillStyle = isHypoxia ? '#7dd3fc' : '#fca5a5';
    ctx.font = 'bold 10px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`💓 ${bpm} BPM`, pillX + 6, pillY + 12);

    // Draw animated ECG waveform
    ctx.strokeStyle = isHypoxia ? '#38bdf8' : '#f87171';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const waveStartX = pillX + 64;
    const waveW = 66;
    for (let x = 0; x <= waveW; x += 2) {
      const phase = ((x / waveW) * Math.PI * 2 - now * 6) % (Math.PI * 2);
      const norm = phase < 0 ? phase + Math.PI * 2 : phase;
      let yOff = 0;
      if (norm > 2.4 && norm < 2.8) yOff = -7 * (0.7 + severity * 0.4);
      else if (norm >= 2.8 && norm < 3.1) yOff = 5;
      else if (norm >= 3.1 && norm < 3.5) yOff = -3;
      const px = waveStartX + x;
      const py = pillY + 12 + yOff;
      if (x === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  // --- New Idea #10: Colorblind High-Contrast Pattern & Symbol Mode ---
  function drawColorblindPatternsDiorama(ctx, fires, smokes, grid, rows, cols, TILE, tileSize, enabled) {
    if (!enabled) return;
    ctx.save();
    // 1. Diagonal warning stripes & [▲불] badge on Fire tiles
    if (Array.isArray(fires)) {
      for (let i = 0; i < fires.length; i++) {
        const f = fires[i];
        const x = f.c * tileSize;
        const y = f.r * tileSize;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(x + 3, y + 3, tileSize - 6, tileSize - 6);
        ctx.setLineDash([]);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x + tileSize * 0.18, y + 2, tileSize * 0.64, 13);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 9.5px "Noto Sans KR", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('▲화염주의', x + tileSize * 0.5, y + 8.5);
      }
    }
    // 2. Dotted wave ring & [≋연기] on Smoke tiles
    if (Array.isArray(smokes)) {
      for (let i = 0; i < smokes.length; i++) {
        const s = smokes[i];
        const cx = (s.c + 0.5) * tileSize;
        const cy = (s.r + 0.5) * tileSize;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.arc(cx, cy, tileSize * 0.38, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // 3. Double Star Frame [★출구] on Exit tiles
    if (grid) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] === TILE.EXIT) {
            const x = c * tileSize;
            const y = r * tileSize;
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
          }
        }
      }
    }
    ctx.restore();
  }

  function drawColorblindPatternsFPS(ctx, fires, smokes, project3DPoint, isPointVisibleInZBuffer, enabled) {
    if (!enabled) return;
    ctx.save();
    if (Array.isArray(fires)) {
      for (let i = 0; i < fires.length; i++) {
        const f = fires[i];
        const pt = project3DPoint(f.c + 0.5, f.r + 0.5, 0.38);
        if (!pt || pt.depth > 8.0) continue;
        if (isPointVisibleInZBuffer && !isPointVisibleInZBuffer(pt.x, pt.depth - 0.2)) continue;
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.6;
        ctx.fillRect(pt.x - 28, pt.y - 9, 56, 18);
        ctx.strokeRect(pt.x - 28, pt.y - 9, 56, 18);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 10px "Noto Sans KR", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('▲화염(적)', pt.x, pt.y);
      }
    }
    ctx.restore();
  }


  // --- Strategy #1: Firefighter FLIR Thermal Imaging Camera 3D Overlay (DIORAMA_3D & FPS_3D) ---
  function drawThermalVisionOverlay(ctx, width, height, state) {
    if (!state || !state.active) return;
    const {
      isFps,
      fires,
      items,
      grid,
      rows,
      cols,
      TILE,
      tileSize,
      project3DPoint,
      now
    } = state;

    ctx.save();
    // 1. Infrared FLIR Color Grading Backdrop & Scanlines
    ctx.fillStyle = 'rgba(18, 12, 56, 0.34)';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(192, 132, 252, 0.05)';
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 1.2);
    }

    // 2. Render Thermal Signatures in DIORAMA_3D or FPS_3D
    if (!isFps && tileSize) {
      // Fires -> White-Yellow-Magenta Core
      if (Array.isArray(fires)) {
        for (let i = 0; i < fires.length; i++) {
          const f = fires[i];
          const cx = (f.c + 0.5) * tileSize;
          const cy = (f.r + 0.5) * tileSize;
          const r = tileSize * 0.72;
          const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
          g.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
          g.addColorStop(0.35, 'rgba(250, 204, 21, 0.75)');
          g.addColorStop(0.7, 'rgba(217, 70, 239, 0.42)');
          g.addColorStop(1, 'rgba(88, 28, 135, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Hot Doors (Backdraft warning) -> Pulsing Crimson Thermal Ring
      if (grid && TILE) {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (grid[r][c] === TILE.HOT_DOOR) {
              const cx = (c + 0.5) * tileSize;
              const cy = (r + 0.5) * tileSize;
              ctx.strokeStyle = '#f43f5e';
              ctx.lineWidth = 2.4;
              ctx.strokeRect(c * tileSize + 2, r * tileSize + 2, tileSize - 4, tileSize - 4);
              ctx.fillStyle = '#fda4af';
              ctx.font = 'bold 9.5px "Noto Sans KR", sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('🌡️390°C 고열문!', cx, cy - tileSize * 0.35);
            }
          }
        }
      }
      // Survivors / Pets -> 36.5°C Warm Amber Silhouette
      if (Array.isArray(items)) {
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (it.type === 'npc' || it.type === 'dog') {
            const cx = (it.c + 0.5) * tileSize;
            const cy = (it.r + 0.5) * tileSize;
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(cx, cy, tileSize * 0.42, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#fef08a';
            ctx.font = 'bold 9.5px "Noto Sans KR", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🌡️36.5°C 체온감지', cx, cy - tileSize * 0.48);
          }
        }
      }
    } else if (isFps && typeof project3DPoint === 'function') {
      // Through-smoke / through-wall thermal signatures in 1st-person 3D
      if (Array.isArray(fires)) {
        for (let i = 0; i < fires.length; i++) {
          const f = fires[i];
          const pt = project3DPoint(f.c + 0.5, f.r + 0.5, 0.35);
          if (!pt || pt.depth > 11) continue;
          const rad = Math.max(14, 52 / pt.depth);
          const g = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, rad);
          g.addColorStop(0, 'rgba(255, 255, 255, 0.90)');
          g.addColorStop(0.4, 'rgba(250, 204, 21, 0.65)');
          g.addColorStop(0.8, 'rgba(217, 70, 239, 0.30)');
          g.addColorStop(1, 'rgba(88, 28, 135, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 10px "Noto Sans KR", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`🌡️화원 620°C (${pt.depth.toFixed(1)}m)`, pt.x, pt.y - rad * 0.6);
        }
      }
      if (Array.isArray(items)) {
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (it.type === 'npc' || it.type === 'dog') {
            const pt = project3DPoint(it.c + 0.5, it.r + 0.5, 0.42);
            if (!pt || pt.depth > 12) continue;
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 2;
            ctx.strokeRect(pt.x - 18, pt.y - 18, 36, 36);
            ctx.fillStyle = '#fef08a';
            ctx.font = 'bold 10.5px "Noto Sans KR", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`🌡️${it.name || '요구조자'} 36.5°C (${pt.depth.toFixed(1)}m)`, pt.x, pt.y - 24);
          }
        }
      }
    }

    // 3. FLIR HUD Frame & Right Temperature Scale Bar
    const pad = 10;
    ctx.strokeStyle = 'rgba(232, 121, 249, 0.75)';
    ctx.lineWidth = 2;
    // Top-left bracket
    ctx.beginPath();
    ctx.moveTo(pad, pad + 22);
    ctx.lineTo(pad, pad);
    ctx.lineTo(pad + 22, pad);
    ctx.stroke();
    // Bottom-right bracket
    ctx.beginPath();
    ctx.moveTo(width - pad, height - pad - 22);
    ctx.lineTo(width - pad, height - pad);
    ctx.lineTo(width - pad - 22, height - pad);
    ctx.stroke();

    // Top-left FLIR badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.fillRect(pad + 6, pad + 6, 205, 22);
    ctx.strokeRect(pad + 6, pad + 6, 205, 22);
    ctx.fillStyle = '#f0abfc';
    ctx.font = 'bold 10.5px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌡️ FLIR 열화상 투시 ON (단축키 T)', pad + 12, pad + 17);

    ctx.restore();
  }

  // --- Strategy #2: Indoor Airflow Draft & Smoke Stack-Effect Vector Engine ---
  function computeIndoorAirflowVector(grid, rows, cols, TILE, player) {
    if (!grid || !TILE) return { vx: 1, vy: 0, speed: 1.0, dirName: '동쪽', openDoors: 0 };
    let sumX = 0;
    let sumY = 0;
    let openDoors = 0;
    const px = player ? player.x : cols * 0.5;
    const py = player ? player.y : rows * 0.5;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = grid[r][c];
        if (t === TILE.OPEN_DOOR) openDoors++;
        // Stack effect pulls air toward vertical shafts (ELEVATOR, EXIT stairwell) and OPEN_DOORs
        if (t === TILE.ELEVATOR || t === TILE.EXIT || t === TILE.OPEN_DOOR) {
          const weight = t === TILE.OPEN_DOOR ? 1.4 : (t === TILE.ELEVATOR ? 1.8 : 1.2);
          const dx = (c + 0.5) - px;
          const dy = (r + 0.5) - py;
          const d = Math.max(0.8, Math.hypot(dx, dy));
          sumX += (dx / d) * weight;
          sumY += (dy / d) * weight;
        }
      }
    }

    const len = Math.hypot(sumX, sumY) || 1;
    const vx = sumX / len;
    const vy = sumY / len;
    const speed = Number((0.85 + Math.min(0.95, openDoors * 0.22)).toFixed(2));
    let dirName = '동쪽';
    const ang = Math.atan2(vy, vx);
    if (ang > -Math.PI * 0.25 && ang <= Math.PI * 0.25) dirName = '동쪽(→)';
    else if (ang > Math.PI * 0.25 && ang <= Math.PI * 0.75) dirName = '남쪽(↓)';
    else if (ang <= -Math.PI * 0.25 && ang > -Math.PI * 0.75) dirName = '북쪽(↑)';
    else dirName = '서쪽(←)';

    return { vx, vy, speed, dirName, openDoors };
  }

  function drawAirflowDraftDiorama(ctx, draft, smokes, tileSize, width, now) {
    if (!draft) return;
    ctx.save();
    // Animated airflow streamlines near smoke tiles
    if (Array.isArray(smokes) && smokes.length > 0 && tileSize) {
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.36)';
      ctx.lineWidth = 1.5;
      const stepCount = Math.min(6, smokes.length);
      for (let i = 0; i < stepCount; i++) {
        const s = smokes[i];
        const phase = (now * 1.4 + i * 0.27) % 1;
        const sx = (s.c + 0.5 - draft.vx * 0.35 + draft.vx * phase * 0.7) * tileSize;
        const sy = (s.r + 0.5 - draft.vy * 0.35 + draft.vy * phase * 0.7) * tileSize;
        const ex = sx + draft.vx * tileSize * 0.36;
        const ey = sy + draft.vy * tileSize * 0.36;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // --- Strategy #3: Spatial Audio Acoustic Radar Badge ---
  function drawSpatialAudioRadarHUD(ctx, width, height, acousticCue) {
    if (!acousticCue) return;
    ctx.save();
    ctx.font = 'bold 10px "Noto Sans KR", sans-serif';
    const tw = ctx.measureText(acousticCue).width + 16;
    const bx = 10;
    const by = height - 30;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.86)';
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
    ctx.lineWidth = 1.3;
    ctx.fillRect(bx, by, tw, 20);
    ctx.strokeRect(bx, by, tw, 20);
    ctx.fillStyle = '#6ee7b7';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(acousticCue, bx + 8, by + 10);
    ctx.restore();
  }

  // --- Strategy #4: PASS Extinguisher Aim-and-Sweep Rhythm Gauge Overlay ---
  function drawExtinguisherSweepGaugeOverlay(ctx, width, height, sweepState, draft) {
    if (!sweepState || !sweepState.active) return;
    ctx.save();
    const boxW = Math.min(340, width * 0.80);
    const boxH = 54;
    const bx = (width - boxW) * 0.5;
    const by = height - boxH - 36;

    ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeRect(bx, by, boxW, boxH);

    const windHint = draft ? `🌬️기류: ${draft.dirName} (바람 등지기)` : '🎯화원 뿌리 조준';
    ctx.fillStyle = '#e0f2fe';
    ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🧯 PASS 빗자루 쓸기(Sweep)! 녹색 구간에서 [Space/소화기] 클릭 (${windHint})`, width * 0.5, by + 15);

    const trackX = bx + 16;
    const trackY = by + 28;
    const trackW = boxW - 32;
    const trackH = 14;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(trackX, trackY, trackW, trackH);

    // Golden/Green Sweet Spot Zone (0.32 ~ 0.68)
    const sweetX = trackX + trackW * 0.32;
    const sweetW = trackW * 0.36;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.65)';
    ctx.fillRect(sweetX, trackY, sweetW, trackH);
    ctx.strokeStyle = '#fde047';
    ctx.strokeRect(sweetX, trackY, sweetW, trackH);

    // Oscillating Cursor
    const cursorRatio = 0.5 + 0.46 * Math.sin((sweepState.phase || 0) * 7.5);
    const cx = trackX + trackW * cursorRatio;
    ctx.fillStyle = '#fde047';
    ctx.fillRect(cx - 3, trackY - 3, 6, trackH + 6);

    ctx.restore();
  }

  // --- Strategy #6: Earthquake Seismic Tremor Warning Overlay ---
  function drawEarthquakeTremorOverlay(ctx, width, height, eqState, isCrouching) {
    if (!eqState || !eqState.active) return;
    ctx.save();
    const boxW = Math.min(430, width * 0.88);
    const boxH = 42;
    const bx = (width - boxW) * 0.5;
    const by = 38;

    ctx.fillStyle = isCrouching ? 'rgba(6, 78, 59, 0.92)' : 'rgba(127, 29, 29, 0.92)';
    ctx.strokeStyle = isCrouching ? '#34d399' : '#f87171';
    ctx.lineWidth = 2;
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeRect(bx, by, boxW, boxH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11.5px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const msg = isCrouching
      ? `🛡️ [지진 머리 보호 완료!] 낮은 자세 유지 중 (남은 여진 ${Math.max(0.1, eqState.timer).toFixed(1)}초)`
      : `🌐 [진도 5.5 여진 발생!] 즉시 [숙이기(Shift)]로 머리를 보호하세요! (${Math.max(0.1, eqState.timer).toFixed(1)}초)`;
    ctx.fillText(msg, width * 0.5, by + 21);
    ctx.restore();
  }

  // --- Strategy #7: Fire Shutter Sub-Door Badge & Vulnerable Companion Care Tether ---
  function drawFireShutterAndCompanionCareDiorama(ctx, grid, rows, cols, TILE, player, companions, hasFireShutter, tileSize, now) {
    if (!tileSize) return;
    ctx.save();
    // 1. Companion Escort Care Tether Line
    if (player && Array.isArray(companions) && companions.length > 0) {
      for (let i = 0; i < companions.length; i++) {
        const comp = companions[i];
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.78)';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(player.x * tileSize, player.y * tileSize);
        ctx.lineTo(comp.x * tileSize, comp.y * tileSize);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // 2. Green Emergency Sub-Door Badge on Fire Shutter Doors in Stage 4/5/7
    if (hasFireShutter && grid && TILE) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] === TILE.PARTITION || (grid[r][c] === TILE.DOOR && (c === 4 || c === 9))) {
            const cx = (c + 0.5) * tileSize;
            const cy = (r + 0.5) * tileSize;
            ctx.fillStyle = 'rgba(5, 150, 105, 0.90)';
            ctx.fillRect(cx - tileSize * 0.36, cy + tileSize * 0.14, tileSize * 0.72, 11);
            ctx.fillStyle = '#ecfdf5';
            ctx.font = 'bold 8.5px "Noto Sans KR", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🟩셔터비상문', cx, cy + tileSize * 0.14 + 5.5);
          }
        }
      }
    }
    ctx.restore();
  }

  // --- Strategy #8: 5-Axis Safety Competency Radar Chart & Personalized AI Prescription ---
  function computeSafetyCompetencyScores(metrics, player, elapsedSeconds, st) {
    const m = metrics || {};
    const p = player || {};
    const isPrev = st && st.isPreventionMode;

    // 1. 신속성 (Speed: 0~100)
    const speedScore = Math.max(45, Math.min(100, Math.round(100 - Math.max(0, (elapsedSeconds || 25) - 18) * 0.55)));

    // 2. 호흡보호 (Breathing: Crouch in smoke + Wet towel / Mask)
    const smokeRatio = (m.smokeTimeTotal || 0) > 1.0 ? (m.smokeTimeCrouched || 0) / m.smokeTimeTotal : 1.0;
    const breathScore = isPrev
      ? 95
      : Math.max(40, Math.min(100, Math.round(smokeRatio * 65 + (p.wetTowel || p.hasMask ? 35 : (p.crouching ? 25 : 15)))));

    // 3. 초기대응 (Response: 119 Call + Alarm Bell + Gas/Breaker)
    let respBase = 60;
    if (m.called119) respBase += 20;
    if (p.alarmRung) respBase += 10;
    if (p.gasClosed || p.breakerClosed || (m.correctExtinguishCount || 0) > 0) respBase += 15;
    const responseScore = isPrev ? 96 : Math.min(100, respBase);

    // 4. 위험회피 (Hazard Avoidance: Door heat check + No backdraft + No water on oil/electric)
    let avoidBase = 85;
    if ((m.doorHeatChecked || 0) > 0) avoidBase += 15;
    if ((m.backdraftTriggered || 0) > 0) avoidBase -= 25;
    if ((m.waterOnSpecialFireMistake || 0) > 0) avoidBase -= 25;
    if (!m.ignoredOrDroppedToy) avoidBase -= 15;
    const avoidScore = Math.max(35, Math.min(100, avoidBase));

    // 5. 협동·방화 (Coop & Fire Door: Fire doors closed + Companion rescue)
    let coopBase = 68;
    if ((p.fireDoorsClosed || 0) > 0) coopBase += 18;
    if ((p.rescuedNpcs || 0) > 0 || p.rescuedDog) coopBase += 16;
    const coopScore = isPrev ? 94 : Math.min(100, coopBase);

    const axes = [
      { key: 'speed', label: '신속성', score: speedScore, tip: '바닥의 초록 유도선과 비상구 유도음(🔊)을 따라 지체 없이 출구로 이동하세요!' },
      { key: 'breath', label: '호흡보호', score: breathScore, tip: '연기 구역 진입 즉시 [Shift] 키로 낮은 자세를 유지하고 젖은 수건·마스크를 활용하세요!' },
      { key: 'response', label: '초기대응', score: responseScore, tip: '복도 비상벨(🔔)과 119 신고 전화(📞), 가스·전기 차단기를 침착하게 작동해 보세요!' },
      { key: 'avoid', label: '위험회피', score: avoidScore, tip: '닫힌 문은 열기 전 손등 온도(🌡️)나 열화상(T)을 확인하고, 식용유·전기 불엔 전용 소화기를 쓰세요!' },
      { key: 'coop', label: '방화·배려', score: coopScore, tip: '지나온 방화문을 닫아(Space) 연기 확산을 막고, 고립된 이웃 위치를 확인하세요!' }
    ];

    let weakest = axes[0];
    for (let i = 1; i < axes.length; i++) {
      if (axes[i].score < weakest.score) weakest = axes[i];
    }

    const avg = Math.round(axes.reduce((acc, a) => acc + a.score, 0) / axes.length);
    return { axes, weakest, avg };
  }

  function drawSafetyCompetencyRadarChart(canvas, compData) {
    if (!canvas || !compData || !Array.isArray(compData.axes)) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w * 0.5;
    const cy = h * 0.54;
    const maxR = Math.min(w, h) * 0.34;
    const axes = compData.axes;
    const n = axes.length;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#090f1d';
    ctx.fillRect(0, 0, w, h);

    // Draw concentric pentagon webs (33%, 66%, 100%)
    for (let lv = 1; lv <= 3; lv++) {
      const r = (maxR * lv) / 3;
      ctx.strokeStyle = lv === 3 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(71, 85, 105, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI * 0.5 + (i * Math.PI * 2) / n;
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Spokes
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI * 0.5 + (i * Math.PI * 2) / n;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * maxR, cy + Math.sin(ang) * maxR);
      ctx.stroke();
    }

    // Data polygon
    ctx.fillStyle = 'rgba(16, 185, 129, 0.34)';
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI * 0.5 + (i * Math.PI * 2) / n;
      const r = maxR * (Math.max(20, axes[i].score) / 100);
      const px = cx + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Vertex dots & Axis Labels
    ctx.font = 'bold 9.5px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI * 0.5 + (i * Math.PI * 2) / n;
      const r = maxR * (Math.max(20, axes[i].score) / 100);
      const vx = cx + Math.cos(ang) * r;
      const vy = cy + Math.sin(ang) * r;
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(vx, vy, 2.8, 0, Math.PI * 2);
      ctx.fill();

      const lx = cx + Math.cos(ang) * (maxR + 16);
      const ly = cy + Math.sin(ang) * (maxR + 13);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(`${axes[i].label}(${axes[i].score})`, lx, ly);
    }
  }

  // --- Strategy #10: Family Fire Escape Plan & Home Safety Audit PNG Card Renderer ---
  function renderFamilyEscapePlanCard(canvas, data) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const d = data || {};

    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#1e293b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Outer Border
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Header
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🏠 가정 연계 소방안전 점검표 · FAMILY FIRE ESCAPE PLAN', 24, 34);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px "Noto Sans KR", sans-serif';
    ctx.fillText(`🚒 [${d.familyName || '우리 가족'}] 화재 대피 약속 카드`, 24, 62);

    // Divider
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(24, 76);
    ctx.lineTo(w - 24, 76);
    ctx.stroke();

    // Key Info Rows
    const rows = [
      { icon: '🧯', title: '우리 집 소화기 위치', val: d.extLocation || '현관 신발장 옆 & 주방 싱크대 옆' },
      { icon: '🪢', title: '비상 피난설비 확인', val: d.equipChecked || '경량칸막이 · 완강기 · 단독경보형 감지기 점검 완료' },
      { icon: '📍', title: '화재 시 가족 밖 집결지', val: d.meetingSpot || '아파트 정문 시계탑 놀이터 앞 (재진입 절대 금지!)' },
      { icon: '💬', title: '우리 가족 안전 다짐', val: d.pledge || '불나면 물건을 챙기지 않고 낮은 자세로 즉시 대피해요!' }
    ];

    let y = 102;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      ctx.fillStyle = 'rgba(2, 6, 23, 0.68)';
      ctx.fillRect(24, y - 18, w - 48, 38);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.strokeRect(24, y - 18, w - 48, 38);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px "Noto Sans KR", sans-serif';
      ctx.fillText(`${r.icon} ${r.title}:`, 34, y + 4);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 12.5px "Noto Sans KR", sans-serif';
      ctx.fillText(String(r.val).slice(0, 36), 182, y + 4);
      y += 46;
    }

    // Footer Stamp
    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 11.5px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('✓ 119 소방안전 교육 공식 점검 완료 · 화재 탈출 넘버원 3D', w - 26, h - 22);
  }

  // =========================================================================
  // 10-POINT 3D SCREEN ADVANCEMENT ENGINE (v26)
  // =========================================================================

  // --- Strategy #7 & #3 & #10 State: Camera Morph Transition, Hand Recoil & Dynamic 3D LOD ---
  const cameraMorphState = {
    active: false,
    fromMode: 'DIORAMA_3D',
    toMode: 'FPS_3D',
    timer: 0,
    duration: 0.42
  };

  const handActionRecoilState = {
    timer: 0,
    duration: 0.28,
    kind: 'spray' // 'spray' | 'axe' | 'bucket' | 'interact'
  };

  const dynamic3DLodState = {
    emaDt: 0.0166,
    rayMultiplier: 1.0,
    particleStride: 1,
    fpsEstimate: 60
  };

  function triggerCameraMorphTransition(fromMode, toMode) {
    cameraMorphState.active = true;
    cameraMorphState.fromMode = fromMode || 'DIORAMA_3D';
    cameraMorphState.toMode = toMode || 'FPS_3D';
    cameraMorphState.timer = 0;
  }

  function triggerHandActionRecoil(kind = 'spray') {
    handActionRecoilState.kind = kind;
    handActionRecoilState.duration = kind === 'axe' ? 0.34 : 0.26;
    handActionRecoilState.timer = handActionRecoilState.duration;
  }

  function updateDynamic3DLod(dt) {
    if (dt > 0.001 && dt < 0.25) {
      dynamic3DLodState.emaDt = dynamic3DLodState.emaDt * 0.90 + dt * 0.10;
      const fps = Math.round(1 / Math.max(0.008, dynamic3DLodState.emaDt));
      dynamic3DLodState.fpsEstimate = Math.min(120, Math.max(15, fps));
      if (dynamic3DLodState.emaDt > 0.026) {
        dynamic3DLodState.rayMultiplier = Math.max(0.68, dynamic3DLodState.rayMultiplier - dt * 0.45);
        dynamic3DLodState.particleStride = 2;
      } else if (dynamic3DLodState.emaDt < 0.0185) {
        dynamic3DLodState.rayMultiplier = Math.min(1.0, dynamic3DLodState.rayMultiplier + dt * 0.35);
        dynamic3DLodState.particleStride = 1;
      }
    }
    if (cameraMorphState.active) {
      cameraMorphState.timer += dt;
      if (cameraMorphState.timer >= cameraMorphState.duration) {
        cameraMorphState.active = false;
      }
    }
    if (handActionRecoilState.timer > 0) {
      handActionRecoilState.timer = Math.max(0, handActionRecoilState.timer - dt);
    }
  }

  function getDynamic3DLod() {
    return dynamic3DLodState;
  }

  function safeRoundRect(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  // --- Strategy #1: Convection-Based 2-Layer 3D Volumetric Smoke & Fresh Air Survival Zone ---
  function drawConvectionSmokeLayersDiorama(ctx, smokes, player, tileSize, wallH, crouchLerp, now) {
    if (!smokes || smokes.length === 0) return;
    ctx.save();
    const isCrouching = !!(player && player.crouching);

    for (let i = 0; i < smokes.length; i++) {
      const s = smokes[i];
      const sx = (s.c + 0.5) * tileSize;
      const floorY = (s.r + 0.58) * tileSize;
      const ceilY = (s.r + 0.45) * tileSize - wallH * (0.62 + 0.12 * crouchLerp);
      const drift = Math.sin(now * 1.4 + (s.phase || i)) * tileSize * 0.09;

      // 1) Lower Fresh-Air Survival Zone (생존 공기층 30~60cm) near Floor
      const freshAlpha = isCrouching ? 0.28 : 0.12;
      ctx.fillStyle = `rgba(16, 185, 129, ${freshAlpha})`;
      ctx.strokeStyle = isCrouching ? 'rgba(52, 211, 153, 0.72)' : 'rgba(52, 211, 153, 0.28)';
      ctx.lineWidth = isCrouching ? 1.6 : 1.0;
      ctx.beginPath();
      ctx.ellipse(sx, floorY, tileSize * 0.42, tileSize * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 2) Upper Ceiling Toxic Convection Smoke Layer (천장 열기·유독연기 축적층)
      const upperAlpha = isCrouching ? 0.34 : 0.54;
      const grad = ctx.createRadialGradient(
        sx + drift * 0.5, ceilY - tileSize * 0.06, tileSize * 0.08,
        sx + drift, ceilY, tileSize * 0.54
      );
      grad.addColorStop(0, `rgba(15, 23, 42, ${upperAlpha + 0.14})`);
      grad.addColorStop(0.65, `rgba(51, 65, 85, ${upperAlpha})`);
      grad.addColorStop(1, 'rgba(30, 41, 59, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx + drift, ceilY, tileSize * 0.54, 0, Math.PI * 2);
      ctx.fill();
    }

    // Floating educational indicator above player when crouching in/near smoke
    if (isCrouching && player) {
      const nearSmoke = smokes.some(s => Math.hypot((s.c + 0.5) - player.x, (s.r + 0.5) - player.y) <= 2.3);
      if (nearSmoke) {
        const px = player.x * tileSize;
        const py = player.y * tileSize + tileSize * 0.34;
        ctx.fillStyle = 'rgba(6, 78, 59, 0.90)';
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.3;
        ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.17))}px "Noto Sans KR", sans-serif`;
        const msg = '🌿 바닥 생존 공기층(30~60cm) 호흡 중';
        const tw = ctx.measureText(msg).width + 10;
        const th = Math.max(13, Math.floor(tileSize * 0.24));
        ctx.fillRect(px - tw * 0.5, py - th * 0.5, tw, th);
        ctx.strokeRect(px - tw * 0.5, py - th * 0.5, tw, th);
        ctx.fillStyle = '#a7f3d0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(msg, px, py);
      }
    }
    ctx.restore();
  }

  function drawConvectionSmokeLayersFPS(ctx, width, height, horizon, smokes, player, project3DPoint, isPointVisibleInZBuffer, now) {
    if (!smokes || smokes.length === 0 || !project3DPoint) return;
    ctx.save();
    const isCrouching = !!(player && player.crouching);

    for (let i = 0; i < smokes.length; i++) {
      const s = smokes[i];
      const wx = s.c + 0.5;
      const wy = s.r + 0.5;
      // Project Upper Ceiling Smoke Plume (wz = 0.82) & Lower Fresh-Air Band (wz = 0.12)
      const ceilPt = project3DPoint(wx, wy, 0.82, 0.25);
      if (ceilPt && ceilPt.depth <= 7.5 && (!isPointVisibleInZBuffer || isPointVisibleInZBuffer(ceilPt.x, ceilPt.depth - 0.15))) {
        const rad = Math.min(width * 0.32, Math.max(18, (145 / ceilPt.depth)));
        const driftX = Math.sin(now * 1.3 + (s.phase || i)) * (14 / ceilPt.depth);
        const alpha = Math.max(0.08, Math.min(0.55, (1 - ceilPt.depth / 8.0) * (isCrouching ? 0.36 : 0.52)));
        const sg = ctx.createRadialGradient(ceilPt.x + driftX, ceilPt.y, rad * 0.15, ceilPt.x + driftX, ceilPt.y, rad);
        sg.addColorStop(0, `rgba(15, 23, 42, ${alpha})`);
        sg.addColorStop(0.6, `rgba(51, 65, 85, ${alpha * 0.75})`);
        sg.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(ceilPt.x + driftX, ceilPt.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      const floorPt = project3DPoint(wx, wy, 0.10, 0.25);
      if (floorPt && floorPt.depth <= 6.2 && (!isPointVisibleInZBuffer || isPointVisibleInZBuffer(floorPt.x, floorPt.depth - 0.15))) {
        const rx = Math.min(width * 0.22, Math.max(12, 78 / floorPt.depth));
        const ry = Math.max(4, rx * 0.32);
        const fAlpha = isCrouching ? 0.34 : 0.15;
        ctx.fillStyle = `rgba(16, 185, 129, ${fAlpha})`;
        ctx.strokeStyle = isCrouching ? 'rgba(52, 211, 153, 0.78)' : 'rgba(52, 211, 153, 0.32)';
        ctx.lineWidth = isCrouching ? 1.8 : 1.0;
        ctx.beginPath();
        ctx.ellipse(floorPt.x, floorPt.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Screen-space Stratified Layer Band Indicator when Crouching in/near Smoke
    const nearSmoke = player && smokes.some(s => Math.hypot((s.c + 0.5) - player.x, (s.r + 0.5) - player.y) <= 2.6);
    if (nearSmoke) {
      if (isCrouching) {
        const bandH = Math.max(26, height * 0.08);
        const fg = ctx.createLinearGradient(0, height - bandH, 0, height);
        fg.addColorStop(0, 'rgba(16, 185, 129, 0)');
        fg.addColorStop(1, 'rgba(16, 185, 129, 0.22)');
        ctx.fillStyle = fg;
        ctx.fillRect(0, height - bandH, width, bandH);
      } else {
        const topBand = Math.max(36, horizon * 0.55);
        const tg = ctx.createLinearGradient(0, 0, 0, topBand);
        tg.addColorStop(0, 'rgba(15, 23, 42, 0.62)');
        tg.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = tg;
        ctx.fillRect(0, 0, width, topBand);
      }
    }
    ctx.restore();
  }

  // --- Strategy #3: First-Person 3D (FPS_3D) Equipped Hand View-Model & Action Recoil ---
  function drawFirstPersonHandViewModel(ctx, width, height, player, walkPhase, forwardSurge, turnBias, now, reduceMotion) {
    if (!player) return;
    ctx.save();
    const bobX = reduceMotion ? 0 : Math.cos(walkPhase || 0) * (4.5 * (forwardSurge || 0)) - (turnBias || 0) * 10;
    const bobY = reduceMotion ? 0 : Math.abs(Math.sin(walkPhase || 0)) * (5.5 * (forwardSurge || 0));
    const recoilProgress = handActionRecoilState.timer > 0
      ? Math.sin((handActionRecoilState.timer / Math.max(0.05, handActionRecoilState.duration)) * Math.PI)
      : 0;

    const scale = Math.max(0.72, Math.min(1.18, Math.min(width, height) / 560));

    // 1. LEFT HAND VIEW-MODEL (Wet Towel / Gas Mask / Flashlight)
    if (player.wetTowel || player.hasTowel || player.hasMask || player.hasFlashlight) {
      ctx.save();
      const lx = width * 0.14 + bobX * 0.7;
      const ly = height - 18 * scale + bobY * 0.7;
      ctx.translate(lx, ly);
      ctx.scale(scale, scale);

      if (player.hasMask) {
        // 3D Respirator Filter Canister Badge on lower-left periphery
        ctx.fillStyle = 'rgba(15, 118, 110, 0.86)';
        ctx.strokeStyle = '#5eead4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        safeRoundRect(ctx, -52, -54, 108, 44, 12);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(-26, -32, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ccfbf1';
        ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('😷 방독면 필터 가동', -8, -28);
      } else if (player.wetTowel || player.hasTowel) {
        // 3D Left Forearm + Hand Holding Folded Wet/Dry Towel near Mouth/Nose
        const isWet = !!player.wetTowel;
        const wetness = Math.round(typeof player.towelWetness === 'number' ? player.towelWetness : 100);
        // Forearm sleeve
        ctx.fillStyle = '#1d4ed8';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-48, 24);
        ctx.lineTo(-18, -38);
        ctx.lineTo(18, -30);
        ctx.lineTo(-8, 24);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Folded 3D Towel
        ctx.fillStyle = isWet ? '#0284c7' : '#eab308';
        ctx.strokeStyle = isWet ? '#bae6fd' : '#fef08a';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        safeRoundRect(ctx, -24, -68, 86, 42, 8);
        ctx.fill();
        ctx.stroke();

        // Water droplets when wet
        if (isWet) {
          const dropY = (now * 18) % 14;
          ctx.fillStyle = '#7dd3fc';
          ctx.beginPath();
          ctx.arc(14, -22 + dropY, 3.2, 0, Math.PI * 2);
          ctx.arc(36, -25 + ((dropY + 7) % 14), 2.6, 0, Math.PI * 2);
          ctx.fill();
        }

        // Thumb & fingers gripping towel
        ctx.fillStyle = '#fed7aa';
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(4, -40, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10.5px "Noto Sans KR", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isWet ? `💧젖은수건 ${wetness}%` : '🧣마른수건(적시기 필요)', 19, -47);
      } else if (player.hasFlashlight) {
        // Left hand holding tactical 3D flashlight
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.beginPath();
        safeRoundRect(ctx, -24, -56, 68, 26, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(42, -43, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. RIGHT HAND VIEW-MODEL (Extinguisher / Fire Axe / Water Bucket)
    const hasExt = (player.extinguisherCharges || 0) > 0;
    const hasAxe = !!player.hasAxe;
    const hasBucket = (player.waterCharges || 0) > 0;

    if (hasExt || hasAxe || hasBucket) {
      ctx.save();
      const rx = width * 0.85 - bobX * 0.8 - recoilProgress * 14;
      const ry = height - 14 * scale + bobY * 0.85 + recoilProgress * 8;
      ctx.translate(rx, ry);
      ctx.scale(scale, scale);
      if (recoilProgress > 0 && handActionRecoilState.kind === 'axe') {
        ctx.rotate(-recoilProgress * 0.48);
      }

      if (hasExt) {
        // 3D Red Fire Extinguisher Cylinder, Brass Valve, Pressure Gauge & Aimed Nozzle Hose
        ctx.fillStyle = '#b91c1c';
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        safeRoundRect(ctx, -28, -82, 58, 86, 12);
        ctx.fill();
        ctx.stroke();

        // Specular highlight stripe on cylinder
        ctx.fillStyle = 'rgba(254, 202, 202, 0.28)';
        ctx.fillRect(-16, -76, 10, 74);

        // Metallic Valve & Handle Assembly
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-12, -98, 24, 16);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, -96);
        ctx.lineTo(24, -106);
        ctx.stroke();

        // Pressure Gauge (Green normal zone)
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, -88, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Black Hose & Horn Nozzle pointing toward 3D center-screen fire base
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(-12, -90);
        ctx.quadraticCurveTo(-48, -92, -66, -68);
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-62, -73);
        ctx.lineTo(-86, -82);
        ctx.lineTo(-82, -58);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Spray jet cone when recoil is active
        if (recoilProgress > 0.05 && handActionRecoilState.kind === 'spray') {
          const jetGrad = ctx.createLinearGradient(-84, -70, -185, -110);
          jetGrad.addColorStop(0, 'rgba(224, 242, 254, 0.85)');
          jetGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = jetGrad;
          ctx.beginPath();
          ctx.moveTo(-84, -70);
          ctx.lineTo(-190, -135);
          ctx.lineTo(-170, -75);
          ctx.closePath();
          ctx.fill();
        }

        // Charge count badge on cylinder
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-22, -52, 46, 20);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🧯x${player.extinguisherCharges}`, 1, -38);
      } else if (hasAxe) {
        // 3D Fire Axe Held in Right Hand
        ctx.fillStyle = '#78350f';
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 1.8;
        ctx.fillRect(-10, -96, 14, 98);
        ctx.strokeRect(-10, -96, 14, 98);

        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-10, -90);
        ctx.lineTo(-48, -104);
        ctx.lineTo(-44, -64);
        ctx.lineTo(-10, -72);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (hasBucket) {
        // 3D Water Bucket
        ctx.fillStyle = '#2563eb';
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        safeRoundRect(ctx, -28, -68, 56, 64, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(0, -64, 24, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🪣x${player.waterCharges}`, 0, -32);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // --- Strategy #4: Real-Time Floor Specular Reflections & Soft Directional 3D Shadows ---
  function drawFloorSpecularAndSoftShadowsDiorama(ctx, fires, guideSigns, grid, rows, cols, TILE, tileSize, now) {
    ctx.save();
    // 1. Anisotropic Floor Specular Highlights from Active Fires
    if (fires && fires.length > 0) {
      for (let i = 0; i < fires.length; i++) {
        const f = fires[i];
        const fx = (f.c + 0.5) * tileSize;
        const fy = (f.r + 0.72) * tileSize;
        const pulse = 0.82 + 0.18 * Math.sin(now * 6.4 + (f.phase || i));
        const isElec = f.fireType === 'electric';
        const specGrad = ctx.createRadialGradient(fx, fy, tileSize * 0.05, fx, fy, tileSize * 1.15 * pulse);
        specGrad.addColorStop(0, isElec ? 'rgba(125, 211, 252, 0.34)' : 'rgba(254, 240, 138, 0.34)');
        specGrad.addColorStop(0.5, isElec ? 'rgba(56, 189, 248, 0.14)' : 'rgba(251, 146, 60, 0.16)');
        specGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = specGrad;
        ctx.beginPath();
        ctx.ellipse(fx, fy, tileSize * 1.15 * pulse, tileSize * 0.52 * pulse, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Emerald Floor Specular Sheen in front of Emergency Exits (TILE.EXIT)
    if (grid && TILE) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] === TILE.EXIT) {
            const ex = (c + 0.5) * tileSize;
            const ey = (r + 0.65) * tileSize;
            const eg = ctx.createRadialGradient(ex, ey, tileSize * 0.06, ex, ey, tileSize * 1.25);
            eg.addColorStop(0, 'rgba(110, 231, 183, 0.32)');
            eg.addColorStop(0.55, 'rgba(16, 185, 129, 0.14)');
            eg.addColorStop(1, 'rgba(16, 185, 129, 0)');
            ctx.fillStyle = eg;
            ctx.beginPath();
            ctx.ellipse(ex, ey, tileSize * 1.2, tileSize * 0.65, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    ctx.restore();
  }

  function drawFloorSpecularFPS(ctx, fires, exitLightSources, project3DPoint, isPointVisibleInZBuffer, horizon, width, height, now) {
    if (!project3DPoint) return;
    ctx.save();
    // Glossy vertical specular streaks on perspective floor from fires
    if (fires && fires.length > 0) {
      for (let i = 0; i < fires.length; i++) {
        const f = fires[i];
        const pt = project3DPoint(f.c + 0.5, f.r + 0.5, 0.02, 0.22);
        if (!pt || pt.depth > 7.5 || pt.y < horizon) continue;
        if (isPointVisibleInZBuffer && !isPointVisibleInZBuffer(pt.x, pt.depth - 0.2)) continue;
        const rx = Math.min(width * 0.22, Math.max(14, 92 / pt.depth));
        const ry = Math.min(height * 0.18, Math.max(10, 64 / pt.depth));
        const pulse = 0.85 + 0.15 * Math.sin(now * 6.5 + (f.phase || i));
        const sg = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, Math.max(rx, ry));
        const isElec = f.fireType === 'electric';
        sg.addColorStop(0, isElec ? `rgba(125, 211, 252, ${0.32 * pulse})` : `rgba(254, 215, 170, ${0.34 * pulse})`);
        sg.addColorStop(0.55, isElec ? `rgba(56, 189, 248, ${0.14 * pulse})` : `rgba(249, 115, 22, ${0.15 * pulse})`);
        sg.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, rx, ry * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Glossy emerald floor reflection from EXIT doors
    if (exitLightSources && exitLightSources.length > 0) {
      for (let i = 0; i < exitLightSources.length; i++) {
        const ex = exitLightSources[i];
        const pt = project3DPoint(ex.x, ex.y, 0.02, 0.22);
        if (!pt || pt.depth > 8.0 || pt.y < horizon) continue;
        const rx = Math.min(width * 0.24, Math.max(16, 98 / pt.depth));
        const ry = Math.max(8, rx * 0.45);
        const eg = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, rx);
        eg.addColorStop(0, 'rgba(52, 211, 153, 0.30)');
        eg.addColorStop(0.6, 'rgba(16, 185, 129, 0.12)');
        eg.addColorStop(1, 'rgba(16, 185, 129, 0)');
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // --- Strategy #5: Stage-Themed 3D Ceiling Architecture & Exterior Skybox/Window Backdrops ---
  function drawStageThemedExteriorDiorama(ctx, boardW, boardH, wallH, stageIdx, now) {
    ctx.save();
    const skyTop = -wallH - 28;
    const skyH = 26;
    const isCamping = stageIdx === 6;
    const isSubway = stageIdx === 4;
    const isSchool = stageIdx === 3;
    const isQuake = stageIdx === 7;

    const bgGrad = ctx.createLinearGradient(0, skyTop, 0, -wallH + 4);
    if (isCamping) {
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(1, '#3b1510');
    } else if (isSubway) {
      bgGrad.addColorStop(0, '#020617');
      bgGrad.addColorStop(1, '#1e293b');
    } else if (isSchool) {
      bgGrad.addColorStop(0, '#0c192c');
      bgGrad.addColorStop(1, '#1e3a5f');
    } else {
      bgGrad.addColorStop(0, '#060b16');
      bgGrad.addColorStop(1, '#172554');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-6, skyTop, boardW + 18, skyH);

    if (isCamping) {
      ctx.fillStyle = '#fef08a';
      for (let i = 0; i < 12; i++) {
        const sx = ((i * 83) % Math.max(60, boardW - 16)) + 8;
        const sy = skyTop + 5 + ((i * 17) % 10);
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.fillStyle = '#064e3b';
      for (let tx = 8; tx < boardW - 8; tx += 18) {
        ctx.beginPath();
        ctx.moveTo(tx, -wallH);
        ctx.lineTo(tx + 7, skyTop + 8);
        ctx.lineTo(tx + 14, -wallH);
        ctx.closePath();
        ctx.fill();
      }
    } else if (isSubway) {
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
      ctx.lineWidth = 2;
      for (let rx = 16; rx < boardW; rx += 36) {
        ctx.beginPath();
        ctx.moveTo(rx, skyTop + 2);
        ctx.lineTo(rx - 6, -wallH);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, skyTop + 12);
      ctx.lineTo(boardW, skyTop + 12);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      for (let bx = 10; bx < boardW - 24; bx += 38) {
        const bh = 10 + ((bx * 7) % 12);
        ctx.fillRect(bx, -wallH - bh, 26, bh);
        ctx.fillStyle = 'rgba(253, 224, 71, 0.45)';
        ctx.fillRect(bx + 5, -wallH - bh + 3, 4, 4);
        ctx.fillRect(bx + 15, -wallH - bh + 3, 4, 4);
        ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      }
      if (isQuake) {
        const warnAlpha = 0.25 + 0.2 * Math.sin(now * 6);
        ctx.fillStyle = `rgba(244, 63, 94, ${warnAlpha})`;
        ctx.fillRect(-6, skyTop, boardW + 18, skyH);
      }
    }
    ctx.restore();
  }

  function drawStageThemedCeilingAndSkyboxFPS(ctx, width, horizon, stageIdx, fpsCamYaw, powerRestored, now) {
    if (horizon <= 8) return;
    ctx.save();
    const isCamping = stageIdx === 6;
    const isSubway = stageIdx === 4;
    const isSchool = stageIdx === 3;
    const isQuake = stageIdx === 7;
    const yawOffset = ((fpsCamYaw || 0) / (Math.PI * 2)) * width;

    if (isCamping) {
      const skyG = ctx.createLinearGradient(0, 0, 0, horizon);
      skyG.addColorStop(0, '#030712');
      skyG.addColorStop(0.65, '#1e1b4b');
      skyG.addColorStop(1, '#451a03');
      ctx.fillStyle = skyG;
      ctx.fillRect(0, 0, width, horizon);

      ctx.fillStyle = '#fef9c3';
      for (let i = 0; i < 24; i++) {
        const sx = ((i * 97 - yawOffset * 1.2) % width + width) % width;
        const sy = (i * 29) % Math.max(12, horizon * 0.72);
        const tw = 1.2 + (i % 2) * 0.8;
        ctx.fillRect(sx, sy, tw, tw);
      }
    } else if (isSubway) {
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.55)';
      ctx.lineWidth = 3;
      for (let r = 1; r <= 4; r++) {
        const ry = horizon * (r / 4.5);
        ctx.beginPath();
        ctx.moveTo(0, ry);
        ctx.quadraticCurveTo(width * 0.5, ry - 14 * (1 - r * 0.18), width, ry);
        ctx.stroke();
      }
    } else if (isSchool) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
      ctx.lineWidth = 1;
      for (let row = 1; row <= 3; row++) {
        const y = horizon * (row / 3.6);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(71, 85, 105, 0.35)';
      ctx.fillRect(width * 0.36, 0, width * 0.28, horizon * 0.42);
    } else {
      const swayX = isQuake ? Math.sin(now * 7.5) * 14 : 0;
      for (let k = -1; k <= 1; k++) {
        const lx = width * 0.5 + k * (width * 0.30) + swayX - ((yawOffset * 0.35) % (width * 0.30));
        const ly = horizon * 0.32;
        ctx.fillStyle = powerRestored ? 'rgba(254, 249, 195, 0.45)' : 'rgba(148, 163, 184, 0.18)';
        ctx.beginPath();
        ctx.ellipse(lx, ly, 22, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // --- Strategy #6: High-Temp Heat Shimmer Distortion & 3D Rising Embers/Soot Particles ---
  function drawHeatShimmerAndRisingEmbersDiorama(ctx, fires, grid, rows, cols, TILE, tileSize, wallH, now) {
    if ((!fires || fires.length === 0) && !grid) return;
    ctx.save();
    const stride = dynamic3DLodState.particleStride || 1;

    if (fires && fires.length > 0) {
      for (let i = 0; i < fires.length; i++) {
        const f = fires[i];
        const fx = (f.c + 0.5) * tileSize;
        const fy = (f.r + 0.5) * tileSize;

        // 1. Wavy High-Temp Heat Shimmer Ring above Flame
        const shimmerY = fy - wallH * 0.55;
        const wave = Math.sin(now * 7.0 + i * 1.7) * (tileSize * 0.06);
        ctx.strokeStyle = f.fireType === 'electric'
          ? 'rgba(125, 211, 252, 0.35)'
          : 'rgba(253, 186, 116, 0.36)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(fx + wave, shimmerY, tileSize * 0.34, tileSize * 0.12, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Helical 3D Rising Ember Sparks
        const sparkCount = stride === 1 ? 4 : 2;
        for (let sp = 0; sp < sparkCount; sp++) {
          const cycle = ((now * 1.45 + sp * 0.25 + (f.phase || i) * 0.3) % 1);
          const emberX = fx + Math.sin(now * 5.2 + sp * 2.1 + i) * (tileSize * 0.24);
          const emberY = fy - cycle * (wallH * 1.15);
          const emberR = Math.max(1.3, tileSize * 0.055 * (1 - cycle * 0.5));
          ctx.fillStyle = sp % 2 === 0 ? `rgba(253, 224, 71, ${1 - cycle})` : `rgba(251, 146, 60, ${1 - cycle})`;
          ctx.beginPath();
          ctx.arc(emberX, emberY, emberR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 3. Thermal Backdraft Shimmer on HOT_DOOR tiles
    if (grid && TILE) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] === TILE.HOT_DOOR) {
            const dx = (c + 0.5) * tileSize;
            const dy = (r + 0.5) * tileSize - wallH * 0.35;
            const pulse = 0.5 + 0.5 * Math.sin(now * 6.2 + c + r);
            ctx.strokeStyle = `rgba(248, 113, 113, ${0.32 + 0.28 * pulse})`;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(dx, dy, tileSize * (0.28 + 0.10 * pulse), 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
    }
    ctx.restore();
  }

  function drawHeatShimmerAndRisingEmbersFPS(ctx, fires, project3DPoint, isPointVisibleInZBuffer, now) {
    if (!fires || fires.length === 0 || !project3DPoint) return;
    ctx.save();
    const stride = dynamic3DLodState.particleStride || 1;
    const sparkCount = stride === 1 ? 5 : 3;

    for (let i = 0; i < fires.length; i++) {
      const f = fires[i];
      const basePt = project3DPoint(f.c + 0.5, f.r + 0.5, 0.45, 0.22);
      if (!basePt || basePt.depth > 7.5) continue;
      if (isPointVisibleInZBuffer && !isPointVisibleInZBuffer(basePt.x, basePt.depth - 0.2)) continue;

      // Wavy Heat Refraction Halo
      const haloR = Math.max(10, 46 / basePt.depth);
      const shimmerShift = Math.sin(now * 8.0 + i) * (5 / basePt.depth);
      ctx.strokeStyle = f.fireType === 'electric'
        ? 'rgba(125, 211, 252, 0.35)'
        : 'rgba(253, 186, 116, 0.32)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(basePt.x + shimmerShift, basePt.y - haloR * 0.45, haloR * 0.85, haloR * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Rising 3D Ember Sparks in World Space
      for (let sp = 0; sp < sparkCount; sp++) {
        const cycle = (now * 1.35 + sp * (1 / sparkCount) + (f.phase || i) * 0.2) % 1;
        const wz = 0.18 + cycle * 0.76;
        const wx = f.c + 0.5 + Math.sin(now * 4.8 + sp * 1.9 + i) * 0.18;
        const wy = f.r + 0.5 + Math.cos(now * 4.2 + sp * 1.7 + i) * 0.18;
        const ePt = project3DPoint(wx, wy, wz, 0.22);
        if (!ePt) continue;
        const rad = Math.max(1.5, (5.5 / ePt.depth) * (1 - cycle * 0.4));
        ctx.fillStyle = sp % 2 === 0
          ? `rgba(254, 240, 138, ${0.95 * (1 - cycle)})`
          : `rgba(251, 146, 60, ${0.92 * (1 - cycle)})`;
        ctx.beginPath();
        ctx.arc(ePt.x, ePt.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // --- Strategy #8: Articulated 3D Companion/NPC Distress & Synchronized Follow Rendering ---
  function drawArticulatedCompanion3DDiorama(ctx, items, rescuedCompanions, player, tileSize, wallH, now) {
    ctx.save();
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.type !== 'npc' && it.type !== 'dog') continue;
        const ix = (it.c + 0.5) * tileSize;
        const iy = (it.r + 0.5) * tileSize;
        const pulse = (now * 1.2 + i * 0.4) % 1;
        const ringR = tileSize * (0.28 + pulse * 0.52);

        ctx.strokeStyle = it.type === 'dog'
          ? `rgba(74, 222, 128, ${(1 - pulse) * 0.85})`
          : `rgba(56, 189, 248, ${(1 - pulse) * 0.85})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ix, iy, ringR, 0, Math.PI * 2);
        ctx.stroke();

        const callText = it.type === 'dog' ? '🐶 "멍멍! 구해주세요!"' : '🙋 "콜록! 여기 있어요!"';
        const callY = iy - wallH * 0.72 + Math.sin(now * 5 + i) * 2.5;
        ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.17))}px "Noto Sans KR", sans-serif`;
        const cw = ctx.measureText(callText).width + 8;
        const ch = Math.max(13, Math.floor(tileSize * 0.24));
        ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
        ctx.strokeStyle = it.type === 'dog' ? '#4ade80' : '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.fillRect(ix - cw * 0.5, callY - ch * 0.5, cw, ch);
        ctx.strokeRect(ix - cw * 0.5, callY - ch * 0.5, cw, ch);
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(callText, ix, callY);
      }
    }
    ctx.restore();
  }

  function drawArticulatedCompanion3DFPS(ctx, width, height, items, rescuedCompanions, player, project3DPoint, isPointVisibleInZBuffer, now) {
    if (!project3DPoint) return;
    ctx.save();
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.type !== 'npc' && it.type !== 'dog') continue;
        const pt = project3DPoint(it.c + 0.5, it.r + 0.5, 0.62, 0.25);
        if (!pt || pt.depth > 8.5) continue;
        if (isPointVisibleInZBuffer && !isPointVisibleInZBuffer(pt.x, pt.depth - 0.22)) continue;

        const pulse = (now * 1.3 + i * 0.3) % 1;
        const r = Math.max(12, (42 / pt.depth) * (0.5 + pulse * 0.7));
        ctx.strokeStyle = `rgba(74, 222, 128, ${(1 - pulse) * 0.85})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.stroke();

        const msg = it.type === 'dog' ? '🐶 초코 구조 요청!' : `🙋 ${it.name || '고립된 이웃'} 구조!`;
        ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
        const tw = ctx.measureText(msg).width + 10;
        ctx.fillStyle = 'rgba(6, 78, 59, 0.92)';
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.4;
        ctx.fillRect(pt.x - tw * 0.5, pt.y - r - 22, tw, 18);
        ctx.strokeRect(pt.x - tw * 0.5, pt.y - r - 22, tw, 18);
        ctx.fillStyle = '#ecfdf5';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(msg, pt.x, pt.y - r - 13);
      }
    }

    if (rescuedCompanions && rescuedCompanions.length > 0) {
      const compNames = rescuedCompanions.map(c => `${c.icon || '🧒'}${c.name || '동행자'}`).join(' · ');
      const postureTxt = (player && player.crouching) ? '🧎낮은자세 동행 중' : '🏃함께 대피 중';
      const label = `🤝 구조 동행: ${compNames} (${postureTxt})`;
      ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
      const bw = ctx.measureText(label).width + 16;
      const bx = width * 0.5 - bw * 0.5;
      const by = height - 62;
      ctx.fillStyle = 'rgba(6, 78, 59, 0.88)';
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      safeRoundRect(ctx, bx, by, bw, 22, 11);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#d1fae5';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, width * 0.5, by + 11);
    }
    ctx.restore();
  }

  // --- Strategy #9: 3D Hologram Interactive Focus Ring & World-Space Objective Beacon Pillar ---
  function draw3DHologramFocusAndBeaconDiorama(ctx, activeTarget, nextObj, player, tileSize, wallH, now) {
    ctx.save();
    if (activeTarget) {
      const tc = activeTarget.kind === 'item' ? activeTarget.item.c : activeTarget.c;
      const tr = activeTarget.kind === 'item' ? activeTarget.item.r : activeTarget.r;
      const cx = (tc + 0.5) * tileSize;
      const cy = (tr + 0.5) * tileSize;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -now * 18;
      ctx.beginPath();
      ctx.ellipse(0, 0, tileSize * 0.46, tileSize * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const br = tileSize * 0.42;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.2;
      const cLen = Math.max(4, tileSize * 0.14);
      ctx.beginPath();
      ctx.moveTo(-br, -br * 0.6 + cLen);
      ctx.lineTo(-br, -br * 0.6);
      ctx.lineTo(-br + cLen, -br * 0.6);
      ctx.moveTo(br - cLen, br * 0.6);
      ctx.lineTo(br, br * 0.6);
      ctx.lineTo(br, br * 0.6 - cLen);
      ctx.stroke();
      ctx.restore();
    }

    if (nextObj && player && !player.onFire) {
      const ox = (nextObj.c + 0.5) * tileSize;
      const oy = (nextObj.r + 0.5) * tileSize;
      const distMeters = (Math.hypot((nextObj.c + 0.5) - player.x, (nextObj.r + 0.5) - player.y) * 1.5).toFixed(1);
      const pillarH = wallH * 1.35;
      const beamW = Math.max(8, tileSize * 0.36);

      const beamGrad = ctx.createLinearGradient(ox, oy, ox, oy - pillarH);
      beamGrad.addColorStop(0, 'rgba(250, 204, 21, 0.36)');
      beamGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.18)');
      beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(ox - beamW * 0.5, oy - pillarH, beamW, pillarH);

      ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.17))}px "Noto Sans KR", sans-serif`;
      const distStr = `📍 ${distMeters}m`;
      const dw = ctx.measureText(distStr).width + 8;
      const dh = Math.max(12, Math.floor(tileSize * 0.22));
      ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.fillRect(ox - dw * 0.5, oy + tileSize * 0.18, dw, dh);
      ctx.strokeRect(ox - dw * 0.5, oy + tileSize * 0.18, dw, dh);
      ctx.fillStyle = '#bae6fd';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(distStr, ox, oy + tileSize * 0.18 + dh * 0.5);
    }
    ctx.restore();
  }

  function draw3DHologramFocusAndBeaconFPS(ctx, activeTarget, nextObj, player, project3DPoint, isPointVisibleInZBuffer, now) {
    if (!project3DPoint) return;
    ctx.save();
    if (activeTarget) {
      const tc = activeTarget.kind === 'item' ? activeTarget.item.c : activeTarget.c;
      const tr = activeTarget.kind === 'item' ? activeTarget.item.r : activeTarget.r;
      const pt = project3DPoint(tc + 0.5, tr + 0.5, 0.48, 0.20);
      if (pt && pt.depth <= 4.5) {
        const rad = Math.min(68, Math.max(18, 44 / pt.depth));
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -now * 20;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        const tag = '⚡ [Space] 즉시 작동';
        ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
        const tw = ctx.measureText(tag).width + 12;
        ctx.fillStyle = 'rgba(2, 6, 23, 0.90)';
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.5;
        ctx.fillRect(pt.x - tw * 0.5, pt.y - rad - 22, tw, 18);
        ctx.strokeRect(pt.x - tw * 0.5, pt.y - rad - 22, tw, 18);
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tag, pt.x, pt.y - rad - 13);
      }
    }

    if (nextObj && player && !player.onFire) {
      const botPt = project3DPoint(nextObj.c + 0.5, nextObj.r + 0.5, 0.05, 0.25);
      const topPt = project3DPoint(nextObj.c + 0.5, nextObj.r + 0.5, 0.92, 0.25);
      if (botPt && topPt && botPt.depth <= 10.5) {
        const visible = !isPointVisibleInZBuffer || isPointVisibleInZBuffer(botPt.x, botPt.depth + 0.35);
        const beamW = Math.max(8, Math.min(46, 32 / botPt.depth));
        const pillarH = Math.max(24, Math.abs(botPt.y - topPt.y));
        const alphaMul = visible ? 1.0 : 0.42;

        const bg = ctx.createLinearGradient(botPt.x, botPt.y, botPt.x, topPt.y);
        bg.addColorStop(0, `rgba(250, 204, 21, ${0.42 * alphaMul})`);
        bg.addColorStop(0.5, `rgba(56, 189, 248, ${0.24 * alphaMul})`);
        bg.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = bg;
        ctx.fillRect(botPt.x - beamW * 0.5, topPt.y, beamW, pillarH);

        const distM = (Math.hypot((nextObj.c + 0.5) - player.x, (nextObj.r + 0.5) - player.y) * 1.5).toFixed(1);
        const badgeTxt = `${nextObj.label || '🎯 목표'} (${distM}m)`;
        ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
        const bw = ctx.measureText(badgeTxt).width + 12;
        const by = Math.max(44, topPt.y - 14);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.fillRect(botPt.x - bw * 0.5, by - 10, bw, 20);
        ctx.strokeRect(botPt.x - bw * 0.5, by - 10, bw, 20);
        ctx.fillStyle = '#fde047';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeTxt, botPt.x, by);
      }
    }
    ctx.restore();
  }

  // --- Strategy #7: Cinematic 3D Camera Morphing Transition Overlay (DIORAMA_3D <-> FPS_3D) ---
  function drawCameraMorphTransitionOverlay(ctx, width, height) {
    if (!cameraMorphState.active) return;
    const p = Math.min(1, cameraMorphState.timer / Math.max(0.05, cameraMorphState.duration));
    const envelope = Math.sin(p * Math.PI);
    if (envelope <= 0.02) return;

    ctx.save();
    const toFps = cameraMorphState.toMode === 'FPS_3D';
    const cx = width * 0.5;
    const cy = height * 0.5;

    ctx.strokeStyle = `rgba(56, 189, 248, ${envelope * 0.45})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const rInner = toFps ? (1 - p) * 180 + 24 : p * 160 + 24;
      const rOuter = rInner + 95 * envelope;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * rInner, cy + Math.sin(ang) * rInner);
      ctx.lineTo(cx + Math.cos(ang) * rOuter, cy + Math.sin(ang) * rOuter);
      ctx.stroke();
    }

    const frameScale = toFps ? (1.35 - p * 0.35) : (0.65 + p * 0.35);
    const fw = width * 0.55 * frameScale;
    const fh = height * 0.55 * frameScale;
    ctx.strokeStyle = `rgba(250, 204, 21, ${envelope * 0.55})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - fw * 0.5, cy - fh * 0.5, fw, fh);

    const label = toFps ? '👁️ 1인칭 3D 몰입 시점 전환 중...' : '🧊 3D 전체 건물 입체 시점 전환 중...';
    ctx.font = 'bold 13px "Noto Sans KR", sans-serif';
    const lw = ctx.measureText(label).width + 24;
    ctx.fillStyle = `rgba(15, 23, 42, ${envelope * 0.90})`;
    ctx.strokeStyle = `rgba(56, 189, 248, ${envelope * 0.90})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    safeRoundRect(ctx, cx - lw * 0.5, cy - 18, lw, 36, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = `rgba(248, 250, 252, ${envelope})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
    ctx.restore();
  }

  // ============================================================================
  // v29: 02 레스큐 컨트롤 — 45° Isometric Dollhouse Cutaway 3D Engine & Home 3D Scene
  // ============================================================================
  const ISO_A = 1.00;
  const ISO_B = -0.58;
  const ISO_C = 0.36;
  const ISO_D = 0.78;
  const ISO_DET = ISO_A * ISO_D - ISO_B * ISO_C; // 0.9888

  function computeIsoTransform(canvasW, canvasH, cols, rows, zoomScale, focusX, focusY) {
    const uMin = ISO_B * rows; // -0.58 * rows
    const uMax = ISO_A * cols; // 1.00 * cols
    const vMin = 0;
    const vMax = ISO_C * cols + ISO_D * rows;
    const spanU = Math.max(1, uMax - uMin);
    const spanV = Math.max(1, vMax - vMin);

    const padX = canvasW * 0.04;
    const padTop = Math.max(52, canvasH * 0.11);
    const padBottom = Math.max(20, canvasH * 0.04);
    const availW = Math.max(160, canvasW - padX * 2);
    const availH = Math.max(140, canvasH - padTop - padBottom);

    const baseScaleX = availW / (spanU + 0.35);
    const baseScaleY = availH / (spanV + 1.15);
    const isCloseZoom = zoomScale && zoomScale > 1.22;
    const zoomFactor = isCloseZoom ? zoomScale : 1.04;
    const unit = Math.min(baseScaleX, baseScaleY * 1.12) * zoomFactor;
    const scaleX = unit;
    const scaleY = unit * 0.88;
    const wallZUnit = unit * 0.72;

    const uCenter = ISO_A * (cols * 0.5) + ISO_B * (rows * 0.5);
    const vCenter = ISO_C * (cols * 0.5) + ISO_D * (rows * 0.5);
    let originX = canvasW * 0.51 - uCenter * scaleX;
    let originY = canvasH * 0.54 - vCenter * scaleY + wallZUnit * 0.22;

    if (isCloseZoom && typeof focusX === 'number' && typeof focusY === 'number') {
      const fu = ISO_A * focusX + ISO_B * focusY;
      const fv = ISO_C * focusX + ISO_D * focusY;
      originX = canvasW * 0.5 - fu * scaleX;
      originY = canvasH * 0.54 - fv * scaleY;
    }

    return {
      originX,
      originY,
      scaleX,
      scaleY,
      wallZUnit,
      cols,
      rows,
      project(wx, wy, wz = 0) {
        const u = ISO_A * wx + ISO_B * wy;
        const v = ISO_C * wx + ISO_D * wy;
        return {
          x: originX + u * scaleX,
          y: originY + v * scaleY - wz * wallZUnit
        };
      }
    };
  }

  function screenToIsoTile(screenX, screenY, canvasW, canvasH, cols, rows, zoomScale, focusX, focusY) {
    const tf = computeIsoTransform(canvasW, canvasH, cols, rows, zoomScale, focusX, focusY);
    const u = (screenX - tf.originX) / tf.scaleX;
    const v = (screenY - tf.originY) / tf.scaleY;
    const wx = (ISO_D * u - ISO_B * v) / ISO_DET;
    const wy = (-ISO_C * u + ISO_A * v) / ISO_DET;
    return {
      wx,
      wy,
      col: Math.floor(wx),
      row: Math.floor(wy)
    };
  }

  function drawIsoQuad(ctx, p0, p1, p2, p3, fillStyle, strokeStyle, lineWidth = 1) {
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  function drawIsoPrism(ctx, tf, wx, wy, wz, dw, dh, dz, topCol, southCol, eastCol, strokeCol) {
    const b00 = tf.project(wx, wy, wz);
    const b10 = tf.project(wx + dw, wy, wz);
    const b11 = tf.project(wx + dw, wy + dh, wz);
    const b01 = tf.project(wx, wy + dh, wz);

    const t00 = tf.project(wx, wy, wz + dz);
    const t10 = tf.project(wx + dw, wy, wz + dz);
    const t11 = tf.project(wx + dw, wy + dh, wz + dz);
    const t01 = tf.project(wx, wy + dh, wz + dz);

    // South face (wy + dh)
    drawIsoQuad(ctx, b01, b11, t11, t01, southCol, strokeCol, 0.8);
    // East face (wx + dw)
    drawIsoQuad(ctx, b10, b11, t11, t10, eastCol, strokeCol, 0.8);
    // Top face (wz + dz)
    drawIsoQuad(ctx, t00, t10, t11, t01, topCol, strokeCol, 0.9);
  }

  function classifyIsoRoomZone(c, r, stageIdx) {
    if (stageIdx === 0) {
      if (r <= 3 && c <= 4) return 'BEDROOM';
      if (r <= 3 && c >= 5 && c <= 8) return 'BATHROOM';
      if (r <= 3 && c >= 9) return 'STUDY';
      return 'CORRIDOR';
    }
    if (stageIdx === 1) {
      if (r <= 4 && c <= 6) return 'KITCHEN';
      if (r <= 4 && c >= 7) return 'LIVING';
      return 'CORRIDOR';
    }
    if (stageIdx === 2) {
      if (r >= 6) return 'BALCONY';
      if (c <= 5) return 'BEDROOM';
      return 'LIVING';
    }
    if (stageIdx === 3) return 'SCIENCELAB';
    if (stageIdx === 4) return 'SUBWAY';
    if (stageIdx === 6) return 'CAMP';
    if (stageIdx === 7) return 'EARTHQUAKE';
    return (r <= 3 && c <= 5) ? 'BEDROOM' : 'CORRIDOR';
  }

  function drawIsoStageBackdrop(ctx, tf, canvasW, canvasH, cols, rows, stageIdx, now) {
    // 1. Deep Atmospheric Studio Backdrop
    const bgGrad = ctx.createRadialGradient(
      canvasW * 0.5, canvasH * 0.46, canvasW * 0.08,
      canvasW * 0.5, canvasH * 0.5, canvasW * 0.72
    );
    if (stageIdx === 6) {
      bgGrad.addColorStop(0, '#0f221d');
      bgGrad.addColorStop(0.65, '#071210');
      bgGrad.addColorStop(1, '#030807');
    } else {
      bgGrad.addColorStop(0, '#1a2438');
      bgGrad.addColorStop(0.62, '#0c1220');
      bgGrad.addColorStop(1, '#050811');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // 2. Subtle Isometric Blueprint Grid in Outer Studio Space
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.05)';
    ctx.lineWidth = 1;
    for (let c = -2; c <= cols + 2; c += 2) {
      const pA = tf.project(c, -2, -0.22);
      const pB = tf.project(c, rows + 2, -0.22);
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();
    }
    for (let r = -2; r <= rows + 2; r += 2) {
      const pA = tf.project(-2, r, -0.22);
      const pB = tf.project(cols + 2, r, -0.22);
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();
    }
    ctx.restore();

    // 3. 3D Architectural Cutaway Foundation Plinth Under Building
    const plinthDepth = 0.34;
    const p00 = tf.project(-0.12, -0.12, 0);
    const p10 = tf.project(cols + 0.12, -0.12, 0);
    const p11 = tf.project(cols + 0.12, rows + 0.12, 0);
    const p01 = tf.project(-0.12, rows + 0.12, 0);

    const b10 = tf.project(cols + 0.12, -0.12, -plinthDepth);
    const b11 = tf.project(cols + 0.12, rows + 0.12, -plinthDepth);
    const b01 = tf.project(-0.12, rows + 0.12, -plinthDepth);

    // Drop shadow beneath foundation
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.beginPath();
    ctx.moveTo(b01.x - 12, b01.y + 18);
    ctx.lineTo(b11.x + 14, b11.y + 22);
    ctx.lineTo(b10.x + 18, b10.y + 14);
    ctx.lineTo(p00.x - 10, p00.y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // South & East concrete slab faces
    drawIsoQuad(ctx, b01, b11, p11, p01, '#1e2636', '#0f172a', 1.2);
    drawIsoQuad(ctx, b10, b11, p11, p10, '#151c28', '#0f172a', 1.2);
  }

  function drawIsoFloorTile(ctx, tf, c, r, tile, T, stageIdx, now) {
    const p00 = tf.project(c, r, 0);
    const p10 = tf.project(c + 1, r, 0);
    const p11 = tf.project(c + 1, r + 1, 0);
    const p01 = tf.project(c, r + 1, 0);

    const zone = classifyIsoRoomZone(c, r, stageIdx);
    const parity = (c + r) % 2 === 0;

    let baseCol = '#9b6b43';
    let seamCol = 'rgba(68, 42, 22, 0.38)';

    if (zone === 'BEDROOM') {
      baseCol = parity ? '#b88454' : '#ae7a4b';
      seamCol = 'rgba(74, 46, 24, 0.35)';
    } else if (zone === 'BATHROOM') {
      baseCol = parity ? '#8ea3b7' : '#8297ac';
      seamCol = 'rgba(226, 232, 240, 0.38)';
    } else if (zone === 'STUDY') {
      baseCol = parity ? '#8a6240' : '#7f5838';
      seamCol = 'rgba(54, 34, 18, 0.36)';
    } else if (zone === 'KITCHEN') {
      baseCol = parity ? '#cbd5e1' : '#94a3b8';
      seamCol = 'rgba(71, 85, 105, 0.35)';
    } else if (zone === 'BALCONY') {
      baseCol = parity ? '#64748b' : '#526277';
      seamCol = 'rgba(30, 41, 59, 0.45)';
    } else if (zone === 'SCIENCELAB') {
      baseCol = parity ? '#334155' : '#293548';
      seamCol = 'rgba(148, 163, 184, 0.22)';
    } else if (zone === 'SUBWAY') {
      baseCol = (r === 4 || r === 6) ? '#ca8a04' : (parity ? '#334155' : '#273244');
      seamCol = 'rgba(15, 23, 42, 0.45)';
    } else if (zone === 'CAMP') {
      baseCol = parity ? '#1e3a29' : '#173022';
      seamCol = 'rgba(15, 23, 42, 0.28)';
    } else {
      // Corridor / Hallway warm walnut wood planks
      baseCol = parity ? '#9c6b3f' : '#916137';
      seamCol = 'rgba(58, 35, 16, 0.42)';
    }

    if (tile === T.EXIT) {
      baseCol = '#065f46';
      seamCol = '#34d399';
    }

    drawIsoQuad(ctx, p00, p10, p11, p01, baseCol, seamCol, 0.75);

    // Wood plank lines for Bedroom / Corridor / Study
    if (zone === 'BEDROOM' || zone === 'CORRIDOR' || zone === 'STUDY' || zone === 'LIVING') {
      const m0 = tf.project(c, r + 0.5, 0);
      const m1 = tf.project(c + 1, r + 0.5, 0);
      ctx.beginPath();
      ctx.moveTo(m0.x, m0.y);
      ctx.lineTo(m1.x, m1.y);
      ctx.strokeStyle = 'rgba(56, 34, 16, 0.24)';
      ctx.lineWidth = 0.65;
      ctx.stroke();
    } else if (zone === 'BATHROOM') {
      // Sub-tile ceramic cross grout
      const m0 = tf.project(c, r + 0.5, 0);
      const m1 = tf.project(c + 1, r + 0.5, 0);
      const n0 = tf.project(c + 0.5, r, 0);
      const n1 = tf.project(c + 0.5, r + 1, 0);
      ctx.beginPath();
      ctx.moveTo(m0.x, m0.y);
      ctx.lineTo(m1.x, m1.y);
      ctx.moveTo(n0.x, n0.y);
      ctx.lineTo(n1.x, n1.y);
      ctx.strokeStyle = 'rgba(241, 245, 249, 0.25)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // Cozy Bedroom Woven Area Rug (c=2..3, r=1..2)
    if (stageIdx === 0 && c >= 2 && c <= 3 && r >= 1 && r <= 2 && tile === T.FLOOR) {
      const r00 = tf.project(c + 0.06, r + 0.06, 0.01);
      const r10 = tf.project(c + 0.94, r + 0.06, 0.01);
      const r11 = tf.project(c + 0.94, r + 0.94, 0.01);
      const r01 = tf.project(c + 0.06, r + 0.94, 0.01);
      drawIsoQuad(ctx, r00, r10, r11, r01, 'rgba(71, 85, 105, 0.65)', 'rgba(203, 213, 225, 0.45)', 0.9);
    }

    // Corridor Runner Carpet strip (r === 7, c=4..11)
    if (stageIdx === 0 && r === 7 && c >= 4 && c <= 11 && tile === T.FLOOR) {
      const r00 = tf.project(c, r + 0.18, 0.01);
      const r10 = tf.project(c + 1, r + 0.18, 0.01);
      const r11 = tf.project(c + 1, r + 0.82, 0.01);
      const r01 = tf.project(c, r + 0.82, 0.01);
      drawIsoQuad(ctx, r00, r10, r11, r01, 'rgba(124, 45, 18, 0.42)', 'rgba(251, 191, 36, 0.28)', 0.7);
    }
  }

  function isCutawayLowWall(c, r, cols, rows, grid, T) {
    // Keep back walls (r === 0, c === 0) and upper vertical room dividers tall; cutaway foreground/interior horizontal walls so rooms & beds are 100% visible
    if (r === 0 || c === 0) return false;
    if (r <= 2 && (c === 4 || c === 9)) return false;
    return true;
  }

  function drawIsoWallTile(ctx, tf, c, r, cols, rows, grid, T, tile, now) {
    const lowCut = isCutawayLowWall(c, r, cols, rows, grid, T);
    const wz = lowCut ? 0.34 : 1.38;

    const isPartition = tile === T.PARTITION;
    const topCol = isPartition ? '#7c2d12' : '#283347';
    const southCol = isPartition ? '#b45309' : '#d8cab8';
    const eastCol = isPartition ? '#92400e' : '#c4b39f';
    const rimCol = isPartition ? '#fb923c' : '#475569';

    drawIsoPrism(ctx, tf, c, r, 0, 1, 1, wz, topCol, southCol, eastCol, rimCol);

    // Dark wood baseboard along South and East interior wall bottom edges
    if (!lowCut && !isPartition) {
      const southFloor = (r + 1 < rows) && grid[r + 1][c] !== T.WALL;
      const eastFloor = (c + 1 < cols) && grid[r][c + 1] !== T.WALL;
      if (southFloor) {
        const b0 = tf.project(c, r + 1, 0);
        const b1 = tf.project(c + 1, r + 1, 0);
        const t1 = tf.project(c + 1, r + 1, 0.12);
        const t0 = tf.project(c, r + 1, 0.12);
        drawIsoQuad(ctx, b0, b1, t1, t0, '#4a3525', null, 0);
      }
      if (eastFloor) {
        const b0 = tf.project(c + 1, r, 0);
        const b1 = tf.project(c + 1, r + 1, 0);
        const t1 = tf.project(c + 1, r + 1, 0.12);
        const t0 = tf.project(c + 1, r, 0.12);
        drawIsoQuad(ctx, b0, b1, t1, t0, '#3d2b1d', null, 0);
      }

      // Framed wall art & window curtains on back walls (r === 0)
      if (r === 0 && southFloor) {
        if (c === 2) {
          // Framed picture on bedroom wall
          const f0 = tf.project(c + 0.18, 1.01, 0.55);
          const f1 = tf.project(c + 0.82, 1.01, 0.55);
          const f2 = tf.project(c + 0.82, 1.01, 1.08);
          const f3 = tf.project(c + 0.18, 1.01, 1.08);
          drawIsoQuad(ctx, f0, f1, f2, f3, '#38bdf8', '#4a3525', 2);
        } else if (c === 6) {
          // Bathroom glowing vanity mirror on back wall
          const m0 = tf.project(c + 0.15, 1.01, 0.52);
          const m1 = tf.project(c + 0.85, 1.01, 0.52);
          const m2 = tf.project(c + 0.85, 1.01, 1.16);
          const m3 = tf.project(c + 0.15, 1.01, 1.16);
          drawIsoQuad(ctx, m0, m1, m2, m3, '#bae6fd', '#94a3b8', 1.5);
        }
      }

      // Warm Wall Sconce Lights (복도 벽부등) casting golden glow
      if (southFloor && ((r === 0 && (c === 3 || c === 10)) || (r === 3 && (c === 2 || c === 7)))) {
        const sp = tf.project(c + 0.5, r + 1.02, 0.92);
        const fp = tf.project(c + 0.5, r + 1.45, 0.02);
        const rad = Math.max(18, tf.scaleX * 0.95);
        const glow = ctx.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y + rad * 0.35, rad);
        glow.addColorStop(0, 'rgba(254, 240, 138, 0.72)');
        glow.addColorStop(0.45, 'rgba(251, 191, 36, 0.24)');
        glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y + rad * 0.2, rad, 0, Math.PI * 2);
        ctx.fill();

        // Floor warm light pool
        const fglow = ctx.createRadialGradient(fp.x, fp.y, 2, fp.x, fp.y, rad * 0.85);
        fglow.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
        fglow.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = fglow;
        ctx.beginPath();
        ctx.arc(fp.x, fp.y, rad * 0.85, 0, Math.PI * 2);
        ctx.fill();

        // Sconce fixture
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawIsoFurnitureAndProps(ctx, tf, c, r, tile, T, stageIdx, now, player) {
    const zone = classifyIsoRoomZone(c, r, stageIdx);

    // 1. Detailed 3D Bedroom Bed with Blue Checkered Duvet (Stage 1 Bedroom furniture at c<=3, r<=3)
    if (tile === T.FURNITURE && zone === 'BEDROOM' && c <= 3 && r <= 3) {
      // Bed Wooden Frame & Headboard
      drawIsoPrism(ctx, tf, c + 0.06, r + 0.06, 0, 0.88, 0.88, 0.28, '#784b2a', '#5c371d', '#4a2b15', '#361e0d');
      drawIsoPrism(ctx, tf, c + 0.06, r + 0.06, 0.28, 0.88, 0.16, 0.42, '#8c5832', '#6e4323', '#543218', '#361e0d');
      // White Mattress & Blue Plaid Duvet
      drawIsoPrism(ctx, tf, c + 0.10, r + 0.20, 0.26, 0.80, 0.70, 0.16, '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af');
      // Plaid stripes on duvet top
      const d0 = tf.project(c + 0.12, r + 0.52, 0.43);
      const d1 = tf.project(c + 0.88, r + 0.52, 0.43);
      ctx.strokeStyle = 'rgba(191, 219, 254, 0.65)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(d0.x, d0.y);
      ctx.lineTo(d1.x, d1.y);
      ctx.stroke();
      // White Fluffy Pillow
      drawIsoPrism(ctx, tf, c + 0.20, r + 0.22, 0.42, 0.58, 0.22, 0.09, '#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8');

      // Warm Bedside Nightstand Lamp Glow next to bed
      const lp = tf.project(c + 0.92, r + 0.22, 0.55);
      const lg = ctx.createRadialGradient(lp.x, lp.y, 2, lp.x, lp.y, tf.scaleX * 0.9);
      lg.addColorStop(0, 'rgba(254, 240, 138, 0.65)');
      lg.addColorStop(0.5, 'rgba(251, 191, 36, 0.22)');
      lg.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(lp.x, lp.y, tf.scaleX * 0.9, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // 2. Bathroom Porcelain Sink (T.SINK) + Toilet Prop
    if (tile === T.SINK) {
      // Vanity Cabinet + White Ceramic Washbasin
      drawIsoPrism(ctx, tf, c + 0.14, r + 0.12, 0, 0.72, 0.64, 0.48, '#f8fafc', '#cbd5e1', '#94a3b8', '#64748b');
      // Blue water pool inside basin
      drawIsoPrism(ctx, tf, c + 0.24, r + 0.22, 0.48, 0.52, 0.42, 0.04, '#38bdf8', '#0284c7', '#0369a1', '#bae6fd');
      // Companion Porcelain Toilet on left side of bathroom if in bathroom zone
      if (zone === 'BATHROOM') {
        drawIsoPrism(ctx, tf, c - 0.78, r + 0.12, 0, 0.44, 0.52, 0.34, '#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8');
        drawIsoPrism(ctx, tf, c - 0.78, r + 0.08, 0.34, 0.44, 0.18, 0.32, '#ffffff', '#e2e8f0', '#cbd5e1', '#94a3b8');
      }
      drawIsoBadgeLabel(ctx, tf, c + 0.5, r + 0.5, 0.85, '🚰 세면대', '#0284c7');
      return;
    }

    // 3. Doors (Closed Door, Open Door, Hot Door, Locked Door)
    const isClosedDoor = tile === T.DOOR || tile === T.DOOR_CLOSED;
    const isOpenDoor = tile === T.OPEN_DOOR || tile === T.DOOR_OPEN;
    if (isClosedDoor || isOpenDoor || tile === T.HOT_DOOR || tile === T.LOCKED_DOOR) {
      const isHot = tile === T.HOT_DOOR;
      const isOpen = isOpenDoor;
      const isLocked = tile === T.LOCKED_DOOR;
      const topC = isHot ? '#dc2626' : (isLocked ? '#475569' : '#9a5b32');
      const southC = isHot ? '#b91c1c' : (isLocked ? '#334155' : '#7c4522');
      const eastC = isHot ? '#991b1b' : (isLocked ? '#1e293b' : '#5e3216');

      if (isOpen) {
        // Swung open door leaf on the side
        drawIsoPrism(ctx, tf, c + 0.05, r + 0.05, 0, 0.18, 0.86, 1.18, '#a3663b', '#854f2b', '#693c1e', '#facc15');
        drawIsoBadgeLabel(ctx, tf, c + 0.5, r + 0.5, 1.28, '🚪 열린문(닫기)', '#0284c7');
      } else {
        drawIsoPrism(ctx, tf, c + 0.08, r + 0.36, 0, 0.84, 0.28, 1.22, topC, southC, eastC, isHot ? '#fbbf24' : '#3e200d');
        if (isHot) {
          const hp = tf.project(c + 0.5, r + 0.5, 0.6);
          const hg = ctx.createRadialGradient(hp.x, hp.y, 2, hp.x, hp.y, tf.scaleX * 0.85);
          hg.addColorStop(0, 'rgba(239, 68, 68, 0.55)');
          hg.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = hg;
          ctx.beginPath();
          ctx.arc(hp.x, hp.y, tf.scaleX * 0.85, 0, Math.PI * 2);
          ctx.fill();
          drawIsoBadgeLabel(ctx, tf, c + 0.5, r + 0.5, 1.38, '🌡️ 고온문', '#dc2626');
        } else if (isLocked) {
          drawIsoBadgeLabel(ctx, tf, c + 0.5, r + 0.5, 1.35, '🔒 잠긴문', '#475569');
        } else {
          drawIsoBadgeLabel(ctx, tf, c + 0.5, r + 0.5, 1.34, '🚪 방화문', '#b45309');
        }
      }
      return;
    }

    // 4. Glowing Green [🏃 EXIT] Doorway + Neon Green Floor Projection Arrow (➔)
    if (tile === T.EXIT) {
      // Illuminated Green Portal Arch
      drawIsoPrism(ctx, tf, c + 0.08, r + 0.08, 0, 0.84, 0.18, 1.36, '#10b981', '#059669', '#047857', '#6ee7b7');

      // Glowing Green Floor Projection Carpet & Arrow in front of EXIT
      const ep = tf.project(c + 0.5, r + 0.5, 0.05);
      const eg = ctx.createRadialGradient(ep.x, ep.y, 4, ep.x, ep.y, tf.scaleX * 1.45);
      eg.addColorStop(0, 'rgba(16, 185, 129, 0.62)');
      eg.addColorStop(0.55, 'rgba(52, 211, 153, 0.24)');
      eg.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, tf.scaleX * 1.45, 0, Math.PI * 2);
      ctx.fill();

      // Animated Neon Green Floor Arrow (➔) pointing into the EXIT
      const pulse = 0.75 + 0.25 * Math.sin(now * 5.5);
      const aStart = tf.project(c + 0.5, Math.max(0.5, r - 0.55), 0.04);
      const aTip = tf.project(c + 0.5, r + 0.35, 0.04);
      const aWing1 = tf.project(c + 0.18, r - 0.05, 0.04);
      const aWing2 = tf.project(c + 0.82, r - 0.05, 0.04);

      ctx.save();
      ctx.strokeStyle = `rgba(110, 231, 183, ${pulse})`;
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(aStart.x, aStart.y);
      ctx.lineTo(aTip.x, aTip.y);
      ctx.moveTo(aWing1.x, aWing1.y);
      ctx.lineTo(aTip.x, aTip.y);
      ctx.lineTo(aWing2.x, aWing2.y);
      ctx.stroke();
      ctx.restore();

      // Overhead [🏃 EXIT] Signboard
      drawIsoBadgeLabel(ctx, tf, c + 0.5, r + 0.5, 1.52, '🏃 EXIT 비상구', '#059669', '#ecfdf5');
      return;
    }

    // 5. Generic Furniture (Desk, Bookshelf, Sofa, Lab Table, Potted Plant)
    if (tile === T.FURNITURE || tile === T.DESK_SAFE || tile === T.DEBRIS || tile === T.ELEVATOR) {
      if (tile === T.ELEVATOR) {
        drawIsoPrism(ctx, tf, c + 0.08, r + 0.08, 0, 0.84, 0.84, 1.25, '#475569', '#334155', '#1e293b', '#f87171');
        drawIsoBadgeLabel(ctx, tf, c + 0.5, r + 0.5, 1.38, '🛗 승강기(탑승금지)', '#b91c1c');
        return;
      }
      if (tile === T.DEBRIS) {
        drawIsoPrism(ctx, tf, c + 0.14, r + 0.18, 0, 0.72, 0.64, 0.42, '#78350f', '#5c280b', '#451a03', '#f59e0b');
        drawIsoBadgeLabel(ctx, tf, c + 0.5, r + 0.5, 0.68, '🪵 장애물', '#92400e');
        return;
      }
      const isSafeDesk = tile === T.DESK_SAFE;
      drawIsoPrism(
        ctx, tf,
        c + 0.12, r + 0.12, 0,
        0.76, 0.76, 0.52,
        isSafeDesk ? '#0284c7' : '#85522d',
        isSafeDesk ? '#0369a1' : '#693f20',
        isSafeDesk ? '#075985' : '#523017',
        isSafeDesk ? '#7dd3fc' : '#3b210e'
      );
      // Add green potted plant on corridor/corner furniture
      if ((c + r) % 3 === 0 && !isSafeDesk) {
        const pp = tf.project(c + 0.5, r + 0.5, 0.66);
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, Math.max(5, tf.scaleX * 0.18), 0, Math.PI * 2);
        ctx.fill();
      }
      if (isSafeDesk) {
        drawIsoBadgeLabel(ctx, tf, c + 0.5, r + 0.5, 0.78, '🛡️ 내진책상', '#0284c7');
      }
      return;
    }

    // 6. Interactive Safety Items & Devices (Towel, Extinguisher, Bell, 119 Phone, Lifeline, Valve, Breaker, Mask, etc.)
    const itemMeta = getIsoInteractiveMeta(tile, T);
    if (itemMeta) {
      drawIsoPrism(
        ctx, tf,
        c + 0.24, r + 0.24, 0,
        0.52, 0.52, itemMeta.h,
        itemMeta.top, itemMeta.south, itemMeta.east, '#fde68a'
      );
      const bob = Math.sin(now * 4.2 + c + r) * 0.08;
      drawIsoBadgeLabel(ctx, tf, c + 0.5, r + 0.5, itemMeta.h + 0.34 + bob, itemMeta.label, itemMeta.badgeBg);
    }
  }

  function getIsoInteractiveMeta(tile, T) {
    if (tile === T.TOWEL) return { h: 0.28, top: '#38bdf8', south: '#0284c7', east: '#0369a1', label: '🧣 수건', badgeBg: '#0284c7' };
    if (tile === T.EXTINGUISHER) return { h: 0.52, top: '#ef4444', south: '#dc2626', east: '#b91c1c', label: '🧯 소화기', badgeBg: '#dc2626' };
    if (tile === T.ALARM_BELL || tile === T.BELL) return { h: 0.45, top: '#f59e0b', south: '#d97706', east: '#b45309', label: '🔔 비상벨', badgeBg: '#d97706' };
    if (tile === T.PHONE_119) return { h: 0.42, top: '#10b981', south: '#059669', east: '#047857', label: '📞 119신고', badgeBg: '#059669' };
    if (tile === T.GAS_VALVE) return { h: 0.44, top: '#f97316', south: '#ea580c', east: '#c2410c', label: '🔴 가스밸브', badgeBg: '#ea580c' };
    if (tile === T.BREAKER) return { h: 0.50, top: '#eab308', south: '#ca8a04', east: '#a16207', label: '⚡ 차단기', badgeBg: '#ca8a04' };
    if (tile === T.LIFELINE) return { h: 0.48, top: '#0ea5e9', south: '#0284c7', east: '#0369a1', label: '🪢 완강기', badgeBg: '#0284c7' };
    if (tile === T.MASK) return { h: 0.32, top: '#22c55e', south: '#16a34a', east: '#15803d', label: '😷 방연마스크', badgeBg: '#16a34a' };
    if (tile === T.FLASHLIGHT) return { h: 0.28, top: '#facc15', south: '#eab308', east: '#ca8a04', label: '🔦 손전등', badgeBg: '#ca8a04' };
    if (tile === T.AXE) return { h: 0.36, top: '#ef4444', south: '#b91c1c', east: '#991b1b', label: '🪓 소방도끼', badgeBg: '#b91c1c' };
    if (tile === T.KEY) return { h: 0.26, top: '#fbbf24', south: '#d97706', east: '#b45309', label: '🔑 열쇠', badgeBg: '#d97706' };
    if (tile === T.WATER_BUCKET) return { h: 0.38, top: '#3b82f6', south: '#2563eb', east: '#1d4ed8', label: '🪣 물양동이', badgeBg: '#2563eb' };
    if (tile === T.SAND_BAG) return { h: 0.34, top: '#d97706', south: '#b45309', east: '#92400e', label: '⏳ 모래주머니', badgeBg: '#b45309' };
    if (tile === T.NPC) return { h: 0.65, top: '#ec4899', south: '#db2777', east: '#be185d', label: '🧒 구조대상', badgeBg: '#db2777' };
    if (tile === T.HAZARD || tile === T.HAZARD_SPOT) return { h: 0.38, top: '#f43f5e', south: '#e11d48', east: '#be123c', label: '🔍 위험요소', badgeBg: '#e11d48' };
    if (tile === T.SAFE_BOX || tile === T.WIRE_PANEL) return { h: 0.46, top: '#06b6d4', south: '#0891b2', east: '#0e7490', label: '🔐 퍼즐장치', badgeBg: '#0891b2' };
    return null;
  }

  function drawIsoItemObject(ctx, tf, item, now) {
    if (!item || item.collected) return;
    const c = item.c;
    const r = item.r;
    let topC = '#38bdf8';
    let southC = '#0284c7';
    let eastC = '#0369a1';
    let h = 0.34;
    if (item.type === 'extinguisher') {
      topC = '#ef4444'; southC = '#dc2626'; eastC = '#991b1b'; h = 0.50;
    } else if (item.type === 'key' || item.type === 'flashlight') {
      topC = '#facc15'; southC = '#ca8a04'; eastC = '#854d0e'; h = 0.28;
    } else if (item.type === 'npc' || item.type === 'dog') {
      topC = '#f472b6'; southC = '#db2777'; eastC = '#9d174d'; h = 0.58;
    } else if (item.type === 'mask') {
      topC = '#4ade80'; southC = '#16a34a'; eastC = '#166534'; h = 0.32;
    }
    drawIsoPrism(ctx, tf, c + 0.25, r + 0.25, 0, 0.50, 0.50, h, topC, southC, eastC, '#fef08a');
    const bob = Math.sin(now * 4.2 + c + r) * 0.08;
    drawIsoBadgeLabel(ctx, tf, c + 0.5, r + 0.5, h + 0.34 + bob, `${item.icon || '✨'} ${item.name || item.type}`, southC);
  }

  function drawIsoBadgeLabel(ctx, tf, wx, wy, wz, text, bgColor, textColor = '#ffffff') {
    const pt = tf.project(wx, wy, wz);
    ctx.save();
    ctx.font = '800 10.5px "Noto Sans KR", sans-serif';
    const tw = ctx.measureText(text).width;
    const pw = tw + 12;
    const ph = 18;
    ctx.fillStyle = bgColor || 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    safeRoundRect(ctx, pt.x - pw * 0.5, pt.y - ph * 0.5, pw, ph, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, pt.x, pt.y + 0.5);
    ctx.restore();
  }

  function drawIsoVolumetricFire(ctx, tf, f, now) {
    const wx = f.c + 0.5;
    const wy = f.r + 0.5;
    const basePt = tf.project(wx, wy, 0.05);
    const scale = Math.max(16, tf.scaleX * 0.68);

    ctx.save();
    // 1. Dynamic Orange-Red Floor Firelight Glow
    const fg = ctx.createRadialGradient(basePt.x, basePt.y, 2, basePt.x, basePt.y, scale * 1.65);
    fg.addColorStop(0, 'rgba(251, 146, 60, 0.68)');
    fg.addColorStop(0.5, 'rgba(239, 68, 68, 0.28)');
    fg.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(basePt.x, basePt.y, scale * 1.65, 0, Math.PI * 2);
    ctx.fill();

    // 2. Multi-Layered 3D Volumetric Flame Tongues
    for (let i = 0; i < 4; i++) {
      const phase = now * 6.8 + f.c * 1.7 + f.r * 2.3 + i * 1.4;
      const sway = Math.sin(phase) * scale * 0.22;
      const flameH = scale * (1.25 + 0.32 * Math.sin(phase * 1.3)) * (1 - i * 0.14);
      const flameW = scale * (0.62 - i * 0.11);
      const ox = basePt.x + (i - 1.5) * scale * 0.16;
      const oy = basePt.y;

      const grad = ctx.createLinearGradient(ox, oy, ox + sway, oy - flameH);
      if (i === 3) {
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.6, '#facc15');
        grad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      } else {
        grad.addColorStop(0, '#dc2626');
        grad.addColorStop(0.45, '#f97316');
        grad.addColorStop(0.85, '#facc15');
        grad.addColorStop(1, 'rgba(251, 146, 60, 0)');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(ox - flameW, oy);
      ctx.quadraticCurveTo(ox - flameW * 0.5 + sway * 0.4, oy - flameH * 0.55, ox + sway, oy - flameH);
      ctx.quadraticCurveTo(ox + flameW * 0.5 + sway * 0.4, oy - flameH * 0.55, ox + flameW, oy);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Rising Dark Smoke Plume Above Fire
    for (let s = 0; s < 3; s++) {
      const sp = ((now * 0.85 + s * 0.33 + f.c * 0.19) % 1);
      const smPt = tf.project(wx + Math.sin(now * 2 + s) * 0.18, wy, 0.85 + sp * 0.95);
      const sr = scale * (0.38 + sp * 0.48);
      ctx.fillStyle = `rgba(30, 41, 59, ${(1 - sp) * 0.52})`;
      ctx.beginPath();
      ctx.arc(smPt.x, smPt.y, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawIsoBillowingSmoke(ctx, tf, s, now, playerCrouching) {
    const wx = s.c + 0.5;
    const wy = s.r + 0.5;
    const floorPt = tf.project(wx, wy, 0.04);
    const ceilPt = tf.project(wx, wy, 0.92 + Math.sin(now * 2.2 + s.c + s.r) * 0.08);
    const rad = Math.max(14, tf.scaleX * 0.58);

    ctx.save();
    // Subtle hazard ring on floor so player sees which tile has overhead smoke
    ctx.strokeStyle = playerCrouching ? 'rgba(56, 189, 248, 0.26)' : 'rgba(148, 163, 184, 0.34)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(floorPt.x, floorPt.y, rad * 0.65, rad * 0.36, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Billowing dark charcoal smoke clouds near upper wall/ceiling
    const sg = ctx.createRadialGradient(ceilPt.x, ceilPt.y, 2, ceilPt.x, ceilPt.y, rad * 1.15);
    sg.addColorStop(0, 'rgba(30, 41, 59, 0.72)');
    sg.addColorStop(0.6, 'rgba(51, 65, 85, 0.42)');
    sg.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(ceilPt.x, ceilPt.y, rad * 1.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawIsoArticulatedPlayer3D(ctx, tf, player, now, customGear) {
    const wx = player.x;
    const wy = player.y;
    const basePt = tf.project(wx, wy, 0.02);
    const scale = Math.max(18, tf.scaleX * 0.62);
    const isCrouching = !!player.crouching;
    const isMoving = !!(player.isMoving || Math.hypot(player.vx || 0, player.vy || 0) > 0.01);
    const walkPhase = isMoving ? now * 11 : now * 2.2;

    // Project facing direction in screen space
    const dirPt = tf.project(wx + (player.dirX || 1) * 0.4, wy + (player.dirY || 0) * 0.4, 0.02);
    const screenDx = dirPt.x - basePt.x;
    const facingSign = screenDx >= -1 ? 1 : -1;

    ctx.save();

    // 1. Floor Safety Aura Ring & Contact Shadow
    const ringR = scale * 0.72;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.beginPath();
    ctx.ellipse(basePt.x, basePt.y + 2, ringR * 0.85, ringR * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isCrouching ? '#34d399' : '#fbbf24';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(basePt.x, basePt.y + 1, ringR, ringR * 0.54, 0, 0, Math.PI * 2);
    ctx.stroke();

    if (isCrouching) {
      // ======================================================================
      // 4-Point Low Crawl / Crouch Posture (4점 지지 낮은 자세 포복 + 파란 책가방)
      // ======================================================================
      const crawlSwing = Math.sin(walkPhase) * scale * 0.14;
      const bodyY = basePt.y - scale * 0.34;
      const bodyX = basePt.x;

      // Back Knees & Lower Legs (Dark Navy Pants + Sneakers)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = Math.max(4, scale * 0.22);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bodyX - facingSign * scale * 0.18, bodyY + scale * 0.08);
      ctx.lineTo(bodyX - facingSign * scale * 0.46 + crawlSwing * 0.5, basePt.y - 2);
      ctx.stroke();

      // Front Supporting Arm on Floor
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = Math.max(3.5, scale * 0.18);
      ctx.beginPath();
      ctx.moveTo(bodyX + facingSign * scale * 0.18, bodyY + scale * 0.02);
      ctx.lineTo(bodyX + facingSign * scale * 0.36 - crawlSwing * 0.5, basePt.y - 1);
      ctx.stroke();

      // Horizontal Forward-Leaning Torso (Warm Orange-Amber Jacket)
      ctx.fillStyle = '#ea580c';
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(bodyX, bodyY, scale * 0.38, scale * 0.22, facingSign * -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 3D Blue Backpack (파란 책가방) on Top of Crouching Back
      const bpX = bodyX - facingSign * scale * 0.10;
      const bpY = bodyY - scale * 0.20;
      ctx.fillStyle = '#2563eb';
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      safeRoundRect(ctx, bpX - scale * 0.24, bpY - scale * 0.16, scale * 0.48, scale * 0.30, 6);
      ctx.fill();
      ctx.stroke();
      // Backpack pocket stripe
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(bpX - scale * 0.14, bpY - scale * 0.05, scale * 0.28, scale * 0.07);

      // Head + Hair + Hand Covering Mouth/Nose with Wet Towel
      const headX = bodyX + facingSign * scale * 0.34;
      const headY = bodyY - scale * 0.08;
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(headX, headY, scale * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Dark brown/black hair or safety helmet
      ctx.fillStyle = (customGear && customGear.helmetColor) ? customGear.helmetColor : '#1e1b18';
      ctx.beginPath();
      ctx.arc(headX, headY - scale * 0.04, scale * 0.23, Math.PI * 0.95, Math.PI * 2.05);
      ctx.fill();

      // Wet Towel / Mask covering mouth & nose
      ctx.fillStyle = player.wetTowel || player.hasWetTowel || player.hasMask ? '#38bdf8' : '#f8fafc';
      ctx.beginPath();
      safeRoundRect(ctx, headX + facingSign * scale * 0.02, headY - scale * 0.01, scale * 0.20, scale * 0.14, 3);
      ctx.fill();

      // Crouching status mini pill above player
      drawIsoBadgeLabel(ctx, tf, wx, wy, 0.95, '🧎 낮은 자세', '#059669', '#ecfdf5');
    } else {
      // ======================================================================
      // Upright 3D Student Character + Blue 3D Backpack
      // ======================================================================
      const legSwing = Math.sin(walkPhase) * scale * 0.14;
      const torsoY = basePt.y - scale * 0.56;

      // Legs
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = Math.max(4, scale * 0.20);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(basePt.x - scale * 0.12, torsoY + scale * 0.20);
      ctx.lineTo(basePt.x - scale * 0.14 - legSwing, basePt.y - 2);
      ctx.moveTo(basePt.x + scale * 0.12, torsoY + scale * 0.20);
      ctx.lineTo(basePt.x + scale * 0.14 + legSwing, basePt.y - 2);
      ctx.stroke();

      // 3D Blue Backpack (파란 책가방)
      const bpX = basePt.x - facingSign * scale * 0.16;
      const bpY = torsoY;
      ctx.fillStyle = '#2563eb';
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      safeRoundRect(ctx, bpX - scale * 0.18, bpY - scale * 0.22, scale * 0.36, scale * 0.44, 6);
      ctx.fill();
      ctx.stroke();

      // Torso Jacket
      ctx.fillStyle = '#ea580c';
      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      safeRoundRect(ctx, basePt.x - scale * 0.22, torsoY - scale * 0.22, scale * 0.44, scale * 0.46, 7);
      ctx.fill();
      ctx.stroke();

      // Head
      const headY = torsoY - scale * 0.44;
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(basePt.x, headY, scale * 0.23, 0, Math.PI * 2);
      ctx.fill();

      // Hair / Helmet
      ctx.fillStyle = (customGear && customGear.helmetColor) ? customGear.helmetColor : '#1e1b18';
      ctx.beginPath();
      ctx.arc(basePt.x, headY - scale * 0.05, scale * 0.24, Math.PI * 0.95, Math.PI * 2.05);
      ctx.fill();
    }

    ctx.restore();
  }

  function renderIsometricDollhouse3D(params) {
    const {
      ctx,
      canvasW,
      canvasH,
      cols,
      rows,
      grid,
      T,
      stageIdx,
      player,
      coopPartner,
      fires,
      smokes,
      items,
      now,
      zoomScale,
      customGear,
      breadcrumbTarget
    } = params;

    if (!ctx || !grid || !grid.length) return null;
    const tf = computeIsoTransform(canvasW, canvasH, cols, rows, zoomScale, player.x, player.y);

    // 1. Studio Backdrop & 3D Cutaway Foundation Plinth
    drawIsoStageBackdrop(ctx, tf, canvasW, canvasH, cols, rows, stageIdx, now);

    // 2. Render Room-by-Room Floor Tiles (Back-to-Front Painter's Order)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = grid[r][c];
        if (tile !== T.WALL) {
          drawIsoFloorTile(ctx, tf, c, r, tile, T, stageIdx, now);
        }
      }
    }

    // 3. Guiding Floor Breadcrumb Line from Player toward Current Objective / EXIT
    if (breadcrumbTarget && typeof breadcrumbTarget.c === 'number' && typeof breadcrumbTarget.r === 'number') {
      const pStart = tf.project(player.x, player.y, 0.04);
      const pEnd = tf.project(breadcrumbTarget.c + 0.5, breadcrumbTarget.r + 0.5, 0.04);
      ctx.save();
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -now * 28;
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Depth-Sorted 3D Walls, Furniture, Doors, Items, Fires, Smokes & Characters
    const fireMap = new Map();
    if (Array.isArray(fires)) {
      for (let i = 0; i < fires.length; i++) {
        fireMap.set(`${fires[i].c},${fires[i].r}`, fires[i]);
      }
    }
    const smokeMap = new Map();
    if (Array.isArray(smokes)) {
      for (let i = 0; i < smokes.length; i++) {
        smokeMap.set(`${smokes[i].c},${smokes[i].r}`, smokes[i]);
      }
    }
    const itemMap = new Map();
    if (Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        if (!items[i].collected) {
          itemMap.set(`${items[i].c},${items[i].r}`, items[i]);
        }
      }
    }

    const pCol = Math.floor(player.x);
    const pRow = Math.floor(player.y);
    let playerDrawn = false;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = grid[r][c];
        if (tile === T.WALL || tile === T.PARTITION) {
          drawIsoWallTile(ctx, tf, c, r, cols, rows, grid, T, tile, now);
        } else {
          drawIsoFurnitureAndProps(ctx, tf, c, r, tile, T, stageIdx, now, player);
        }

        const itObj = itemMap.get(`${c},${r}`);
        if (itObj) {
          drawIsoItemObject(ctx, tf, itObj, now);
        }

        const fObj = fireMap.get(`${c},${r}`);
        if (fObj) {
          drawIsoVolumetricFire(ctx, tf, fObj, now);
        }

        if (!playerDrawn && r === pRow && c === pCol) {
          drawIsoArticulatedPlayer3D(ctx, tf, player, now, customGear);
          playerDrawn = true;
        }

        const sObj = smokeMap.get(`${c},${r}`);
        if (sObj) {
          drawIsoBillowingSmoke(ctx, tf, sObj, now, player.crouching);
        }
      }
    }

    if (!playerDrawn) {
      drawIsoArticulatedPlayer3D(ctx, tf, player, now, customGear);
    }

    if (coopPartner && coopPartner.active) {
      drawIsoArticulatedPlayer3D(
        ctx,
        tf,
        { x: coopPartner.x, y: coopPartner.y, crouching: coopPartner.crouching, dirX: 1, dirY: 0, isMoving: true },
        now + 0.4,
        { helmetColor: '#38bdf8' }
      );
    }

    return tf;
  }

  // ============================================================================
  // 01. 홈 화면: 3D Cinematic Burning Corridor & Crouching Children Illustration
  // ============================================================================
  function renderHomeHeroBgCanvas(canvas, now) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width || window.innerWidth || 960));
    const h = Math.max(240, Math.floor(rect.height || window.innerHeight || 540));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const t = (now || performance.now() * 0.001);
    ctx.save();

    // 1. Deep 3D Perspective Corridor Geometry (Vanishing Point at center-right)
    const vx = w * 0.56;
    const vy = h * 0.44;

    // Ceiling (Dark smoky slate-brown)
    const ceilGrad = ctx.createLinearGradient(0, 0, 0, vy);
    ceilGrad.addColorStop(0, '#090d16');
    ceilGrad.addColorStop(1, '#261c1a');
    ctx.fillStyle = ceilGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(vx + w * 0.14, vy - h * 0.12);
    ctx.lineTo(vx - w * 0.16, vy - h * 0.12);
    ctx.closePath();
    ctx.fill();

    // Left Corridor Wall (Warm lit plaster & wooden doors)
    const leftWallGrad = ctx.createLinearGradient(0, vy, vx - w * 0.16, vy);
    leftWallGrad.addColorStop(0, '#7c4a2b');
    leftWallGrad.addColorStop(0.55, '#b87d4b');
    leftWallGrad.addColorStop(1, '#4a2c1d');
    ctx.fillStyle = leftWallGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(vx - w * 0.16, vy - h * 0.12);
    ctx.lineTo(vx - w * 0.16, vy + h * 0.16);
    ctx.lineTo(0, h * 0.88);
    ctx.closePath();
    ctx.fill();

    // Right Corridor Wall (Leading to glowing green EXIT)
    const rightWallGrad = ctx.createLinearGradient(vx + w * 0.14, vy, w, vy);
    rightWallGrad.addColorStop(0, '#47362b');
    rightWallGrad.addColorStop(0.65, '#8c6d53');
    rightWallGrad.addColorStop(1, '#574335');
    ctx.fillStyle = rightWallGrad;
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(vx + w * 0.14, vy - h * 0.12);
    ctx.lineTo(vx + w * 0.14, vy + h * 0.16);
    ctx.lineTo(w, h * 0.92);
    ctx.closePath();
    ctx.fill();

    // Back Corridor Wall
    ctx.fillStyle = '#2b1e19';
    ctx.fillRect(vx - w * 0.16, vy - h * 0.12, w * 0.30, h * 0.28);

    // Corridor Wood Plank Floor with Perspective Lines & Warm Fire Reflections
    const floorGrad = ctx.createLinearGradient(0, vy + h * 0.16, 0, h);
    floorGrad.addColorStop(0, '#5c361e');
    floorGrad.addColorStop(0.45, '#8a5229');
    floorGrad.addColorStop(1, '#3b2212');
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.88);
    ctx.lineTo(vx - w * 0.16, vy + h * 0.16);
    ctx.lineTo(vx + w * 0.14, vy + h * 0.16);
    ctx.lineTo(w, h * 0.92);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Perspective floor plank seams
    ctx.strokeStyle = 'rgba(40, 20, 8, 0.45)';
    ctx.lineWidth = 1.5;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(vx + i * w * 0.032, vy + h * 0.16);
      ctx.lineTo(vx + i * w * 0.18, h);
      ctx.stroke();
    }

    // 2. Glowing Green [🏃 EXIT] Sign & Portal on the Right Wall (matching 01. 홈 화면)
    const exitX = w * 0.77;
    const exitY = h * 0.34;
    const exitGlow = ctx.createRadialGradient(exitX, exitY, 4, exitX, exitY, w * 0.16);
    exitGlow.addColorStop(0, 'rgba(52, 211, 153, 0.78)');
    exitGlow.addColorStop(0.5, 'rgba(16, 185, 129, 0.24)');
    exitGlow.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = exitGlow;
    ctx.beginPath();
    ctx.arc(exitX, exitY, w * 0.16, 0, Math.PI * 2);
    ctx.fill();

    // Green EXIT Sign Box
    const signW = Math.max(76, w * 0.085);
    const signH = Math.max(30, h * 0.062);
    ctx.fillStyle = '#059669';
    ctx.strokeStyle = '#a7f3d0';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    safeRoundRect(ctx, exitX - signW * 0.5, exitY - signH * 0.5, signW, signH, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.max(12, Math.round(signH * 0.48))}px "Inter", "Noto Sans KR", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏃 EXIT', exitX, exitY + 1);

    // 3. Roaring Organic 3D Volumetric Fire & Embers on the Left/Upper Corridor
    const fireBaseX = w * 0.22;
    const fireBaseY = h * 0.50;
    const fireGlow = ctx.createRadialGradient(fireBaseX, fireBaseY - h * 0.08, 12, fireBaseX, fireBaseY, w * 0.38);
    fireGlow.addColorStop(0, 'rgba(254, 240, 138, 0.88)');
    fireGlow.addColorStop(0.32, 'rgba(249, 115, 22, 0.62)');
    fireGlow.addColorStop(0.68, 'rgba(220, 38, 38, 0.25)');
    fireGlow.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.fillStyle = fireGlow;
    ctx.beginPath();
    ctx.arc(fireBaseX, fireBaseY, w * 0.38, 0, Math.PI * 2);
    ctx.fill();

    // Left Corridor Recessed Wooden Door Frame (Engulfed in Fire)
    ctx.fillStyle = '#3b1d0e';
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.14, h * 0.72);
    ctx.lineTo(w * 0.14, h * 0.22);
    ctx.lineTo(w * 0.25, h * 0.27);
    ctx.lineTo(w * 0.25, h * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Organic S-Curved Multi-Layer Flame Tongues
    for (let i = 0; i < 11; i++) {
      const phase = t * 5.4 + i * 0.85;
      const fx = w * (0.08 + i * 0.032) + Math.sin(phase) * 7;
      const fy = h * (0.64 - (i % 4) * 0.035);
      const fh = h * (0.22 + 0.09 * Math.sin(phase * 1.25));
      const fw = w * (0.044 - (i % 3) * 0.006);
      const sway1 = Math.sin(phase + 0.7) * fw * 0.85;
      const sway2 = Math.cos(phase * 1.3) * fw * 0.95;

      const fg = ctx.createLinearGradient(fx, fy, fx + sway2, fy - fh);
      fg.addColorStop(0, 'rgba(185, 28, 28, 0.92)');
      fg.addColorStop(0.38, 'rgba(249, 115, 22, 0.90)');
      fg.addColorStop(0.78, 'rgba(253, 224, 71, 0.85)');
      fg.addColorStop(1, 'rgba(254, 249, 195, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(fx - fw, fy);
      ctx.bezierCurveTo(
        fx - fw * 0.75 + sway1, fy - fh * 0.35,
        fx - fw * 0.25 - sway1, fy - fh * 0.75,
        fx + sway2 * 0.6, fy - fh
      );
      ctx.bezierCurveTo(
        fx + fw * 0.35 + sway2, fy - fh * 0.72,
        fx + fw * 0.85 - sway1, fy - fh * 0.32,
        fx + fw, fy
      );
      ctx.closePath();
      ctx.fill();
    }

    // Floating Glowing Fire Embers
    for (let e = 0; e < 18; e++) {
      const ep = (t * 0.65 + e * 0.17) % 1;
      const ex = w * (0.10 + (e * 0.043) % 0.45) + Math.sin(t * 3 + e) * 14;
      const ey = h * (0.62 - ep * 0.48);
      ctx.fillStyle = e % 2 === 0 ? `rgba(254, 240, 138, ${1 - ep})` : `rgba(251, 146, 60, ${1 - ep})`;
      ctx.beginPath();
      ctx.arc(ex, ey, 2.2 + (e % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    // Billowing Upper Dark Smoke Clouds
    for (let s = 0; s < 11; s++) {
      const sx = w * (0.06 + s * 0.088) + Math.sin(t * 0.9 + s) * 14;
      const sy = h * (0.10 + (s % 3) * 0.055);
      const sr = w * (0.095 + (s % 4) * 0.025);
      const sg = ctx.createRadialGradient(sx, sy, 6, sx, sy, sr);
      sg.addColorStop(0, 'rgba(15, 23, 42, 0.86)');
      sg.addColorStop(0.62, 'rgba(30, 41, 59, 0.52)');
      sg.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Two Crouching Children with Blue Backpacks Escaping Low Along the Corridor Floor
    drawHomeHeroCrouchingChild(ctx, w * 0.38, h * 0.63, Math.min(w, h) * 0.155, t, '#ea580c', '#2563eb');
    drawHomeHeroCrouchingChild(ctx, w * 0.56, h * 0.55, Math.min(w, h) * 0.118, t + 1.2, '#d97706', '#0284c7');

    ctx.restore();
  }

  function drawHomeHeroCrouchingChild(ctx, cx, cy, size, t, jacketColor, backpackColor) {
    const bob = Math.sin(t * 4.2) * size * 0.04;
    ctx.save();
    // Floor shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.42, size * 0.62, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crouched Legs (Dark Pants)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = size * 0.22;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.15, cy + size * 0.1 + bob);
    ctx.lineTo(cx - size * 0.42, cy + size * 0.34);
    ctx.lineTo(cx - size * 0.12, cy + size * 0.36);
    ctx.stroke();

    // Torso (Leaning Forward Low)
    ctx.fillStyle = jacketColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy + bob, size * 0.38, size * 0.24, -0.22, 0, Math.PI * 2);
    ctx.fill();

    // Blue 3D Backpack on Back
    ctx.fillStyle = backpackColor;
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    safeRoundRect(ctx, cx - size * 0.34, cy - size * 0.32 + bob, size * 0.46, size * 0.30, 8);
    ctx.fill();
    ctx.stroke();

    // Head + Hair + Hand Covering Mouth/Nose
    const hx = cx + size * 0.32;
    const hy = cy - size * 0.12 + bob;
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(hx, hy, size * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(hx, hy - size * 0.04, size * 0.23, Math.PI * 0.92, Math.PI * 2.08);
    ctx.fill();

    // Sleeve / Wet Towel covering nose & mouth
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    safeRoundRect(ctx, hx + size * 0.02, hy - size * 0.02, size * 0.20, size * 0.14, 4);
    ctx.fill();
    ctx.restore();
  }

  window.FireEscape.Tactical3D = {
    drawThermalVisionOverlay,
    computeIndoorAirflowVector,
    drawAirflowDraftDiorama,
    drawSpatialAudioRadarHUD,
    drawExtinguisherSweepGaugeOverlay,
    drawEarthquakeTremorOverlay,
    drawFireShutterAndCompanionCareDiorama,
    computeSafetyCompetencyScores,
    drawSafetyCompetencyRadarChart,
    renderFamilyEscapePlanCard,
    triggerDoorAnim,
    getDoorSwingRatio,
    triggerLifelineDescent,
    updateAnimations,
    drawDoorEffectsDiorama,
    drawDoorEffectsFPS,
    drawLifelineDescentOverlay,
    drawNeonBreadcrumbPathDiorama,
    drawNeonBreadcrumbPathFPS,
    drawFireBaseAimDiorama,
    drawFireBaseAimFPS,
    drawCinematicReplayHUD,
    drawPendingHazardsDiorama,
    drawPendingHazardsFPS,
    draw3DCompassBar,
    drawFullTacticalMapOverlay,
    getTacticalMapTileAt,
    markDoorBarrier,
    clearDoorBarrier,
    resetDoorBarriers,
    getDoorBarrier,
    triggerCprWave,
    drawDoorBarriersDiorama,
    drawDoorBarriersFPS,
    drawWetTowelMoistureDiorama,
    drawSprinklerSystemDiorama,
    drawSprinklerSystemFPS,
    drawShelterInPlaceOverlay,
    CODEX_GEARS,
    renderCodex3DGearPreview,
    renderScannableQrMatrix,
    drawCriticalVitalsShaderOverlay,
    drawColorblindPatternsDiorama,
    drawColorblindPatternsFPS,
    // 10-Point 3D Screen Advancement Engine Exports
    triggerCameraMorphTransition,
    triggerHandActionRecoil,
    updateDynamic3DLod,
    getDynamic3DLod,
    drawConvectionSmokeLayersDiorama,
    drawConvectionSmokeLayersFPS,
    drawFirstPersonHandViewModel,
    drawFloorSpecularAndSoftShadowsDiorama,
    drawFloorSpecularFPS,
    drawStageThemedExteriorDiorama,
    drawStageThemedCeilingAndSkyboxFPS,
    drawHeatShimmerAndRisingEmbersDiorama,
    drawHeatShimmerAndRisingEmbersFPS,
    drawArticulatedCompanion3DDiorama,
    drawArticulatedCompanion3DFPS,
    draw3DHologramFocusAndBeaconDiorama,
    draw3DHologramFocusAndBeaconFPS,
    drawCameraMorphTransitionOverlay,
    // v29: 02 레스큐 컨트롤 45° Isometric Dollhouse & Home 3D Scene Exports
    computeIsoTransform,
    screenToIsoTile,
    renderIsometricDollhouse3D,
    renderHomeHeroBgCanvas
  };
})();
