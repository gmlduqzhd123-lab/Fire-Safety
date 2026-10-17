(function () {
  'use strict';

  window.FireEscape = window.FireEscape || {};

  // --- Tile Types ---
  const TILE = {
    FLOOR: 0,
    WALL: 1,
    FURNITURE: 2,
    DOOR: 3,
    LOCKED_DOOR: 4,
    SINK: 5,
    ELEVATOR: 6,
    EXIT: 7,
    DEBRIS: 8,
    GAS_VALVE: 9,
    HOT_DOOR: 10,
    PHONE_119: 11,
    BREAKER: 12,
    LIFELINE: 13,
    PARTITION: 14,   // Idea #1: Apartment lightweight partition wall (경량칸막이)
    OPEN_DOOR: 15,   // Idea #2: Open door that can be closed behind player to block smoke
    HAZARD: 16,      // Idea #6: Household fire hazard in Prevention Mode
    ALARM_BELL: 17   // Idea #7: Corridor fire alarm bell (비상벨 발신기)
  };

  const COLS = 15;
  const ROWS = 10;

  // --- Badge Encyclopedia Definitions (Idea #9) ---
  const BADGE_DEFS = [
    { id: 'wet_towel', icon: '💧', name: '젖은수건 마스터', desc: '세면대에서 수건을 적셔 호흡기 보호' },
    { id: 'pass_ext', icon: '🧯', name: '초기소화 대원', desc: '소화기 PASS 안전핀 뽑기 및 화재 진압' },
    { id: 'partition', icon: '🧱', name: '경량칸막이 개척자', desc: '베란다 경량칸막이를 부숴 옆집으로 피난' },
    { id: 'fire_door', icon: '🚪', name: '방화문 지킴이', desc: '열린 방화문을 닫아 연기 확산 차단' },
    { id: 'stop_roll', icon: '🔄', name: '구르기 달인', desc: '옷에 붙은 불을 멈추고·엎드려·구르기로 진화' },
    { id: 'mask_light', icon: '😷', name: '특수장비 전문가', desc: '방연마스크 또는 비상 손전등 활용' },
    { id: 'alarm_npc', icon: '🔔', name: '이타적 영웅', desc: '화재 비상벨을 울리고 이웃/친구 구출' },
    { id: 'prevention', icon: '🔍', name: '화재예방 보안관', desc: '가정 내 화재 위험요소 사전 점검 완수' },
    { id: 'school_metro', icon: '🏫', name: '공공안전 마스터', desc: '학교 과학실 또는 지하철 다중시설 탈출' },
    { id: 'map_creator', icon: '🛠️', name: '대피도 설계사', desc: '나만의 대피도 맵 에디터로 맵 제작·플레이' }
  ];

  // --- Household Fire Hazard Inspection Quizzes (Idea #6) ---
  const HAZARD_QUIZZES = [
    {
      title: '🔌 문어발식 멀티탭과 먼지 쌓인 콘센트 발견!',
      desc: '하나의 멀티탭에 전열기구 여러 개가 꽂혀 과열되고 콘센트에 먼지가 쌓여 있습니다. 올바른 예방 조치는?',
      good: '✅ 사용하지 않는 플러그를 뽑고 먼지를 털어낸 뒤 정격 용량만 사용한다 (+200점)',
      bad: '❌ 편하니까 코드를 더 꽂아 둔다'
    },
    {
      title: '🔥 자리를 비운 가스레인지 조리 중 발견!',
      desc: '주방 가스레인지 위에 냄비를 올려둔 채 불이 켜져 있습니다. 올바른 조치는?',
      good: '✅ 즉시 가스레인지 불을 끄고 외출 전 중간 밸브까지 잠근다 (+200점)',
      bad: '❌ 금방 끓을 테니 그대로 두고 방으로 간다'
    },
    {
      title: '📦 아파트 경량칸막이·비상구 앞 적치물 발견!',
      desc: '베란다 경량칸막이와 현관 비상구 앞에 택배 상자와 화분이 가득 쌓여 있습니다.',
      good: '✅ 위급 시 즉시 대피할 수 있도록 비상구와 경량칸막이 앞을 깨끗이 비운다 (+200점)',
      bad: '❌ 창고처럼 계속 물건을 쌓아 둔다'
    },
    {
      title: '🌡️ 전기난로 바로 옆에 이불과 세탁물 방치 발견!',
      desc: '뜨겁게 켜진 전기난로 바로 옆에 불이 붙기 쉬운 이불과 옷가지가 놓여 있습니다.',
      good: '✅ 난방기구 주변의 가연물을 멀리 치우고 외출 시 전원을 반드시 끈다 (+200점)',
      bad: '❌ 빨래가 잘 마르도록 난로 위에 옷을 걸쳐 둔다'
    },
    {
      title: '🧯 주택용 소방시설(소화기·화재감지기) 점검!',
      desc: '거실 구석의 소화기 압력게이지와 천장의 단독경보형 감지기를 점검합니다. 올바른 관리법은?',
      good: '✅ 소화기 압력바늘이 녹색 정상 범위에 있는지 확인하고 감지기 작동 버튼을 점검한다 (+200점)',
      bad: '❌ 소화기를 보이지 않게 깊숙한 창고 맨 안쪽에 숨겨 둔다'
    }
  ];

  // --- Architecturally Distinct Multi-Room 3D Escape-Room Stage Definitions (Stages 1~6 + Prevention Mode) ---
  const STAGES = [
    // Index 0 -> Stage 1 [★☆☆☆☆ 입문]: L-Shaped 2F House (Top-Left Start -> Right Wing Study -> Bottom-Left Stairwell Exit)
    {
      id: 1,
      name: '1단계: 2층 침실과 복도 [★☆☆☆☆ 입문 · L자형 주택]',
      difficultyStars: '★☆☆☆☆',
      difficultyLabel: '입문 · L자형 복도 구조',
      fireSpreadInterval: 16.0,
      smokeO2DrainMult: 0.75,
      fireDamageMult: 0.80,
      mission: '① 수건(🧣)을 세면대(🚰)에서 적시고 ② 우측 서재 열쇠(🔑)로 동생 방(🔒)을 열어 구출한 뒤 좌하단 계단실(EXIT)로 탈출하세요!',
      curriculumFocus: '통합교과(젖은 수건·낮은 자세·방화문 닫기) · L자형 주택 동선 탐색 및 가족 구출',
      requireWetTowelOrMask: true,
      requireRescueNpc: true,
      roomLabels: [
        { c: 2.5, r: 1.4, text: '🛏️ 내 침실(시작)' },
        { c: 7.0, r: 2.2, text: '🚿 중앙 욕실(세면대)' },
        { c: 12.0, r: 1.4, text: '📚 우측 서재(열쇠)' },
        { c: 11.8, r: 7.2, text: '🔒 동생 방(구출)' },
        { c: 2.2, r: 7.2, text: '🏃 좌하단 비상계단(EXIT)' }
      ],
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,1,0,5,0,0,1,2,0,0,6,1],
        [1,0,0,0,3,0,0,0,0,3,0,0,0,0,1],
        [1,2,0,0,1,2,0,0,0,1,0,2,0,0,1],
        [1,1,1,1,1,1,3,1,1,1,0,0,0,1,1],
        [1,17,0,0,0,0,0,0,0,1,1,3,1,1,1],
        [1,1,1,3,1,0,0,0,0,0,0,0,0,1,1],
        [1,0,0,0,1,0,2,0,1,4,0,0,0,2,1],
        [1,7,0,11,1,10,0,0,1,1,0,0,14,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      playerStart: { x: 1.5, y: 1.5 },
      guideSigns: [
        { c: 6, r: 5, dir: '↓' },
        { c: 8, r: 6, dir: '←' },
        { c: 5, r: 6, dir: '←' },
        { c: 2, r: 7, dir: '↓' }
      ],
      fires: [
        { c: 7, r: 8, intensity: 0.9, fireType: 'normal' },
        { c: 5, r: 5, intensity: 0.85, fireType: 'normal' }
      ],
      smokes: [
        { c: 6, r: 6 }, { c: 7, r: 6 }, { c: 8, r: 6 }
      ],
      items: [
        { c: 3, r: 1, type: 'towel', name: '수건', icon: '🧣' },
        { c: 8, r: 3, type: 'extinguisher', name: '소화기', icon: '🧯', charges: 6 },
        { c: 12, r: 2, type: 'key', name: '비상열쇠', icon: '🔑' },
        { c: 2, r: 5, type: 'bucket', name: '물양동이', icon: '🪣', charges: 3 },
        { c: 12, r: 7, type: 'npc', name: '동생 민수', icon: '🧒' }
      ]
    },

    // Index 1 -> Stage 2 [★★☆☆☆ 초급]: Central Island Kitchen & 360° Ring Corridor (Bottom-Right Start -> Top-Right Exit)
    {
      id: 2,
      name: '2단계: 1층 주방·다용도실 [★★☆☆☆ 초급 · 중앙 아일랜드 회랑]',
      difficultyStars: '★★☆☆☆',
      difficultyLabel: '초급 · 중앙 아일랜드 순환 회랑',
      fireSpreadInterval: 13.0,
      smokeO2DrainMult: 0.90,
      fireDamageMult: 0.95,
      mission: '우하단 현관에서 출발해 ① 중앙 아일랜드 주방의 가스밸브(🔴)를 잠그고 ② 좌상단 다용도실(🔒)의 초코(🐶)를 구출해 우상단 뒷문(EXIT)으로 탈출하세요!',
      curriculumFocus: '5~6학년 과학(연소와 소화 - 식용유·전기 화재 진압, 가스·전원 차단 및 순환형 회랑 탐색)',
      requireWetTowelOrMask: true,
      requireGasClosed: true,
      requireRescueDog: true,
      roomLabels: [
        { c: 12.2, r: 7.4, text: '🚪 현관 홀(시작)' },
        { c: 7.0, r: 4.4, text: '🍳 중앙 아일랜드 주방' },
        { c: 2.3, r: 7.4, text: '🪓 좌하단 공구실' },
        { c: 2.3, r: 1.4, text: '🐶 잠긴 다용도실' },
        { c: 12.3, r: 1.4, text: '🏃 우상단 뒷문(EXIT)' }
      ],
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,2,1,0,0,0,0,0,1,0,0,7,1],
        [1,0,0,0,1,0,2,0,2,0,8,0,0,0,1],
        [1,1,4,1,1,1,1,3,1,1,1,1,1,1,1],
        [1,0,0,0,1,5,0,9,0,1,0,0,2,17,1],
        [1,0,2,0,3,0,0,0,0,3,0,0,0,0,1],
        [1,1,3,1,1,1,1,1,1,1,1,3,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,3,0,0,0,1],
        [1,12,0,11,1,10,1,6,0,0,1,0,2,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      playerStart: { x: 12.5, y: 7.5 },
      guideSigns: [
        { c: 9, r: 7, dir: '←' },
        { c: 2, r: 5, dir: '↑' },
        { c: 6, r: 1, dir: '→' },
        { c: 11, r: 2, dir: '→' }
      ],
      fires: [
        { c: 7, r: 5, intensity: 1.0, fireType: 'oil' },
        { c: 6, r: 7, intensity: 0.95, fireType: 'electric' },
        { c: 8, r: 1, intensity: 0.9, fireType: 'normal' }
      ],
      smokes: [
        { c: 6, r: 5 }, { c: 5, r: 7 }, { c: 7, r: 7 }, { c: 10, r: 5 }
      ],
      items: [
        { c: 11, r: 7, type: 'mask', name: '방연마스크', icon: '😷' },
        { c: 11, r: 5, type: 'extinguisher', name: '소화기', icon: '🧯', charges: 7 },
        { c: 7, r: 1, type: 'key', name: '다용도실 열쇠', icon: '🔑' },
        { c: 2, r: 7, type: 'axe', name: '소방 도끼', icon: '🪓' },
        { c: 2, r: 1, type: 'dog', name: '초코', icon: '🐶' }
      ]
    },

    // Index 2 -> Stage 3 [★★★☆☆ 중급]: High-Rise Apartment (Center Living Room Start -> Left Wing Axe & Key -> Right Wing Balcony Lifeline)
    {
      id: 3,
      name: '3단계: 아파트 베란다·완강기 [★★★☆☆ 중급 · 양날개 봉쇄 구조]',
      difficultyStars: '★★★☆☆',
      difficultyLabel: '중급 · 중앙 거실 고립 & 양날개 구조',
      fireSpreadInterval: 11.0,
      smokeO2DrainMult: 1.0,
      fireDamageMult: 1.05,
      mission: '중앙 거실 남쪽 현관이 화염에 봉쇄되었습니다! ① 좌하단 창고의 도끼(🪓)로 북쪽 판자(🪵)를 부숴 안방 열쇠(🔑)를 찾고 ② 우측 발코니(🔒)의 완강기(🪢)·경량칸막이(🧱)로 탈출하세요!',
      curriculumFocus: '5~6학년 실과(완강기 3단계 절차·경량칸막이 피난 및 퇴로 봉쇄 시 우회 탈출)',
      requireWetTowelOrMask: true,
      roomLabels: [
        { c: 7.0, r: 3.4, text: '🛋️ 중앙 거실(시작)' },
        { c: 2.3, r: 6.4, text: '📦 좌하단 창고(도끼)' },
        { c: 2.3, r: 1.4, text: '🏠 좌상단 안방(열쇠)' },
        { c: 7.0, r: 7.4, text: '🔥 화염 봉쇄 현관' },
        { c: 12.2, r: 2.0, text: '🪢 우측 발코니 대피실' }
      ],
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,2,1,17,0,0,2,1,1,0,0,1,1],
        [1,0,0,0,1,0,0,0,0,1,1,0,0,13,1],
        [1,2,0,0,1,0,0,0,0,4,0,0,0,0,1],
        [1,1,8,1,1,0,0,0,0,1,1,0,2,0,1],
        [1,0,0,0,3,0,2,0,0,1,1,0,0,14,1],
        [1,0,2,0,1,1,1,10,1,1,1,1,3,1,1],
        [1,0,0,0,1,0,0,0,0,1,1,0,0,0,1],
        [1,5,0,11,1,6,0,0,0,1,1,0,0,7,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      playerStart: { x: 7.5, y: 4.5 },
      guideSigns: [
        { c: 5, r: 5, dir: '←' },
        { c: 2, r: 5, dir: '↑' },
        { c: 7, r: 3, dir: '→' },
        { c: 12, r: 3, dir: '↑' }
      ],
      fires: [
        { c: 6, r: 7, intensity: 1.0, fireType: 'normal' },
        { c: 7, r: 7, intensity: 1.0, fireType: 'oil' },
        { c: 8, r: 7, intensity: 0.95, fireType: 'electric' },
        { c: 6, r: 2, intensity: 0.9, fireType: 'normal' }
      ],
      smokes: [
        { c: 5, r: 4 }, { c: 6, r: 3 }, { c: 8, r: 4 }, { c: 3, r: 5 }, { c: 11, r: 3 }
      ],
      items: [
        { c: 8, r: 5, type: 'towel', name: '수건', icon: '🧣' },
        { c: 8, r: 2, type: 'extinguisher', name: '소화기', icon: '🧯', charges: 7 },
        { c: 2, r: 7, type: 'axe', name: '소방 도끼', icon: '🪓' },
        { c: 2, r: 1, type: 'key', name: '베란다 열쇠', icon: '🔑' }
      ]
    },

    // Index 3 -> Stage 4 [★★★★☆ 중상급]: H-Shaped Elementary School Wing (Bottom-Left Science Lab Start -> Top-Center Stairwell Exit)
    {
      id: 4,
      name: '4단계: 초등학교 과학실·교실동 [★★★★☆ 중상급 · H자형 교실동]',
      difficultyStars: '★★★★☆',
      difficultyLabel: '중상급 · H자형 이중 복도 구조',
      fireSpreadInterval: 9.5,
      smokeO2DrainMult: 1.10,
      fireDamageMult: 1.15,
      mission: '좌하단 과학실에서 출발해 ① 북쪽 교무실 차단기(⚡)와 마스터키(🔑)를 확보하고 ② 우하단 교실(🔒)의 지민(🧒)을 구해 상단 중앙 본관 계단(EXIT)으로 탈출하세요!',
      curriculumFocus: '3~6학년 과학실 실험 안전 수칙 · H자형 다중 학급 비상벨 발신 및 방화문 차단',
      requireWetTowelOrMask: true,
      requireRescueNpc: true,
      roomLabels: [
        { c: 2.3, r: 6.4, text: '🔬 과학실험실(시작)' },
        { c: 2.3, r: 1.4, text: '👩‍🏫 북서 교무실(열쇠)' },
        { c: 12.2, r: 1.4, text: '🪓 북동 준비실(도끼)' },
        { c: 12.2, r: 6.4, text: '🔒 우하단 학급 교실' },
        { c: 7.5, r: 1.3, text: '🏃 본관 중앙계단(EXIT)' }
      ],
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,12,0,11,1,0,0,7,0,0,1,2,0,6,1],
        [1,0,0,0,1,0,1,8,1,0,3,0,0,0,1],
        [1,2,0,0,1,0,1,10,1,0,1,0,2,0,1],
        [1,1,3,1,1,0,0,0,0,0,1,1,1,1,1],
        [1,1,1,1,1,17,0,0,0,0,1,1,1,1,1],
        [1,0,0,0,1,0,1,1,1,0,1,0,0,2,1],
        [1,0,0,0,3,0,1,1,1,0,4,0,0,0,1],
        [1,5,2,0,1,0,0,0,0,0,1,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      playerStart: { x: 2.5, y: 7.5 },
      guideSigns: [
        { c: 5, r: 7, dir: '↑' },
        { c: 7, r: 4, dir: '→' },
        { c: 9, r: 6, dir: '↓' },
        { c: 7, r: 1, dir: '↑' }
      ],
      fires: [
        { c: 3, r: 6, intensity: 1.0, fireType: 'oil' },
        { c: 6, r: 4, intensity: 0.95, fireType: 'electric' },
        { c: 9, r: 5, intensity: 0.95, fireType: 'normal' },
        { c: 7, r: 8, intensity: 0.9, fireType: 'normal' }
      ],
      smokes: [
        { c: 5, r: 6 }, { c: 5, r: 3 }, { c: 7, r: 5 }, { c: 9, r: 3 }, { c: 9, r: 7 }
      ],
      items: [
        { c: 1, r: 6, type: 'mask', name: '방연마스크', icon: '😷' },
        { c: 5, r: 8, type: 'extinguisher', name: '소화기', icon: '🧯', charges: 7 },
        { c: 2, r: 2, type: 'key', name: '교실 마스터키', icon: '🔑' },
        { c: 12, r: 2, type: 'axe', name: '소방 도끼', icon: '🪓' },
        { c: 12, r: 7, type: 'npc', name: '짝꿍 지민', icon: '🧒' }
      ]
    },

    // Index 4 -> Stage 5 [★★★★★ 상급]: Clockwise Spiral Underground Subway Labyrinth (Center Platform Start -> Bottom-Left Ground Exit)
    {
      id: 5,
      name: '5단계: 지하철·지하상가 정전 미로 [★★★★★ 상급 · 나선형 암흑 미로]',
      difficultyStars: '★★★★★',
      difficultyLabel: '상급 · 나선형(Spiral) 정전 미로',
      fireSpreadInterval: 8.5,
      smokeO2DrainMult: 1.20,
      fireDamageMult: 1.25,
      mission: '정전된 중앙 승강장에서 ① 손전등(🔦)·마스크(😷)를 켜고 ② 나선형 통로를 따라 배전실 차단기(⚡)와 우측 상가(🔒) 시민(🧒)을 구해 좌하단 지상 출구(EXIT)로 탈출하세요!',
      curriculumFocus: '범교과 다중이용시설 재난 안전 · 나선형 정전 미로 손전등 시야 확보 및 피난유도등 추적',
      isDarkStage: true,
      requireWetTowelOrMask: true,
      requireRescueNpc: true,
      roomLabels: [
        { c: 6.5, r: 4.3, text: '🚇 중앙 승강장(시작)' },
        { c: 5.5, r: 2.2, text: '⚡ 북측 배전 회랑' },
        { c: 13.0, r: 2.2, text: '🏪 우측 고립 지하상가' },
        { c: 7.5, r: 8.2, text: '🟩 남측 지하 환승터널' },
        { c: 2.2, r: 8.2, text: '🏃 좌하단 지상출구(EXIT)' }
      ],
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,6,0,0,0,0,0,0,0,0,1,1,0,11,1],
        [1,1,1,12,0,0,0,0,0,0,0,0,1,0,1],
        [1,0,3,1,1,1,1,3,1,1,0,1,1,0,1],
        [1,0,1,1,0,0,0,0,0,1,0,0,1,0,1],
        [1,0,1,1,17,0,2,0,0,1,0,0,1,0,1],
        [1,0,1,1,1,1,1,10,1,1,0,0,4,0,1],
        [1,0,0,2,1,5,0,0,0,1,1,3,1,0,1],
        [1,7,0,0,3,0,0,0,0,8,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      playerStart: { x: 7.5, y: 4.5 },
      guideSigns: [
        { c: 7, r: 2, dir: '→' },
        { c: 10, r: 4, dir: '↓' },
        { c: 11, r: 8, dir: '←' },
        { c: 6, r: 8, dir: '←' },
        { c: 2, r: 8, dir: '←' }
      ],
      fires: [
        { c: 6, r: 2, intensity: 1.0, fireType: 'electric' },
        { c: 10, r: 3, intensity: 0.95, fireType: 'electric' },
        { c: 10, r: 8, intensity: 0.95, fireType: 'normal' },
        { c: 7, r: 8, intensity: 0.9, fireType: 'normal' },
        { c: 1, r: 5, intensity: 0.9, fireType: 'oil' }
      ],
      smokes: [
        { c: 5, r: 2 }, { c: 8, r: 2 }, { c: 10, r: 5 }, { c: 8, r: 8 }, { c: 5, r: 8 }, { c: 3, r: 8 }
      ],
      items: [
        { c: 7, r: 4, type: 'flashlight', name: '손전등', icon: '🔦' },
        { c: 5, r: 5, type: 'mask', name: '방연마스크', icon: '😷' },
        { c: 4, r: 2, type: 'extinguisher', name: '소화기', icon: '🧯', charges: 8 },
        { c: 11, r: 5, type: 'key', name: '셔터 열쇠', icon: '🔑' },
        { c: 11, r: 2, type: 'axe', name: '소방 도끼', icon: '🪓' },
        { c: 13, r: 3, type: 'npc', name: '고립 시민', icon: '🧒' }
      ]
    },

    // Index 5 -> Prevention Inspection Mode [★☆☆☆☆ 안전점검]: Cross-Shaped (┼) 5-Room Household Layout
    {
      id: 0,
      name: '예방모드: 우리 집 5대 위험요소 점검 [★☆☆☆☆ 십자형 5룸 주택]',
      difficultyStars: '★☆☆☆☆',
      difficultyLabel: '안전점검 · 십자형(┼) 5룸 구조',
      fireSpreadInterval: 999.0,
      smokeO2DrainMult: 1.0,
      fireDamageMult: 1.0,
      mission: '중앙 거실 홀에서 출발해 십자형(┼)으로 연결된 5개 구역의 화재 위험요소(⚠️) 5곳을 모두 찾아 수리한 뒤 남쪽 현관(EXIT)으로 외출하세요!',
      curriculumFocus: '5~6학년 실과 및 범교과 생활안전 · 전기·가스·적치물 화재 예방 사전 점검',
      isPreventionMode: true,
      roomLabels: [
        { c: 2.4, r: 1.4, text: '🛏️ 북서 침실(콘센트)' },
        { c: 12.0, r: 1.4, text: '🍳 북동 주방(가스불)' },
        { c: 7.5, r: 4.3, text: '🛋️ 중앙 거실 홀(시작)' },
        { c: 2.4, r: 7.4, text: '🌡️ 남서 세탁실(난방기)' },
        { c: 12.0, r: 7.4, text: '📦 남동 베란다(적치물)' }
      ],
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,16,0,1,0,0,0,0,1,5,0,16,0,1],
        [1,0,0,0,3,0,0,16,0,3,0,0,0,0,1],
        [1,2,0,0,1,0,2,0,2,1,0,0,2,0,1],
        [1,1,1,1,1,0,0,0,0,1,1,1,1,1,1],
        [1,1,1,1,1,0,0,0,0,1,1,1,1,1,1],
        [1,2,0,0,1,0,2,0,2,1,0,0,2,0,1],
        [1,0,0,0,3,0,0,0,0,3,0,0,0,0,1],
        [1,0,16,0,1,0,1,7,1,1,0,0,16,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      playerStart: { x: 7.5, y: 4.5 },
      guideSigns: [
        { c: 7, r: 6, dir: '↓' }
      ],
      fires: [],
      smokes: [],
      items: [
        { c: 6, r: 4, type: 'flashlight', name: '점검 손전등', icon: '🔦' }
      ]
    },

    // Index 6 -> Stage 6 [★★★★★★ 최상급 보스]: 4 Detached Cabins & Diagonal Firebreak Trail (Top-Right Glamping Start -> Bottom-Left Forest Shelter Exit)
    {
      id: 6,
      name: '6단계: 캠핑장·배터리 충전소 열폭주 [★★★★★★ 최상급 · 대각선 방화선]',
      difficultyStars: '★★★★★★',
      difficultyLabel: '최상급 보스 · 4개 독립 캐빈 & 대각선 방화선',
      fireSpreadInterval: 7.5,
      smokeO2DrainMult: 1.35,
      fireDamageMult: 1.35,
      mission: '우상단 글램핑 텐트에서 출발해 ① 배터리 충전소 차단기(⚡)와 취사동 가스밸브(🔴)를 모두 잠그고 ② 관리동(🔒) 동생(🧒)을 구출해 좌하단 산림 대피소(EXIT)로 탈출하세요!',
      curriculumFocus: '최신 생활안전 트렌드 · 리튬배터리 열폭주 대처 및 야외 캠핑장 다중 시설 복합 방탈출',
      requireWetTowelOrMask: true,
      requireGasClosed: true,
      requireRescueNpc: true,
      roomLabels: [
        { c: 12.2, r: 1.4, text: '⛺ 글램핑 텐트(시작)' },
        { c: 7.0, r: 1.4, text: '⚡ 배터리 충전소' },
        { c: 2.3, r: 1.4, text: '🍳 야외 취사동(가스)' },
        { c: 12.2, r: 6.4, text: '🔒 캠핑 관리동(구출)' },
        { c: 2.3, r: 7.4, text: '🌲 산림 대피소(EXIT)' }
      ],
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,9,0,0,1,0,12,0,0,1,1,0,0,0,1],
        [1,0,2,0,3,0,0,0,0,3,0,0,0,5,1],
        [1,0,0,0,1,0,0,2,0,1,1,2,0,0,1],
        [1,1,3,1,1,1,3,1,1,1,1,1,3,1,1],
        [1,17,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,0,0,1,1,10,1,0,1,1,1,1,1],
        [1,0,0,0,8,0,0,0,0,0,4,0,0,2,1],
        [1,7,0,6,1,1,1,0,0,1,1,0,0,11,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      playerStart: { x: 12.5, y: 1.5 },
      guideSigns: [
        { c: 10, r: 2, dir: '←' },
        { c: 5, r: 2, dir: '←' },
        { c: 6, r: 5, dir: '↓' },
        { c: 5, r: 7, dir: '←' }
      ],
      fires: [
        { c: 7, r: 2, intensity: 1.0, fireType: 'electric' },
        { c: 3, r: 1, intensity: 1.0, fireType: 'oil' },
        { c: 10, r: 5, intensity: 0.95, fireType: 'electric' },
        { c: 6, r: 5, intensity: 0.95, fireType: 'normal' },
        { c: 8, r: 7, intensity: 0.95, fireType: 'oil' },
        { c: 3, r: 5, intensity: 0.9, fireType: 'normal' }
      ],
      smokes: [
        { c: 8, r: 2 }, { c: 11, r: 5 }, { c: 8, r: 5 }, { c: 5, r: 5 }, { c: 4, r: 6 }, { c: 7, r: 7 }
      ],
      items: [
        { c: 11, r: 1, type: 'mask', name: '방연마스크', icon: '😷' },
        { c: 8, r: 1, type: 'extinguisher', name: '소화기', icon: '🧯', charges: 8 },
        { c: 6, r: 3, type: 'key', name: '관리동 열쇠', icon: '🔑' },
        { c: 2, r: 3, type: 'axe', name: '소방 도끼', icon: '🪓' },
        { c: 12, r: 7, type: 'npc', name: '동생', icon: '🧒' }
      ]
    }
  ];

  var CHARACTER_SKINS = [
    {
      id: 'student',
      name: '용감한 초등학생',
      icon: '🧒',
      minBadges: 0,
      perkDesc: '기본 캐릭터 (균형 잡힌 표준 능력치)',
      bonusExtinguisher: 0,
      bonusWater: 0,
      defaultFlashlight: false,
      crouchSpeedBonus: 1.0,
      o2DrainMult: 1.0
    },
    {
      id: 'junior_fire',
      name: '꼬마 소방관',
      icon: '👩‍🚒',
      minBadges: 2,
      perkDesc: '배지 2개 해금: 스테이지 시작 시 소화기 약제 +2회 기본 보유',
      bonusExtinguisher: 2,
      bonusWater: 0,
      defaultFlashlight: false,
      crouchSpeedBonus: 1.0,
      o2DrainMult: 1.0
    },
    {
      id: 'rescue_hero',
      name: '119 구조대원',
      icon: '🦺',
      minBadges: 5,
      perkDesc: '배지 5개 해금: 비상 손전등 기본 장착 + 낮은 자세 이동속도 15% 상승',
      bonusExtinguisher: 1,
      bonusWater: 0,
      defaultFlashlight: true,
      crouchSpeedBonus: 1.15,
      o2DrainMult: 1.0
    },
    {
      id: 'safety_master',
      name: '안전 마스터 & 구조견',
      icon: '🐕‍🦺',
      minBadges: 8,
      perkDesc: '배지 8개 해금: 소화기+2 · 물+2 · 연기 속 산소 소모량 20% 감소',
      bonusExtinguisher: 2,
      bonusWater: 2,
      defaultFlashlight: true,
      crouchSpeedBonus: 1.15,
      o2DrainMult: 0.8
    }
  ];

  // --- Procedural Daily Challenge Generator with 4 Distinct Architectural Templates ---
  function generateDailyChallengeStage(dateStr) {
    var now = new Date();
    var seedStr = dateStr || (
      now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0')
    );

    var hash = 2166136261;
    for (var i = 0; i < seedStr.length; i++) {
      hash ^= seedStr.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    function nextRand() {
      hash += 0x6D2B79F5;
      var t = hash;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function randInt(min, max) {
      return Math.floor(nextRand() * (max - min + 1)) + min;
    }

    var fireTypes = ['normal', 'electric', 'oil'];
    var templates = [
      // Template 0: 대각선 크로스 미로형 (Bottom-Left Start -> Top-Right Exit)
      {
        themeName: '복합 상가 대각선 방탈출',
        archLabel: '대각선 크로스 미로형',
        playerStart: { x: 1.5, y: 8.5 },
        roomLabels: [
          { c: 2.3, r: 7.4, text: '🏢 1층 로비(시작)' },
          { c: 7.5, r: 4.5, text: '⚡ 중앙 교차 홀' },
          { c: 2.3, r: 1.4, text: '🔒 북서 고립 상가' },
          { c: 12.2, r: 1.4, text: '🏃 북동 비상계단(EXIT)' }
        ],
        map: [
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
          [1,0,0,2,1,12,0,0,0,1,1,0,0,7,1],
          [1,0,0,0,4,0,0,2,0,1,1,8,1,1,1],
          [1,1,1,1,1,1,3,1,1,1,0,0,0,11,1],
          [1,17,0,0,0,0,0,0,0,3,0,2,0,0,1],
          [1,0,2,0,1,1,3,1,1,1,1,3,1,1,1],
          [1,1,3,1,1,0,0,0,0,1,0,0,0,6,1],
          [1,0,0,0,3,0,2,0,0,3,0,2,0,0,1],
          [1,0,5,0,1,10,0,0,1,1,0,0,0,0,1],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        guideSigns: [
          { c: 6, r: 7, dir: '↑' },
          { c: 7, r: 4, dir: '→' },
          { c: 11, r: 4, dir: '↑' }
        ],
        fires: [
          { c: 5, r: 4, intensity: 0.95, fireType: fireTypes[randInt(0, 2)] },
          { c: 8, r: 7, intensity: 0.95, fireType: fireTypes[randInt(0, 2)] },
          { c: 11, r: 3, intensity: 0.9, fireType: 'electric' }
        ],
        smokes: [
          { c: 4, r: 4 }, { c: 7, r: 4 }, { c: 7, r: 7 }, { c: 10, r: 4 }
        ],
        items: [
          { c: 3, r: 7, type: 'mask', name: '방연마스크', icon: '😷' },
          { c: 6, r: 6, type: 'extinguisher', name: '소화기', icon: '🧯', charges: 8 },
          { c: 12, r: 7, type: 'key', name: '비상열쇠', icon: '🔑' },
          { c: 8, r: 1, type: 'axe', name: '소방 도끼', icon: '🪓' },
          { c: 2, r: 1, type: 'npc', name: '친구', icon: '🧒' }
        ]
      },
      // Template 1: 중앙 중정(Courtyard) 순환형 (Top-Right Start -> Bottom-Center Exit)
      {
        themeName: '도서관 중정 회랑 방탈출',
        archLabel: '중앙 중정 순환형',
        playerStart: { x: 13.5, y: 1.5 },
        roomLabels: [
          { c: 12.2, r: 1.4, text: '📚 열람실(시작)' },
          { c: 2.3, r: 1.4, text: '⚡ 서측 보존서고' },
          { c: 12.2, r: 6.4, text: '🔒 동측 스터디룸' },
          { c: 7.5, r: 8.2, text: '🏃 남측 중앙현관(EXIT)' }
        ],
        map: [
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
          [1,12,0,0,1,0,0,0,0,1,0,0,5,0,1],
          [1,0,2,0,3,0,1,1,0,3,0,2,0,0,1],
          [1,0,0,0,1,0,1,1,0,1,1,1,3,1,1],
          [1,1,3,1,1,0,1,1,0,0,0,0,0,17,1],
          [1,0,0,0,0,0,1,1,1,1,1,4,1,1,1],
          [1,0,2,0,1,0,0,0,0,1,0,0,0,2,1],
          [1,6,0,11,1,1,8,1,1,1,0,0,0,0,1],
          [1,1,1,1,1,10,0,7,0,1,1,1,1,1,1],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        guideSigns: [
          { c: 7, r: 1, dir: '←' },
          { c: 5, r: 4, dir: '↓' },
          { c: 6, r: 6, dir: '↓' }
        ],
        fires: [
          { c: 5, r: 3, intensity: 0.95, fireType: fireTypes[randInt(0, 2)] },
          { c: 8, r: 4, intensity: 0.95, fireType: fireTypes[randInt(0, 2)] },
          { c: 7, r: 6, intensity: 0.9, fireType: 'normal' }
        ],
        smokes: [
          { c: 6, r: 1 }, { c: 5, r: 5 }, { c: 8, r: 6 }, { c: 2, r: 5 }
        ],
        items: [
          { c: 10, r: 1, type: 'mask', name: '방연마스크', icon: '😷' },
          { c: 12, r: 4, type: 'extinguisher', name: '소화기', icon: '🧯', charges: 8 },
          { c: 2, r: 3, type: 'key', name: '비상열쇠', icon: '🔑' },
          { c: 2, r: 6, type: 'axe', name: '소방 도끼', icon: '🪓' },
          { c: 12, r: 7, type: 'npc', name: '친구', icon: '🧒' }
        ]
      },
      // Template 2: S자형 지그재그 복도형 (Top-Left Start -> Bottom-Left Exit via S-curve)
      {
        themeName: '체육관 S자 지그재그 방탈출',
        archLabel: 'S자형 지그재그 복도형',
        playerStart: { x: 1.5, y: 1.5 },
        roomLabels: [
          { c: 2.3, r: 1.4, text: '🏀 체육관 대기실(시작)' },
          { c: 11.5, r: 2.2, text: '⚡ 상단 장비실(열쇠)' },
          { c: 7.5, r: 5.2, text: '🏃 S자 중앙 회랑' },
          { c: 12.2, r: 7.4, text: '🔒 우하단 의무실(구출)' },
          { c: 2.3, r: 7.4, text: '🏃 좌하단 비상출구(EXIT)' }
        ],
        map: [
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
          [1,0,0,5,1,0,0,0,0,0,1,12,0,11,1],
          [1,0,2,0,3,0,2,0,2,0,3,0,0,0,1],
          [1,1,1,1,1,1,1,1,1,1,1,0,2,0,1],
          [1,17,0,0,0,0,0,0,0,0,3,0,0,0,1],
          [1,0,0,2,0,0,2,0,0,0,1,1,1,1,1],
          [1,0,1,1,1,1,1,1,1,3,1,0,0,2,1],
          [1,8,1,6,1,10,0,0,0,0,4,0,0,0,1],
          [1,7,0,0,3,0,0,0,0,0,1,0,0,0,1],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        guideSigns: [
          { c: 7, r: 1, dir: '→' },
          { c: 8, r: 4, dir: '←' },
          { c: 2, r: 5, dir: '↓' }
        ],
        fires: [
          { c: 7, r: 4, intensity: 0.95, fireType: fireTypes[randInt(0, 2)] },
          { c: 5, r: 5, intensity: 0.95, fireType: fireTypes[randInt(0, 2)] },
          { c: 7, r: 8, intensity: 0.9, fireType: 'normal' }
        ],
        smokes: [
          { c: 6, r: 2 }, { c: 8, r: 4 }, { c: 4, r: 4 }, { c: 8, r: 7 }
        ],
        items: [
          { c: 3, r: 1, type: 'mask', name: '방연마스크', icon: '😷' },
          { c: 5, r: 1, type: 'extinguisher', name: '소화기', icon: '🧯', charges: 8 },
          { c: 13, r: 2, type: 'key', name: '비상열쇠', icon: '🔑' },
          { c: 3, r: 4, type: 'axe', name: '소방 도끼', icon: '🪓' },
          { c: 12, r: 7, type: 'npc', name: '친구', icon: '🧒' }
        ]
      },
      // Template 3: 십자형(┼) 벙커 미로형 (Center Hub Start -> Top-Left Exit)
      {
        themeName: '청소년 수련관 십자 벙커 방탈출',
        archLabel: '십자형(┼) 벙커 미로형',
        playerStart: { x: 7.5, y: 4.5 },
        roomLabels: [
          { c: 7.5, r: 4.3, text: '🧭 중앙 라운지(시작)' },
          { c: 12.2, r: 1.4, text: '⚡ 북동 기계실(도끼)' },
          { c: 12.2, r: 7.4, text: '🔒 남동 숙소동(구출)' },
          { c: 2.3, r: 1.4, text: '🏃 북서 비상계단(EXIT)' }
        ],
        map: [
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
          [1,7,0,0,1,0,17,0,5,1,12,0,0,11,1],
          [1,1,8,1,1,0,2,0,0,3,0,0,2,0,1],
          [1,0,0,0,3,0,0,0,0,1,1,1,1,1,1],
          [1,0,2,0,1,0,0,0,0,0,0,0,0,6,1],
          [1,1,3,1,1,0,0,0,0,1,1,3,1,1,1],
          [1,0,0,0,1,0,2,0,0,1,0,0,0,2,1],
          [1,0,2,0,3,0,0,0,0,4,0,0,0,0,1],
          [1,0,0,0,1,10,0,0,0,1,0,0,0,0,1],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        guideSigns: [
          { c: 8, r: 4, dir: '→' },
          { c: 7, r: 6, dir: '↓' },
          { c: 5, r: 3, dir: '←' }
        ],
        fires: [
          { c: 7, r: 2, intensity: 0.95, fireType: fireTypes[randInt(0, 2)] },
          { c: 7, r: 7, intensity: 0.95, fireType: fireTypes[randInt(0, 2)] },
          { c: 2, r: 3, intensity: 0.9, fireType: 'normal' }
        ],
        smokes: [
          { c: 6, r: 3 }, { c: 8, r: 5 }, { c: 6, r: 7 }, { c: 3, r: 3 }
        ],
        items: [
          { c: 6, r: 4, type: 'mask', name: '방연마스크', icon: '😷' },
          { c: 8, r: 4, type: 'extinguisher', name: '소화기', icon: '🧯', charges: 8 },
          { c: 2, r: 7, type: 'key', name: '비상열쇠', icon: '🔑' },
          { c: 12, r: 1, type: 'axe', name: '소방 도끼', icon: '🪓' },
          { c: 12, r: 7, type: 'npc', name: '친구', icon: '🧒' }
        ]
      }
    ];

    var chosen = templates[randInt(0, templates.length - 1)];

    return {
      id: 7,
      isDailyChallenge: true,
      dailyDate: seedStr,
      difficultyStars: '★★★★☆',
      difficultyLabel: '일일 챌린지 · ' + chosen.archLabel,
      fireSpreadInterval: 9.5,
      smokeO2DrainMult: 1.10,
      fireDamageMult: 1.10,
      requireWetTowelOrMask: true,
      requireRescueNpc: true,
      name: '오늘의 챌린지 (' + seedStr + '): ' + chosen.themeName,
      mission: '[' + seedStr + ' · ' + chosen.archLabel + '] ① 마스크(😷) 착용 ② 열쇠(🔑)·도끼(🪓)로 잠긴 방의 친구(🧒)를 구출해 비상구(EXIT)로 탈출하세요!',
      curriculumFocus: '일일 실전 응용 방탈출 훈련 · 돌발 재난 상황 판단력 및 안전 수칙 종합 적용',
      roomLabels: chosen.roomLabels,
      map: chosen.map,
      playerStart: chosen.playerStart,
      guideSigns: chosen.guideSigns,
      fires: chosen.fires,
      smokes: chosen.smokes,
      items: chosen.items
    };
  }

  window.FireEscape.TILE = TILE;
  window.FireEscape.COLS = COLS;
  window.FireEscape.ROWS = ROWS;
  window.FireEscape.BADGE_DEFS = BADGE_DEFS;
  window.FireEscape.HAZARD_QUIZZES = HAZARD_QUIZZES;
  window.FireEscape.CHARACTER_SKINS = CHARACTER_SKINS;
  window.FireEscape.generateDailyChallengeStage = generateDailyChallengeStage;
  window.FireEscape.STAGES = STAGES;
})();
