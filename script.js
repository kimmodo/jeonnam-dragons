// 공통 스크립트
// 페이지 이동은 HTML의 a 태그로 처리합니다.

// 새 탭으로 열리는 외부 링크에 보안 속성을 추가합니다.
const externalLinks = document.querySelectorAll('a[target="_blank"]');

externalLinks.forEach((link) => {
  link.rel = "noopener noreferrer";
});
