/* ==========================================================================
   app.js — navigation + view orchestration
   ========================================================================== */

(() => {
  const VIEW_IDS = {
    home: "view-home",
    "mood-select": "view-mood-select",
    "mood-message": "view-mood-message",
    morning: "view-morning",
    night: "view-night",
    "emergency-breathe": "view-emergency-breathe",
    "emergency-comfort": "view-emergency-comfort",
    game: "view-game"
  };

  let activeViewKey = "home";

  function showView(key) {
    if (activeViewKey === "game" && key !== "game") {
      Game.stop();
    }

    Object.values(VIEW_IDS).forEach((id) => {
      document.getElementById(id).classList.remove("is-active");
    });
    document.getElementById(VIEW_IDS[key]).classList.add("is-active");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

    activeViewKey = key;

    if (key === "game") {
      Game.start();
    }
  }

  function navigate(key) {
    if (key === "emergency") {
      showView("emergency-breathe");
      startBreathingPause();
      return;
    }
    if (key === "morning") {
      showView("morning");
      showNextMorningMessage();
      return;
    }
    if (key === "night") {
      showView("night");
      showNextNightMessage();
      return;
    }
    showView(key);
  }

  /* ---------------- Home / global nav wiring ---------------- */

  function wireNav() {
    document.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", () => navigate(el.dataset.nav));
    });

    document.getElementById("hug-btn").addEventListener("click", () => {
      renderMoodList();
      navigate("mood-select");
    });
  }

  /* ---------------- Mood select ---------------- */

  function renderMoodList() {
    const list = document.getElementById("mood-list");
    list.innerHTML = "";
    MOODS.forEach((mood) => {
      const btn = document.createElement("button");
      btn.className = "mood-item";
     btn.innerHTML = `
  <img class="mood-item__avatar" src="${mood.image}" alt="${mood.name}">
  <span class="mood-item__text">
    <p class="mood-item__title">${mood.name}</p>
    <p class="mood-item__desc">${mood.desc}</p>
  </span>
  <span class="mood-item__chevron">›</span>
`;
      btn.addEventListener("click", () => openMood(mood.id));
      list.appendChild(btn);
    });
  }

  async function openMood(moodId) {
    const mood = await MoodEngine.loadMood(moodId);
    if (!mood) return;

    document.getElementById("mood-pill-emoji").src = mood.image;
    document.getElementById("mood-pill-name").textContent = mood.name;

    renderNextMoodMessage();
    showView("mood-message");
  }

  function renderNextMoodMessage() {
    const { lines, count, total } = MoodEngine.nextMessage();
    document.getElementById("mood-message-text").textContent = lines.join("\n");
    document.getElementById("mood-message-counter").textContent = `Message ${count} / ${total}`;
  }

  function wireMoodMessage() {
    document.getElementById("another-message-btn").addEventListener("click", renderNextMoodMessage);
  }

  /* ---------------- Good Morning ---------------- */

  let morningMessages = [];
  let morningLast = -1;

  async function loadMorningMessages() {
    if (morningMessages.length) return;
    try {
      const res = await fetch("data/morning.json");
      morningMessages = await res.json();
    } catch (err) {
      morningMessages = [["Good morning.", "You are loved."]];
    }
  }

  async function showNextMorningMessage() {
    await loadMorningMessages();
    let idx = morningLast;
    if (morningMessages.length > 1) {
      while (idx === morningLast) idx = Math.floor(Math.random() * morningMessages.length);
    } else {
      idx = 0;
    }
    morningLast = idx;
    document.getElementById("morning-message-text").textContent = morningMessages[idx].join("\n");
  }

  function wireMorning() {
    document.getElementById("another-morning-btn").addEventListener("click", showNextMorningMessage);
  }

  /* ---------------- Good Night ---------------- */

  let nightMessages = [];
  let nightLast = -1;

  async function loadNightMessages() {
    if (nightMessages.length) return;
    try {
      const res = await fetch("data/night.json");
      nightMessages = await res.json();
    } catch (err) {
      nightMessages = [["Good night.", "Rest well."]];
    }
  }

  async function showNextNightMessage() {
    await loadNightMessages();
    let idx = nightLast;
    if (nightMessages.length > 1) {
      while (idx === nightLast) idx = Math.floor(Math.random() * nightMessages.length);
    } else {
      idx = 0;
    }
    nightLast = idx;
    document.getElementById("night-message-text").textContent = nightMessages[idx].join("\n");
  }

  function wireNight() {
    document.getElementById("another-night-btn").addEventListener("click", showNextNightMessage);
  }

  function buildStars() {
    const layer = document.getElementById("stars-layer");
    const count = 40;
    for (let i = 0; i < count; i++) {
      const star = document.createElement("span");
      star.className = "star";
      const size = Math.random() * 2.4 + 1;
      star.style.width = size + "px";
      star.style.height = size + "px";
      star.style.top = Math.random() * 100 + "%";
      star.style.left = Math.random() * 100 + "%";
      star.style.opacity = (Math.random() * 0.6 + 0.3).toFixed(2);
      layer.appendChild(star);
    }
  }

  /* ---------------- Emergency ---------------- */

  let emergencyData = null;
  let comfortLast = -1;

  async function loadEmergencyData() {
    if (emergencyData) return emergencyData;
    try {
      const res = await fetch("data/emergency.json");
      emergencyData = await res.json();
    } catch (err) {
      emergencyData = {
        breathing: { title: "Take a deep breath.", lines: ["You are safe.", "I'm here with you."] },
        comfort: [["You are safe.", "Just breathe."]]
      };
    }
    return emergencyData;
  }

  async function startBreathingPause() {
    const data = await loadEmergencyData();

    const titleEl = document.querySelector("#view-emergency-breathe .title-serif");
    if (titleEl && data.breathing.title) titleEl.textContent = data.breathing.title;

    const lines = (data.breathing.lines || []).filter(Boolean);
    const mid = Math.ceil(lines.length / 2);
    const line1 = document.getElementById("breathe-line1");
    const line2 = document.getElementById("breathe-line2");
    if (line1 && lines.length) line1.innerHTML = lines.slice(0, mid).join("<br>");
    if (line2 && lines.length) line2.innerHTML = lines.slice(mid).join("<br>");

    const continueBtn = document.getElementById("breathe-continue-btn");
    continueBtn.disabled = true;

    // 2-second breathing pause before the person can continue.
    setTimeout(() => {
      continueBtn.disabled = false;
    }, 2000);

    continueBtn.onclick = () => {
      if (continueBtn.disabled) return;
      showNextComfortMessage();
      showView("emergency-comfort");
    };
  }

  async function showNextComfortMessage() {
    const data = await loadEmergencyData();
    const messages = data.comfort;
    let idx = comfortLast;
    if (messages.length > 1) {
      while (idx === comfortLast) idx = Math.floor(Math.random() * messages.length);
    } else {
      idx = 0;
    }
    comfortLast = idx;
    document.getElementById("comfort-message-text").textContent = messages[idx].join("\n");
  }

  function wireEmergency() {
    document.getElementById("another-comfort-btn").addEventListener("click", showNextComfortMessage);
  }

  /* ---------------- Home hero sparkles ---------------- */

  function buildHomeSparkles() {
    const layer = document.getElementById("home-sparkles");
    if (!layer) return;
    const glyphs = ["✦", "✧", "·"];
    const count = 22;
    for (let i = 0; i < count; i++) {
      const sparkle = document.createElement("span");
      sparkle.className = "home-sparkle";
      sparkle.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      sparkle.style.left = Math.random() * 94 + "%";
      sparkle.style.top = Math.random() * 96 + "%";
      const size = Math.random() * 12 + 12;
      sparkle.style.fontSize = size + "px";
      const duration = Math.random() * 3 + 2.5;
      sparkle.style.animationDuration = duration + "s";
      sparkle.style.animationDelay = (Math.random() * duration).toFixed(1) + "s";
      layer.appendChild(sparkle);
    }
  }

  /* ---------------- Init ---------------- */

  document.addEventListener("DOMContentLoaded", () => {
    wireNav();
    wireMoodMessage();
    wireMorning();
    wireNight();
    wireEmergency();
    buildStars();
    buildHomeSparkles();
    Game.init();
  });
})();
