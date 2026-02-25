/* ── Telegram WebApp bootstrap ─────────────────────── */
const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
  // Match native dark/light if Telegram exposes it
  if (tg.colorScheme === 'dark' || !tg.colorScheme) {
    document.documentElement.style.setProperty('--bg', tg.themeParams?.bg_color || '#0f0f0f');
    document.documentElement.style.setProperty('--bg-sec', tg.themeParams?.secondary_bg_color || '#1a1a1a');
    document.documentElement.style.setProperty('--text', tg.themeParams?.text_color || '#ffffff');
    document.documentElement.style.setProperty('--text-hint', tg.themeParams?.hint_color || '#8a8a8a');
    document.documentElement.style.setProperty('--accent', tg.themeParams?.button_color || '#2ea6ff');
  }
}

/* ── Mock Data ─────────────────────────────────────── */
const MOCK = {
  user: tg?.initDataUnsafe?.user?.first_name || 'Dashboard',

  statuses: ['online', 'working', 'idle'],

  tasks: [
    { name: 'Scraping product catalog',   steps: 12, eta: '~3 min' },
    { name: 'Sending newsletter batch',   steps: 8,  eta: '~1 min' },
    { name: 'Generating PDF reports',     steps: 20, eta: '~7 min' },
    { name: 'Syncing user database',      steps: 5,  eta: '~2 min' },
    { name: 'Analyzing sentiment data',   steps: 15, eta: '~5 min' },
    { name: 'Uploading media assets',     steps: 10, eta: '~4 min' },
  ],

  queue: [
    { name: 'Export CSV report',       priority: 'high'   },
    { name: 'Notify subscribers',      priority: 'medium' },
    { name: 'Clean temp files',        priority: 'low'    },
    { name: 'Refresh OAuth tokens',    priority: 'high'   },
    { name: 'Backup database dump',    priority: 'medium' },
  ],

  activityTemplates: [
    { type: 'success', msg: 'Task "{task}" completed successfully' },
    { type: 'info',    msg: 'Started processing "{task}"' },
    { type: 'warning', msg: 'Retrying "{task}" — attempt {n}' },
    { type: 'error',   msg: '"{task}" failed — will reschedule' },
    { type: 'success', msg: 'Sent {n} notifications' },
    { type: 'info',    msg: 'Queue flushed — {n} items processed' },
    { type: 'success', msg: 'Exported {n} records to CSV' },
    { type: 'warning', msg: 'Rate limit hit — throttling for {n}s' },
    { type: 'info',    msg: 'Webhook received from external service' },
    { type: 'error',   msg: 'Connection timeout — retrying in {n}s' },
  ],

  taskNames: [
    'catalog scraper', 'newsletter batch', 'PDF renderer',
    'DB sync', 'sentiment analyser', 'media uploader',
  ],
};

/* ── State ─────────────────────────────────────────── */
const state = {
  status: 'working',
  taskIndex: 0,
  progress: 0,
  currentStep: 0,
  taskStart: Date.now(),
  tasksDone: 47,
  uptimeMinutes: 312,
  successRate: 94,
  activities: [],
  statusCycle: 0,
};

/* ── DOM refs ──────────────────────────────────────── */
const $ = id => document.getElementById(id);

const dom = {
  userName:     $('user-name'),
  statusBadge:  $('status-badge'),
  statusDot:    $('status-dot'),
  statusLabel:  $('status-label'),
  statTasks:    $('stat-tasks'),
  statUptime:   $('stat-uptime'),
  statSuccess:  $('stat-success'),
  taskName:     $('task-name'),
  taskEta:      $('task-eta'),
  progressFill: $('progress-fill'),
  progressPct:  $('progress-pct'),
  taskStep:     $('task-step'),
  taskStarted:  $('task-started'),
  queueList:    $('queue-list'),
  queueCount:   $('queue-count'),
  activityList: $('activity-list'),
  btnClear:     $('btn-clear'),
};

/* ── Helpers ───────────────────────────────────────── */
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

