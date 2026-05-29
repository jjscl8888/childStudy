<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { Mic, MicOff, RotateCcw, Send, Play, Volume2, ChevronDown, ChevronUp } from 'lucide-vue-next'

interface AssessmentDetail {
  char?: string
  expected_pinyin?: string
  recognized_pinyin?: string
  tone_correct?: boolean
  char_correct?: boolean
  expected?: string
  recognized?: string
  correct?: boolean
  score?: number
  initial_correct?: boolean
}

interface AssessmentResult {
  overall_score: number
  accuracy_score: number
  pinyin_score?: number
  details: AssessmentDetail[]
}

interface AssessResponse {
  success: boolean
  audioUrl: string
  recognized_text: string
  expected_text: string
  language: string
  assessment: AssessmentResult
}

interface HistoryItem {
  id: number
  text: string
  language: string
  score: number
  audioUrl: string | null
  timestamp: string
}

const language = ref('zh')
const textInput = ref('')
const isRecording = ref(false)
const recordingSeconds = ref(0)
const hasRecording = ref(false)
const isSubmitting = ref(false)
const showResult = ref(false)
const isLoadingResult = ref(false)
const result = ref<AssessResponse | null>(null)
const showHistory = ref(true)

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let audioBlob: Blob | null = null
let audioUrl: string | null = null
let recordingTimer: ReturnType<typeof setInterval> | null = null
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let animationId: number | null = null
let playbackAudio: HTMLAudioElement | null = null

const history = ref<HistoryItem[]>(
  JSON.parse(localStorage.getItem('funlearn_speech_history') || '[]')
)

const languageOptions = [
  { value: 'zh', label: '中文（汉字）', emoji: '🇨🇳' },
  { value: 'pinyin', label: '拼音', emoji: '🔤' },
  { value: 'en', label: '英语', emoji: '🇬🇧' },
]

const exampleTexts = [
  { text: '你好世界', lang: 'zh', label: '你好世界' },
  { text: 'ni3 hao3 shi4 jie4', lang: 'pinyin', label: 'nǐ hǎo shì jiè' },
  { text: 'Hello World', lang: 'en', label: 'Hello World' },
  { text: '春眠不觉晓', lang: 'zh', label: '春眠不觉晓' },
  { text: 'The quick brown fox', lang: 'en', label: 'The quick brown fox' },
]

const inputHints: Record<string, string> = {
  zh: '请输入中文汉字，如：你好世界',
  pinyin: '请输入拼音（带声调数字），如：ni3 hao3 shi4 jie4',
  en: '请输入英语单词或句子，如：Hello World',
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#4caf50'
  if (score >= 60) return '#ff9800'
  return '#f44336'
}

function getScoreLabel(score: number): string {
  if (score >= 90) return '太棒了！'
  if (score >= 80) return '非常好！'
  if (score >= 60) return '不错哦！'
  if (score >= 40) return '继续加油！'
  return '再试一次！'
}

function getDetailClass(item: AssessmentDetail): string {
  if (language.value === 'zh') {
    const isCorrect = item.char_correct && item.tone_correct
    if (isCorrect) return 'correct'
    return item.char_correct ? 'partial' : 'incorrect'
  } else if (language.value === 'pinyin') {
    const score = item.score ?? 0
    if (score >= 80) return 'correct'
    if (score >= 50) return 'partial'
    return 'incorrect'
  } else {
    return item.correct ? 'correct' : 'incorrect'
  }
}

const circumference = 2 * Math.PI * 45

function getScoreDashOffset(score: number): number {
  return circumference - (score / 100) * circumference
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      },
    })

    setupWaveform(stream)

    const mimeType = getSupportedMimeType()
    mediaRecorder = new MediaRecorder(stream, { mimeType })
    audioChunks = []

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data)
    }

    mediaRecorder.onstop = () => {
      audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      audioUrl = URL.createObjectURL(audioBlob)
      hasRecording.value = true
      stream.getTracks().forEach((track) => track.stop())
    }

    mediaRecorder.start(100)
    isRecording.value = true
    showResult.value = false
    recordingSeconds.value = 0
    recordingTimer = setInterval(() => {
      recordingSeconds.value++
      if (recordingSeconds.value >= 30) stopRecording()
    }, 1000)
  } catch (error: any) {
    alert('无法访问麦克风，请确保已授予权限。\n错误: ' + error.message)
  }
}

function getSupportedMimeType(): string {
  const types = ['audio/webm', 'audio/ogg', 'audio/mp4']
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return 'audio/webm'
}

