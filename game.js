/* ==========================================================================
   game.js — "Catch My Hug ❤️" relaxing mini game
   Hearts drift down, she guides a little basket to catch them. No timer,
   no enemies, no losing state — it just loops gently, forever.
   ========================================================================== */

const Game = (() => {
  const BEST_SCORE_KEY = "catchMyHug.bestScore";

  const MILESTONES = [
    { count: 10, icon: "❤️", lines: ["You're doing great.", "Keep going."] },
    { count: 20, icon: "🤍", lines: ["Virtual Hug Unlocked", "I'm always here for you."] },
    { count: 30, icon: "🌸", lines: ["I'm so proud of you."] },
    { count: 40, icon: "☀️", lines: ["Take a deep breath.", "Everything will be okay."] },
    { count: 50, icon: "💖", lines: ["You deserve all the love", "in the world."] }
  ];

  let els = {};
  let ready = false;

  let score = 0;
  let best = 0;
  let shownMilestones = new Set();

  let hearts = []; // { el, x (percent), y (px), speed, swayAmp, swaySpeed, swayPhase, w }
  let heartSeq = 0;

  let basketX = 50; // percent across the stage
  let basketDragging = false;

  let movingLeft = false;
  let movingRight = false;

  let rafId = null;
  let spawnHandle = null;

  let running = false;
  let paused = false;

  function cacheEls() {
    els = {
      stage: document.getElementById("game-stage"),
      basket: document.getElementById("game-basket"),
      scoreEl: document.getElementById("game-score"),
      bestEl: document.getElementById("game-best"),
      popup: document.getElementById("game-popup"),
      popupIcon: document.getElementById("game-popup-icon"),
      popupText: document.getElementById("game-popup-text"),
      popupClose: document.getElementById("game-popup-close")
    };
  }

  function loadBest() {
    try {
      const stored = localStorage.getItem(BEST_SCORE_KEY);
      best = stored ? parseInt(stored, 10) || 0 : 0;
    } catch (err) {
      best = 0;
    }
  }

  function saveBest() {
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(best));
    } catch (err) {
      /* ignore storage errors (e.g. private browsing) */
    }
  }

  function init() {
    cacheEls();
    if (!els.stage || !els.basket) return;
    loadBest();
    els.bestEl.textContent = best;
    wireControls();
    ready = true;
  }

  function wireControls() {
    document.addEventListener("keydown", (e) => {
      if (!running || paused) return;
      if (e.key === "ArrowLeft") movingLeft = true;
      if (e.key === "ArrowRight") movingRight = true;
    });
    document.addEventListener("keyup", (e) => {
      if (e.key === "ArrowLeft") movingLeft = false;
      if (e.key === "ArrowRight") movingRight = false;
    });

    const moveBasketToClientX = (clientX) => {
      const rect = els.stage.getBoundingClientRect();
      if (!rect.width) return;
      const pct = ((clientX - rect.left) / rect.width) * 100;
      basketX = clamp(pct, 0, 100);
      renderBasket();
    };

    els.stage.addEventListener("pointerdown", (e) => {
      if (!running || paused) return;
      basketDragging = true;
      moveBasketToClientX(e.clientX);
    });
    window.addEventListener("pointermove", (e) => {
      if (!basketDragging || !running || paused) return;
      moveBasketToClientX(e.clientX);
    });
    window.addEventListener("pointerup", () => {
      basketDragging = false;
    });
    window.addEventListener("pointercancel", () => {
      basketDragging = false;
    });

    els.popupClose.addEventListener("click", closePopup);
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function start() {
    if (!ready) init();
    if (!els.stage) return;

    // Fresh session each time she opens the game — score resets,
    // best score keeps its memory.
    score = 0;
    shownMilestones = new Set();
    basketX = 50;
    clearHearts();
    els.scoreEl.textContent = "0";
    els.bestEl.textContent = best;
    renderBasket();
    hidePopup(true);

    running = true;
    paused = false;
    scheduleSpawn();
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    paused = false;
    movingLeft = false;
    movingRight = false;
    basketDragging = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (spawnHandle) clearTimeout(spawnHandle);
    rafId = null;
    spawnHandle = null;
    clearHearts();
    hidePopup(true);
  }

  function clearHearts() {
    hearts.forEach((h) => h.el.remove());
    hearts = [];
  }

  const MAX_HEARTS = 5;

  function scheduleSpawn() {
    if (!running) return;
    const delay = 700 + Math.random() * 600; // slow, gentle pacing
    spawnHandle = setTimeout(() => {
      if (hearts.length < MAX_HEARTS) {
        spawnHeart();
      }
      scheduleSpawn();
    }, delay);
  }

  function spawnHeart() {
    if (!els.stage) return;
    const el = document.createElement("img");
    el.className = "game-heart";
    el.src = "assets/hug-heart.png";
    el.alt = "";
    const width = 42 + Math.random() * 20;
    el.style.width = width + "px";
    els.stage.appendChild(el);

    heartSeq += 1;
    hearts.push({
      id: heartSeq,
      el,
      x: 8 + Math.random() * 84, // percent, keep away from hard edges
      y: -40,
      speed: 0.9 + Math.random() * 0.5, // px per frame, gentle
      swayAmp: 10 + Math.random() * 12,
      swaySpeed: 0.6 + Math.random() * 0.6,
      swayPhase: Math.random() * Math.PI * 2,
      collected: false
    });
  }

  function renderBasket() {
    els.basket.style.left = basketX + "%";
  }

  function loop(timestamp) {
    if (!running || paused) return;

    if (movingLeft) basketX = clamp(basketX - 0.9, 0, 100);
    if (movingRight) basketX = clamp(basketX + 0.9, 0, 100);
    if (movingLeft || movingRight) renderBasket();

    const stageRect = els.stage.getBoundingClientRect();
    const stageHeight = stageRect.height;
    const basketRect = els.basket.getBoundingClientRect();
    const basketTopPct = ((basketRect.top - stageRect.top) / stageHeight) * 100;
    const basketHalfWidthPct = (basketRect.width / stageRect.width) * 100 / 2;

    const t = timestamp / 1000;

    for (let i = hearts.length - 1; i >= 0; i--) {
      const h = hearts[i];
      if (h.collected) continue;

      h.y += h.speed;
      const sway = Math.sin(t * h.swaySpeed + h.swayPhase) * h.swayAmp;
      const xPct = h.x + (sway / stageRect.width) * 100;

      h.el.style.top = h.y + "px";
      h.el.style.left = xPct + "%";

      const yPct = (h.y / stageHeight) * 100;

      // Gentle catch check: heart near the basket's row and horizontally aligned.
      if (yPct >= basketTopPct - 6 && yPct <= basketTopPct + 14) {
        if (Math.abs(xPct - basketX) <= basketHalfWidthPct + 6) {
          collectHeart(h);
          continue;
        }
      }

      // Missed hearts just drift softly out of view — no penalty, ever.
      if (h.y > stageHeight + 40) {
        h.el.remove();
        hearts.splice(i, 1);
      }
    }

    if (paused) return;
    rafId = requestAnimationFrame(loop);
  }

  function collectHeart(heart) {
    heart.collected = true;
    heart.el.classList.add("game-heart--pop");
    spawnSparkle(heart.el);

    setTimeout(() => {
      heart.el.remove();
      hearts = hearts.filter((h) => h.id !== heart.id);
    }, 380);

    score += 1;
    els.scoreEl.textContent = score;

    if (score > best) {
      best = score;
      els.bestEl.textContent = best;
      saveBest();
    }

    checkMilestone();
  }

  function spawnSparkle(nearEl) {
    const sparkle = document.createElement("span");
    sparkle.className = "game-sparkle";
    sparkle.textContent = "✨";
    sparkle.style.left = nearEl.style.left;
    sparkle.style.top = nearEl.style.top;
    els.stage.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 600);
  }

  function checkMilestone() {
    const milestone = MILESTONES.find((m) => m.count === score);
    if (!milestone || shownMilestones.has(milestone.count)) return;
    shownMilestones.add(milestone.count);
    showPopup(milestone);
  }

  function showPopup(milestone) {
    // Pause the game gently while she reads the message.
    paused = true;
    movingLeft = false;
    movingRight = false;
    basketDragging = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (spawnHandle) clearTimeout(spawnHandle);
    rafId = null;
    spawnHandle = null;

    els.popupIcon.textContent = milestone.icon;
    els.popupText.textContent = milestone.lines.join("\n");
    els.popup.classList.add("is-visible");
  }

  function closePopup() {
    hidePopup(false);
    if (!running || !paused) return;
    paused = false;
    scheduleSpawn();
    rafId = requestAnimationFrame(loop);
  }

  function hidePopup(instant) {
    if (!els.popup) return;
    els.popup.classList.remove("is-visible");
    if (instant) {
      els.popupText.textContent = "";
    }
  }

  return { init, start, stop };
})();
