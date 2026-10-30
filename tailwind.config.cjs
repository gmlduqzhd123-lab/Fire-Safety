// 화면 꾸미기 파일(tailwind.css)을 앱 안에 미리 만들어 두는 설정 (바깥 CDN 스크립트 대신 사용)
// 새 Tailwind 클래스를 쓰면 아래 명령으로 다시 만들어 함께 커밋한다:
//   npx tailwindcss@3.4.17 -c tailwind.config.cjs -i tailwind.input.css -o tailwind.css --minify
module.exports = { content: ['./*.html', './*.js'], theme: { extend: {} } };