function relativeTime(ms) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 5)   return 'just now';
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function formatUptime(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function animateNumber(el, target, suffix = '') {
  const start = parseInt(el.textContent) || 0;
  const duration = 600;
  const startTime = performance.now();
  const update = now => {
    const t = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(start + (target - start) * ease) + suffix;
    if (t < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

/* ── Render functions ──────────────────────────────── */
function renderStatus(status) {
  const labels = { online: 'Online', working: 'Working', idle: 'Idle' };
  dom.statusBadge.className = 'status-badge ' + status;
  dom.statusLabel.textContent = labels[status];
}

function renderStats() {
  animateNumber(dom.statTasks,   state.tasksDone, '');
  dom.statUptime.textContent = formatUptime(state.uptimeMinutes);
  animateNumber(dom.statSuccess, state.successRate, '%');
}

function renderTask() {
  const task = MOCK.tasks[state.taskIndex];
  dom.taskName.textContent    = task.name;
  dom.taskEta.textContent     = `ETA: ${task.eta}`;
  dom.progressFill.style.width = state.progress + '%';
  dom.progressPct.textContent  = state.progress + '%';
  dom.taskStep.textContent     = `Step ${state.currentStep} of ${task.steps}`;
  dom.taskStarted.textContent  = 'Started ' + relativeTime(state.taskStart);
}

function renderQueue() {
  dom.queueList.innerHTML = '';
  dom.queueCount.textContent = MOCK.queue.length;

  MOCK.queue.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'queue-item';
    li.innerHTML = `
      <span class="queue-num">#${i + 1}</span>
      <span class="queue-name">${item.name}</span>
      <span class="queue-priority ${item.priority}">${item.priority}</span>
    `;
    dom.queueList.appendChild(li);
  });
}

function renderActivity() {
  dom.activityList.innerHTML = '';

  state.activities.slice(0, 10).forEach(item => {
    const li = document.createElement('li');
    li.className = 'activity-item';
    li.innerHTML = `
      <span class="activity-dot ${item.type}"></span>
      <div class="activity-body">
        <div class="activity-msg">${item.msg}</div>
        <div class="activity-time">${relativeTime(item.ts)}</div>
      </div>
    `;
    dom.activityList.appendChild(li);
  });

  if (state.activities.length === 0) {
    dom.activityList.innerHTML = `
      <li style="padding:12px 0;text-align:center;color:var(--text-hint);font-size:13px;">
        No recent activity
      </li>`;
  }
}

function addActivity() {
  const tpl  = pick(MOCK.activityTemplates);
  const msg  = tpl.msg
    .replace('{task}', pick(MOCK.taskNames))
    .replace('{n}',    rand(2, 99));

  state.activities.unshift({ type: tpl.type, msg, ts: Date.now() });
  if (state.activities.length > 30) state.activities.pop();
  renderActivity();
}

/* ── Simulation loops ──────────────────────────────── */

// Progress: advance every second, reset on completion
function tickProgress() {
  const task = MOCK.tasks[state.taskIndex];
  const stepSize = Math.round(100 / task.steps);

  state.currentStep = Math.min(state.currentStep + 1, task.steps);
  state.progress    = Math.min(state.currentStep * stepSize, 100);

  if (state.progress >= 100) {
    // Task done — transition
    state.tasksDone++;
    state.statusCycle++;

    addActivity();
    renderStats();

    setTimeout(() => {
      // Pick next task
      state.taskIndex   = (state.taskIndex + 1) % MOCK.tasks.length;
      state.progress    = 0;
      state.currentStep = 0;
      state.taskStart   = Date.now();

      // Briefly rotate status for realism
      const cycle = state.statusCycle % 6;
      state.status = cycle < 4 ? 'working' : cycle === 4 ? 'online' : 'idle';
      renderStatus(state.status);
      renderTask();
    }, 900);
  } else {
    renderTask();
  }
}

// Uptime counter
function tickUptime() {
  state.uptimeMinutes++;
  dom.statUptime.textContent = formatUptime(state.uptimeMinutes);
}

// Refresh relative times in activity list
function tickActivityTimes() {
  document
    .querySelectorAll('.activity-time')
    .forEach((el, i) => {
      if (state.activities[i]) {
        el.textContent = relativeTime(state.activities[i].ts);
      }
    });
}

// Occasionally add a new activity event
function tickRandomActivity() {
  if (Math.random() < 0.35) addActivity();
}

/* ── Init ──────────────────────────────────────────── */
function init() {
  // User greeting
  const name = MOCK.user;
  dom.userName.textContent = name !== 'Dashboard' ? `Hi, ${name}` : 'Bot Monitor';

  // Seed initial activities
  for (let i = 0; i < 5; i++) addActivity();

  // Set initial state
  state.status      = 'working';
  state.progress    = rand(10, 55);
  state.currentStep = Math.round((state.progress / 100) * MOCK.tasks[0].steps);

  renderStatus(state.status);
  renderStats();
  renderTask();
  renderQueue();
  renderActivity();

  // Kick off simulation
  setInterval(tickProgress,        1800);   // progress advances every 1.8s
  setInterval(tickUptime,         60000);   // uptime every minute
  setInterval(tickActivityTimes,   5000);   // refresh "Xs ago" labels
  setInterval(tickRandomActivity,  7000);   // random new events

  // Clear button
  dom.btnClear.addEventListener('click', () => {
    state.activities = [];
    renderActivity();
    if (tg) tg.HapticFeedback?.impactOccurred('light');
  });
}

document.addEventListener('DOMContentLoaded', init);