function setupWaveform(stream: MediaStream) {
  audioContext = new AudioContext()
  analyser = audioContext.createAnalyser()
  const source = audioContext.createMediaStreamSource(stream)
  source.connect(analyser)
  analyser.fftSize = 256
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
  }
  isRecording.value = false
  if (recordingTimer) {
    clearInterval(recordingTimer)
    recordingTimer = null
  }
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
  analyser = null
}

function resetRecording() {
  hasRecording.value = false
  showResult.value = false
  result.value = null
  if (audioUrl) URL.revokeObjectURL(audioUrl)
  audioUrl = null
  audioBlob = null
}

function playRecording() {
  if (!audioUrl) return
  if (playbackAudio) {
    playbackAudio.pause()
    playbackAudio = null
  }
  playbackAudio = new Audio(audioUrl)
  playbackAudio.play()
}

async function convertToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer()
  const ctx = new AudioContext()
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
  const sampleRate = 16000
  const numChannels = 1
  const bitsPerSample = 16
  const offlineContext = new OfflineAudioContext(
    numChannels,
    audioBuffer.duration * sampleRate,
    sampleRate
  )
  const source = offlineContext.createBufferSource()
  source.buffer = audioBuffer
  source.connect(offlineContext.destination)
  source.start()
  const renderedBuffer = await offlineContext.startRendering()
  const samples = renderedBuffer.getChannelData(0)
  const wavBuffer = encodeWav(samples, sampleRate, numChannels, bitsPerSample)
  ctx.close()
  return new Blob([wavBuffer], { type: 'audio/wav' })
}

