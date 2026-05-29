<script setup lang="ts">
import { useVoiceSettingsStore, ONLINE_ROLE_MAP, EDGE_TTS_LANG_NAMES, type TTSEngine, type Gender, type Tone, type VoiceRole } from '@/stores/voiceSettingsStore'
import { useTextToSpeech } from '@/composables/useTextToSpeech'
import { X, RefreshCw } from 'lucide-vue-next'

const voiceSettings = useVoiceSettingsStore()
const { speak, stop: stopSpeech, isLoading, engineError } = useTextToSpeech()

const engineOptions: { label: string; value: TTSEngine; emoji: string; desc: string }[] = [
  { label: '浏览器', value: 'browser', emoji: '🌐', desc: '系统内置' },
  { label: '微软语音', value: 'online', emoji: '🔊', desc: '丰富角色' },
  { label: 'Edge-TTS', value: 'edge-tts', emoji: '🎙️', desc: '服务端合成' },
]

const speedOptions = [
  { label: '慢速', value: 0.4, emoji: '🐢' },
  { label: '稍慢', value: 0.6, emoji: '🚶' },
  { label: '正常', value: 0.8, emoji: '🚶‍♂️' },
  { label: '快速', value: 1.0, emoji: '🏃' },
  { label: '极快', value: 1.3, emoji: '🚀' },
]

const genderOptions: { label: string; value: Gender; emoji: string }[] = [
  { label: '女声', value: 'female', emoji: '👩' },
  { label: '男声', value: 'male', emoji: '👨' },
]

const toneOptions: { label: string; value: Tone; emoji: string; desc: string }[] = [
  { label: '温柔', value: 'gentle', emoji: '🌸', desc: '轻柔舒缓' },
  { label: '标准', value: 'standard', emoji: '📢', desc: '自然清晰' },
  { label: '活泼', value: 'lively', emoji: '🎉', desc: '欢快明亮' },
]

const roleOptions: { key: VoiceRole; label: string; emoji: string; desc: string }[] = Object.entries(ONLINE_ROLE_MAP).map(
  ([key, info]) => ({ key: key as VoiceRole, ...info })
)

const edgeTtsGenderOptions = [
  { label: '全部', value: '' },
  { label: '女声', value: 'Female' },
  { label: '男声', value: 'Male' },
]

function formatEdgeTtsRate(val: number): string {
  return `${val >= 0 ? '+' : ''}${val}%`
}

function formatEdgeTtsPitch(val: number): string {
  return `${val >= 0 ? '+' : ''}${val}Hz`
}

function formatEdgeTtsVolume(val: number): string {
  return `${val >= 0 ? '+' : ''}${val}%`
}

function handleRefreshVoices() {
  voiceSettings.fetchEdgeTtsVoices()
}

function handleEdgeTtsRateChange(event: Event) {
  const input = event.target as HTMLInputElement
  voiceSettings.setEdgeTtsRate(Number(input.value))
}

function handleEdgeTtsPitchChange(event: Event) {
  const input = event.target as HTMLInputElement
  voiceSettings.setEdgeTtsPitch(Number(input.value))
}

function handleEdgeTtsVolumeChange(event: Event) {
  const input = event.target as HTMLInputElement
  voiceSettings.setEdgeTtsVolume(Number(input.value))
}

