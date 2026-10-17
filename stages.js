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

  // --- Stage Definitions (Stages 1~5 + Prevention Mode) ---
  const STAGES = [
    // Index 0 -> Stage 1 (Default start stage)
    {
      id: 1,
      name: '1단계: 2층 침실과 복도',
      mission: '수건을 적시고 비상벨(🔔)을 울려 가족과 함께 비상계단(EXIT) 또는 경량칸막이(🧱)로 대피하세요!',
      curriculumFocus: '통합교과(119 신고·유도등) · 공동주택 경량칸막이 & 방화문 닫기',
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,0,0,0,1,5,0,0,1,6,6,14,1],
        [1,2,0,0,0,0,3,0,0,0,1,0,0,0,1],
        [1,0,0,0,2,0,1,1,3,1,1,0,0,0,1],
        [1,0,0,0,0,0,1,0,0,0,4,0,0,11,1],
        [1,1,1,4,17,1,1,0,0,0,1,1,3,1,1],
        [1,0,0,0,0,0,0,0,2,0,0,0,0,0,1],
        [1,0,2,2,0,10,1,0,0,0,0,2,0,0,1],
        [1,0,0,0,0,0,1,0,0,0,1,0,0,7,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      playerStart: { x: 2.5, y: 2.5 },
      guideSigns: [
        { c: 3, r: 4, dir: '↓' },
        { c: 3, r: 6, dir: '→' },
        { c: 7, r: 6, dir: '→' },
        { c: 10, r: 6, dir: '→' },
        { c: 12, r: 6, dir: '↓' },
        { c: 12, r: 8, dir: '→' }
      ],
      fires: [
        { c: 1, r: 7, intensity: 1.0, fireType: 'normal' },
        { c: 5, r: 8, intensity: 1.0, fireType: 'normal' },
        { c: 6, r: 6, intensity: 0.85, fireType: 'normal' },
        { c: 11, r: 3, intensity: 0.9, fireType: 'normal' }
      ],
      smokes: [
        { c: 4, r: 6 }, { c: 5, r: 6 }, { c: 7, r: 6 }, { c: 9, r: 6 },
        { c: 7, r: 4 }, { c: 8, r: 4 }, { c: 9, r: 4 },
        { c: 11, r: 6 }, { c: 12, r: 6 }, { c: 12, r: 7 }
      ],
      items: [
        { c: 4, r: 2, type: 'towel', name: '마른 수건', icon: '🧣' },
        { c: 8, r: 1, type: 'bucket', name: '물양동이(냉각소화)', icon: '🪣', charges: 3 },
        { c: 9, r: 2, type: 'key', name: '복도 열쇠', icon: '🔑' },
        { c: 1, r: 4, type: 'toy', name: '휴대용 게임기(유혹물건)', icon: '🎮' },
        { c: 2, r: 8, type: 'extinguisher', name: '분말 소화기(PASS)', icon: '🧯', charges: 5 },
        { c: 9, r: 7, type: 'npc', name: '동생 민수(대피알림)', icon: '🧒' },
        { c: 8, r: 8, type: 'key', name: '비상문 열쇠', icon: '🔑' }
      ]
    },
    // Index 1 -> Stage 2
    {
      id: 2,
      name: '2단계: 1층 거실과 주방',
      mission: '가스밸브(🔴)·차단기(⚡)를 내리고 방연마스크(😷)와 소화기로 초코와 함께 탈출하세요!',
      curriculumFocus: '5~6학년 과학(연소와 소화 - 식용유·전기 화재 진압 및 방화문 연기 차단)',
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,1,5,0,9,1,12,0,2,0,0,1],
        [1,0,2,0,3,0,0,0,3,0,0,0,0,0,1],
        [1,0,0,0,1,0,2,0,1,1,4,1,1,1,1],
        [1,1,3,1,1,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,2,0,0,0,2,0,0,1],
        [1,0,2,0,0,0,17,1,1,3,1,1,1,1,1],
        [1,0,0,0,1,0,1,0,0,0,0,1,0,11,1],
        [1,6,0,0,1,0,10,0,2,0,0,4,0,7,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      playerStart: { x: 1.5, y: 1.5 },
      guideSigns: [
        { c: 2, r: 5, dir: '→' },
        { c: 5, r: 5, dir: '↑' },
        { c: 9, r: 4, dir: '↓' },
        { c: 9, r: 7, dir: '→' },
        { c: 12, r: 8, dir: '→' }
      ],
      fires: [
        { c: 6, r: 2, intensity: 1.0, fireType: 'oil' },
        { c: 7, r: 2, intensity: 1.0, fireType: 'oil' },
        { c: 5, r: 4, intensity: 0.9, fireType: 'normal' },
        { c: 8, r: 5, intensity: 0.95, fireType: 'electric' },
        { c: 7, r: 8, intensity: 1.0, fireType: 'normal' },
        { c: 12, r: 5, intensity: 0.9, fireType: 'electric' }
      ],
      smokes: [
        { c: 5, r: 2 }, { c: 5, r: 3 }, { c: 7, r: 3 },
        { c: 3, r: 5 }, { c: 4, r: 5 }, { c: 5, r: 5 },
        { c: 9, r: 4 }, { c: 10, r: 4 }, { c: 11, r: 4 },
        { c: 8, r: 7 }, { c: 9, r: 7 }, { c: 10, r: 7 }
      ],
      items: [
        { c: 3, r: 1, type: 'towel', name: '마른 수건', icon: '🧣' },
        { c: 2, r: 3, type: 'mask', name: '습식 방연마스크', icon: '😷' },
        { c: 3, r: 3, type: 'bucket', name: '물양동이(식용유·전기 주의!)', icon: '🪣', charges: 3 },
        { c: 1, r: 5, type: 'extinguisher', name: '다목적·K급 소화기', icon: '🧯', charges: 6 },
        { c: 3, r: 7, type: 'key', name: '안방 열쇠', icon: '🔑' },
        { c: 13, r: 1, type: 'dog', name: '반려견 초코', icon: '🐶' },
        { c: 13, r: 4, type: 'toy', name: '대형 인형(유혹물건)', icon: '🧸' },
        { c: 10, r: 7, type: 'key', name: '현관 열쇠', icon: '🔑' },
        { c: 10, r: 5, type: 'extinguisher', name: '예비 소화기', icon: '🧯', charges: 5 }
      ]
    },
    // Index 2 -> Stage 3
    {
      id: 3,
      name: '3단계: 베란다 완강기·경량칸막이 탈출',
      mission: '베란다 열쇠(🔑)를 찾아 완강기(🪢)·경량칸막이(🧱)로 탈출하거나, 소방도끼(🪓)로 비상구를 여세요!',
      curriculumFocus: '5~6학년 실과(완강기 4단계·경량칸막이 피난 및 구르기 대처)',
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,5,1,0,0,0,1,0,0,0,0,13,1],
        [1,0,2,0,3,0,2,0,4,0,2,2,0,0,1],
        [1,0,0,0,1,0,0,0,1,0,0,0,0,14,1],
        [1,1,1,3,1,1,3,1,1,1,8,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,2,2,1,0,2,0,1,0,2,0,1,0,1],
        [1,0,0,0,10,0,0,0,3,0,0,0,8,0,1],
        [1,0,0,11,1,17,0,0,1,0,0,0,1,7,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      playerStart: { x: 1.5, y: 1.5 },
      guideSigns: [
        { c: 3, r: 5, dir: '→' },
        { c: 6, r: 5, dir: '↑' },
        { c: 7, r: 2, dir: '→' },
        { c: 12, r: 2, dir: '↑' },
        { c: 11, r: 7, dir: '→' }
      ],
      fires: [
        { c: 5, r: 3, intensity: 1.0, fireType: 'normal' },
        { c: 5, r: 7, intensity: 1.0, fireType: 'normal' },
        { c: 6, r: 5, intensity: 1.0, fireType: 'oil' },
        { c: 7, r: 5, intensity: 0.95, fireType: 'electric' },
        { c: 10, r: 5, intensity: 1.0, fireType: 'normal' },
        { c: 11, r: 7, intensity: 1.0, fireType: 'electric' },
        { c: 13, r: 6, intensity: 0.95, fireType: 'normal' }
      ],
      smokes: [
        { c: 3, r: 5 }, { c: 4, r: 5 }, { c: 5, r: 5 },
        { c: 8, r: 5 }, { c: 9, r: 5 }, { c: 11, r: 5 },
        { c: 6, r: 7 }, { c: 7, r: 7 },
        { c: 9, r: 7 }, { c: 10, r: 7 }, { c: 13, r: 5 }
      ],
      items: [
        { c: 1, r: 3, type: 'towel', name: '마른 수건', icon: '🧣' },
        { c: 3, r: 2, type: 'flashlight', name: '비상 손전등', icon: '🔦' },
        { c: 2, r: 1, type: 'bucket', name: '물양동이', icon: '🪣', charges: 4 },
        { c: 7, r: 1, type: 'extinguisher', name: '대형 소화기(PASS)', icon: '🧯', charges: 7 },
        { c: 1, r: 8, type: 'key', name: '베란다 열쇠', icon: '🔑' },
        { c: 1, r: 6, type: 'toy', name: '저금통과 장난감(유혹물건)', icon: '🎮' },
        { c: 11, r: 3, type: 'axe', name: '소방 도끼', icon: '🪓' },
        { c: 7, r: 8, type: 'extinguisher', name: '비상 소화기', icon: '🧯', charges: 6 }
      ]
    },
    // Index 3 -> Stage 4 (Elementary School Science Lab)
    {
      id: 4,
      name: '4단계: 초등학교 과학실 화재 대피',
      mission: '과학실 알코올램프 화재를 진압하고 비상벨(🔔)을 눌러 친구(🧒)와 함께 교실 밖 비상계단으로 대피하세요!',
      curriculumFocus: '3~6학년 과학실 실험 안전 수칙 · 다중 학급 비상벨 발신 및 방화문 차단',
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,5,0,0,1,0,0,2,0,0,11,0,1],
        [1,0,2,2,0,0,3,0,0,2,0,0,0,0,1],
        [1,0,0,0,0,0,1,0,0,0,0,2,0,0,1],
        [1,1,1,3,1,1,1,1,3,1,1,1,3,1,1],
        [1,17,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,3,1,1,1,10,1,1,1,3,1,1,4,1],
        [1,0,0,0,0,1,0,0,0,1,0,0,1,7,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      playerStart: { x: 1.5, y: 1.5 },
      guideSigns: [
        { c: 3, r: 5, dir: '→' },
        { c: 6, r: 5, dir: '→' },
        { c: 9, r: 5, dir: '→' },
        { c: 13, r: 5, dir: '↓' },
        { c: 13, r: 7, dir: '↓' }
      ],
      fires: [
        { c: 4, r: 2, intensity: 1.0, fireType: 'oil' },
        { c: 5, r: 2, intensity: 0.95, fireType: 'normal' },
        { c: 6, r: 8, intensity: 1.0, fireType: 'normal' },
        { c: 8, r: 6, intensity: 0.9, fireType: 'electric' },
        { c: 12, r: 6, intensity: 0.95, fireType: 'normal' }
      ],
      smokes: [
        { c: 4, r: 5 }, { c: 5, r: 5 }, { c: 6, r: 5 }, { c: 7, r: 5 },
        { c: 9, r: 6 }, { c: 10, r: 6 }, { c: 11, r: 6 }
      ],
      items: [
        { c: 1, r: 3, type: 'mask', name: '과학실 방연마스크', icon: '😷' },
        { c: 2, r: 1, type: 'extinguisher', name: '과학실 모래·소화기', icon: '🧯', charges: 6 },
        { c: 8, r: 1, type: 'npc', name: '짝꿍 지민이(함께대피)', icon: '🧒' },
        { c: 11, r: 1, type: 'key', name: '비상계단 열쇠', icon: '🔑' },
        { c: 2, r: 8, type: 'flashlight', name: '비상 손전등', icon: '🔦' },
        { c: 4, r: 8, type: 'extinguisher', name: '복도 소화기', icon: '🧯', charges: 5 }
      ]
    },
    // Index 4 -> Stage 5 (Subway / Shopping Mall Blackout Evacuation)
    {
      id: 5,
      name: '5단계: 다중이용시설(지하철·쇼핑몰) 정전 탈출',
      mission: '정전된 어두운 지하상가에서 비상손전등(🔦)과 방연마스크(😷)를 챙겨 초록색 피난유도등(🟩→)을 따라 지상으로 탈출하세요!',
      curriculumFocus: '범교과 다중이용시설 재난 안전 · 정전 시 손전등 시야 확보 및 피난유도등 추적',
      isDarkStage: true,
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,3,0,0,12,1,6,6,0,0,11,1],
        [1,0,2,0,1,0,2,0,1,0,0,0,2,0,1],
        [1,0,0,0,1,0,0,0,3,0,2,0,0,0,1],
        [1,1,3,1,1,1,3,1,1,0,1,1,3,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,2,2,0,1,1,10,1,1,4,2,2,0,1],
        [1,0,0,0,0,3,0,0,0,3,0,0,0,0,1],
        [1,17,0,5,0,1,0,0,0,1,0,0,0,7,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      playerStart: { x: 1.5, y: 1.5 },
      guideSigns: [
        { c: 1, r: 5, dir: '→' },
        { c: 4, r: 5, dir: '→' },
        { c: 7, r: 5, dir: '→' },
        { c: 10, r: 5, dir: '↓' },
        { c: 10, r: 7, dir: '→' },
        { c: 12, r: 8, dir: '→' }
      ],
      fires: [
        { c: 6, r: 3, intensity: 1.0, fireType: 'electric' },
        { c: 5, r: 5, intensity: 0.95, fireType: 'normal' },
        { c: 7, r: 7, intensity: 1.0, fireType: 'normal' },
        { c: 8, r: 7, intensity: 0.95, fireType: 'oil' },
        { c: 11, r: 5, intensity: 0.9, fireType: 'electric' },
        { c: 12, r: 7, intensity: 1.0, fireType: 'normal' }
      ],
      smokes: [
        { c: 2, r: 5 }, { c: 3, r: 5 }, { c: 4, r: 5 },
        { c: 6, r: 5 }, { c: 7, r: 5 }, { c: 8, r: 5 },
        { c: 9, r: 5 }, { c: 10, r: 7 }, { c: 11, r: 8 }
      ],
      items: [
        { c: 3, r: 1, type: 'flashlight', name: '고광량 비상 손전등', icon: '🔦' },
        { c: 1, r: 3, type: 'mask', name: '지하철 비치 방연마스크', icon: '😷' },
        { c: 5, r: 1, type: 'extinguisher', name: '역사 내 소화기', icon: '🧯', charges: 7 },
        { c: 12, r: 1, type: 'key', name: '비상개찰구 마스터키', icon: '🔑' },
        { c: 13, r: 3, type: 'npc', name: '길 잃은 시민(구조)', icon: '🧒' },
        { c: 2, r: 7, type: 'extinguisher', name: '상가 예비 소화기', icon: '🧯', charges: 6 }
      ]
    },
    // Index 5 -> Prevention Inspection Mode
    {
      id: 0,
      name: '예방모드: 우리 집 화재 위험요소 5곳 점검',
      mission: '불이 나기 전 집 안의 화재 위험요소(⚠️) 5곳을 모두 찾아 안전하게 점검·수리하세요!',
      curriculumFocus: '5~6학년 실과 및 범교과 생활안전 · 전기·가스·적치물 화재 예방 점검',
      isPreventionMode: true,
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,16,1,5,0,16,1,0,0,2,0,16,1],
        [1,0,2,0,3,0,0,0,3,0,0,0,0,0,1],
        [1,0,0,0,1,0,2,0,1,1,3,1,1,1,1],
        [1,1,3,1,1,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,2,0,0,0,2,0,0,1],
        [1,0,2,0,0,0,1,1,1,3,1,1,0,0,1],
        [1,0,16,0,1,0,1,0,0,0,0,1,0,0,1],
        [1,0,0,0,1,0,3,0,16,0,0,3,0,7,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      playerStart: { x: 1.5, y: 1.5 },
      guideSigns: [],
      fires: [],
      smokes: [],
      items: [
        { c: 1, r: 5, type: 'flashlight', name: '점검용 손전등', icon: '🔦' }
      ]
    },
    // Index 6 -> Stage 6 (Camping & Kickboard Battery Fire Evacuation)
    {
      id: 6,
      name: '6단계: 캠핑장·배터리 열폭주 탈출',
      mission: '전동킥보드 리튬배터리 화재(⚡)와 캠핑 화로 불길을 피해 차단기(⚡)를 내리고 경량칸막이(🧱) 또는 비상구로 탈출하세요!',
      curriculumFocus: '최신 생활안전 트렌드 · 리튬배터리 열폭주 대처 및 캠핑장 일산화탄소·화로 안전',
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,5,0,1,0,0,12,0,1,0,0,11,1],
        [1,0,2,0,0,3,0,2,0,0,3,0,2,0,1],
        [1,0,0,0,0,1,0,0,0,0,1,0,0,0,1],
        [1,1,3,1,1,1,1,3,1,1,1,1,3,1,1],
        [1,17,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,2,2,0,0,0,2,2,0,0,0,0,1],
        [1,1,10,1,1,1,3,1,1,1,15,1,1,4,1],
        [1,0,0,0,0,1,0,0,0,1,0,0,0,7,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      playerStart: { x: 1.5, y: 1.5 },
      guideSigns: [
        { c: 2, r: 5, dir: '→' },
        { c: 6, r: 5, dir: '→' },
        { c: 10, r: 5, dir: '↓' },
        { c: 12, r: 8, dir: '→' }
      ],
      fires: [
        { c: 2, r: 8, intensity: 1.0, fireType: 'electric' },
        { c: 7, r: 5, intensity: 1.0, fireType: 'electric' },
        { c: 8, r: 3, intensity: 0.95, fireType: 'oil' },
        { c: 11, r: 6, intensity: 0.95, fireType: 'normal' }
      ],
      smokes: [
        { c: 3, r: 5 }, { c: 4, r: 5 }, { c: 5, r: 5 },
        { c: 6, r: 5 }, { c: 9, r: 5 }, { c: 10, r: 5 }
      ],
      items: [
        { c: 1, r: 3, type: 'towel', name: '캠핑용 수건', icon: '🧣' },
        { c: 4, r: 1, type: 'extinguisher', name: '캠핑장 전용 소화기', icon: '🧯', charges: 7 },
        { c: 6, r: 1, type: 'mask', name: '일산화탄소 방연마스크', icon: '😷' },
        { c: 11, r: 1, type: 'key', name: '비상출입구 열쇠', icon: '🔑' },
        { c: 13, r: 3, type: 'npc', name: '캠핑장 동생(구조)', icon: '🧒' },
        { c: 7, r: 8, type: 'extinguisher', name: '비상대피소 소화기', icon: '🧯', charges: 6 }
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

    var map = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,5,0,1,0,0,12,0,1,0,0,11,1],
      [1,0,0,0,0,3,0,0,0,0,3,0,0,0,1],
      [1,0,0,0,0,1,0,0,0,0,1,0,0,0,1],
      [1,1,3,1,1,1,1,3,1,1,1,1,3,1,1],
      [1,17,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,10,1,1,1,3,1,1,1,15,1,1,4,1],
      [1,0,0,0,0,1,0,0,0,1,0,0,0,7,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    // Place deterministic daily furniture obstacles on safe cells
    var candidateFurn = [
      { c: 2, r: 2 }, { c: 3, r: 2 }, { c: 7, r: 2 }, { c: 8, r: 2 }, { c: 12, r: 2 },
      { c: 3, r: 6 }, { c: 4, r: 6 }, { c: 8, r: 6 }, { c: 9, r: 6 }
    ];
    for (var fIdx = 0; fIdx < candidateFurn.length; fIdx++) {
      if (nextRand() < 0.55) {
        map[candidateFurn[fIdx].r][candidateFurn[fIdx].c] = 2;
      }
    }

    var fireTypes = ['normal', 'electric', 'oil'];
    var fires = [
      { c: randInt(3, 4), r: 5, intensity: 0.95, fireType: fireTypes[randInt(0, 2)] },
      { c: randInt(6, 8), r: 5, intensity: 1.0, fireType: 'electric' },
      { c: randInt(10, 12), r: 5, intensity: 0.95, fireType: fireTypes[randInt(0, 2)] },
      { c: randInt(6, 8), r: 8, intensity: 0.9, fireType: 'normal' }
    ];

    var smokes = [
      { c: 2, r: 5 }, { c: 5, r: 5 }, { c: 7, r: 5 },
      { c: 9, r: 5 }, { c: 11, r: 5 }, { c: 11, r: 8 }
    ];

    var themes = ['복합 상가 돌발 화재', '도서관 야간 누전 화재', '체육관 안전 대피 훈련', '청소년 수련관 비상 탈출'];
    var themeName = themes[randInt(0, themes.length - 1)];

    return {
      id: 7,
      isDailyChallenge: true,
      dailyDate: seedStr,
      name: '오늘의 챌린지 (' + seedStr + '): ' + themeName,
      mission: '[' + seedStr + ' 오늘의 돌발 미션] 매일 구조가 바뀌는 재난 현장에서 젖은 수건·소화기·비상벨을 활용해 탈출하세요!',
      curriculumFocus: '일일 실전 응용 대피 훈련 · 돌발 재난 상황 판단력 및 안전 수칙 종합 적용',
      map: map,
      playerStart: { x: 1.5, y: 1.5 },
      guideSigns: [
        { c: 2, r: 5, dir: '→' },
        { c: 6, r: 5, dir: '→' },
        { c: 10, r: 5, dir: '↓' },
        { c: 12, r: 8, dir: '→' }
      ],
      fires: fires,
      smokes: smokes,
      items: [
        { c: 1, r: 3, type: 'towel', name: '비상 수건', icon: '🧣' },
        { c: 4, r: 1, type: 'extinguisher', name: '초기 진압 소화기', icon: '🧯', charges: 7 },
        { c: 6, r: 1, type: 'mask', name: '구조용 방연마스크', icon: '😷' },
        { c: 11, r: 1, type: 'key', name: '비상구 마스터키', icon: '🔑' },
        { c: 13, r: 3, type: 'npc', name: '고립된 친구(구조)', icon: '🧒' },
        { c: 2, r: 8, type: 'extinguisher', name: '복도 예비 소화기', icon: '🧯', charges: 6 }
      ]
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