function encodeWav(samples: Float32Array, sampleRate: number, numChannels: number, bitsPerSample: number): ArrayBuffer {
  const bytesPerSample = bitsPerSample / 8
  const blockAlign = numChannels * bytesPerSample
  const dataSize = samples.length * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return buffer
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

async function submitAssessment() {
  if (!audioBlob || !textInput.value.trim()) {
    alert('请先录音并输入评测文本')
    return
  }

  isSubmitting.value = true
  showResult.value = true
  isLoadingResult.value = true
  result.value = null

  try {
    const wavBlob = await convertToWav(audioBlob)
    const formData = new FormData()
    formData.append('audio', wavBlob, 'recording.wav')
    formData.append('expectedText', textInput.value.trim())
    formData.append('language', language.value)

    const response = await fetch('/api/assess', { method: 'POST', body: formData })
    const raw = await response.text()
    let data: AssessResponse
    try {
      data = JSON.parse(raw)
    } catch {
      throw new Error('无法解析服务响应')
    }

    if (!response.ok) throw new Error((data as any).error || '评测失败')
    if (data.success) {
      result.value = data
      addToHistory(data)
    } else {
      throw new Error((data as any).error || '评测失败')
    }
  } catch (error: any) {
    alert('评测失败: ' + error.message)
    showResult.value = false
  } finally {
    isLoadingResult.value = false
    isSubmitting.value = false
  }
}

function addToHistory(data: AssessResponse) {
  const item: HistoryItem = {
    id: Date.now(),
    text: data.expected_text,
    language: data.language,
    score: data.assessment.overall_score,
    audioUrl: data.audioUrl,
    timestamp: new Date().toLocaleString(),
  }
  history.value.unshift(item)
  if (history.value.length > 20) history.value = history.value.slice(0, 20)
  localStorage.setItem('funlearn_speech_history', JSON.stringify(history.value))
}

function playHistoryAudio(url: string) {
  if (playbackAudio) {
    playbackAudio.pause()
    playbackAudio = null
  }
  playbackAudio = new Audio(url)
  playbackAudio.play()
}

function clearHistory() {
  history.value = []
  localStorage.removeItem('funlearn_speech_history')
}

function setExample(text: string, lang: string) {
  textInput.value = text
  language.value = lang
}

onUnmounted(() => {
  stopRecording()
  if (playbackAudio) {
    playbackAudio.pause()
    playbackAudio = null
  }
  if (audioUrl) URL.revokeObjectURL(audioUrl)
})
</script>

<template>
  <div class="speech-page min-h-screen pb-24">
    <div class="px-4 pt-4 space-y-4">
      <section class="fun-card">
        <h3 class="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span>🎯</span> 语言选择
        </h3>
        <div class="flex gap-2">
          <button
            v-for="opt in languageOptions"
            :key="opt.value"
            class="flex-1 py-3 rounded-xl2 border-2 transition-all text-center"
            :class="language === opt.value
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-primary/30'"
            @click="language = opt.value"
          >
            <span class="text-lg">{{ opt.emoji }}</span>
            <span class="block text-xs font-bold mt-1">{{ opt.label }}</span>
          </button>
        </div>
      </section>

      <section class="fun-card">
        <h3 class="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span>📝</span> 输入文本
        </h3>
        <textarea
          v-model="textInput"
          class="fun-input min-h-[80px] resize-y text-sm"
          :placeholder="inputHints[language]"
          rows="3"
        ></textarea>
        <div class="flex flex-wrap gap-2 mt-3">
          <button
            v-for="ex in exampleTexts"
            :key="ex.label"
            class="px-3 py-1.5 text-xs font-bold rounded-full border-2 transition-all"
            :class="language === ex.lang
              ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
              : 'border-gray-100 bg-gray-50 text-gray-400'"
            @click="setExample(ex.text, ex.lang)"
          >
            {{ ex.label }}
          </button>
        </div>
      </section>

      <section class="fun-card text-center">
        <h3 class="text-base font-bold text-gray-700 mb-4 flex items-center justify-center gap-2">
          <span>🎙️</span> 录音
        </h3>

        <div class="flex justify-center gap-4 mb-4">
          <button
            class="fun-btn-primary flex items-center gap-2"
            :class="{ 'opacity-50 cursor-not-allowed': !textInput.trim() || isRecording }"
            :disabled="!textInput.trim() || isRecording"
            @click="startRecording"
          >
            <Mic class="w-5 h-5" />
            <span>开始录音</span>
          </button>
          <button
            class="fun-btn-secondary flex items-center gap-2"
            :class="{ 'opacity-50 cursor-not-allowed': !isRecording }"
            :disabled="!isRecording"
            @click="stopRecording"
          >
            <MicOff class="w-5 h-5" />
            <span>停止</span>
          </button>
        </div>

        <div v-if="isRecording" class="flex items-center justify-center gap-2 text-red-500 font-bold mb-2">
          <span class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
          <span>录音中... {{ recordingSeconds }}秒</span>
        </div>

        <div v-if="hasRecording && !isRecording" class="space-y-3">
          <div class="flex items-center justify-center gap-3">
            <button
              class="flex items-center gap-2 px-4 py-2 rounded-xl2 bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-colors"
              @click="playRecording"
            >
              <Play class="w-4 h-4" />
              回放
            </button>
            <button
              class="flex items-center gap-2 px-4 py-2 rounded-xl2 bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-colors"
              @click="resetRecording"
            >
              <RotateCcw class="w-4 h-4" />
              重录
            </button>
            <button
              class="fun-btn-primary flex items-center gap-2 text-sm !px-4 !py-2"
              :disabled="isSubmitting"
              @click="submitAssessment"
            >
              <Send class="w-4 h-4" />
              <span>{{ isSubmitting ? '评测中...' : '提交评测' }}</span>
            </button>
          </div>
        </div>
      </section>

      <section v-if="showResult" class="fun-card">
        <h3 class="text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span>📊</span> 评测结果
        </h3>

        <div v-if="isLoadingResult" class="text-center py-8">
          <div class="w-10 h-10 border-4 border-gray-100 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
          <p class="text-sm text-gray-400">正在评测中，请稍候...</p>
        </div>

        <div v-else-if="result" class="space-y-5">
          <div class="text-center">
            <div class="relative w-32 h-32 mx-auto mb-2">
              <svg viewBox="0 0 100 100" class="w-full h-full" style="transform: rotate(-90deg)">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" stroke-width="8" />
                <circle
                  cx="50" cy="50" r="45" fill="none"
                  :stroke="getScoreColor(result.assessment.overall_score)"
                  stroke-width="8" stroke-linecap="round"
                  :stroke-dasharray="circumference"
                  :stroke-dashoffset="getScoreDashOffset(result.assessment.overall_score)"
                  class="transition-all duration-1000"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-3xl font-bold text-gray-800">{{ Math.round(result.assessment.overall_score) }}</span>
                <span class="text-xs text-gray-400">综合评分</span>
              </div>
            </div>
            <p class="text-sm font-bold" :style="{ color: getScoreColor(result.assessment.overall_score) }">
              {{ getScoreLabel(result.assessment.overall_score) }}
            </p>
          </div>

          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-sm font-bold text-gray-500 w-16">准确度</span>
              <div class="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-700"
                  :style="{ width: result.assessment.accuracy_score + '%', backgroundColor: getScoreColor(result.assessment.accuracy_score) }"
                ></div>
              </div>
              <span class="text-sm font-bold text-gray-700 w-10 text-right">{{ result.assessment.accuracy_score }}</span>
            </div>
            <div v-if="result.assessment.pinyin_score !== undefined" class="flex items-center gap-3">
              <span class="text-sm font-bold text-gray-500 w-16">拼音</span>
              <div class="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-700"
                  :style="{ width: result.assessment.pinyin_score + '%', backgroundColor: getScoreColor(result.assessment.pinyin_score) }"
                ></div>
              </div>
              <span class="text-sm font-bold text-gray-700 w-10 text-right">{{ result.assessment.pinyin_score }}</span>
            </div>
          </div>

          <div class="bg-gray-50 rounded-xl2 p-4 space-y-3">
            <div>
              <span class="text-xs text-gray-400">📝 期望文本</span>
              <p class="text-base text-gray-700 tracking-wider mt-1">{{ result.expected_text }}</p>
            </div>
            <div>
              <span class="text-xs text-gray-400">🎧 识别结果</span>
              <p class="text-base text-primary tracking-wider mt-1">{{ result.recognized_text }}</p>
            </div>
          </div>

          <div v-if="result.assessment.details && result.assessment.details.length > 0">
            <h4 class="text-sm font-bold text-gray-500 mb-3">逐字/逐词详情</h4>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(item, idx) in result.assessment.details"
                :key="idx"
                class="detail-item flex flex-col items-center px-3 py-2 rounded-xl2 border-2 transition-transform hover:scale-105"
                :class="getDetailClass(item)"
              >
                <template v-if="language === 'zh'">
                  <span class="text-lg font-bold">{{ item.char || '' }}</span>
                  <span class="text-xs text-gray-400">{{ item.expected_pinyin || '' }}</span>
                  <span v-if="item.recognized_pinyin" class="text-xs text-gray-400">→ {{ item.recognized_pinyin }}</span>
                  <span class="text-xs font-bold mt-1">{{ item.tone_correct ? '✓ 声调' : '✗ 声调' }}</span>
                </template>
                <template v-else-if="language === 'pinyin'">
                  <span class="text-lg font-bold">{{ item.expected }}</span>
                  <span class="text-xs text-gray-400">→ {{ item.recognized || '?' }}</span>
                  <span class="text-xs font-bold mt-1">{{ item.score }}分</span>
                  <span class="text-xs">{{ item.tone_correct ? '✓声调' : '✗声调' }}</span>
                </template>
                <template v-else>
                  <span class="text-lg font-bold">{{ item.expected }}</span>
                  <span class="text-xs text-gray-400">→ {{ item.recognized || '?' }}</span>
                  <span class="text-xs font-bold mt-1">{{ item.score }}分</span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="fun-card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-bold text-gray-700 flex items-center gap-2">
            <span>📋</span> 历史记录
          </h3>
          <div class="flex items-center gap-2">
            <button
              v-if="history.length > 0"
              class="text-xs text-gray-400 hover:text-red-400 transition-colors"
              @click="clearHistory"
            >
              清空
            </button>
            <button
              class="text-gray-400 hover:text-gray-600 transition-colors"
              @click="showHistory = !showHistory"
            >
              <ChevronDown v-if="!showHistory" class="w-4 h-4" />
              <ChevronUp v-else class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div v-if="showHistory">
          <div v-if="history.length === 0" class="text-center text-gray-300 py-6 text-sm">
            暂无评测记录
          </div>
          <div v-else class="space-y-2 max-h-60 overflow-y-auto">
            <div
              v-for="item in history"
              :key="item.id"
              class="flex items-center justify-between p-3 rounded-xl2 border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div class="flex-1 min-w-0">
                <span class="text-sm font-bold text-gray-700 truncate block">{{ item.text }}</span>
                <span class="text-xs text-gray-400">
                  {{ languageOptions.find(o => o.value === item.language)?.label || item.language }}
                  · {{ item.timestamp }}
                </span>
              </div>
              <div class="flex items-center gap-2 shrink-0 ml-3">
                <span
                  class="text-sm font-bold px-2 py-0.5 rounded-full"
                  :style="{
                    color: getScoreColor(item.score),
                    backgroundColor: getScoreColor(item.score) + '20',
                  }"
                >
                  {{ Math.round(item.score) }}分
                </span>
                <button
                  v-if="item.audioUrl"
                  class="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  @click="playHistoryAudio(item.audioUrl!)"
                >
                  <Volume2 class="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.speech-page {
  background-color: #FFF9E6;
}

.detail-item.correct {
  background: rgba(76, 175, 80, 0.1);
  border-color: #4caf50;
}
.detail-item.correct .text-xs.font-bold {
  color: #4caf50;
}

.detail-item.incorrect {
  background: rgba(244, 67, 54, 0.1);
  border-color: #f44336;
}
.detail-item.incorrect .text-xs.font-bold {
  color: #f44336;
}

.detail-item.partial {
  background: rgba(255, 152, 0, 0.1);
  border-color: #ff9800;
}
.detail-item.partial .text-xs.font-bold {
  color: #ff9800;
}
</style>
