<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Plus, Trash2, BookOpen } from 'lucide-vue-next'
import TopBar from '@/components/layout/TopBar.vue'
import { useContentStore, type ContentModule } from '@/stores/contentStore'
import { pinyinData } from '@/data/pinyinData'
import { chineseData } from '@/data/chineseData'
import { englishData } from '@/data/englishData'
import { exploreData } from '@/data/exploreData'

const router = useRouter()
const contentStore = useContentStore()

type ModuleTab = 'chinese' | 'pinyin' | 'english' | 'explore'
const activeTab = ref<ModuleTab>('chinese')
const showAddForm = ref(false)

const tabs: { key: ModuleTab; label: string; icon: string; color: string }[] = [
  { key: 'chinese', label: '汉字', icon: '📖', color: '#2ED573' },
  { key: 'pinyin', label: '拼音', icon: '📝', color: '#FF9F43' },
  { key: 'english', label: '英语', icon: '🌍', color: '#54A0FF' },
  { key: 'explore', label: '拓展', icon: '🌟', color: '#A55EEA' },
]

const defaultCounts = computed(() => ({
  chinese: chineseData.length,
  pinyin: pinyinData.length,
  english: englishData.length,
  explore: exploreData.length,
}))

const customCounts = computed(() => ({
  chinese: contentStore.getCustomCount('chinese'),
  pinyin: contentStore.getCustomCount('pinyin'),
  english: contentStore.getCustomCount('english'),
  explore: contentStore.getCustomCount('explore'),
}))

const customList = computed(() => contentStore.customContent[activeTab.value])

function removeItem(id: string) {
  if (confirm('确定要删除这条内容吗？')) {
    contentStore.removeItem(activeTab.value, id)
  }
}

const chineseForm = ref({
  character: '',
  pinyin: '',
  groupName: '自定义',
  words: '',
  sentence: '',
  originStory: '',
})

const pinyinForm = ref({
  pinyin: '',
  type: 'shengmu' as 'shengmu' | 'yunmu' | 'zhengti',
  group: '自定义',
  example: '',
  examplePinyin: '',
})

const englishForm = ref({
  word: '',
  phonetic: '',
  chinese: '',
  category: 'custom',
  categoryName: '自定义',
  exampleSentence: '',
})

const exploreForm = ref({
  title: '',
  category: 'custom',
  categoryName: '自定义',
  icon: '📚',
  content: '',
  funFact: '',
  color: '#FF9F43',
})

function resetForm() {
  chineseForm.value = { character: '', pinyin: '', groupName: '自定义', words: '', sentence: '', originStory: '' }
  pinyinForm.value = { pinyin: '', type: 'shengmu', group: '自定义', example: '', examplePinyin: '' }
  englishForm.value = { word: '', phonetic: '', chinese: '', category: 'custom', categoryName: '自定义', exampleSentence: '' }
  exploreForm.value = { title: '', category: 'custom', categoryName: '自定义', icon: '📚', content: '', funFact: '', color: '#FF9F43' }
}

function submitChinese() {
  const f = chineseForm.value
  if (!f.character || !f.pinyin) return
  const wordsList = f.words.split('、').filter(Boolean).map(w => {
    return { word: w, pinyin: '' }
  })
  contentStore.addChinese({
    character: f.character,
    pinyin: f.pinyin,
    group: 'custom',
    groupName: f.groupName || '自定义',
    words: wordsList.length > 0 ? wordsList : [{ word: f.character, pinyin: f.pinyin }],
    sentence: f.sentence || `${f.character}`,
    originStory: f.originStory || `${f.character}字的由来。`,
    emoji: '📝',
    imageUrl: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20cartoon%20${encodeURIComponent(f.character)}%20colorful%20children%20illustration&image_size=square`,
  })
  resetForm()
  showAddForm.value = false
}

function submitPinyin() {
  const f = pinyinForm.value
  if (!f.pinyin) return
  contentStore.addPinyin({
    pinyin: f.pinyin,
    type: f.type,
    group: f.group || '自定义',
    example: f.example || f.pinyin,
    examplePinyin: f.examplePinyin || f.pinyin,
    emoji: '🔤',
    imageUrl: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20cartoon%20${encodeURIComponent(f.example || f.pinyin)}%20colorful%20children%20illustration&image_size=square`,
  })
  resetForm()
  showAddForm.value = false
}

