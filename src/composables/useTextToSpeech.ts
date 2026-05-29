import { ref, onUnmounted } from 'vue'
import { useVoiceSettingsStore, ONLINE_ROLE_MAP, type VoiceRole } from '@/stores/voiceSettingsStore'
import { Communicate } from '@twn39/edgetts-js'

function rateToEdgeRate(rate: number): string {
  const percent = Math.round((rate - 0.8) / 0.8 * 100)
  return `${percent >= 0 ? '+' : ''}${percent}%`
}

function pitchToEdgePitch(pitch: number): string {
  const hz = Math.round((pitch - 1.0) * 50)
  return `${hz >= 0 ? '+' : ''}${hz}Hz`
}

export function useTextToSpeech(defaultLang: string = 'zh-CN', defaultRate: number = 0.7) {
  const isSpeaking = ref(false)
  const isLoading = ref(false)
  const engineError = ref('')
  const currentUtterance = ref<SpeechSynthesisUtterance | null>(null)
  const voicesReady = ref(false)
  let retryCount = 0
  const MAX_RETRIES = 2
  let onlineAudio: HTMLAudioElement | null = null
  let onlineObjectUrl: string | null = null

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

  function cleanupOnline() {
    if (onlineAudio) {
      onlineAudio.pause()
      onlineAudio.oncanplaythrough = null
      onlineAudio.onended = null
      onlineAudio.onerror = null
      onlineAudio.src = ''
      onlineAudio = null
    }
    if (onlineObjectUrl) {
      URL.revokeObjectURL(onlineObjectUrl)
      onlineObjectUrl = null
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
      // store may not be available
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

  async function speakWithOnline(text: string, options?: { lang?: string; rate?: number; pitch?: number }): Promise<void> {
    if (!text || typeof window === 'undefined') return

    cleanupOnline()
    speechSynthesis.cancel()
    engineError.value = ''

    let voiceSettings: ReturnType<typeof useVoiceSettingsStore> | null = null
    try {
      voiceSettings = useVoiceSettingsStore()
    } catch {
      // store may not be available
    }

    const rate = options?.rate ?? voiceSettings?.rate ?? defaultRate
    const pitch = options?.pitch ?? voiceSettings?.pitch ?? 1.0
    const role = voiceSettings?.role ?? 'adult_female'
    const roleInfo = ONLINE_ROLE_MAP[role as VoiceRole] || ONLINE_ROLE_MAP.adult_female

    const truncatedText = text.length > 500 ? text.slice(0, 500) : text

    isLoading.value = true

    try {
      const communicate = new Communicate(truncatedText, {
        voice: roleInfo.voice,
        rate: rateToEdgeRate(rate),
        pitch: pitchToEdgePitch(pitch),
      })

      const audioChunks: Uint8Array[] = []

      for await (const chunk of communicate.stream()) {
        if (chunk.type === 'audio') {
          audioChunks.push(chunk.data)
        }
      }

      if (audioChunks.length === 0) {
        throw new Error('No audio received')
      }

      const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0)
      const combined = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of audioChunks) {
        combined.set(chunk, offset)
        offset += chunk.length
      }

      const blob = new Blob([combined], { type: 'audio/mpeg' })
      const objectUrl = URL.createObjectURL(blob)
      onlineObjectUrl = objectUrl

      isLoading.value = false

      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(objectUrl)
        onlineAudio = audio

        audio.onended = () => {
          isSpeaking.value = false
          onlineAudio = null
          resolve()
        }

        audio.onerror = () => {
          isSpeaking.value = false
          onlineAudio = null
          reject(new Error('Audio playback failed'))
        }

        audio.oncanplaythrough = () => {
          isSpeaking.value = true
          audio.play().catch(reject)
        }

        audio.load()
      })
    } catch (err) {
      isLoading.value = false
      isSpeaking.value = false
      engineError.value = `在线语音(${roleInfo.label})不可用，已切换浏览器语音`
      cleanupOnline()
      await speakWithBrowser(text, options)
    }
  }

  async function speakWithEdgeTts(text: string, _options?: { lang?: string; rate?: number; pitch?: number }): Promise<void> {
    if (!text || typeof window === 'undefined') return

    cleanupOnline()
    speechSynthesis.cancel()
    engineError.value = ''

    let voiceSettings: ReturnType<typeof useVoiceSettingsStore> | null = null
    try {
      voiceSettings = useVoiceSettingsStore()
    } catch {
      // store may not be available
    }

    const voice = voiceSettings?.edgeTtsVoice ?? 'zh-CN-XiaoxiaoNeural'
    const rateVal = voiceSettings?.edgeTtsRate ?? 0
    const pitchVal = voiceSettings?.edgeTtsPitch ?? 0
    const volumeVal = voiceSettings?.edgeTtsVolume ?? 0

    const truncatedText = text.length > 500 ? text.slice(0, 500) : text

    isLoading.value = true

    try {
      const body: Record<string, string | number | null> = {
        text: truncatedText,
        voice,
      }
      if (rateVal !== 0) {
        body.rate = rateVal > 0 ? `+${rateVal}` : `${rateVal}`
      }
      if (pitchVal !== 0) {
        body.pitch = pitchVal > 0 ? `+${pitchVal}` : `${pitchVal}`
      }
      if (volumeVal !== 0) {
        body.volume = volumeVal > 0 ? `+${volumeVal}` : `${volumeVal}`
      }

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        throw new Error(errData.error || `HTTP ${response.status}`)
      }

      const blob = await response.blob()

      if (blob.size === 0) {
        throw new Error('No audio received')
      }

      const objectUrl = URL.createObjectURL(blob)
      onlineObjectUrl = objectUrl

      isLoading.value = false

      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(objectUrl)
        onlineAudio = audio

        audio.onended = () => {
          isSpeaking.value = false
          onlineAudio = null
          resolve()
        }

        audio.onerror = () => {
          isSpeaking.value = false
          onlineAudio = null
          reject(new Error('Audio playback failed'))
        }

        audio.oncanplaythrough = () => {
          isSpeaking.value = true
          audio.play().catch(reject)
        }

        audio.load()
      })
    } catch (err) {
      isLoading.value = false
      isSpeaking.value = false
      engineError.value = 'Edge-TTS语音不可用，已切换浏览器语音'
      cleanupOnline()
      await speakWithBrowser(text, _options)
    }
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

    if (engine === 'edge-tts') {
      return speakWithEdgeTts(text, options)
    } else if (engine === 'online') {
      return speakWithOnline(text, options)
    } else {
      return speakWithBrowser(text, options)
    }
  }

  function stop() {
    speechSynthesis.cancel()
    if (speechSynthesis.paused) {
      speechSynthesis.resume()
    }
    cleanupOnline()
    isSpeaking.value = false
    isLoading.value = false
    currentUtterance.value = null
  }

  onUnmounted(() => {
    stop()
  })

  return {
    isSpeaking,
    isLoading,
    engineError,
    speak,
    stop,
  }
}
