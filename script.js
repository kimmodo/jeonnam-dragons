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

// --- board.html 전용: Firestore 자유게시판 ---

// 관리자 Google uid를 아래 배열에 추가하세요.
const ADMIN_UIDS = [
  // "p9iiBJc9Ead01yBj7goTR9vZ2yG2",
];

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCLVU8ZDaGSdmOTqqANqYH9_O4PCbgnoFY",
  authDomain: "jeonnam-fan.firebaseapp.com",
  projectId: "jeonnam-fan",
  storageBucket: "jeonnam-fan.firebasestorage.app",
  messagingSenderId: "979341015240",
  appId: "1:979341015240:web:480102edee3952462f0dfd",
};

const BOARD_POSTS_COLLECTION = "posts";
const BOARD_USERS_COLLECTION = "users";
const BOARD_PAGE_SIZE = 5;
const BOARD_COMMENTS_LIMIT = 10;
const BOARD_COMMENT_LOAD_ERROR_MESSAGE =
  "댓글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
const BOARD_COMMENT_EMPTY_MESSAGE = "첫 댓글을 남겨보세요.";
const BOARD_COMMENT_VALIDATION_MESSAGE = "댓글 내용을 입력해주세요.";
const BOARD_LOGIN_REQUIRED_MESSAGE =
  "Google 로그인 후 이용할 수 있습니다.";
const BOARD_NICKNAME_SAVE_SUCCESS_MESSAGE = "닉네임이 저장되었습니다.";
const BOARD_NICKNAME_SAVE_ERROR_MESSAGE =
  "닉네임 저장에 실패했습니다. 잠시 후 다시 시도해주세요.";
const BOARD_NICKNAME_VALIDATION_MESSAGE = "닉네임을 입력해주세요.";
const BOARD_GOOGLE_LOGIN_ERROR_MESSAGE =
  "Google 로그인에 실패했습니다. 다시 시도해주세요.";
const BOARD_COMMENT_SAVE_ERROR_MESSAGE =
  "댓글 등록에 실패했습니다. 잠시 후 다시 시도해주세요.";
const BOARD_COMMENT_DELETE_ERROR_MESSAGE =
  "댓글 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.";

let boardNoticePostsCache = [];
let boardRegularPostsCache = [];
let boardCurrentPage = 1;
let boardAuthUser = null;
let boardUserProfile = null;
const BOARD_LOADING_MESSAGE = "게시글을 불러오는 중...";
const BOARD_LOAD_ERROR_MESSAGE =
  "게시글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
const BOARD_EMPTY_MESSAGE = "아직 등록된 글이 없습니다.";
const BOARD_SAVING_MESSAGE = "게시글을 등록하는 중...";
const BOARD_SAVE_SUCCESS_MESSAGE = "등록되었습니다.";
const BOARD_SAVE_ERROR_MESSAGE =
  "등록에 실패했습니다. 잠시 후 다시 시도해주세요.";
const BOARD_VALIDATION_MESSAGE = "제목과 내용을 모두 입력해주세요.";
const BOARD_UPDATING_MESSAGE = "수정하는 중...";
const BOARD_UPDATE_SUCCESS_MESSAGE = "수정되었습니다.";
const BOARD_UPDATE_ERROR_MESSAGE =
  "수정에 실패했습니다. 잠시 후 다시 시도해주세요.";
const BOARD_DELETING_MESSAGE = "삭제하는 중...";
const BOARD_DELETE_SUCCESS_MESSAGE = "삭제되었습니다.";
const BOARD_DELETE_ERROR_MESSAGE =
  "삭제에 실패했습니다. 잠시 후 다시 시도해주세요.";
const BOARD_EDIT_VALIDATION_MESSAGE = "제목과 내용을 모두 입력해주세요.";

function isBoardPage() {
  return document.getElementById("board-form") !== null;
}

function isBoardAdmin(uid) {
  return Boolean(uid && ADMIN_UIDS.includes(uid));
}

function getBoardDisplayAuthor(item) {
  return item.authorNickname || item.author || "익명";
}

function getBoardNickname() {
  const nickname = boardUserProfile?.nickname;
  return typeof nickname === "string" ? nickname.trim() : "";
}

