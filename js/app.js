/* ============================================
   App - Router, state, game lifecycle
   ============================================ */

import { GameEngine, MODES } from './games.js';
import { Records } from './records.js';
import * as UI from './ui.js';

// --- State ---

const state = {
  currentView: 'home',
  activeGame: null,
  inCountdown: false,
  lastMode: null,
  lastConfig: null,
  lastResult: null,
  lastRecordCheck: null
};

// --- Router ---

function parseHash() {
  const hash = window.location.hash || '#/';
  const parts = hash.replace('#/', '').split('/');
  return { path: parts[0] || '', param: parts[1] || '' };
}

function navigate(hash) {
  window.location.hash = hash;
}

function onHashChange() {
  const { path, param } = parseHash();

  // Don't interfere if we're in countdown or actively playing
  if (path === 'playing' && (state.inCountdown || state.activeGame)) {
    return;
  }

  // Destroy any running game if we navigate away from playing
  if (state.activeGame) {
    state.activeGame.destroy();
    state.activeGame = null;
  }
  state.inCountdown = false;

  switch (path) {
    case '':
      state.currentView = 'home';
      UI.renderHome();
      break;

    case 'play':
      if (MODES[param]) {
        state.currentView = 'setup';
        UI.renderGameSetup(param, startGame);
      } else {
        navigate('#/');
      }
      break;

    case 'playing':
      // No active game or countdown - redirect to setup
      if (MODES[param]) {
        navigate(`#/play/${param}`);
      } else {
        navigate('#/');
      }
      break;

    case 'results':
      if (state.lastResult) {
        state.currentView = 'results';
        UI.renderResults(
          state.lastResult,
          state.lastRecordCheck,
          () => startGame(state.lastMode, state.lastConfig),
          () => navigate('#/')
        );
      } else {
        navigate('#/');
      }
      break;

    case 'records':
      state.currentView = 'records';
      UI.renderRecords();
      break;

    default:
      navigate('#/');
  }
}

// --- Game Lifecycle ---

function startGame(mode, config) {
  state.lastMode = mode;
  state.lastConfig = config;
  state.inCountdown = true;

  // Set hash without triggering a redirect
  window.location.hash = `#/playing/${mode}`;

  // Render the playing view
  UI.renderPlaying(mode);

  // Show countdown then start
  UI.showCountdown(() => {
    state.inCountdown = false;

    state.activeGame = new GameEngine({
      mode,
      config,
      onTick: (gameState) => {
        UI.updateGameHUD(gameState);
      },
      onQuestion: (question, gameState) => {
        UI.showQuestion(question, gameState);
      },
      onResult: (isCorrect, gameState) => {
        UI.showAnswerFeedback(isCorrect);
        UI.updateGameHUD(gameState);
      },
      onEnd: (finalState) => {
        state.lastResult = finalState;
        const result = {
          score: mode === 'streak' ? finalState.bestStreak : finalState.score,
          time: finalState.elapsed * 1000 // ms for records
        };
        state.lastRecordCheck = Records.saveGame(mode, config.key, result);
        state.activeGame = null;
        navigate('#/results');
      }
    });

    // Bind input events
    UI.bindGameEvents((answer) => {
      if (state.activeGame) {
        state.activeGame.submitAnswer(answer);
      }
    });

    state.activeGame.start();
  });
}

// --- Init ---

window.addEventListener('hashchange', onHashChange);

document.addEventListener('DOMContentLoaded', () => {
  onHashChange();
});
