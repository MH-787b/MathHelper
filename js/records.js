/* ============================================
   Records - localStorage persistence layer
   ============================================ */

const STORAGE_KEY = 'mathshelp_records';
const MAX_RECENT = 20;

const DEFAULT_DATA = {
  version: 1,
  lastUpdated: null,
  records: {
    speed: {},
    clock: {},
    marathon: {},
    mixmaster: {},
    streak: {}
  },
  recentGames: []
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const data = JSON.parse(raw);
    if (!data.version || !data.records) return structuredClone(DEFAULT_DATA);
    // Ensure all mode keys exist
    for (const mode of Object.keys(DEFAULT_DATA.records)) {
      if (!data.records[mode]) data.records[mode] = {};
    }
    if (!data.recentGames) data.recentGames = [];
    return data;
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

function save(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable - silently fail
  }
}

function getRecord(mode, configKey) {
  const data = load();
  return data.records[mode]?.[configKey] || null;
}

function getAllRecords() {
  const data = load();
  const flat = [];
  for (const [mode, configs] of Object.entries(data.records)) {
    for (const [configKey, record] of Object.entries(configs)) {
      flat.push({ mode, configKey, ...record });
    }
  }
  return flat;
}

function getRecordsForMode(mode) {
  const data = load();
  return data.records[mode] || {};
}

function checkRecord(mode, configKey, newResult) {
  const current = getRecord(mode, configKey);

  if (!current) {
    return { isNewRecord: true, previous: null, current: newResult };
  }

  let isNew = false;

  if (mode === 'marathon') {
    // Lower time is better
    isNew = newResult.bestTime < current.bestTime;
  } else if (mode === 'speed' || mode === 'clock' || mode === 'mixmaster') {
    isNew = newResult.bestScore > current.bestScore;
  } else if (mode === 'streak') {
    isNew = newResult.bestStreak > current.bestStreak;
  }

  return { isNewRecord: isNew, previous: current, current: newResult };
}

function saveGame(mode, configKey, result) {
  const data = load();

  // Build the record value from result
  let newValue;
  if (mode === 'marathon') {
    newValue = { bestTime: result.time, date: new Date().toISOString(), attempts: 0 };
  } else if (mode === 'streak') {
    newValue = { bestStreak: result.score, date: new Date().toISOString(), attempts: 0 };
  } else {
    newValue = { bestScore: result.score, date: new Date().toISOString(), attempts: 0 };
  }

  const existing = data.records[mode][configKey];
  const recordCheck = checkRecord(mode, configKey, newValue);

  if (existing) {
    newValue.attempts = (existing.attempts || 0) + 1;
    if (recordCheck.isNewRecord) {
      data.records[mode][configKey] = newValue;
    } else {
      data.records[mode][configKey].attempts = newValue.attempts;
    }
  } else {
    newValue.attempts = 1;
    data.records[mode][configKey] = newValue;
  }

  // Add to recent games
  data.recentGames.unshift({
    mode,
    configKey,
    score: mode === 'marathon' ? result.time : result.score,
    date: new Date().toISOString(),
    isRecord: recordCheck.isNewRecord
  });

  // Trim recent games
  if (data.recentGames.length > MAX_RECENT) {
    data.recentGames = data.recentGames.slice(0, MAX_RECENT);
  }

  save(data);
  return recordCheck;
}

function getRecentGames(limit = MAX_RECENT) {
  const data = load();
  return data.recentGames.slice(0, limit);
}

function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
}

export const Records = {
  load,
  save,
  getRecord,
  getAllRecords,
  getRecordsForMode,
  checkRecord,
  saveGame,
  getRecentGames,
  clearAll
};
