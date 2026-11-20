const RINGTONE_URL = new URL("../../assets/lineapp_ring_16k.mp3", import.meta.url).href;
const DECLINE_URL = new URL("../../assets/lineapp_end_16k.wav", import.meta.url).href;

function getAudioConstructor() {
  return globalThis.window?.Audio || globalThis.Audio || null;
}

function createAudio(url, loop) {
  const AudioConstructor = getAudioConstructor();
  if (!AudioConstructor) return null;
  try {
    const audio = new AudioConstructor(url);
    audio.src = url;
    audio.preload = "auto";
    audio.loop = loop;
    return audio;
  } catch {
    return null;
  }
}

function safelyPlay(audio) {
  if (!audio) return;
  try {
    const result = audio.play();
    if (result && typeof result.catch === "function") result.catch(() => {});
  } catch {}
}

function safelyStop(audio) {
  if (!audio) return;
  try { audio.pause(); } catch {}
  try { audio.currentTime = 0; } catch {}
}

export function createCallRingtone() {
  let ringtone = null;
  let declineSound = null;
  let active = false;

  function ensureAudio() {
    if (ringtone && declineSound) return true;
    ringtone = createAudio(RINGTONE_URL, true);
    declineSound = createAudio(DECLINE_URL, false);
    return Boolean(ringtone && declineSound);
  }

  function prepare() {
    if (!ensureAudio()) return;
    for (const audio of [ringtone, declineSound]) {
      try { audio.load?.(); } catch {}
    }
  }

  function start() {
    if (active || !ensureAudio()) return;
    active = true;
    try { ringtone.currentTime = 0; } catch {}
    safelyPlay(ringtone);
  }

  function stop() {
    active = false;
    safelyStop(ringtone);
  }

  function playDecline() {
    if (!ensureAudio()) return;
    safelyStop(declineSound);
    safelyPlay(declineSound);
  }

  function stopDecline() {
    safelyStop(declineSound);
  }

  return { prepare, start, stop, playDecline, stopDecline };
}
