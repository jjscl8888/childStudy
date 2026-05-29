import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { queryOne, run, schedulePersist } from '@/db/database'
import { useUserStore } from './userStore'

export type Gender = 'male' | 'female'
export type Tone = 'gentle' | 'lively' | 'standard'
export type TTSEngine = 'browser' | 'online' | 'edge-tts'
export type VoiceRole =
  | 'adult_female'
  | 'adult_male'
  | 'gentle_female'
  | 'deep_male'
  | 'child_female'
  | 'child_male'

export interface EdgeTtsVoice {
  ShortName: string
  Locale: string
  Gender: string
  FriendlyName?: string
}

export interface VoiceSettings {
  rate: number
  pitch: number
  gender: Gender
  tone: Tone
  engine: TTSEngine
  role: VoiceRole
  edgeTtsVoice: string
  edgeTtsRate: number
  edgeTtsPitch: number
  edgeTtsVolume: number
  edgeTtsLocaleFilter: string
  edgeTtsGenderFilter: string
}

interface VoiceSettingsRow {
  id: number
  user_id: string
  rate: number
  pitch: number
  gender: string
  tone: string
  engine: string
  role: string
  edge_tts_voice: string
  edge_tts_rate: number
  edge_tts_pitch: number
  edge_tts_volume: number
  edge_tts_locale_filter: string
  edge_tts_gender_filter: string
}

const TONE_PITCH_MAP: Record<Tone, number> = {
  gentle: 1.0,
  standard: 1.0,
  lively: 1.1,
}

const DEFAULT_SETTINGS: VoiceSettings = {
  rate: 0.7,
  pitch: TONE_PITCH_MAP.gentle,
  gender: 'female',
  tone: 'gentle',
  engine: 'browser',
  role: 'adult_female',
  edgeTtsVoice: 'zh-CN-XiaoxiaoNeural',
  edgeTtsRate: 0,
  edgeTtsPitch: 0,
  edgeTtsVolume: 0,
  edgeTtsLocaleFilter: 'zh-CN',
  edgeTtsGenderFilter: 'Female',
}

export const ONLINE_ROLE_MAP: Record<VoiceRole, { voice: string; label: string; emoji: string; desc: string }> = {
  adult_female: { voice: 'zh-CN-XiaoxiaoNeural', label: '晓晓', emoji: '👩', desc: '标准女声' },
  adult_male: { voice: 'zh-CN-YunxiNeural', label: '云希', emoji: '👨', desc: '标准男声' },
  gentle_female: { voice: 'zh-CN-XiaoyiNeural', label: '晓伊', emoji: '👸', desc: '温柔女声' },
  deep_male: { voice: 'zh-CN-YunjianNeural', label: '云健', emoji: '🧙', desc: '磁性男声' },
  child_female: { voice: 'zh-CN-XiaoshuangNeural', label: '晓双', emoji: '🧒', desc: '可爱童声' },
  child_male: { voice: 'zh-CN-YunxiaNeural', label: '云夏', emoji: '👦', desc: '阳光童声' },
}

export const EDGE_TTS_LANG_NAMES: Record<string, string> = {
  'zh-CN': '中文(普通话)',
  'zh-TW': '中文(台湾)',
  'zh-HK': '中文(粤语)',
  'en-US': '英语(美国)',
  'en-GB': '英语(英国)',
  'en-AU': '英语(澳大利亚)',
  'ja-JP': '日语',
  'ko-KR': '韩语',
  'fr-FR': '法语',
  'de-DE': '德语',
  'es-ES': '西班牙语',
  'ru-RU': '俄语',
  'it-IT': '意大利语',
  'pt-BR': '葡萄牙语(巴西)',
}

