/* ============================================
   UI - View rendering & DOM manipulation
   ============================================ */

import { MODES, DIFFICULTY } from './games.js';
import { Records } from './records.js';

const app = () => document.getElementById('app');

// --- Utility ---

function formatTime(seconds) {
  if (seconds < 60) return seconds.toFixed(1) + 's';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getRecordDisplay(mode, configKey) {
  const record = Records.getRecord(mode, configKey);
  if (!record) return '<span class="text-muted">No record yet</span>';
  if (mode === 'marathon') {
    return `Best: ${formatTime(record.bestTime / 1000)}`;
  } else if (mode === 'streak') {
    return `Best: ${record.bestStreak} in a row`;
  } else {
    return `Best: ${record.bestScore}`;
  }
}

function getModeAccentVar(modeId) {
  const map = {
    speed: '--color-coral',
    clock: '--color-amber',
    marathon: '--color-teal',
    mixmaster: '--color-indigo',
    streak: '--color-emerald'
  };
  return map[modeId] || '--color-coral';
}

function setAccent(modeId) {
  const color = MODES[modeId]?.color || '#f97066';
  document.documentElement.style.setProperty('--accent', color);
}

// --- View Transitions ---

function transitionView(html) {
  const el = app();
  el.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'view-enter';
  wrapper.innerHTML = html;
  el.appendChild(wrapper);
}

// --- Nav highlighting ---

export function updateNav(view) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (view === 'records' && link.dataset.nav === 'records') {
      link.classList.add('active');
    } else if (view !== 'records' && link.dataset.nav === 'play') {
      link.classList.add('active');
    }
  });
}

// --- Home View ---

export function renderHome() {
  setAccent('speed');
  updateNav('home');

  const modeOrder = ['speed', 'clock', 'marathon', 'mixmaster', 'streak'];
  const defaultConfigKeys = {
    speed: 'all',
    clock: 'medium',
    marathon: '7',
    mixmaster: 'default',
    streak: 'all'
  };

  const modeCards = modeOrder.map(id => {
    const m = MODES[id];
    const recordHtml = getRecordDisplay(id, defaultConfigKeys[id]);
    return `
      <div class="card card-interactive card-accent mode-card" data-mode="${id}" style="--accent: ${m.color}">
        <div class="mode-card-header">
          <h3>${m.name}</h3>
          <div class="mode-card-icon" style="background: ${m.color}">${m.icon}</div>
        </div>
        <p>${m.description}</p>
        <div class="mode-card-best">${recordHtml}</div>
      </div>
    `;
  }).join('');

  transitionView(`
    <div class="home-hero">
      <h1>Times Tables Practice</h1>
      <p>Choose a challenge and beat your personal best</p>
    </div>
    <div class="mode-grid">
      ${modeCards}
    </div>
  `);

  // Bind click events
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      const mode = card.dataset.mode;
      window.location.hash = `#/play/${mode}`;
    });
  });
}

// --- Game Setup View ---

