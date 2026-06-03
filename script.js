// 공통: 새 탭 외부 링크 보안 속성
const externalLinks = document.querySelectorAll('a[target="_blank"]');

externalLinks.forEach((link) => {
  link.rel = "noopener noreferrer";
});

// --- 공식 API 일정/결과 (schedule, past-results, upcoming-games) ---

const GAME_API_URL = "https://api.dragons.co.kr/game";
const JEONNAM_TEAM_NAME = "전남";
const API_ERROR_MESSAGE =
  "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
const API_EMPTY_MESSAGE = "표시할 데이터가 없습니다.";
const SCHEDULE_LOADING_MESSAGE = "경기 일정을 불러오는 중...";

// 현재 페이지 종류 확인
function getSchedulePageType() {
  if (document.getElementById("next-game-featured")) {
    return "summary";
  }
  if (document.getElementById("past-games-list")) {
    return "past-all";
  }
  if (document.getElementById("upcoming-games-list")) {
    return "upcoming-all";
  }
  return null;
}

// "2026.05.31" 형식 날짜를 정렬용 숫자로 변환
function parseGameDate(dateText) {
  const parts = dateText.split(".");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  return new Date(year, month - 1, day).getTime();
}

// 지난 경기: 최신순 정렬
function sortPastGames(games) {
  return [...games].sort(
    (a, b) => parseGameDate(b.game_date) - parseGameDate(a.game_date)
  );
}

// 예정 경기: 가까운 날짜순 정렬
function sortNextGames(games) {
  return [...games].sort(
    (a, b) => parseGameDate(a.game_date) - parseGameDate(b.game_date)
  );
}

function formatGameTime(timeText) {
  if (!timeText) {
    return "";
  }
  return timeText.slice(0, 5);
}

function getJeonnamResult(game) {
  const homeGoals = Number(game.home_team_goal);
  const awayGoals = Number(game.away_team_goal);

  let jeonnamGoals;
  let opponentGoals;

  if (game.home_team_name === JEONNAM_TEAM_NAME) {
    jeonnamGoals = homeGoals;
    opponentGoals = awayGoals;
  } else if (game.away_team_name === JEONNAM_TEAM_NAME) {
    jeonnamGoals = awayGoals;
    opponentGoals = homeGoals;
  } else {
    return "";
  }

  if (jeonnamGoals > opponentGoals) {
    return "승";
  }
  if (jeonnamGoals < opponentGoals) {
    return "패";
  }
  return "무";
}

function getResultBadgeClass(result) {
  if (result === "승") {
    return "result-win";
  }
  if (result === "패") {
    return "result-lose";
  }
  if (result === "무") {
    return "result-draw";
  }
  return "";
}

// YouTube URL에서 영상 ID 추출 (embed / watch / youtu.be 지원)
function extractYouTubeVideoId(urlText) {
  if (typeof urlText !== "string") {
    return null;
  }

  const raw = urlText.trim();
  if (raw === "") {
    return null;
  }

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }

      const embedMatch = parsed.pathname.match(/^\/embed\/([^/?]+)/);
      if (embedMatch) {
        return embedMatch[1];
      }
    }
  } catch {
    // URL 파싱 실패 시 아래 정규식으로 재시도
  }

  const embedMatch = raw.match(/youtube\.com\/embed\/([^/?&]+)/i);
  if (embedMatch) {
    return embedMatch[1];
  }

  const watchMatch = raw.match(/[?&]v=([^&]+)/i);
  if (watchMatch) {
    return watchMatch[1];
  }

  const shortMatch = raw.match(/youtu\.be\/([^/?&]+)/i);
  if (shortMatch) {
    return shortMatch[1];
  }

  return null;
}

