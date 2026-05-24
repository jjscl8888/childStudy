import { ref, onUnmounted } from 'vue'

interface SpeechRecognitionResult {
  transcript: string
  confidence: number
  audioUrl: string | null
}

interface UseSpeechRecognitionOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  maxDuration?: number
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const {
    lang = 'zh-CN',
    continuous = false,
    interimResults = true,
    maxDuration = 8000,
  } = options

  const isListening = ref(false)
  const transcript = ref('')
  const confidence = ref(0)
  const error = ref<string | null>(null)
  const isSupported = ref(false)
  const lastAudioUrl = ref<string | null>(null)
  const isPlaying = ref(false)

  let recognition: any = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let mediaRecorder: MediaRecorder | null = null
  let audioChunks: Blob[] = []
  let currentAudio: HTMLAudioElement | null = null

  const SpeechRecognitionAPI = typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null

  isSupported.value = !!SpeechRecognitionAPI

  async function startMediaRecorder() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunks = []
      mediaRecorder = new MediaRecorder(stream)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' })
        if (lastAudioUrl.value) {
          URL.revokeObjectURL(lastAudioUrl.value)
        }
        lastAudioUrl.value = URL.createObjectURL(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
    } catch {
      lastAudioUrl.value = null
    }
  }

  function stopMediaRecorder() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop()
      } catch {}
    }
  }

  function playLastRecording() {
    if (!lastAudioUrl.value) return
    if (isPlaying.value) {
      stopPlayback()
      return
    }

    currentAudio = new Audio(lastAudioUrl.value)
    isPlaying.value = true

    currentAudio.onended = () => {
      isPlaying.value = false
    }

    currentAudio.onerror = () => {
      isPlaying.value = false
    }

    currentAudio.play()
  }

  function stopPlayback() {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      currentAudio = null
    }
    isPlaying.value = false
  }

  function start(): Promise<SpeechRecognitionResult> {
    return new Promise((resolve, reject) => {
      if (!SpeechRecognitionAPI) {
        error.value = '您的浏览器不支持语音识别，请使用Chrome浏览器'
        reject(new Error('Speech recognition not supported'))
        return
      }

      if (isListening.value) {
        stop()
      }

      recognition = new SpeechRecognitionAPI()
      recognition.lang = lang
      recognition.continuous = continuous
      recognition.interimResults = interimResults

      transcript.value = ''
      confidence.value = 0
      error.value = null
      lastAudioUrl.value = null
      isListening.value = true

      startMediaRecorder()

      recognition.onresult = (event: any) => {
        let finalTranscript = ''
        let finalConfidence = 0
        let hasFinal = false

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript = result[0].transcript
            finalConfidence = result[0].confidence
            hasFinal = true
          } else {
            transcript.value = result[0].transcript
          }
        }

        if (hasFinal) {
          transcript.value = finalTranscript
          confidence.value = finalConfidence
          stopMediaRecorder()
          cleanup()
          resolve({ transcript: finalTranscript, confidence: finalConfidence, audioUrl: lastAudioUrl.value })
        }
      }

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          error.value = '没有检测到语音，请再试一次'
        } else if (event.error === 'audio-capture') {
          error.value = '未检测到麦克风，请检查权限'
        } else if (event.error === 'not-allowed') {
          error.value = '麦克风权限被拒绝，请在浏览器设置中允许'
        } else {
          error.value = `语音识别出错: ${event.error}`
        }
        stopMediaRecorder()
        cleanup()
        reject(new Error(error.value))
      }

      recognition.onend = () => {
        if (isListening.value) {
          stopMediaRecorder()
          cleanup()
          if (transcript.value) {
            resolve({ transcript: transcript.value, confidence: confidence.value, audioUrl: lastAudioUrl.value })
          } else {
            reject(new Error('No speech detected'))
          }
        }
      }

      recognition.start()

      timeoutId = setTimeout(() => {
        if (isListening.value) {
          stopMediaRecorder()
          stop()
          if (transcript.value) {
            resolve({ transcript: transcript.value, confidence: confidence.value, audioUrl: lastAudioUrl.value })
          } else {
            error.value = '录音超时，请再试一次'
            reject(new Error('Timeout'))
          }
        }
      }, maxDuration)
    })
  }

  function stop() {
    if (recognition) {
      try {
        recognition.stop()
      } catch {}
    }
    stopMediaRecorder()
    cleanup()
  }

  function cleanup() {
    isListening.value = false
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  function calculateScore(expected: string, actual: string): { score: number; stars: number } {
    if (!actual) return { score: 0, stars: 1 }

    const expectedLower = expected.toLowerCase().trim()
    const actualLower = actual.toLowerCase().trim()

    if (expectedLower === actualLower) {
      return { score: 100, stars: 3 }
    }

    if (actualLower.includes(expectedLower) || expectedLower.includes(actualLower)) {
      return { score: 80, stars: 3 }
    }

    const expectedChars = [...expectedLower]
    const actualChars = [...actualLower]
    let matchCount = 0
    const usedIndices = new Set<number>()

    for (const char of expectedChars) {
      const idx = actualChars.findIndex((c, i) => c === char && !usedIndices.has(i))
      if (idx !== -1) {
        matchCount++
        usedIndices.add(idx)
      }
    }

    const similarity = matchCount / Math.max(expectedChars.length, actualChars.length)

    if (similarity >= 0.6) {
      return { score: 70, stars: 2 }
    }
    if (similarity >= 0.3) {
      return { score: 40, stars: 1 }
    }

    return { score: 20, stars: 1 }
  }

  onUnmounted(() => {
    stop()
    stopPlayback()
    if (lastAudioUrl.value) {
      URL.revokeObjectURL(lastAudioUrl.value)
    }
  })

  return {
    isListening,
    transcript,
    confidence,
    error,
    isSupported,
    lastAudioUrl,
    isPlaying,
    start,
    stop,
    playLastRecording,
    calculateScore,
  }
}
