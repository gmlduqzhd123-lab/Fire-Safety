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
    ctx.fillText('🪢 3D 완강기 외벽 하강 중', bx + 10, by + 16);
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 12px "Noto Sans KR", sans-serif';
    ctx.fillText(`남은 높이: ${altitudeM.toFixed(1)}m`, cableX + 16, by + boxH * 0.55);

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

  window.FireEscape.Tactical3D = {
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
    getTacticalMapTileAt
  };
})();
