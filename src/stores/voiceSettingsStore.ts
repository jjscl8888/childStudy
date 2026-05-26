import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { queryOne, run, schedulePersist } from '@/db/database'
import { useUserStore } from './userStore'

export type Gender = 'male' | 'female'
export type Tone = 'gentle' | 'lively' | 'standard'
export type TTSEngine = 'browser' | 'baidu'
export type VoiceRole =
  | 'adult_female'
  | 'adult_male'
  | 'gentle_sister'
  | 'cute_girl'
  | 'lively_child'
  | 'sunny_boy'
  | 'storyteller'
  | 'sweet_yaya'

export interface VoiceSettings {
  rate: number
  pitch: number
  gender: Gender
  tone: Tone
  engine: TTSEngine
  role: VoiceRole
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
}

export const BAIDU_ROLE_MAP: Record<VoiceRole, { per: number; label: string; emoji: string; desc: string }> = {
  adult_female: { per: 0, label: '成人女声', emoji: '👩', desc: '标准女声' },
  adult_male: { per: 1, label: '成人男声', emoji: '👨', desc: '标准男声' },
  storyteller: { per: 3, label: '故事大王', emoji: '🧙', desc: '情感男声' },
  sweet_yaya: { per: 4, label: '甜心丫丫', emoji: '🎀', desc: '情感女声' },
  gentle_sister: { per: 5, label: '温柔姐姐', emoji: '👸', desc: '温柔女声' },
  cute_girl: { per: 6, label: '可爱萌妹', emoji: '👧', desc: '甜美女声' },
  lively_child: { per: 7, label: '活泼童声', emoji: '🧒', desc: '儿童女声' },
  sunny_boy: { per: 8, label: '阳光男孩', emoji: '👦', desc: '儿童男声' },
}

export const useVoiceSettingsStore = defineStore('voiceSettings', () => {
  const rate = ref(DEFAULT_SETTINGS.rate)
  const gender = ref<Gender>(DEFAULT_SETTINGS.gender)
  const tone = ref<Tone>(DEFAULT_SETTINGS.tone)
  const engine = ref<TTSEngine>(DEFAULT_SETTINGS.engine)
  const role = ref<VoiceRole>(DEFAULT_SETTINGS.role)

  const pitch = computed(() => TONE_PITCH_MAP[tone.value])

  const currentSettings = computed<VoiceSettings>(() => ({
    rate: rate.value,
    pitch: pitch.value,
    gender: gender.value,
    tone: tone.value,
    engine: engine.value,
    role: role.value,
  }))

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
      engine.value = (row.engine as TTSEngine) || DEFAULT_SETTINGS.engine
      role.value = (row.role as VoiceRole) || DEFAULT_SETTINGS.role
    } else {
      rate.value = DEFAULT_SETTINGS.rate
      gender.value = DEFAULT_SETTINGS.gender
      tone.value = DEFAULT_SETTINGS.tone
      engine.value = DEFAULT_SETTINGS.engine
      role.value = DEFAULT_SETTINGS.role
      saveToStorage()
    }
  }

  function saveToStorage() {
    const userStore = useUserStore()
    const userId = userStore.currentUser?.id ?? ''
    run(
      'INSERT OR REPLACE INTO voice_settings (id, user_id, rate, pitch, gender, tone, engine, role) VALUES (1, ?, ?, ?, ?, ?, ?, ?)',
      [userId, rate.value, pitch.value, gender.value, tone.value, engine.value, role.value]
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
    saveToStorage()
  }

  function setRole(value: VoiceRole) {
    role.value = value
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
    currentSettings,
    setRate,
    setGender,
    setTone,
    setEngine,
    setRole,
    loadFromStorage,
    saveToStorage,
  }
})