// 시청용 YouTube 링크로 변환 (변환 불가면 null)
function toYouTubeWatchUrl(urlText) {
  const videoId = extractYouTubeVideoId(urlText);

  if (!videoId || !/^[A-Za-z0-9_-]+$/.test(videoId)) {
    return null;
  }

  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

function createHighlightButton(highlightUrl) {
  const watchUrl = toYouTubeWatchUrl(highlightUrl);

  if (!watchUrl) {
    return "";
  }

  return `<a class="highlight-btn" href="${watchUrl}" target="_blank" rel="noopener noreferrer">하이라이트 보기</a>`;
}

// 지난 경기 카드 (extraClass로 크기 스타일 변경)
function createPastGameCard(game, extraClass = "") {
  const result = getJeonnamResult(game);
  const badgeClass = getResultBadgeClass(result);
  const badgeHtml = result
    ? `<span class="result-badge ${badgeClass}">${result}</span>`
    : "";

  return `
    <article class="game-card past-card ${extraClass}">
      <div class="card-top">
        <p class="game-date">${game.game_date} (${game.game_yoil})</p>
        ${badgeHtml}
      </div>
      <p class="meet-name">${game.meet_name}</p>
      <p class="match-teams">${game.home_team_name} ${game.home_team_goal} : ${game.away_team_goal} ${game.away_team_name}</p>
      <p class="field-name">${game.field_name}</p>
      ${createHighlightButton(game.highlight)}
    </article>
  `;
}

// 예정 경기 카드 (extraClass로 크기 스타일 변경)
function createNextGameCard(game, extraClass = "") {
  const timeText = formatGameTime(game.game_time);

  return `
    <article class="game-card next-card ${extraClass}">
      <p class="game-date">${game.game_date} (${game.game_yoil}) ${timeText}</p>
      <p class="meet-name">${game.meet_name}</p>
      <p class="match-teams">${game.home_team_name} vs ${game.away_team_name}</p>
      <p class="field-name">${game.field_name}</p>
      ${createHighlightButton(game.highlight)}
    </article>
  `;
}

function renderGameList(container, games, createCard) {
  if (!container) {
    return;
  }

  if (!games || games.length === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = games.map((game) => createCard(game)).join("");
}

function setApiStatus(statusEl, state, message) {
  const baseClass = statusEl.id === "rank-status" ? "rank-status" : "schedule-status";
  statusEl.textContent = message || "";
  statusEl.className = `${baseClass} is-${state}`;
}

function showScheduleLoading(statusEl) {
  setApiStatus(statusEl, "loading", SCHEDULE_LOADING_MESSAGE);
}

function hideScheduleStatus(statusEl) {
  setApiStatus(statusEl, "hidden", "");
}

function showScheduleError(statusEl) {
  setApiStatus(statusEl, "error", API_ERROR_MESSAGE);
}

function showScheduleEmpty(statusEl) {
  setApiStatus(statusEl, "empty", API_EMPTY_MESSAGE);
}

function hasScheduleData(pageType, pastGames, nextGames) {
  if (pageType === "summary") {
    return pastGames.length > 0 || nextGames.length > 0;
  }
  if (pageType === "past-all") {
    return pastGames.length > 0;
  }
  if (pageType === "upcoming-all") {
    return nextGames.length > 0;
  }
  return false;
}

// schedule.html 요약 화면
function renderSummaryPage(pastGames, nextGames) {
  const nextFeaturedEl = document.getElementById("next-game-featured");
  const recentPastEl = document.getElementById("recent-past-games");

  if (nextGames.length === 0) {
    nextFeaturedEl.innerHTML = `<p class="empty-message">${API_EMPTY_MESSAGE}</p>`;
  } else {
    nextFeaturedEl.innerHTML = createNextGameCard(
      nextGames[0],
      "game-card--featured"
    );
  }

  const recentGames = pastGames.slice(0, 2);

  if (recentGames.length === 0) {
    recentPastEl.innerHTML = `<p class="empty-message">${API_EMPTY_MESSAGE}</p>`;
    return;
  }

  recentPastEl.innerHTML = recentGames
    .map((game) => createPastGameCard(game, "game-card--compact"))
    .join("");
}

function clearPageContent(pageType) {
  if (pageType === "summary") {
    const nextFeaturedEl = document.getElementById("next-game-featured");
    const recentPastEl = document.getElementById("recent-past-games");
    if (nextFeaturedEl) {
      nextFeaturedEl.innerHTML = "";
    }
    if (recentPastEl) {
      recentPastEl.innerHTML = "";
    }
    return;
  }

  if (pageType === "past-all") {
    const pastListEl = document.getElementById("past-games-list");
    if (pastListEl) {
      pastListEl.innerHTML = "";
    }
    return;
  }

  if (pageType === "upcoming-all") {
    const upcomingListEl = document.getElementById("upcoming-games-list");
    if (upcomingListEl) {
      upcomingListEl.innerHTML = "";
    }
  }
}

async function loadScheduleFromApi() {
  const pageType = getSchedulePageType();
  const statusEl = document.getElementById("schedule-status");

  if (!pageType || !statusEl) {
    return;
  }

  showScheduleLoading(statusEl);
  clearPageContent(pageType);

  try {
    const response = await fetch(GAME_API_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();

    if (!json.success || !json.data) {
      throw new Error("API 응답 형식 오류");
    }

    const pastGames = sortPastGames(json.data.past_game || []);
    const nextGames = sortNextGames(json.data.next_game || []);

    if (!hasScheduleData(pageType, pastGames, nextGames)) {
      showScheduleEmpty(statusEl);
      clearPageContent(pageType);
      return;
    }

    if (pageType === "summary") {
      renderSummaryPage(pastGames, nextGames);
    } else if (pageType === "past-all") {
      renderGameList(
        document.getElementById("past-games-list"),
        pastGames,
        (game) => createPastGameCard(game)
      );
    } else if (pageType === "upcoming-all") {
      renderGameList(
        document.getElementById("upcoming-games-list"),
        nextGames,
        (game) => createNextGameCard(game)
      );
    }

    hideScheduleStatus(statusEl);
  } catch {
    showScheduleError(statusEl);
    clearPageContent(pageType);
  }
}

// 일정 관련 페이지에서만 API 호출
if (getSchedulePageType()) {
  loadScheduleFromApi();
}

// --- rank.html 전용: 2026시즌 순위 ---

const RANK_API_URL = "https://api.dragons.co.kr/game/rank?year=2026";
const RANK_LOADING_MESSAGE = "순위 데이터를 불러오는 중...";

function isRankPage() {
  return document.getElementById("rank-list") !== null;
}

// API 응답에 같은 팀이 중복될 수 있어 team_id 기준으로 1개만 남김
function dedupeRankList(rankList) {
  const teamMap = new Map();

  rankList.forEach((team) => {
    const key = team.team_id || team.team_name;
    if (!teamMap.has(key)) {
      teamMap.set(key, team);
    }
  });

  return [...teamMap.values()].sort((a, b) => Number(a.rank) - Number(b.rank));
}

function isJeonnamTeam(team) {
  const teamName = team.team_name || "";
  return teamName === "전남" || teamName.includes("전남");
}

function formatGapCount(gapCount) {
  const value = Number(gapCount);
  if (Number.isNaN(value)) {
    return "-";
  }
  if (value > 0) {
    return `+${value}`;
  }
  return String(value);
}

function getRankValue(team, fieldName, fallback = "-") {
  const value = team[fieldName];
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return value;
}

// 순위표 한 줄(tr) 생성
function createRankRow(team) {
  const rowClass = isJeonnamTeam(team) ? "rank-row--jeonnam" : "";

  return `
    <tr class="rank-row ${rowClass}">
      <td class="col-num">${getRankValue(team, "rank")}</td>
      <td class="col-team">${getRankValue(team, "team_name")}</td>
      <td class="col-num">${getRankValue(team, "gain_point")}</td>
      <td class="col-num">${getRankValue(team, "game_count")}</td>
      <td class="col-num">${getRankValue(team, "win_cnt")}</td>
      <td class="col-num">${getRankValue(team, "tie_cnt")}</td>
      <td class="col-num">${getRankValue(team, "loss_cnt")}</td>
      <td class="col-num">${getRankValue(team, "gain_goal")}</td>
      <td class="col-num">${getRankValue(team, "loss_goal")}</td>
      <td class="col-num">${formatGapCount(team.gap_cnt)}</td>
    </tr>
  `;
}

function renderRankList(rankList) {
  const rankListEl = document.getElementById("rank-list");
  if (!rankListEl) {
    return;
  }

  if (!rankList || rankList.length === 0) {
    rankListEl.innerHTML = "";
    return;
  }

  rankListEl.innerHTML = rankList.map((team) => createRankRow(team)).join("");
}

function showRankLoading(statusEl) {
  setApiStatus(statusEl, "loading", RANK_LOADING_MESSAGE);
}

function hideRankStatus(statusEl) {
  setApiStatus(statusEl, "hidden", "");
}

function showRankError(statusEl) {
  setApiStatus(statusEl, "error", API_ERROR_MESSAGE);
}

function showRankEmpty(statusEl) {
  setApiStatus(statusEl, "empty", API_EMPTY_MESSAGE);
}

async function loadRankFromApi() {
  const statusEl = document.getElementById("rank-status");
  const rankListEl = document.getElementById("rank-list");

  if (!statusEl || !rankListEl) {
    return;
  }

  showRankLoading(statusEl);
  rankListEl.innerHTML = "";

  try {
    const response = await fetch(RANK_API_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();

    if (!json.success || !json.data) {
      throw new Error("API 응답 형식 오류");
    }

    const allRank = json.data.all_rank || [];
    const uniqueRankList = dedupeRankList(allRank);

    if (uniqueRankList.length === 0) {
      showRankEmpty(statusEl);
      rankListEl.innerHTML = "";
      return;
    }

    renderRankList(uniqueRankList);
    hideRankStatus(statusEl);
  } catch {
    showRankError(statusEl);
    rankListEl.innerHTML = "";
  }
}

// rank.html에서만 순위 API 호출
if (isRankPage()) {
  loadRankFromApi();
}

// --- gallery.html 전용: 사진첩 ---

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
// images/gallery 폴더에 사진을 넣고 아래 배열만 수정하세요.
const GALLERY_PHOTOS = [
  {
    src: "./images/gallery/photo1.jpg",
    title: "경기 스냅 1",
  },
  {
    src: "./images/gallery/photo2.jpg",
    title: "경기 스냅 2",
  },
  {
    src: "./images/gallery/photo3.jpg",
    title: "응원 현장",
  },
  {
    src: "./images/gallery/photo4.jpg",
    title: "팀 사진",
  },
];

function isGalleryPage() {
  return document.getElementById("gallery-grid") !== null;
}

function createGalleryCard(photo, index) {
  return `
    <button type="button" class="gallery-card" data-index="${index}">
      <div class="gallery-image-wrap">
        <img
          class="gallery-image"
          src="${photo.src}"
          alt="${escapeHtml(photo.title)}"
          loading="lazy"
        />
        <span class="gallery-fallback">이미지 준비 중</span>
      </div>
      <p class="gallery-card-title">${escapeHtml(photo.title)}</p>
    </button>
  `;
}

function bindGalleryImageFallbacks() {
  document.querySelectorAll(".gallery-image").forEach((imageEl) => {
    if (imageEl.complete && imageEl.naturalWidth === 0) {
      imageEl.classList.add("is-error");
      return;
    }

    imageEl.addEventListener("error", () => {
      imageEl.classList.add("is-error");
    });
  });
}

function openGalleryModal(photo) {
  const modalEl = document.getElementById("gallery-modal");
  const imageEl = document.getElementById("gallery-modal-image");
  const titleEl = document.getElementById("gallery-modal-title");

  if (!modalEl || !imageEl || !titleEl) {
    return;
  }

  imageEl.src = photo.src;
  imageEl.alt = photo.title;
  titleEl.textContent = photo.title;
  modalEl.classList.remove("is-hidden");
  modalEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("gallery-modal-open");
}

function closeGalleryModal() {
  const modalEl = document.getElementById("gallery-modal");
  const imageEl = document.getElementById("gallery-modal-image");

  if (!modalEl) {
    return;
  }

  modalEl.classList.add("is-hidden");
  modalEl.setAttribute("aria-hidden", "true");
  document.body.classList.remove("gallery-modal-open");

  if (imageEl) {
    imageEl.src = "";
  }
}

function renderGallery() {
  const gridEl = document.getElementById("gallery-grid");
  if (!gridEl) {
    return;
  }

  if (GALLERY_PHOTOS.length === 0) {
    gridEl.innerHTML = '<p class="empty-message">등록된 사진이 없습니다.</p>';
    return;
  }

  gridEl.innerHTML = GALLERY_PHOTOS.map((photo, index) =>
    createGalleryCard(photo, index)
  ).join("");

  bindGalleryImageFallbacks();
}

function initGalleryPage() {
  const gridEl = document.getElementById("gallery-grid");
  const modalEl = document.getElementById("gallery-modal");

  if (!gridEl || !modalEl) {
    return;
  }

  renderGallery();

  gridEl.addEventListener("click", (event) => {
    const cardBtn = event.target.closest(".gallery-card");
    if (!cardBtn) {
      return;
    }

    const index = Number(cardBtn.dataset.index);
    const photo = GALLERY_PHOTOS[index];
    if (photo) {
      openGalleryModal(photo);
    }
  });

  modalEl.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-modal='true']")) {
      closeGalleryModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modalEl.classList.contains("is-hidden")) {
      closeGalleryModal();
    }
  });
}

if (isGalleryPage()) {
  initGalleryPage();
}