export function renderGameSetup(mode, onStart) {
  const m = MODES[mode];
  if (!m) { renderHome(); return; }
  setAccent(mode);
  updateNav('play');

  const allTables = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const isSingleTable = m.configType === 'single-table';
  const needsTables = m.configType === 'tables' || m.configType === 'tables+difficulty' || isSingleTable;
  const needsDifficulty = m.configType === 'tables+difficulty';
  const noConfig = m.configType === 'none';

  let selectedTables = isSingleTable ? [7] : [...allTables];
  let selectedDifficulty = 'medium';

  let html = `
    <div class="setup-container">
      <div class="setup-header">
        <h2>${m.name}</h2>
        <p>${m.description}</p>
      </div>
  `;

  if (needsTables) {
    html += `
      <div class="setup-section">
        <h4>${isSingleTable ? 'Choose a table' : 'Choose tables'}</h4>
        ${!isSingleTable ? `<div style="margin-bottom: var(--space-2)">
          <button class="btn btn-secondary" id="select-all-btn" style="font-size: var(--text-sm); padding: var(--space-2) var(--space-4);">Select All</button>
        </div>` : ''}
        <div class="table-grid">
          ${allTables.map(t => `
            <button class="table-btn ${selectedTables.includes(t) ? 'selected' : ''}" data-table="${t}">${t}</button>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (needsDifficulty) {
    html += `
      <div class="setup-section">
        <h4>Difficulty</h4>
        <div class="difficulty-grid">
          ${Object.entries(DIFFICULTY).map(([key, d]) => `
            <button class="difficulty-btn ${key === selectedDifficulty ? 'selected' : ''}" data-difficulty="${key}">
              ${d.label}<br><span class="text-muted" style="font-size: var(--text-xs); font-weight: 400">${d.timePerQuestion}s per Q</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (noConfig) {
    html += `
      <div class="setup-section" style="text-align: center;">
        <p class="text-muted">Tables get progressively harder. You have 3 lives. Ready?</p>
      </div>
    `;
  }

  html += `
      <div class="setup-actions">
        <button class="btn btn-primary btn-large btn-block" id="start-game-btn">Start</button>
      </div>
      <div class="setup-actions" style="margin-top: var(--space-2);">
        <button class="btn btn-secondary btn-block" id="back-btn">Back</button>
      </div>
    </div>
  `;

  transitionView(html);

  // Bind table buttons
  if (needsTables) {
    document.querySelectorAll('.table-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = parseInt(btn.dataset.table);
        if (isSingleTable) {
          selectedTables = [t];
          document.querySelectorAll('.table-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        } else {
          if (selectedTables.includes(t)) {
            if (selectedTables.length > 1) {
              selectedTables = selectedTables.filter(x => x !== t);
              btn.classList.remove('selected');
            }
          } else {
            selectedTables.push(t);
            btn.classList.add('selected');
          }
        }
      });
    });

    const selectAllBtn = document.getElementById('select-all-btn');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        selectedTables = [...allTables];
        document.querySelectorAll('.table-btn').forEach(b => b.classList.add('selected'));
      });
    }
  }

  // Bind difficulty buttons
  if (needsDifficulty) {
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedDifficulty = btn.dataset.difficulty;
        document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
  }

  // Start button
  document.getElementById('start-game-btn').addEventListener('click', () => {
    const config = {
      tables: needsTables ? selectedTables : [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      difficulty: selectedDifficulty,
      key: noConfig ? 'default' : isSingleTable ? selectedTables[0].toString() : needsDifficulty ? selectedDifficulty : (selectedTables.length === allTables.length ? 'all' : selectedTables.sort((a,b) => a-b).join(','))
    };
    onStart(mode, config);
  });

  // Back button
  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.hash = '#/';
  });
}

// --- Countdown Overlay ---

export function showCountdown(onDone) {
  const overlay = document.createElement('div');
  overlay.className = 'countdown-overlay';
  document.body.appendChild(overlay);

  let count = 3;

  function show() {
    if (count > 0) {
      overlay.innerHTML = `<div class="countdown-number">${count}</div>`;
      count--;
      setTimeout(show, 700);
    } else {
      overlay.innerHTML = `<div class="countdown-go">GO!</div>`;
      setTimeout(() => {
        overlay.remove();
        onDone();
      }, 400);
    }
  }
  show();
}

// --- Active Game View ---

export function renderPlaying(mode) {
  const m = MODES[mode];
  setAccent(mode);
  updateNav('play');

  let hudItems = '';

  switch (mode) {
    case 'speed':
      hudItems = `
        <div class="hud-item"><div class="hud-label">Time</div><div class="hud-value mono" id="hud-time">1:00</div></div>
        <div class="hud-item"><div class="hud-label">Score</div><div class="hud-value mono" id="hud-score">0</div></div>
        <div class="hud-item"><div class="hud-label">Streak</div><div class="hud-value mono" id="hud-streak">0</div></div>
      `;
      break;
    case 'clock':
      hudItems = `
        <div class="hud-item"><div class="hud-label">Question</div><div class="hud-value mono" id="hud-progress">0/20</div></div>
        <div class="hud-item"><div class="hud-label">Score</div><div class="hud-value mono" id="hud-score">0</div></div>
      `;
      break;
    case 'marathon':
      hudItems = `
        <div class="hud-item"><div class="hud-label">Progress</div><div class="hud-value mono" id="hud-progress">0/12</div></div>
        <div class="hud-item"><div class="hud-label">Time</div><div class="hud-value mono" id="hud-time">0.0s</div></div>
      `;
      break;
    case 'mixmaster':
      hudItems = `
        <div class="hud-item"><div class="hud-label">Score</div><div class="hud-value mono" id="hud-score">0</div></div>
        <div class="hud-item"><div class="hud-label">Lives</div><div class="hud-value" id="hud-lives">
          <div class="lives-display">
            <div class="life-icon" id="life-1"></div>
            <div class="life-icon" id="life-2"></div>
            <div class="life-icon" id="life-3"></div>
          </div>
        </div></div>
      `;
      break;
    case 'streak':
      hudItems = `
        <div class="hud-item"><div class="hud-label">Streak</div><div class="hud-value mono" id="hud-streak" style="font-size: var(--text-4xl);">0</div></div>
      `;
      break;
  }

  const timerBar = (mode === 'speed' || mode === 'clock') ? `
    <div class="timer-bar-container">
      <div class="timer-bar" id="timer-bar" style="width: 100%"></div>
    </div>
  ` : '';

  transitionView(`
    <div class="game-container">
      <div class="game-hud">${hudItems}</div>
      <div class="card game-card" id="game-card">
        <div class="question-display" id="question-display">? x ? = ?</div>
        <div class="answer-form">
          <div class="answer-input-wrap">
            <input type="number" inputmode="numeric" class="input input-large" id="answer-input" autocomplete="off" placeholder="?">
          </div>
          <button class="btn btn-primary btn-large" id="submit-btn">Submit</button>
        </div>
        ${timerBar}
      </div>
    </div>
  `);
}