function submitEnglish() {
  const f = englishForm.value
  if (!f.word || !f.chinese) return
  contentStore.addEnglish({
    word: f.word,
    phonetic: f.phonetic || '',
    chinese: f.chinese,
    category: f.category || 'custom',
    categoryName: f.categoryName || '自定义',
    exampleSentence: f.exampleSentence || `I like ${f.word}.`,
    emoji: '📝',
    imageUrl: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20cartoon%20${encodeURIComponent(f.word)}%20colorful%20children%20illustration&image_size=square`,
  })
  resetForm()
  showAddForm.value = false
}

function submitExplore() {
  const f = exploreForm.value
  if (!f.title || !f.content) return
  contentStore.addExplore({
    title: f.title,
    category: f.category || 'custom',
    categoryName: f.categoryName || '自定义',
    icon: f.icon || '📚',
    content: f.content,
    funFact: f.funFact || '',
    imageUrl: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20cartoon%20${encodeURIComponent(f.title)}%20colorful%20children%20illustration&image_size=landscape_16_9`,
    color: f.color || '#FF9F43',
  })
  resetForm()
  showAddForm.value = false
}

function handleSubmit() {
  switch (activeTab.value) {
    case 'chinese': submitChinese(); break
    case 'pinyin': submitPinyin(); break
    case 'english': submitEnglish(); break
    case 'explore': submitExplore(); break
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: #FFF9E6">
    <TopBar title="内容管理 📚" />

    <div class="px-4 pt-4 pb-8">
      <div class="fun-card mb-4">
        <h2 class="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
          <BookOpen class="h-5 w-5 text-primary" />
          内容总览
        </h2>
        <div class="grid grid-cols-2 gap-3">
          <div v-for="tab in tabs" :key="tab.key" class="rounded-xl2 p-3 border-2" :style="{ borderColor: tab.color + '40', backgroundColor: tab.color + '10' }">
            <div class="text-2xl mb-1">{{ tab.icon }}</div>
            <div class="text-sm font-bold text-gray-700">{{ tab.label }}</div>
            <div class="text-xs text-gray-500">
              内置 {{ defaultCounts[tab.key] }} 项 · 自定义 {{ customCounts[tab.key] }} 项
            </div>
          </div>
        </div>
      </div>

      <div class="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-all duration-200"
          :class="activeTab === tab.key ? 'text-white shadow-md' : 'bg-white text-gray-500 border-2 border-gray-100'"
          :style="activeTab === tab.key ? { backgroundColor: tab.color } : {}"
          @click="activeTab = tab.key; showAddForm = false"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      </div>

      <button
        class="fun-btn-primary w-full mb-4 flex items-center justify-center gap-2"
        @click="showAddForm = !showAddForm; resetForm()"
      >
        <Plus class="h-5 w-5" />
        {{ showAddForm ? '收起表单' : '添加新内容' }}
      </button>

      <div v-if="showAddForm" class="fun-card mb-4 animate-slide-up border-2 border-primary/30">
        <h3 class="text-base font-bold text-gray-700 mb-4">
          添加{{ tabs.find(t => t.key === activeTab)?.label }}内容
        </h3>

        <div v-if="activeTab === 'chinese'" class="space-y-3">
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">汉字 *</label>
            <input v-model="chineseForm.character" class="fun-input" placeholder="如：天" maxlength="1" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">拼音 *</label>
            <input v-model="chineseForm.pinyin" class="fun-input" placeholder="如：tiān" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">分组名称</label>
            <input v-model="chineseForm.groupName" class="fun-input" placeholder="如：自然、动物（默认：自定义）" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">组词（用"、"分隔）</label>
            <input v-model="chineseForm.words" class="fun-input" placeholder="如：天空、天气" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">造句</label>
            <input v-model="chineseForm.sentence" class="fun-input" placeholder="如：天空很蓝。" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">字源故事</label>
            <textarea v-model="chineseForm.originStory" class="fun-input min-h-[80px]" placeholder="如：天字上面一横代表天空，下面是大，表示人头顶上的天空。"></textarea>
          </div>
        </div>

        <div v-if="activeTab === 'pinyin'" class="space-y-3">
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">拼音 *</label>
            <input v-model="pinyinForm.pinyin" class="fun-input" placeholder="如：zh" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">类型</label>
            <select v-model="pinyinForm.type" class="fun-input">
              <option value="shengmu">声母</option>
              <option value="yunmu">韵母</option>
              <option value="zhengti">整体认读</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">分组</label>
            <input v-model="pinyinForm.group" class="fun-input" placeholder="如：第五组（默认：自定义）" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">例词</label>
            <input v-model="pinyinForm.example" class="fun-input" placeholder="如：知道" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">例词拼音</label>
            <input v-model="pinyinForm.examplePinyin" class="fun-input" placeholder="如：zhī dào" />
          </div>
        </div>

        <div v-if="activeTab === 'english'" class="space-y-3">
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">英文单词 *</label>
            <input v-model="englishForm.word" class="fun-input" placeholder="如：sun" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">音标</label>
            <input v-model="englishForm.phonetic" class="fun-input" placeholder="如：/sʌn/" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">中文释义 *</label>
            <input v-model="englishForm.chinese" class="fun-input" placeholder="如：太阳" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">分类名称</label>
            <input v-model="englishForm.categoryName" class="fun-input" placeholder="如：自然（默认：自定义）" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">例句</label>
            <input v-model="englishForm.exampleSentence" class="fun-input" placeholder="如：The sun is bright." />
          </div>
        </div>

        <div v-if="activeTab === 'explore'" class="space-y-3">
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">标题 *</label>
            <input v-model="exploreForm.title" class="fun-input" placeholder="如：太阳系" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">图标</label>
            <input v-model="exploreForm.icon" class="fun-input" placeholder="如：☀️" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">分类名称</label>
            <input v-model="exploreForm.categoryName" class="fun-input" placeholder="如：自然科学（默认：自定义）" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">内容 *</label>
            <textarea v-model="exploreForm.content" class="fun-input min-h-[120px]" placeholder="输入知识点内容..."></textarea>
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-1">趣味小知识</label>
            <textarea v-model="exploreForm.funFact" class="fun-input min-h-[60px]" placeholder="输入一个有趣的小知识..."></textarea>
          </div>
        </div>

        <button class="fun-btn-success w-full mt-4" @click="handleSubmit">
          ✅ 确认添加
        </button>
      </div>

      <div class="fun-card">
        <h3 class="text-base font-bold text-gray-700 mb-3">
          已添加的自定义内容（{{ customList.length }} 项）
        </h3>

        <div v-if="customList.length === 0" class="text-center py-8 text-gray-400">
          <div class="text-4xl mb-2">📭</div>
          <p>还没有自定义内容</p>
          <p class="text-sm">点击上方"添加新内容"按钮开始添加</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="item in customList"
            :key="item.id"
            class="flex items-center gap-3 rounded-xl2 p-3 bg-gray-50 border border-gray-100"
          >
            <div class="flex-1 min-w-0">
              <div v-if="activeTab === 'chinese'" class="flex items-center gap-2">
                <span class="text-2xl font-bold text-gray-700">{{ (item as any).character }}</span>
                <span class="text-sm text-gray-400">{{ (item as any).pinyin }}</span>
                <span class="module-badge bg-green-100 text-green-700">{{ (item as any).groupName }}</span>
              </div>
              <div v-else-if="activeTab === 'pinyin'" class="flex items-center gap-2">
                <span class="text-2xl font-bold" style="color: #FF9F43">{{ (item as any).pinyin }}</span>
                <span class="text-sm text-gray-400">{{ (item as any).example }}</span>
                <span class="module-badge bg-orange-100 text-orange-700">{{ (item as any).type === 'shengmu' ? '声母' : (item as any).type === 'yunmu' ? '韵母' : '整体认读' }}</span>
              </div>
              <div v-else-if="activeTab === 'english'" class="flex items-center gap-2">
                <span class="text-lg font-bold text-blue-600">{{ (item as any).word }}</span>
                <span class="text-sm text-gray-400">{{ (item as any).chinese }}</span>
                <span class="module-badge bg-blue-100 text-blue-700">{{ (item as any).categoryName }}</span>
              </div>
              <div v-else class="flex items-center gap-2">
                <span class="text-lg">{{ (item as any).icon }}</span>
                <span class="text-sm font-bold text-gray-700">{{ (item as any).title }}</span>
                <span class="module-badge bg-purple-100 text-purple-700">{{ (item as any).categoryName }}</span>
              </div>
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              @click="removeItem(item.id)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div class="fun-card mt-4 bg-blue-50 border-blue-200">
        <h3 class="text-sm font-bold text-blue-700 mb-2">💡 添加提示</h3>
        <ul class="text-xs text-blue-600 space-y-1">
          <li>• 带 * 的字段为必填项，其他为选填</li>
          <li>• 图片会根据内容自动生成，无需手动上传</li>
          <li>• 添加的内容会自动出现在对应学习模块中</li>
          <li>• 自定义内容会标记"自定义"标签，方便区分</li>
          <li>• 组词用"、"分隔，如：天空、天气、天真</li>
        </ul>
      </div>
    </div>
  </div>
</template>
