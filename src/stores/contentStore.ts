import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PinyinItem } from '@/data/pinyinData'
import type { ChineseCharacter } from '@/data/chineseData'
import type { EnglishWord } from '@/data/englishData'
import type { ExploreTopic } from '@/data/exploreData'
import { query, run } from '@/db/database'

export type ContentModule = 'pinyin' | 'chinese' | 'english' | 'explore'

export interface CustomContent {
  pinyin: PinyinItem[]
  chinese: ChineseCharacter[]
  english: EnglishWord[]
  explore: ExploreTopic[]
}

interface ContentRow {
  id: string
  module: string
  data: string
}

export const useContentStore = defineStore('content', () => {
  const customContent = ref<CustomContent>({
    pinyin: [],
    chinese: [],
    english: [],
    explore: [],
  })

  function loadFromStorage() {
    const rows = query<ContentRow>('SELECT id, module, data FROM custom_content')
    const result: CustomContent = { pinyin: [], chinese: [], english: [], explore: [] }
    for (const row of rows) {
      try {
        const item = JSON.parse(row.data)
        const module = row.module as ContentModule
        if (module in result) {
          result[module].push(item)
        }
      } catch {
        // skip corrupted data
      }
    }
    customContent.value = result
  }

  function saveItem(module: ContentModule, id: string, data: object) {
    run('INSERT OR REPLACE INTO custom_content (id, module, data) VALUES (?, ?, ?)', [
      id, module, JSON.stringify(data),
    ])
  }

  function addPinyin(item: Omit<PinyinItem, 'id'>) {
    const newItem: PinyinItem = { ...item, id: `custom-py-${Date.now()}` }
    customContent.value.pinyin.push(newItem)
    saveItem('pinyin', newItem.id, newItem)
    return newItem
  }

  function addChinese(item: Omit<ChineseCharacter, 'id'>) {
    const newItem: ChineseCharacter = { ...item, id: `custom-cn-${Date.now()}` }
    customContent.value.chinese.push(newItem)
    saveItem('chinese', newItem.id, newItem)
    return newItem
  }

  function addEnglish(item: Omit<EnglishWord, 'id'>) {
    const newItem: EnglishWord = { ...item, id: `custom-en-${Date.now()}` }
    customContent.value.english.push(newItem)
    saveItem('english', newItem.id, newItem)
    return newItem
  }

  function addExplore(item: Omit<ExploreTopic, 'id'>) {
    const newItem: ExploreTopic = { ...item, id: `custom-exp-${Date.now()}` }
    customContent.value.explore.push(newItem)
    saveItem('explore', newItem.id, newItem)
    return newItem
  }

  function removeItem(module: ContentModule, id: string) {
    const list = customContent.value[module] as { id: string }[]
    const index = list.findIndex(item => item.id === id)
    if (index !== -1) {
      list.splice(index, 1)
      run('DELETE FROM custom_content WHERE id = ?', [id])
    }
  }

  function updateItem(module: ContentModule, id: string, data: Record<string, unknown>) {
    const list = customContent.value[module] as { id: string; [key: string]: unknown }[]
    const item = list.find(i => i.id === id)
    if (item) {
      Object.assign(item, data)
      saveItem(module, id, item)
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
    saveToStorage: loadFromStorage,
  }
})
