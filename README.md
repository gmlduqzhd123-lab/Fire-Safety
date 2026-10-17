# 🔥 화재 탈출 넘버원 (2022 개정 교육과정 & 10대 안전 확장판)

초등학교 2022 개정 교육과정 연계 화재 대피 시뮬레이션 웹앱입니다.

## 📁 파일 구성
- `index.html`: 메인 실행 파일 (GitHub Pages 기본 진입점)
- `style.css`: 반응형 UI 및 애니메이션 스타일시트
- `sound.js`: Web Audio API 기반 효과음 합성 모듈
- `stages.js`: 스테이지 0~5 맵, 아이템, 화재/연기, 안전 퀴즈 데이터
- `editor.js`: 커스텀 대피도 맵 에디터, URL 공유(`?map=`), BFS 탈출 경로 검증 모듈
- `game.js`: 핵심 물리 엔진, 방화문 연기 차단, 정전 시야(Fog of War), 미니맵 동선 리플레이

## 🚀 GitHub Pages 배포 방법
1. 압축을 풀고 나오는 파일(`index.html`, `style.css`, `sound.js`, `stages.js`, `editor.js`, `game.js`)을 GitHub 저장소 루트(Root) 경로에 업로드합니다.
2. 저장소의 **Settings > Pages > Build and deployment**에서 Branch를 `main`(또는 `master`), 폴더를 `/ (root)`로 설정하고 **Save**를 누릅니다.
3. 배포된 주소(`https://<계정명>.github.io/<저장소명>/`)로 접속해 플레이합니다.
