import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUserStore } from './userStore'

export interface PathNode {
  id: string
  moduleId: string
  itemId: string
  order: number
  status: 'locked' | 'available' | 'learning' | 'completed'
  stars: number
  completedAt?: string
}

export interface PathGroup {
  id: string
  moduleId: string
  name: string
  icon: string
  color: string
  nodes: PathNode[]
}

export interface LearningSession {
  id: string
  moduleId: string
  itemId: string
  startTime: number
  currentStep: number
  totalSteps: number
  stepResults: StepResult[]
  status: 'active' | 'completed' | 'abandoned'
}

export interface StepResult {
  step: number
  stepType: string
  score: number
  stars: number
  completed: boolean
  timestamp: number
}

const STORAGE_KEY = 'funlearn_learning_path'

export const useLearningPathStore = defineStore('learningPath', () => {
  const userStore = useUserStore()

  const pathNodes = ref<PathNode[]>([])
  const currentSession = ref<LearningSession | null>(null)
  const companionMessage = ref<string>('')
  const companionEmotion = ref<'happy' | 'encourage' | 'think' | 'celebrate'>('happy')

  const completedCount = computed(() => pathNodes.value.filter(n => n.status === 'completed').length)
  const totalNodes = computed(() => pathNodes.value.length)
  const overallProgress = computed(() => totalNodes.value > 0 ? completedCount.value / totalNodes.value : 0)

  function loadFromStorage() {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      try {
        const parsed = JSON.parse(data)
        pathNodes.value = parsed.pathNodes || []
      } catch {
        pathNodes.value = []
      }
    }
  }

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      pathNodes: pathNodes.value,
    }))
  }

  function initModulePath(moduleId: string, items: { id: string }[], groupInfo?: { name: string; icon: string; color: string }) {
    const existing = pathNodes.value.filter(n => n.moduleId === moduleId)
    if (existing.length > 0) return

    const nodes: PathNode[] = items.map((item, index) => ({
      id: `${moduleId}-${item.id}`,
      moduleId,
      itemId: item.id,
      order: index,
      status: index === 0 ? 'available' as const : 'locked' as const,
      stars: 0,
    }))

    pathNodes.value.push(...nodes)
    saveToStorage()
  }

  function getNode(moduleId: string, itemId: string): PathNode | undefined {
    return pathNodes.value.find(n => n.moduleId === moduleId && n.itemId === itemId)
  }

  function getModuleNodes(moduleId: string): PathNode[] {
    return pathNodes.value
      .filter(n => n.moduleId === moduleId)
      .sort((a, b) => a.order - b.order)
  }

  function getModuleProgress(moduleId: string): { completed: number; total: number; currentItemId?: string } {
    const nodes = getModuleNodes(moduleId)
    const completed = nodes.filter(n => n.status === 'completed').length
    const currentNode = nodes.find(n => n.status === 'available' || n.status === 'learning')
    return {
      completed,
      total: nodes.length,
      currentItemId: currentNode?.itemId,
    }
  }

  function completeNode(moduleId: string, itemId: string, stars: number) {
    const node = getNode(moduleId, itemId)
    if (!node) return

    node.status = 'completed'
    node.stars = Math.max(node.stars, stars)
    node.completedAt = new Date().toISOString()

    const nextNode = pathNodes.value.find(
      n => n.moduleId === moduleId && n.order === node.order + 1
    )
    if (nextNode && nextNode.status === 'locked') {
      nextNode.status = 'available'
    }

    saveToStorage()
  }

  function isNodeAccessible(moduleId: string, itemId: string): boolean {
    const node = getNode(moduleId, itemId)
    return node?.status === 'available' || node?.status === 'learning' || node?.status === 'completed'
  }

  function startSession(moduleId: string, itemId: string, totalSteps: number): LearningSession {
    const node = getNode(moduleId, itemId)
    if (node && node.status === 'available') {
      node.status = 'learning'
      saveToStorage()
    }

    const session: LearningSession = {
      id: Date.now().toString(),
      moduleId,
      itemId,
      startTime: Date.now(),
      currentStep: 0,
      totalSteps,
      stepResults: [],
      status: 'active',
    }
    currentSession.value = session
    return session
  }

  function completeStep(stepType: string, score: number, stars: number) {
    if (!currentSession.value) return

    const result: StepResult = {
      step: currentSession.value.currentStep,
      stepType,
      score,
      stars,
      completed: true,
      timestamp: Date.now(),
    }
    currentSession.value.stepResults.push(result)
    currentSession.value.currentStep++
  }

  function finishSession(): { totalStars: number; totalScore: number; duration: number } | null {
    if (!currentSession.value) return null

    const session = currentSession.value
    session.status = 'completed'

    const totalStars = session.stepResults.reduce((sum, r) => sum + r.stars, 0)
    const totalScore = session.stepResults.reduce((sum, r) => sum + r.score, 0) / session.stepResults.length
    const duration = Math.round((Date.now() - session.startTime) / 1000)

    completeNode(session.moduleId, session.itemId, totalStars)

    userStore.addLearningRecord({
      module: session.moduleId,
      topic: session.itemId,
      action: 'learn',
      score: Math.round(totalScore),
      starsEarned: totalStars,
      duration,
    })

    currentSession.value = null
    return { totalStars, totalScore, duration }
  }

  function abandonSession() {
    if (!currentSession.value) return
    const node = getNode(currentSession.value.moduleId, currentSession.value.itemId)
    if (node && node.status === 'learning') {
      node.status = 'available'
      saveToStorage()
    }
    currentSession.value = null
  }

  function setCompanion(message: string, emotion: 'happy' | 'encourage' | 'think' | 'celebrate' = 'happy') {
    companionMessage.value = message
    companionEmotion.value = emotion
  }

  function resetModulePath(moduleId: string) {
    pathNodes.value = pathNodes.value.filter(n => n.moduleId !== moduleId)
    saveToStorage()
  }

  loadFromStorage()

  return {
    pathNodes,
    currentSession,
    companionMessage,
    companionEmotion,
    completedCount,
    totalNodes,
    overallProgress,
    initModulePath,
    getNode,
    getModuleNodes,
    getModuleProgress,
    completeNode,
    isNodeAccessible,
    startSession,
    completeStep,
    finishSession,
    abandonSession,
    setCompanion,
    resetModulePath,
    saveToStorage,
  }
})
