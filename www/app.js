
    // =========================================================================
    // WEB AUDIO API MECHANICAL HUD SOUND SYNTHESIZER (NO EXTERNAL MP3 FILES)
    // =========================================================================
    let audioCtx = null;
    function initAudio() {
      if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioCtx = new AudioContext();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }

    function playHudSound(type = 'chirp') {
      if (!state.sfxEnabled) return;
      try {
        initAudio();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'chirp') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1480, now);
          osc.frequency.exponentialRampToValueAtTime(2420, now + 0.045);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.055);
        } else if (type === 'confirm') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.setValueAtTime(1320, now + 0.06);
          gain.gain.setValueAtTime(0.07, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
          osc.start(now);
          osc.stop(now + 0.17);
        } else if (type === 'pulse') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.start(now);
          osc.stop(now + 0.23);
        }
      } catch (e) {}
    }

    // =========================================================================
    // PERSISTENT APPLICATION STATE (LOCALSTORAGE WRAPPED IN TRY/CATCH)
    // =========================================================================
    const defaultApps = { calendar: [], emails: [], tasks: [], notes: '', memories: [], macros: [], userContacts: [] };

    function loadSavedApps() {
      try {
        const raw = localStorage.getItem('jarvis_step3_workspace');
        if (!raw) return JSON.parse(JSON.stringify(defaultApps));
        const saved = JSON.parse(raw);
        if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return JSON.parse(JSON.stringify(defaultApps));
        const result = {
          ...defaultApps, ...saved,
          calendar: Array.isArray(saved.calendar) ? saved.calendar : [],
          emails: Array.isArray(saved.emails) ? saved.emails : [],
          tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
          notes: typeof saved.notes === 'string' ? saved.notes : '',
          memories: Array.isArray(saved.memories) ? saved.memories : [],
          macros: Array.isArray(saved.macros) ? saved.macros : [],
          userContacts: Array.isArray(saved.userContacts) ? saved.userContacts : []
        };
        const fakeEvents = ['Stark R&D Propulsion Telemetry Review','Global Defense Satellite Sync','Mark VII Arc Reactor Harmonic Calibration'];
        const fakeMail = ['Stark Clean Energy Grid Deployment Sign-off','Gamma Spectrometer Telemetry Calibration','Helicarrier Orbital Uplink Coordinates'];
        const fakeTasks = ['Upgrade HUD to High-Density Stark CAD','Isolate Frontend API Keys in RAM Vault','Test Interactive Connected App Workspace'];
        result.calendar = result.calendar.filter(x => !fakeEvents.includes(x?.title));
        result.emails = result.emails.filter(x => !fakeMail.includes(x?.subject));
        result.tasks = result.tasks.filter(x => !fakeTasks.includes(x?.text));
        result.memories = result.memories.filter(x => !String(x?.text || '').includes('Commander operates from Surat, Gujarat tactical node') && !String(x?.text || '').includes('Preferred HUD Optics: High-Density Stark Mark VII CAD'));
        result.macros = result.macros.filter(x => !['Protocol Alpha','Protocol Orbital'].includes(x?.trigger));
        if (typeof result.notes === 'string') result.notes = result.notes.split(/\r?\n/).filter(x => !x.includes('Arc Reactor output steady at 3.2 GJ/s.') && !x.includes('Secondary orbital uplink calibrated to Surat 21.17°N, 72.83°E.')).join('\n').trim();
        return result;
      } catch (error) { return JSON.parse(JSON.stringify(defaultApps)); }
    }

    function saveAppsState() {
      try {
        localStorage.setItem('jarvis_step3_workspace', JSON.stringify(state.connectedApps));
      } catch (e) {}
      renderConnectedLists();
    }

    const state = {
      voiceEnabled: true,
      sfxEnabled: true,
      isSpeaking: false,
      isProcessing: false,
      privacyMasked: true,
      ramApiKey: null,
      location: { city: '', lat: null, lon: null, country: '' },
      connectedApps: loadSavedApps()
    };

    // --- DOM REFERENCES ---
    const clockDisplay = document.getElementById('clock-display');
    const messagesContainer = document.getElementById('messages-container');
    const commandForm = document.getElementById('command-form');
    const commandInput = document.getElementById('command-input');
    const toggleVoiceBtn = document.getElementById('toggle-voice-btn');
    const voiceIndicator = document.getElementById('voice-indicator');
    const voiceLabel = document.getElementById('voice-label');
    const toggleSfxBtn = document.getElementById('toggle-sfx-btn');
    const sfxIndicator = document.getElementById('sfx-indicator');
    const sfxLabel = document.getElementById('sfx-label');
    const clearFeedBtn = document.getElementById('clear-feed-btn');
    const micBtn = document.getElementById('mic-btn');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    const coreActionText = document.getElementById('core-action-text');
    const waveformMode = document.getElementById('waveform-mode');

    function showToast(msg, type = 'info') {
      const message = String(msg ?? '');
      const kind = type === 'info' ? (/failed|error|denied|blocked|unavailable|not found|not supported|missing|required|cannot|could not/i.test(message) ? 'error' : 'success') : type;
      toastMsg.textContent = message;
      toast.dataset.type = kind;
      toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
      toast.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite');
      toast.classList.remove('translate-y-20', 'opacity-0');
      setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
    }
    function escapeHTML(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    }
    function safeExternalUrl(value) {
      try { const url = new URL(String(value), window.location.href); return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''; }
      catch (error) { return ''; }
    }

    // --- LIVE CLOCK & REFLECTIVE DISPLAY ---
    function updateClock() {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      clockDisplay.textContent = timeStr;
      clockDisplay.setAttribute('data-time', timeStr);

      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
      document.getElementById('big-day-num').textContent = String(now.getDate()).padStart(2, '0');
      document.getElementById('big-month-str').textContent = months[now.getMonth()];
      document.getElementById('big-weekday-str').textContent = days[now.getDay()];

    }
    setInterval(updateClock, 1000);
    updateClock();

    const yearNode = document.getElementById('copyright-year');
    if (yearNode) yearNode.textContent = String(new Date().getFullYear());
    const menuButton = document.getElementById('mobile-menu-toggle');
    const primaryNav = document.getElementById('primary-dock');
    if (menuButton && primaryNav) {
      menuButton.addEventListener('click', () => {
        const opening = menuButton.getAttribute('aria-expanded') !== 'true';
        primaryNav.classList.toggle('hidden', !opening);
        primaryNav.classList.toggle('flex', opening);
        menuButton.setAttribute('aria-expanded', String(opening));
      });
      primaryNav.addEventListener('click', event => {
        if (event.target.closest('.open-hub-tab')) {
          primaryNav.classList.add('hidden');
          primaryNav.classList.remove('flex');
          menuButton.setAttribute('aria-expanded', 'false');
        }
      });
    }


    // =========================================================================
    // RENDER PERSISTENT CONNECTED APPS IN SIDEBAR & MODAL
    // =========================================================================
    function renderConnectedLists() {
      const tasks = Array.isArray(state.connectedApps.tasks) ? state.connectedApps.tasks : [];
      const calendar = Array.isArray(state.connectedApps.calendar) ? state.connectedApps.calendar : [];
      const emails = Array.isArray(state.connectedApps.emails) ? state.connectedApps.emails : [];

      const miniTasks = document.getElementById('mini-task-list');
      if (miniTasks) miniTasks.innerHTML = tasks.length ? tasks.map(task => `
        <label class="flex items-center gap-2 text-cyan-200 cursor-pointer">
          <input type="checkbox" data-task-id="${escapeHTML(Number(task.id) || 0)}" ${task.done ? 'checked' : ''} class="task-toggle-cb accent-cyan-400">
          <span class="${task.done ? 'line-through text-slate-500' : ''}">${escapeHTML(task.text)}</span>
        </label>`).join('') : '<p class="text-slate-500 text-[11px]">No tasks saved.</p>';

      const nextEvent = document.getElementById('next-event');
      if (nextEvent) nextEvent.textContent = calendar.length
        ? `Next: ${String(calendar[0].title || 'Untitled event')} (${String(calendar[0].time || 'time not set')})`
        : 'No upcoming events saved.';

      const calendarList = document.getElementById('hub-cal-list');
      if (calendarList) calendarList.innerHTML = calendar.length ? calendar.map(event => `
        <div class="flex items-center justify-between gap-2 p-2 bg-slate-950/90 border border-cyan-500/25">
          <div class="min-w-0">
            <span class="text-amber-400 font-bold mr-2">${escapeHTML(event.time || 'TIME NOT SET')}</span>
            <span class="text-cyan-100 break-words">${escapeHTML(event.title || 'Untitled event')}</span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-[10px] px-1.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500/30">${escapeHTML(event.status || 'LOCAL')}</span>
            <button type="button" data-del-cal="${escapeHTML(Number(event.id) || 0)}" class="text-rose-400 hover:text-rose-300 px-1">DELETE</button>
          </div>
        </div>`).join('') : '<p class="text-slate-500 text-[11px]">No calendar items saved.</p>';

      const mailList = document.getElementById('hub-mail-list');
      if (mailList) mailList.innerHTML = emails.length ? emails.map(mail => `
        <div class="flex items-center justify-between gap-2 p-2 bg-slate-950/90 border border-amber-500/25">
          <div class="min-w-0 break-words">
            <span class="text-amber-400 font-bold">${escapeHTML(mail.from || 'Sender not set')}:</span>
            <span class="text-slate-200 ml-1">${escapeHTML(mail.subject || 'No subject')}</span>
          </div>
          <button type="button" data-del-mail="${escapeHTML(Number(mail.id) || 0)}" class="text-rose-400 hover:text-rose-300 text-[10px] shrink-0">ARCHIVE</button>
        </div>`).join('') : '<p class="text-slate-500 text-[11px]">No messages saved.</p>';

      const taskList = document.getElementById('hub-task-list');
      if (taskList) taskList.innerHTML = tasks.length ? tasks.map(task => `
        <div class="flex items-center justify-between gap-2 p-2 bg-slate-950/90 border border-cyan-500/25">
          <label class="flex items-center gap-2 flex-1 min-w-0">
            <input type="checkbox" data-task-id="${escapeHTML(Number(task.id) || 0)}" ${task.done ? 'checked' : ''} class="task-toggle-cb accent-cyan-400">
            <span class="${task.done ? 'line-through text-slate-500' : 'text-cyan-100'}">${escapeHTML(task.text)}</span>
          </label>
          <button type="button" data-del-task="${escapeHTML(Number(task.id) || 0)}" class="text-rose-400 hover:text-rose-300 text-[10px] shrink-0">DELETE</button>
        </div>`).join('') : '<p class="text-slate-500 text-[11px]">No tasks saved.</p>';

      const notes = document.getElementById('lab-notes-area');
      if (notes && document.activeElement !== notes) notes.value = state.connectedApps.notes || '';
      const count = calendar.length + emails.length + tasks.length +
        (state.connectedApps.userContacts || []).length +
        (state.connectedApps.memories || []).length +
        (state.connectedApps.macros || []).length;
      const countEl = document.getElementById('apps-count');
      if (countEl) countEl.textContent = `${count} SAVED`;

      document.querySelectorAll('.task-toggle-cb').forEach(input => input.addEventListener('change', event => {
        const id = Number(event.currentTarget.getAttribute('data-task-id'));
        const task = state.connectedApps.tasks.find(item => Number(item.id) === id);
        if (!task) return;
        task.done = event.currentTarget.checked;
        saveAppsState();
      }));
      document.querySelectorAll('[data-del-cal]').forEach(button => button.addEventListener('click', () => {
        const id = Number(button.getAttribute('data-del-cal'));
        state.connectedApps.calendar = state.connectedApps.calendar.filter(item => Number(item.id) !== id);
        saveAppsState(); renderConnectedLists();
      }));
      document.querySelectorAll('[data-del-mail]').forEach(button => button.addEventListener('click', () => {
        const id = Number(button.getAttribute('data-del-mail'));
        state.connectedApps.emails = state.connectedApps.emails.filter(item => Number(item.id) !== id);
        saveAppsState(); renderConnectedLists();
      }));
      document.querySelectorAll('[data-del-task]').forEach(button => button.addEventListener('click', () => {
        const id = Number(button.getAttribute('data-del-task'));
        state.connectedApps.tasks = state.connectedApps.tasks.filter(item => Number(item.id) !== id);
        saveAppsState(); renderConnectedLists();
      }));
    }
    renderConnectedLists();

    // =========================================================================
    // 6 SIMULTANEOUS HIGH-PRECISION CAD & WIREFRAME CANVAS ENGINES
    // =========================================================================
    const coreCanvas = document.getElementById('coreCanvas');
    const coreCtx = coreCanvas.getContext('2d');
    const turbineCanvas = document.getElementById('turbineCanvas');
    const turbCtx = turbineCanvas.getContext('2d');
    const jarvisRingCanvas = document.getElementById('jarvisRingCanvas');
    const jRingCtx = jarvisRingCanvas.getContext('2d');
    const armorBlueprintsCanvas = document.getElementById('armorBlueprintsCanvas');
    const armorCtx = armorBlueprintsCanvas.getContext('2d');
    const radarCanvas = document.getElementById('radarCanvas');
    const radCtx = radarCanvas.getContext('2d');
    const globeCanvas = document.getElementById('globeCanvas');
    const globeCtx = globeCanvas.getContext('2d');
    // Network throughput visualization was removed because this browser session has no real telemetry source.

    let tick = 0;
    let reactorSurge = 1.0;
    let turbineBoost = 1.0;
    const sparkData = Array.from({ length: 34 }, () => 8 + Math.random() * 20);

    // Helper for crisp mirrored CAD polygon lines
    function drawMirroredPoly(ctx, cx, points, close = false) {
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        points.forEach(([dx, y], idx) => {
          const x = cx + dx * dir;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        if (close) ctx.closePath();
        ctx.stroke();
      }
    }

    // 1. CENTER STUDIO-GRADE IRON MAN MARK VII ANATOMICAL CAD + VOLUMETRIC ARC REACTOR
    function drawMirroredCurve(ctx, cx, segs, fillStyle = null) {
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        segs.forEach((seg, idx) => {
          if (seg.type === 'M') {
            ctx.moveTo(cx + seg.x * dir, seg.y);
          } else if (seg.type === 'L') {
            ctx.lineTo(cx + seg.x * dir, seg.y);
          } else if (seg.type === 'Q') {
            ctx.quadraticCurveTo(cx + seg.cx * dir, seg.cy, cx + seg.x * dir, seg.y);
          }
        });
        if (fillStyle) {
          ctx.fillStyle = fillStyle;
          ctx.fill();
        }
        ctx.stroke();
      }
    }

    function renderIronManBustAndReactor() {
      const w = coreCanvas.width;
      const h = coreCanvas.height;
      const cx = w / 2;
      coreCtx.clearRect(0, 0, w, h);

      const targetSurge = state.isSpeaking ? 2.4 : (state.isProcessing ? 1.75 : 1.0);
      reactorSurge += (targetSurge - reactorSurge) * 0.1;

      coreCtx.save();

      // Background Technical Blueprint Grid & Fiducial Crosshairs inside Canvas
      coreCtx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
      coreCtx.lineWidth = 0.6;
      coreCtx.beginPath();
      coreCtx.moveTo(cx, 6); coreCtx.lineTo(cx, h - 6);
      coreCtx.moveTo(20, 56); coreCtx.lineTo(w - 20, 56);
      coreCtx.moveTo(10, 214); coreCtx.lineTo(w - 10, 214);
      coreCtx.stroke();

      // --- ANATOMICAL MARK VII HELMET CRANIUM, BROW, CHEEKBONES & JAW ---
      // Deep Anodized Silhouette Fill
      coreCtx.lineWidth = 1.25;
      coreCtx.strokeStyle = 'rgba(0, 229, 255, 0.88)';
      coreCtx.shadowColor = '#00e5ff';
      coreCtx.shadowBlur = 6;

      // Outer Cranium & Mandible Contour with Smooth Quadratic Curves
      drawMirroredCurve(coreCtx, cx, [
        { type: 'M', x: 0, y: 10 },
        { type: 'Q', cx: 24, cy: 10, x: 34, y: 24 },
        { type: 'Q', cx: 42, cy: 42, x: 39, y: 64 },
        { type: 'L', x: 35, y: 84 },
        { type: 'L', x: 25, y: 102 },
        { type: 'L', x: 11, y: 111 },
        { type: 'L', x: 0, y: 111 }
      ], 'rgba(4, 14, 24, 0.72)');

      // Center Titanium Forehead Ridge & Brow Plate (Authentic Mark VII Faceplate)
      coreCtx.lineWidth = 0.9;
      coreCtx.strokeStyle = 'rgba(0, 229, 255, 0.75)';
      drawMirroredCurve(coreCtx, cx, [
        { type: 'M', x: 5, y: 10 },
        { type: 'L', x: 9, y: 30 },
        { type: 'L', x: 6, y: 48 },
        { type: 'L', x: 28, y: 45 },
        { type: 'L', x: 34, y: 24 }
      ]);

      // Cheekbone Armor Facets & Mandible Guard Lines
      drawMirroredCurve(coreCtx, cx, [
        { type: 'M', x: 39, y: 60 },
        { type: 'L', x: 26, y: 66 },
        { type: 'L', x: 18, y: 82 },
        { type: 'L', x: 25, y: 102 }
      ]);
      drawMirroredCurve(coreCtx, cx, [
        { type: 'M', x: 6, y: 61 },
        { type: 'L', x: 14, y: 74 },
        { type: 'L', x: 13, y: 91 },
        { type: 'L', x: 6, y: 93 },
        { type: 'L', x: 0, y: 93 }
      ]);

      // Mouth Slit & Chin Trapezoid
      coreCtx.beginPath();
      coreCtx.moveTo(cx - 16, 95);
      coreCtx.lineTo(cx - 8, 92);
      coreCtx.lineTo(cx + 8, 92);
      coreCtx.lineTo(cx + 16, 95);
      coreCtx.moveTo(cx - 11, 103);
      coreCtx.lineTo(cx + 11, 103);
      coreCtx.stroke();

      // Ear / Temple Audio Transceiver Pods
      drawMirroredCurve(coreCtx, cx, [
        { type: 'M', x: 38, y: 44 },
        { type: 'L', x: 43, y: 47 },
        { type: 'L', x: 42, y: 70 },
        { type: 'L', x: 36, y: 74 }
      ]);

      // --- LUMINOUS HIGH-INTENSITY DUAL-LAYER VISOR EYES ---
      for (const dir of [-1, 1]) {
        coreCtx.save();
        const eyeColor = state.isSpeaking ? '#ffaa00' : '#00f2ff';
        coreCtx.fillStyle = eyeColor;
        coreCtx.shadowColor = eyeColor;
        coreCtx.shadowBlur = 16;
        coreCtx.beginPath();
        coreCtx.moveTo(cx + 6 * dir, 54);
        coreCtx.lineTo(cx + 29 * dir, 50);
        coreCtx.lineTo(cx + 33 * dir, 55);
        coreCtx.lineTo(cx + 24 * dir, 59);
        coreCtx.lineTo(cx + 7 * dir, 58);
        coreCtx.closePath();
        coreCtx.fill();

        // White-hot inner lens slit
        coreCtx.fillStyle = '#ffffff';
        coreCtx.beginPath();
        coreCtx.moveTo(cx + 9 * dir, 55);
        coreCtx.lineTo(cx + 26 * dir, 52.5);
        coreCtx.lineTo(cx + 23 * dir, 56.5);
        coreCtx.lineTo(cx + 9 * dir, 56.5);
        coreCtx.closePath();
        coreCtx.fill();
        coreCtx.restore();
      }

      // --- CRIMSON / MAGENTA NECK CORD PISTONS & CLAVICLE MECHANISM ---
      coreCtx.shadowBlur = 4;
      coreCtx.shadowColor = '#ff2a55';
      coreCtx.strokeStyle = 'rgba(255, 48, 88, 0.82)';
      coreCtx.lineWidth = 1.05;

      drawMirroredCurve(coreCtx, cx, [
        { type: 'M', x: 24, y: 102 },
        { type: 'L', x: 31, y: 120 },
        { type: 'L', x: 54, y: 136 },
        { type: 'L', x: 24, y: 148 },
        { type: 'L', x: 0, y: 151 }
      ], 'rgba(35, 6, 16, 0.45)');

      // Internal hydraulic neck struts & fastener rings
      drawMirroredCurve(coreCtx, cx, [
        { type: 'M', x: 14, y: 111 },
        { type: 'L', x: 18, y: 134 },
        { type: 'L', x: 40, y: 141 }
      ]);
      for (const dir of [-1, 1]) {
        coreCtx.beginPath();
        coreCtx.arc(cx + 38 * dir, 134, 3.2, 0, Math.PI * 2);
        coreCtx.arc(cx + 20 * dir, 142, 2.2, 0, Math.PI * 2);
        coreCtx.stroke();
      }

      // --- ANATOMICAL TRAPEZIUS, LAYERED SHOULDER PAULDRONS & PECTORAL PLATES ---
      coreCtx.shadowColor = '#00e5ff';
      coreCtx.shadowBlur = 5;
      coreCtx.strokeStyle = 'rgba(0, 229, 255, 0.82)';
      coreCtx.lineWidth = 1.25;

      // Outer Shoulder Pauldron Armor
      drawMirroredCurve(coreCtx, cx, [
        { type: 'M', x: 31, y: 116 },
        { type: 'L', x: 88, y: 128 },
        { type: 'Q', cx: 148, cy: 144, x: 184, y: 180 },
        { type: 'L', x: 202, y: 218 },
        { type: 'L', x: 170, y: 244 },
        { type: 'L', x: 120, y: 216 }
      ], 'rgba(4, 15, 26, 0.65)');

      // Secondary Inner Deltoid & Clavicle Armor Plates
      coreCtx.lineWidth = 0.9;
      coreCtx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
      drawMirroredCurve(coreCtx, cx, [
        { type: 'M', x: 54, y: 136 },
        { type: 'L', x: 114, y: 150 },
        { type: 'L', x: 156, y: 186 },
        { type: 'L', x: 120, y: 202 },
        { type: 'L', x: 68, y: 170 }
      ]);

      // Heavy Chest Pectoral Armor Plates Framing the Arc Reactor Cavity
      coreCtx.lineWidth = 1.3;
      coreCtx.strokeStyle = 'rgba(0, 229, 255, 0.88)';
      drawMirroredCurve(coreCtx, cx, [
        { type: 'M', x: 0, y: 151 },
        { type: 'L', x: 50, y: 156 },
        { type: 'L', x: 102, y: 180 },
        { type: 'L', x: 120, y: 216 },
        { type: 'L', x: 96, y: 268 },
        { type: 'L', x: 48, y: 294 },
        { type: 'L', x: 0, y: 300 }
      ], 'rgba(5, 18, 32, 0.72)');

      // Crimson Lower Sternum & Ribcage Mechanical Seams
      coreCtx.strokeStyle = 'rgba(255, 48, 88, 0.72)';
      coreCtx.lineWidth = 1.0;
      drawMirroredCurve(coreCtx, cx, [
        { type: 'M', x: 52, y: 252 },
        { type: 'L', x: 84, y: 262 },
        { type: 'L', x: 68, y: 288 },
        { type: 'L', x: 34, y: 296 }
      ]);

      // Precision Shoulder Pivot Servos (Like dual circular bolts on chest in reference)
      coreCtx.strokeStyle = 'rgba(0, 229, 255, 0.9)';
      for (const dir of [-1, 1]) {
        coreCtx.beginPath();
        coreCtx.arc(cx + 108 * dir, 196, 8, 0, Math.PI * 2);
        coreCtx.stroke();
        coreCtx.beginPath();
        coreCtx.arc(cx + 108 * dir, 196, 3.5, 0, Math.PI * 2);
        coreCtx.stroke();
      }

      // --- VOLUMETRIC MULTI-RING MARK VII ARC REACTOR (cx, y=214) ---
      const rcx = cx;
      const rcy = 214;

      // Multi-Stop Volumetric Glow
      const grad = coreCtx.createRadialGradient(rcx, rcy, 2, rcx, rcy, 64 * reactorSurge);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.18, 'rgba(180, 250, 255, 0.92)');
      grad.addColorStop(0.42, 'rgba(0, 229, 255, 0.55)');
      grad.addColorStop(0.75, 'rgba(0, 140, 255, 0.15)');
      grad.addColorStop(1, 'rgba(0, 229, 255, 0)');
      coreCtx.fillStyle = grad;
      coreCtx.beginPath();
      coreCtx.arc(rcx, rcy, 64 * reactorSurge, 0, Math.PI * 2);
      coreCtx.fill();

      // Outer Micro-Tick Telemetry Ring
      coreCtx.save();
      coreCtx.translate(rcx, rcy);
      coreCtx.rotate(tick * 0.2);
      coreCtx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
      coreCtx.lineWidth = 1;
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const r1 = i % 4 === 0 ? 45 : 48;
        coreCtx.beginPath();
        coreCtx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
        coreCtx.lineTo(Math.cos(a) * 51, Math.sin(a) * 51);
        coreCtx.stroke();
      }
      coreCtx.restore();

      // 10-Segment Palladium / Brass Inductance Ring
      coreCtx.save();
      coreCtx.translate(rcx, rcy);
      coreCtx.rotate(tick * 0.35);
      coreCtx.strokeStyle = 'rgba(216, 244, 255, 0.95)';
      coreCtx.lineWidth = 1.4;
      coreCtx.beginPath();
      coreCtx.arc(0, 0, 42, 0, Math.PI * 2);
      coreCtx.stroke();

      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        coreCtx.save();
        coreCtx.rotate(a);
        coreCtx.fillStyle = i % 2 === 0 ? 'rgba(0, 229, 255, 0.85)' : 'rgba(255, 123, 0, 0.85)';
        coreCtx.fillRect(30, -2.5, 10, 5);
        coreCtx.strokeStyle = '#ffffff';
        coreCtx.lineWidth = 0.6;
        coreCtx.strokeRect(30, -2.5, 10, 5);
        coreCtx.restore();
      }
      coreCtx.restore();

      // Counter-Rotating Inner Confinement Spokes
      coreCtx.save();
      coreCtx.translate(rcx, rcy);
      coreCtx.rotate(-tick * 0.7);
      coreCtx.strokeStyle = '#ffffff';
      coreCtx.lineWidth = 1.3;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        coreCtx.beginPath();
        coreCtx.arc(0, 0, 24, a, a + 0.48);
        coreCtx.stroke();
        coreCtx.beginPath();
        coreCtx.moveTo(Math.cos(a) * 11, Math.sin(a) * 11);
        coreCtx.lineTo(Math.cos(a) * 24, Math.sin(a) * 24);
        coreCtx.stroke();
      }
      coreCtx.restore();

      // Central White-Hot Plasma Core Ring
      coreCtx.beginPath();
      coreCtx.arc(rcx, rcy, 10, 0, Math.PI * 2);
      coreCtx.fillStyle = '#ffffff';
      coreCtx.fill();
      coreCtx.strokeStyle = '#00e5ff';
      coreCtx.lineWidth = 2;
      coreCtx.stroke();

      coreCtx.restore();
    }

    // 2. LEFT WING MECHANICAL CAD TURBINE + ORTHOGRAPHIC SECTION VIEW
    function renderMechanicalTurbine() {
      const w = turbineCanvas.width;
      const h = turbineCanvas.height;
      const cx = 74;
      const cy = h / 2 + 4;
      turbCtx.clearRect(0, 0, w, h);

      turbineBoost += (1.0 - turbineBoost) * 0.05;

      // Dimension Protractor Arc & Callout Ticks
      turbCtx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
      turbCtx.lineWidth = 0.8;
      turbCtx.beginPath();
      turbCtx.arc(cx, cy, 64, -Math.PI * 0.85, -Math.PI * 0.35);
      turbCtx.stroke();

      // Outer Mechanical Casing Ring
      turbCtx.strokeStyle = 'rgba(216, 244, 255, 0.8)';
      turbCtx.lineWidth = 1.2;
      turbCtx.beginPath();
      turbCtx.arc(cx, cy, 52, 0, Math.PI * 2);
      turbCtx.arc(cx, cy, 46, 0, Math.PI * 2);
      turbCtx.stroke();

      // Rotating 24-Blade High-Density Impeller
      turbCtx.save();
      turbCtx.translate(cx, cy);
      turbCtx.rotate(tick * 0.8 * turbineBoost);
      turbCtx.strokeStyle = 'rgba(0, 229, 255, 0.72)';
      turbCtx.lineWidth = 1;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        turbCtx.beginPath();
        turbCtx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14);
        turbCtx.lineTo(Math.cos(a + 0.22) * 45, Math.sin(a + 0.22) * 45);
        turbCtx.stroke();
      }
      turbCtx.restore();

      // Counter-Rotating Inner Bearing Ring
      turbCtx.save();
      turbCtx.translate(cx, cy);
      turbCtx.rotate(-tick * 0.5);
      turbCtx.strokeStyle = '#ff7b00';
      turbCtx.lineWidth = 1.4;
      turbCtx.setLineDash([6, 4]);
      turbCtx.beginPath();
      turbCtx.arc(0, 0, 24, 0, Math.PI * 2);
      turbCtx.stroke();
      turbCtx.setLineDash([]);
      turbCtx.restore();

      // Orthographic Side Cross-Section Projection (Right Side)
      const sx = 158;
      turbCtx.strokeStyle = 'rgba(216, 244, 255, 0.75)';
      turbCtx.lineWidth = 1;
      turbCtx.strokeRect(sx, cy - 52, 16, 104);
      turbCtx.strokeRect(sx + 16, cy - 34, 12, 68);
      // Internal cross-hatching lines
      turbCtx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
      for (let y = cy - 48; y < cy + 48; y += 8) {
        turbCtx.beginPath();
        turbCtx.moveTo(sx, y);
        turbCtx.lineTo(sx + 16, y + 5);
        turbCtx.stroke();
      }

      // Projection Alignment Leader Lines (Connecting front view to side view)
      turbCtx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
      turbCtx.setLineDash([2, 3]);
      turbCtx.beginPath();
      turbCtx.moveTo(cx, cy - 52); turbCtx.lineTo(sx, cy - 52);
      turbCtx.moveTo(cx, cy + 52); turbCtx.lineTo(sx, cy + 52);
      turbCtx.stroke();
      turbCtx.setLineDash([]);
    }

    // 3. BOTTOM-LEFT ICONIC "J A R V I S" SEGMENTED BLUE/ORANGE RING
    function renderJarvisCornerRing() {
      const w = jarvisRingCanvas.width;
      const h = jarvisRingCanvas.height;
      const cx = w / 2;
      const cy = h / 2;
      jRingCtx.clearRect(0, 0, w, h);

      // Outer Cyan Segmented Tick Ring
      jRingCtx.save();
      jRingCtx.translate(cx, cy);
      jRingCtx.rotate(tick * 0.25);
      jRingCtx.strokeStyle = '#00e5ff';
      jRingCtx.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) {
        const start = i * ((Math.PI * 2) / 3);
        jRingCtx.beginPath();
        jRingCtx.arc(0, 0, 68, start, start + 1.45);
        jRingCtx.stroke();
      }
      jRingCtx.restore();

      // Thick Electric Blue Arc Ring
      jRingCtx.save();
      jRingCtx.translate(cx, cy);
      jRingCtx.rotate(-tick * 0.4);
      jRingCtx.strokeStyle = '#00a8ff';
      jRingCtx.lineWidth = 7;
      jRingCtx.beginPath();
      jRingCtx.arc(0, 0, 56, 0.2, Math.PI * 1.4);
      jRingCtx.stroke();
      jRingCtx.strokeStyle = '#ff7b00';
      jRingCtx.lineWidth = 4;
      jRingCtx.beginPath();
      jRingCtx.arc(0, 0, 46, Math.PI * 1.1, Math.PI * 1.85);
      jRingCtx.stroke();
      jRingCtx.restore();

      // Inner Dark Core & Crisp "J A R V I S" Typography
      jRingCtx.fillStyle = '#060c14';
      jRingCtx.beginPath();
      jRingCtx.arc(cx, cy, 38, 0, Math.PI * 2);
      jRingCtx.fill();
      jRingCtx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
      jRingCtx.lineWidth = 1;
      jRingCtx.stroke();

      jRingCtx.fillStyle = '#e0f8ff';
      jRingCtx.font = 'bold 13px Orbitron, sans-serif';
      jRingCtx.textAlign = 'center';
      jRingCtx.textBaseline = 'middle';
      jRingCtx.fillText('J A R V I S', cx, cy);
    }

    // 4. RIGHT WING 3-POSE ARMOR SILHOUETTE BLUEPRINTS + WIREFRAME CYLINDER
    function renderArmorBlueprints() {
      const w = armorBlueprintsCanvas.width;
      const h = armorBlueprintsCanvas.height;
      armorCtx.clearRect(0, 0, w, h);

      // Left: Rotating 3D Wireframe Generator Drum (Like top-right of armor silhouettes in screenshot)
      const dcx = 52;
      const dcy = 68;
      armorCtx.save();
      armorCtx.translate(dcx, dcy);
      armorCtx.rotate(Math.sin(tick * 0.5) * 0.15);
      armorCtx.strokeStyle = 'rgba(216, 244, 255, 0.65)';
      armorCtx.lineWidth = 0.9;
      for (let offset = -18; offset <= 18; offset += 9) {
        armorCtx.beginPath();
        armorCtx.ellipse(offset, 0, 14, 28, 0, 0, Math.PI * 2);
        armorCtx.stroke();
      }
      armorCtx.strokeStyle = '#00e5ff';
      armorCtx.beginPath();
      armorCtx.arc(18, 0, 6, 0, Math.PI * 2);
      armorCtx.stroke();
      armorCtx.restore();

      // Right: 3 Orthographic Armor Poses (Front, Side, Rear)
      const poses = [
        { x: 145, label: 'FRONT', scaleX: 1.0 },
        { x: 215, label: 'SIDE', scaleX: 0.58 },
        { x: 280, label: 'REAR', scaleX: 1.0 }
      ];

      poses.forEach((p, idx) => {
        const x = p.x;
        const s = p.scaleX;
        armorCtx.save();
        armorCtx.strokeStyle = 'rgba(216, 244, 255, 0.65)';
        armorCtx.lineWidth = 1;

        // Helmet
        armorCtx.strokeRect(x - 6 * s, 10, 12 * s, 14);
        // Torso
        armorCtx.beginPath();
        armorCtx.moveTo(x - 16 * s, 26);
        armorCtx.lineTo(x + 16 * s, 26);
        armorCtx.lineTo(x + 11 * s, 64);
        armorCtx.lineTo(x - 11 * s, 64);
        armorCtx.closePath();
        armorCtx.stroke();

        // Chest Arc Node (Front pose)
        if (idx === 0) {
          armorCtx.fillStyle = '#00e5ff';
          armorCtx.beginPath();
          armorCtx.arc(x, 38, 2.5, 0, Math.PI * 2);
          armorCtx.fill();
        }

        // Arms
        armorCtx.beginPath();
        armorCtx.moveTo(x - 16 * s, 28); armorCtx.lineTo(x - 22 * s, 56); armorCtx.lineTo(x - 19 * s, 78);
        armorCtx.moveTo(x + 16 * s, 28); armorCtx.lineTo(x + 22 * s, 56); armorCtx.lineTo(x + 19 * s, 78);
        armorCtx.stroke();

        // Pelvis & Legs
        armorCtx.strokeRect(x - 10 * s, 64, 20 * s, 12);
        armorCtx.beginPath();
        armorCtx.moveTo(x - 8 * s, 76); armorCtx.lineTo(x - 9 * s, 110); armorCtx.lineTo(x - 7 * s, 134);
        armorCtx.moveTo(x + 8 * s, 76); armorCtx.lineTo(x + 9 * s, 110); armorCtx.lineTo(x + 7 * s, 134);
        armorCtx.stroke();

        // Highlighted Knee/Thigh Nodes (White/Cyan blocks like screenshot)
        armorCtx.fillStyle = 'rgba(0, 229, 255, 0.7)';
        armorCtx.fillRect(x - 10 * s, 96, 4 * s, 7);
        armorCtx.fillRect(x + 6 * s, 96, 4 * s, 7);

        armorCtx.restore();
      });
    }

    // 5. BOTTOM-RIGHT RADIAL SECTOR GAUGE & 54°C SURAT GEODESIC GLOBE
    function renderRadarAndGlobe() {
      // A. Radial Sector Dial with Callout Tabs
      const rw = radarCanvas.width;
      const rh = radarCanvas.height;
      const rcx = rw / 2 - 8;
      const rcy = rh / 2;
      radCtx.clearRect(0, 0, rw, rh);

      // Thick Segmented Orange Outer Gauge Arc (Exact match to bottom-right screenshot)
      radCtx.strokeStyle = '#ff5500';
      radCtx.lineWidth = 10;
      radCtx.beginPath();
      radCtx.arc(rcx, rcy, 58, Math.PI * 0.82, Math.PI * 1.58);
      radCtx.stroke();

      // Secondary Grey/Cyan Outer Arc
      radCtx.strokeStyle = 'rgba(180, 210, 230, 0.35)';
      radCtx.lineWidth = 7;
      radCtx.beginPath();
      radCtx.arc(rcx, rcy, 58, Math.PI * 1.62, Math.PI * 0.78);
      radCtx.stroke();

      // Rotating Inner Cyan Ring
      radCtx.save();
      radCtx.translate(rcx, rcy);
      radCtx.rotate(tick * 0.5);
      radCtx.strokeStyle = '#00e5ff';
      radCtx.lineWidth = 2;
      radCtx.setLineDash([14, 8]);
      radCtx.beginPath();
      radCtx.arc(0, 0, 42, 0, Math.PI * 2);
      radCtx.stroke();
      radCtx.setLineDash([]);
      radCtx.restore();

      // Inner Target Grid & Glow
      radCtx.strokeStyle = 'rgba(0, 229, 255, 0.75)';
      radCtx.lineWidth = 1;
      radCtx.beginPath();
      radCtx.arc(rcx, rcy, 26, 0, Math.PI * 2);
      radCtx.moveTo(rcx - 32, rcy); radCtx.lineTo(rcx + 32, rcy);
      radCtx.moveTo(rcx, rcy - 32); radCtx.lineTo(rcx, rcy + 32);
      radCtx.stroke();

      // Callout Labels Along Right Edge
      radCtx.fillStyle = '#a5f3fc';
      radCtx.font = '9px "Share Tech Mono", monospace';
      const labels = ['Documents', 'Pictures', 'Media', 'Vault'];
      labels.forEach((lbl, i) => {
        const y = 32 + i * 32;
        radCtx.fillText('▸ ' + lbl, rcx + 48, y);
      });

      // B. 3D Geodesic Wireframe Globe with Surat Callout Wedge
      const gw = globeCanvas.width;
      const gh = globeCanvas.height;
      const gcx = gw / 2 - 10;
      const gcy = gh / 2 + 6;
      const grad = 44;
      globeCtx.clearRect(0, 0, gw, gh);

      globeCtx.strokeStyle = 'rgba(216, 244, 255, 0.75)';
      globeCtx.lineWidth = 1;
      globeCtx.beginPath();
      globeCtx.arc(gcx, gcy, grad, 0, Math.PI * 2);
      globeCtx.stroke();

      // Dense Rotating Longitude & Latitude Wireframe Mesh
      for (let i = 0; i < 6; i++) {
        const phase = (tick * 0.25 + (i * Math.PI) / 6) % Math.PI;
        const rx = Math.max(1, Math.abs(Math.cos(phase)) * grad);
        globeCtx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
        globeCtx.beginPath();
        globeCtx.ellipse(gcx, gcy, rx, grad, 0, 0, Math.PI * 2);
        globeCtx.stroke();
      }
      [-28, -14, 0, 14, 28].forEach(latY => {
        const chord = Math.sqrt(Math.max(0, grad * grad - latY * latY));
        globeCtx.beginPath();
        globeCtx.moveTo(gcx - chord, gcy + latY);
        globeCtx.lineTo(gcx + chord, gcy + latY);
        globeCtx.stroke();
      });

      // Surat Callout Projection Lines (Exact match to "Surat" & IP wedge in screenshot)
      globeCtx.strokeStyle = '#e2e8f0';
      globeCtx.lineWidth = 1;
      globeCtx.beginPath();
      globeCtx.moveTo(gcx + 12, gcy - 8);
      globeCtx.lineTo(gcx + 68, gcy - 22);
      globeCtx.moveTo(gcx + 12, gcy - 8);
      globeCtx.lineTo(gcx + 68, gcy + 14);
      globeCtx.stroke();

      globeCtx.fillStyle = '#ff7b00';
      globeCtx.beginPath();
      globeCtx.arc(gcx + 12, gcy - 8, 3, 0, Math.PI * 2);
      globeCtx.fill();

      globeCtx.fillStyle = '#00e5ff';
      globeCtx.font = '10px "Share Tech Mono", monospace';
      globeCtx.fillText((state.location.city || 'GLOBAL').slice(0, 9), gcx + 36, gcy - 12);
    }

    let lastMasterFrame = 0;
    function animateMasterLoop() {
      if (document.hidden) return;
      const frameNow = performance.now();
      if (frameNow - lastMasterFrame < 33) { requestAnimationFrame(animateMasterLoop); return; }
      lastMasterFrame = frameNow;
      tick += 0.028;
      renderIronManBustAndReactor();
      renderMechanicalTurbine();
      renderJarvisCornerRing();
      renderArmorBlueprints();
      renderRadarAndGlobe();
      requestAnimationFrame(animateMasterLoop);
    }
    animateMasterLoop();

    // Interactive Canvas Click Triggers
    coreCanvas.addEventListener('click', () => {
      reactorSurge = 3.2;
      playHudSound('pulse');
      showToast('Arc Reactor Harmonic Pulse Triggered');
    });
    turbineCanvas.addEventListener('click', () => {
      turbineBoost = 3.5;
      playHudSound('chirp');
      showToast('Turbine animation updated');
    });
    jarvisRingCanvas.addEventListener('click', () => {
      playHudSound('confirm');
      processCommand('Run full system diagnostic');
    });
    radarCanvas.addEventListener('click', () => {
      openHubModal('calendar');
    });

    // =========================================================================
    // CONNECTED APPS MODAL DRAWER CONTROLLERS
    // =========================================================================
    const appHubModal = document.getElementById('app-hub-modal');
    const closeHubBtn = document.getElementById('close-hub-btn');

    function openHubModal(tabName = 'calendar') {
      playHudSound('confirm');
      appHubModal.classList.remove('hidden');
      appHubModal.classList.add('flex');
      switchHubTab(tabName);
    }

    function switchHubTab(tabName) {
      document.querySelectorAll('.hub-panel').forEach(p => p.classList.add('hidden'));
      const target = document.getElementById(`hub-panel-${tabName}`);
      if (target) target.classList.remove('hidden');

      document.querySelectorAll('.hub-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
          btn.className = 'hub-tab-btn px-3 py-1.5 bg-cyan-500 text-black font-bold';
        } else {
          btn.className = 'hub-tab-btn px-3 py-1.5 bg-slate-900 border border-cyan-500/30 text-cyan-300';
        }
      });
    }

    document.querySelectorAll('.open-hub-tab').forEach(btn => {
      btn.addEventListener('click', () => openHubModal(btn.getAttribute('data-hub') || 'calendar'));
    });

    document.querySelectorAll('.hub-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        playHudSound('chirp');
        switchHubTab(btn.getAttribute('data-tab'));
      });
    });

    closeHubBtn.addEventListener('click', () => {
      playHudSound('chirp');
      appHubModal.classList.add('hidden');
      appHubModal.classList.remove('flex');
    });

    // Form Submissions inside Connected App Hub
    document.getElementById('add-cal-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const time = document.getElementById('cal-time-input').value.trim();
      const title = document.getElementById('cal-title-input').value.trim();
      if (time && title) {
        state.connectedApps.calendar.unshift({ id: Date.now(), time, title, status: 'SCHEDULED' });
        document.getElementById('cal-time-input').value = '';
        document.getElementById('cal-title-input').value = '';
        playHudSound('confirm');
        saveAppsState();
        showToast('Calendar Event Logged');
      }
    });

    document.getElementById('add-mail-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const from = 'To: ' + document.getElementById('mail-to-input').value.trim();
      const subject = document.getElementById('mail-sub-input').value.trim();
      if (subject) {
        state.connectedApps.emails.unshift({ id: Date.now(), from, subject, unread: false });
        document.getElementById('mail-to-input').value = '';
        document.getElementById('mail-sub-input').value = '';
        playHudSound('confirm');
        saveAppsState();
        showToast('Local message note saved. No email was sent.');
      }
    });

    document.getElementById('add-task-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const text = document.getElementById('task-text-input').value.trim();
      if (text) {
        state.connectedApps.tasks.push({ id: Date.now(), text, done: false });
        document.getElementById('task-text-input').value = '';
        playHudSound('confirm');
        saveAppsState();
        showToast('Directive Added');
      }
    });

    document.getElementById('lab-notes-area').addEventListener('input', (e) => {
      state.connectedApps.notes = e.target.value;
      saveAppsState();
    });

    // =========================================================================
    // SPEECH SYNTHESIS & SFX CONTROLS
    // =========================================================================
    // =========================================================================
    // STEP 14: DIRECT AUDIOCONTEXT SPEECH ENGINE (USES EXACT SAME AUDIO CHANNEL
    //          AS BUTTON CLICKS SO IT NEVER CUTS OFF AFTER A SHORT CLIP!)
    // =========================================================================
    let cachedJarvisVoice = null;
    let subtitleWordTimer = null;
    let activeBufferSource = null;
    let wavSpeechAudio = new Audio();
    let lastSpokenAnswer = "All systems online and audible, Commander. My continuous AudioContext voice synthesizer is active.";

    function selectBestJarvisVoice() {
      if (!window.speechSynthesis) return null;
      const voices = window.speechSynthesis.getVoices() || [];
      if (!voices.length) return null;
      const preferred = voices.find(v => /Google UK English Male|Daniel|Arthur|Oliver|en-GB/i.test(v.name + ' ' + v.lang))
        || voices.find(v => /en-US|en-IN|en_/i.test(v.lang))
        || voices[0];
      cachedJarvisVoice = preferred;
      return preferred;
    }
    if (window.speechSynthesis) {
      selectBestJarvisVoice();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = selectBestJarvisVoice;
      }
    }

    // Build a continuous, multi-second `AudioBuffer` directly inside `audioCtx`
    // modeling human glottal chest resonance (125-165 Hz), 3 vowel formant bands (F1, F2, F3),
    // and sibilant consonant bursts ('s', 't', 'k', 'c', 'f') across the entire sentence!
    // Because it plays through `audioCtx.createBufferSource() -> audioCtx.destination`
    // (the exact same unlocked channel that makes the button click sound!), it is 100% immune
    // to mobile WebView <audio> element blocking and never cuts off after a short clip!
    function playContinuousAudioContextSpeech(text, onDone) {
      initAudio();
      if (!audioCtx) {
        if (onDone) onDone();
        return;
      }
      if (activeBufferSource) {
        try { activeBufferSource.stop(); } catch (e) {}
        activeBufferSource = null;
      }

      const cleanStr = String(text).replace(/[^a-zA-Z0-9 .,?!]/g, ' ').replace(/\s+/g, ' ').trim();
      const words = cleanStr.split(' ').slice(0, 36);
      const sampleRate = audioCtx.sampleRate || 44100;
      // Each word gets ~240ms of articulated multi-syllable speech (minimum 1.8 seconds, up to 7.5 seconds)
      const durationSec = Math.min(7.5, Math.max(1.8, words.length * 0.24));
      const totalSamples = Math.floor(sampleRate * durationSec);

      const audioBuffer = audioCtx.createBuffer(1, totalSamples, sampleRate);
      const channelData = audioBuffer.getChannelData(0);

      // Vowel formant table (F1, F2, F3 in Hz) for authentic vocal tract articulation
      const vowels = [
        { f1: 730, f2: 1090, f3: 2440 }, // 'a' (father)
        { f1: 530, f2: 1840, f3: 2480 }, // 'e' (bet)
        { f1: 390, f2: 1990, f3: 2550 }, // 'i' (bit)
        { f1: 570, f2: 840,  f3: 2410 }, // 'o' (bought)
        { f1: 440, f2: 1020, f3: 2240 }  // 'u' (book)
      ];

      const charLen = Math.max(1, cleanStr.length);
      const samplesPerChar = Math.max(400, Math.floor(totalSamples / charLen));

      let p0 = 0, p1 = 0, p2 = 0, p3 = 0;

      for (let i = 0; i < totalSamples; i++) {
        const cIdx = Math.min(charLen - 1, Math.floor(i / samplesPerChar));
        const ch = cleanStr[cIdx].toLowerCase();
        const posInChar = (i % samplesPerChar) / samplesPerChar;

        // Short natural pause between words
        if (ch === ' ' || ch === '.' || ch === ',') {
          channelData[i] = 0;
          continue;
        }

        // Sibilant / fricative consonant burst on 's', 'z', 'f', 't', 'k', 'c'
        const isFricative = (ch === 's' || ch === 'z' || ch === 'f' || ch === 't' || ch === 'k' || ch === 'c') && posInChar < 0.35;
        const charCode = ch.charCodeAt(0) || 97;
        const v = vowels[(charCode + cIdx) % vowels.length];

        // Natural British male Baritone fundamental pitch contour (132 Hz -> 114 Hz declarative cadence)
        const sentenceProgress = i / totalSamples;
        const basePitch = (136 - sentenceProgress * 18) + Math.sin(cIdx * 1.4) * 9;

        p0 += (2 * Math.PI * basePitch) / sampleRate;
        p1 += (2 * Math.PI * v.f1) / sampleRate;
        p2 += (2 * Math.PI * v.f2) / sampleRate;
        p3 += (2 * Math.PI * v.f3) / sampleRate;

        // Glottal pulse train (rich harmonics) modulated by vocal tract formants
        const glottal = 0.55 * Math.sin(p0) + 0.28 * Math.sin(p0 * 2) + 0.17 * Math.sin(p0 * 3);
        const formantResonance =
          0.52 * Math.sin(p1) * (0.6 + 0.4 * glottal) +
          0.33 * Math.sin(p2) * (0.5 + 0.5 * glottal) +
          0.15 * Math.sin(p3);

        const noise = isFricative ? (Math.random() * 2 - 1) * 0.22 : 0;

        // Smooth syllable envelope
        const env = Math.sin(posInChar * Math.PI);
        // Overall fade-in / fade-out guard
        const edgeEnv = i < 400 ? (i / 400) : (i > totalSamples - 600 ? ((totalSamples - i) / 600) : 1.0);

        channelData[i] = Math.max(-0.92, Math.min(0.92, (glottal * 0.38 + formantResonance * 0.62 + noise) * env * edgeEnv * 0.65));
      }

      // Keep generated speech local. Spoken text is not sent to an external TTS service.
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      const masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.85, audioCtx.currentTime);
      source.connect(masterGain);
      masterGain.connect(audioCtx.destination);
      activeBufferSource = source;
      source.onended = () => {
        if (activeBufferSource === source) {
          activeBufferSource = null;
          if (onDone) onDone();
        }
      };
      source.start(0);

      return durationSec * 1000;
    }

    // Keep buildSyllableWavDataUri for the visible <audio controls> bar scrubber
    function buildSyllableWavDataUri(text) {
      const sampleRate = 11025;
      const words = String(text).trim().split(/\s+/).slice(0, 28);
      const totalDurationSec = Math.min(4.5, Math.max(1.4, words.length * 0.22));
      const numSamples = Math.floor(sampleRate * totalDurationSec);
      const buffer = new ArrayBuffer(44 + numSamples * 2);
      const view = new DataView(buffer);
      const writeStr = (offset, str) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      };
      writeStr(0, 'RIFF');
      view.setUint32(4, 36 + numSamples * 2, true);
      writeStr(8, 'WAVE');
      writeStr(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeStr(36, 'data');
      view.setUint32(40, numSamples * 2, true);

      const f0Table = [138, 152, 164, 175, 146, 160, 182, 130];
      const f1Table = [520, 660, 780, 440, 880, 590, 720, 480];
      const cleanChars = String(text).replace(/[^a-zA-Z0-9 ]/g, '');
      const segLen = Math.floor(sampleRate * 0.085);
      let phase0 = 0, phase1 = 0;
      for (let i = 0; i < numSamples; i++) {
        const segIdx = Math.floor(i / segLen);
        const posInSeg = (i % segLen) / segLen;
        const ch = cleanChars.charCodeAt(segIdx % Math.max(1, cleanChars.length)) || 74;
        if (cleanChars[segIdx % Math.max(1, cleanChars.length)] === ' ') {
          view.setInt16(44 + i * 2, 0, true);
          continue;
        }
        phase0 += (2 * Math.PI * f0Table[(ch + segIdx) % f0Table.length]) / sampleRate;
        phase1 += (2 * Math.PI * f1Table[(ch + segIdx) % f1Table.length]) / sampleRate;
        const sig = 0.55 * Math.sin(phase0) + 0.45 * Math.sin(phase1) * Math.cos(phase0 * 0.5);
        const env = Math.sin(posInSeg * Math.PI);
        view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sig * env * 0.6)) * 32767, true);
      }
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
      }
      return 'data:audio/wav;base64,' + btoa(binary);
    }

    function stopAllSpeech() {
      state.isSpeaking = false;
      if (subtitleWordTimer) { clearInterval(subtitleWordTimer); subtitleWordTimer = null; }
      if (activeBufferSource) {
        try { activeBufferSource.onended = null; activeBufferSource.stop(); } catch (e) {}
        activeBufferSource = null;
      }
      try { wavSpeechAudio.pause(); wavSpeechAudio.currentTime = 0; } catch (e) {}
      if (window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }
      const nativeAssistant = window.Capacitor?.Plugins?.NativeAssistant;
      if (nativeAssistant?.stopSpeech) {
        nativeAssistant.stopSpeech().catch(() => {});
      }
      waveformMode.textContent = "STANDBY";
      const badge = document.getElementById('tts-wave-badge');
      if (badge) {
        badge.textContent = "VOICE STANDBY";
        badge.className = "px-1.5 py-0.2 bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-[9px] shrink-0";
      }
      coreActionText.innerHTML = 'Currently power level is at <strong class="text-white">100</strong> percent and holding steady.';
    }

    function speakText(text) {
      if (!text) return;
      const clean = String(text).replace(/[*#`_~<>]/g, '').replace(/\s+/g, ' ').trim();
      lastSpokenAnswer = clean;

      const subTextEl = document.getElementById('spoken-subtitle-text');
      const badgeEl = document.getElementById('tts-wave-badge');

      if (!state.voiceEnabled) {
        if (subTextEl) subTextEl.textContent = `[MUTED] ${clean}`;
        return;
      }

      stopAllSpeech();
      state.isSpeaking = true;
      waveformMode.textContent = "VOICE TX // SPEAKING";
      if (badgeEl) {
        badgeEl.textContent = " SPEAKING LIVE";
        badgeEl.className = "px-1.5 py-0.5 bg-amber-500 text-black font-bold text-[9px] shrink-0 rounded animate-pulse";
      }
      coreActionText.innerHTML = 'J.A.R.V.I.S. AUDIO STREAM: <strong class="text-amber-400">SPEAKING FULL ANSWER ALOUD...</strong>';

      const words = clean.split(' ');

      const finishSpeech = () => {
        state.isSpeaking = false;
        if (subtitleWordTimer) { clearInterval(subtitleWordTimer); subtitleWordTimer = null; }
        if (subTextEl) subTextEl.textContent = ` Spoken: "${clean}"`;
        if (badgeEl) {
          badgeEl.textContent = " VOICE READY";
          badgeEl.className = "px-1.5 py-0.5 bg-emerald-500 text-black font-bold text-[9px] shrink-0 rounded";
        }
        waveformMode.textContent = "STANDBY";
        coreActionText.innerHTML = 'Currently power level is at <strong class="text-white">100</strong> percent and holding steady.';
      };

      // Prefer Android's native TextToSpeech engine inside the installed APK.
      // Browser SpeechSynthesis remains a fallback for ordinary browser sessions.
      const estMs = Math.max(2600, clean.split(/\s+/).length * 430);
      const nativeAssistant = window.Capacitor?.Plugins?.NativeAssistant;

      if (nativeAssistant?.speak) {
        nativeAssistant.speak({ text: clean }).catch((err) => {
          console.error('Native TextToSpeech failed:', err);
          if (window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined') {
            try {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(clean);
              utterance.lang = 'en-IN';
              utterance.rate = 0.92;
              utterance.volume = 1;
              utterance.onend = finishSpeech;
              utterance.onerror = finishSpeech;
              window.speechSynthesis.speak(utterance);
            } catch (fallbackError) { finishSpeech(); }
          } else {
            finishSpeech();
          }
        });
      } else if (window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined') {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(clean);
          const v = cachedJarvisVoice || selectBestJarvisVoice();
          if (v) utterance.voice = v;
          utterance.lang = (v && v.lang) ? v.lang : 'en-IN';
          utterance.rate = 0.92;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          utterance.onend = finishSpeech;
          utterance.onerror = finishSpeech;
          window.speechSynthesis.speak(utterance);
        } catch (e) { finishSpeech(); }
      } else {
        finishSpeech();
      }

      // Live Karaoke Word-by-Word Subtitle Stream
      let wIdx = 0;
      if (subTextEl) subTextEl.textContent = '';
      subtitleWordTimer = setInterval(() => {
        if (!state.isSpeaking || wIdx >= words.length) {
          clearInterval(subtitleWordTimer);
          subtitleWordTimer = null;
          if (subTextEl) subTextEl.textContent = ` "${clean}"`;
          return;
        }
        wIdx += 2;
        reactorSurge = 1.9 + Math.random() * 1.4;
        if (subTextEl) {
          subTextEl.textContent = ' "' + words.slice(0, wIdx).join(' ') + (wIdx < words.length ? '..."' : '"');
        }
      }, 150);

      setTimeout(() => {
        if (state.isSpeaking) finishSpeech();
      }, estMs + 500);
    }

    toggleVoiceBtn.addEventListener('click', () => {
      state.voiceEnabled = !state.voiceEnabled;
      playHudSound('chirp');
      voiceIndicator.className = state.voiceEnabled ? "w-1.5 h-1.5 rounded-full bg-emerald-400" : "w-1.5 h-1.5 rounded-full bg-slate-600";
      voiceLabel.textContent = state.voiceEnabled ? "VOICE: ON" : "VOICE: OFF";
      if (!state.voiceEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
      showToast(state.voiceEnabled ? "Voice Synthesis Enabled" : "Voice Synthesis Muted");
    });

    toggleSfxBtn.addEventListener('click', () => {
      state.sfxEnabled = !state.sfxEnabled;
      sfxIndicator.className = state.sfxEnabled ? "w-1.5 h-1.5 rounded-full bg-amber-400" : "w-1.5 h-1.5 rounded-full bg-slate-600";
      sfxLabel.textContent = state.sfxEnabled ? "SFX: ON" : "SFX: OFF";
      if (state.sfxEnabled) playHudSound('confirm');
      showToast(state.sfxEnabled ? "HUD Telemetry Audio Enabled" : "HUD Telemetry Audio Muted");
    });

    document.getElementById('play-synth-btn').addEventListener('click', () => {
      playHudSound('pulse');
      reactorSurge = 3.0;
      showToast('Playing Stark Telemetry Harmonic Chime');
    });

    // =========================================================================
    // PRIVACY MASK & RAM GEMINI KEY
    // =========================================================================
    const maskedIpDisplay = document.getElementById('masked-ip-display');
    if (maskedIpDisplay) maskedIpDisplay.textContent = 'NOT DISPLAYED BY THIS APP';

    const vaultModal = document.getElementById('vault-modal');
    document.getElementById('open-vault-btn').addEventListener('click', () => {
      playHudSound('chirp');
      vaultModal.classList.remove('hidden');
      vaultModal.classList.add('flex');
    });
    document.getElementById('close-vault-btn').addEventListener('click', () => {
      vaultModal.classList.add('hidden');
      vaultModal.classList.remove('flex');
    });
    document.getElementById('save-key-btn').addEventListener('click', () => {
      const val = document.getElementById('api-key-input').value.trim();
      if (val) {
        state.ramApiKey = val;
        document.getElementById('api-key-input').value = '';
        document.getElementById('vault-status-label').textContent = 'GEMINI KEY: IN MEMORY';
        playHudSound('confirm');
        showToast('Gemini key is available in this page session only');
      }
      vaultModal.classList.add('hidden');
      vaultModal.classList.remove('flex');
    });
    document.getElementById('purge-key-btn').addEventListener('click', () => {
      state.ramApiKey = null;
      document.getElementById('api-key-input').value = '';
      document.getElementById('vault-status-label').textContent = 'API VAULT: PROXY';
      playHudSound('chirp');
      showToast('Gemini key cleared from this page session');
    });

    // =========================================================================
    // WORLD KNOWLEDGE & COMMAND ROUTER
    // =========================================================================
    function appendMessage(sender, text, meta = null) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const isUser = sender === 'COMMANDER' || sender === 'USER';
      const item = document.createElement('div'); item.className = 'flex space-x-2.5';
      const avatar = document.createElement('div');
      avatar.className = `w-6 h-6 flex items-center justify-center text-[11px] font-display-hud shrink-0 font-bold border ${isUser ? 'bg-amber-950/70 text-amber-300 border-amber-400' : 'bg-cyan-950/80 text-cyan-300 border-cyan-400'}`;
      avatar.textContent = isUser ? 'U' : 'J';
      const body = document.createElement('div'); body.className = 'flex-1 min-w-0';
      const link = meta && meta.url ? safeExternalUrl(meta.url) : '';
      body.innerHTML = `
        <div class="flex items-center justify-between gap-2 font-mono-hud text-[10px]">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-bold ${isUser ? 'text-amber-400' : 'text-cyan-400'}">${escapeHTML(sender)}</span>
            <span class="text-slate-500">${escapeHTML(timeStr)}</span>
            ${meta && meta.source ? `<span class="px-1 bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[9px]">${escapeHTML(meta.source)}</span>` : ''}
          </div>
          ${!isUser ? `<button type="button" class="replay-voice-btn px-1.5 py-0.2 bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[9px]" title="Speak this answer aloud">SPEAK</button>` : ''}
        </div>
        <div class="p-2 mt-0.5 border text-xs leading-relaxed whitespace-pre-wrap break-words ${isUser ? 'bg-[#120f0c] border-amber-500/30 text-amber-100' : 'bg-[#070b12] border-cyan-500/30 text-slate-200'}">
          <div>${escapeHTML(text)}</div>
          ${link ? `<div class="mt-1.5 pt-1 border-t border-cyan-500/20 text-[10px] font-mono-hud"><a href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 underline">OPEN SOURCE</a></div>` : ''}
        </div>`;
      const replay = body.querySelector('.replay-voice-btn');
      if (replay) replay.addEventListener('click', () => speakText(String(text ?? '')));
      item.appendChild(avatar); item.appendChild(body); messagesContainer.appendChild(item);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async function fetchLiveWeather() {
      const lat = Number(state.location?.lat), lon = Number(state.location?.lon);
      const city = state.location?.city || 'selected location';
      const temp = document.getElementById('env-temp'), wind = document.getElementById('env-wind');
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        if (temp) temp.textContent = 'NOT SET'; if (wind) wind.textContent = 'NOT SET';
        return 'Weather is not loaded. Choose a city or request location access.';
      }
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        if (!response.ok) throw new Error(`Weather provider returned HTTP ${response.status}`);
        const data = await response.json();
        if (!data?.current_weather) throw new Error('Weather data is unavailable.');
        const current = data.current_weather;
        if (temp) temp.textContent = `${Math.round(current.temperature)}°C`;
        if (wind) wind.textContent = `${current.windspeed} km/h`;
        return `${city} weather: ${current.temperature}°C, wind ${current.windspeed} km/h. Source: Open-Meteo.`;
      } catch (error) {
        if (temp) temp.textContent = 'UNAVAILABLE'; if (wind) wind.textContent = 'UNAVAILABLE';
        return `Weather data is unavailable for ${city}. ${error?.message || 'Check your connection.'}`;
      }
    }

    // =========================================================================
    // STEP 8: MULTI-API EXACT INTELLIGENCE & QUESTION-ANSWERING PIPELINE
    // =========================================================================
    function extractCleanSubject(rawQuery) {
      return rawQuery
        .replace(/^(hey jarvis|ok jarvis|jarvis|please|can you|could you|tell me|give me|i want to know)\s*,?\s*/i, '')
        .replace(/^(what is the|what is a|what is an|what is|what are the|what are|who is the|who is|who was|where is the|where is|when was|when is|how does|how do|how many|how much|why is|why do|search for|search|define|explain|meaning of|capital of|founder of|inventor of|ceo of|president of|prime minister of|population of|distance to|speed of)\s+/i, '')
        .replace(/[?.!]+$/, '')
        .trim();
    }

    // 1. Direct Instant Precision Knowledge Base (0ms latency for common exact facts, capitals, constants, conversions, & identity)
    function checkInstantPrecisionFacts(rawQuery) {
      const q = rawQuery.toLowerCase().replace(/[?.!]+$/, '').trim();

      // Identity & Conversational Queries
      if (/^(hi|hello|hey|good morning|good evening|good afternoon|greetings)(\s+jarvis)?$/.test(q)) {
        return { text: `Greetings, Commander. All Stark tactical telemetry, interactive particle fields, and multi-API intelligence streams are online. Local time in ${state.location.city} is ${new Date().toLocaleTimeString()}. What would you like me to execute or answer?`, source: 'JARVIS CORE' };
      }
      if (q.includes('who are you') || q.includes('what is your name') || q.includes('introduce yourself')) {
        return { text: "I am J.A.R.V.I.S. (Just A Rather Very Intelligent System), your autonomous tactical AI assistant. I manage your connected applications, hardware telemetry, environmental sensors, and real-time global knowledge.", source: 'JARVIS IDENTITY' };
      }
      if (q.includes('what time is it') || q.includes('current time') || q === 'time') {
        return { text: `The exact local time is ${new Date().toLocaleTimeString()} on ${new Date().toDateString()}.`, source: 'ATOMIC CLOCK' };
      }
      if (q.includes('what day is it') || q.includes('today\'s date') || q.includes('what is the date') || q === 'date') {
        return { text: `Today is ${new Date().toDateString()}.`, source: 'ATOMIC CALENDAR' };
      }

      // Exact Unit Conversions (km to miles, kg to lbs, celsius to fahrenheit)
      const cToF = q.match(/(-?\d+(?:\.\d+)?)\s*(?:c|celsius|centigrade)\s+(?:to|in)\s+(?:f|fahrenheit)/i);
      if (cToF) {
        const c = parseFloat(cToF[1]);
        const f = ((c * 9) / 5 + 32).toFixed(2);
        return { text: `Exact Conversion: ${c}° Celsius is equal to ${f}° Fahrenheit.`, source: 'UNIT CO-PROCESSOR' };
      }
      const fToC = q.match(/(-?\d+(?:\.\d+)?)\s*(?:f|fahrenheit)\s+(?:to|in)\s+(?:c|celsius)/i);
      if (fToC) {
        const f = parseFloat(fToC[1]);
        const c = (((f - 32) * 5) / 9).toFixed(2);
        return { text: `Exact Conversion: ${f}° Fahrenheit is equal to ${c}° Celsius.`, source: 'UNIT CO-PROCESSOR' };
      }
      const kmToMi = q.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometers?)\s+(?:to|in)\s+(?:mi|miles?)/i);
      if (kmToMi) {
        const km = parseFloat(kmToMi[1]);
        return { text: `Exact Conversion: ${km} kilometers is equal to ${(km * 0.621371).toFixed(3)} miles.`, source: 'UNIT CO-PROCESSOR' };
      }

      // High-precision quick facts map (Capitals, Leaders, Constants, Tech Founders)
      const exactFactMap = [
        { match: /capital of india/, ans: "The capital of India is New Delhi." },
        { match: /capital of usa|capital of united states|capital of america/, ans: "The capital of the United States is Washington, D.C." },
        { match: /capital of japan/, ans: "The capital of Japan is Tokyo." },
        { match: /capital of uk|capital of united kingdom|capital of england/, ans: "The capital of the United Kingdom is London." },
        { match: /capital of france/, ans: "The capital of France is Paris." },
        { match: /capital of gujarat/, ans: "The capital of Gujarat is Gandhinagar, while its largest commercial hubs are Ahmedabad and Surat." },
        { match: /prime minister of india/, ans: "The Prime Minister of India is Narendra Modi." },
        { match: /speed of light/, ans: "The exact speed of light in a vacuum is 299,792,458 meters per second (approximately 300,000 kilometers per second or 186,282 miles per second)." },
        { match: /speed of sound/, ans: "The speed of sound in dry air at 20°C is 343 meters per second (1,235 km/h or 767 mph)." },
        { match: /distance (?:from earth )?to (?:the )?moon/, ans: "The average distance from Earth to the Moon is 384,400 kilometers (238,855 miles)." },
        { match: /distance (?:from earth )?to (?:the )?sun/, ans: "The average distance from Earth to the Sun is 149.6 million kilometers (92.96 million miles, or 1 Astronomical Unit)." },
        { match: /boiling point of water/, ans: "The boiling point of water at standard atmospheric pressure (1 atm) is 100°C (212°F or 373.15 K)." },
        { match: /value of pi/, ans: "The mathematical constant Pi (π) is approximately 3.141592653589793." }
      ];
      for (const item of exactFactMap) {
        if (item.match.test(q)) {
          return { text: item.ans, source: 'EXACT FACT MATRIX' };
        }
      }
      return null;
    }

    // 2. Live Keyless AI Answer Engine + DuckDuckGo Instant Answer + Smart Wikipedia Sentence Matcher
    async function queryExactWorldIntelligence(rawQuery) {
      const q = rawQuery.trim();
      const prevTopic = state.lastQueryContext || '';
      state.lastQueryContext = q;
      const lower = q.toLowerCase();

      // Stage A: If the user supplied a Gemini API key, use the current stable model.
      // Do not silently fall back to another provider when an explicitly configured key fails.
      if (state.ramApiKey) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        try {
          const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': state.ramApiKey
            },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: `You are JARVIS, Tony Stark's ultra-intelligent AI assistant. Give the exact, direct, factual answer in 2 concise sentences without filler: ${q}` }] }]
            })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            const detail = data?.error?.message || `HTTP ${res.status}`;
            return { text: `Gemini request failed (${res.status}): ${detail}`, source: 'GEMINI API ERROR', url: null };
          }
          const reply = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
          if (!reply) {
            return { text: 'Gemini returned no text. Check the prompt and API response details.', source: 'GEMINI API ERROR', url: null };
          }
          return { text: reply, source: 'GEMINI 3.8 FLASH', url: null };
        } catch (error) {
          const detail = error?.name === 'AbortError'
            ? 'The request timed out after 20 seconds.'
            : (error?.message || 'Network request failed.');
          return { text: `Gemini request failed: ${detail}`, source: 'GEMINI API ERROR', url: null };
        } finally {
          if (timeoutId !== null) clearTimeout(timeoutId);
        }
      }

      // Do not forward user prompts or saved-memory context to an unconfigured AI provider.
      // Stage C: DuckDuckGo Instant Answer API
      const subject = extractCleanSubject(q);
      try {
        const ddgRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(subject || q)}&format=json&no_html=1&skip_disambig=1`);
        const ddgData = await ddgRes.json();
        if (ddgData?.AbstractText) {
          return {
            text: ddgData.AbstractText,
            source: `INSTANT ANSWER // ${(ddgData.Heading || subject).toUpperCase()}`,
            url: ddgData.AbstractURL || null
          };
        }
      } catch (e) {}

      // Stage D: Smart Wikipedia Entity + Question-Specific Sentence Extractor
      const searchTerms = [subject, q].filter(Boolean);
      for (const term of searchTerms) {
        try {
          const sRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&utf8=&format=json&origin=*`);
          const sData = await sRes.json();
          if (sData?.query?.search?.length > 0) {
            const title = sData.query.search[0].title;
            const sumRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
            const sumData = await sumRes.json();
            if (sumData?.extract) {
              return {
                text: sumData.extract,
                source: `VERIFIED ARCHIVE // ${sumData.title.toUpperCase()}`,
                url: sumData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`
              };
            }
          }
        } catch (e) {}
      }

      return null;
    }

    async function processCommand(rawInput) {
      const q = rawInput.trim();
      if (!q) return;

      playHudSound('chirp');
      // Spawn an interactive shockwave in the background canvas when a command is executed!
      if (typeof triggerBgShockwave === 'function') {
        triggerBgShockwave(window.innerWidth / 2, window.innerHeight / 2, '#00e5ff');
      }

      appendMessage('COMMANDER', q);
      commandInput.value = '';
      state.isProcessing = true;
      waveformMode.textContent = "COMPUTING";

      const lower = q.toLowerCase();

      // 1. Check Custom User Macros first
      const matchedMacro = (state.connectedApps.macros || []).find(m => lower === m.trigger.toLowerCase());
      if (matchedMacro) {
        state.isProcessing = false;
        appendMessage('J.A.R.V.I.S.', `Custom Macro "${matchedMacro.trigger}" triggered  Executing "${matchedMacro.action}"`, { source: 'CUSTOM MACRO' });
        processCommand(matchedMacro.action);
        return;
      }

      // 1AAAAA. Biometric Lock, Smart Environment & Focus Timer Voice Commands
      if (lower.includes('lock system') || lower.includes('lock screen') || lower.includes('engage lock') || lower === 'lock') {
        state.isProcessing = false;
        engageBiometricLock();
        return;
      }
      if (lower.includes('lights') || lower.includes('thermostat') || lower.includes('temperature to') || lower.includes('smart home') || lower.includes('smart env')) {
        state.isProcessing = false;
        openHubModal('smarthome');
        const tempMatch = lower.match(/(\d{2})\s*(?:degrees|c)?/);
        if (tempMatch) {
          iotState.acTemp = Number(tempMatch[1]);
          const acEl = document.getElementById('iot-ac-temp');
          if (acEl) acEl.textContent = `${iotState.acTemp}°C`;
        }
        if (lower.includes('off')) {
          iotState.lightsOn = false;
          updateIotUi();
        } else if (lower.includes('on')) {
          iotState.lightsOn = true;
          updateIotUi();
        }
        const reply = `Smart Environment Matrix updated: Studio lights are ${iotState.lightsOn ? 'ON' : 'OFF'}, climate set to ${iotState.acTemp} degrees Celsius, and perimeter doors are ${iotState.doorsLocked ? 'locked' : 'unlocked'}.`;
        appendMessage('J.A.R.V.I.S.', reply, { source: 'SMART ENVIRONMENT' });
        speakText(reply);
        return;
      }
      if (lower.includes('focus timer') || lower.includes('start timer') || lower.includes('pomodoro')) {
        state.isProcessing = false;
        openHubModal('smarthome');
        startFocusTimer();
        const reply = "Arc Focus Reactor timer started for a 25-minute deep work sprint.";
        appendMessage('J.A.R.V.I.S.', reply, { source: 'FOCUS REACTOR' });
        speakText(reply);
        return;
      }

      // 1AAAA. Google AI Studio Direct Launch & Bridge ("open google ai studio", "ai studio")
      if (lower.includes('ai studio') || lower.includes('aistudio')) {
        state.isProcessing = false;
        const url = 'https://aistudio.google.com/prompts/new_chat';
        dispatchRealExternalApp('Google AI Studio', url, url, 'Opening Google AI Studio (aistudio.google.com)');
        openHubModal('aistudio');
        const reply = 'Opening Google AI Studio Bridge. You can tap Open Google AI Studio to launch aistudio.google.com in a new tab, or copy the full system prompt and HTML source code right here.';
        appendMessage('J.A.R.V.I.S.', reply, { source: 'GOOGLE AI STUDIO', url });
        speakText(reply);
        return;
      }

      // 1AAA. Live Crypto, Currency & File Scanner Voice/Text Commands
      if (lower.includes('bitcoin') || lower.includes('crypto') || lower.includes('ethereum') || lower.includes('usd to inr') || lower.includes('market')) {
        state.isProcessing = false;
        openHubModal('filelab');
        const mktReport = await fetchLiveMarketRadar(true);
        appendMessage('J.A.R.V.I.S.', mktReport, { source: 'LIVE MARKET RADAR' });
        speakText(mktReport);
        return;
      }
      if (lower.includes('scan file') || lower.includes('file scanner') || lower.includes('analyze document')) {
        state.isProcessing = false;
        openHubModal('filelab');
        const reply = "Opened AI Document, CSV, and Image Scanner. Select any file or tap Run Demo Telemetry Scan.";
        appendMessage('J.A.R.V.I.S.', reply, { source: 'AI FILE SCANNER' });
        speakText(reply);
        return;
      }

      // 1AA. Autonomous Multi-Agent Swarm Commands ("deploy agent swarm...", "run agents...", "ai agents")
      if (lower.includes('agent swarm') || lower.includes('deploy agent') || lower.includes('run agents') || lower.includes('ai agents')) {
        state.isProcessing = false;
        openHubModal('agents');
        const mission = q.replace(/^(hey jarvis|jarvis)?\s*(deploy|run|launch|open|start)?\s*(autonomous|multi-agent|ai)?\s*(agent swarm|agents)\s*(for|on|to)?\s*/i, '').trim() || 'Quantum Neural OS Architecture';
        if (typeof runAutonomousAgentSwarm === 'function') {
          runAutonomousAgentSwarm(mission);
        }
        return;
      }

      // 1A. Autonomous AI Web Development Studio Commands ("build a website...", "create a web app...", "web dev")
      if (lower.includes('build a website') || lower.includes('create a website') || lower.includes('build a web') || lower.includes('web dev') || lower.includes('generate website')) {
        state.isProcessing = false;
        openHubModal('webdev');
        const promptTopic = q.replace(/^(hey jarvis|jarvis)?\s*(build|create|generate|make|open)\s*(a|an)?\s*(website|web app|webpage|web dev|site)\s*(for|about)?\s*/i, '').trim() || 'Sci-Fi AI Command Portfolio';
        if (typeof generateAiWebsiteInStudio === 'function') {
          generateAiWebsiteInStudio(promptTopic);
        }
        const reply = `Opening Autonomous AI Web Development Studio and generating a live interactive website for: ${promptTopic}.`;
        appendMessage('J.A.R.V.I.S.', reply, { source: 'AI WEB DEV STUDIO' });
        speakText(reply);
        return;
      }

      // 1B. Device Power Off, Switch On & Reboot Voice/Text Commands
      if (lower.includes('switch off') || lower.includes('power off') || lower.includes('shutdown') || lower.includes('shut down') || lower.includes('turn off')) {
        state.isProcessing = false;
        powerOffJarvisOs();
        return;
      }
      if (lower.includes('reboot') || lower.includes('restart')) {
        state.isProcessing = false;
        rebootJarvisOs();
        return;
      }

      // 1C. Satellite Phone Calling System ("Call Mom", "Call Pepper", "Call Rhodey", "Dial ...")
      if (lower.startsWith('call ') || lower.startsWith('dial ') || lower.startsWith('phone ') || lower.includes('open phone')) {
        state.isProcessing = false;
        const target = q.replace(/^(open|call|dial|phone)\s*/i, '').trim() || 'Mom';
        appendMessage('J.A.R.V.I.S.', `Opening Satellite Phone Bridge and dialing ${target}...`, { source: 'SATELLITE PHONE' });
        startJarvisPhoneCall(target);
        return;
      }

      // 1D. Enjoying Zone Commands ("Tell me a joke", "Play game", "Enjoy", "Trivia")
      if (lower.includes('joke') || lower.includes('trivia') || lower.includes('funny')) {
        state.isProcessing = false;
        tellJarvisJokeOrTrivia();
        return;
      }
      if (lower.includes('enjoy') || lower.includes('play game') || lower.includes('arcade') || lower.includes('dodger')) {
        state.isProcessing = false;
        openHubModal('enjoy');
        const reply = "Opening the Stark Enjoying Zone. Move your cursor inside the Repulsor Drone Dodger viewport or tap the tactical synth soundboard.";
        appendMessage('J.A.R.V.I.S.', reply, { source: 'ENJOYING ZONE' });
        speakText(reply);
        return;
      }

      // 2. Check Built-in Tactical Protocols
      if (lower.includes('morning brief') || lower.includes('protocol morning')) {
        state.isProcessing = false;
        executeProtocol('morning');
        return;
      }
      if (lower.includes('house party') || lower.includes('protocol house')) {
        state.isProcessing = false;
        executeProtocol('houseparty');
        return;
      }
      if (lower.includes('lockdown') || lower.includes('protocol lockdown')) {
        state.isProcessing = false;
        executeProtocol('lockdown');
        return;
      }

      // 3. REAL EXTERNAL APP & OS URI DISPATCHERS (Opens Actual External App, Not Inbuilt Clones!)
      if (lower.includes('instagram')) {
        state.isProcessing = false;
        const reply = 'Opening Instagram on your phone.';
        const url = 'https://www.instagram.com/';
        dispatchRealExternalApp('Instagram', url, 'instagram://app', reply);
        appendMessage('J.A.R.V.I.S.', reply, { source: 'EXTERNAL INSTAGRAM APP', url });
        speakText(reply);
        return;
      }
      if (lower.includes('whatsapp')) {
        state.isProcessing = false;
        const parsedWa = parseWhatsAppCommand(q);
        dispatchRealExternalApp('WhatsApp', parsedWa.webUrl, parsedWa.nativeUri, parsedWa.description);
        appendMessage('J.A.R.V.I.S.', parsedWa.spokenReply, { source: 'WHATSAPP DRAFT HANDOFF', url: parsedWa.webUrl });
        speakText(parsedWa.spokenReply);
        return;
      }
      if (lower.includes('youtube') || lower.startsWith('play ') || lower.startsWith('watch ')) {
        state.isProcessing = false;
        const yq = q.replace(/^(hey jarvis|jarvis)?\s*(open|launch|youtube|and|search|for|play|watch)\s*/gi, '').trim();
        const webUrl = yq
          ? `https://www.youtube.com/results?search_query=${encodeURIComponent(yq)}`
          : `https://www.youtube.com`;
        const nativeUri = yq
          ? `vnd.youtube://results?search_query=${encodeURIComponent(yq)}`
          : `vnd.youtube://`;
        const desc = yq ? `Opening actual YouTube app for "${yq}"` : `Opening actual YouTube app`;
        const reply = yq
          ? `Launching the external YouTube application and searching for ${yq}.`
          : `Launching the external YouTube application now, Commander.`;
        dispatchRealExternalApp('YouTube', webUrl, nativeUri, desc);
        appendMessage('J.A.R.V.I.S.', reply, { source: 'EXTERNAL YOUTUBE APP', url: webUrl });
        speakText(reply);
        return;
      }
      if (lower.includes('chrome') || lower.includes('google') || lower.includes('browser') || lower.startsWith('browse ')) {
        state.isProcessing = false;
        const bq = q.replace(/^(hey jarvis|jarvis)?\s*(open|launch|google|chrome|browser|and|search|for|browse)\s*/gi, '').trim();
        const webUrl = bq
          ? `https://www.google.com/search?q=${encodeURIComponent(bq)}`
          : `https://www.google.com`;
        const nativeUri = `googlechrome://${webUrl.replace(/^https?:\/\//, '')}`;
        const reply = bq
          ? `Opening Google Chrome externally and searching for ${bq}.`
          : `Opening Google Chrome externally now, Commander.`;
        dispatchRealExternalApp('Google Chrome', webUrl, nativeUri, `Opening Chrome${bq ? ' for ' + bq : ''}`);
        appendMessage('J.A.R.V.I.S.', reply, { source: 'EXTERNAL CHROME APP', url: webUrl });
        speakText(reply);
        return;
      }
      if (lower.includes('spotify') || lower.includes('music')) {
        state.isProcessing = false;
        const mq = q.replace(/^(open|launch|spotify|music|play)\s*/gi, '').trim();
        const webUrl = mq ? `https://open.spotify.com/search/${encodeURIComponent(mq)}` : `https://open.spotify.com`;
        const nativeUri = mq ? `spotify:search:${encodeURIComponent(mq)}` : `spotify:`;
        const reply = `Launching the external Spotify application${mq ? ' for ' + mq : ''}.`;
        dispatchRealExternalApp('Spotify', webUrl, nativeUri, 'Opening external Spotify app');
        appendMessage('J.A.R.V.I.S.', reply, { source: 'EXTERNAL SPOTIFY APP', url: webUrl });
        speakText(reply);
        return;
      }
      if (lower.includes('open gmail') || lower.includes('send email') || lower.includes('compose email')) {
        state.isProcessing = false;
        const sub = q.replace(/^(open|launch|gmail|send|compose|email|mail|about)\s*/gi, '').trim() || 'J.A.R.V.I.S. Dispatch';
        const webUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(sub)}`;
        const nativeUri = `mailto:?subject=${encodeURIComponent(sub)}`;
        const reply = `Launching external Gmail composer with subject "${sub}".`;
        dispatchRealExternalApp('Gmail', webUrl, nativeUri, `Composing email: "${sub}"`);
        appendMessage('J.A.R.V.I.S.', reply, { source: 'EXTERNAL GMAIL APP', url: webUrl });
        speakText(reply);
        return;
      }
      if (lower.includes('open calendar') || lower.includes('open schedule')) {
        state.isProcessing = false;
        openHubModal('calendar');
        const reply = `Opening Calendar Events workspace.`;
        appendMessage('J.A.R.V.I.S.', reply, { source: 'CALENDAR HUB' });
        speakText(reply);
        return;
      }
      if (lower.includes('open mail') || lower.includes('open comms')) {
        state.isProcessing = false;
        openHubModal('mail');
        const reply = `Opening Encrypted Comms & Mail workspace.`;
        appendMessage('J.A.R.V.I.S.', reply, { source: 'COMMS HUB' });
        speakText(reply);
        return;
      }
      if (lower.includes('open camera') || lower.includes('open vision')) {
        state.isProcessing = false;
        openHubModal('vision');
        const reply = `Opening Mark VII Optical Vision HUD.`;
        appendMessage('J.A.R.V.I.S.', reply, { source: 'VISION HUD' });
        speakText(reply);
        return;
      }

      // 4. Location Change ("set location to <city>" or "weather in <city>")
      const locMatch = q.match(/^(?:set location to|change location to|weather in)\s+(.+)$/i);
      if (locMatch && locMatch[1]) {
        const targetCity = locMatch[1].trim();
        const found = await searchAndSetGlobalCity(targetCity);
        state.isProcessing = false;
        if (found) {
          const wReport = await fetchLiveWeather();
          const reply = `Global coordinates recalibrated to ${state.location.city}. ${wReport}`;
          appendMessage('J.A.R.V.I.S.', reply, { source: 'GEODESIC TELEMETRY' });
          speakText(reply);
        } else {
          const errReply = `Could not locate "${targetCity}" in orbital geocoding directory.`;
          appendMessage('J.A.R.V.I.S.', errReply, { source: 'GEODESIC TELEMETRY' });
          speakText(errReply);
        }
        return;
      }

      // 5. Engineering Math & Calculations (e.g. "calculate 25 * 48", "what is 144 / 12", "sqrt(256)")
      const mathClean = q.replace(/^(what is|calculate|calc|compute|evaluate|solve)\s+/i, '').replace(/[?=]+$/, '').trim();
      if (/^[0-9(]+\s*[\+\-\*\/\^%]/.test(mathClean) || /^(sqrt|sin|cos|tan)\s*\(/i.test(mathClean)) {
        const mathVal = evaluateEngineeringMath(mathClean);
        if (mathVal !== null) {
          state.isProcessing = false;
          const resp = `The exact result of ${mathClean} is ${mathVal}.`;
          appendMessage('J.A.R.V.I.S.', resp, { source: 'MATH CO-PROCESSOR' });
          speakText(resp);
          return;
        }
      }

      // 5B. Autonomous Neural Memory Commands ("Remember that...", "My name is...", "What do you remember?")
      if (/^(remember that|remember|note that|my name is)\s+/i.test(lower)) {
        state.isProcessing = false;
        const fact = q.replace(/^(remember that|remember|note that)\s+/i, '').trim();
        if (!state.connectedApps.memories) state.connectedApps.memories = [];
        state.connectedApps.memories.unshift({ id: Date.now(), text: fact, time: new Date().toLocaleTimeString() });
        saveAppsState();
        if (typeof renderNeuralMemories === 'function') renderNeuralMemories();
        const reply = `Stored in persistent neural memory: "${fact}". I will remember this across all future sessions, Commander.`;
        appendMessage('J.A.R.V.I.S.', reply, { source: 'NEURAL MEMORY BANK' });
        speakText(reply);
        return;
      }
      if (lower.includes('what do you remember') || lower.includes('show memory') || lower.includes('my memories')) {
        state.isProcessing = false;
        const mems = state.connectedApps.memories || [];
        const reply = mems.length
          ? `I currently hold ${mems.length} facts in your persistent neural memory: ${mems.map(m => m.text).join(' | ')}.`
          : `Your persistent neural memory bank has no custom entries yet. Say "Remember that..." to teach me any personal fact.`;
        appendMessage('J.A.R.V.I.S.', reply, { source: 'NEURAL MEMORY BANK' });
        speakText(reply);
        return;
      }

      // 6. Instant Precision Facts (Greetings, Time, Date, Unit Conversions, Capitals, Constants)
      const instantFact = checkInstantPrecisionFacts(q);
      if (instantFact) {
        state.isProcessing = false;
        waveformMode.textContent = "STANDBY";
        playHudSound('confirm');
        appendMessage('J.A.R.V.I.S.', instantFact.text, { source: instantFact.source });
        speakText(instantFact.text);
        return;
      }

      // 7. Add Event / Add Task
      if (lower.startsWith('add event')) {
        state.isProcessing = false;
        const body = q.replace(/^add event:?\s*/i, '').trim();
        state.connectedApps.calendar.unshift({ id: Date.now(), time: "18:00", title: body || "Tactical Briefing", status: "SCHEDULED" });
        saveAppsState();
        const resp = `Event "${body}" logged to your persistent Calendar Bridge.`;
        appendMessage('J.A.R.V.I.S.', resp, { source: 'CALENDAR BRIDGE' });
        speakText(resp);
        return;
      }
      if (lower.startsWith('add task') || lower.startsWith('remind me')) {
        state.isProcessing = false;
        const taskText = q.replace(/^(add task:?|remind me to)\s*/i, '').trim();
        if (taskText) {
          state.connectedApps.tasks.push({ id: Date.now(), text: taskText, done: false });
          saveAppsState();
          const resp = `Directive "${taskText}" added to your persistent task queue.`;
          appendMessage('J.A.R.V.I.S.', resp, { source: 'TASK BRIDGE' });
          speakText(resp);
          return;
        }
      }

      // 8. Schedule / Emails / Diagnostics / Weather
      if (lower.includes('schedule') || lower.includes('calendar')) {
        state.isProcessing = false;
        const summary = state.connectedApps.calendar.map(e => `${e.time} (${e.title})`).join(' • ');
        const resp = `Calendar Bridge holds ${state.connectedApps.calendar.length} events: ${escapeHTML(summary)}.`;
        appendMessage('J.A.R.V.I.S.', resp, { source: 'CALENDAR BRIDGE' });
        speakText(resp);
        return;
      }
      if (lower.includes('mail') || lower.includes('email') || lower.includes('inbox')) {
        state.isProcessing = false;
        const summary = state.connectedApps.emails.map(m => `${m.from}: "${m.subject}"`).join(' | ');
        const resp = `Comms Hub holds ${state.connectedApps.emails.length} messages: ${escapeHTML(summary)}.`;
        appendMessage('J.A.R.V.I.S.', resp, { source: 'COMMS HUB' });
        speakText(resp);
        return;
      }
      if (lower.includes('diagnostic') || lower.includes('system status')) {
        state.isProcessing = false;
        const resp = "Local interface diagnostics completed. Hardware performance and external service availability are not measured by this browser view.";
        appendMessage('J.A.R.V.I.S.', resp, { source: 'MARK VIII CAD' });
        speakText(resp);
        return;
      }
      if (lower.includes('weather') || lower.includes('temperature')) {
        const wText = await fetchLiveWeather();
        state.isProcessing = false;
        appendMessage('J.A.R.V.I.S.', wText, { source: 'OPEN-METEO LIVE' });
        speakText(wText);
        return;
      }

      // 9. Exact Multi-API World Intelligence Query (Live AI + DuckDuckGo + Smart Wikipedia)
      const exactResult = await queryExactWorldIntelligence(q);
      state.isProcessing = false;
      waveformMode.textContent = "STANDBY";

      if (exactResult) {
        playHudSound('confirm');
        appendMessage('J.A.R.V.I.S.', exactResult.text, { source: exactResult.source, url: exactResult.url });
        speakText(exactResult.text);
      } else {
        const fallback = `I searched global telemetry for "${q}". Could you specify the exact subject, mathematical calculation, or command you want me to execute, Sir?`;
        appendMessage('J.A.R.V.I.S.', fallback, { source: 'NEURAL CORE' });
        speakText(fallback);
      }
    }

    // --- BUTTON & FORM LISTENERS ---
    commandForm.addEventListener('submit', (e) => {
      e.preventDefault();
      processCommand(commandInput.value);
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => processCommand(btn.textContent.replace(/["']/g, '').trim()));
    });

    document.querySelectorAll('.world-node-btn').forEach(btn => {
      btn.addEventListener('click', () => processCommand(`Search ${btn.getAttribute('data-topic')}`));
    });

    document.getElementById('quick-cal-btn').addEventListener('click', () => openHubModal('calendar'));
    document.getElementById('quick-mail-btn').addEventListener('click', () => openHubModal('mail'));
    document.getElementById('quick-task-btn').addEventListener('click', () => openHubModal('tasks'));
    document.getElementById('quick-notes-btn').addEventListener('click', () => openHubModal('notes'));
    document.getElementById('quick-diag-btn').addEventListener('click', () => processCommand('Run full system diagnostic'));
    document.getElementById('quick-world-btn').addEventListener('click', () => processCommand('Search Artificial Intelligence'));
    document.getElementById('quick-weather-btn').addEventListener('click', () => processCommand('Live weather telemetry'));



    clearFeedBtn.addEventListener('click', () => {
      playHudSound('chirp');
      messagesContainer.innerHTML = '';
      appendMessage('J.A.R.V.I.S.', 'Neural command log cleared. All CAD telemetry and persistent app bridges remain online.', { source: 'SYSTEM RESET' });
      showToast('Command Log Cleared');
    });

    // =========================================================================
    // UNIFIED VISUAL VOICE RECOGNITION ENGINE (WITH REAL-TIME TRANSCRIPT & FALLBACK)
    // =========================================================================
    const micLiveDot = document.getElementById('mic-live-dot');
    const micLiveState = document.getElementById('mic-live-state');
    const liveTranscriptPreview = document.getElementById('live-transcript-preview');
    const micVuMeter = document.getElementById('mic-vu-meter');
    let activeRecognition = null;
    let isMicListening = false;
    let vuInterval = null;

    function setMicVisualState(mode, statusText, transcriptText = null) {
      if (!micLiveDot || !micLiveState) return;
      if (mode === 'listening') {
        micLiveDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping';
        micLiveState.textContent = statusText || 'MIC: LISTENING  -  SPEAK NOW...';
        micLiveState.className = 'text-rose-400 font-bold';
        micBtn.className = 'px-2.5 py-1.5 bg-rose-600 border border-white text-white text-xs font-mono-hud animate-pulse';
        if (!vuInterval) {
          vuInterval = setInterval(() => {
            if (micVuMeter) {
              Array.from(micVuMeter.children).forEach(bar => {
                bar.style.height = (3 + Math.floor(Math.random() * 10)) + 'px';
              });
            }
          }, 90);
        }
      } else if (mode === 'heard') {
        micLiveDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
        micLiveState.textContent = statusText || 'MIC: COMMAND CAPTURED';
        micLiveState.className = 'text-emerald-400 font-bold';
        micBtn.className = 'px-2.5 py-1.5 bg-cyan-950/70 border border-cyan-500/40 hover:border-amber-400 text-cyan-300 text-xs font-mono-hud';
        if (vuInterval) { clearInterval(vuInterval); vuInterval = null; }
      } else if (mode === 'blocked') {
        micLiveDot.className = 'w-2 h-2 rounded-full bg-amber-400';
        micLiveState.textContent = statusText || 'SANDBOX BLOCKED MIC  -  USE  TEST VOICE OR INSTALL .HTML';
        micLiveState.className = 'text-amber-400 font-bold';
        micBtn.className = 'px-2.5 py-1.5 bg-cyan-950/70 border border-cyan-500/40 hover:border-amber-400 text-cyan-300 text-xs font-mono-hud';
        if (vuInterval) { clearInterval(vuInterval); vuInterval = null; }
      } else {
        micLiveDot.className = 'w-2 h-2 rounded-full bg-slate-600';
        micLiveState.textContent = statusText || 'MIC: IDLE (Click  or  TEST VOICE CMD)';
        micLiveState.className = 'text-cyan-300 font-bold';
        micBtn.className = 'px-2.5 py-1.5 bg-cyan-950/70 border border-cyan-500/40 hover:border-amber-400 text-cyan-300 text-xs font-mono-hud';
        if (vuInterval) { clearInterval(vuInterval); vuInterval = null; }
      }
      if (transcriptText !== null && liveTranscriptPreview) {
        liveTranscriptPreview.textContent = transcriptText;
      }
    }

    function startVoiceCapture() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setMicVisualState('blocked', 'BROWSER SPEECH API UNAVAILABLE  -  USE VOICE DEMO BUTTON');
        showToast('Live speech recognition is not supported in this browser. Use the separately labelled Voice Demo button to test the command flow.', 'error');
        return;
      }

      if (isMicListening && activeRecognition) {
        try { activeRecognition.stop(); } catch (e) {}
        isMicListening = false;
        setMicVisualState('idle');
        return;
      }

      try {
        activeRecognition = new SpeechRecognition();
        activeRecognition.lang = 'en-US';
        activeRecognition.continuous = false;
        activeRecognition.interimResults = true; // Show live words as the user speaks!

        activeRecognition.onstart = () => {
          isMicListening = true;
          playHudSound('chirp');
          reactorSurge = 2.6;
          setMicVisualState('listening', 'MIC: LISTENING LIVE  -  SPEAK NOW...', 'Listening for your words...');
        };

        activeRecognition.onresult = (ev) => {
          let interimText = '';
          let finalText = '';
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            const t = ev.results[i][0].transcript;
            if (ev.results[i].isFinal) finalText += t;
            else interimText += t;
          }
          const currentWords = (finalText || interimText).trim();
          if (currentWords) {
            commandInput.value = currentWords;
            setMicVisualState('listening', 'MIC: HEARING WORDS...', `Heard: "${currentWords}"`);
          }
          if (finalText.trim()) {
            const cleanCmd = finalText.trim().replace(/^(hey jarvis|ok jarvis|jarvis)\s*,?\s*/i, '');
            setMicVisualState('heard', 'MIC: EXECUTING VOICE COMMAND', `Executed: "${cleanCmd}"`);
            playHudSound('confirm');
            processCommand(cleanCmd);
          }
        };

        activeRecognition.onerror = (err) => {
          isMicListening = false;
          // When running inside a sandboxed preview iframe, Chrome blocks raw hardware mic unless opened as a standalone file in Chrome.
          // Immediately activate Interactive Voice Assist & focus the command input so the user isn't stuck!
          commandInput.focus();
          setMicVisualState(
            'blocked',
            'PREVIEW IFRAME MIC RESTRICTED  -  OPEN IN CHROME (⬇ INSTALL .HTML) OR USE  TEST VOICE CMD',
            'Say/Type: "Open WhatsApp", "Open YouTube", "Open Chrome", "Check schedule"...'
          );
          showToast('Iframe restricts raw mic  -  running Interactive Voice Demo! (Or click ⬇ INSTALL .HTML to open in Chrome)');
          runSimulatedVoiceDemo();
        };

        activeRecognition.onend = () => {
          isMicListening = false;
          if (micLiveState && micLiveState.textContent.includes('LISTENING')) {
            setMicVisualState('idle', 'MIC: IDLE (Click  to speak again)');
          }
        };

        activeRecognition.start();
      } catch (e) {
        setMicVisualState('blocked', 'MIC BLOCKED IN IFRAME  -  CLICK  TEST VOICE CMD');
      }
    }

    micBtn.addEventListener('click', startVoiceCapture);

    // Simulated Voice Command Tester (So user can see & test the exact live voice pipeline even inside a restricted iframe)
    const sampleVoiceCommands = [
      'Open WhatsApp and message Mom Hello I am on my way',
      'Open YouTube and search Iron Man soundtrack',
      'What is the speed of light?',
      'Call Pepper Potts',
      'Protocol Morning Briefing'
    ];
    let sampleVoiceIdx = 0;

    function runSimulatedVoiceDemo() {
      const phrase = sampleVoiceCommands[sampleVoiceIdx % sampleVoiceCommands.length];
      sampleVoiceIdx++;
      playHudSound('chirp');
      setMicVisualState('listening', 'VOICE SIMULATOR: CAPTURING SPEECH...', 'Speaking: "..."');
      commandInput.value = '';
      const words = phrase.split(' ');
      let built = '';
      words.forEach((w, idx) => {
        setTimeout(() => {
          built += (idx === 0 ? '' : ' ') + w;
          commandInput.value = built;
          setMicVisualState('listening', 'VOICE SIMULATOR: HEARING WORDS...', `Heard: "${built}..."`);
          if (idx === words.length - 1) {
            setTimeout(() => {
              setMicVisualState('heard', 'VOICE COMMAND EXECUTED', `Voice Executed: "${phrase}"`);
              playHudSound('confirm');
              processCommand(phrase);
            }, 320);
          }
        }, (idx + 1) * 220);
      });
    }

    document.getElementById('sim-voice-btn').addEventListener('click', runSimulatedVoiceDemo);

    // =========================================================================
    // STEP 4: ARMOR HUD COLOR MATRIX, PROTOCOLS, CUSTOM MACROS & JSON BACKUP
    // =========================================================================
    const hudThemes = [
      { id: 'mark7', name: 'HUD: MARK VII', primary: '#00e5ff', accent: '#ff7b00', dotClass: 'bg-cyan-400', filter: 'none' },
      { id: 'hulkbuster', name: 'HUD: HULKBUSTER', primary: '#ff2a55', accent: '#ffaa00', dotClass: 'bg-rose-500', filter: 'hue-rotate(145deg) saturate(1.25)' },
      { id: 'stealthgold', name: 'HUD: STEALTH GOLD', primary: '#fbbf24', accent: '#00e5ff', dotClass: 'bg-amber-400', filter: 'hue-rotate(210deg) saturate(1.15)' }
    ];
    let currentThemeIdx = 0;

    function applyHudTheme(index) {
      currentThemeIdx = index % hudThemes.length;
      const t = hudThemes[currentThemeIdx];
      document.documentElement.style.setProperty('--cyan', t.primary);
      document.documentElement.style.setProperty('--amber', t.accent);
      // Apply crisp hue shift to the tactical canvases for authentic suit mode change
      [coreCanvas, turbineCanvas, jarvisRingCanvas, armorBlueprintsCanvas, radarCanvas, globeCanvas].forEach(c => {
        if (c) c.style.filter = t.filter;
      });
      const lbl = document.getElementById('theme-label');
      const ind = document.getElementById('theme-indicator');
      if (lbl) lbl.textContent = t.name;
      if (ind) ind.className = `w-1.5 h-1.5 rounded-full ${t.dotClass}`;
      playHudSound('confirm');
      showToast(`Armor Optics Shifted: ${t.name}`);
    }

    document.getElementById('cycle-theme-btn').addEventListener('click', () => {
      applyHudTheme(currentThemeIdx + 1);
    });

    // Ensure custom macros array exists in state.connectedApps
    if (!Array.isArray(state.connectedApps.macros)) state.connectedApps.macros = [];

    function renderCustomMacros() {
      const listEl = document.getElementById('custom-macros-list');
      if (!listEl) return;
      listEl.innerHTML = (state.connectedApps.macros || []).map(m => `
        <div class="flex items-center justify-between p-2 bg-slate-950/90 border border-cyan-500/25">
          <div>
            <span class="text-emerald-400 font-bold">"${escapeHTML(m.trigger)}"</span>
            <span class="text-slate-500 mx-1.5"></span>
            <span class="text-cyan-200">${escapeHTML(m.action)}</span>
          </div>
          <div class="flex items-center space-x-2">
            <button type="button" data-run-macro="${escapeHTML(Number(m.id) || 0)}" class="px-2 py-0.5 bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:border-amber-400 text-[10px]">RUN</button>
            <button type="button" data-del-macro="${escapeHTML(Number(m.id) || 0)}" class="text-rose-400 hover:text-rose-300 text-[10px]">[DEL]</button>
          </div>
        </div>
      `).join('');

      document.querySelectorAll('[data-run-macro]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-run-macro'));
          const macro = state.connectedApps.macros.find(x => Number(x.id) === id);
          if (macro) {
            appHubModal.classList.add('hidden');
            appHubModal.classList.remove('flex');
            processCommand(macro.action);
          }
        });
      });

      document.querySelectorAll('[data-del-macro]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-del-macro'));
          state.connectedApps.macros = state.connectedApps.macros.filter(x => Number(x.id) !== id);
          playHudSound('chirp');
          saveAppsState();
          renderCustomMacros();
        });
      });
    }
    renderCustomMacros();

    document.getElementById('add-macro-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const trigger = document.getElementById('macro-trigger-input').value.trim();
      const action = document.getElementById('macro-action-input').value.trim();
      if (trigger && action) {
        state.connectedApps.macros.push({ id: Date.now(), trigger, action });
        document.getElementById('macro-trigger-input').value = '';
        document.getElementById('macro-action-input').value = '';
        playHudSound('confirm');
        saveAppsState();
        renderCustomMacros();
        showToast(`Macro "${trigger}" Saved`);
      }
    });

    // --- MULTI-STEP STARK AUTOMATION PROTOCOLS ---
    async function executeProtocol(protoName) {
      playHudSound('pulse');
      reactorSurge = 3.5;
      turbineBoost = 3.8;

      if (protoName === 'morning') {
        applyHudTheme(0); // Mark VII Cyan
        const weatherText = await fetchLiveWeather();
        const calCount = state.connectedApps.calendar.length;
        const nextEv = state.connectedApps.calendar[0] ? `${state.connectedApps.calendar[0].time} (${state.connectedApps.calendar[0].title})` : 'No immediate events';
        const pendingTasks = state.connectedApps.tasks.filter(t => !t.done).map(t => t.text).join(', ') || 'All directives completed';
        const unreadCount = state.connectedApps.emails.length;

        const briefing = `PROTOCOL MORNING BRIEFING EXECUTED: Good day, Commander. ${weatherText} You have ${calCount} scheduled events today, starting with ${nextEv}. Comms Hub holds ${unreadCount} priority transmissions, and your active directive queue is: ${pendingTasks}.`;
        appendMessage('J.A.R.V.I.S.', briefing, { source: 'PROTOCOL // MORNING BRIEF' });
        speakText(briefing);
      } else if (protoName === 'houseparty') {
        applyHudTheme(2); // Stealth Gold
        reactorSurge = 4.2;
        turbineBoost = 5.0;
        const msg = "HOUSE PARTY VISUAL SIMULATION ACTIVATED. Local interface effects updated. No physical armor, orbital uplink, or hardware controls are connected.";
        appendMessage('J.A.R.V.I.S.', msg, { source: 'PROTOCOL // HOUSE PARTY' });
        speakText(msg);
      } else if (protoName === 'lockdown') {
        applyHudTheme(1); // Crimson Hulkbuster
        state.privacyMasked = true;
        state.ramApiKey = null;
        document.getElementById('vault-status-label').textContent = 'GEMINI KEY: NOT SET';
        const msg = "S.H.I.E.L.D. LOCKDOWN PROTOCOL ENGAGED: Perimeter firewalls sealed, public IP address not collected, volatile RAM API keys purged, and Mark XLIV Hulkbuster defensive optics online.";
        appendMessage('J.A.R.V.I.S.', msg, { source: 'PROTOCOL // LOCKDOWN' });
        speakText(msg);
      }
    }

    document.getElementById('proto-morning-btn').addEventListener('click', () => executeProtocol('morning'));
    document.getElementById('proto-houseparty-btn').addEventListener('click', () => executeProtocol('houseparty'));
    document.getElementById('proto-lockdown-btn').addEventListener('click', () => executeProtocol('lockdown'));

    document.getElementById('modal-proto-morning').addEventListener('click', () => {
      appHubModal.classList.add('hidden');
      appHubModal.classList.remove('flex');
      executeProtocol('morning');
    });
    document.getElementById('modal-proto-houseparty').addEventListener('click', () => {
      appHubModal.classList.add('hidden');
      appHubModal.classList.remove('flex');
      executeProtocol('houseparty');
    });
    document.getElementById('modal-proto-lockdown').addEventListener('click', () => {
      appHubModal.classList.add('hidden');
      appHubModal.classList.remove('flex');
      executeProtocol('lockdown');
    });

    // --- JSON SNAPSHOT EXPORT / IMPORT ---
    document.getElementById('export-json-btn').addEventListener('click', () => {
      playHudSound('confirm');
      const payload = JSON.stringify(state.connectedApps, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'jarvis_workspace_backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Workspace Snapshot Exported (.JSON)');
    });

    document.getElementById('import-json-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (parsed && Array.isArray(parsed.calendar) && Array.isArray(parsed.tasks)) {
            state.connectedApps = parsed;
            saveAppsState();
            renderCustomMacros();
            playHudSound('confirm');
            showToast('Workspace Snapshot Restored!');
          } else {
            showToast('Invalid JSON backup structure.');
          }
        } catch (err) {
          showToast('Failed to parse JSON file.');
        }
      };
      reader.readAsText(file);
    });

    // --- CONTINUOUS VOICE WAKE-WORD LISTENER ---
    let wakeRecognition = null;
    let wakeActive = false;
    const toggleWakeBtn = document.getElementById('toggle-wake-btn');
    const wakeIndicator = document.getElementById('wake-indicator');
    const wakeLabel = document.getElementById('wake-label');

    toggleWakeBtn.addEventListener('click', () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showToast('Continuous Speech API unavailable in this browser.');
        return;
      }
      wakeActive = !wakeActive;
      if (wakeActive) {
        try {
          wakeRecognition = new SpeechRecognition();
          wakeRecognition.lang = 'en-US';
          wakeRecognition.continuous = true;
          wakeRecognition.interimResults = false;
          wakeRecognition.onresult = (ev) => {
            const last = ev.results[ev.results.length - 1][0].transcript.trim();
            if (last) {
              const cleaned = last.replace(/^(hey jarvis|jarvis)\s*/i, '').trim();
              processCommand(cleaned || last);
            }
          };
          wakeRecognition.onend = () => {
            if (wakeActive) {
              try { wakeRecognition.start(); } catch (e) {}
            }
          };
          wakeRecognition.start();
          wakeIndicator.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping';
          wakeLabel.textContent = 'WAKE: LISTENING';
          playHudSound('confirm');
          showToast("Continuous Voice Link Active ('Hey Jarvis...')");
        } catch (e) {
          wakeActive = false;
          showToast('Microphone permission required for Wake Mode.');
        }
      } else {
        if (wakeRecognition) {
          try { wakeRecognition.stop(); } catch (e) {}
        }
        wakeIndicator.className = 'w-1.5 h-1.5 rounded-full bg-slate-600';
        wakeLabel.textContent = 'WAKE: STANDBY';
        playHudSound('chirp');
        showToast('Continuous Voice Link Standby');
      }
    });


    // =========================================================================
    // STEP 5: PRECISION GPS-FIRST LOCATION ENGINE (NO ISP GATEWAY MISMATCH)
    // =========================================================================
    async function syncLocationAndWeather(cityName, lat, lon, countryCode = '', sourceTag = 'GPS/AUTO', saveManual = false) {
      state.location = { city: cityName, lat: Number(lat), lon: Number(lon), country: countryCode };
      const labelStr = countryCode ? `${cityName.toUpperCase()}, ${countryCode.toUpperCase()}` : cityName.toUpperCase();
      const envCityEl = document.getElementById('env-city');
      const globeLocEl = document.getElementById('globe-loc-label');
      const locReadoutEl = document.getElementById('loc-status-readout');

      if (envCityEl) envCityEl.textContent = labelStr;
      if (globeLocEl) globeLocEl.textContent = `${cityName.toUpperCase()} // ${Number(lat).toFixed(2)}°N`;
      if (locReadoutEl) locReadoutEl.textContent = `[${sourceTag}] ${labelStr} (${Number(lat).toFixed(3)}, ${Number(lon).toFixed(3)})`;

      if (saveManual) {
        try {
          localStorage.setItem('jarvis_manual_location_v2', JSON.stringify(state.location));
        } catch (e) {}
      }

      await fetchLiveWeather();
    }

    // Reverse-geocode exact latitude/longitude into the true city name
    async function reverseGeocodeCoords(lat, lon) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`);
        const data = await res.json();
        const addr = data?.address || {};
        const city = addr.city || addr.town || addr.municipality || addr.county || addr.state_district || addr.state;
        const country = addr.country_code || '';
        if (city) return { city, country };
      } catch (e) {}
      try {
        const res2 = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        const data2 = await res2.json();
        const city2 = data2?.city || data2?.locality || data2?.principalSubdivision;
        const country2 = data2?.countryCode || '';
        if (city2) return { city: city2, country: country2 };
      } catch (e) {}
      return null;
    }

    // Purge any stale ISP-cached city from earlier versions (which cached "Ahmedabad" from ISP routing)
    try { localStorage.removeItem('jarvis_saved_location'); } catch (e) {}

    async function autoDetectVisitorLocation(forceGpsPrompt = false) {
      // 1. If the user manually locked a specific city earlier, honor it unless they clicked Auto-Detect
      if (!forceGpsPrompt) {
        try {
          const manualSaved = localStorage.getItem('jarvis_manual_location_v2');
          if (manualSaved) {
            const parsed = JSON.parse(manualSaved);
            if (parsed && parsed.city && parsed.lat != null) {
              await syncLocationAndWeather(parsed.city, parsed.lat, parsed.lon, parsed.country || '', 'MANUAL LOCK', false);
              return;
            }
          }
        } catch (e) {}
      } else {
        try { localStorage.removeItem('jarvis_manual_location_v2'); } catch (e) {}
      }

      // 2. Immediately sync with the verified local node coordinates (Surat, IN 21.1702°N, 72.8311°E)
      //    so the HUD never flashes an inaccurate ISP backbone hub like Ahmedabad on load.
      await syncLocationAndWeather(state.location.city || 'Surat', state.location.lat || 21.1702, state.location.lon || 72.8311, 'IN', 'LOCAL NODE', false);

      // 3. Request High-Accuracy Hardware GPS / Wi-Fi Triangulation from the browser.
      //    When any user opens the app and allows location, exact device coordinates override everything.
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            const resolved = await reverseGeocodeCoords(latitude, longitude);
            const city = resolved?.city || state.location.city || 'GPS Node';
            const country = resolved?.country || 'IN';
            await syncLocationAndWeather(city, latitude, longitude, country, 'EXACT GPS', false);
            if (forceGpsPrompt) showToast(`Exact GPS Locked: ${city.toUpperCase()}`);
          },
          async () => {
            // If GPS permission is blocked/unavailable in the sandboxed iframe AND user isn't in Indian Standard Time,
            // fall back to multi-provider IP lookup for international visitors.
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
            const isIndianTz = tz.includes('Calcutta') || tz.includes('Kolkata') || (new Date().getTimezoneOffset() === -330);
            if (!isIndianTz) {
              try {
                // IP-based geolocation is intentionally disabled.
              } catch (e) {}
            }
            if (forceGpsPrompt) {
              showToast(`Telemetry Calibrated: ${state.location.city.toUpperCase()}`);
            }
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
        );
      }
    }
    // Location is requested only when the user activates a location control.

    // Search Any City Worldwide via Open-Meteo Geocoding API (Manual Override)
    async function searchAndSetGlobalCity(cityName) {
      const q = cityName.trim();
      if (!q) return false;
      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();
        if (geoData?.results?.length > 0) {
          const place = geoData.results[0];
          await syncLocationAndWeather(place.name, place.latitude, place.longitude, place.country_code || '', 'MANUAL SYNC', true);
          playHudSound('confirm');
          showToast(`Location Telemetry Locked: ${place.name}, ${place.country || ''}`);
          return true;
        } else {
          showToast(`City "${q}" not found in global database.`);
        }
      } catch (e) {
        showToast('Network error searching city coordinates.');
      }
      return false;
    }

    document.getElementById('change-loc-btn').addEventListener('click', () => {
      openHubModal('hololab');
    });

    document.getElementById('gps-detect-btn').addEventListener('click', () => {
      playHudSound('chirp');
      showToast('Acquiring High-Accuracy GPS & Local Node Telemetry...');
      autoDetectVisitorLocation(true);
    });

    document.getElementById('city-search-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('city-search-input');
      const ok = await searchAndSetGlobalCity(input.value);
      if (ok) input.value = '';
    });

    // --- INTERACTIVE 3D HOLOGRAPHIC CAD INSPECTOR (holo3dCanvas) ---
    const holo3dCanvas = document.getElementById('holo3dCanvas');
    const holoCtx = holo3dCanvas ? holo3dCanvas.getContext('2d') : null;
    let holoPitch = 0.45;
    let holoYaw = 1.15;
    let holoZoom = 1.0;
    let holoDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let currentHoloMesh = 'reactor';

    if (holo3dCanvas) {
      holo3dCanvas.addEventListener('mousedown', (e) => {
        holoDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      });
      window.addEventListener('mouseup', () => { holoDragging = false; });
      window.addEventListener('mousemove', (e) => {
        if (!holoDragging) return;
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        holoYaw += dx * 0.012;
        holoPitch = Math.max(-1.4, Math.min(1.4, holoPitch + dy * 0.012));
        const angEl = document.getElementById('holo-angles');
        if (angEl) angEl.textContent = `${holoPitch.toFixed(2)} / ${holoYaw.toFixed(2)} RAD`;
      });
    }

    document.getElementById('holo-zoom-slider').addEventListener('input', (e) => {
      holoZoom = Number(e.target.value) / 100;
    });

    document.querySelectorAll('.holo-mesh-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentHoloMesh = btn.getAttribute('data-mesh');
        playHudSound('chirp');
        document.querySelectorAll('.holo-mesh-btn').forEach(b => {
          b.className = b === btn
            ? 'holo-mesh-btn px-2 py-0.5 bg-cyan-500 text-black font-bold text-[10px]'
            : 'holo-mesh-btn px-2 py-0.5 bg-slate-900 border border-cyan-500/40 text-cyan-300 text-[10px]';
        });
      });
    });

    function project3DPoint(x, y, z, cx, cy, scale) {
      // Rotate around Y (Yaw)
      const cosY = Math.cos(holoYaw);
      const sinY = Math.sin(holoYaw);
      const x1 = x * cosY - z * sinY;
      const z1 = z * cosY + x * sinY;
      // Rotate around X (Pitch)
      const cosP = Math.cos(holoPitch);
      const sinP = Math.sin(holoPitch);
      const y2 = y * cosP - z1 * sinP;
      const z2 = z1 * cosP + y * sinP;

      const fov = 260;
      const dist = 220 + z2;
      const p = (fov / Math.max(40, dist)) * scale;
      return { x: cx + x1 * p, y: cy + y2 * p, z: z2 };
    }

    let lastHoloFrame = 0;
    function renderHolo3DCad() {
      if (document.hidden) return;
      const frameNow = performance.now();
      if (frameNow - lastHoloFrame < 33) { requestAnimationFrame(renderHolo3DCad); return; }
      lastHoloFrame = frameNow;
      if (!holoCtx) return;
      const w = holo3dCanvas.width;
      const h = holo3dCanvas.height;
      const cx = w / 2;
      const cy = h / 2;
      holoCtx.clearRect(0, 0, w, h);

      if (!holoDragging) {
        holoYaw += 0.008;
      }

      holoCtx.strokeStyle = 'rgba(0, 229, 255, 0.72)';
      holoCtx.lineWidth = 1;

      if (currentHoloMesh === 'reactor') {
        // 3D Torus / Tokamak Arc Reactor Mesh
        const R = 52;
        const r = 18;
        const uSteps = 16;
        const vSteps = 10;
        for (let i = 0; i < uSteps; i++) {
          const u1 = (i / uSteps) * Math.PI * 2;
          const u2 = ((i + 1) / uSteps) * Math.PI * 2;
          holoCtx.beginPath();
          for (let j = 0; j <= vSteps; j++) {
            const v = (j / vSteps) * Math.PI * 2;
            const px = (R + r * Math.cos(v)) * Math.cos(u1);
            const py = (R + r * Math.cos(v)) * Math.sin(u1);
            const pz = r * Math.sin(v);
            const pt = project3DPoint(px, py, pz, cx, cy, holoZoom);
            if (j === 0) holoCtx.moveTo(pt.x, pt.y);
            else holoCtx.lineTo(pt.x, pt.y);
          }
          holoCtx.stroke();

          // Longitudinal ring connections
          const ptA = project3DPoint((R + r) * Math.cos(u1), (R + r) * Math.sin(u1), 0, cx, cy, holoZoom);
          const ptB = project3DPoint((R + r) * Math.cos(u2), (R + r) * Math.sin(u2), 0, cx, cy, holoZoom);
          holoCtx.strokeStyle = '#ff7b00';
          holoCtx.beginPath();
          holoCtx.moveTo(ptA.x, ptA.y);
          holoCtx.lineTo(ptB.x, ptB.y);
          holoCtx.stroke();
          holoCtx.strokeStyle = 'rgba(0, 229, 255, 0.72)';
        }
      } else {
        // 3D Orbital Defense Satellite Wireframe
        const bodyVerts = [
          [-25, -25, -40], [25, -25, -40], [25, 25, -40], [-25, 25, -40],
          [-25, -25, 40], [25, -25, 40], [25, 25, 40], [-25, 25, 40],
          [-95, -12, 0], [-25, -12, 0], [-25, 12, 0], [-95, 12, 0],
          [25, -12, 0], [95, -12, 0], [95, 12, 0], [25, 12, 0]
        ];
        const pts = bodyVerts.map(v => project3DPoint(v[0], v[1], v[2], cx, cy, holoZoom));
        const edges = [
          [0,1],[1,2],[2,3],[3,0], [4,5],[5,6],[6,7],[7,4], [0,4],[1,5],[2,6],[3,7],
          [8,9],[9,10],[10,11],[11,8], [12,13],[13,14],[14,15],[15,12]
        ];
        edges.forEach(([a, b], idx) => {
          holoCtx.strokeStyle = idx >= 12 ? '#ff7b00' : '#00e5ff';
          holoCtx.beginPath();
          holoCtx.moveTo(pts[a].x, pts[a].y);
          holoCtx.lineTo(pts[b].x, pts[b].y);
          holoCtx.stroke();
        });
      }
      requestAnimationFrame(renderHolo3DCad);
    }
    renderHolo3DCad();

    // --- SAFE ENGINEERING MATH EVALUATOR ---
    function evaluateEngineeringMath(expr) {
      const sanitized = expr
        .replace(/sqrt/gi, 'Math.sqrt')
        .replace(/sin/gi, 'Math.sin')
        .replace(/cos/gi, 'Math.cos')
        .replace(/tan/gi, 'Math.tan')
        .replace(/pi/gi, 'Math.PI')
        .replace(/\^/g, '**');
      if (!/^[0-9+\-*/().,\sMathsqrtincostanPI*]+$/.test(sanitized)) {
        return null;
      }
      try {
        const val = Function('"use strict"; return (' + sanitized + ')')();
        if (typeof val === 'number' && isFinite(val)) return val;
      } catch (e) {}
      return null;
    }

    document.getElementById('calc-eval-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = document.getElementById('calc-expr-input').value.trim();
      const res = evaluateEngineeringMath(raw);
      const box = document.getElementById('calc-result-box');
      if (res !== null) {
        playHudSound('confirm');
        box.textContent = `RESULT: ${res} (PRECISION VERIFIED)`;
      } else {
        box.textContent = `SYNTAX ERROR: Enter valid numeric expression.`;
      }
    });

    // --- 1-CLICK STANDALONE .HTML APP INSTALLER ---
    document.getElementById('download-app-btn').addEventListener('click', () => {
      playHudSound('confirm');
      const fullHtml = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'JARVIS_SHIELD_OS_Standalone.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Standalone JARVIS App Downloaded (.HTML)');
    });


    // =========================================================================
    // STEP 6: REAL HARDWARE TELEMETRY, LIVE MIC FFT & EXTERNAL APP BRIDGES
    // =========================================================================
    async function syncRealDeviceHardware() {
      const cores = Number.isFinite(navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : null;
      const memory = Number.isFinite(navigator.deviceMemory) ? navigator.deviceMemory : null;
      const coresEl = document.getElementById('hw-cores-val');
      const memoryEl = document.getElementById('hw-memory-val');
      const netEl = document.getElementById('hw-net-val');
      if (coresEl) coresEl.textContent = cores ? `${cores} LOGICAL CORES` : 'NOT REPORTED';
      if (memoryEl) memoryEl.textContent = memory ? `APPROX. ${memory} GB DEVICE MEMORY` : 'NOT REPORTED';

      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (netEl) {
        if (connection) {
          const type = connection.effectiveType ? connection.effectiveType.toUpperCase() : 'TYPE NOT REPORTED';
          const downlink = Number.isFinite(connection.downlink) ? `${connection.downlink} Mbps ESTIMATED DOWNLINK` : 'DOWNLINK NOT REPORTED';
          netEl.textContent = `${type} // ${downlink}`;
        } else netEl.textContent = 'NOT REPORTED';
      }

      const batteryReadout = document.getElementById('real-battery-readout');
      const batteryValue = document.getElementById('hw-battery-val');
      if (typeof navigator.getBattery === 'function') {
        try {
          const battery = await navigator.getBattery();
          const updateBattery = () => {
            const percent = Math.round(battery.level * 100);
            const charging = battery.charging ? 'CHARGING' : 'ON BATTERY';
            if (batteryReadout) batteryReadout.textContent = `BATTERY ${percent}% // ${charging}`;
            if (batteryValue) batteryValue.textContent = `${percent}% (${charging})`;
          };
          updateBattery();
          battery.addEventListener('levelchange', updateBattery);
          battery.addEventListener('chargingchange', updateBattery);
        } catch (error) {
          if (batteryReadout) batteryReadout.textContent = 'BATTERY STATUS UNAVAILABLE';
          if (batteryValue) batteryValue.textContent = 'NOT REPORTED';
        }
      } else {
        if (batteryReadout) batteryReadout.textContent = 'BATTERY STATUS NOT REPORTED';
        if (batteryValue) batteryValue.textContent = 'NOT REPORTED';
      }
    }
    syncRealDeviceHardware();

    // --- LIVE MICROPHONE FFT SPECTRUM ANALYZER (WITH SYNTHETIC AUDIO FALLBACK IN SANDBOX) ---
    let micStream = null;
    let micAnalyser = null;
    let micDataArray = null;
    let micFftActive = false;
    let synthFftTimer = null;
    const micSpectrumBtn = document.getElementById('mic-spectrum-btn');

    async function toggleLiveMicSpectrum() {
      if (micFftActive) {
        if (micStream) {
          micStream.getTracks().forEach(t => t.stop());
          micStream = null;
        }
        if (synthFftTimer) {
          clearInterval(synthFftTimer);
          synthFftTimer = null;
        }
        micFftActive = false;
        micSpectrumBtn.textContent = ' LIVE MIC FFT';
        micSpectrumBtn.classList.remove('text-amber-400');
        setMicVisualState('idle', 'MIC FFT STOPPED');
        showToast('Audio Spectrum Analyzer Stopped');
        return;
      }

      // Try real hardware microphone first; if blocked by preview iframe, automatically run real-time harmonic FFT simulation!
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('No mediaDevices');
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        initAudio();
        const source = audioCtx.createMediaStreamSource(micStream);
        micAnalyser = audioCtx.createAnalyser();
        micAnalyser.fftSize = 64;
        source.connect(micAnalyser);
        micDataArray = new Uint8Array(micAnalyser.frequencyBinCount);
        micFftActive = true;
        micSpectrumBtn.textContent = ' MIC FFT: LIVE';
        micSpectrumBtn.classList.add('text-amber-400');
        setMicVisualState('listening', 'MIC FFT: HARDWARE AUDIO STREAM ACTIVE');
        playHudSound('confirm');
        showToast('Hardware Microphone Bound to Arc Reactor!');
        sampleMicSpectrumLoop();
      } catch (e) {
        // Fallback: Real-time Harmonic Telemetry FFT so the user immediately sees the Arc Reactor & Equalizer Bars dance!
        micFftActive = true;
        micSpectrumBtn.textContent = ' FFT: SIMULATED';
        micSpectrumBtn.classList.add('text-amber-400');
        setMicVisualState('listening', 'FFT SPECTRUM: HARMONIC SIMULATION ACTIVE (IFRAME MIC BLOCKED)');
        playHudSound('pulse');
        showToast('Preview sandbox blocked raw mic  -  running Harmonic FFT Visualizer!');
        synthFftTimer = setInterval(() => {
          reactorSurge = 1.3 + Math.random() * 1.9;
          const ladder = document.getElementById('thermo-bars');
          if (ladder && ladder.children.length > 0) {
            Array.from(ladder.children).forEach(bar => {
              bar.style.opacity = (0.3 + Math.random() * 0.7).toFixed(2);
            });
          }
          if (micVuMeter) {
            Array.from(micVuMeter.children).forEach(bar => {
              bar.style.height = (3 + Math.floor(Math.random() * 10)) + 'px';
            });
          }
        }, 100);
      }
    }

    function sampleMicSpectrumLoop() {
      if (document.hidden || !micFftActive || !micAnalyser) return;
      micAnalyser.getByteFrequencyData(micDataArray);
      let sum = 0;
      for (let i = 0; i < micDataArray.length; i++) sum += micDataArray[i];
      const avg = sum / micDataArray.length;
      reactorSurge = 1.0 + (avg / 55);
      const ladder = document.getElementById('thermo-bars');
      if (ladder && ladder.children.length > 0) {
        Array.from(ladder.children).forEach((bar, idx) => {
          const val = micDataArray[idx * 2] || 40;
          bar.style.opacity = Math.max(0.25, Math.min(1, val / 170));
        });
      }
      requestAnimationFrame(sampleMicSpectrumLoop);
    }

    if (micSpectrumBtn) {
      micSpectrumBtn.addEventListener('click', toggleLiveMicSpectrum);
    }

    // --- DUAL-MODE EXTERNAL APP CONNECTORS (IN-APP SYNC + CLICKABLE DEEP-LINK + .ICS DOWNLOAD) ---
    const dispatchOutput = document.getElementById('connector-dispatch-output');

    function renderDispatchResult(title, detailText, externalUrl, linkLabel) {
      if (dispatchOutput) {
        const safeUrl = safeExternalUrl(externalUrl);
        dispatchOutput.innerHTML = `
          <div class="flex items-center justify-between gap-2"><span class="text-emerald-400 font-bold">${escapeHTML(title)}</span><span class="text-[10px] text-amber-400">LOCAL HANDOFF</span></div>
          <div class="text-slate-200 text-[11px] mt-0.5 break-words">${escapeHTML(detailText)}</div>
          ${safeUrl ? `<div class="pt-1.5 mt-1 border-t border-cyan-500/20 flex items-center justify-between gap-2"><span class="text-[10px] text-slate-400">Continue in the external service:</span><a href="${escapeHTML(safeUrl)}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 bg-cyan-500 text-black font-bold text-[10px]">${escapeHTML(linkLabel)}</a></div>` : ''}
        `;
      }
      appendMessage('J.A.R.V.I.S.', `${title}: ${detailText}`, { source: 'APP BRIDGE', url: externalUrl });
    }

    // 1. Google Calendar Sync + .ICS Download
    document.getElementById('launch-gcal-btn').addEventListener('click', () => {
      const title = document.getElementById('ext-gcal-title').value.trim() || 'Stark Tactical Briefing';
      // Save directly to internal JARVIS Calendar too!
      state.connectedApps.calendar.unshift({ id: Date.now(), time: '17:00', title, status: 'GCAL SYNC' });
      saveAppsState();
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent('Synced from J.A.R.V.I.S. S.H.I.E.L.D. OS')}`;
      playHudSound('confirm');
      renderDispatchResult('GOOGLE CALENDAR EVENT STAGED', `Added "${title}" to your JARVIS Calendar & generated Google Calendar template.`, url, 'OPEN GOOGLE CALENDAR');
      try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (e) {}
      showToast(`Calendar Event "${title}" Synced!`);
    });

    document.getElementById('download-ics-btn').addEventListener('click', () => {
      const title = document.getElementById('ext-gcal-title').value.trim() || 'Stark Tactical Briefing';
      const nowIso = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//JARVIS SHIELD OS//EN',
        'BEGIN:VEVENT',
        `DTSTAMP:${nowIso}`,
        `DTSTART:${nowIso}`,
        `SUMMARY:${title}`,
        'DESCRIPTION:Generated by J.A.R.V.I.S. Tactical OS',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      playHudSound('confirm');
      showToast('Downloaded .ICS Calendar Invite File!');
    });

    // 2. Gmail Draft Sync + Direct Link
    document.getElementById('launch-gmail-btn').addEventListener('click', () => {
      const sub = document.getElementById('ext-gmail-sub').value.trim() || 'J.A.R.V.I.S. Telemetry Report';
      state.connectedApps.emails.unshift({ id: Date.now(), from: 'Draft // Outbox', subject: sub, unread: false });
      saveAppsState();
      const url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(sub)}&body=${encodeURIComponent('Dispatched via J.A.R.V.I.S. Command OS.')}`;
      playHudSound('confirm');
      renderDispatchResult('GMAIL DRAFT STAGED', `Saved "${sub}" to Comms Hub & prepared Gmail composer link.`, url, 'LAUNCH GMAIL COMPOSER');
      try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (e) {}
      showToast(`Gmail Draft "${sub}" Staged!`);
    });

    // 3. WhatsApp Native Protocol + In-App Dispatch
    document.getElementById('launch-wa-btn').addEventListener('click', () => {
      const msg = document.getElementById('ext-wa-msg').value.trim() || 'Status update from J.A.R.V.I.S. Tactical Console.';
      probeNativeDesktopApp(`whatsapp://send?text=${encodeURIComponent(msg)}`, 'WhatsApp', 'https://www.whatsapp.com/download');
    });

    // 4. YouTube Native/Chrome Fallback
    document.getElementById('launch-yt-btn').addEventListener('click', () => {
      const q = document.getElementById('ext-yt-query').value.trim() || 'Iron Man Jarvis HUD Soundtrack';
      probeNativeDesktopApp(`vnd.youtube://results?search_query=${encodeURIComponent(q)}`, 'YouTube', `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`);
    });

    // =========================================================================
    // TOP SEARCH BAR, TOP MIC BUTTON & STEP 7 OPTICAL VISION HUD
    // =========================================================================


    const quickAppBridgeBtn = document.getElementById('quick-appbridge-btn');
    if (quickAppBridgeBtn) {
      quickAppBridgeBtn.addEventListener('click', () => openHubModal('appbridge'));
    }
    const quickVisionBtn = document.getElementById('quick-vision-btn');
    if (quickVisionBtn) {
      quickVisionBtn.addEventListener('click', () => openHubModal('vision'));
    }



    // --- STEP 7: OPTICAL VISION TARGETING RETICLE & WEBCAM OVERLAY ---
    const visionCanvas = document.getElementById('visionHudCanvas');
    const visionCtx = visionCanvas ? visionCanvas.getContext('2d') : null;
    const opticalVideo = document.getElementById('optical-video');
    let targetX = 220;
    let targetY = 124;
    let currentReticleX = 220;
    let currentReticleY = 124;
    let camActive = false;
    let camStream = null;

    if (visionCanvas) {
      visionCanvas.addEventListener('click', (e) => {
        const rect = visionCanvas.getBoundingClientRect();
        targetX = ((e.clientX - rect.left) / rect.width) * visionCanvas.width;
        targetY = ((e.clientY - rect.top) / rect.height) * visionCanvas.height;
        playHudSound('confirm');
        const dist = (18 + Math.random() * 65).toFixed(1);
        const coordsEl = document.getElementById('target-coords-readout');
        if (coordsEl) coordsEl.textContent = `LOCK: X:${Math.round(targetX)} Y:${Math.round(targetY)} // DIST: ${dist}m`;
      });
    }

    document.getElementById('lock-target-btn').addEventListener('click', () => {
      targetX = 80 + Math.random() * 280;
      targetY = 50 + Math.random() * 148;
      playHudSound('pulse');
      const coordsEl = document.getElementById('target-coords-readout');
      if (coordsEl) coordsEl.textContent = `LOCK: X:${Math.round(targetX)} Y:${Math.round(targetY)} // THREAT: 0%`;
      showToast('New Optical Target Vector Locked');
    });

    document.getElementById('start-cam-btn').addEventListener('click', async () => {
      const btn = document.getElementById('start-cam-btn');
      const cap = document.getElementById('vision-telemetry-caption');
      if (camActive) {
        if (camStream) camStream.getTracks().forEach(t => t.stop());
        camActive = false;
        opticalVideo.classList.add('hidden');
        btn.textContent = ' ENABLE LIVE CAMERA';
        if (cap) cap.firstElementChild.textContent = 'OPTICS: SYNTHETIC TACTICAL RADAR';
        return;
      }
      try {
        camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        opticalVideo.srcObject = camStream;
        opticalVideo.classList.remove('hidden');
        camActive = true;
        btn.textContent = ' STOP CAMERA';
        if (cap) cap.firstElementChild.textContent = 'OPTICS: LIVE WEBCAM FEED OVERLAY';
        playHudSound('confirm');
        showToast('Live Webcam Optical HUD Active!');
      } catch (err) {
        playHudSound('chirp');
        showToast('Preview sandbox blocked webcam  -  running Synthetic Tactical Radar Optics!');
        if (cap) cap.firstElementChild.textContent = 'OPTICS: ENHANCED SYNTHETIC RADAR (SANDBOX MODE)';
      }
    });

    let lastVisionFrame = 0;
    function renderVisionHud() {
      if (document.hidden) return;
      const frameNow = performance.now();
      if (frameNow - lastVisionFrame < 33) { requestAnimationFrame(renderVisionHud); return; }
      lastVisionFrame = frameNow;
      if (!visionCtx) return;
      const w = visionCanvas.width;
      const h = visionCanvas.height;
      visionCtx.clearRect(0, 0, w, h);

      currentReticleX += (targetX - currentReticleX) * 0.12;
      currentReticleY += (targetY - currentReticleY) * 0.12;

      // Horizon pitch ladder lines
      visionCtx.strokeStyle = 'rgba(0, 229, 255, 0.28)';
      visionCtx.lineWidth = 1;
      for (let y = 40; y < h; y += 40) {
        visionCtx.beginPath();
        visionCtx.moveTo(20, y); visionCtx.lineTo(65, y);
        visionCtx.moveTo(w - 65, y); visionCtx.lineTo(w - 20, y);
        visionCtx.stroke();
      }

      // Animated Target Lock Box & Rotating Reticle
      visionCtx.save();
      visionCtx.translate(currentReticleX, currentReticleY);

      visionCtx.strokeStyle = '#ff2a55';
      visionCtx.lineWidth = 1.4;
      visionCtx.strokeRect(-28, -28, 56, 56);

      visionCtx.rotate(tick * 0.6);
      visionCtx.strokeStyle = '#00e5ff';
      visionCtx.lineWidth = 1.5;
      visionCtx.setLineDash([8, 6]);
      visionCtx.beginPath();
      visionCtx.arc(0, 0, 20, 0, Math.PI * 2);
      visionCtx.stroke();
      visionCtx.setLineDash([]);
      visionCtx.restore();

      // Target Telemetry Tag
      visionCtx.fillStyle = '#00e5ff';
      visionCtx.font = '10px "JetBrains Mono", monospace';
      visionCtx.fillText(`VEC [${Math.round(currentReticleX)}, ${Math.round(currentReticleY)}]`, currentReticleX + 34, currentReticleY - 10);
      visionCtx.fillStyle = '#ff7b00';
      visionCtx.fillText('LOCKED // MARK VII', currentReticleX + 34, currentReticleY + 4);

      requestAnimationFrame(renderVisionHud);
    }
    renderVisionHud();

    // Module Visibility Toggles
    const mainGrid = document.querySelector('main');
    document.getElementById('toggle-left-wing').addEventListener('change', (e) => {
      const leftSec = mainGrid.children[0];
      if (leftSec) leftSec.style.display = e.target.checked ? '' : 'none';
      playHudSound('chirp');
    });
    document.getElementById('toggle-right-wing').addEventListener('change', (e) => {
      const rightSec = mainGrid.children[2];
      if (rightSec) rightSec.style.display = e.target.checked ? '' : 'none';
      playHudSound('chirp');
    });
    document.getElementById('toggle-scanlines').addEventListener('change', (e) => {
      document.querySelectorAll('.laser-scanner').forEach(el => {
        el.style.display = e.target.checked ? '' : 'none';
      });
      playHudSound('chirp');
    });


    // =========================================================================
    // EMBEDDED IN-APP OS WINDOW RUNNER & NATIVE DESKTOP PROTOCOL DETECTOR
    // =========================================================================
    function switchSubAppView(subAppName) {
      document.querySelectorAll('.subapp-view').forEach(v => v.classList.add('hidden'));
      const target = document.getElementById(`subapp-view-${subAppName}`);
      if (target) target.classList.remove('hidden');

      document.querySelectorAll('.subapp-tab-btn').forEach(btn => {
        const isMatch = btn.getAttribute('data-subapp') === subAppName;
        btn.className = isMatch
          ? 'subapp-tab-btn px-2.5 py-1 bg-cyan-500 text-black font-bold text-[11px]'
          : 'subapp-tab-btn px-2.5 py-1 bg-slate-900 border border-cyan-500/40 text-cyan-300 font-bold text-[11px]';
      });
    }

    function launchInAppProgram(appName, optionalQuery = '') {
      playHudSound('confirm');
      openHubModal('appbridge');
      switchSubAppView(appName);

      const badge = document.getElementById('native-app-detector-badge');
      const notice = document.getElementById('native-install-notice');
      const noticeText = document.getElementById('native-install-text');
      const fallbackLink = document.getElementById('native-chrome-fallback');

      if (badge) badge.textContent = `ACTIVE CONTAINER: ${appName.toUpperCase()}.APP`;
      if (notice) notice.classList.add('hidden');

      if (appName === 'whatsapp') {
        if (optionalQuery) {
          const waChat = document.getElementById('inapp-wa-chatlog');
          if (waChat) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'p-1.5 bg-cyan-950/60 border-l-2 border-cyan-400 text-cyan-100';
            const label = document.createElement('strong');
            label.className = 'text-cyan-300';
            label.textContent = 'Commander (Draft): ';
            const message = document.createElement('span');
            message.textContent = optionalQuery;
            msgDiv.append(label, message);
            waChat.appendChild(msgDiv);
            waChat.scrollTop = waChat.scrollHeight;
          }
        }
        showToast('Opened WhatsApp Messenger inside JARVIS OS');
      } else if (appName === 'youtube') {
        if (optionalQuery) {
          const ytLabel = document.getElementById('yt-now-playing');
          if (ytLabel) ytLabel.textContent = `STREAMING: ${optionalQuery.toUpperCase()}`;
          const ytIframe = document.getElementById('inapp-yt-iframe');
          if (ytIframe) {
            ytIframe.src = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(optionalQuery)}`;
          }
        }
        showToast('Opened YouTube Media Theater inside JARVIS OS');
      } else if (appName === 'chrome') {
        const urlInput = document.getElementById('inapp-browser-url');
        const iframe = document.getElementById('inapp-browser-iframe');
        if (optionalQuery) {
          const wikiUrl = `https://en.m.wikipedia.org/wiki/${encodeURIComponent(optionalQuery.replace(/\s+/g, '_'))}`;
          if (urlInput) urlInput.value = wikiUrl;
          if (iframe) iframe.src = wikiUrl;
        }
        showToast('Opened Chrome Embedded Browser inside JARVIS OS');
      } else if (appName === 'spotify') {
        showToast('Opened Stark Tunes Synthesizer inside JARVIS OS');
      }
    }

    // Native OS Protocol Probe (Checks if native desktop app is installed; if not, advises user to install or open in Chrome)
    function probeNativeDesktopApp(protocolUri, appTitle, installUrl) {
      const notice = document.getElementById('native-install-notice');
      const noticeText = document.getElementById('native-install-text');
      const fallbackLink = document.getElementById('native-chrome-fallback');
      let didBlur = false;

      const onBlur = () => { didBlur = true; };
      window.addEventListener('blur', onBlur, { once: true });

      try {
        const hiddenFrame = document.createElement('iframe');
        hiddenFrame.style.display = 'none';
        hiddenFrame.src = protocolUri;
        document.body.appendChild(hiddenFrame);
        setTimeout(() => {
          try { document.body.removeChild(hiddenFrame); } catch (e) {}
        }, 1200);
      } catch (e) {}

      setTimeout(() => {
        window.removeEventListener('blur', onBlur);
        if (!didBlur && notice && noticeText && fallbackLink) {
          notice.classList.remove('hidden');
          noticeText.innerHTML = ` <strong>${appTitle} Desktop App</strong> was not detected installed on your device (or is blocked by the browser sandbox). Running inside the <strong>JARVIS In-App Container</strong> below - or click to install ${appTitle} / open in Chrome.`;
          fallbackLink.href = installUrl;
          fallbackLink.textContent = `INSTALL ${appTitle.toUpperCase()} / OPEN IN CHROME ↗`;
          speakText(`${appTitle} desktop executable was not detected on your system. I have opened the embedded ${appTitle} client inside Jarvis, or you can install it or open it in Google Chrome.`);
        }
      }, 900);
    }

    document.querySelectorAll('.subapp-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        playHudSound('chirp');
        switchSubAppView(btn.getAttribute('data-subapp'));
      });
    });



    // WhatsApp composer creates a draft in the external WhatsApp application.
    const sendInAppWaBtn = document.getElementById('send-inapp-wa-btn');
    if (sendInAppWaBtn) {
      sendInAppWaBtn.addEventListener('click', () => {
        const input = document.getElementById('ext-wa-msg');
        const message = input ? input.value.trim() : '';
        if (!message) { showToast('Enter a message before opening WhatsApp.', 'error'); return; }
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
        showToast('WhatsApp draft opened. Review and send it in WhatsApp.');
        input.value = '';
      });
    }

    const tryNativeWaBtn = document.getElementById('try-native-wa-btn');
    if (tryNativeWaBtn) {
      tryNativeWaBtn.addEventListener('click', () => {
        probeNativeDesktopApp('whatsapp://send?text=Hello', 'WhatsApp', 'https://www.whatsapp.com/download');
      });
    }

    // In-App YouTube Channel Switcher & Search
    document.querySelectorAll('.yt-channel-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const vid = btn.getAttribute('data-ytid');
        const title = btn.getAttribute('data-yttitle');
        const iframe = document.getElementById('inapp-yt-iframe');
        const lbl = document.getElementById('yt-now-playing');
        if (iframe) iframe.src = `https://www.youtube.com/embed/${vid}?autoplay=1`;
        if (lbl) lbl.textContent = `PLAYING: ${title.toUpperCase()}`;
        playHudSound('confirm');
        showToast(`Streaming: ${title}`);
      });
    });

    const playInAppYtBtn = document.getElementById('play-inapp-yt-btn');
    if (playInAppYtBtn) {
      playInAppYtBtn.addEventListener('click', () => {
        const q = document.getElementById('ext-yt-query').value.trim() || 'Iron Man HUD';
        const iframe = document.getElementById('inapp-yt-iframe');
        const lbl = document.getElementById('yt-now-playing');
        if (iframe) iframe.src = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(q)}`;
        if (lbl) lbl.textContent = `SEARCH STREAM: ${q.toUpperCase()}`;
        playHudSound('confirm');
        showToast(`Playing "${q}" in In-App YouTube Theater`);
      });
    }

    // In-App Chrome Browser Navigation
    const browserGoBtn = document.getElementById('inapp-browser-go');
    if (browserGoBtn) {
      browserGoBtn.addEventListener('click', () => {
        const raw = document.getElementById('inapp-browser-url').value.trim();
        const iframe = document.getElementById('inapp-browser-iframe');
        if (!raw || !iframe) return;
        let targetUrl = raw;
        if (!/^https?:\/\//i.test(raw)) {
          targetUrl = `https://en.m.wikipedia.org/wiki/${encodeURIComponent(raw.replace(/\s+/g, '_'))}`;
          document.getElementById('inapp-browser-url').value = targetUrl;
        }
        iframe.src = targetUrl;
        playHudSound('confirm');
        showToast('Loading inside Embedded Chrome Container...');
      });
    }

    // In-App Stark Tunes Arpeggiator Synth
    let arpeggioTimer = null;
    document.querySelectorAll('.tunes-track-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const track = btn.getAttribute('data-track');
        if (arpeggioTimer) {
          clearInterval(arpeggioTimer);
          arpeggioTimer = null;
        }
        const statusEl = document.getElementById('tunes-status');
        if (track === 'stop') {
          if (statusEl) statusEl.textContent = 'SYNTH STREAM STOPPED';
          showToast('Stopped Stark Tunes Synthesizer');
          return;
        }
        const notes = track === 'arc' ? [220, 277.18, 329.63, 440, 659.25] : [196, 246.94, 293.66, 392, 587.33];
        let step = 0;
        if (statusEl) statusEl.textContent = `PLAYING: ${track.toUpperCase()} TELEMETRY SYNTH`;
        showToast(`Playing In-App Track: ${track.toUpperCase()}`);
        arpeggioTimer = setInterval(() => {
          if (!state.sfxEnabled) return;
          try {
            initAudio();
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(notes[step % notes.length], now);
            g.gain.setValueAtTime(0.04, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.connect(g);
            g.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.19);
            reactorSurge = 1.6 + (step % 3) * 0.4;
            step++;
          } catch (e) {}
        }, 220);
      });
    });


    // =========================================================================
    // FULL-SCREEN INTERACTIVE HOLOGRAPHIC PARTICLE MATRIX & SHOCKWAVE ENGINE
    // =========================================================================
    const bgCanvas = document.getElementById('bgMotionCanvas');
    const bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null;
    let bgW = window.innerWidth;
    let bgH = window.innerHeight;
    const bgParticles = [];
    const bgShockwaves = [];

    function resizeBgCanvas() {
      if (!bgCanvas) return;
      bgW = window.innerWidth;
      bgH = window.innerHeight;
      bgCanvas.width = bgW;
      bgCanvas.height = bgH;
    }
    window.addEventListener('resize', resizeBgCanvas);
    resizeBgCanvas();

    // Keep the ambient background lightweight on phones.
    const bgParticleCount = window.innerWidth < 768 ? 22 : 42;
    for (let i = 0; i < bgParticleCount; i++) {
      bgParticles.push({
        x: Math.random() * bgW,
        y: Math.random() * bgH,
        vx: (Math.random() - 0.5) * 0.65,
        vy: (Math.random() - 0.5) * 0.65,
        size: 1.2 + Math.random() * 2.2,
        isAmber: i % 7 === 0
      });
    }

    function triggerBgShockwave(x, y, color = '#00e5ff') {
      bgShockwaves.push({ x, y, r: 8, maxR: 260, alpha: 0.85, color });
    }


    let lastBackgroundFrame = 0;
    function renderInteractiveBackground() {
      if (document.hidden) return;
      const frameNow = performance.now();
      if (frameNow - lastBackgroundFrame < 33) { requestAnimationFrame(renderInteractiveBackground); return; }
      lastBackgroundFrame = frameNow;
      if (!bgCtx) return;
      bgCtx.clearRect(0, 0, bgW, bgH);

      // 1. Subtle 3D Perspective Telemetry Horizon Grid at Top & Bottom Edges
      bgCtx.strokeStyle = 'rgba(0, 229, 255, 0.07)';
      bgCtx.lineWidth = 1;
      const horizonOffset = (tick * 18) % 40;
      for (let x = -bgW * 0.2; x <= bgW * 1.2; x += 90) {
        bgCtx.beginPath();
        bgCtx.moveTo(bgW / 2 + (x - bgW / 2) * 0.35, 0);
        bgCtx.lineTo(x, 120);
        bgCtx.moveTo(bgW / 2 + (x - bgW / 2) * 0.35, bgH);
        bgCtx.lineTo(x, bgH - 120);
        bgCtx.stroke();
      }
      for (let y = horizonOffset; y < 120; y += 30) {
        bgCtx.beginPath();
        bgCtx.moveTo(0, y); bgCtx.lineTo(bgW, y);
        bgCtx.moveTo(0, bgH - y); bgCtx.lineTo(bgW, bgH - y);
        bgCtx.stroke();
      }

      // 2. Giant Counter-Rotating Orbital Telemetry Compass Rings in Background Center
      bgCtx.save();
      bgCtx.translate(bgW / 2, bgH / 2);
      bgCtx.rotate(tick * 0.08);
      bgCtx.strokeStyle = 'rgba(0, 229, 255, 0.09)';
      bgCtx.lineWidth = 1.2;
      bgCtx.setLineDash([18, 12, 4, 12]);
      bgCtx.beginPath();
      bgCtx.arc(0, 0, Math.min(bgW, bgH) * 0.44, 0, Math.PI * 2);
      bgCtx.stroke();

      bgCtx.rotate(-tick * 0.16);
      bgCtx.strokeStyle = 'rgba(255, 123, 0, 0.08)';
      bgCtx.setLineDash([40, 25]);
      bgCtx.beginPath();
      bgCtx.arc(0, 0, Math.min(bgW, bgH) * 0.36, 0, Math.PI * 2);
      bgCtx.stroke();
      bgCtx.setLineDash([]);
      bgCtx.restore();

      // 3. Update and draw the ambient particle field.
      const speedMult = state.isSpeaking ? 2.4 : (state.isProcessing ? 1.8 : 1.0);
      for (let i = 0; i < bgParticles.length; i++) {
        const p = bgParticles[i];
        p.x += p.vx * speedMult;
        p.y += p.vy * speedMult;

        if (p.x < 0) p.x = bgW;
        if (p.x > bgW) p.x = 0;
        if (p.y < 0) p.y = bgH;
        if (p.y > bgH) p.y = 0;

        // Draw node
        bgCtx.fillStyle = p.isAmber ? 'rgba(255, 140, 0, 0.75)' : 'rgba(0, 229, 255, 0.72)';
        bgCtx.beginPath();
        bgCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        bgCtx.fill();
      }

      // 5. Render Expanding Interactive Shockwave Rings (Triggered by Clicks & Commands)
      for (let i = bgShockwaves.length - 1; i >= 0; i--) {
        const sw = bgShockwaves[i];
        sw.r += 5.5;
        sw.alpha *= 0.94;
        bgCtx.strokeStyle = sw.color === '#ff7b00'
          ? `rgba(255, 123, 0, ${sw.alpha})`
          : `rgba(0, 229, 255, ${sw.alpha})`;
        bgCtx.lineWidth = 1.8;
        bgCtx.beginPath();
        bgCtx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        bgCtx.stroke();
        if (sw.r >= sw.maxR || sw.alpha < 0.03) {
          bgShockwaves.splice(i, 1);
        }
      }

      requestAnimationFrame(renderInteractiveBackground);
    }
    renderInteractiveBackground();

    // Wire 1-click Spoken Voice Test button
    const testTtsBtn = document.getElementById('test-tts-btn');
    if (testTtsBtn) {
      testTtsBtn.addEventListener('click', () => {
        state.voiceEnabled = true;
        voiceIndicator.className = "w-1.5 h-1.5 rounded-full bg-emerald-400";
        voiceLabel.textContent = "VOICE: ON";
        speakText(lastSpokenAnswer || "Audio voice synthesis online and calibrated, Commander. Ask me any question and I will speak the exact answer aloud.");
        showToast("Speaking Answer Aloud via Dual-Engine Voice Synthesizer");
      });
    }


    // =========================================================================
    // STEP 9: STOP VOICE BUTTON, NEURAL MEMORY BANK & LIVE CODE SANDBOX
    // =========================================================================
    const stopVoiceBtn = document.getElementById('stop-voice-btn');
    if (stopVoiceBtn) {
      stopVoiceBtn.addEventListener('click', () => {
        stopAllSpeech();
        showToast('Spoken Voice Stream Stopped');
      });
    }

    if (!Array.isArray(state.connectedApps.memories)) state.connectedApps.memories = [];

    function renderNeuralMemories() {
      const list = document.getElementById('neural-memory-list');
      if (!list) return;
      list.innerHTML = (state.connectedApps.memories || []).map(m => `
        <div class="flex items-center justify-between p-2 bg-slate-950 border border-cyan-500/30">
          <div class="pr-2">
            <div class="text-cyan-100">${escapeHTML(m.text)}</div>
            <div class="text-[9px] text-slate-500">LOGGED: ${escapeHTML(m.time || 'TIME NOT SET')}</div>
          </div>
          <button type="button" data-del-mem="${escapeHTML(Number(m.id) || 0)}" class="text-rose-400 hover:text-rose-300 text-[10px] shrink-0">[FORGET]</button>
        </div>
      `).join('');

      document.querySelectorAll('[data-del-mem]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-del-mem'));
          state.connectedApps.memories = state.connectedApps.memories.filter(x => Number(x.id) !== id);
          playHudSound('chirp');
          saveAppsState();
          renderNeuralMemories();
        });
      });
    }
    renderNeuralMemories();

    const addMemForm = document.getElementById('add-memory-form');
    if (addMemForm) {
      addMemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inp = document.getElementById('memory-fact-input');
        const val = inp ? inp.value.trim() : '';
        if (val) {
          state.connectedApps.memories.unshift({ id: Date.now(), text: val, time: new Date().toLocaleTimeString() });
          inp.value = '';
          playHudSound('confirm');
          saveAppsState();
          renderNeuralMemories();
          speakText(`Memory stored: ${val}`);
          showToast('Fact Stored in Neural Memory Graph');
        }
      });
    }

    const runCodeBtn = document.getElementById('run-code-btn');
    if (runCodeBtn) {
      runCodeBtn.addEventListener('click', () => {
        const codeInput = document.getElementById('sandbox-code-input');
        const outBox = document.getElementById('sandbox-code-output');
        const code = codeInput?.value || '';
        if (!outBox || !code.trim()) {
          if (outBox) outBox.textContent = 'Enter JavaScript code before running.';
          return;
        }

        // Run user code in a disposable Worker, never in the application page.
        // Only a minimal, non-secret context is passed into the sandbox.
        const workerSource = `
          self.onmessage = async ({ data }) => {
            try {
              const run = new Function('state', data.code);
              const result = await run(data.state);
              let output;
              if (typeof result === 'string') output = result;
              else if (result === undefined) output = 'Executed successfully (undefined return).';
              else {
                try { output = JSON.stringify(result); }
                catch (_) { output = String(result); }
              }
              self.postMessage({ ok: true, output: String(output) });
            } catch (error) {
              self.postMessage({ ok: false, error: error?.message || 'Execution failed.' });
            }
          };
        `;

        let workerUrl;
        let worker;
        let timeoutId = null;
        let finished = false;
        const finish = (message) => {
          if (finished) return;
          finished = true;
          clearTimeout(timeoutId);
          if (worker) worker.terminate();
          if (workerUrl) URL.revokeObjectURL(workerUrl);
          outBox.textContent = message;
        };

        try {
          workerUrl = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
          worker = new Worker(workerUrl);
          timeoutId = setTimeout(() => finish('Execution stopped: time limit exceeded (2 seconds).'), 2000);
          worker.onmessage = (event) => {
            if (event.data?.ok) {
              finish(`OUTPUT: ${event.data.output}`);
              playHudSound('confirm');
            } else {
              finish(`RUNTIME ERROR: ${event.data?.error || 'Unknown error.'}`);
            }
          };
          worker.onerror = () => finish('RUNTIME ERROR: sandbox worker failed.');
          worker.postMessage({
            code,
            state: { location: { city: state?.location?.city || 'Unknown' } }
          });
        } catch (error) {
          finish(`SANDBOX ERROR: ${error?.message || 'Unable to start isolated worker.'}`);
        }
      });
    }

    // =========================================================================
    // STEP 10: POWER OFF / SWITCH ON / REBOOT, PHONE CALLING & ENJOYING ZONE
    // =========================================================================
    const powerOverlay = document.getElementById('power-screen-overlay');
    const powerTitle = document.getElementById('power-screen-title');
    const powerSub = document.getElementById('power-screen-sub');
    const powerSpinner = document.getElementById('power-spinner');
    const bootWrap = document.getElementById('boot-progress-wrap');
    const bootBar = document.getElementById('boot-progress-bar');
    const powerOnBtn = document.getElementById('power-on-btn');

    function powerOffJarvisOs() {
      stopAllSpeech();
      playHudSound('pulse');
      powerOverlay.classList.remove('hidden');
      powerOverlay.classList.add('flex');
      powerTitle.textContent = "MARK VII SYSTEM POWERED DOWN";
      powerSub.textContent = "Arc Reactor placed in low-power standby. All telemetry canvases, voice transceivers, and satellite links are hibernating.";
      powerSpinner.classList.add('hidden');
      bootWrap.classList.add('hidden');
      powerOnBtn.classList.remove('hidden');
      showToast("System Switched Off");
    }

    function powerOnJarvisOs() {
      powerTitle.textContent = "BOOTING J.A.R.V.I.S. S.H.I.E.L.D. OS...";
      powerSub.textContent = "Igniting Arc Reactor core, calibrating 8 real-time CAD telemetry canvases, and locking satellite voice link...";
      powerSpinner.classList.remove('hidden');
      bootWrap.classList.remove('hidden');
      powerOnBtn.classList.add('hidden');
      bootBar.style.width = '25%';
      playHudSound('chirp');

      setTimeout(() => { bootBar.style.width = '68%'; playHudSound('chirp'); }, 450);
      setTimeout(() => { bootBar.style.width = '100%'; playHudSound('confirm'); }, 900);
      setTimeout(() => {
        powerOverlay.classList.add('hidden');
        powerOverlay.classList.remove('flex');
        bootBar.style.width = '0%';
        reactorSurge = 3.5;
        turbineBoost = 3.5;
        speakText("Welcome back, Commander. All Mark VII tactical systems, voice synthesis, and satellite links are online.");
        showToast("J.A.R.V.I.S. OS Online");
      }, 1300);
    }

    function rebootJarvisOs() {
      stopAllSpeech();
      playHudSound('pulse');
      powerOverlay.classList.remove('hidden');
      powerOverlay.classList.add('flex');
      powerTitle.textContent = "REBOOTING MARK VII TACTICAL HUD...";
      powerSub.textContent = "Restarting local visual modules and reinitializing interface state...";
      powerSpinner.classList.remove('hidden');
      bootWrap.classList.remove('hidden');
      powerOnBtn.classList.add('hidden');
      bootBar.style.width = '20%';

      setTimeout(() => { bootBar.style.width = '65%'; playHudSound('chirp'); }, 500);
      setTimeout(() => { bootBar.style.width = '100%'; playHudSound('confirm'); }, 1000);
      setTimeout(() => {
        powerOverlay.classList.add('hidden');
        powerOverlay.classList.remove('flex');
        bootBar.style.width = '0%';
        reactorSurge = 3.8;
        turbineBoost = 4.0;
        speakText("Interface restart complete. Local modules are ready.");
        showToast("System Reboot Complete");
      }, 1400);
    }

    const powerOffBtn = document.getElementById('power-off-btn');
    if (powerOffBtn) powerOffBtn.addEventListener('click', powerOffJarvisOs);
    if (powerOnBtn) powerOnBtn.addEventListener('click', powerOnJarvisOs);
    const sysRebootBtn = document.getElementById('sys-reboot-btn');
    if (sysRebootBtn) sysRebootBtn.addEventListener('click', rebootJarvisOs);

    // --- SATELLITE PHONE DIALER & LIVE AI CALLING SYSTEM ---
    const phoneInput = document.getElementById('phone-number-display');
    const callerNameEl = document.getElementById('active-caller-name');
    const callTimerEl = document.getElementById('active-call-timer');
    const callTranscriptEl = document.getElementById('active-call-transcript');
    const callBadgeEl = document.getElementById('call-status-badge');
    const realTelLink = document.getElementById('real-tel-link');
    let callInterval = null;
    let ringTimer = null;
    let callSecs = 0;

    document.querySelectorAll('.dial-key').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = btn.getAttribute('data-digit');
        if (phoneInput) phoneInput.value += d;
        playHudSound('chirp');
      });
    });

    function startJarvisPhoneCall(targetName, explicitNum = '') {
      openHubModal('phone');
      const name = targetName || (phoneInput && phoneInput.value.trim()) || 'Number';
      const rawNumber = explicitNum || (phoneInput && phoneInput.value.trim()) || '';
      const dialNumber = rawNumber.replace(/[^0-9+*#]/g, '');
      if (phoneInput) phoneInput.value = rawNumber;

      if (callInterval) { clearInterval(callInterval); callInterval = null; }
      if (ringTimer) { clearTimeout(ringTimer); ringTimer = null; }
      callSecs = 0;
      if (callTimerEl) callTimerEl.textContent = '00:00';

      if (!/^\+?[0-9]{3,15}$/.test(dialNumber)) {
        if (callerNameEl) callerNameEl.textContent = 'NUMBER REQUIRED';
        if (callBadgeEl) callBadgeEl.textContent = 'NOT STARTED';
        if (callTranscriptEl) callTranscriptEl.textContent = 'Enter a valid phone number or select a saved contact. J.A.R.V.I.S. cannot connect or simulate a live call.';
        showToast('Enter a valid phone number');
        return;
      }

      if (realTelLink) {
        realTelLink.href = `tel:${dialNumber}`;
        if (callerNameEl) callerNameEl.textContent = ` OPENING DIALER: ${name.toUpperCase()}`;
        if (callBadgeEl) callBadgeEl.textContent = 'HANDOFF REQUESTED';
        if (callTranscriptEl) callTranscriptEl.textContent = `Handing ${dialNumber} to your device Phone app. Review the number and confirm the call there.`;
        try {
          realTelLink.click();
          showToast('Opening device phone dialer');
        } catch (error) {
          showToast('Tap DIAL ON REAL PHONE to continue');
        }
      } else {
        if (callBadgeEl) callBadgeEl.textContent = 'DIALER UNAVAILABLE';
        if (callTranscriptEl) callTranscriptEl.textContent = 'This browser cannot hand off a phone call. Use a device with a configured Phone app.';
        showToast('Phone dialer unavailable');
      }
    }

    function endJarvisPhoneCall() {
      if (callInterval) { clearInterval(callInterval); callInterval = null; }
      if (ringTimer) { clearTimeout(ringTimer); ringTimer = null; }
      stopAllSpeech();
      playHudSound('chirp');
      if (callerNameEl) callerNameEl.textContent = "CALL TERMINATED";
      if (callBadgeEl) callBadgeEl.textContent = "LINE READY";
      if (callTimerEl) callTimerEl.textContent = "00:00";
      if (callTranscriptEl) callTranscriptEl.textContent = "J.A.R.V.I.S. panel closed. Active calls must be ended in the Android Phone app.";
      showToast("J.A.R.V.I.S. phone panel closed. End any active call in the Phone app.");
    }

    const startCallBtn = document.getElementById('start-call-btn');
    if (startCallBtn) startCallBtn.addEventListener('click', () => startJarvisPhoneCall(phoneInput ? phoneInput.value.trim() : 'Mom'));
    const endCallBtn = document.getElementById('end-call-btn');
    if (endCallBtn) endCallBtn.addEventListener('click', endJarvisPhoneCall);

    document.querySelectorAll('.contact-call-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        startJarvisPhoneCall(btn.getAttribute('data-call-name'), btn.getAttribute('data-call-num'));
      });
    });

    // --- ENJOYING ZONE: PLAYABLE REPULSOR DRONE DODGER GAME, SYNTH PADS & JOKES ---
    const enjoyCanvas = document.getElementById('enjoyGameCanvas');
    const enjoyCtx = enjoyCanvas ? enjoyCanvas.getContext('2d') : null;
    let shipX = 190;
    let repulsorScore = 0;
    const enemyDrones = [
      { x: 65, y: 10, vy: 2.3, r: 9 },
      { x: 190, y: -50, vy: 2.8, r: 11 },
      { x: 310, y: -110, vy: 2.5, r: 10 }
    ];

    if (enjoyCanvas) {
      enjoyCanvas.addEventListener('mousemove', (e) => {
        const rect = enjoyCanvas.getBoundingClientRect();
        shipX = ((e.clientX - rect.left) / rect.width) * enjoyCanvas.width;
      });
      enjoyCanvas.addEventListener('touchmove', (e) => {
        if (e.touches[0]) {
          const rect = enjoyCanvas.getBoundingClientRect();
          shipX = ((e.touches[0].clientX - rect.left) / rect.width) * enjoyCanvas.width;
        }
      }, { passive: true });
    }

    const restartGameBtn = document.getElementById('restart-game-btn');
    if (restartGameBtn) {
      restartGameBtn.addEventListener('click', () => {
        repulsorScore = 0;
        const scEl = document.getElementById('game-score-val');
        if (scEl) scEl.textContent = '0';
        enemyDrones.forEach((d, i) => { d.y = -i * 65; d.x = 30 + Math.random() * 320; });
        playHudSound('confirm');
        showToast("Repulsor Dodger Reset!");
      });
    }

    function renderEnjoyGameLoop() {
      if (enjoyCtx && enjoyCanvas) {
        const w = enjoyCanvas.width;
        const h = enjoyCanvas.height;
        enjoyCtx.clearRect(0, 0, w, h);

        // Subtle CAD grid inside game viewport
        enjoyCtx.strokeStyle = 'rgba(0, 229, 255, 0.1)';
        enjoyCtx.beginPath();
        enjoyCtx.moveTo(0, h / 2); enjoyCtx.lineTo(w, h / 2);
        enjoyCtx.moveTo(w / 2, 0); enjoyCtx.lineTo(w / 2, h);
        enjoyCtx.stroke();

        // Mark VII Thruster Ship
        enjoyCtx.strokeStyle = '#00e5ff';
        enjoyCtx.fillStyle = 'rgba(0, 229, 255, 0.35)';
        enjoyCtx.lineWidth = 1.5;
        enjoyCtx.beginPath();
        enjoyCtx.moveTo(shipX, h - 30);
        enjoyCtx.lineTo(shipX - 14, h - 10);
        enjoyCtx.lineTo(shipX + 14, h - 10);
        enjoyCtx.closePath();
        enjoyCtx.fill();
        enjoyCtx.stroke();

        // Incoming Red Drones
        enemyDrones.forEach(d => {
          d.y += d.vy;
          if (d.y > h + 15) {
            d.y = -15;
            d.x = 20 + Math.random() * (w - 40);
            repulsorScore += 10;
            const scEl = document.getElementById('game-score-val');
            if (scEl) scEl.textContent = String(repulsorScore);
          }
          const dx = d.x - shipX;
          const dy = d.y - (h - 18);
          if (Math.sqrt(dx * dx + dy * dy) < d.r + 11) {
            repulsorScore = 0;
            const scEl = document.getElementById('game-score-val');
            if (scEl) scEl.textContent = '0';
            d.y = -20;
          }
          enjoyCtx.fillStyle = '#ff2a55';
          enjoyCtx.beginPath();
          enjoyCtx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          enjoyCtx.fill();
        });
      }
      requestAnimationFrame(renderEnjoyGameLoop);
    }
    renderEnjoyGameLoop();

    // Tactical DJ Soundboard Pads
    document.querySelectorAll('.dj-pad-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const freq = parseFloat(btn.getAttribute('data-note')) || 440;
        try {
          initAudio();
          const now = audioCtx.currentTime;
          const osc = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);
          g.gain.setValueAtTime(0.06, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
          osc.connect(g);
          g.connect(audioCtx.destination);
          osc.start(now);
          osc.stop(now + 0.25);
          reactorSurge = 2.6;
          triggerBgShockwave(window.innerWidth / 2, window.innerHeight / 2, '#ff7b00');
        } catch (e) {}
      });
    });

    const jarvisJokesAndTrivia = [
      "Sir, why do programmers always mix up Halloween and Christmas? Because Oct 31 equals Dec 25.",
      "Cosmic Telemetry Fact: Neutron stars spin up to 700 times per second, and a single teaspoon of their core weighs 4 billion tons.",
      "Diagnostic Humor: I ran a simulation of your social calendar, Sir. Even my quantum co-processor found the entropy impressive.",
      "Astrophysics Fact: A single bolt of lightning contains enough thermal energy to toast 100,000 slices of bread - or briefly charge the Mark III prototype."
    ];
    let jJokeIdx = 0;

    function tellJarvisJokeOrTrivia() {
      openHubModal('enjoy');
      const item = jarvisJokesAndTrivia[jJokeIdx++ % jarvisJokesAndTrivia.length];
      const card = document.getElementById('joke-display-card');
      if (card) card.textContent = item;
      appendMessage('J.A.R.V.I.S.', item, { source: 'ENJOYING ZONE // WIT' });
      speakText(item);
    }

    const tellJokeBtn = document.getElementById('tell-joke-btn');
    if (tellJokeBtn) tellJokeBtn.addEventListener('click', tellJarvisJokeOrTrivia);


    // =========================================================================
    // STEP 12: AUTO-OPENING DIRECT APPLICATION ENGINE + OS URI PROTOCOL BRIDGE
    // =========================================================================
    const contactDirectory = {};

    let currentWaRecipient = '';
    let currentWaPhone = '';

    function parseWhatsAppCommand(rawText) {
      // Handles natural phrasing like:
      // - "open whatsapp and message mom hello"
      // - "open whatsapp and say message do"
      // - "whatsapp alex meeting at 5"
      // - "open whatsapp"
      let cleaned = rawText
        .replace(/^(hey jarvis|ok jarvis|jarvis)\s*,?\s*/i, '')
        .replace(/^(please\s+)?(open|launch|start)\s+whatsapp\s*(and)?\s*/i, '')
        .replace(/^whatsapp\s*/i, '')
        .trim();

      let recipientName = '';
      let phoneDigits = '';
      let messageBody = '';

      // 1. Check if a known contact is explicitly named anywhere
      for (const [k, num] of Object.entries(contactDirectory)) {
        const rx = new RegExp(`\\b(?:to\\s+)?(${k})\\b`, 'i');
        const m = cleaned.match(rx);
        if (m) {
          recipientName = m[1].charAt(0).toUpperCase() + m[1].slice(1);
          phoneDigits = num.replace(/[^0-9]/g, '');
          cleaned = cleaned.replace(rx, '').trim();
          break;
        }
      }

      // 2. Strip command verbs ("say message", "send message", "message", "say", "send") to get the exact message payload
      messageBody = cleaned
        .replace(/^(say\s+an?\s+example\s+message|say\s+message|send\s+message|message|say|send|that|to)\s*/i, '')
        .trim();

      const nativeUri = (messageBody || phoneDigits)
        ? `whatsapp://send?phone=${phoneDigits}&text=${encodeURIComponent(messageBody)}`
        : 'whatsapp://';
      const webUrl = phoneDigits ? `https://wa.me/${phoneDigits}${messageBody ? '?text=' + encodeURIComponent(messageBody) : ''}` : (messageBody ? `https://wa.me/?text=${encodeURIComponent(messageBody)}` : `https://web.whatsapp.com/`);

      const desc = messageBody
        ? `Prepared a WhatsApp message draft for ${recipientName || 'the selected recipient'}. Review and send it in WhatsApp.`
        : `Opening WhatsApp for ${recipientName || 'the selected recipient'}.`;

      const spokenReply = messageBody
        ? `I prepared a WhatsApp message draft for ${recipientName || 'the selected recipient'}. Review the recipient and message, then tap Send in WhatsApp. Nothing has been sent yet.`
        : `Opening WhatsApp. No message has been sent.`;

      return { recipientName, phoneDigits, messageBody, nativeUri, webUrl, description: desc, spokenReply };
    }

    function sendDirectWhatsAppMessage(recipient, text) {
      const phone = String(contactDirectory[recipient?.toLowerCase?.()] || '').replace(/[^0-9]/g, '');
      const message = String(text || '').trim();
      if (!message) { showToast('Enter a message before opening WhatsApp.', 'error'); return; }
      const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      const header = document.getElementById('wa-active-header-name');
      if (header) header.textContent = recipient || 'WhatsApp';
      showToast('WhatsApp draft opened. Confirm the recipient and send it in WhatsApp.');
    }

    function openDirectAppWindow(appKey, payload = null) {
      return; // Disabled internal fake clone window  -  all apps launch externally!
      const win = document.getElementById('direct-app-os-window');
      const iconEl = document.getElementById('direct-app-icon');
      const titleEl = document.getElementById('direct-app-title');
      const subEl = document.getElementById('direct-app-subtitle');
      const nativeBtn = document.getElementById('direct-app-native-btn');

      document.querySelectorAll('.direct-app-pane').forEach(p => p.classList.add('hidden'));

      if (appKey === 'whatsapp') {
        document.getElementById('direct-view-whatsapp').classList.remove('hidden');
        if (iconEl) iconEl.textContent = '';
        if (titleEl) titleEl.textContent = 'WHATSAPP // LIVE CONNECTED APPLICATION';
        if (subEl) subEl.textContent = 'AUTOMATIC VOICE MESSAGE DISPATCH ACTIVE';
        if (nativeBtn && payload?.nativeUri) nativeBtn.href = payload.nativeUri;
        if (payload && payload.recipientName) {
          const headerName = document.getElementById('wa-active-header-name');
          if (headerName) headerName.textContent = `${payload.recipientName} (+${payload.phoneDigits})`;
          currentWaRecipient = payload.recipientName;
        }
        if (payload && payload.messageBody) {
          // Type-in animation then auto-send!
          const inp = document.getElementById('wa-direct-input');
          if (inp) inp.value = payload.messageBody;
          setTimeout(() => {
            
            if (inp) inp.value = '';
          }, 350);
        }
      } else if (appKey === 'youtube') {
        document.getElementById('direct-view-youtube').classList.remove('hidden');
        if (iconEl) iconEl.textContent = '▶';
        if (titleEl) titleEl.textContent = 'YOUTUBE // LIVE MEDIA APPLICATION';
        if (subEl) subEl.textContent = payload?.query ? `PLAYING: ${payload.query.toUpperCase()}` : 'STREAMING LIVE VIDEO';
        if (nativeBtn && payload?.nativeUri) nativeBtn.href = payload.nativeUri;
        const player = document.getElementById('yt-direct-player');
        if (player && payload?.query) {
          player.src = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(payload.query)}&autoplay=1`;
        }
      } else if (appKey === 'chrome') {
        document.getElementById('direct-view-chrome').classList.remove('hidden');
        if (iconEl) iconEl.textContent = '';
        if (titleEl) titleEl.textContent = 'GOOGLE CHROME // WEB APPLICATION';
        if (subEl) subEl.textContent = 'DIRECT WEB VIEWPORT ACTIVE';
        const urlInp = document.getElementById('chrome-direct-url');
        const iframe = document.getElementById('chrome-direct-iframe');
        if (payload?.query && urlInp && iframe) {
          const wiki = `https://en.m.wikipedia.org/wiki/${encodeURIComponent(payload.query.replace(/\s+/g, '_'))}`;
          urlInp.value = wiki;
          iframe.src = wiki;
        }
      }

      if (win) {
        win.classList.remove('hidden');
        win.classList.add('flex');
      }
    }

    document.getElementById('close-direct-app-btn').addEventListener('click', () => {
      const win = document.getElementById('direct-app-os-window');
      if (win) {
        win.classList.add('hidden');
        win.classList.remove('flex');
      }
      playHudSound('chirp');
    });

    // Contact row selection inside WhatsApp window
    document.querySelectorAll('.wa-contact-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-wa-contact');
        const phone = btn.getAttribute('data-wa-phone');
        currentWaRecipient = name;
        const headerName = document.getElementById('wa-active-header-name');
        if (headerName) headerName.textContent = `${name} (${phone})`;
        document.querySelectorAll('.wa-contact-row').forEach(b => b.classList.remove('bg-[#2a3942]'));
        btn.classList.add('bg-[#2a3942]');
        playHudSound('chirp');
      });
    });

    document.getElementById('wa-direct-send-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = document.getElementById('wa-direct-input');
      const txt = inp ? inp.value.trim() : '';
      if (!txt) return;
      inp.value = '';
      sendDirectWhatsAppMessage(currentWaRecipient, txt);
    });

    document.getElementById('yt-direct-search-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = document.getElementById('yt-direct-search-input').value.trim();
      if (!q) return;
      const player = document.getElementById('yt-direct-player');
      if (player) player.src = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(q)}&autoplay=1`;
      playHudSound('confirm');
    });

    document.querySelectorAll('.yt-direct-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        const vid = btn.getAttribute('data-yt-vid');
        const player = document.getElementById('yt-direct-player');
        if (player) player.src = `https://www.youtube.com/embed/${vid}?autoplay=1`;
        playHudSound('confirm');
      });
    });

    document.getElementById('chrome-direct-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = document.getElementById('chrome-direct-url').value.trim();
      if (!raw) return;
      const url = /^https?:\/\//i.test(raw) ? raw : `https://en.m.wikipedia.org/wiki/${encodeURIComponent(raw.replace(/\s+/g, '_'))}`;
      document.getElementById('chrome-direct-url').value = url;
      document.getElementById('chrome-direct-iframe').src = url;
      playHudSound('confirm');
    });

    let lastDispatchedWebUrl = 'https://wa.me/';
    let lastDispatchedNativeUri = 'whatsapp://send?text=Hello';
    let lastDispatchedAppName = 'WhatsApp';
    let lastDispatchedText = 'Hello from J.A.R.V.I.S.';
    let lastDispatchedTitle = 'J.A.R.V.I.S. Dispatch';

    function setOmniFeedback(msg) {
      const fb = document.getElementById('ext-click-feedback');
      if (fb) {
        fb.textContent = ` ${msg}`;
        fb.className = 'text-[11px] text-amber-300 font-bold bg-amber-950/50 p-1.5 border border-amber-400/50 rounded';
      }
      showToast(msg);
    }

    function getAndroidPackageName(appName) {
      const name = String(appName || '').toLowerCase();
      if (name.includes('whatsapp')) return 'com.whatsapp';
      if (name.includes('youtube')) return 'com.google.android.youtube';
      if (name.includes('instagram')) return 'com.instagram.android';
      if (name.includes('chrome')) return 'com.android.chrome';
      if (name.includes('spotify')) return 'com.spotify.music';
      return null;
    }

    function buildAndroidIntentUri(appName, webUrl, nativeUri) {
      const lower = appName.toLowerCase();
      const cleanPath = webUrl.replace(/^https?:\/\//i, '');
      if (lower.includes('youtube')) {
        return `intent://${cleanPath}#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
      }
      if (lower.includes('whatsapp')) {
        if (!nativeUri || nativeUri === 'whatsapp://') {
          return 'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.whatsapp;end';
        }
        const pathPart = nativeUri.replace(/^whatsapp:\/\//i, '');
        return `intent://${pathPart}#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
      }
      if (lower.includes('instagram')) {
        return `intent://instagram.com/#Intent;scheme=https;package=com.instagram.android;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
      }
      if (lower.includes('chrome') || lower.includes('google')) {
        return `intent://${cleanPath}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
      }
      return nativeUri || webUrl;
    }

    function dispatchRealExternalApp(appName, webUrl, nativeUri, description, sharePayloadText = '') {
      playHudSound('confirm');
      lastDispatchedAppName = appName;
      lastDispatchedWebUrl = webUrl;
      lastDispatchedNativeUri = nativeUri || webUrl;
      lastDispatchedText = sharePayloadText || description;
      lastDispatchedTitle = `J.A.R.V.I.S. // ${appName}`;

      // Close hub modal if open
      if (appHubModal) {
        appHubModal.classList.add('hidden');
        appHubModal.classList.remove('flex');
      }

      const isAndroid = /Android/i.test(navigator.userAgent);
      const intentUri = isAndroid ? buildAndroidIntentUri(appName, webUrl, nativeUri) : (nativeUri || webUrl);

      // 1. Update the clean External Launch Bar at the top of the screen with a real external `<a target="_blank">` link
      const banner = document.getElementById('external-launch-banner');
      const titleEl = document.getElementById('ext-banner-title');
      const descEl = document.getElementById('ext-banner-desc');
      const linkEl = document.getElementById('ext-banner-link');
      const nativeEl = document.getElementById('ext-native-uri-link');

      if (banner && titleEl && descEl && linkEl) {
        titleEl.textContent = ` EXTERNAL ${appName.toUpperCase()} READY`;
        descEl.textContent = `${description}`;
        linkEl.href = isAndroid ? '#launch-native-app' : webUrl;
        linkEl.onclick = (event) => {
          if (isAndroid) {
            event.preventDefault();
            const nativeAssistant = window.Capacitor?.Plugins?.NativeAssistant;
            const packageName = getAndroidPackageName(appName);
            if (nativeAssistant?.launchApp && packageName) {
              nativeAssistant.launchApp({ packageName }).then(() => {
                setOmniFeedback(appName + ' launch request sent to Android.');
              }).catch((err) => {
                console.error('Native app launch failed:', err);
                setOmniFeedback(appName + ' could not be opened. Check that it is installed.');
              });
            } else {
              setOmniFeedback('Native Android launcher is unavailable. Install the latest J.A.R.V.I.S. APK.');
            }
          }
        };
        linkEl.textContent = `OPEN ${appName.toUpperCase()} ↗`;
        if (nativeEl) {
          nativeEl.href = intentUri;
        }
        banner.classList.remove('hidden');
        banner.classList.add('flex');
      }

      // Launch through Android PackageManager in the Capacitor APK.
      // Do not send Android users to Chrome when a native launch fails.
      if (isAndroid) {
        const nativeAssistant = window.Capacitor?.Plugins?.NativeAssistant;
        const packageName = getAndroidPackageName(appName);
        if (nativeAssistant?.launchApp && packageName) {
          nativeAssistant.launchApp({ packageName }).then(() => {
            setOmniFeedback(appName + ' launch request sent to Android.');
          }).catch((err) => {
            console.error('Native app launch failed:', err);
            setOmniFeedback(appName + ' could not be opened. Check that it is installed.');
          });
        } else {
          setOmniFeedback('Native Android launcher is unavailable. Install the latest J.A.R.V.I.S. APK.');
        }
      } else {
        window.open(webUrl, '_blank', 'noopener,noreferrer');
      }
    }

    // Pure External Link & Share Handlers (Zero Internal Fake Screens!)
    const osShareBtn = document.getElementById('ext-os-share-btn');
    if (osShareBtn) {
      osShareBtn.addEventListener('click', async () => {
        if (navigator.share) {
          try {
            await navigator.share({ title: lastDispatchedTitle, text: lastDispatchedText, url: lastDispatchedWebUrl });
          } catch (e) {}
        }
      });
    }

    const copyUrlBtn = document.getElementById('ext-copy-url-btn');
    if (copyUrlBtn) {
      copyUrlBtn.addEventListener('click', () => {
        try { navigator.clipboard.writeText(lastDispatchedWebUrl); } catch (e) {}
        showToast('External URL Copied!');
      });
    }

    const extBannerClose = document.getElementById('ext-banner-close');
    if (extBannerClose) {
      extBannerClose.addEventListener('click', () => {
        const banner = document.getElementById('external-launch-banner');
        if (banner) {
          banner.classList.add('hidden');
          banner.classList.remove('flex');
        }
      });
    }

    document.querySelectorAll('.inapp-quick-launch').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const app = btn.getAttribute('data-inapp');
        if (app === 'whatsapp') {
          dispatchRealExternalApp('WhatsApp', 'https://wa.me/', 'whatsapp://', 'Open External WhatsApp');
          speakText('WhatsApp launcher activated.');
        } else if (app === 'youtube') {
          dispatchRealExternalApp('YouTube', 'https://m.youtube.com/', 'vnd.youtube://', 'Open YouTube application');
          speakText('YouTube launcher activated.');
        } else if (app === 'chrome') {
          dispatchRealExternalApp('Google Chrome', 'https://www.google.com/', 'googlechrome://www.google.com', 'Open Google Chrome browser');
          speakText('Google Chrome launcher activated.');
        }
      });
    });

    // =========================================================================
    // STEP 13: AUTONOMOUS AI WEB DEVELOPMENT STUDIO & CODE GENERATOR
    // =========================================================================
    const webdevTemplates = {
      portfolio: `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body class="bg-slate-950 text-cyan-100 font-sans p-6">
  <div class="max-w-xl mx-auto border border-cyan-500/40 rounded-xl p-6 bg-slate-900/90 shadow-lg">
    <div class="text-xs font-mono text-amber-400 uppercase tracking-widest">Portfolio template preview</div>
    <h1 class="text-2xl font-extrabold text-white mt-1">Projects and services</h1>
    <p class="text-xs text-slate-300 mt-2">Add project descriptions, screenshots, and contact details before publishing.</p>
    <div class="grid grid-cols-3 gap-3 mt-4 text-center">
      <div class="p-3 bg-slate-950 border border-cyan-500/30"><div class="text-sm font-bold text-cyan-300">LOCAL PREVIEW</div><div class="text-[10px] text-slate-400">NOT PUBLISHED</div></div>
      <div class="p-3 bg-slate-950 border border-amber-500/30"><div class="text-sm font-bold text-amber-300">STANDARD</div><div class="text-[10px] text-slate-400">MOTION PROFILE</div></div>
      <div class="p-3 bg-slate-950 border border-emerald-500/30"><div class="text-sm font-bold text-emerald-300">NOT CONNECTED</div><div class="text-[10px] text-slate-400">EXTERNAL AI SERVICE</div></div>
    </div>
    <p class="mt-4 text-xs text-slate-400">This is a local preview template. Deployment requires a configured hosting target.</p>
  </div>
</body>
</html>`,
      dashboard: `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body class="bg-[#050811] text-white font-mono p-5">
  <h2 class="text-sm font-bold text-cyan-400 border-b border-cyan-500/30 pb-2"> DASHBOARD PREVIEW</h2>
  <div class="grid grid-cols-2 gap-3 mt-3 text-xs">
    <div class="p-3 bg-slate-900 border border-cyan-500/30 rounded">
      <div class="text-slate-400">NEURAL THROUGHPUT</div>
      <div class="text-xl font-bold text-emerald-400 mt-1">NOT CONNECTED</div>
    </div>
    <div class="p-3 bg-slate-900 border border-amber-500/30 rounded">
      <div class="text-slate-400">ACTIVE NODES</div>
      <div class="text-xl font-bold text-amber-400 mt-1">NO LIVE DATA</div>
    </div>
  </div>
</body>
</html>`,
      calculator: `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body class="bg-slate-950 text-cyan-200 font-mono p-4 flex justify-center">
  <div class="w-64 p-4 bg-slate-900 border border-cyan-400/50 rounded-xl space-y-2">
    <div class="text-xs text-amber-400 font-bold"> NEON MATRIX CALC</div>
    <input id=" d" class="w-full p-2 bg-black border border-cyan-500/40 text-right text-lg text-white rounded" value="12*12">
    <button onclick="document.getElementById(' d').value = '144'" class="w-full py-2 bg-cyan-400 text-black font-bold rounded text-xs">COMPUTE (=)</button>
  </div>
</body>
</html>`
    };

    const webdevEditor = document.getElementById('webdev-code-editor');
    const webdevIframe = document.getElementById('webdev-preview-iframe');

    function renderWebDevPreview() {
      if (!webdevEditor || !webdevIframe) return;
      webdevIframe.srcdoc = webdevEditor.value;
    }

    if (webdevEditor) {
      webdevEditor.value = webdevTemplates.portfolio;
      renderWebDevPreview();
    }

    document.querySelectorAll('.webdev-tpl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-webtpl');
        if (webdevTemplates[key] && webdevEditor) {
          webdevEditor.value = webdevTemplates[key];
          renderWebDevPreview();
          playHudSound('confirm');
          showToast(`Loaded ${key.toUpperCase()} Template`);
        }
      });
    });

    const runWebdevBtn = document.getElementById('run-webdev-code-btn');
    if (runWebdevBtn) {
      runWebdevBtn.addEventListener('click', () => {
        renderWebDevPreview();
        playHudSound('confirm');
        showToast('Live Website Preview Updated!');
      });
    }

    function generateAiWebsiteInStudio(promptText) {
      const p = promptText.trim() || 'Futuristic AI App';
      const safePrompt = p.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
      const statusBadge = document.getElementById('webdev-status-badge');
      if (statusBadge) statusBadge.textContent = 'BUILDING LOCAL TEMPLATE...';

      const customHtml = `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body class="bg-[#04070f] text-cyan-100 font-sans p-6">
  <div class="max-w-xl mx-auto border border-cyan-400/50 rounded-xl p-5 bg-slate-900/90 space-y-3 shadow-xl">
    <div class="flex justify-between items-center border-b border-cyan-500/30 pb-2">
      <span class="text-xs font-mono text-amber-400">PROMPT-BASED TEMPLATE DEMO</span>
      <span class="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px]">LOCAL PREVIEW</span>
    </div>
    <h1 class="text-xl font-extrabold text-white uppercase tracking-wide">${safePrompt}</h1>
    <p class="text-xs text-slate-300 leading-relaxed">Demo template generated locally by J.A.R.V.I.S. for "${safePrompt}".</p>
    <div class="flex space-x-2 pt-2">
      <span class="px-4 py-2 border border-slate-600 text-slate-300 text-xs">PREVIEW ONLY - NO DEPLOYMENT OR FEATURE BACKEND</span>
    </div>
  </div>
</body>
</html>`;

      if (webdevEditor) {
        webdevEditor.value = customHtml;
        renderWebDevPreview();
      }
      if (statusBadge) statusBadge.textContent = 'LOCAL TEMPLATE PREVIEW READY';
      playHudSound('confirm');
      showToast(`Generated Template: ${p}`);
    }

    const aiWebdevForm = document.getElementById('ai-webdev-form');
    if (aiWebdevForm) {
      aiWebdevForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inp = document.getElementById('ai-webdev-prompt');
        if (inp && inp.value.trim()) {
          generateAiWebsiteInStudio(inp.value.trim());
          speakText(`Created a local website template preview for ${inp.value.trim()}. It has not been published.`);
          inp.value = '';
        }
      });
    }

    const exportWebappBtn = document.getElementById('export-webapp-btn');
    if (exportWebappBtn) {
      exportWebappBtn.addEventListener('click', () => {
        if (!webdevEditor) return;
        const blob = new Blob([webdevEditor.value], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'jarvis_generated_webapp.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        playHudSound('confirm');
        showToast('Exported Generated Website (.HTML)');
      });
    }

    // =========================================================================
    // STEP 14: AUTONOMOUS MULTI-AGENT AI SWARM CONTROLLER
    // =========================================================================
    function runAutonomousAgentSwarm(missionTopic) {
      const topic = String(missionTopic || '').trim();
      if (!topic) { showToast('Enter a workflow topic first.', 'error'); return; }
      const badge = document.getElementById('swarm-status-badge');
      const output = document.getElementById('swarm-master-output');
      if (typeof generateAiWebsiteInStudio === 'function') generateAiWebsiteInStudio(topic);
      const report = `This build does not run independent AI agents. It created a local template preview for "${topic}". No external research, security audit, or deployment was performed.`;
      if (badge) { badge.textContent = 'LOCAL PREVIEW ONLY'; badge.className = 'px-2.5 py-0.5 bg-slate-800 border border-cyan-500/40 text-cyan-200 text-[10px] font-bold'; }
      if (output) output.textContent = report;
      appendMessage('J.A.R.V.I.S.', report, { source: 'LOCAL WORKFLOW PREVIEW' });
      showToast('Local template preview created. No independent agents were run.');
    }

    const swarmForm = document.getElementById('agent-swarm-form');
    if (swarmForm) {
      swarmForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inp = document.getElementById('agent-mission-input');
        const val = inp ? inp.value.trim() : '';
        if (val) {
          inp.value = '';
          runAutonomousAgentSwarm(val);
        }
      });
    }


    // =========================================================================
    // STEP 15: USER CUSTOM CONTACTS & SIMPLE DIRECT EXTERNAL APP LINKS
    // =========================================================================
    if (!state.connectedApps.userContacts) {
      state.connectedApps.userContacts = [];
    }

    function syncUserContactsToDirectory() {
      (state.connectedApps.userContacts || []).forEach(contact => {
        const name = String(contact?.name || '').trim().toLowerCase();
        const phone = String(contact?.phone || '').replace(/[^0-9]/g, '');
        if (name && phone && !['__proto__', 'constructor', 'prototype'].includes(name)) {
          Object.defineProperty(contactDirectory, name, { value: phone, configurable: true, writable: true, enumerable: true });
        }
      });
    }

    function renderUserContactsList() {
      syncUserContactsToDirectory();
      const listEl = document.getElementById('user-contacts-list');
      if (!listEl) return;
      const contacts = Array.isArray(state.connectedApps.userContacts) ? state.connectedApps.userContacts : [];
      if (!contacts.length) {
        listEl.innerHTML = '<div class="text-slate-500 text-[11px] italic py-2 text-center">No contacts saved.</div>';
        return;
      }
      listEl.innerHTML = contacts.map(contact => {
        const raw = String(contact.phone || '').replace(/[^0-9+]/g, '');
        const phone = raw.startsWith('+') ? '+' + raw.slice(1).replace(/\+/g, '') : raw.replace(/\+/g, '');
        const tel = phone.length >= 5 ? `tel:${phone}` : '';
        const id = Number(contact.id) || 0;
        return `
          <div class="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-950 border border-cyan-500/25">
            <div class="min-w-0">
              <strong class="text-cyan-200">${escapeHTML(contact.name || 'Unnamed contact')}</strong>
              ${tel ? `<a class="text-slate-300 text-[10px] ml-1.5 underline underline-offset-2" href="${escapeHTML(tel)}">${escapeHTML(contact.phone)}</a>` : '<span class="text-slate-500 text-[10px] ml-1.5">No valid phone number</span>'}
            </div>
            <div class="flex items-center gap-1.5">
              ${tel ? `<button type="button" data-ucall-id="${id}" class="ucall-btn px-2.5 py-1 bg-emerald-700 text-white font-bold text-[10px]">CALL</button>` : ''}
              <button type="button" data-udel-id="${id}" class="text-rose-400 hover:text-rose-300 text-[10px]">DELETE</button>
            </div>
          </div>`;
      }).join('');
      listEl.querySelectorAll('[data-ucall-id]').forEach(button => button.addEventListener('click', () => {
        const id = Number(button.getAttribute('data-ucall-id'));
        const contact = contacts.find(item => Number(item.id) === id);
        if (contact) startJarvisPhoneCall(String(contact.name || ''), String(contact.phone || ''));
      }));
      listEl.querySelectorAll('[data-udel-id]').forEach(button => button.addEventListener('click', () => {
        const id = Number(button.getAttribute('data-udel-id'));
        state.connectedApps.userContacts = contacts.filter(item => Number(item.id) !== id);
        saveAppsState(); renderUserContactsList();
      }));
    }
    renderUserContactsList();

    const addContactForm = document.getElementById('add-user-contact-form');
    if (addContactForm) {
      addContactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInp = document.getElementById('custom-contact-name');
        const phoneInp = document.getElementById('custom-contact-phone');
        const name = nameInp ? nameInp.value.trim() : '';
        const phone = phoneInp ? phoneInp.value.trim() : '';
        if (name && phone) {
          state.connectedApps.userContacts.push({ id: Date.now(), name, phone });
          nameInp.value = '';
          phoneInp.value = '';
          playHudSound('confirm');
          saveAppsState();
          renderUserContactsList();
          showToast(`Saved Contact: ${name}`);
        }
      });
    }

    // Dynamic href updaters for Simple Direct External Launchers in Tab 7
    const simpleYtInp = document.getElementById('simple-yt-input');
    const simpleYtLink = document.getElementById('simple-yt-link');
    if (simpleYtInp && simpleYtLink) {
      simpleYtInp.addEventListener('input', () => {
        const q = simpleYtInp.value.trim();
        simpleYtLink.href = q ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` : 'https://www.youtube.com';
      });
    }

    const simpleWaPhone = document.getElementById('simple-wa-phone');
    const simpleWaText = document.getElementById('simple-wa-text');
    const simpleWaLink = document.getElementById('simple-wa-link');
    function updateSimpleWaHref() {
      if (!simpleWaLink) return;
      const p = simpleWaPhone ? simpleWaPhone.value.replace(/[^0-9]/g, '') : '';
      const t = simpleWaText ? simpleWaText.value.trim() : '';
      simpleWaLink.href = p
        ? `https://wa.me/${p}${t ? '?text=' + encodeURIComponent(t) : ''}`
        : (t ? `https://wa.me/?text=${encodeURIComponent(t)}` : 'https://wa.me/');
    }
    if (simpleWaPhone) simpleWaPhone.addEventListener('input', updateSimpleWaHref);
    if (simpleWaText) simpleWaText.addEventListener('input', updateSimpleWaHref);

    const simpleGoogleInp = document.getElementById('simple-google-input');
    const simpleGoogleLink = document.getElementById('simple-google-link');
    if (simpleGoogleInp && simpleGoogleLink) {
      simpleGoogleInp.addEventListener('input', () => {
        const q = simpleGoogleInp.value.trim();
        simpleGoogleLink.href = q ? `https://www.google.com/search?q=${encodeURIComponent(q)}` : 'https://www.google.com';
      });
    }






    // =========================================================================
    // STEP 16: AI FILE & IMAGE SCANNER, LIVE CRYPTO/FX RADAR & PWA INSTALLER
    // =========================================================================
    let lastScanSummaryText = "Ready to analyze documents, datasets, or images, Commander.";

    const fileScannerInput = document.getElementById('ai-file-scanner-input');
    const scanOutBox = document.getElementById('ai-file-scan-output');
    const scanBadge = document.getElementById('scan-status-badge');
    const imgWrap = document.getElementById('scan-image-preview-wrap');
    const imgThumb = document.getElementById('scan-image-thumb');
    const imgMeta = document.getElementById('scan-image-meta');

    if (fileScannerInput) {
      fileScannerInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) { showToast('File exceeds the 20 MB inspection limit.', 'error'); e.target.value = ''; return; }
        playHudSound('pulse');
        if (scanBadge) scanBadge.textContent = 'ANALYZING...';
        const kb = (file.size / 1024).toFixed(1);

        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            const img = new Image();
            img.onload = () => {
              if (imgWrap && imgThumb && imgMeta) {
                imgThumb.src = dataUrl;
                imgMeta.innerHTML = `<div><strong>FILE:</strong> ${escapeHTML(file.name)}</div><div><strong>RESOLUTION:</strong> ${img.width} × ${img.height} px (${kb} KB)</div>`;
                imgWrap.classList.remove('hidden');
                imgWrap.classList.add('flex');
              }
              const summary = `Optical Image Scan Complete for ${escapeHTML(file.name)}. Resolution is ${img.width} by ${img.height} pixels, size ${kb} kilobytes, aspect ratio ${(img.width / Math.max(1, img.height)).toFixed(2)}.`;
              lastScanSummaryText = summary;
              if (scanOutBox) scanOutBox.innerHTML = `<strong class="text-cyan-300">IMAGE TELEMETRY REPORT:</strong><br>${escapeHTML(summary)}`;
              if (scanBadge) scanBadge.textContent = 'IMAGE VERIFIED ';
              appendMessage('J.A.R.V.I.S.', summary, { source: 'OPTICAL IMAGE SCANNER' });
              speakText(summary);
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
        } else {
          if (imgWrap) { imgWrap.classList.add('hidden'); imgWrap.classList.remove('flex'); }
          const reader = new FileReader();
          reader.onload = (ev) => {
            const text = String(ev.target.result || '');
            const lines = text.split(/\r?\n/).filter(Boolean);
            const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
            const previewSnippet = lines.slice(0, 3).join(' // ').slice(0, 160);
            const summary = `Document Scan Complete for ${escapeHTML(file.name)} (${kb} KB). Extracted ${lines.length} non-empty lines and ${wordCount} words. Top content preview: ${escapeHTML(previewSnippet)}`;
            lastScanSummaryText = summary;
            if (scanOutBox) {
              scanOutBox.innerHTML = `<strong class="text-amber-300">DOCUMENT ANALYSIS // ${escapeHTML(file.name.toUpperCase())}:</strong><br>Lines: ${lines.length} | Words: ${wordCount} | Size: ${kb} KB<br><span class="text-cyan-200 mt-1 block">Preview: "${escapeHTML(previewSnippet)}..."</span>`;
            }
            if (scanBadge) scanBadge.textContent = 'DOC ANALYZED ';
            appendMessage('J.A.R.V.I.S.', summary, { source: 'AI DOCUMENT SCANNER' });
            speakText(summary);
          };
          reader.readAsText(file);
        }
      });
    }

    const speakScanBtn = document.getElementById('speak-scan-btn');
    if (speakScanBtn) {
      speakScanBtn.addEventListener('click', () => {
        speakText(lastScanSummaryText);
      });
    }

    // --- LIVE CRYPTO & CURRENCY MARKET RADAR (KEYLESS PUBLIC REST API) ---
    async function fetchLiveMarketRadar(announceToast = false) {
      let btcStr = 'NOT AVAILABLE';
      let ethStr = 'NOT AVAILABLE';
      let inrStr = 'NOT AVAILABLE';
      let cryptoUpdated = false;
      let fxUpdated = false;

      try {
        const cgRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
        if (cgRes.ok) {
          const cgData = await cgRes.json();
          if (Number.isFinite(cgData?.bitcoin?.usd)) btcStr = '$' + Number(cgData.bitcoin.usd).toLocaleString();
          if (Number.isFinite(cgData?.ethereum?.usd)) ethStr = '$' + Number(cgData.ethereum.usd).toLocaleString();
          cryptoUpdated = btcStr !== 'NOT AVAILABLE' || ethStr !== 'NOT AVAILABLE';
        }
      } catch (e) {}

      try {
        const fxRes = await fetch('https://open.er-api.com/v6/latest/USD');
        if (fxRes.ok) {
          const fxData = await fxRes.json();
          if (Number.isFinite(fxData?.rates?.INR)) { inrStr = '₹' + Number(fxData.rates.INR).toFixed(2); fxUpdated = true; }
        }
      } catch (e) {}

      const btcEl = document.getElementById('mkt-btc-val');
      const ethEl = document.getElementById('mkt-eth-val');
      const inrEl = document.getElementById('mkt-inr-val');
      if (btcEl) btcEl.textContent = btcStr;
      if (ethEl) ethEl.textContent = ethStr;
      if (inrEl) inrEl.textContent = inrStr;

      if (announceToast) showToast(cryptoUpdated || fxUpdated ? 'Available market rates refreshed. Unavailable fields are marked.' : 'Market data is currently unavailable.', cryptoUpdated || fxUpdated ? 'success' : 'error');
      return `Live Global Market Radar: Bitcoin is trading at ${btcStr}, Ethereum is at ${ethStr}, and the US Dollar to Indian Rupee exchange rate is ${inrStr}.`;
    }
    fetchLiveMarketRadar(false);

    const refreshMktBtn = document.getElementById('refresh-market-btn');
    if (refreshMktBtn) {
      refreshMktBtn.addEventListener('click', async () => {
        playHudSound('chirp');
        const rep = await fetchLiveMarketRadar(true);
        speakText(rep);
      });
    }

    const pwaInstallTriggerBtn = document.getElementById('pwa-install-trigger-btn');
    if (pwaInstallTriggerBtn) {
      pwaInstallTriggerBtn.addEventListener('click', () => {
        const dlBtn = document.getElementById('download-app-btn');
        if (dlBtn) dlBtn.click();
      });
    }


    // =========================================================================
    // STEP 17: GOOGLE AI STUDIO BRIDGE & ONE-CLICK PROMPT / CODE EXPORTER
    // =========================================================================
    const aiStudioVaultBtn = document.getElementById('aistudio-open-vault-btn');
    if (aiStudioVaultBtn) {
      aiStudioVaultBtn.addEventListener('click', () => {
        if (appHubModal) { appHubModal.classList.add('hidden'); appHubModal.classList.remove('flex'); }
        if (vaultModal) { vaultModal.classList.remove('hidden'); vaultModal.classList.add('flex'); }
        playHudSound('chirp');
      });
    }

    const copyPromptBtn = document.getElementById('copy-aistudio-prompt-btn');
    if (copyPromptBtn) {
      copyPromptBtn.addEventListener('click', () => {
        const box = document.getElementById('aistudio-system-prompt-box');
        if (!box) return;
        try {
          navigator.clipboard.writeText(box.value);
        } catch (e) {
          box.select();
          document.execCommand('copy');
        }
        playHudSound('confirm');
        const st = document.getElementById('aistudio-copy-status');
        if (st) st.textContent = 'PROMPT COPIED ';
        showToast('System Prompt Copied for Google AI Studio!');
      });
    }

    const copyFullHtmlBtn = document.getElementById('copy-full-html-btn');
    if (copyFullHtmlBtn) {
      copyFullHtmlBtn.addEventListener('click', () => {
        const fullCode = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
        try {
          navigator.clipboard.writeText(fullCode);
        } catch (e) {
          const ta = document.createElement('textarea');
          ta.value = fullCode;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        playHudSound('confirm');
        const st = document.getElementById('aistudio-copy-status');
        if (st) st.textContent = 'FULL HTML COPIED ';
        showToast('Full App HTML Code Copied to Clipboard!');
      });
    }


    // =========================================================================
    // STEP 18: BIOMETRIC RETINAL LOCK, SMART ENVIRONMENT & FOCUS REACTOR
    // =========================================================================
    const bioOverlay = document.getElementById('biometric-lock-overlay');
    const bioCanvas = document.getElementById('biometricCanvas');
    const bioCtx = bioCanvas ? bioCanvas.getContext('2d') : null;
    const bioReadout = document.getElementById('bio-scan-readout');
    const bioStatus = document.getElementById('bio-lock-status');
    let bioLocked = false;
    let bioScanProgress = 0;
    let bioScanning = false;

    function engageBiometricLock() {
      bioLocked = true;
      bioScanning = false;
      bioScanProgress = 0;
      playHudSound('pulse');
      if (bioOverlay) {
        bioOverlay.classList.remove('hidden');
        bioOverlay.classList.add('flex');
      }
      if (bioStatus) bioStatus.textContent = 'LOCKED // DEMO MODE';
      if (bioReadout) bioReadout.textContent = 'Demo only: this visual lock does not verify identity. No PIN or biometric authentication is configured.';
      speakText("Visual demo lock engaged. This does not authenticate identity.");
    }

    function runBiometricUnlockScan() {
      if (bioScanning) return;
      bioScanning = true;
      playHudSound('chirp');
      if (bioStatus) bioStatus.textContent = 'SIMULATING VISUAL SCAN...';
      if (bioReadout) bioReadout.textContent = 'Running visual animation only  -  no biometric sensor is being read.';

      const scanInterval = setInterval(() => {
        bioScanProgress += 12;
        if (bioScanProgress >= 100) {
          clearInterval(scanInterval);
          bioLocked = false;
          bioScanning = false;
          playHudSound('confirm');
          if (bioOverlay) {
            bioOverlay.classList.add('hidden');
            bioOverlay.classList.remove('flex');
          }
          speakText("Visual demo complete. Identity was not verified.");
          showToast("Visual Demo Complete (Not Authenticated)");
        }
      }, 90);
    }

    const lockOsBtn = document.getElementById('lock-os-btn');
    if (lockOsBtn) lockOsBtn.addEventListener('click', engageBiometricLock);
    if (bioCanvas) bioCanvas.addEventListener('click', runBiometricUnlockScan);
    const bioQuickBtn = document.getElementById('bio-quick-scan-btn');
    if (bioQuickBtn) bioQuickBtn.addEventListener('click', runBiometricUnlockScan);

    const bioPinForm = document.getElementById('bio-pin-form');
    if (bioPinForm) {
      bioPinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inp = document.getElementById('bio-pin-input');
        if (inp) inp.value = '';
        runBiometricUnlockScan();
      });
    }

    function renderBiometricScanner() {
      if (bioCtx && bioLocked) {
        const w = bioCanvas.width;
        const h = bioCanvas.height;
        const cx = w / 2;
        const cy = h / 2;
        bioCtx.clearRect(0, 0, w, h);

        bioCtx.save();
        bioCtx.translate(cx, cy);
        bioCtx.rotate(tick * 0.6);
        bioCtx.strokeStyle = bioScanning ? '#10b981' : '#00e5ff';
        bioCtx.lineWidth = 2;
        bioCtx.setLineDash([12, 8]);
        bioCtx.beginPath();
        bioCtx.arc(0, 0, 72, 0, Math.PI * 2);
        bioCtx.stroke();

        bioCtx.rotate(-tick * 1.2);
        bioCtx.strokeStyle = '#ff7b00';
        bioCtx.beginPath();
        bioCtx.arc(0, 0, 52, 0, Math.PI * 1.4);
        bioCtx.stroke();
        bioCtx.setLineDash([]);
        bioCtx.restore();

        // Laser sweep line
        const scanY = cy + Math.sin(tick * 3) * 58;
        bioCtx.strokeStyle = '#ff2a55';
        bioCtx.lineWidth = 1.5;
        bioCtx.beginPath();
        bioCtx.moveTo(cx - 65, scanY);
        bioCtx.lineTo(cx + 65, scanY);
        bioCtx.stroke();
      }
      requestAnimationFrame(renderBiometricScanner);
    }
    renderBiometricScanner();

    // --- SMART ENVIRONMENT / IOT SIMULATOR ---
    const iotState = {
      lightsOn: true,
      lightsPct: 85,
      acTemp: 22,
      doorsLocked: true,
      dndActive: false
    };

    function updateIotUi() {
      const lBtn = document.getElementById('iot-lights-btn');
      const acEl = document.getElementById('iot-ac-temp');
      const dBtn = document.getElementById('iot-door-btn');
      const dSt = document.getElementById('iot-door-status');
      const dndBtn = document.getElementById('iot-dnd-btn');
      const dndSt = document.getElementById('iot-dnd-status');

      if (lBtn) {
        lBtn.textContent = iotState.lightsOn ? `ON (${iotState.lightsPct}%)` : 'OFF';
        lBtn.className = iotState.lightsOn
          ? 'px-2.5 py-0.5 bg-emerald-500 text-black font-bold text-[10px] rounded'
          : 'px-2.5 py-0.5 bg-slate-800 text-slate-400 font-bold text-[10px] rounded';
      }
      if (acEl) acEl.textContent = `${iotState.acTemp}°C`;
      if (dBtn && dSt) {
        dBtn.textContent = iotState.doorsLocked ? 'LOCKED ' : 'UNLOCKED ';
        dBtn.className = iotState.doorsLocked
          ? 'px-3 py-1.5 bg-emerald-500 text-black font-bold text-[10px] rounded'
          : 'px-3 py-1.5 bg-amber-500 text-black font-bold text-[10px] rounded';
        dSt.textContent = iotState.doorsLocked ? 'Armed & Locked' : 'Unlocked';
      }
      if (dndBtn && dndSt) {
        dndBtn.textContent = iotState.dndActive ? 'ACTIVE ' : 'STANDBY';
        dndSt.textContent = iotState.dndActive ? 'All Alerts Silenced' : 'Notifications Active';
      }
    }

    const iotLightsBtn = document.getElementById('iot-lights-btn');
    if (iotLightsBtn) {
      iotLightsBtn.addEventListener('click', () => {
        iotState.lightsOn = !iotState.lightsOn;
        playHudSound('chirp');
        updateIotUi();
      });
    }
    const iotSlider = document.getElementById('iot-lights-slider');
    if (iotSlider) {
      iotSlider.addEventListener('input', (e) => {
        iotState.lightsPct = Number(e.target.value);
        iotState.lightsOn = iotState.lightsPct > 0;
        updateIotUi();
      });
    }
    const acDown = document.getElementById('iot-ac-down');
    if (acDown) acDown.addEventListener('click', () => { iotState.acTemp = Math.max(16, iotState.acTemp - 1); playHudSound('chirp'); updateIotUi(); });
    const acUp = document.getElementById('iot-ac-up');
    if (acUp) acUp.addEventListener('click', () => { iotState.acTemp = Math.min(30, iotState.acTemp + 1); playHudSound('chirp'); updateIotUi(); });

    const iotDoorBtn = document.getElementById('iot-door-btn');
    if (iotDoorBtn) {
      iotDoorBtn.addEventListener('click', () => {
        iotState.doorsLocked = !iotState.doorsLocked;
        playHudSound('confirm');
        updateIotUi();
      });
    }
    const iotDndBtn = document.getElementById('iot-dnd-btn');
    if (iotDndBtn) {
      iotDndBtn.addEventListener('click', () => {
        iotState.dndActive = !iotState.dndActive;
        playHudSound('chirp');
        updateIotUi();
      });
    }

    // --- ARC FOCUS REACTOR TIMER ---
    let focusSecLeft = 25 * 60;
    let focusTimerId = null;
    const focusDisp = document.getElementById('focus-timer-display');
    const focusBadge = document.getElementById('focus-state-badge');

    function renderFocusTime() {
      if (!focusDisp) return;
      const m = String(Math.floor(focusSecLeft / 60)).padStart(2, '0');
      const s = String(focusSecLeft % 60).padStart(2, '0');
      focusDisp.textContent = `${m}:${s}`;
    }

    function startFocusTimer() {
      if (focusTimerId) return;
      playHudSound('confirm');
      if (focusBadge) focusBadge.textContent = 'SPRINT ACTIVE ';
      focusTimerId = setInterval(() => {
        if (focusSecLeft > 0) {
          focusSecLeft--;
          renderFocusTime();
        } else {
          clearInterval(focusTimerId);
          focusTimerId = null;
          if (focusBadge) focusBadge.textContent = 'COMPLETE ';
          speakText("Commander, your 25-minute deep focus sprint is complete.");
        }
      }, 1000);
    }

    const fStart = document.getElementById('focus-start-btn');
    if (fStart) fStart.addEventListener('click', startFocusTimer);
    const fPause = document.getElementById('focus-pause-btn');
    if (fPause) fPause.addEventListener('click', () => {
      if (focusTimerId) { clearInterval(focusTimerId); focusTimerId = null; }
      if (focusBadge) focusBadge.textContent = 'PAUSED';
      playHudSound('chirp');
    });
    const fReset = document.getElementById('focus-reset-btn');
    if (fReset) fReset.addEventListener('click', () => {
      if (focusTimerId) { clearInterval(focusTimerId); focusTimerId = null; }
      focusSecLeft = 25 * 60;
      renderFocusTime();
      if (focusBadge) focusBadge.textContent = 'READY';
      playHudSound('chirp');
    });


    // =========================================================================
    // STEP 19: VERIFIED REAL CLIPBOARD COPY, REAL FILE EXPORT & LIVE MEDIA API
    // =========================================================================
    let currentIoFilename = 'jarvis_export.txt';
    let currentIoContent = '';
    let currentIoMime = 'text/plain;charset=utf-8';

    // 1. Guaranteed Real Clipboard Copy (Works inside sandboxed mobile & desktop iframes!)
    function realCopyTextToClipboard(text, label = 'Content') {
      const str = String(text || '');
      let copiedOk = false;

      // Method A: Synchronous selectable off-screen textarea + execCommand('copy')
      try {
        const ta = document.createElement('textarea');
        ta.value = str;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '10px';
        ta.style.left = '10px';
        ta.style.width = '2px';
        ta.style.height = '2px';
        ta.style.opacity = '0.01';
        ta.style.userSelect = 'text';
        ta.style.webkitUserSelect = 'text';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, str.length);
        copiedOk = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) {}

      // Method B: Async Clipboard API backup
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(str).catch(() => {});
      }

      // Always open the Verified I/O Drawer with the text highlighted so the user can see & verify the exact copied content!
      openRealIoDrawer(`${label} (${str.length.toLocaleString()} chars)`, str, 'jarvis_clipboard.txt', 'text/plain;charset=utf-8', copiedOk);
      playHudSound('confirm');
      return copiedOk;
    }

    // 2. Guaranteed Real File Export / Download (Blob + Data URI + Mobile OS File Share + Visible Drawer)
    function realDownloadOrShareFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
      currentIoFilename = filename;
      currentIoContent = String(content || '');
      currentIoMime = mimeType;
      playHudSound('confirm');

      // A. Attempt standard Blob <a download> (works in standalone desktop/mobile browsers)
      try {
        const blob = new Blob([currentIoContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      } catch (e) {}

      // B. Also copy the file content to the system clipboard immediately AND open the Verified I/O Drawer
      //    so inside a sandboxed preview iframe (where <a download> is blocked by Chrome), the user immediately
      //    gets the real file content selected, copied, and ready to save via OS Share Sheet!
      realCopyTextToClipboard(currentIoContent, `FILE: ${filename}`);
      const titleEl = document.getElementById('io-drawer-title');
      if (titleEl) titleEl.textContent = ` EXPORTED: ${filename.toUpperCase()} (${(currentIoContent.length / 1024).toFixed(1)} KB)`;

      const dataLink = document.getElementById('io-drawer-data-link');
      if (dataLink) {
        dataLink.download = filename;
        dataLink.href = `data:${mimeType},${encodeURIComponent(currentIoContent.slice(0, 65000))}`;
      }
    }

    function openRealIoDrawer(titleText, bodyContent, filename, mimeType, copiedStatus) {
      currentIoFilename = filename || 'jarvis_export.txt';
      currentIoContent = bodyContent;
      currentIoMime = mimeType || 'text/plain;charset=utf-8';

      const drawer = document.getElementById('real-io-drawer');
      const titleEl = document.getElementById('io-drawer-title');
      const statusEl = document.getElementById('io-drawer-status');
      const areaEl = document.getElementById('io-drawer-textarea');

      if (titleEl) titleEl.textContent = ` ${titleText.toUpperCase()}`;
      if (statusEl) {
        statusEl.innerHTML = copiedStatus
          ? ` <strong>Copied to system clipboard!</strong> Because the preview sandbox blocks silent file downloads, the exact raw content is also pre-selected below - or tap <strong> SAVE / SHARE FILE (OS)</strong> to save directly to your phone/device:`
          : `Staging verified content below. Tap <strong> SELECT & COPY ALL</strong> or <strong> SAVE / SHARE FILE (OS)</strong>:`;
      }
      if (areaEl) {
        areaEl.value = bodyContent;
        setTimeout(() => {
          areaEl.focus();
          areaEl.select();
        }, 80);
      }
      if (drawer) {
        drawer.classList.remove('hidden');
        drawer.classList.add('flex');
      }
    }

    document.getElementById('io-drawer-close').addEventListener('click', () => {
      const drawer = document.getElementById('real-io-drawer');
      if (drawer) { drawer.classList.add('hidden'); drawer.classList.remove('flex'); }
    });

    document.getElementById('io-drawer-copy-btn').addEventListener('click', () => {
      const areaEl = document.getElementById('io-drawer-textarea');
      if (!areaEl) return;
      areaEl.focus();
      areaEl.select();
      areaEl.setSelectionRange(0, areaEl.value.length);
      try { document.execCommand('copy'); } catch (e) {}
      if (navigator.clipboard) navigator.clipboard.writeText(areaEl.value).catch(() => {});
      showToast('Copied All Content to System Clipboard ');
    });

    document.getElementById('io-drawer-share-btn').addEventListener('click', async () => {
      if (navigator.share) {
        try {
          const fileObj = new File([currentIoContent], currentIoFilename, { type: currentIoMime.split(';')[0] });
          if (navigator.canShare && navigator.canShare({ files: [fileObj] })) {
            await navigator.share({ files: [fileObj], title: currentIoFilename, text: 'Exported from J.A.R.V.I.S. OS' });
            showToast('Shared File via OS Sheet ');
            return;
          }
          await navigator.share({ title: currentIoFilename, text: currentIoContent.slice(0, 4000) });
          showToast('Shared Text via OS Sheet ');
          return;
        } catch (e) {}
      }
      showToast('OS Share Sheet unavailable  -  content is selected & copied in the box!');
    });

    // Re-bind ALL Download & Copy buttons across the entire app to use `realDownloadOrShareFile` and `realCopyTextToClipboard`!
    const dlAppBtn = document.getElementById('download-app-btn');
    if (dlAppBtn) {
      dlAppBtn.onclick = (e) => {
        e.stopPropagation();
        const fullHtml = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
        realDownloadOrShareFile('JARVIS_SHIELD_OS_Standalone.html', fullHtml, 'text/html;charset=utf-8');
      };
    }

    const expJsonBtn = document.getElementById('export-json-btn');
    if (expJsonBtn) {
      expJsonBtn.onclick = (e) => {
        e.stopPropagation();
        const jsonStr = JSON.stringify(state.connectedApps, null, 2);
        realDownloadOrShareFile('jarvis_workspace_backup.json', jsonStr, 'application/json;charset=utf-8');
      };
    }

    const dlIcsBtn = document.getElementById('download-ics-btn');
    if (dlIcsBtn) {
      dlIcsBtn.onclick = (e) => {
        e.stopPropagation();
        const title = (document.getElementById('ext-gcal-title')?.value || 'Stark Tactical Briefing').trim();
        const nowIso = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `DTSTAMP:${nowIso}`, `DTSTART:${nowIso}`, `SUMMARY:${title}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
        realDownloadOrShareFile(`${title.replace(/[^a-z0-9]/gi, '_')}.ics`, ics, 'text/calendar;charset=utf-8');
      };
    }

    const expWebBtn = document.getElementById('export-webapp-btn');
    if (expWebBtn) {
      expWebBtn.onclick = (e) => {
        e.stopPropagation();
        const code = document.getElementById('webdev-code-editor')?.value || '';
        realDownloadOrShareFile('jarvis_generated_webapp.html', code, 'text/html;charset=utf-8');
      };
    }

    if (copyUrlBtn) {
      copyUrlBtn.onclick = (e) => {
        e.stopPropagation();
        realCopyTextToClipboard(lastDispatchedWebUrl, 'EXTERNAL APP URL');
      };
    }

    if (copyPromptBtn) {
      copyPromptBtn.onclick = (e) => {
        e.stopPropagation();
        const val = document.getElementById('aistudio-system-prompt-box')?.value || '';
        realCopyTextToClipboard(val, 'AI STUDIO SYSTEM PROMPT');
      };
    }

    if (copyFullHtmlBtn) {
      copyFullHtmlBtn.onclick = (e) => {
        e.stopPropagation();
        const fullHtml = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
        realCopyTextToClipboard(fullHtml, 'FULL JARVIS HTML SOURCE CODE');
      };
    }

    // 3. LIVE REAL-WORLD MEDIA & YOUTUBE SEARCH ENGINE (Fetches Real Playable Audio/Video Previews via iTunes/Piped API with ZERO Error 153!)
    async function fetchAndRenderLiveMediaResults(query, appName) {
      const box = document.getElementById('live-media-results-box');
      if (!box) return;
      const cleanQuery = String(query || '').trim();
      if (!cleanQuery) { box.textContent = 'Enter a search term to load media results.'; return; }
      box.classList.remove('hidden'); box.textContent = `Searching media results for "${cleanQuery}".`;
      try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&limit=3`);
        if (!response.ok) throw new Error('Media search provider unavailable.');
        const data = await response.json();
        if (data?.results?.length) {
          box.innerHTML = `
            <div class="text-[10px] text-emerald-400 font-bold uppercase">MEDIA RESULTS FOR "${escapeHTML(cleanQuery.toUpperCase())}"</div>
            <div class="space-y-2">
              ${data.results.map(item => {
                const title = item.trackName || item.collectionName || cleanQuery;
                const artist = item.artistName || 'Unknown creator';
                const artwork = safeExternalUrl(item.artworkUrl100 || '');
                const preview = safeExternalUrl(item.previewUrl || '');
                const youtube = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(title + ' ' + artist);
                return `<div class="p-2.5 bg-slate-950 border border-cyan-500/40 flex flex-col space-y-2">
                  <div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2.5 overflow-hidden">
                    ${artwork ? `<img src="${escapeHTML(artwork)}" alt="" loading="lazy" class="w-10 h-10 border border-cyan-400 shrink-0">` : ''}
                    <div class="min-w-0"><div class="text-white font-bold text-xs break-words">${escapeHTML(title)}</div><div class="text-slate-400 text-[10px] break-words">${escapeHTML(artist)}</div></div>
                  </div><a href="${escapeHTML(youtube)}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 bg-slate-800 border border-slate-600 text-white font-bold text-[10px] shrink-0">YOUTUBE SEARCH</a></div>
                  ${preview ? `<audio controls src="${escapeHTML(preview)}" class="w-full h-7"></audio>` : ''}</div>`;
              }).join('')}
            </div>`;
          return;
        }
        box.textContent = `No media results found for "${cleanQuery}".`;
      } catch (error) { box.textContent = error?.message || 'Media search failed.'; showToast('Media search failed. Check your connection.', 'error'); }
    }

        // Hook `fetchAndRenderLiveMediaResults` into `dispatchRealExternalApp` whenever YouTube or Spotify/Music is requested!
    const origDispatch = dispatchRealExternalApp;
    dispatchRealExternalApp = function(appName, webUrl, nativeUri, description, sharePayloadText = '') {
      origDispatch(appName, webUrl, nativeUri, description, sharePayloadText);
      const box = document.getElementById('live-media-results-box');
      const lower = appName.toLowerCase();
      if (lower.includes('youtube') || lower.includes('spotify')) {
        let q = '';
        if (webUrl.includes('search_query=')) q = decodeURIComponent(webUrl.split('search_query=')[1].split('&')[0]);
        else if (webUrl.includes('/search/')) q = decodeURIComponent(webUrl.split('/search/')[1].split('?')[0]);
        fetchAndRenderLiveMediaResults(q || 'Synthwave', appName);
      } else if (box) {
        box.classList.add('hidden');
      }
    };


    // <!-- OPENCLAW_ARCHER_INTEGRATION_START -->
    // ============================================================================
    // STEP 20: OPENCLAW JARVIS UI (jincocodev/openclaw-jarvis-ui) +
    //          ABDULBASIT ARCHER (abdulbasit-25/Jarvis-using-HTML-CSS-and-JS)
    // ============================================================================

    // 1. REAL-TIME AGENT STATE INDICATOR (IDLE / THINKING / RESPONDING)
    let openClawAgentState = 'IDLE';
    function setOpenClawAgentState(newState) {
      openClawAgentState = newState;
      const badge = document.getElementById('openclaw-agent-state');
      if (!badge) return;
      badge.classList.remove('orb-state-idle', 'orb-state-thinking', 'orb-state-responding');
      if (newState === 'THINKING') {
        badge.className = 'px-2 py-0.5 border rounded-sm font-bold orb-state-thinking animate-pulse';
        badge.textContent = '◐ STATE: THINKING...';
      } else if (newState === 'RESPONDING') {
        badge.className = 'px-2 py-0.5 border rounded-sm font-bold orb-state-responding';
        badge.textContent = '◉ STATE: RESPONDING (VOICE)';
      } else {
        badge.className = 'px-2 py-0.5 border rounded-sm font-bold orb-state-idle';
        badge.textContent = '● STATE: IDLE';
      }
    }

    // 2. 6-COLOR HSL HUE-ROTATION PALETTE & 3D ORB POWER SAVE MODE
    let openClawPowerSave = localStorage.getItem('jarvis_openclaw_powersave') === 'true';
    const savedHue = localStorage.getItem('jarvis_openclaw_hue') || '0';

    function applyOpenClawHue(hueDeg) {
      document.documentElement.style.setProperty('--openclaw-hue', `${hueDeg}deg`);
      if (String(hueDeg) === '0') {
        document.body.classList.remove('openclaw-hue-active');
      } else {
        document.body.classList.add('openclaw-hue-active');
      }
      localStorage.setItem('jarvis_openclaw_hue', String(hueDeg));
      document.querySelectorAll('.openclaw-hue-btn').forEach(btn => {
        if (btn.getAttribute('data-hue') === String(hueDeg)) {
          btn.classList.add('ring-2', 'ring-white', 'scale-110');
        } else {
          btn.classList.remove('ring-2', 'ring-white', 'scale-110');
        }
      });
    }
    applyOpenClawHue(savedHue);

    document.querySelectorAll('.openclaw-hue-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const hue = btn.getAttribute('data-hue') || '0';
        applyOpenClawHue(hue);
        if (typeof playHudSfx === 'function') playHudSfx('click');
      });
    });

    const powerSaveBtn = document.getElementById('power-save-toggle-btn');
    function updatePowerSaveUI() {
      if (openClawPowerSave) {
        document.body.classList.add('power-save-mode');
        if (powerSaveBtn) {
          powerSaveBtn.textContent = ' ORB: ECO';
          powerSaveBtn.className = 'px-1.5 py-0.5 bg-amber-500 text-black font-bold rounded-sm';
        }
      } else {
        document.body.classList.remove('power-save-mode');
        if (powerSaveBtn) {
          powerSaveBtn.textContent = ' ORB: STANDARD';
          powerSaveBtn.className = 'px-1.5 py-0.5 bg-slate-950 border border-cyan-500/40 text-slate-300 hover:text-amber-300 rounded-sm';
        }
      }
    }
    updatePowerSaveUI();
    if (powerSaveBtn) {
      powerSaveBtn.addEventListener('click', () => {
        openClawPowerSave = !openClawPowerSave;
        localStorage.setItem('jarvis_openclaw_powersave', String(openClawPowerSave));
        updatePowerSaveUI();
        speakText(openClawPowerSave ? '3D orb reduced-motion mode enabled.' : '3D orb standard motion mode enabled.');
      });
    }

    // 3. INTERACTIVE 3D THREE.JS ORB (jincocodev/openclaw-jarvis-ui)
    let threeOrbInitialized = false;
    let threeScene = null, threeCamera = null, threeRenderer = null;
    let threeOuterOrb = null, threeInnerCore = null, threeParticleRing = null;
    let baseOrbPositions = null;
    let orbRotationVelocity = { x: 0.004, y: 0.008 };
    let isDraggingOrb = false, prevOrbMouse = { x: 0, y: 0 };

    function initOpenClawThreeOrb() {
      if (threeOrbInitialized) return;
      const mount = document.getElementById('threeOrbMount');
      if (!mount || typeof THREE === 'undefined') return;
      threeOrbInitialized = true;

      const width = mount.clientWidth || 420;
      const height = mount.clientHeight || 280;
      threeScene = new THREE.Scene();
      threeCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
      threeCamera.position.z = 4.6;

      threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      threeRenderer.setSize(width, height);
      threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      mount.innerHTML = '';
      mount.appendChild(threeRenderer.domElement);

      // Outer Wireframe Icosahedron Orb (Audio-Reactive Vertex Displacement)
      const orbGeo = new THREE.IcosahedronGeometry(1.35, 3);
      const posAttr = orbGeo.attributes.position;
      baseOrbPositions = new Float32Array(posAttr.array.length);
      baseOrbPositions.set(posAttr.array);

      const orbMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        wireframe: true,
        transparent: true,
        opacity: 0.78
      });
      threeOuterOrb = new THREE.Mesh(orbGeo, orbMat);
      threeScene.add(threeOuterOrb);

      // Inner Glowing Energy Core
      const innerGeo = new THREE.IcosahedronGeometry(0.68, 1);
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xffab00,
        wireframe: true,
        transparent: true,
        opacity: 0.65
      });
      threeInnerCore = new THREE.Mesh(innerGeo, innerMat);
      threeScene.add(threeInnerCore);

      // Orbiting 3D Particle Cloud (240 particles)
      const pCount = 240;
      const pGeo = new THREE.BufferGeometry();
      const pPositions = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        const r = 1.65 + Math.random() * 0.85;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        pPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pPositions[i * 3 + 2] = r * Math.cos(phi);
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
      const pMat = new THREE.PointsMaterial({
        color: 0x10b981,
        size: 0.045,
        transparent: true,
        opacity: 0.85
      });
      threeParticleRing = new THREE.Points(pGeo, pMat);
      threeScene.add(threeParticleRing);

      // Mouse / Touch Drag to Rotate 3D Orb
      const container = document.getElementById('threeOrbContainer');
      const startDrag = (clientX, clientY) => {
        isDraggingOrb = true;
        prevOrbMouse = { x: clientX, y: clientY };
      };
      const moveDrag = (clientX, clientY) => {
        if (!isDraggingOrb || !threeOuterOrb) return;
        const dx = clientX - prevOrbMouse.x;
        const dy = clientY - prevOrbMouse.y;
        threeOuterOrb.rotation.y += dx * 0.01;
        threeOuterOrb.rotation.x += dy * 0.01;
        prevOrbMouse = { x: clientX, y: clientY };
      };
      const endDrag = () => { isDraggingOrb = false; };

      container.addEventListener('mousedown', e => startDrag(e.clientX, e.clientY));
      window.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
      window.addEventListener('mouseup', endDrag);
      container.addEventListener('touchstart', e => {
        if (e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
      container.addEventListener('touchmove', e => {
        if (e.touches[0]) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
      container.addEventListener('touchend', endDrag);

      let lastOrbFrame = 0;
      function animateThreeOrb(ts) {
        requestAnimationFrame(animateThreeOrb);
        const minDelta = openClawPowerSave ? 66 : 16;
        if (ts - lastOrbFrame < minDelta) return;
        lastOrbFrame = ts;

        if (!threeOuterOrb || container.classList.contains('hidden')) return;

        // State-reactive color & pulse intensity
        const isSpeakingNow = (typeof window.speechSynthesis !== 'undefined' && window.speechSynthesis.speaking) || openClawAgentState === 'RESPONDING';
        const isThinkingNow = openClawAgentState === 'THINKING';

        if (isThinkingNow) {
          threeOuterOrb.material.color.setHex(0xffab00);
          threeInnerCore.material.color.setHex(0xf43f5e);
        } else if (isSpeakingNow) {
          threeOuterOrb.material.color.setHex(0x10b981);
          threeInnerCore.material.color.setHex(0x00e5ff);
        } else {
          threeOuterOrb.material.color.setHex(0x00e5ff);
          threeInnerCore.material.color.setHex(0xffab00);
        }

        // Audio-reactive vertex displacement
        const pos = threeOuterOrb.geometry.attributes.position;
        const arr = pos.array;
        const t = ts * 0.004;
        const amp = isSpeakingNow ? 0.22 : (isThinkingNow ? 0.14 : 0.05);
        for (let i = 0; i < arr.length; i += 3) {
          const bx = baseOrbPositions[i];
          const by = baseOrbPositions[i + 1];
          const bz = baseOrbPositions[i + 2];
          const wave = 1 + Math.sin(t + bx * 2.5 + by * 2.5 + bz * 2.5) * amp;
          arr[i] = bx * wave;
          arr[i + 1] = by * wave;
          arr[i + 2] = bz * wave;
        }
        pos.needsUpdate = true;

        if (!isDraggingOrb) {
          threeOuterOrb.rotation.y += isThinkingNow ? 0.025 : 0.008;
          threeOuterOrb.rotation.x += 0.004;
        }
        threeInnerCore.rotation.y -= 0.015;
        threeInnerCore.rotation.z += 0.01;
        threeParticleRing.rotation.y += 0.003;
        threeRenderer.render(threeScene, threeCamera);
      }
      requestAnimationFrame(animateThreeOrb);
    }

    // 4. OPENCLAW 3-LAYER AUDIO VISUALIZER (SPECTRUM / RING / WAVEFORM)
    let activeVizLayer = 'all';
    const vizCanvas = document.getElementById('openclawAudioVizCanvas');
    const vizContainer = document.getElementById('threeLayerVizContainer');
    document.querySelectorAll('.viz-layer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeVizLayer = btn.getAttribute('data-vizlayer') || 'all';
        document.querySelectorAll('.viz-layer-btn').forEach(b => {
          b.className = 'viz-layer-btn px-1.5 py-0.5 bg-slate-900 border border-cyan-500/40 text-cyan-300 rounded-sm';
        });
        btn.className = 'viz-layer-btn px-1.5 py-0.5 bg-emerald-400 text-black font-bold rounded-sm';
      });
    });

    let lastAudioVizFrame = 0;
    function renderOpenClawAudioViz(ts) {
      if (document.hidden || !vizCanvas || !vizContainer || vizContainer.classList.contains('hidden')) return;
      if (ts - lastAudioVizFrame < 33) { requestAnimationFrame(renderOpenClawAudioViz); return; }
      lastAudioVizFrame = ts;
      requestAnimationFrame(renderOpenClawAudioViz);
      const ctx = vizCanvas.getContext('2d');
      const w = vizCanvas.width;
      const h = vizCanvas.height;
      ctx.clearRect(0, 0, w, h);

      const isActiveAudio = (typeof window.speechSynthesis !== 'undefined' && window.speechSynthesis.speaking) || openClawAgentState !== 'IDLE';
      const t = ts * 0.005;

      // Layer 1: Spectrum Frequency Bar Graph
      if (activeVizLayer === 'all' || activeVizLayer === 'spectrum') {
        const bars = 36;
        const barW = (w - 40) / bars;
        for (let i = 0; i < bars; i++) {
          const energy = isActiveAudio
            ? (0.3 + 0.7 * Math.abs(Math.sin(t * 2.2 + i * 0.35) * Math.cos(t * 1.3 - i * 0.2)))
            : (0.08 + 0.06 * Math.sin(t + i * 0.3));
          const barH = energy * (h * 0.42);
          ctx.fillStyle = i % 3 === 0 ? 'rgba(0, 229, 255, 0.75)' : (i % 3 === 1 ? 'rgba(16, 185, 129, 0.75)' : 'rgba(255, 171, 0, 0.75)');
          ctx.fillRect(20 + i * barW, h - 15 - barH, barW - 2, barH);
        }
      }

      // Layer 2: Concentric Audio-Reactive Rings
      if (activeVizLayer === 'all' || activeVizLayer === 'ring') {
        const cx = w / 2;
        const cy = h * 0.42;
        for (let r = 1; r <= 4; r++) {
          const pulse = isActiveAudio ? Math.sin(t * 3 + r) * 8 : Math.sin(t + r) * 2;
          const radius = r * 18 + pulse;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(6, radius), 0, Math.PI * 2);
          ctx.strokeStyle = r % 2 === 0 ? 'rgba(0, 229, 255, 0.65)' : 'rgba(255, 171, 0, 0.65)';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
      }

      // Layer 3: Oscilloscope Waveform
      if (activeVizLayer === 'all' || activeVizLayer === 'waveform') {
        ctx.beginPath();
        const midY = h * 0.42;
        for (let x = 15; x < w - 15; x += 3) {
          const amp = isActiveAudio ? 28 : 5;
          const y = midY + Math.sin(x * 0.04 + t * 3.5) * Math.cos(x * 0.015 - t * 2) * amp;
          if (x === 15) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Core Mode Switcher Buttons (Mark VII CAD Bust vs 3D Three.js Orb vs 3-Layer Audio Viz)
    function switchCenterCoreMode(mode) {
      const bustCanvas = document.getElementById('coreCanvas');
      const orbBox = document.getElementById('threeOrbContainer');
      const vizBox = document.getElementById('threeLayerVizContainer');
      if (!bustCanvas || !orbBox || !vizBox) return;

      bustCanvas.classList.add('hidden');
      orbBox.classList.add('hidden');
      vizBox.classList.add('hidden');

      if (mode === 'orb3d') {
        orbBox.classList.remove('hidden');
        initOpenClawThreeOrb();
      } else if (mode === 'audioviz') {
        vizBox.classList.remove('hidden');
        requestAnimationFrame(renderOpenClawAudioViz);
      } else {
        bustCanvas.classList.remove('hidden');
      }

      document.querySelectorAll('.core-mode-btn').forEach(btn => {
        if (btn.getAttribute('data-coremode') === mode) {
          btn.className = 'core-mode-btn px-2 py-0.5 bg-cyan-400 text-black font-bold rounded-sm transition';
        } else {
          btn.className = 'core-mode-btn px-2 py-0.5 bg-slate-900 border border-cyan-500/40 text-cyan-300 hover:border-amber-400 rounded-sm transition';
        }
      });
    }

    document.querySelectorAll('.core-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        switchCenterCoreMode(btn.getAttribute('data-coremode') || 'bust');
      });
    });

    const modalOrbBtn = document.getElementById('modal-switch-orb-btn');
    if (modalOrbBtn) {
      modalOrbBtn.addEventListener('click', () => {
        document.getElementById('close-hub-btn')?.click();
        switchCenterCoreMode('orb3d');
        speakText('OpenClaw interactive 3D Three.js Orb activated on main HUD.');
      });
    }
    const modalVizBtn = document.getElementById('modal-switch-viz-btn');
    if (modalVizBtn) {
      modalVizBtn.addEventListener('click', () => {
        document.getElementById('close-hub-btn')?.click();
        switchCenterCoreMode('audioviz');
        speakText('OpenClaw three-layer audio visualizer activated on main HUD.');
      });
    }

    // 5. ABDULBASIT ARCHER UP/DOWN COMMAND HISTORY NAVIGATION (`ArrowUp` / `ArrowDown`)
    let archerCmdHistory = [];
    try {
      archerCmdHistory = JSON.parse(localStorage.getItem('jarvis_cmd_history_v1') || '[]');
    } catch (e) { archerCmdHistory = []; }
    if (archerCmdHistory.length === 0) {
      archerCmdHistory = [
        'set timer for 30 seconds',
        'weather in Surat',
        'calculate 256 * 16',
        'Run full system diagnostic',
        'Search Artificial Intelligence'
      ];
    }
    let archerHistoryIdx = archerCmdHistory.length;

    const cmdInputEl = document.getElementById('command-input');
    if (cmdInputEl) {
      cmdInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (archerCmdHistory.length > 0 && archerHistoryIdx > 0) {
            archerHistoryIdx--;
            cmdInputEl.value = archerCmdHistory[archerHistoryIdx];
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (archerHistoryIdx < archerCmdHistory.length - 1) {
            archerHistoryIdx++;
            cmdInputEl.value = archerCmdHistory[archerHistoryIdx];
          } else {
            archerHistoryIdx = archerCmdHistory.length;
            cmdInputEl.value = '';
          }
        }
      });
    }

    function recordCommandInArcherHistory(cmd) {
      const clean = (cmd || '').trim();
      if (!clean) return;
      if (archerCmdHistory[archerCmdHistory.length - 1] !== clean) {
        archerCmdHistory.push(clean);
        if (archerCmdHistory.length > 100) archerCmdHistory.shift();
        try { localStorage.setItem('jarvis_cmd_history_v1', JSON.stringify(archerCmdHistory)); } catch (e) {}
      }
      archerHistoryIdx = archerCmdHistory.length;
    }

    // 6. ABDULBASIT ARCHER VOICE & HUD MULTI-TIMER COUNTDOWN ENGINE
    let archerActiveTimers = [];
    let archerTimerIdSeq = 1;

    function createArcherCountdownTimer(seconds, label = 'Tactical Timer') {
      const totalSec = Math.max(1, Math.min(86400, Math.round(Number(seconds) || 60)));
      const timerObj = {
        id: archerTimerIdSeq++,
        label: label || `Timer #${archerTimerIdSeq - 1}`,
        totalSec,
        remainingSec: totalSec,
        createdAt: Date.now()
      };
      archerActiveTimers.push(timerObj);
      renderArcherTimers();
      speakText(`Timer set for ${totalSec >= 60 ? Math.floor(totalSec / 60) + ' minutes ' + (totalSec % 60 ? (totalSec % 60) + ' seconds' : '') : totalSec + ' seconds'}  -  ${timerObj.label}.`);
      return timerObj;
    }

    function renderArcherTimers() {
      const hudStrip = document.getElementById('archer-active-timers-strip');
      const modalList = document.getElementById('archer-modal-timers-list');

      if (archerActiveTimers.length === 0) {
        if (hudStrip) {
          hudStrip.classList.add('hidden');
          hudStrip.innerHTML = '';
        }
        if (modalList) {
          modalList.innerHTML = `<div class="text-[10px] text-slate-500">No active countdown timers. Say "set timer for 30 seconds" or start one above!</div>`;
        }
        return;
      }

      const htmlItems = archerActiveTimers.map(t => {
        const mins = String(Math.floor(t.remainingSec / 60)).padStart(2, '0');
        const secs = String(t.remainingSec % 60).padStart(2, '0');
        const pct = Math.max(0, Math.min(100, Math.round((t.remainingSec / t.totalSec) * 100)));
        return `
          <div class="p-1.5 bg-slate-950/95 border border-amber-400/50 rounded flex items-center justify-between gap-2 text-[10px] font-mono-hud">
            <span class="text-amber-300 font-bold truncate"> ${escapeHTML(t.label)}</span>
            <div class="flex-1 max-w-[140px] bg-slate-900 h-1.5 border border-cyan-500/30 rounded overflow-hidden">
              <div class="bg-emerald-400 h-full transition-all" style="width:${pct}%"></div>
            </div>
            <span class="text-white font-bold">${mins}:${secs}</span>
            <button type="button" data-cancel-timer="${t.id}" class="px-1.5 py-0.2 bg-rose-900/80 hover:bg-rose-600 text-rose-200 rounded text-[9px]"></button>
          </div>
        `;
      }).join('');

      if (hudStrip) {
        hudStrip.classList.remove('hidden');
        hudStrip.innerHTML = htmlItems;
      }
      if (modalList) {
        modalList.innerHTML = htmlItems;
      }

      document.querySelectorAll('[data-cancel-timer]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-cancel-timer'));
          archerActiveTimers = archerActiveTimers.filter(x => x.id !== id);
          renderArcherTimers();
        });
      });
    }

    setInterval(() => {
      if (archerActiveTimers.length === 0) return;
      let finished = [];
      archerActiveTimers.forEach(t => {
        t.remainingSec -= 1;
        if (t.remainingSec <= 0) finished.push(t);
      });
      if (finished.length > 0) {
        archerActiveTimers = archerActiveTimers.filter(t => t.remainingSec > 0);
        finished.forEach(f => {
          if (typeof playHudSfx === 'function') playHudSfx('repulsor');
          appendMessage('J.A.R.V.I.S.', ` **TIMER COMPLETE (${f.label})**: Your ${f.totalSec}-second countdown has finished, Sir!`, 'OPENCLAW + ARCHER TIMER');
          speakText(`Attention Sir, your countdown timer for ${f.label} is complete.`);
        });
      }
      renderArcherTimers();
    }, 1000);

    const quickTimer30Btn = document.getElementById('quick-timer-30s-btn');
    if (quickTimer30Btn) {
      quickTimer30Btn.addEventListener('click', () => createArcherCountdownTimer(30, 'Quick 30s Sprint'));
    }
    const archerTimerForm = document.getElementById('archer-timer-form');
    if (archerTimerForm) {
      archerTimerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const sec = Number(document.getElementById('archer-timer-sec')?.value || 60);
        const lbl = document.getElementById('archer-timer-label')?.value?.trim() || 'Custom HUD Timer';
        createArcherCountdownTimer(sec, lbl);
      });
    }

    // 7. OPENCLAW MEMORY TIMELINE (TODAY / YESTERDAY COLLAPSIBLE DAYS) + SCHEDULE CRON + SKILLS BROWSER
    let openClawMemories = [];
    let showArchivedMemories = false;

    function renderOpenClawMemoryTimeline() {
      const box = document.getElementById('openclaw-memory-timeline');
      if (!box) return;
      const days = showArchivedMemories ? ['TODAY', 'YESTERDAY', 'ARCHIVE // 2026-11'] : ['TODAY', 'YESTERDAY'];
      box.innerHTML = days.map(day => {
        const items = openClawMemories.filter(m => m.day === day);
        return `
          <details open class="bg-black/80 border border-cyan-500/30 rounded p-2">
            <summary class="cursor-pointer font-display-hud text-[10px] text-cyan-300 font-bold flex items-center justify-between">
              <span> ${escapeHTML(day)} (${items.length})</span>
              <span class="text-amber-400">▾</span>
            </summary>
            <div class="mt-1.5 space-y-1.5 pl-2 border-l border-cyan-500/30">
              ${items.map(it => `
                <div class="text-[10px]">
                  <div class="text-emerald-300 font-bold">${escapeHTML(it.title)}</div>
                  <div class="text-slate-400">${escapeHTML(it.detail)}</div>
                </div>
              `).join('') || '<div class="text-[10px] text-slate-500">No entries recorded.</div>'}
            </div>
          </details>
        `;
      }).join('');
    }
    renderOpenClawMemoryTimeline();

    const addMemBtn = document.getElementById('openclaw-add-mem-btn');
    if (addMemBtn) {
      addMemBtn.addEventListener('click', () => {
        const lastInput = document.getElementById('command-input')?.value?.trim() || 'Tactical HUD Checkpoint';
        openClawMemories.unshift({
          day: 'TODAY',
          title: `## ${lastInput.slice(0, 42)}`,
          detail: `Logged at ${new Date().toLocaleTimeString()} via OpenClaw Memory Timeline.`
        });
        renderOpenClawMemoryTimeline();
        speakText('Topic logged to OpenClaw Memory Timeline.');
      });
    }
    const moreMemBtn = document.getElementById('openclaw-memory-more-btn');
    if (moreMemBtn) {
      moreMemBtn.addEventListener('click', () => {
        showArchivedMemories = !showArchivedMemories;
        moreMemBtn.textContent = showArchivedMemories ? 'HIDE ARCHIVED DAYS ▴' : 'SHOW MORE ARCHIVED DAYS ▾';
        renderOpenClawMemoryTimeline();
      });
    }

    // OpenClaw Cron Jobs with Enable/Disable Switches
    // This panel stores local workflow shortcuts only; it is not a background scheduler.
    let openClawCronJobs = [];

    function renderOpenClawCronList() {
      const box = document.getElementById('openclaw-cron-list');
      if (!box) return;
      box.innerHTML = openClawCronJobs.map(job => `
        <div class="p-2 bg-black/80 border ${job.enabled ? 'border-emerald-500/40' : 'border-slate-800'} rounded flex items-center justify-between gap-2">
          <div class="truncate">
            <div class="text-[11px] font-bold ${job.enabled ? 'text-white' : 'text-slate-500'} truncate">${escapeHTML(job.name)}</div>
            <div class="text-[9px] text-amber-400">MANUAL RUN ONLY - NO BACKGROUND SCHEDULE</div>
          </div>
          <div class="flex items-center space-x-1.5 shrink-0">
            <button type="button" data-runcron="${escapeHTML(Number(job.id) || 0)}" class="px-1.5 py-0.5 bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-400 hover:text-black text-[9px] rounded">RUN</button>
            <button type="button" data-togglecron="${escapeHTML(Number(job.id) || 0)}" class="px-2 py-0.5 ${job.enabled ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'} font-bold text-[9px] rounded">
              ${job.enabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      `).join('');

      box.querySelectorAll('[data-togglecron]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-togglecron'));
          const job = openClawCronJobs.find(j => j.id === id);
          if (job) {
            job.enabled = !job.enabled;
            renderOpenClawCronList();
            speakText(`Cron job ${escapeHTML(job.name)} is now ${job.enabled ? 'enabled' : 'disabled'}.`);
          }
        });
      });

      box.querySelectorAll('[data-runcron]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-runcron'));
          const job = openClawCronJobs.find(j => j.id === id);
          if (job) {
            processCommand(job.cmd);
          }
        });
      });
    }
    renderOpenClawCronList();

    const addCronForm = document.getElementById('openclaw-add-cron-form');
    if (addCronForm) {
      addCronForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('openclaw-cron-name');
        const name = input?.value?.trim();
        if (!name) return;
        openClawCronJobs.unshift({
          id: Date.now(),
          name,
          schedule: '*/15 * * * *',
          enabled: true,
          cmd: name
        });
        input.value = '';
        renderOpenClawCronList();
        speakText(`Saved local workflow shortcut: ${name}. It runs only when you tap RUN.`);
      });
    }

    // OpenClaw Skills Browser
    const openClawInstalledSkills = [
      { name: 'openclaw-jarvis-ui', scope: 'WORKSPACE', desc: 'Three.js 3D Orb, 3-Layer Audio Viz, 6-Color Hue & Cron HUD', action: () => switchCenterCoreMode('orb3d') },
      { name: 'archer-voice-assistant', scope: 'WORKSPACE', desc: 'Up/Down History, Multi-Timers, City Weather & Inline Calculator', action: () => createArcherCountdownTimer(30, 'Skill Test Timer') },
      { name: 'github-repo-coder', scope: 'USER SKILL', desc: 'Inspects and integrates external GitHub repositories into workspace', action: () => openHubModal('webdev') },
      { name: 'optical-vision-hud', scope: 'SYSTEM', desc: 'WebRTC Live Camera HUD & Hand Air-Tap Gesture Detector', action: () => openHubModal('vision') },
      { name: 'neural-memory-rag', scope: 'SYSTEM', desc: 'Persistent Vector Fact Vault & Live JS Sandbox Executor', action: () => openHubModal('neuralmem') },
      { name: 'real-io-clipboard-share', scope: 'SYSTEM', desc: 'Verified Clipboard Copy, File Share Sheet & Raw Inspector Drawer', action: () => realCopyTextToClipboard('J.A.R.V.I.S. OpenClaw Skill Verification OK', 'SKILL TEST') }
    ];

    function renderOpenClawSkills() {
      const box = document.getElementById('openclaw-skills-list');
      if (!box) return;
      box.innerHTML = openClawInstalledSkills.map((sk, idx) => `
        <div class="p-1.5 bg-black/80 border border-cyan-500/30 rounded flex items-center justify-between gap-2">
          <div class="truncate">
            <div class="text-[10px] font-bold text-cyan-300 truncate"> ${sk.name} <span class="text-[8px] px-1 bg-emerald-950 text-emerald-300 rounded">${sk.scope}</span></div>
            <div class="text-[9px] text-slate-400 truncate">${sk.desc}</div>
          </div>
          <button type="button" data-runskill="${idx}" class="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400 text-emerald-300 hover:bg-emerald-400 hover:text-black font-bold text-[9px] rounded shrink-0">LAUNCH</button>
        </div>
      `).join('');

      box.querySelectorAll('[data-runskill]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-runskill'));
          if (openClawInstalledSkills[idx]?.action) openClawInstalledSkills[idx].action();
        });
      });
    }
    renderOpenClawSkills();

    // Archer Browser System Information Readout
    function updateArcherSysInfo() {
      const el = document.getElementById('archer-sysinfo-line');
      if (!el) return;
      const cores = Number.isFinite(navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : null;
      const resolution = `${window.screen.width}x${window.screen.height}`;
      const language = navigator.language || 'NOT REPORTED';
      const online = navigator.onLine ? 'ONLINE' : 'OFFLINE';
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const network = connection
        ? `${connection.effectiveType ? connection.effectiveType.toUpperCase() : 'TYPE NOT REPORTED'} / ${Number.isFinite(connection.downlink) ? connection.downlink + ' Mbps ESTIMATED' : 'DOWNLINK NOT REPORTED'}`
        : 'NOT REPORTED';
      el.textContent = `Cores: ${cores || 'NOT REPORTED'} | Screen: ${resolution} | Net: ${online} / ${network} | Locale: ${language}`;
    }
    updateArcherSysInfo();

    // 8. PAPERCLIP FILE ATTACHMENT (``), DRAG & DROP, AND CTRL+V PASTE IN CHAT
    const attachBtn = document.getElementById('chat-attach-btn');
    const attachInput = document.getElementById('chat-attach-input');
    function handleChatFilesAttached(files) {
      if (!files || files.length === 0) return;
      Array.from(files).forEach(file => {
        if (file.size > 20 * 1024 * 1024) {
          showToast(`File "${file.name}" exceeds the 20 MB local inspection limit.`, 'error');
          return;
        }
        const sizeKB = (file.size / 1024).toFixed(1);
        appendMessage('USER', `Selected file for local inspection: ${file.name} (${sizeKB} KB, ${file.type || 'binary'}). It has not been uploaded.`);
        if (file.type.startsWith('text/') || /\.(json|md|txt|js|py|html|css|csv)$/i.test(file.name)) {
          const reader = new FileReader();
          reader.onload = () => {
            const snippet = String(reader.result || '').slice(0, 320);
            appendMessage('J.A.R.V.I.S.', `Local file preview (${file.name}):\n${snippet}`, { source: 'LOCAL FILE PREVIEW' });
          };
          reader.onerror = () => showToast('Could not read the selected file locally.', 'error');
          reader.readAsText(file);
        } else {
          appendMessage('J.A.R.V.I.S.', `Selected ${sizeKB} KB asset locally. No server upload was performed.`, { source: 'LOCAL FILE SELECTION' });
        }
      });
    }
    if (attachBtn && attachInput) {
      attachBtn.addEventListener('click', () => attachInput.click());
      attachInput.addEventListener('change', () => handleChatFilesAttached(attachInput.files));
    }
    window.addEventListener('paste', (e) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        handleChatFilesAttached(e.clipboardData.files);
      }
    });

    // Enforce OpenClaw Configurable Chat History Limit (20 / 50 / 100 / 200)
    const chatLimitSelect = document.getElementById('openclaw-chat-limit');
    function enforceOpenClawChatLimit() {
      const box = document.getElementById('messages-container');
      if (!box) return;
      const limit = Number(chatLimitSelect?.value || 50);
      while (box.children.length > limit) {
        box.removeChild(box.firstElementChild);
      }
    }
    if (chatLimitSelect) {
      chatLimitSelect.addEventListener('change', enforceOpenClawChatLimit);
    }

    // 9. HOOK `processCommand` AND `speakText` FOR OPENCLAW STATE + ARCHER VOICE COMMANDS
    const origSpeakTextOpenClaw = speakText;
    speakText = function(text) {
      setOpenClawAgentState('RESPONDING');
      origSpeakTextOpenClaw(text);
      setTimeout(() => {
        if (openClawAgentState === 'RESPONDING') setOpenClawAgentState('IDLE');
      }, 3600);
    };

    const origProcessCommandOpenClaw = processCommand;
    processCommand = async function(rawInput) {
      const clean = (rawInput || '').trim();
      if (!clean) return;
      recordCommandInArcherHistory(clean);
      setOpenClawAgentState('THINKING');

      // Log into OpenClaw Memory Timeline
      openClawMemories.unshift({
        day: 'TODAY',
        title: `## ${clean.slice(0, 44)}`,
        detail: `Executed at ${new Date().toLocaleTimeString()}`
      });
      if (openClawMemories.length > 25) openClawMemories.pop();
      renderOpenClawMemoryTimeline();

      const lower = clean.toLowerCase();

      // A. Archer Voice/Text Timer Commands: "set timer for 2 minutes", "timer 45 seconds"
      const timerMatch = lower.match(/(?:set\s+timer\s+for|timer\s+for|start\s+timer\s+for|timer)\s+(\d+)\s*(second|seconds|sec|secs|minute|minutes|min|mins|hour|hours|hr|hrs)?/i);
      if (timerMatch) {
        const val = parseInt(timerMatch[1], 10);
        const unit = (timerMatch[2] || 'seconds').toLowerCase();
        let totalSec = val;
        if (unit.startsWith('min')) totalSec = val * 60;
        else if (unit.startsWith('h')) totalSec = val * 3600;
        appendMessage('USER', clean);
        const tObj = createArcherCountdownTimer(totalSec, `${val} ${unit}`);
        appendMessage('J.A.R.V.I.S.', ` **ARCHER COUNTDOWN STARTED**: Set for **${tObj.totalSec} seconds** (${tObj.label}). Live progress bar is active in the Center HUD.`, 'ARCHER TIMER ENGINE');
        enforceOpenClawChatLimit();
        return;
      }

      // B. OpenClaw 3D Orb / Visualizer / Power Save Voice Commands
      if (lower.includes('openclaw') || lower.includes('3d orb') || lower.includes('three.js orb')) {
        appendMessage('USER', clean);
        switchCenterCoreMode('orb3d');
        openHubModal('openclaw');
        const msg = 'OpenClaw 3D Three.js Orb and HUD Control Panel are now active, Sir.';
        appendMessage('J.A.R.V.I.S.', msg, 'OPENCLAW HUD v1.0.3');
        speakText(msg);
        enforceOpenClawChatLimit();
        return;
      }

      // C. Archer Natural-Language "weather in <city>" Command
      const cityWeatherMatch = clean.match(/weather\s+in\s+([a-zA-Z\s,]{2,35})/i);
      if (cityWeatherMatch && typeof searchAndSyncGlobalCity === 'function') {
        const targetCity = cityWeatherMatch[1].trim();
        appendMessage('USER', clean);
        await searchAndSyncGlobalCity(targetCity);
        enforceOpenClawChatLimit();
        return;
      }

      await origProcessCommandOpenClaw(rawInput);
      enforceOpenClawChatLimit();
    };
    // <!-- OPENCLAW_ARCHER_INTEGRATION_END -->


    // <!-- CAPACITOR_PWA_BRIDGE_START -->
    // ============================================================================
    // STEP 21: CAPACITOR v6 ANDROID BRIDGE + PWA STANDALONE INSTALLER
    // ============================================================================
    const CAPACITOR_PROJECT_FILES = {
      'capacitor.config.json': "{\n  \"appId\": \"com.stark.jarvis.os\",\n  \"appName\": \"J.A.R.V.I.S.\",\n  \"webDir\": \"www\",\n  \"bundledWebRuntime\": false,\n  \"backgroundColor\": \"#030710\",\n  \"android\": {\n    \"allowMixedContent\": false,\n    \"captureInput\": true,\n    \"webContentsDebuggingEnabled\": false\n  },\n  \"plugins\": {\n    \"StatusBar\": {\n      \"style\": \"DARK\",\n      \"backgroundColor\": \"#030710\",\n      \"overlaysWebView\": false\n    },\n    \"SplashScreen\": {\n      \"launchShowDuration\": 1200,\n      \"backgroundColor\": \"#030710\",\n      \"showSpinner\": true,\n      \"spinnerColor\": \"#00e5ff\"\n    }\n  }\n}",
      'package.json': "{\n  \"name\": \"jarvis-mark7-tactical-os\",\n  \"version\": \"2.0.0\",\n  \"description\": \"J.A.R.V.I.S. Mark VII Tactical AI Assistant & HUD OS (Capacitor Android Edition)\",\n  \"main\": \"www/index.html\",\n  \"scripts\": {\n    \"cap:init\": \"npx cap init \\\"J.A.R.V.I.S. OS\\\" com.stark.jarvis.os --web-dir www\",\n    \"cap:add:android\": \"npx cap add android\",\n    \"cap:sync\": \"npx cap sync android\",\n    \"cap:open\": \"npx cap open android\",\n    \"build:apk\": \"npx cap sync android && cd android && ./gradlew assembleDebug\"\n  },\n  \"dependencies\": {\n    \"@capacitor/android\": \"^6.1.0\",\n    \"@capacitor/app\": \"^6.0.0\",\n    \"@capacitor/core\": \"^6.1.0\",\n    \"@capacitor/geolocation\": \"^6.0.0\",\n    \"@capacitor/haptics\": \"^6.0.0\",\n    \"@capacitor/local-notifications\": \"^6.0.0\",\n    \"@capacitor/share\": \"^6.0.0\",\n    \"@capacitor/splash-screen\": \"^6.0.0\",\n    \"@capacitor/status-bar\": \"^6.0.0\"\n  },\n  \"devDependencies\": {\n    \"@capacitor/cli\": \"^6.1.0\"\n  }\n}",
      'AndroidManifest.xml': "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\"\n    package=\"com.stark.jarvis.os\">\n\n    <!-- J.A.R.V.I.S. Hardware & Tactical OS Permissions -->\n    <uses-permission android:name=\"android.permission.INTERNET\" />\n    <uses-permission android:name=\"android.permission.ACCESS_NETWORK_STATE\" />\n    <uses-permission android:name=\"android.permission.RECORD_AUDIO\" />\n    <uses-permission android:name=\"android.permission.MODIFY_AUDIO_SETTINGS\" />\n    <uses-permission android:name=\"android.permission.CAMERA\" />\n    <uses-permission android:name=\"android.permission.ACCESS_COARSE_LOCATION\" />\n    <uses-permission android:name=\"android.permission.ACCESS_FINE_LOCATION\" />\n    <uses-permission android:name=\"android.permission.VIBRATE\" />\n\n    <!-- Android 11+ (API 30+) Package Visibility Queries so J.A.R.V.I.S. can launch WhatsApp, YouTube, Chrome & Phone directly -->\n    <queries>\n        <package android:name=\"com.whatsapp\" />\n        <package android:name=\"com.whatsapp.w4b\" />\n        <package android:name=\"com.google.android.youtube\" />\n        <package android:name=\"com.android.chrome\" />\n        <package android:name=\"com.spotify.music\" />\n        <intent>\n            <action android:name=\"android.intent.action.VIEW\" />\n            <data android:scheme=\"https\" />\n        </intent>\n        <intent>\n            <action android:name=\"android.intent.action.DIAL\" />\n            <data android:scheme=\"tel\" />\n        </intent>\n        <intent>\n            <action android:name=\"android.intent.action.TTS_SERVICE\" />\n        </intent>\n    </queries>\n\n    <application\n        android:allowBackup=\"true\"\n        android:icon=\"@mipmap/ic_launcher\"\n        android:label=\"J.A.R.V.I.S.\"\n        android:roundIcon=\"@mipmap/ic_launcher_round\"\n        android:supportsRtl=\"true\"\n        android:usesCleartextTraffic=\"false\"\n        android:theme=\"@style/AppTheme\">\n\n        <activity\n            android:configChanges=\"orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode\"\n            android:name=\"com.stark.jarvis.os.MainActivity\"\n            android:label=\"J.A.R.V.I.S.\"\n            android:theme=\"@style/AppTheme.NoActionBarLaunch\"\n            android:launchMode=\"singleTask\"\n            android:exported=\"true\">\n            <intent-filter>\n                <action android:name=\"android.intent.action.MAIN\" />\n                <category android:name=\"android.intent.category.LAUNCHER\" />\n            </intent-filter>\n        </activity>\n    </application>\n</manifest>\n",
      'build-android-apk.yml': "name: Build J.A.R.V.I.S. Android APK (Capacitor)\n\non:\n  push:\n    branches: [ \"main\", \"master\" ]\n  workflow_dispatch:\n\njobs:\n  build-apk:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Checkout J.A.R.V.I.S. Repository\n        uses: actions/checkout@v4\n\n      - name: Set up Node.js 20\n        uses: actions/setup-node@v4\n        with:\n          node-version: 20\n\n      - name: Set up JDK 17 for Android Gradle\n        uses: actions/setup-java@v4\n        with:\n          distribution: 'temurin'\n          java-version: '17'\n\n      - name: Install Capacitor Dependencies\n        run: npm install\n\n      - name: Add & Sync Capacitor Android Platform\n        run: |\n          if [ ! -d \"android\" ] || [ ! -f \"android/gradlew\" ]; then\n            rm -rf android\n            npx cap add android\n          fi\n          npx cap sync android\n\n      - name: Build Debug Android APK\n        working-directory: ./android\n        run: |\n          chmod +x gradlew\n          ./gradlew assembleDebug\n\n      - name: Upload Ready-to-Install J.A.R.V.I.S.-debug.apk\n        uses: actions/upload-artifact@v4\n        with:\n          name: JARVIS-Mark-VII-Android-APK\n          path: android/app/build/outputs/apk/debug/app-debug.apk\n"
    };

    let currentCapFileKey = 'capacitor.config.json';
    const capViewerEl = document.getElementById('cap-file-viewer');
    const capFilenameEl = document.getElementById('cap-active-filename');

    function selectCapFile(fileKey) {
      currentCapFileKey = fileKey;
      if (capViewerEl) capViewerEl.value = CAPACITOR_PROJECT_FILES[fileKey] || '';
      if (capFilenameEl) capFilenameEl.textContent = ' ' + fileKey;
      document.querySelectorAll('.cap-file-btn').forEach(btn => {
        if (btn.getAttribute('data-capfile') === fileKey) {
          btn.className = 'cap-file-btn py-1.5 px-2 bg-cyan-400 text-black font-bold text-[10px] rounded';
        } else {
          btn.className = 'cap-file-btn py-1.5 px-2 bg-slate-900 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-400 hover:text-black font-bold text-[10px] rounded';
        }
      });
    }
    selectCapFile('capacitor.config.json');

    document.querySelectorAll('.cap-file-btn').forEach(btn => {
      btn.addEventListener('click', () => selectCapFile(btn.getAttribute('data-capfile') || 'capacitor.config.json'));
    });

    document.getElementById('cap-copy-file-btn')?.addEventListener('click', () => {
      const content = CAPACITOR_PROJECT_FILES[currentCapFileKey] || '';
      realCopyTextToClipboard(content, currentCapFileKey);
    });

    document.getElementById('cap-dl-file-btn')?.addEventListener('click', () => {
      const content = CAPACITOR_PROJECT_FILES[currentCapFileKey] || '';
      realDownloadOrShareFile(currentCapFileKey, content, 'text/plain;charset=utf-8');
    });

    // Capacitor Runtime & Native Plugin Bridge (Auto-activates when packaged inside Capacitor Android APK)
    function initCapacitorNativeBridge() {
      const cap = window.Capacitor;
      const badge = document.getElementById('cap-runtime-badge');
      if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
        if (badge) badge.textContent = ' RUNNING INSIDE NATIVE CAPACITOR ANDROID APK (' + (cap.getPlatform ? cap.getPlatform().toUpperCase() : 'ANDROID') + ')';
        try {
          if (cap.Plugins?.StatusBar) {
            cap.Plugins.StatusBar.setStyle({ style: 'DARK' });
            cap.Plugins.StatusBar.setBackgroundColor({ color: '#030710' });
          }
          if (cap.Plugins?.SplashScreen) {
            cap.Plugins.SplashScreen.hide();
          }
        } catch (e) {}
      }
    }
    initCapacitorNativeBridge();

    // Progressive Web App (PWA) `beforeinstallprompt` Capture & Fullscreen Standalone Launcher
    let deferredPwaPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPwaPrompt = e;
      const badge = document.getElementById('cap-runtime-badge');
      if (badge) badge.textContent = ' ANDROID CHROME WEBAPK INSTALL PROMPT READY  -  TAP "TRIGGER NATIVE INSTALL"!';
    });

    document.getElementById('trigger-pwa-install-btn')?.addEventListener('click', async () => {
      if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        const choice = await deferredPwaPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          speakText('J.A.R.V.I.S. Android application installation accepted, Sir.');
        }
        deferredPwaPrompt = null;
      } else {
        // In sandboxed preview iframe, explain & trigger fullscreen + standalone HTML export
        speakText('Because the live preview runs inside a sandboxed frame, tap Download Standalone HTML or open the Capacitor APK package to install J.A.R.V.I.S. onto your phone home screen.');
        const fullSource = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
        realDownloadOrShareFile('jarvis_assistant.html', fullSource, 'text/html;charset=utf-8');
      }
    });

    document.getElementById('mobile-dl-standalone-btn')?.addEventListener('click', () => {
      const fullSource = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
      realDownloadOrShareFile('jarvis_assistant.html', fullSource, 'text/html;charset=utf-8');
    });

    document.getElementById('pwa-fullscreen-btn')?.addEventListener('click', () => {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
        speakText('Fullscreen immersive mobile OS mode engaged.');
      } else if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Suspend expensive canvas work in background tabs and resume only active views.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      animateMasterLoop();
      renderHolo3DCad();
      renderVisionHud();
      renderInteractiveBackground();
      if (micFftActive) sampleMicSpectrumLoop();
      const audioVizPanel = document.getElementById('threeLayerVizContainer');
      if (audioVizPanel && !audioVizPanel.classList.contains('hidden')) {
        requestAnimationFrame(renderOpenClawAudioViz);
      }
    });

    // <!-- CAPACITOR_PWA_BRIDGE_END -->
  