/* Socle commun à toutes les machines : son, records, préférences.
   Script classique et non module, pour que le dossier reste ouvrable
   par double-clic (les modules ES sont bloqués sur file://). */

window.Arcade = (() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ms = (n) => (reduced ? 1 : n);
  const wait = (n) => new Promise((r) => setTimeout(r, ms(n)));

  const MUTE_KEY = 'arcade.muet';
  const RECORD_PREFIX = 'arcade.record.';
  const LEGACY = { chute: 'chute.record' };   // avant la mise en collection

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* indisponible */ } },
  };

  /* ---------- son ---------- */
  /* Tout est synthétisé à la volée : aucun fichier audio dans le dépôt. */

  const audio = { ctx: null, on: true };

  function boot() {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audio.ctx = new AC();
  }

  function tone({ freq, to, dur, type = 'triangle', vol = 0.16, delay = 0 }) {
    if (!audio.on || !audio.ctx) return;
    const ctx = audio.ctx;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  /* Échelle majeure étendue : la signature sonore de la collection.
     Chaque maillon d'un enchaînement monte d'un degré, si bien qu'une
     longue série s'entend avant de se lire. */
  const LADDER = [0, 4, 7, 12, 16, 19, 24, 28, 31, 36];
  const step = (n) => 330 * Math.pow(2, LADDER[Math.min(Math.max(n, 1), LADDER.length) - 1] / 12);

  const sfx = {
    tick: () => tone({ freq: 880, dur: 0.025, type: 'sine', vol: 0.03 }),
    thud: () => tone({ freq: 190, to: 90, dur: 0.09, type: 'square', vol: 0.07 }),
    chain(n) {
      const f = step(n);
      tone({ freq: f, to: f * 1.5, dur: 0.16, type: 'triangle', vol: 0.15 });
      tone({ freq: f / 2, dur: 0.2, type: 'sine', vol: 0.09 });
    },
    deny: () => tone({ freq: 150, to: 110, dur: 0.1, type: 'square', vol: 0.06 }),
    over: () => [440, 349, 262, 196].forEach((f, i) =>
      tone({ freq: f, dur: 0.3, type: 'triangle', vol: 0.13, delay: i * 0.13 })),
  };

  const muted = () => store.get(MUTE_KEY) === '1';

  function setMuted(value, button) {
    audio.on = !value;
    store.set(MUTE_KEY, value ? '1' : '0');
    if (button) {
      button.textContent = value ? 'Son : coupé' : 'Son : actif';
      button.setAttribute('aria-pressed', String(value));
    }
  }

  /* Le réglage est commun à toute la collection : coupé ici, coupé partout. */
  function bindMute(button) {
    setMuted(muted(), button);
    button.addEventListener('click', () => { boot(); setMuted(audio.on, button); });
    return button;
  }

  /* ---------- records ---------- */

  function record(game) {
    const value = store.get(RECORD_PREFIX + game);
    if (value !== null) return parseInt(value, 10) || 0;
    const legacy = LEGACY[game] ? store.get(LEGACY[game]) : null;
    return legacy === null ? 0 : (parseInt(legacy, 10) || 0);
  }

  function setRecord(game, value) {
    store.set(RECORD_PREFIX + game, String(value));
  }

  /* État libre d'un jeu (partie en cours, statistiques, réglages), en JSON.
     Un navigateur qui refuse le stockage fait perdre la sauvegarde, pas la partie. */

  function read(key, fallback = null) {
    const raw = store.get('arcade.' + key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  function write(key, value) {
    store.set('arcade.' + key, JSON.stringify(value));
  }

  /* ---------- petits utilitaires d'animation ---------- */

  /* Relance une animation CSS déjà posée sur l'élément. */
  function replay(node, ...classes) {
    node.classList.remove(...classes);
    void node.offsetWidth;
    node.classList.add(classes[classes.length - 1]);
  }

  function shake(node, strength) {
    if (reduced) return;
    node.style.setProperty('--amp', Math.min(strength, 5) * 1.5 + 'px');
    node.classList.remove('shake');
    void node.offsetWidth;
    node.classList.add('shake');
  }

  return { reduced, ms, wait, boot, tone, sfx, step, muted, setMuted, bindMute, record, setRecord, read, write, replay, shake, audio };
})();