function previewVoice() {
  stopSpeech()
  let text: string
  if (voiceSettings.engine === 'edge-tts') {
    const voiceName = voiceSettings.edgeTtsVoice
    const displayName = voiceName.replace(/^zh-CN-/, '').replace(/Neural$/, '')
    text = `你好呀，小朋友！我是${displayName}，今天也要加油学习哦！`
  } else if (voiceSettings.engine === 'online') {
    const roleInfo = ONLINE_ROLE_MAP[voiceSettings.role]
    text = `你好呀，小朋友！我是${roleInfo.label}，今天也要加油学习哦！`
  } else {
    text = '你好呀，小朋友！今天也要加油学习哦！'
  }
  speak(text, {
    lang: 'zh-CN',
    rate: voiceSettings.rate,
    pitch: voiceSettings.pitch,
  })
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[100] flex items-end justify-center bg-black/40"
      @click.self="$emit('close')"
    >
      <div class="voice-panel w-full max-w-lg bg-white rounded-t-3xl animate-slide-up overflow-hidden">
        <div class="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 class="text-lg font-bold text-gray-700">🎙️ 语音设置</h3>
          <button
            class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
            @click="$emit('close')"
          >
            <X class="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div class="px-5 pb-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <section>
            <h4 class="text-sm font-bold text-gray-500 mb-3">🎯 发音引擎</h4>
            <div class="flex gap-2">
              <button
                v-for="opt in engineOptions"
                :key="opt.value"
                class="engine-btn flex-1 flex flex-col items-center gap-1 py-3 rounded-xl2 border-2 transition-all"
                :class="voiceSettings.engine === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-primary/30'"
                @click="voiceSettings.setEngine(opt.value)"
              >
                <span class="text-xl">{{ opt.emoji }}</span>
                <span class="text-sm font-bold">{{ opt.label }}</span>
                <span class="text-xs opacity-60">{{ opt.desc }}</span>
              </button>
            </div>
          </section>

          <section v-if="voiceSettings.engine === 'online'">
            <h4 class="text-sm font-bold text-gray-500 mb-3">🎭 声音角色</h4>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="opt in roleOptions"
                :key="opt.key"
                class="role-btn flex items-center gap-2.5 py-3 px-3 rounded-xl2 border-2 transition-all"
                :class="voiceSettings.role === opt.key
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-100 bg-gray-50 hover:border-primary/30'"
                @click="voiceSettings.setRole(opt.key)"
              >
                <span class="text-2xl">{{ opt.emoji }}</span>
                <div class="text-left">
                  <div
                    class="text-sm font-bold"
                    :class="voiceSettings.role === opt.key ? 'text-primary' : 'text-gray-600'"
                  >
                    {{ opt.label }}
                  </div>
                  <div class="text-xs text-gray-400">{{ opt.desc }}</div>
                </div>
              </button>
            </div>
          </section>

          <section v-if="voiceSettings.engine === 'edge-tts'" class="space-y-4">
            <div>
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-bold text-gray-500">🎭 音色列表</h4>
                <button
                  class="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border-2 transition-all"
                  :class="voiceSettings.edgeTtsVoicesLoading
                    ? 'border-gray-200 bg-gray-100 text-gray-400'
                    : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'"
                  :disabled="voiceSettings.edgeTtsVoicesLoading"
                  @click="handleRefreshVoices"
                >
                  <RefreshCw class="w-3 h-3" :class="{ 'animate-spin': voiceSettings.edgeTtsVoicesLoading }" />
                  <span>{{ voiceSettings.edgeTtsVoices.length > 0 ? '刷新' : '加载' }}</span>
                </button>
              </div>
              <div v-if="voiceSettings.edgeTtsVoicesError" class="mb-2 text-xs text-red-500">
                {{ voiceSettings.edgeTtsVoicesError }}
              </div>
              <div v-if="voiceSettings.edgeTtsVoices.length > 0" class="mb-2 text-xs text-gray-400">
                已加载 {{ voiceSettings.edgeTtsVoices.length }} 个音色
              </div>
            </div>

            <div>
              <h4 class="text-sm font-bold text-gray-500 mb-2">🌍 语言筛选</h4>
              <select
                :value="voiceSettings.edgeTtsLocaleFilter"
                class="w-full px-3 py-2.5 text-sm border-2 border-gray-100 rounded-xl2 bg-gray-50 focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                @change="voiceSettings.setEdgeTtsLocaleFilter(($event.target as HTMLSelectElement).value)"
              >
                <option value="">所有语言</option>
                <option
                  v-for="loc in voiceSettings.edgeTtsLocales"
                  :key="loc.value"
                  :value="loc.value"
                >
                  {{ loc.label }}
                </option>
              </select>
            </div>

            <div>
              <h4 class="text-sm font-bold text-gray-500 mb-2">🗣️ 性别筛选</h4>
              <div class="flex gap-2">
                <button
                  v-for="opt in edgeTtsGenderOptions"
                  :key="opt.value"
                  class="flex-1 py-2.5 text-sm font-bold rounded-xl2 border-2 transition-all"
                  :class="voiceSettings.edgeTtsGenderFilter === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-primary/30'"
                  @click="voiceSettings.setEdgeTtsGenderFilter(opt.value)"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div>
              <h4 class="text-sm font-bold text-gray-500 mb-2">🎭 音色选择</h4>
              <select
                :value="voiceSettings.edgeTtsVoice"
                class="w-full px-3 py-2.5 text-sm border-2 border-gray-100 rounded-xl2 bg-gray-50 focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                :disabled="voiceSettings.filteredEdgeTtsVoices.length === 0"
                @change="voiceSettings.setEdgeTtsVoice(($event.target as HTMLSelectElement).value)"
              >
                <option v-if="voiceSettings.edgeTtsVoicesLoading" value="">加载中...</option>
                <option v-else-if="voiceSettings.filteredEdgeTtsVoices.length === 0" value="">暂无音色</option>
                <option
                  v-for="v in voiceSettings.filteredEdgeTtsVoices"
                  :key="v.ShortName"
                  :value="v.ShortName"
                >
                  {{ v.Gender === 'Female' ? '👩' : '👨' }} {{ v.ShortName }}
                </option>
              </select>
              <div v-if="voiceSettings.edgeTtsVoice" class="mt-1 text-xs text-gray-400">
                当前: {{ voiceSettings.edgeTtsVoice }}
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-bold text-gray-500">⚡ 语速</h4>
                <span class="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {{ formatEdgeTtsRate(voiceSettings.edgeTtsRate) }}
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="200"
                :value="voiceSettings.edgeTtsRate"
                class="edge-tts-slider w-full"
                @input="handleEdgeTtsRateChange"
              />
              <div class="flex justify-between text-xs text-gray-300 mt-1">
                <span>-100%</span>
                <span>0%</span>
                <span>+200%</span>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-bold text-gray-500">🎵 音调</h4>
                <span class="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {{ formatEdgeTtsPitch(voiceSettings.edgeTtsPitch) }}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                :value="voiceSettings.edgeTtsPitch"
                class="edge-tts-slider w-full"
                @input="handleEdgeTtsPitchChange"
              />
              <div class="flex justify-between text-xs text-gray-300 mt-1">
                <span>-50Hz</span>
                <span>0Hz</span>
                <span>+50Hz</span>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-bold text-gray-500">🔊 音量</h4>
                <span class="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {{ formatEdgeTtsVolume(voiceSettings.edgeTtsVolume) }}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                :value="voiceSettings.edgeTtsVolume"
                class="edge-tts-slider w-full"
                @input="handleEdgeTtsVolumeChange"
              />
              <div class="flex justify-between text-xs text-gray-300 mt-1">
                <span>-50%</span>
                <span>0%</span>
                <span>+50%</span>
              </div>
            </div>
          </section>

          <section v-if="voiceSettings.engine !== 'edge-tts'">
            <h4 class="text-sm font-bold text-gray-500 mb-3">📖 朗读速度</h4>
            <div class="flex gap-2">
              <button
                v-for="opt in speedOptions"
                :key="opt.value"
                class="speed-btn flex-1 flex flex-col items-center gap-1 py-3 rounded-xl2 border-2 transition-all"
                :class="voiceSettings.rate === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-primary/30'"
                @click="voiceSettings.setRate(opt.value)"
              >
                <span class="text-xl">{{ opt.emoji }}</span>
                <span class="text-xs font-bold">{{ opt.label }}</span>
              </button>
            </div>
          </section>

          <template v-if="voiceSettings.engine === 'browser'">
            <section>
              <h4 class="text-sm font-bold text-gray-500 mb-3">🗣️ 声音性别</h4>
              <div class="flex gap-3">
                <button
                  v-for="opt in genderOptions"
                  :key="opt.value"
                  class="gender-btn flex-1 flex items-center justify-center gap-3 py-4 rounded-xl2 border-2 transition-all"
                  :class="voiceSettings.gender === opt.value
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-100 bg-gray-50 hover:border-primary/30'"
                  @click="voiceSettings.setGender(opt.value)"
                >
                  <span class="text-3xl">{{ opt.emoji }}</span>
                  <span
                    class="text-base font-bold"
                    :class="voiceSettings.gender === opt.value ? 'text-primary' : 'text-gray-500'"
                  >
                    {{ opt.label }}
                  </span>
                </button>
              </div>
            </section>

            <section>
              <h4 class="text-sm font-bold text-gray-500 mb-3">🎵 音色风格</h4>
              <div class="flex gap-3">
                <button
                  v-for="opt in toneOptions"
                  :key="opt.value"
                  class="tone-btn flex-1 flex flex-col items-center gap-1.5 py-4 rounded-xl2 border-2 transition-all"
                  :class="voiceSettings.tone === opt.value
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-100 bg-gray-50 hover:border-primary/30'"
                  @click="voiceSettings.setTone(opt.value)"
                >
                  <span class="text-2xl">{{ opt.emoji }}</span>
                  <span
                    class="text-sm font-bold"
                    :class="voiceSettings.tone === opt.value ? 'text-primary' : 'text-gray-500'"
                  >
                    {{ opt.label }}
                  </span>
                  <span class="text-xs text-gray-400">{{ opt.desc }}</span>
                </button>
              </div>
            </section>
          </template>

          <div
            v-if="engineError"
            class="rounded-xl2 bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700"
          >
            ⚠️ {{ engineError }}
          </div>

          <button
            class="fun-btn-primary w-full text-base flex items-center justify-center gap-2"
            :disabled="isLoading"
            @click="previewVoice"
          >
            <span v-if="isLoading" class="animate-spin">⏳</span>
            <span v-else>🔊</span>
            <span>{{ isLoading ? '加载中...' : '试听效果' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
export default {
  emits: ['close'],
}
</script>

<style scoped>
.voice-panel {
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.12);
}

.speed-btn:active,
.gender-btn:active,
.tone-btn:active,
.engine-btn:active,
.role-btn:active {
  transform: scale(0.96);
}

.edge-tts-slider {
  height: 6px;
  border-radius: 3px;
  background: #f3f4f6;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.edge-tts-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-primary, #6366f1);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
}

.edge-tts-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-primary, #6366f1);
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
}
</style>