function updateBoardAuthUi() {
  const guestEl = document.getElementById("board-auth-guest");
  const userEl = document.getElementById("board-auth-user");
  const writeSectionEl = document.getElementById("board-write-section");
  const nicknameEl = document.getElementById("board-current-nickname");
  const nicknameInputEl = document.getElementById("board-nickname-input");
  const isLoggedIn = Boolean(boardAuthUser);

  if (guestEl) {
    guestEl.classList.toggle("is-hidden", isLoggedIn);
  }

  if (userEl) {
    userEl.classList.toggle("is-hidden", !isLoggedIn);
  }

  if (writeSectionEl) {
    writeSectionEl.classList.toggle("is-hidden", !isLoggedIn);
  }

  if (isLoggedIn && nicknameEl) {
    nicknameEl.textContent = getBoardNickname() || "-";
  }

  if (isLoggedIn && nicknameInputEl) {
    nicknameInputEl.value = getBoardNickname();
  }
}

function setBoardNicknameStatus(message, visible) {
  const statusEl = document.getElementById("board-nickname-status");
  if (!statusEl) {
    return;
  }

  statusEl.textContent = message || "";
  statusEl.classList.toggle("is-hidden", !visible);
}

const BOARD_DEFAULT_NICKNAME = "전남팬";