export function bindGameEvents(onSubmit) {
  const input = document.getElementById('answer-input');
  const submitBtn = document.getElementById('submit-btn');

  if (!input || !submitBtn) return;

  const handleSubmit = () => {
    const val = input.value.trim();
    if (val === '') return;
    onSubmit(parseInt(val, 10));
    input.value = '';
    input.focus();
  };

  submitBtn.addEventListener('click', handleSubmit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  });

  input.focus();
}

export function showQuestion(question, state) {
  const display = document.getElementById('question-display');
  if (display) {
    display.textContent = `${question.a} × ${question.b} = ?`;
  }
  const input = document.getElementById('answer-input');
  if (input) {
    input.value = '';
    input.focus();
  }
}

export function showAnswerFeedback(correct) {
  const card = document.getElementById('game-card');
  if (!card) return;
  card.classList.remove('correct-flash', 'incorrect-flash');
  // Force reflow
  void card.offsetWidth;
  card.classList.add(correct ? 'correct-flash' : 'incorrect-flash');
}

export function updateGameHUD(state) {
  const timeEl = document.getElementById('hud-time');
  const scoreEl = document.getElementById('hud-score');
  const streakEl = document.getElementById('hud-streak');
  const progressEl = document.getElementById('hud-progress');
  const timerBar = document.getElementById('timer-bar');

  if (timeEl) {
    if (state.mode === 'speed') {
      timeEl.textContent = formatTime(state.timeRemaining);
    } else if (state.mode === 'marathon') {
      timeEl.textContent = formatTime(state.elapsed);
    }
  }

  if (scoreEl) {
    scoreEl.textContent = state.mode === 'streak' ? state.bestStreak : state.score;
  }

  if (streakEl) {
    streakEl.textContent = state.streak;
    // Milestone animation
    if ([10, 25, 50, 75, 100].includes(state.streak)) {
      streakEl.classList.remove('streak-milestone');
      void streakEl.offsetWidth;
      streakEl.classList.add('streak-milestone');
    }
  }

  if (progressEl && state.progress) {
    progressEl.textContent = `${state.progress.current}/${state.progress.total}`;
  }

  // Timer bar
  if (timerBar) {
    let pct = 100;
    if (state.mode === 'speed') {
      pct = (state.timeRemaining / 60) * 100;
    } else if (state.mode === 'clock' && state.config) {
      const maxTime = DIFFICULTY[state.config.difficulty].timePerQuestion;
      pct = (state.questionTimeRemaining / maxTime) * 100;
    }
    timerBar.style.width = pct + '%';
    timerBar.classList.remove('warning', 'danger');
    if (pct < 20) timerBar.classList.add('danger');
    else if (pct < 40) timerBar.classList.add('warning');
  }

  // Lives (Mix Master)
  if (state.mode === 'mixmaster') {
    for (let i = 1; i <= 3; i++) {
      const lifeEl = document.getElementById(`life-${i}`);
      if (lifeEl) {
        lifeEl.classList.toggle('lost', i > state.lives);
      }
    }
  }
}

// --- Results View ---

