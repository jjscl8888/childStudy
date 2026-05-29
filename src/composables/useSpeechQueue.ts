import { ref } from 'vue'
import { useTextToSpeech } from './useTextToSpeech'

interface QueueItem {
  text: string
  options?: { lang?: string; rate?: number; pitch?: number }
}

export function useSpeechQueue(defaultLang: string = 'zh-CN', defaultRate: number = 0.7) {
  const queue = ref<QueueItem[]>([])
  const isProcessing = ref(false)
  const isSpeaking = ref(false)

  const tts = useTextToSpeech(defaultLang, defaultRate)

  async function processQueue() {
    if (isProcessing.value) return
    if (queue.value.length === 0) {
      isSpeaking.value = false
      return
    }

    isProcessing.value = true
    isSpeaking.value = true

    while (queue.value.length > 0) {
      const item = queue.value.shift()!
      await tts.speak(item.text, item.options)
      await new Promise<void>(resolve => {
        const check = setInterval(() => {
          if (!tts.isSpeaking.value) {
            clearInterval(check)
            resolve()
          }
        }, 100)
        setTimeout(() => {
          clearInterval(check)
          resolve()
        }, 500)
      })
    }

    isProcessing.value = false
    isSpeaking.value = false
  }

  function speak(text: string, options?: { lang?: string; rate?: number; pitch?: number }) {
    if (!text) return
    queue.value.push({ text, options })
    processQueue()
  }

  function speakNow(text: string, options?: { lang?: string; rate?: number; pitch?: number }) {
    if (!text) return
    clear()
    queue.value.push({ text, options })
    processQueue()
  }

  function clear() {
    queue.value = []
    tts.stop()
  }

  function stop() {
    clear()
    isProcessing.value = false
    isSpeaking.value = false
  }

  return {
    isSpeaking,
    isProcessing,
    speak,
    speakNow,
    clear,
    stop,
  }
}
