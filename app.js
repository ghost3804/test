(() => {
  'use strict';

  const NOTE_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const NOTE_NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  const WHITE_PCS = [0,2,4,5,7,9,11];

  const ROOT_CHIPS = [
    { label:'C',  pc:0  }, { label:'C#', pc:1  }, { label:'Db', pc:1  },
    { label:'D',  pc:2  }, { label:'D#', pc:3  }, { label:'Eb', pc:3  },
    { label:'E',  pc:4  }, { label:'F',  pc:5  }, { label:'F#', pc:6  },
    { label:'Gb', pc:6  }, { label:'G',  pc:7  }, { label:'G#', pc:8  },
    { label:'Ab', pc:8  }, { label:'A',  pc:9  }, { label:'A#', pc:10 },
    { label:'Bb', pc:10 }, { label:'B',  pc:11 },
  ];

  const CHORD_TYPES = [
    { id:'major', label:'메이저',            symbol:'',      intervals:[0,4,7] },
    { id:'minor', label:'마이너',            symbol:'m',     intervals:[0,3,7] },
    { id:'dim',   label:'디미니시',          symbol:'dim',   intervals:[0,3,6] },
    { id:'aug',   label:'어그먼트',          symbol:'aug',   intervals:[0,4,8] },
    { id:'sus2',  label:'서스2',             symbol:'sus2',  intervals:[0,2,7] },
    { id:'sus4',  label:'서스4',             symbol:'sus4',  intervals:[0,5,7] },
    { id:'six',   label:'식스',              symbol:'6',     intervals:[0,4,7,9] },
    { id:'m6',    label:'마이너 식스',        symbol:'m6',    intervals:[0,3,7,9] },
    { id:'dom7',  label:'세븐스',            symbol:'7',     intervals:[0,4,7,10] },
    { id:'maj7',  label:'메이저 세븐스',      symbol:'maj7',  intervals:[0,4,7,11] },
    { id:'m7',    label:'마이너 세븐스',      symbol:'m7',    intervals:[0,3,7,10] },
    { id:'m7b5',  label:'마이너 세븐스 b5',   symbol:'m7b5',  intervals:[0,3,6,10] },
    { id:'dim7',  label:'디미니시 세븐스',    symbol:'dim7',  intervals:[0,3,6,9] },
    { id:'aug7',  label:'어그먼트 세븐스',    symbol:'aug7',  intervals:[0,4,8,10] },
    { id:'dom9',  label:'나인스',            symbol:'9',     intervals:[0,4,7,10,14] },
    { id:'maj9',  label:'메이저 나인스',      symbol:'maj9',  intervals:[0,4,7,11,14] },
    { id:'m9',    label:'마이너 나인스',      symbol:'m9',    intervals:[0,3,7,10,14] },
    { id:'add9',  label:'애드9',             symbol:'add9',  intervals:[0,4,7,14] },
  ];

  const INVERSION_LABELS = ['근음 위치','제1전위','제2전위','제3전위','제4전위'];

  const LOW_MIDI = 43;
  const HIGH_MIDI = 88;
  const WHITE_W = 38;
  const BLACK_W = 24;

  const STORAGE_KEY = 'chordFinderState.v1';

  const state = loadState();

  const els = {
    roots: document.getElementById('roots'),
    chordType: document.getElementById('chordType'),
    playBtn: document.getElementById('playBtn'),
    chordLabel: document.getElementById('chordLabel'),
    pianoScroll: document.getElementById('pianoScroll'),
    piano: document.getElementById('piano'),
    inversions: document.getElementById('inversions'),
    installBtn: document.getElementById('installBtn'),
  };

  function loadState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.rootPc === 'number' && typeof parsed.typeId === 'string') {
          return { rootPc: parsed.rootPc, rootLabel: parsed.rootLabel || 'A', typeId: parsed.typeId, inversion: parsed.inversion || 0 };
        }
      }
    } catch (e) { /* ignore corrupt storage */ }
    return { rootPc: 9, rootLabel: 'A', typeId: 'major', inversion: 0 };
  }

  function saveState(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
  }

  function currentType(){
    return CHORD_TYPES.find(t => t.id === state.typeId) || CHORD_TYPES[0];
  }

  function noteLabel(pc){
    return WHITE_PCS.includes(pc) ? NOTE_NAMES_SHARP[pc] : `${NOTE_NAMES_SHARP[pc]}/${NOTE_NAMES_FLAT[pc]}`;
  }

  function chordNotes(){
    const type = currentType();
    const n = type.intervals.length;
    const inv = Math.min(state.inversion, n - 1);
    const rotated = type.intervals.slice(inv).concat(type.intervals.slice(0, inv).map(x => x + 12));
    const rootMidi = 48 + state.rootPc;
    return rotated.map(offset => ({
      midi: rootMidi + offset,
      pc: ((rootMidi + offset) % 12 + 12) % 12,
      isRoot: offset % 12 === 0,
    }));
  }

  function chordName(){
    const type = currentType();
    return `${state.rootLabel}${type.symbol}`;
  }

  // ---------- rendering ----------

  function renderRoots(){
    els.roots.innerHTML = '';
    ROOT_CHIPS.forEach((chip, i) => {
      const btn = document.createElement('button');
      btn.className = 'rootChip';
      btn.type = 'button';
      btn.textContent = chip.label;
      btn.style.background = `hsl(${Math.round(i * 360 / ROOT_CHIPS.length)}, 62%, 58%)`;
      const selected = chip.pc === state.rootPc && chip.label === state.rootLabel;
      if (selected) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        state.rootPc = chip.pc;
        state.rootLabel = chip.label;
        saveState();
        renderRoots();
        renderPlayLabel();
        renderPiano();
      });
      els.roots.appendChild(btn);
    });
    const selectedChip = els.roots.querySelector('.rootChip.selected');
    if (selectedChip) selectedChip.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
  }

  function renderChordTypeSelect(){
    els.chordType.innerHTML = '';
    CHORD_TYPES.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.label;
      if (t.id === state.typeId) opt.selected = true;
      els.chordType.appendChild(opt);
    });
    els.chordType.addEventListener('change', () => {
      state.typeId = els.chordType.value;
      const n = currentType().intervals.length;
      if (state.inversion > n - 1) state.inversion = 0;
      saveState();
      renderPlayLabel();
      renderInversions();
      renderPiano();
    });
  }

  function renderPlayLabel(){
    els.chordLabel.textContent = `${chordName()} 코드`;
  }

  function renderInversions(){
    const n = currentType().intervals.length;
    els.inversions.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const btn = document.createElement('button');
      btn.className = 'invTab';
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.textContent = INVERSION_LABELS[i] || `제${i}전위`;
      if (i === state.inversion) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        state.inversion = i;
        saveState();
        renderInversions();
        renderPiano();
      });
      els.inversions.appendChild(btn);
    }
  }

  function buildKeyLayout(){
    const keys = [];
    let whiteCol = 0;
    for (let midi = LOW_MIDI; midi <= HIGH_MIDI; midi++) {
      const pc = ((midi % 12) + 12) % 12;
      if (WHITE_PCS.includes(pc)) {
        keys.push({ midi, pc, white: true, col: whiteCol });
        whiteCol++;
      } else {
        keys.push({ midi, pc, white: false, precedingCol: whiteCol - 1 });
      }
    }
    return { keys, totalWhite: whiteCol };
  }

  const layout = buildKeyLayout();

  function renderPiano(){
    const piano = els.piano;
    piano.innerHTML = '';
    piano.style.width = `${layout.totalWhite * WHITE_W}px`;

    const notes = chordNotes();
    const byMidi = new Map(notes.map(n => [n.midi, n]));

    // white keys first (so black keys stack above them)
    layout.keys.filter(k => k.white).forEach(k => {
      const el = document.createElement('div');
      el.className = 'whiteKey';
      el.style.left = `${k.col * WHITE_W}px`;
      el.style.width = `${WHITE_W}px`;
      if (byMidi.has(k.midi)) el.classList.add('active');
      piano.appendChild(el);
    });
    layout.keys.filter(k => !k.white).forEach(k => {
      const el = document.createElement('div');
      el.className = 'blackKey';
      el.style.left = `${(k.precedingCol + 1) * WHITE_W - BLACK_W / 2}px`;
      el.style.width = `${BLACK_W}px`;
      if (byMidi.has(k.midi)) el.classList.add('active');
      piano.appendChild(el);
    });

    // badges
    let minCol = Infinity;
    notes.forEach(n => {
      const key = layout.keys.find(k => k.midi === n.midi);
      if (!key) return;
      const badge = document.createElement('div');
      badge.className = 'noteBadge' + (n.isRoot ? ' rootNote' : '');
      badge.textContent = noteLabel(n.pc);
      let left, top;
      if (key.white) {
        left = key.col * WHITE_W + WHITE_W / 2;
        top = 108;
        minCol = Math.min(minCol, key.col);
      } else {
        left = (key.precedingCol + 1) * WHITE_W;
        top = 58;
        minCol = Math.min(minCol, key.precedingCol + 1);
      }
      badge.style.left = `${left}px`;
      badge.style.top = `${top}px`;
      piano.appendChild(badge);
    });

    if (minCol !== Infinity) {
      const target = Math.max(0, minCol * WHITE_W - WHITE_W * 1.5);
      els.pianoScroll.scrollTo({ left: target, behavior: 'smooth' });
    }
  }

  // ---------- audio ----------

  let audioCtx = null;
  function ensureAudio(){
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function midiToFreq(midi){
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function playChord(){
    const ctx = ensureAudio();
    const now = ctx.currentTime;
    const notes = chordNotes();
    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = midiToFreq(n.midi);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.5);
    });
    document.querySelectorAll('.noteBadge').forEach(b => {
      b.classList.remove('pulse');
      void b.offsetWidth;
      b.classList.add('pulse');
    });
  }

  els.playBtn.addEventListener('click', playChord);

  // ---------- PWA install prompt ----------

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    els.installBtn.hidden = false;
  });
  els.installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    els.installBtn.hidden = true;
  });
  window.addEventListener('appinstalled', () => {
    els.installBtn.hidden = true;
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is best-effort */ });
    });
  }

  // ---------- init ----------

  renderRoots();
  renderChordTypeSelect();
  renderPlayLabel();
  renderInversions();
  renderPiano();
})();
