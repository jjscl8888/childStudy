import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PinyinItem } from '@/data/pinyinData'
import type { ChineseCharacter } from '@/data/chineseData'
import type { EnglishWord } from '@/data/englishData'
import type { ExploreTopic } from '@/data/exploreData'

export type ContentModule = 'pinyin' | 'chinese' | 'english' | 'explore'

export interface CustomContent {
  pinyin: PinyinItem[]
  chinese: ChineseCharacter[]
  english: EnglishWord[]
  explore: ExploreTopic[]
}

const STORAGE_KEY = 'funlearn_custom_content'

export const useContentStore = defineStore('content', () => {
  const customContent = ref<CustomContent>({
    pinyin: [],
    chinese: [],
    english: [],
    explore: [],
  })

  function loadFromStorage() {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      try {
        customContent.value = JSON.parse(data)
      } catch {
        customContent.value = { pinyin: [], chinese: [], english: [], explore: [] }
      }
    }
  }

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customContent.value))
  }

  function addPinyin(item: Omit<PinyinItem, 'id'>) {
    const newItem: PinyinItem = { ...item, id: `custom-py-${Date.now()}` }
    customContent.value.pinyin.push(newItem)
    saveToStorage()
    return newItem
  }

  function addChinese(item: Omit<ChineseCharacter, 'id'>) {
    const newItem: ChineseCharacter = { ...item, id: `custom-cn-${Date.now()}` }
    customContent.value.chinese.push(newItem)
    saveToStorage()
    return newItem
  }

  function addEnglish(item: Omit<EnglishWord, 'id'>) {
    const newItem: EnglishWord = { ...item, id: `custom-en-${Date.now()}` }
    customContent.value.english.push(newItem)
    saveToStorage()
    return newItem
  }

  function addExplore(item: Omit<ExploreTopic, 'id'>) {
    const newItem: ExploreTopic = { ...item, id: `custom-exp-${Date.now()}` }
    customContent.value.explore.push(newItem)
    saveToStorage()
    return newItem
  }

  function removeItem(module: ContentModule, id: string) {
    const list = customContent.value[module] as { id: string }[]
    const index = list.findIndex(item => item.id === id)
    if (index !== -1) {
      list.splice(index, 1)
      saveToStorage()
    }
  }

  function updateItem(module: ContentModule, id: string, data: Record<string, unknown>) {
    const list = customContent.value[module] as { id: string; [key: string]: unknown }[]
    const item = list.find(i => i.id === id)
    if (item) {
      Object.assign(item, data)
      saveToStorage()
    }
  }

  function getCustomCount(module: ContentModule): number {
    return customContent.value[module].length
  }

  function getCustomList<T>(module: ContentModule): T[] {
    return customContent.value[module] as T[]
  }

  loadFromStorage()

  return {
    customContent,
    addPinyin,
    addChinese,
    addEnglish,
    addExplore,
    removeItem,
    updateItem,
    getCustomCount,
    getCustomList,
    saveToStorage,
  }
})