function buildBoardUserFields(user, nickname) {
  const trimmedNickname =
    typeof nickname === "string" ? nickname.trim() : "";
  const defaultNickname =
    (user.displayName || "").trim() || BOARD_DEFAULT_NICKNAME;

  return {
    nickname: trimmedNickname || defaultNickname,
    email: user.email ?? null,
    photoURL: user.photoURL ?? null,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
}

async function fetchUserProfile(db, uid) {
  const snapshot = await db.collection(BOARD_USERS_COLLECTION).doc(uid).get();
  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data();
}

async function saveUserProfile(db, user, nickname) {
  const userRef = db.collection(BOARD_USERS_COLLECTION).doc(user.uid);
  const snapshot = await userRef.get();
  const profileData = buildBoardUserFields(user, nickname);

  if (!snapshot.exists) {
    profileData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
  }

  await userRef.set(profileData, { merge: true });
}

async function ensureUserProfile(db, user) {
  await saveUserProfile(db, user);
  return fetchUserProfile(db, user.uid);
}

async function updateUserNickname(db, user, nickname) {
  await saveUserProfile(db, user, nickname);
}

async function signInWithGoogle(auth) {
  const provider = new firebase.auth.GoogleAuthProvider();
  await auth.signInWithPopup(provider);
}

async function signOutFromBoard(auth) {
  await auth.signOut();
}

function updateBoardAdminUi(currentUid) {
  const noticeFieldEl = document.getElementById("board-notice-field");
  const noticeCheckboxEl = document.getElementById("board-is-notice");

  if (!noticeFieldEl) {
    return;
  }

  if (isBoardAdmin(currentUid)) {
    noticeFieldEl.classList.remove("is-hidden");
    return;
  }

  noticeFieldEl.classList.add("is-hidden");
  if (noticeCheckboxEl) {
    noticeCheckboxEl.checked = false;
  }
}

function setBoardStatus(statusEl, state, message) {
  if (!statusEl) {
    return;
  }

  statusEl.textContent = message || "";
  statusEl.className = `board-status is-${state}`;
}

function formatBoardDate(value) {
  if (!value) {
    return "-";
  }

  const date =
    typeof value.toDate === "function" ? value.toDate() : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createBoardPostCard(
  postId,
  post,
  currentUid,
  isAdminUser,
  isLoggedIn
) {
  const isOwner = Boolean(
    isLoggedIn && post.uid && post.uid === currentUid
  );
  const isNotice = isBoardNoticePost(post);
  const canEdit = isOwner;
  const canDelete = isOwner || isAdminUser;
  const noticeClass = isNotice ? " board-post-card--notice" : "";
  const noticeBadge = isNotice
    ? '<span class="board-notice-badge">📌 공지</span>'
    : "";

  let actionButtons = "";
  if (canEdit && canDelete) {
    actionButtons = `
      <button type="button" class="board-action-btn" data-action="edit" data-id="${postId}">수정</button>
      <button type="button" class="board-action-btn board-action-btn--danger" data-action="delete" data-id="${postId}">삭제</button>
    `;
  } else if (canDelete) {
    actionButtons = `
      <button type="button" class="board-action-btn board-action-btn--danger" data-action="delete" data-id="${postId}">삭제</button>
    `;
  }

  const postActions = actionButtons
    ? `<div class="board-post-actions">${actionButtons}</div>`
    : "";
  const editForm = isOwner
    ? `
      <form class="board-edit-form is-hidden" data-id="${postId}">
        <div class="board-field">
          <label class="board-label" for="edit-title-${postId}">제목</label>
          <input
            id="edit-title-${postId}"
            class="board-input board-edit-title"
            type="text"
            maxlength="80"
            value="${escapeHtml(post.title || "")}"
          />
        </div>
        <div class="board-field">
          <label class="board-label" for="edit-content-${postId}">내용</label>
          <textarea
            id="edit-content-${postId}"
            class="board-textarea board-edit-content"
            rows="4"
            maxlength="2000"
          >${escapeHtml(post.content || "")}</textarea>
        </div>
        <div class="board-post-actions">
          <button type="submit" class="board-action-btn">저장</button>
          <button type="button" class="board-action-btn" data-action="cancel-edit" data-id="${postId}">취소</button>
        </div>
      </form>
    `
    : "";

  return `
    <article class="board-post-card${noticeClass}" data-post-id="${postId}">
      <div class="board-post-view">
        ${noticeBadge}
        <h3 class="board-post-title">${escapeHtml(post.title || "")}</h3>
        <p class="board-post-meta">
          ${escapeHtml(getBoardDisplayAuthor(post))} · ${formatBoardDate(post.createdAt)}
        </p>
        <p class="board-post-content">${escapeHtml(post.content || "")}</p>
        ${postActions}
      </div>
      ${editForm}
      <p class="board-post-status is-hidden" role="status" aria-live="polite"></p>
      <section class="board-comments">
        <button
          type="button"
          class="board-comments-toggle"
          data-action="toggle-comments"
          data-id="${postId}"
        >
          댓글 보기
        </button>
        <div class="board-comments-panel is-hidden">
          <p
            class="board-comments-status is-hidden"
            role="status"
            aria-live="polite"
          ></p>
          <ul class="board-comments-list"></ul>
          ${
            isLoggedIn
              ? `
          <form class="board-comment-form">
            <textarea
              class="board-comment-textarea"
              name="content"
              rows="2"
              maxlength="500"
              placeholder="댓글을 입력하세요"
            ></textarea>
            <button type="submit" class="board-comment-submit">댓글 등록</button>
          </form>
          `
              : `<p class="board-comment-login-hint">${BOARD_LOGIN_REQUIRED_MESSAGE}</p>`
          }
        </div>
      </section>
    </article>
  `;
}

function getBoardFormValues(formEl, isAdminUser) {
  const title = formEl.elements.title.value.trim();
  const content = formEl.elements.content.value.trim();
  const isNotice =
    isAdminUser && formEl.elements.isNotice
      ? formEl.elements.isNotice.checked
      : false;

  return { title, content, isNotice };
}

function isBoardFormValid(values) {
  return values.title !== "" && values.content !== "";
}

function setBoardPostStatus(cardEl, message, visible) {
  const statusEl = cardEl.querySelector(".board-post-status");
  if (!statusEl) {
    return;
  }

  statusEl.textContent = message || "";
  statusEl.classList.toggle("is-hidden", !visible);
}

function getBoardPostCard(postId) {
  return document.querySelector(`.board-post-card[data-post-id="${postId}"]`);
}

function showBoardEditForm(cardEl) {
  const viewEl = cardEl.querySelector(".board-post-view");
  const editFormEl = cardEl.querySelector(".board-edit-form");

  if (!viewEl || !editFormEl) {
    return;
  }

  viewEl.classList.add("is-hidden");
  editFormEl.classList.remove("is-hidden");
  setBoardPostStatus(cardEl, "", false);
}

function hideBoardEditForm(cardEl) {
  const viewEl = cardEl.querySelector(".board-post-view");
  const editFormEl = cardEl.querySelector(".board-edit-form");

  if (!viewEl || !editFormEl) {
    return;
  }

  viewEl.classList.remove("is-hidden");
  editFormEl.classList.add("is-hidden");
}

function getBoardEditValues(editFormEl) {
  const title = editFormEl.querySelector(".board-edit-title").value.trim();
  const content = editFormEl.querySelector(".board-edit-content").value.trim();

  return { title, content };
}

function setBoardCommentsStatus(cardEl, message, visible) {
  const statusEl = cardEl.querySelector(".board-comments-status");
  if (!statusEl) {
    return;
  }

  statusEl.textContent = message || "";
  statusEl.classList.toggle("is-hidden", !visible);
}

function getBoardCommentFormValues(formEl) {
  const content = formEl.elements.content.value.trim();

  return { content };
}

function createBoardCommentItem(
  postId,
  commentId,
  comment,
  currentUid,
  isAdminUser,
  isLoggedIn
) {
  const isOwner = Boolean(
    isLoggedIn && comment.uid && comment.uid === currentUid
  );
  const canDelete = isOwner || isAdminUser;
  const deleteBtn = canDelete
    ? `<button type="button" class="board-comment-delete" data-action="delete-comment" data-post-id="${postId}" data-comment-id="${commentId}">삭제</button>`
    : "";

  return `
    <li class="board-comment-item" data-comment-id="${commentId}">
      <p class="board-comment-meta">
        ${escapeHtml(getBoardDisplayAuthor(comment))} · ${formatBoardDate(comment.createdAt)}
      </p>
      <p class="board-comment-content">${escapeHtml(comment.content || "")}</p>
      ${deleteBtn}
    </li>
  `;
}

function renderBoardCommentsList(
  cardEl,
  comments,
  postId,
  currentUid,
  isAdminUser,
  isLoggedIn
) {
  const listEl = cardEl.querySelector(".board-comments-list");
  if (!listEl) {
    return;
  }

  if (!comments.length) {
    listEl.innerHTML = `<li class="board-comment-empty">${BOARD_COMMENT_EMPTY_MESSAGE}</li>`;
    return;
  }

  listEl.innerHTML = comments
    .map((item) =>
      createBoardCommentItem(
        postId,
        item.id,
        item.data,
        currentUid,
        isAdminUser,
        isLoggedIn
      )
    )
    .join("");
}

async function loadPostComments(
  db,
  postId,
  cardEl,
  currentUid,
  isAdminUser,
  isLoggedIn
) {
  const listEl = cardEl.querySelector(".board-comments-list");
  if (!listEl) {
    return;
  }

  setBoardCommentsStatus(cardEl, "댓글을 불러오는 중...", true);
  listEl.innerHTML = "";

  try {
    const snapshot = await db
      .collection(BOARD_POSTS_COLLECTION)
      .doc(postId)
      .collection("comments")
      .orderBy("createdAt", "asc")
      .limit(BOARD_COMMENTS_LIMIT)
      .get();

    const comments = snapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data(),
    }));

    renderBoardCommentsList(
      cardEl,
      comments,
      postId,
      currentUid,
      isAdminUser,
      isLoggedIn
    );
    setBoardCommentsStatus(cardEl, "", false);
    cardEl.dataset.commentsLoaded = "true";
  } catch (error) {
    console.error("[board] 댓글 불러오기 실패:", error);
    listEl.innerHTML = "";
    setBoardCommentsStatus(cardEl, BOARD_COMMENT_LOAD_ERROR_MESSAGE, true);
  }
}

