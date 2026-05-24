import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { queryOne, run, schedulePersist } from '@/db/database'
import { useUserStore } from './userStore'

export type Gender = 'male' | 'female'
export type Tone = 'gentle' | 'lively' | 'standard'

export interface VoiceSettings {
  rate: number
  pitch: number
  gender: Gender
  tone: Tone
}

interface VoiceSettingsRow {
  id: number
  user_id: string
  rate: number
  pitch: number
  gender: string
  tone: string
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
}

export const useVoiceSettingsStore = defineStore('voiceSettings', () => {
  const rate = ref(DEFAULT_SETTINGS.rate)
  const gender = ref<Gender>(DEFAULT_SETTINGS.gender)
  const tone = ref<Tone>(DEFAULT_SETTINGS.tone)

  const pitch = computed(() => TONE_PITCH_MAP[tone.value])

  const currentSettings = computed<VoiceSettings>(() => ({
    rate: rate.value,
    pitch: pitch.value,
    gender: gender.value,
    tone: tone.value,
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
    } else {
      rate.value = DEFAULT_SETTINGS.rate
      gender.value = DEFAULT_SETTINGS.gender
      tone.value = DEFAULT_SETTINGS.tone
      saveToStorage()
    }
  }

  function saveToStorage() {
    const userStore = useUserStore()
    const userId = userStore.currentUser?.id ?? ''
    run(
      'INSERT OR REPLACE INTO voice_settings (id, user_id, rate, pitch, gender, tone) VALUES (1, ?, ?, ?, ?, ?)',
      [userId, rate.value, pitch.value, gender.value, tone.value]
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

  loadFromStorage()

  return {
    rate,
    gender,
    tone,
    pitch,
    currentSettings,
    setRate,
    setGender,
    setTone,
    loadFromStorage,
    saveToStorage,
  }
})
