import { ref, onUnmounted } from 'vue'

export function useTextToSpeech(defaultLang: string = 'zh-CN', defaultRate: number = 0.7) {
  const isSpeaking = ref(false)
  const currentUtterance = ref<SpeechSynthesisUtterance | null>(null)
  const voicesReady = ref(false)
  let retryCount = 0
  const MAX_RETRIES = 2

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

  function findBestVoice(lang: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (voices.length === 0) return null

    const langPrefix = lang.split('-')[0]

    const localExact = voices.find(v => v.lang === lang && v.localService)
    if (localExact) return localExact

    const localPrefix = voices.find(v => v.lang.startsWith(langPrefix) && v.localService)
    if (localPrefix) return localPrefix

    const networkExact = voices.find(v => v.lang === lang && !v.localService)
    if (networkExact) return networkExact

    const networkPrefix = voices.find(v => v.lang.startsWith(langPrefix) && !v.localService)
    if (networkPrefix) return networkPrefix

    const anyExact = voices.find(v => v.lang === lang)
    if (anyExact) return anyExact

    const anyPrefix = voices.find(v => v.lang.startsWith(langPrefix))
    if (anyPrefix) return anyPrefix

    return null
  }

  function findFallbackVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (voices.length === 0) return null
    return voices.find(v => v.localService) || voices[0] || null
  }

  async function speak(text: string, options?: { lang?: string; rate?: number; pitch?: number }) {
    if (!text || typeof window === 'undefined') return

    speechSynthesis.cancel()

    if (speechSynthesis.paused) {
      speechSynthesis.resume()
    }

    const lang = options?.lang || defaultLang
    const rate = options?.rate ?? defaultRate
    const pitch = options?.pitch ?? 1.0

    const voices = await loadVoices()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = rate
    utterance.pitch = pitch

    const voice = findBestVoice(lang, voices)
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

  function stop() {
    speechSynthesis.cancel()
    if (speechSynthesis.paused) {
      speechSynthesis.resume()
    }
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
