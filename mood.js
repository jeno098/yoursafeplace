/* ==========================================================================
   mood.js — mood selection + random non-repeating message logic
   ========================================================================== */

const MOODS = [
  {
    id: "sad",
    image: "assets/sadjm.jpeg",
    name: "Sad",
    desc: "You don't have to carry everything alone.",
    file: "data/sad.json"
  },
  {
    id: "anxious",
    image: "assets/anxiousjm.jpeg",
    name: "Anxious",
    desc: "Let's slow your thoughts together.",
    file: "data/anxious.json"
  },
  {
    id: "stressed",
    image: "assets/stressedjm.jpeg",
    name: "Stressed",
    desc: "You've done enough today.",
    file: "data/stressed.json"
  },
  {
    id: "tired",
    image: "assets/tiredjm.jpeg",
    name: "Tired",
    desc: "It's okay to rest.",
    file: "data/tired.json"
  },
  {
    id: "smile",
    image: "assets/smilejm.jpeg",
    name: "Need a Smile",
    desc: "Let's brighten your day.",
    file: "data/smile.json"
  }
];

const MoodEngine = (() => {
  const cache = {};
  let currentMood = null;
  let currentMessages = [];
  let lastIndex = -1;
  let shownCount = 0;

  async function loadMood(moodId) {
    currentMood = MOODS.find((m) => m.id === moodId);
    if (!currentMood) return null;

    if (!cache[moodId]) {
      try {
        const res = await fetch(currentMood.file);
        cache[moodId] = await res.json();
      } catch (err) {
        console.error("Could not load mood file:", currentMood.file, err);
        cache[moodId] = [["You are not alone.", "I'm here with you."]];
      }
    }
    currentMessages = cache[moodId];
    lastIndex = -1;
    shownCount = 0;
    return currentMood;
  }

  function nextMessage() {
    if (!currentMessages.length) return { lines: [], count: 0, total: 0 };

    let idx = lastIndex;
    if (currentMessages.length > 1) {
      while (idx === lastIndex) {
        idx = Math.floor(Math.random() * currentMessages.length);
      }
    } else {
      idx = 0;
    }
    lastIndex = idx;
    shownCount += 1;
    return {
      lines: currentMessages[idx],
      count: shownCount,
      total: currentMessages.length
    };
  }

  function getCurrentMood() {
    return currentMood;
  }

  return { loadMood, nextMessage, getCurrentMood, MOODS };
})();
