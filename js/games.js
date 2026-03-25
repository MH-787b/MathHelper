/* ============================================
   Games - Engine, question generation, all modes
   ============================================ */

// --- Question Generator ---

function generateQuestion(tables) {
  const table = tables[Math.floor(Math.random() * tables.length)];
  const multiplier = Math.floor(Math.random() * 12) + 1;
  return {
    a: table,
    b: multiplier,
    answer: table * multiplier,
    id: `${table}x${multiplier}_${Date.now()}_${Math.random()}`
  };
}

function generateMarathonSet(table) {
  const questions = [];
  for (let i = 1; i <= 12; i++) {
    questions.push({
      a: table,
      b: i,
      answer: table * i,
      id: `${table}x${i}`
    });
  }
  // Shuffle
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }
  return questions;
}

function getMixMasterTables(questionsAnswered) {
  if (questionsAnswered < 5) return [2, 5, 10];
  if (questionsAnswered < 15) return [2, 3, 4, 5, 10, 11];
  if (questionsAnswered < 30) return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
}

// --- Difficulty configs for Beat the Clock ---
export const DIFFICULTY = {
  easy:   { label: 'Easy',   timePerQuestion: 15, color: '#34d399' },
  medium: { label: 'Medium', timePerQuestion: 8,  color: '#f59e0b' },
  hard:   { label: 'Hard',   timePerQuestion: 4,  color: '#f97066' }
};

// --- Mode configs ---
export const MODES = {
  speed: {
    id: 'speed',
    name: 'Speed Round',
    description: '60 seconds on the clock. Answer as many as you can!',
    icon: 'S',
    color: '#f97066',
    configType: 'tables'
  },
  clock: {
    id: 'clock',
    name: 'Beat the Clock',
    description: 'Race against the timer on every single question.',
    icon: 'C',
    color: '#f59e0b',
    configType: 'tables+difficulty'
  },
  marathon: {
    id: 'marathon',
    name: 'Marathon',
    description: 'All 12 questions for one table. How fast can you finish?',
    icon: 'M',
    color: '#14b8a6',
    configType: 'single-table'
  },
  mixmaster: {
    id: 'mixmaster',
    name: 'Mix Master',
    description: 'Tables get harder as you go. You have 3 lives!',
    icon: 'X',
    color: '#818cf8',
    configType: 'none'
  },
  streak: {
    id: 'streak',
    name: 'Streak',
    description: 'One wrong answer and it\'s over. How far can you go?',
    icon: 'K',
    color: '#34d399',
    configType: 'tables'
  }
};

// --- Game Engine ---

export class GameEngine {
  constructor({ mode, config, onTick, onQuestion, onResult, onEnd }) {
    this.mode = mode;
    this.config = config;
    this.onTick = onTick;
    this.onQuestion = onQuestion;
    this.onResult = onResult;
    this.onEnd = onEnd;

    this.status = 'idle';
    this.score = 0;
    this.totalQuestions = 0;
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.lives = 3;
    this.startTime = 0;
    this.elapsed = 0;
    this.timeRemaining = 0;
    this.questionTimeRemaining = 0;
    this.currentQuestion = null;
    this.questions = [];
    this.currentIndex = 0;
    this._rafId = null;
    this._lastTick = 0;
    this._questionStart = 0;

    this._init();
  }

  _init() {
    switch (this.mode) {
      case 'speed':
        this.timeRemaining = 60;
        break;
      case 'clock':
        this.totalQuestionsTarget = 20;
        this.questionTimeRemaining = DIFFICULTY[this.config.difficulty].timePerQuestion;
        break;
      case 'marathon':
        this.questions = generateMarathonSet(this.config.tables[0]);
        this.totalQuestionsTarget = 12;
        break;
      case 'mixmaster':
        this.lives = 3;
        break;
      case 'streak':
        break;
    }
  }

  start() {
    this.status = 'playing';
    this.startTime = performance.now();
    this._lastTick = this.startTime;
    this._nextQuestion();
    this._tick();
  }