async function saveBoardComment(db, postId, values, uid, authorNickname) {
  await db
    .collection(BOARD_POSTS_COLLECTION)
    .doc(postId)
    .collection("comments")
    .add({
      author: authorNickname,
      authorNickname,
      content: values.content,
      uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
}

async function deleteBoardComment(db, postId, commentId) {
  await db
    .collection(BOARD_POSTS_COLLECTION)
    .doc(postId)
    .collection("comments")
    .doc(commentId)
    .delete();
}

function isBoardNoticePost(post) {
  return post.isNotice === true;
}

function getBoardPostTime(post) {
  const value = post.createdAt;
  if (!value) {
    return 0;
  }

  if (typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  return new Date(value).getTime() || 0;
}

function sortBoardPostsByNewest(posts) {
  return [...posts].sort(
    (a, b) => getBoardPostTime(b.data) - getBoardPostTime(a.data)
  );
}

function splitBoardPosts(docs) {
  const noticePosts = [];
  const regularPosts = [];

  docs.forEach((doc) => {
    const item = { id: doc.id, data: doc.data() };
    if (isBoardNoticePost(doc.data())) {
      noticePosts.push(item);
    } else {
      regularPosts.push(item);
    }
  });

  return {
    noticePosts: sortBoardPostsByNewest(noticePosts),
    regularPosts: sortBoardPostsByNewest(regularPosts),
  };
}

async function fetchBoardPosts(db) {
  const snapshot = await db
    .collection(BOARD_POSTS_COLLECTION)
    .orderBy("createdAt", "desc")
    .get();

  return splitBoardPosts(snapshot.docs);
}

function getBoardTotalPages() {
  if (boardRegularPostsCache.length === 0) {
    return 0;
  }

  return Math.ceil(boardRegularPostsCache.length / BOARD_PAGE_SIZE);
}

function clampBoardPage(page) {
  const totalPages = getBoardTotalPages();
  if (totalPages === 0) {
    return 1;
  }

  return Math.min(Math.max(1, page), totalPages);
}

function renderBoardPagination() {
  const paginationEl = document.getElementById("board-pagination");
  if (!paginationEl) {
    return;
  }

  const totalPages = getBoardTotalPages();

  if (totalPages <= 1) {
    paginationEl.innerHTML = "";
    paginationEl.classList.add("is-hidden");
    return;
  }

  const currentPage = clampBoardPage(boardCurrentPage);
  let html = "";

  for (let page = 1; page <= totalPages; page += 1) {
    const activeClass = page === currentPage ? " is-active" : "";
    html += `<button type="button" class="board-page-btn${activeClass}" data-page="${page}">${page}</button>`;
  }

  if (currentPage < totalPages) {
    html += `<button type="button" class="board-page-btn board-page-btn--next" data-page="${currentPage + 1}">다음</button>`;
  }

  paginationEl.innerHTML = html;
  paginationEl.classList.remove("is-hidden");
}

function renderBoardPostsPage(currentUid, isAdminUser, isLoggedIn) {
  const listEl = document.getElementById("board-posts-list");
  const statusEl = document.getElementById("board-list-status");
  const paginationEl = document.getElementById("board-pagination");

  if (!listEl || !statusEl) {
    return;
  }

  const hasNotices = boardNoticePostsCache.length > 0;
  const hasRegular = boardRegularPostsCache.length > 0;

  if (!hasNotices && !hasRegular) {
    listEl.innerHTML = "";
    if (paginationEl) {
      paginationEl.innerHTML = "";
      paginationEl.classList.add("is-hidden");
    }
    setBoardStatus(statusEl, "empty", BOARD_EMPTY_MESSAGE);
    return;
  }

  boardCurrentPage = clampBoardPage(boardCurrentPage);
  const startIndex = (boardCurrentPage - 1) * BOARD_PAGE_SIZE;
  const pageRegularPosts = boardRegularPostsCache.slice(
    startIndex,
    startIndex + BOARD_PAGE_SIZE
  );

  const noticeHtml = hasNotices
    ? `<div class="board-notices-group" aria-label="공지글">${boardNoticePostsCache
        .map((post) =>
          createBoardPostCard(
            post.id,
            post.data,
            currentUid,
            isAdminUser,
            isLoggedIn
          )
        )
        .join("")}</div>`
    : "";
  const regularHtml = pageRegularPosts.length
    ? `<div class="board-regular-group">${pageRegularPosts
        .map((post) =>
          createBoardPostCard(
            post.id,
            post.data,
            currentUid,
            isAdminUser,
            isLoggedIn
          )
        )
        .join("")}</div>`
    : "";

  listEl.innerHTML = noticeHtml + regularHtml;
  renderBoardPagination();
  setBoardStatus(statusEl, "hidden", "");
}

async function loadBoardPosts(
  db,
  currentUid,
  isAdminUser,
  isLoggedIn,
  page = 1
) {
  const listEl = document.getElementById("board-posts-list");
  const statusEl = document.getElementById("board-list-status");
  const paginationEl = document.getElementById("board-pagination");

  if (!listEl || !statusEl) {
    return;
  }

  setBoardStatus(statusEl, "loading", BOARD_LOADING_MESSAGE);
  listEl.innerHTML = "";
  if (paginationEl) {
    paginationEl.innerHTML = "";
    paginationEl.classList.add("is-hidden");
  }

  try {
    const { noticePosts, regularPosts } = await fetchBoardPosts(db);
    boardNoticePostsCache = noticePosts;
    boardRegularPostsCache = regularPosts;
    boardCurrentPage = page;
    renderBoardPostsPage(currentUid, isAdminUser, isLoggedIn);
  } catch (error) {
    console.error("[board] 게시글 불러오기 실패:", error);
    boardNoticePostsCache = [];
    boardRegularPostsCache = [];
    setBoardStatus(statusEl, "error", BOARD_LOAD_ERROR_MESSAGE);
    listEl.innerHTML = "";
    if (paginationEl) {
      paginationEl.innerHTML = "";
      paginationEl.classList.add("is-hidden");
    }
  }
}

function bindBoardPagination(getBoardContext) {
  const paginationEl = document.getElementById("board-pagination");
  if (!paginationEl) {
    return;
  }

  paginationEl.addEventListener("click", (event) => {
    const pageBtn = event.target.closest("[data-page]");
    if (!pageBtn) {
      return;
    }

    const page = Number(pageBtn.dataset.page);
    if (!page || page === boardCurrentPage) {
      return;
    }

    const { currentUid, isAdminUser, isLoggedIn } = getBoardContext();
    boardCurrentPage = page;
    renderBoardPostsPage(currentUid, isAdminUser, isLoggedIn);

    const listEl = document.getElementById("board-posts-list");
    if (listEl) {
      listEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

async function saveBoardPost(db, values, uid, authorNickname) {
  await db.collection(BOARD_POSTS_COLLECTION).add({
    title: values.title,
    author: authorNickname,
    authorNickname,
    content: values.content,
    uid,
    isNotice: Boolean(values.isNotice),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function updateBoardPost(db, postId, values) {
  await db.collection(BOARD_POSTS_COLLECTION).doc(postId).update({
    title: values.title,
    content: values.content,
  });
}

async function deleteBoardPost(db, postId) {
  await db.collection(BOARD_POSTS_COLLECTION).doc(postId).delete();
}

function bindBoardPostActions(db, getBoardContext) {
  const listEl = document.getElementById("board-posts-list");
  if (!listEl) {
    return;
  }

  listEl.addEventListener("click", async (event) => {
    const { currentUid, isAdminUser, isLoggedIn } = getBoardContext();
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn) {
      return;
    }

    const action = actionBtn.dataset.action;

    if (action === "toggle-comments") {
      const postId = actionBtn.dataset.id;
      const cardEl = getBoardPostCard(postId);
      const panelEl = cardEl?.querySelector(".board-comments-panel");

      if (!cardEl || !panelEl) {
        return;
      }

      const isOpening = panelEl.classList.contains("is-hidden");

      if (isOpening) {
        panelEl.classList.remove("is-hidden");
        actionBtn.textContent = "댓글 숨기기";

        if (cardEl.dataset.commentsLoaded !== "true") {
          await loadPostComments(
            db,
            postId,
            cardEl,
            currentUid,
            isAdminUser,
            isLoggedIn
          );
        }
      } else {
        panelEl.classList.add("is-hidden");
        actionBtn.textContent = "댓글 보기";
      }

      return;
    }

    if (action === "delete-comment") {
      const postId = actionBtn.dataset.postId;
      const commentId = actionBtn.dataset.commentId;
      const cardEl = getBoardPostCard(postId);

      if (!cardEl || !commentId) {
        return;
      }

      const confirmed = window.confirm("이 댓글을 삭제할까요?");
      if (!confirmed) {
        return;
      }

      actionBtn.disabled = true;

      try {
        await deleteBoardComment(db, postId, commentId);
        await loadPostComments(
          db,
          postId,
          cardEl,
          currentUid,
          isAdminUser,
          isLoggedIn
        );
      } catch (error) {
        console.error("[board] 댓글 삭제 실패:", error);
        setBoardCommentsStatus(cardEl, BOARD_COMMENT_DELETE_ERROR_MESSAGE, true);
        actionBtn.disabled = false;
      }

      return;
    }

    const postId = actionBtn.dataset.id;
    const cardEl = getBoardPostCard(postId);

    if (!cardEl) {
      return;
    }

    if (action === "edit") {
      showBoardEditForm(cardEl);
      return;
    }

    if (action === "cancel-edit") {
      hideBoardEditForm(cardEl);
      setBoardPostStatus(cardEl, "", false);
      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm("이 글을 삭제할까요?");
      if (!confirmed) {
        return;
      }

      actionBtn.disabled = true;
      setBoardPostStatus(cardEl, BOARD_DELETING_MESSAGE, true);

      try {
        await deleteBoardPost(db, postId);
        setBoardPostStatus(cardEl, BOARD_DELETE_SUCCESS_MESSAGE, true);
        await loadBoardPosts(
          db,
          currentUid,
          isAdminUser,
          isLoggedIn,
          boardCurrentPage
        );
      } catch (error) {
        console.error("[board] 글 삭제 실패:", error);
        setBoardPostStatus(cardEl, BOARD_DELETE_ERROR_MESSAGE, true);
        actionBtn.disabled = false;
      }
    }
  });

  listEl.addEventListener("submit", async (event) => {
    const { currentUid, isAdminUser, isLoggedIn, nickname } = getBoardContext();
    const commentFormEl = event.target.closest(".board-comment-form");

    if (commentFormEl) {
      event.preventDefault();

      const cardEl = commentFormEl.closest(".board-post-card");
      const postId = cardEl?.dataset.postId;
      const submitBtn = commentFormEl.querySelector(".board-comment-submit");

      if (!cardEl || !postId || !currentUid || !isLoggedIn) {
        setBoardCommentsStatus(cardEl, BOARD_LOGIN_REQUIRED_MESSAGE, true);
        return;
      }

      const values = getBoardCommentFormValues(commentFormEl);

      if (!values.content) {
        setBoardCommentsStatus(cardEl, BOARD_COMMENT_VALIDATION_MESSAGE, true);
        return;
      }

      if (!nickname) {
        setBoardCommentsStatus(cardEl, BOARD_NICKNAME_VALIDATION_MESSAGE, true);
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
      }

      try {
        await saveBoardComment(db, postId, values, currentUid, nickname);
        commentFormEl.reset();
        await loadPostComments(
          db,
          postId,
          cardEl,
          currentUid,
          isAdminUser,
          isLoggedIn
        );
        setBoardCommentsStatus(cardEl, "댓글이 등록되었습니다.", true);
        setTimeout(() => setBoardCommentsStatus(cardEl, "", false), 2000);
      } catch (error) {
        console.error("[board] 댓글 등록 실패:", error);
        setBoardCommentsStatus(cardEl, BOARD_COMMENT_SAVE_ERROR_MESSAGE, true);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
        }
      }

      return;
    }

    const editFormEl = event.target.closest(".board-edit-form");
    if (!editFormEl) {
      return;
    }

    event.preventDefault();

    const postId = editFormEl.dataset.id;
    const cardEl = getBoardPostCard(postId);
    const values = getBoardEditValues(editFormEl);
    const saveBtn = editFormEl.querySelector('button[type="submit"]');

    if (!values.title || !values.content) {
      setBoardPostStatus(cardEl, BOARD_EDIT_VALIDATION_MESSAGE, true);
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
    }
    setBoardPostStatus(cardEl, BOARD_UPDATING_MESSAGE, true);

    try {
      await updateBoardPost(db, postId, values);
      setBoardPostStatus(cardEl, BOARD_UPDATE_SUCCESS_MESSAGE, true);
      await loadBoardPosts(
        db,
        currentUid,
        isAdminUser,
        isLoggedIn,
        boardCurrentPage
      );
    } catch (error) {
      console.error("[board] 글 수정 실패:", error);
      setBoardPostStatus(cardEl, BOARD_UPDATE_ERROR_MESSAGE, true);
      if (saveBtn) {
        saveBtn.disabled = false;
      }
    }
  });
}

function initBoardPage() {
  if (typeof firebase === "undefined") {
    const listStatusEl = document.getElementById("board-list-status");
    setBoardStatus(listStatusEl, "error", BOARD_LOAD_ERROR_MESSAGE);
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }

  const auth = firebase.auth();
  const db = firebase.firestore();
  const formEl = document.getElementById("board-form");
  const formStatusEl = document.getElementById("board-form-status");
  const listStatusEl = document.getElementById("board-list-status");
  const submitBtn = formEl.querySelector(".board-submit-btn");
  const googleLoginBtn = document.getElementById("board-google-login");
  const logoutBtn = document.getElementById("board-logout");
  const nicknameFormEl = document.getElementById("board-nickname-form");

  let currentUid = null;
  let isAdminUser = false;

  const getBoardContext = () => ({
    currentUid,
    isAdminUser,
    isLoggedIn: Boolean(currentUid),
    nickname: getBoardNickname(),
  });

  async function handleAuthStateChange(user) {
    boardAuthUser = user;

    if (user) {
      console.log("[board] 현재 Google uid:", user.uid);
      currentUid = user.uid;
      isAdminUser = isBoardAdmin(user.uid);

      try {
        boardUserProfile = await ensureUserProfile(db, user);
      } catch (error) {
        console.error("[board] 사용자 문서 생성/확인 실패:", error);
        boardUserProfile = null;
      }
    } else {
      currentUid = null;
      isAdminUser = false;
      boardUserProfile = null;
    }

    updateBoardAuthUi();
    updateBoardAdminUi(currentUid);
    renderBoardPostsPage(currentUid, isAdminUser, Boolean(currentUid));
  }

  bindBoardPostActions(db, getBoardContext);
  bindBoardPagination(getBoardContext);

  loadBoardPosts(db, null, false, false, 1);

  auth.onAuthStateChanged(handleAuthStateChange);

  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", async () => {
      try {
        await signInWithGoogle(auth);
      } catch (error) {
        console.error("[board] Google 로그인 실패:", error);
        setBoardStatus(listStatusEl, "error", BOARD_GOOGLE_LOGIN_ERROR_MESSAGE);
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOutFromBoard(auth);
      } catch (error) {
        console.error("[board] 로그아웃 실패:", error);
      }
    });
  }

  if (nicknameFormEl) {
    nicknameFormEl.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!currentUid) {
        setBoardNicknameStatus(BOARD_LOGIN_REQUIRED_MESSAGE, true);
        return;
      }

      const nicknameInputEl = document.getElementById("board-nickname-input");
      const nickname = nicknameInputEl?.value.trim() || "";

      if (!nickname) {
        setBoardNicknameStatus(BOARD_NICKNAME_VALIDATION_MESSAGE, true);
        return;
      }

      try {
        await updateUserNickname(db, boardAuthUser, nickname);
        boardUserProfile = await fetchUserProfile(db, currentUid);
        updateBoardAuthUi();
        setBoardNicknameStatus(BOARD_NICKNAME_SAVE_SUCCESS_MESSAGE, true);
        setTimeout(() => setBoardNicknameStatus("", false), 2000);
      } catch (error) {
        console.error("[board] 닉네임 저장 실패:", error);
        setBoardNicknameStatus(BOARD_NICKNAME_SAVE_ERROR_MESSAGE, true);
      }
    });
  }

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUid) {
      setBoardStatus(formStatusEl, "error", BOARD_LOGIN_REQUIRED_MESSAGE);
      return;
    }

    const values = getBoardFormValues(formEl, isAdminUser);
    const nickname = getBoardNickname();

    if (!isBoardFormValid(values)) {
      setBoardStatus(formStatusEl, "error", BOARD_VALIDATION_MESSAGE);
      return;
    }

    if (!nickname) {
      setBoardStatus(formStatusEl, "error", BOARD_NICKNAME_VALIDATION_MESSAGE);
      return;
    }

    submitBtn.disabled = true;
    setBoardStatus(formStatusEl, "saving", BOARD_SAVING_MESSAGE);

    try {
      await saveBoardPost(db, values, currentUid, nickname);
      setBoardStatus(formStatusEl, "success", BOARD_SAVE_SUCCESS_MESSAGE);
      formEl.reset();
      updateBoardAdminUi(currentUid);
      await loadBoardPosts(db, currentUid, isAdminUser, true, 1);
    } catch (error) {
      console.error("[board] 글 작성 실패:", error);
      setBoardStatus(formStatusEl, "error", BOARD_SAVE_ERROR_MESSAGE);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

if (isBoardPage()) {
  initBoardPage();
}