export const useVoiceSettingsStore = defineStore('voiceSettings', () => {
  const rate = ref(DEFAULT_SETTINGS.rate)
  const gender = ref<Gender>(DEFAULT_SETTINGS.gender)
  const tone = ref<Tone>(DEFAULT_SETTINGS.tone)
  const engine = ref<TTSEngine>(DEFAULT_SETTINGS.engine)
  const role = ref<VoiceRole>(DEFAULT_SETTINGS.role)
  const edgeTtsVoice = ref(DEFAULT_SETTINGS.edgeTtsVoice)
  const edgeTtsRate = ref(DEFAULT_SETTINGS.edgeTtsRate)
  const edgeTtsPitch = ref(DEFAULT_SETTINGS.edgeTtsPitch)
  const edgeTtsVolume = ref(DEFAULT_SETTINGS.edgeTtsVolume)
  const edgeTtsLocaleFilter = ref(DEFAULT_SETTINGS.edgeTtsLocaleFilter)
  const edgeTtsGenderFilter = ref(DEFAULT_SETTINGS.edgeTtsGenderFilter)

  const edgeTtsVoices = ref<EdgeTtsVoice[]>([])
  const edgeTtsVoicesLoading = ref(false)
  const edgeTtsVoicesError = ref('')

  const pitch = computed(() => TONE_PITCH_MAP[tone.value])

  const currentSettings = computed<VoiceSettings>(() => ({
    rate: rate.value,
    pitch: pitch.value,
    gender: gender.value,
    tone: tone.value,
    engine: engine.value,
    role: role.value,
    edgeTtsVoice: edgeTtsVoice.value,
    edgeTtsRate: edgeTtsRate.value,
    edgeTtsPitch: edgeTtsPitch.value,
    edgeTtsVolume: edgeTtsVolume.value,
    edgeTtsLocaleFilter: edgeTtsLocaleFilter.value,
    edgeTtsGenderFilter: edgeTtsGenderFilter.value,
  }))

  const edgeTtsLocales = computed(() => {
    const locales = [...new Set(edgeTtsVoices.value.map(v => v.Locale))].sort()
    return locales.map(l => ({
      value: l,
      label: `${l} (${EDGE_TTS_LANG_NAMES[l] || l})`,
    }))
  })

  const filteredEdgeTtsVoices = computed(() => {
    let voices = edgeTtsVoices.value
    if (edgeTtsLocaleFilter.value) {
      voices = voices.filter(v => v.Locale === edgeTtsLocaleFilter.value)
    }
    if (edgeTtsGenderFilter.value) {
      voices = voices.filter(v => v.Gender === edgeTtsGenderFilter.value)
    }
    return voices
  })

  async function fetchEdgeTtsVoices() {
    if (edgeTtsVoicesLoading.value) return
    edgeTtsVoicesLoading.value = true
    edgeTtsVoicesError.value = ''

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${apiBase}/api/voices`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const voices: EdgeTtsVoice[] = await response.json()
      edgeTtsVoices.value = voices

      if (voices.length > 0 && !voices.find(v => v.ShortName === edgeTtsVoice.value)) {
        const match = voices.find(v => v.Locale === edgeTtsLocaleFilter.value && v.Gender === edgeTtsGenderFilter.value)
        if (match) {
          edgeTtsVoice.value = match.ShortName
        }
      }
    } catch (err) {
      edgeTtsVoicesError.value = '无法连接语音服务'
      edgeTtsVoices.value = []
    } finally {
      edgeTtsVoicesLoading.value = false
    }
  }

  function loadFromStorage() {
    const userStore = useUserStore()
    const userId = userStore.currentUser?.id ?? ''
    if (!userId) return

    const row = queryOne<VoiceSettingsRow>(
      'SELECT * FROM voice_settings WHERE id = 1'
    )
    if (row && row.user_id === userId) {
      rate.value = row.rate
      gender.value = row.gender as Gender
      tone.value = row.tone as Tone
      const rawEngine = (row.engine as string) || DEFAULT_SETTINGS.engine
      engine.value = ['baidu', 'sogou'].includes(rawEngine) ? 'online' : (rawEngine as TTSEngine)
      role.value = (row.role as VoiceRole) || DEFAULT_SETTINGS.role
      edgeTtsVoice.value = row.edge_tts_voice || DEFAULT_SETTINGS.edgeTtsVoice
      edgeTtsRate.value = row.edge_tts_rate ?? DEFAULT_SETTINGS.edgeTtsRate
      edgeTtsPitch.value = row.edge_tts_pitch ?? DEFAULT_SETTINGS.edgeTtsPitch
      edgeTtsVolume.value = row.edge_tts_volume ?? DEFAULT_SETTINGS.edgeTtsVolume
      edgeTtsLocaleFilter.value = row.edge_tts_locale_filter || DEFAULT_SETTINGS.edgeTtsLocaleFilter
      edgeTtsGenderFilter.value = row.edge_tts_gender_filter || DEFAULT_SETTINGS.edgeTtsGenderFilter
    } else {
      rate.value = DEFAULT_SETTINGS.rate
      gender.value = DEFAULT_SETTINGS.gender
      tone.value = DEFAULT_SETTINGS.tone
      engine.value = DEFAULT_SETTINGS.engine
      role.value = DEFAULT_SETTINGS.role
      edgeTtsVoice.value = DEFAULT_SETTINGS.edgeTtsVoice
      edgeTtsRate.value = DEFAULT_SETTINGS.edgeTtsRate
      edgeTtsPitch.value = DEFAULT_SETTINGS.edgeTtsPitch
      edgeTtsVolume.value = DEFAULT_SETTINGS.edgeTtsVolume
      edgeTtsLocaleFilter.value = DEFAULT_SETTINGS.edgeTtsLocaleFilter
      edgeTtsGenderFilter.value = DEFAULT_SETTINGS.edgeTtsGenderFilter
      saveToStorage()
    }
  }

  function saveToStorage() {
    const userStore = useUserStore()
    const userId = userStore.currentUser?.id ?? ''
    run(
      `INSERT OR REPLACE INTO voice_settings
        (id, user_id, rate, pitch, gender, tone, engine, role,
         edge_tts_voice, edge_tts_rate, edge_tts_pitch,
         edge_tts_volume, edge_tts_locale_filter, edge_tts_gender_filter)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, rate.value, pitch.value, gender.value, tone.value, engine.value, role.value,
       edgeTtsVoice.value, edgeTtsRate.value, edgeTtsPitch.value,
       edgeTtsVolume.value, edgeTtsLocaleFilter.value, edgeTtsGenderFilter.value]
    )
    schedulePersist()
  }

  function setRate(value: number) {
    rate.value = value
    saveToStorage()
  }

  function setGender(value: Gender) {
    gender.value = value
    saveToStorage()
  }

  function setTone(value: Tone) {
    tone.value = value
    saveToStorage()
  }

  function setEngine(value: TTSEngine) {
    engine.value = value
    if (value === 'edge-tts' && edgeTtsVoices.value.length === 0) {
      fetchEdgeTtsVoices()
    }
    saveToStorage()
  }

  function setRole(value: VoiceRole) {
    role.value = value
    saveToStorage()
  }

  function setEdgeTtsVoice(value: string) {
    edgeTtsVoice.value = value
    saveToStorage()
  }

  function setEdgeTtsRate(value: number) {
    edgeTtsRate.value = value
    saveToStorage()
  }

  function setEdgeTtsPitch(value: number) {
    edgeTtsPitch.value = value
    saveToStorage()
  }

  function setEdgeTtsVolume(value: number) {
    edgeTtsVolume.value = value
    saveToStorage()
  }

  function setEdgeTtsLocaleFilter(value: string) {
    edgeTtsLocaleFilter.value = value
    const match = filteredEdgeTtsVoices.value.find(v => v.ShortName === edgeTtsVoice.value)
    if (!match && filteredEdgeTtsVoices.value.length > 0) {
      edgeTtsVoice.value = filteredEdgeTtsVoices.value[0].ShortName
      saveToStorage()
    }
    saveToStorage()
  }

  function setEdgeTtsGenderFilter(value: string) {
    edgeTtsGenderFilter.value = value
    const match = filteredEdgeTtsVoices.value.find(v => v.ShortName === edgeTtsVoice.value)
    if (!match && filteredEdgeTtsVoices.value.length > 0) {
      edgeTtsVoice.value = filteredEdgeTtsVoices.value[0].ShortName
      saveToStorage()
    }
    saveToStorage()
  }

  loadFromStorage()

  return {
    rate,
    gender,
    tone,
    pitch,
    engine,
    role,
    edgeTtsVoice,
    edgeTtsRate,
    edgeTtsPitch,
    edgeTtsVolume,
    edgeTtsLocaleFilter,
    edgeTtsGenderFilter,
    edgeTtsVoices,
    edgeTtsVoicesLoading,
    edgeTtsVoicesError,
    edgeTtsLocales,
    filteredEdgeTtsVoices,
    currentSettings,
    setRate,
    setGender,
    setTone,
    setEngine,
    setRole,
    setEdgeTtsVoice,
    setEdgeTtsRate,
    setEdgeTtsPitch,
    setEdgeTtsVolume,
    setEdgeTtsLocaleFilter,
    setEdgeTtsGenderFilter,
    fetchEdgeTtsVoices,
    loadFromStorage,
    saveToStorage,
  }
})
