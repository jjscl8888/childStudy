import { ref, onUnmounted } from 'vue'
import { useVoiceSettingsStore, BAIDU_ROLE_MAP, type VoiceRole } from '@/stores/voiceSettingsStore'

function rateToBaiduSpd(rate: number): number {
  return Math.min(15, Math.max(0, Math.round(rate * 5)))
}

function pitchToBaiduPit(pitch: number): number {
  return Math.min(15, Math.max(0, Math.round(pitch * 5)))
}

function langToBaiduLan(lang: string): string {
  if (lang.startsWith('zh')) return 'zh'
  if (lang.startsWith('en')) return 'en'
  return 'zh'
}

export function useTextToSpeech(defaultLang: string = 'zh-CN', defaultRate: number = 0.7) {
  const isSpeaking = ref(false)
  const currentUtterance = ref<SpeechSynthesisUtterance | null>(null)
  const voicesReady = ref(false)
  let retryCount = 0
  const MAX_RETRIES = 2
  let baiduAudio: HTMLAudioElement | null = null

  function getVoices(): SpeechSynthesisVoice[] {
    return typeof window !== 'undefined' ? speechSynthesis.getVoices() : []
  }

  function loadVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      const voices = getVoices()
      if (voices.length > 0) {
        voicesReady.value = true
        resolve(voices)
        return
      }

      const onVoicesChanged = () => {
        const v = getVoices()
        if (v.length > 0) {
          voicesReady.value = true
          speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
          resolve(v)
        }
      }

      speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)

      setTimeout(() => {
        const v = getVoices()
        if (v.length > 0) {
          voicesReady.value = true
          speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
          resolve(v)
        } else {
          resolve([])
        }
      }, 1000)
    })
  }

  function scoreVoice(v: SpeechSynthesisVoice, lang: string, gender: string): number {
    let score = 0
    const name = v.name.toLowerCase()

    if (v.lang === lang) {
      score += 100
    } else if (lang === 'zh-CN' && v.lang === 'zh') {
      score += 95
    } else if (v.lang.startsWith('zh') && lang.startsWith('zh')) {
      score += 50
    } else if (v.lang.split('-')[0] === lang.split('-')[0]) {
      score += 30
    }

    if (v.localService) score += 20

    if (gender === 'female') {
      if (name.includes('female') || name.includes('xiaoxiao') || name.includes('xiaoyi')) score += 10
    } else if (gender === 'male') {
      if (name.includes('yunxi') || name.includes('kangkang')) score += 10
      if (name.includes('male') && !name.includes('female')) score += 10
    }

    return score
  }

  function findBestVoice(lang: string, gender: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (voices.length === 0) return null

    let best: SpeechSynthesisVoice | null = null
    let bestScore = -1

    for (const v of voices) {
      const s = scoreVoice(v, lang, gender)
      if (s > bestScore) {
        bestScore = s
        best = v
      }
    }

    return best
  }

  function findFallbackVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (voices.length === 0) return null
    return voices.find(v => v.localService) || voices[0] || null
  }

  function stopBaiduAudio() {
    if (baiduAudio) {
      baiduAudio.pause()
      baiduAudio.removeAttribute('src')
      baiduAudio.load()
      baiduAudio = null
    }
  }

  async function speakWithBrowser(text: string, options?: { lang?: string; rate?: number; pitch?: number }) {
    if (!text || typeof window === 'undefined') return

    speechSynthesis.cancel()
    if (speechSynthesis.paused) {
      speechSynthesis.resume()
    }

    let voiceSettings: ReturnType<typeof useVoiceSettingsStore> | null = null
    try {
      voiceSettings = useVoiceSettingsStore()
    } catch {
      // store may not be available during SSR or before pinia init
    }

    const lang = options?.lang || defaultLang
    const rate = options?.rate ?? voiceSettings?.rate ?? defaultRate
    const pitch = options?.pitch ?? voiceSettings?.pitch ?? 1.0
    const gender = voiceSettings?.gender ?? 'female'

    const voices = await loadVoices()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = rate
    utterance.pitch = pitch

    const voice = findBestVoice(lang, gender, voices)
    if (voice) {
      utterance.voice = voice
    }

    utterance.onstart = () => {
      isSpeaking.value = true
      retryCount = 0
    }
    utterance.onend = () => {
      isSpeaking.value = false
      currentUtterance.value = null
    }
    utterance.onerror = (event) => {
      isSpeaking.value = false
      currentUtterance.value = null

      if (retryCount < MAX_RETRIES && event.error !== 'interrupted' && event.error !== 'canceled') {
        retryCount++
        const fallbackVoice = findFallbackVoice(voices)
        if (fallbackVoice && fallbackVoice !== voice) {
          const retryUtterance = new SpeechSynthesisUtterance(text)
          retryUtterance.lang = lang
          retryUtterance.rate = rate
          retryUtterance.pitch = pitch
          retryUtterance.voice = fallbackVoice
          retryUtterance.onstart = () => { isSpeaking.value = true }
          retryUtterance.onend = () => { isSpeaking.value = false; currentUtterance.value = null }
          retryUtterance.onerror = () => { isSpeaking.value = false; currentUtterance.value = null }
          currentUtterance.value = retryUtterance
          speechSynthesis.speak(retryUtterance)
        }
      }
    }

    currentUtterance.value = utterance

    await new Promise<void>(resolve => setTimeout(resolve, 50))
    speechSynthesis.speak(utterance)
  }

  async function speakWithBaidu(text: string, options?: { lang?: string; rate?: number; pitch?: number }) {
    if (!text || typeof window === 'undefined') return

    stopBaiduAudio()
    speechSynthesis.cancel()

    let voiceSettings: ReturnType<typeof useVoiceSettingsStore> | null = null
    try {
      voiceSettings = useVoiceSettingsStore()
    } catch {
      // store may not be available
    }

    const lang = options?.lang || defaultLang
    const rate = options?.rate ?? voiceSettings?.rate ?? defaultRate
    const pitch = options?.pitch ?? voiceSettings?.pitch ?? 1.0
    const role = voiceSettings?.role ?? 'adult_female'
    const roleInfo = BAIDU_ROLE_MAP[role as VoiceRole] || BAIDU_ROLE_MAP.adult_female

    const truncatedText = text.length > 300 ? text.slice(0, 300) : text

    const params = new URLSearchParams({
      lan: langToBaiduLan(lang),
      ie: 'UTF-8',
      spd: String(rateToBaiduSpd(rate)),
      pit: String(pitchToBaiduPit(pitch)),
      vol: '5',
      per: String(roleInfo.per),
      text: truncatedText,
    })

    const audio = new Audio(`https://tts.baidu.com/text2audio?${params.toString()}`)
    baiduAudio = audio

    return new Promise<void>((resolve) => {
      audio.onplay = () => {
        isSpeaking.value = true
      }
      audio.onended = () => {
        isSpeaking.value = false
        baiduAudio = null
        resolve()
      }
      audio.onerror = () => {
        isSpeaking.value = false
        baiduAudio = null
        speakWithBrowser(text, options).then(resolve)
      }

      audio.play().catch(() => {
        isSpeaking.value = false
        baiduAudio = null
        speakWithBrowser(text, options).then(resolve)
      })
    })
  }

  async function speak(text: string, options?: { lang?: string; rate?: number; pitch?: number }) {
    if (!text || typeof window === 'undefined') return

    let voiceSettings: ReturnType<typeof useVoiceSettingsStore> | null = null
    try {
      voiceSettings = useVoiceSettingsStore()
    } catch {
      // store may not be available
    }

    const engine = voiceSettings?.engine ?? 'browser'

    if (engine === 'baidu') {
      return speakWithBaidu(text, options)
    } else {
      return speakWithBrowser(text, options)
    }
  }

  function stop() {
    speechSynthesis.cancel()
    if (speechSynthesis.paused) {
      speechSynthesis.resume()
    }
    stopBaiduAudio()
    isSpeaking.value = false
    currentUtterance.value = null
  }

  onUnmounted(() => {
    stop()
  })

  return {
    isSpeaking,
    speak,
    stop,
  }
}