export function renderResults(state, recordCheck, onPlayAgain, onChangeMode) {
  const m = MODES[state.mode];
  setAccent(state.mode);

  let scoreDisplay, scoreLabel;
  if (state.mode === 'marathon') {
    scoreDisplay = formatTime(state.elapsed);
    scoreLabel = 'Completion Time';
  } else if (state.mode === 'streak') {
    scoreDisplay = state.bestStreak;
    scoreLabel = 'Best Streak';
  } else {
    scoreDisplay = state.score;
    scoreLabel = 'Score';
  }

  const isNewRecord = recordCheck?.isNewRecord;
  const prevRecord = recordCheck?.previous;

  let recordHtml = '';
  if (isNewRecord) {
    recordHtml = `<div class="new-record-badge">NEW PERSONAL BEST!</div>`;
    if (prevRecord) {
      let prevVal;
      if (state.mode === 'marathon') prevVal = formatTime(prevRecord.bestTime / 1000);
      else if (state.mode === 'streak') prevVal = prevRecord.bestStreak;
      else prevVal = prevRecord.bestScore;
      recordHtml += `<div class="previous-record">Previous: ${prevVal}</div>`;
    }
  }

  const accuracy = state.totalQuestions > 0 ? Math.round((state.correctAnswers / state.totalQuestions) * 100) : 0;
  const avgTime = state.totalQuestions > 0 ? (state.elapsed / state.totalQuestions).toFixed(1) + 's' : '-';

  transitionView(`
    <div class="results-container">
      <div class="card results-card">
        <div class="results-mode">${m.name}</div>
        <h2 class="results-title">Challenge Complete!</h2>
        ${recordHtml}
        <div class="results-score">${scoreDisplay}</div>
        <div class="results-score-label">${scoreLabel}</div>
        <div class="results-stats">
          <div class="stat-item">
            <div class="stat-value">${state.totalQuestions}</div>
            <div class="stat-label">Questions</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${accuracy}%</div>
            <div class="stat-label">Accuracy</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${avgTime}</div>
            <div class="stat-label">Avg Time</div>
          </div>
        </div>
        <div class="results-actions">
          <button class="btn btn-primary" id="play-again-btn">Play Again</button>
          <button class="btn btn-secondary" id="change-mode-btn">Change Mode</button>
        </div>
      </div>
    </div>
  `);

  document.getElementById('play-again-btn').addEventListener('click', onPlayAgain);
  document.getElementById('change-mode-btn').addEventListener('click', onChangeMode);
}

// --- Records View ---

export function renderRecords() {
  setAccent('speed');
  updateNav('records');

  const modeOrder = ['speed', 'clock', 'marathon', 'mixmaster', 'streak'];
  const recentGames = Records.getRecentGames(10);

  const tabs = modeOrder.map((id, i) => {
    const m = MODES[id];
    return `<button class="records-tab ${i === 0 ? 'active' : ''}" data-mode="${id}" style="--accent: ${m.color}">${m.name}</button>`;
  }).join('');

  transitionView(`
    <div class="records-container">
      <div class="records-header">
        <h2>Your Records</h2>
      </div>
      <div class="records-tabs">${tabs}</div>
      <div id="records-content"></div>
      <div class="recent-activity">
        <h3>Recent Activity</h3>
        <div id="recent-list">
          ${recentGames.length === 0 ? '<p class="text-muted" style="padding: var(--space-4) 0;">No games played yet. Get started!</p>' :
            recentGames.map(g => {
              const m = MODES[g.mode];
              const scoreText = g.mode === 'marathon' ? formatTime(g.score / 1000) : g.score;
              return `
                <div class="activity-item">
                  <div class="activity-dot" style="background: ${m.color}"></div>
                  <div class="activity-text">${m.name} ${g.configKey !== 'default' && g.configKey !== 'all' ? `(${g.configKey})` : ''}: <strong>${scoreText}</strong>${g.isRecord ? ' ★' : ''}</div>
                  <div class="activity-date">${formatDate(g.date)}</div>
                </div>
              `;
            }).join('')
          }
        </div>
      </div>
      <div class="records-footer">
        <button class="btn btn-danger" id="clear-records-btn">Clear All Records</button>
      </div>
    </div>
  `);

  // Render first tab content
  renderRecordTab(modeOrder[0]);

  // Tab clicks
  document.querySelectorAll('.records-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.records-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      setAccent(tab.dataset.mode);
      renderRecordTab(tab.dataset.mode);
    });
  });

  // Clear records
  document.getElementById('clear-records-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all records? This cannot be undone.')) {
      Records.clearAll();
      renderRecords();
    }
  });
}

function renderRecordTab(mode) {
  const container = document.getElementById('records-content');
  if (!container) return;

  const records = Records.getRecordsForMode(mode);
  const entries = Object.entries(records);

  if (entries.length === 0) {
    container.innerHTML = `<div class="records-empty">No records for this mode yet. Play a game!</div>`;
    return;
  }

  const rows = entries.map(([key, record]) => {
    let valueText;
    if (mode === 'marathon') {
      valueText = formatTime(record.bestTime / 1000);
    } else if (mode === 'streak') {
      valueText = record.bestStreak + ' in a row';
    } else {
      valueText = record.bestScore;
    }
    const label = key === 'all' ? 'All Tables' : key === 'default' ? 'Default' : key.includes(',') ? `Tables ${key}` : `${key}× Table`;
    return `
      <div class="record-row">
        <div>
          <span class="record-label">${label}</span>
          <span class="record-date">${formatDate(record.date)}</span>
        </div>
        <div class="record-value">${valueText}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="records-list">${rows}</div>`;
}