  _nextQuestion() {
    switch (this.mode) {
      case 'speed':
      case 'streak':
        this.currentQuestion = generateQuestion(this.config.tables);
        break;
      case 'clock':
        if (this.totalQuestions >= this.totalQuestionsTarget) {
          this._finish();
          return;
        }
        this.currentQuestion = generateQuestion(this.config.tables);
        this.questionTimeRemaining = DIFFICULTY[this.config.difficulty].timePerQuestion;
        this._questionStart = performance.now();
        break;
      case 'marathon':
        if (this.currentIndex >= this.questions.length) {
          this._finish();
          return;
        }
        this.currentQuestion = this.questions[this.currentIndex];
        break;
      case 'mixmaster':
        const tables = getMixMasterTables(this.correctAnswers);
        this.currentQuestion = generateQuestion(tables);
        break;
    }
    this.onQuestion(this.currentQuestion, this.getState());
  }

  submitAnswer(answer) {
    if (this.status !== 'playing' || !this.currentQuestion) return;

    const correct = answer === this.currentQuestion.answer;
    this.totalQuestions++;

    if (correct) {
      this.correctAnswers++;
      this.score++;
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    } else {
      this.wrongAnswers++;
      this.streak = 0;
    }

    // Mode-specific logic
    switch (this.mode) {
      case 'speed':
        this.onResult(correct, this.getState());
        this._nextQuestion();
        break;

      case 'clock':
        this.onResult(correct, this.getState());
        this._nextQuestion();
        break;

      case 'marathon':
        if (correct) {
          this.currentIndex++;
          this.onResult(correct, this.getState());
          this._nextQuestion();
        } else {
          // Must re-answer - don't advance index
          this.onResult(correct, this.getState());
          // Show the same question again
          this.onQuestion(this.currentQuestion, this.getState());
        }
        break;

      case 'mixmaster':
        if (!correct) {
          this.lives--;
        }
        this.onResult(correct, this.getState());
        if (this.lives <= 0) {
          this._finish();
          return;
        }
        this._nextQuestion();
        break;

      case 'streak':
        this.onResult(correct, this.getState());
        if (!correct) {
          this._finish();
          return;
        }
        this._nextQuestion();
        break;
    }
  }

  _tick() {
    if (this.status !== 'playing') return;

    const now = performance.now();
    const delta = (now - this._lastTick) / 1000;
    this._lastTick = now;
    this.elapsed = (now - this.startTime) / 1000;

    switch (this.mode) {
      case 'speed':
        this.timeRemaining = Math.max(0, 60 - this.elapsed);
        if (this.timeRemaining <= 0) {
          this._finish();
          return;
        }
        break;

      case 'clock':
        if (this.currentQuestion) {
          this.questionTimeRemaining = Math.max(0,
            DIFFICULTY[this.config.difficulty].timePerQuestion - (now - this._questionStart) / 1000
          );
          if (this.questionTimeRemaining <= 0) {
            // Time's up for this question
            this.totalQuestions++;
            this.wrongAnswers++;
            this.streak = 0;
            this.onResult(false, this.getState());
            this._nextQuestion();
          }
        }
        break;
    }

    this.onTick(this.getState());
    this._rafId = requestAnimationFrame(() => this._tick());
  }

  _finish() {
    this.status = 'finished';
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this.elapsed = (performance.now() - this.startTime) / 1000;
    this.onEnd(this.getState());
  }

  getState() {
    return {
      mode: this.mode,
      status: this.status,
      score: this.mode === 'streak' ? this.bestStreak : this.score,
      totalQuestions: this.totalQuestions,
      correctAnswers: this.correctAnswers,
      wrongAnswers: this.wrongAnswers,
      streak: this.streak,
      bestStreak: this.bestStreak,
      lives: this.lives,
      elapsed: this.elapsed,
      timeRemaining: this.timeRemaining,
      questionTimeRemaining: this.questionTimeRemaining,
      currentQuestion: this.currentQuestion,
      progress: this.mode === 'marathon'
        ? { current: this.currentIndex, total: 12 }
        : this.mode === 'clock'
          ? { current: Math.min(this.totalQuestions, this.totalQuestionsTarget), total: this.totalQuestionsTarget }
          : null,
      config: this.config
    };
  }

  destroy() {
    this.status = 'finished';
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }
}
