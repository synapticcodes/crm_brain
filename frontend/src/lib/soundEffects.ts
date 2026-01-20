type SoundType = 'success' | 'error' | 'incoming' | 'warning'

let audioContext: AudioContext | null = null
const SOUND_FLAG_KEY = 'brain_sound_enabled'

function getContext() {
  if (typeof window === 'undefined') return null
  if (!audioContext) {
    const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    audioContext = Context ? new Context() : null
  }
  return audioContext
}

function playTone(context: AudioContext, frequency: number, duration: number, gainValue: number, startAt = 0) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.value = 0
  oscillator.connect(gain)
  gain.connect(context.destination)
  const now = context.currentTime + startAt
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(gainValue, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.02)
}

export function playSound(type: SoundType) {
  const context = getContext()
  if (!isSoundEnabled()) return
  if (!context) return
  if (context.state === 'suspended') {
    context.resume().catch(() => null)
  }

  if (type === 'success') {
    playTone(context, 520, 0.14, 0.06)
    playTone(context, 720, 0.16, 0.05, 0.16)
    return
  }

  if (type === 'incoming') {
    playTone(context, 640, 0.18, 0.06)
    return
  }

  if (type === 'warning') {
    playTone(context, 420, 0.22, 0.05)
    return
  }

  playTone(context, 260, 0.24, 0.07)
  playTone(context, 200, 0.24, 0.06, 0.2)
}

export function isSoundEnabled() {
  if (typeof window === 'undefined') return true
  const stored = window.localStorage.getItem(SOUND_FLAG_KEY)
  if (stored === null) return true
  return stored === 'true'
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SOUND_FLAG_KEY, enabled ? 'true' : 'false')
}
