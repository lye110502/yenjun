const API_URL = "https://script.google.com/macros/s/AKfycbzRosPYEijUUCZxaAmoAu9Z7DL43jhI55XnkC2rXI7eiKh9d6TlQyzeOTqnAP6IfzKwIA/exec";
const PASSWORD = "0418";
const ANNIVERSARY = "2024-04-18";

const $ = (id) => document.getElementById(id);
let currentLetter = null;

initApp();

function initApp() {
  setTodayInfo();
  setupTabs();
  setupPasswordEnter();
  registerServiceWorker();
}

function login() {
  if ($("password").value === PASSWORD) {
    $("login").classList.add("hidden");
    $("app").classList.remove("hidden");
    loadLetters();
  } else {
    $("loginStatus").textContent = "비밀번호가 달라요.";
  }
}

function setupPasswordEnter() {
  $("password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.tab;
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      $(`tab-${name}`).classList.add("active");
      if (name === "list") loadLetters();
    });
  });
}

function setTodayInfo() {
  const today = new Date();
  const day = today.toLocaleDateString("ko-KR", { weekday: "long" });
  const date = today.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  const start = new Date(`${ANNIVERSARY}T00:00:00+09:00`);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dDay = Math.floor((todayMidnight - start) / (1000 * 60 * 60 * 24)) + 1;
  $("todayInfo").innerHTML = `${date}<br>${day}<br>D+${dDay}`;
}

async function saveLetter() {
  const writer = $("writer").value.trim();
  const mood = $("mood").value.trim();
  const title = $("title").value.trim();
  const content = $("content").value.trim();

  if (!title || !content) {
    $("saveStatus").textContent = "제목이랑 내용을 둘 다 적어주세요.";
    return;
  }

  $("saveBtn").disabled = true;
  $("saveStatus").textContent = "저장 중...";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ writer, mood, title, content })
    });

    const data = await res.json();
    if (!data.ok) throw new Error(data.message || "저장 실패");

    $("title").value = "";
    $("content").value = "";
    $("mood").value = "";
    $("saveStatus").textContent = "저장 완료.";

    await loadLetters();
    document.querySelector('[data-tab="list"]').click();
  } catch (err) {
    $("saveStatus").textContent = "저장에 실패했어요. Apps Script 설정을 확인해주세요.";
  } finally {
    $("saveBtn").disabled = false;
  }
}

async function loadLetters() {
  const box = $("letters");
  const count = $("count");
  box.innerHTML = `<div class="empty">불러오는 중...</div>`;
  count.textContent = "";

  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    if (!data.ok) throw new Error(data.message || "불러오기 실패");

    const letters = data.letters || [];
    if (letters.length === 0) {
      box.innerHTML = `<div class="empty">아직 편지가 없어요.</div>`;
      return;
    }

    box.innerHTML = "";
    letters.reverse().forEach((letter) => {
      const item = document.createElement("div");
      item.className = "letter-item";
      item.innerHTML = `
        <div class="letter-main">
          <div class="letter-title">${escapeHtml(letter.title)}</div>
          <div class="letter-meta">
            ${escapeHtml(letter.writer)} · ${formatDate(letter.date)}
            ${letter.mood ? " · " + escapeHtml(letter.mood) : ""}
          </div>
        </div>
        <button class="delete-btn" type="button">삭제</button>
      `;

      item.querySelector(".letter-main").onclick = () => openLetter(letter);
      item.querySelector(".delete-btn").onclick = async (e) => {
        e.stopPropagation();
        await deleteLetter(letter);
      };

      box.appendChild(item);
    });

    count.textContent = `총 ${letters.length}개의 편지`;
  } catch (err) {
    box.innerHTML = `<div class="empty">편지를 불러오지 못했어요.</div>`;
  }
}

function openLetter(letter) {
  currentLetter = letter;
  $("modalTitle").textContent = letter.title;
  $("modalMeta").textContent = `${letter.writer} · ${formatDate(letter.date)}${letter.mood ? " · " + letter.mood : ""}`;
  $("modalBody").textContent = letter.content;

  $("modalDeleteBtn").onclick = async () => {
    await deleteLetter(currentLetter);
    $("letterDialog").close();
  };

  $("letterDialog").showModal();
}

async function deleteLetter(letter) {
  if (!letter || !letter.row) {
    alert("삭제 정보가 없어요. Apps Script 코드에 row가 포함되어야 해요.");
    return;
  }

  if (!confirm("이 편지를 삭제할까요?")) return;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "delete", row: letter.row })
    });

    const data = await res.json();
    if (!data.ok) throw new Error(data.message || "삭제 실패");
    await loadLetters();
  } catch (err) {
    alert("삭제에 실패했어요. Apps Script 설정을 확인해주세요.");
  }
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }
}
