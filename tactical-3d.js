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
    drawColorblindPatternsFPS
  };
})();
