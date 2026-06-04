// Mobile nav toggle
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

navToggle?.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

// Close mobile nav on link click
navLinks?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Copy CA to clipboard
const copyBtn = document.getElementById('copyCa');
const caAddress = document.getElementById('caAddress');

copyBtn?.addEventListener('click', async () => {
  const text = caAddress.textContent;
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.classList.add('copied');
    copyBtn.querySelector('span').textContent = 'Copied!';
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyBtn.querySelector('span').textContent = 'Copy';
    }, 2000);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    copyBtn.querySelector('span').textContent = 'Copied!';
    setTimeout(() => {
      copyBtn.querySelector('span').textContent = 'Copy';
    }, 2000);
  }
});

// Nav background on scroll
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 80) {
    nav.style.background = 'rgba(10, 10, 10, 0.95)';
  } else {
    nav.style.background = 'rgba(10, 10, 10, 0.85)';
  }
});

// Fade-in sections on scroll
const sections = document.querySelectorAll('.section');
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  },
  { threshold: 0.08 }
);

sections.forEach((section) => {
  section.style.opacity = '0';
  section.style.transform = 'translateY(24px)';
  section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(section);
});

// Pump.fun GO bounty countdown — synced from live page meta
const BOUNTY_URL = 'https://pump.fun/go/5396af28-16a4-4cf1-a1e5-caca2a461518';
const BOUNTY_FALLBACK_END = '2026-06-18T12:52:00.000Z';
const SYNC_INTERVAL_MS = 30 * 60 * 1000;

let bountyEndTime = new Date(BOUNTY_FALLBACK_END).getTime();
let countdownInterval = null;

const cdDays = document.getElementById('cdDays');
const cdHours = document.getElementById('cdHours');
const cdMinutes = document.getElementById('cdMinutes');
const cdSeconds = document.getElementById('cdSeconds');
const countdownStatus = document.getElementById('countdownStatus');
const bountyReward = document.getElementById('bountyReward');

function pad(n) {
  return String(n).padStart(2, '0');
}

function parseBountyMeta(html) {
  const metaMatch = html.match(
    /meta[^>]+(?:name="description"|property="og:description")[^>]+content="([^"]+)"/i
  ) || html.match(/content="([^"]+)"[^>]+(?:name="description"|property="og:description")/i);

  if (!metaMatch) return null;

  const content = metaMatch[1]
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');

  const rewardMatch = content.match(/Reward:\s*\$([\d,]+)/i);
  const timeMatch = content.match(/Ends in\s*(\d+)d\s*(\d+)h(?:\s*(\d+)m)?/i);

  return {
    reward: rewardMatch ? `$${rewardMatch[1]}` : null,
    days: timeMatch ? parseInt(timeMatch[1], 10) : 0,
    hours: timeMatch ? parseInt(timeMatch[2], 10) : 0,
    minutes: timeMatch ? parseInt(timeMatch[3] || '0', 10) : 0,
  };
}

function setEndFromRemaining({ days, hours, minutes }) {
  const ms =
    days * 86400000 +
    hours * 3600000 +
    minutes * 60000;
  bountyEndTime = Date.now() + ms;
}

function updateCountdownDisplay() {
  const remaining = bountyEndTime - Date.now();

  if (remaining <= 0) {
    cdDays.textContent = '00';
    cdHours.textContent = '00';
    cdMinutes.textContent = '00';
    cdSeconds.textContent = '00';
    countdownStatus.textContent = 'Bounty has ended';
    countdownStatus.classList.add('expired');
    if (countdownInterval) clearInterval(countdownInterval);
    return;
  }

  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  cdDays.textContent = pad(days);
  cdHours.textContent = pad(hours);
  cdMinutes.textContent = pad(minutes);
  cdSeconds.textContent = pad(seconds);
  countdownStatus.textContent = 'Live countdown synced with Pump.fun';
  countdownStatus.classList.remove('expired');
}

async function syncBountyCountdown() {
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(BOUNTY_URL)}`,
    `https://corsproxy.io/?${encodeURIComponent(BOUNTY_URL)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;

      const html = await res.text();
      const parsed = parseBountyMeta(html);
      if (!parsed || (!parsed.days && !parsed.hours)) continue;

      setEndFromRemaining(parsed);
      if (parsed.reward && bountyReward) bountyReward.textContent = parsed.reward;
      updateCountdownDisplay();
      return true;
    } catch {
      /* try next proxy */
    }
  }

  return false;
}

function startCountdown() {
  updateCountdownDisplay();
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(updateCountdownDisplay, 1000);

  syncBountyCountdown().then((synced) => {
    if (!synced) {
      countdownStatus.textContent = 'Using cached countdown — open Pump.fun for live status';
    }
    updateCountdownDisplay();
  });

  setInterval(syncBountyCountdown, SYNC_INTERVAL_MS);
}

if (cdDays) startCountdown();
