export interface MathProblem {
  id: string
  type: 'addition' | 'subtraction' | 'counting' | 'comparison' | 'pattern' | 'classification' | 'clock' | 'money' | 'sequence'
  level: number
  question: string
  answer: number
  options: number[]
  visualAid: string
  hint: string
}

export interface MathLevel {
  id: string
  name: string
  description: string
  icon: string
  level: number
  color: string
}

export const mathLevels: MathLevel[] = [
  { id: 'ml1', name: '数一数', description: '认识1-10的数字', icon: '🔢', level: 1, color: '#FF9F43' },
  { id: 'ml2', name: '加法入门', description: '5以内加法', icon: '➕', level: 2, color: '#54A0FF' },
  { id: 'ml3', name: '减法入门', description: '5以内减法', icon: '➖', level: 3, color: '#FF6B6B' },
  { id: 'ml4', name: '加法进阶', description: '10以内加法', icon: '💪', level: 4, color: '#2ED573' },
  { id: 'ml5', name: '减法进阶', description: '10以内减法', icon: '🎯', level: 5, color: '#A55EEA' },
  { id: 'ml6', name: '大数挑战', description: '20以内加减法', icon: '🏆', level: 6, color: '#FF6348' },
  { id: 'ml7', name: '比较大小', description: '比较数字大小，认识>、<、=符号', icon: '⚖️', level: 7, color: '#FF9FF3' },
  { id: 'ml8', name: '找规律', description: '发现数字排列的规律', icon: '🔍', level: 8, color: '#48DBFB' },
  { id: 'ml9', name: '认识时钟', description: '学会看整点和半点', icon: '🕐', level: 9, color: '#FECA57' },
  { id: 'ml10', name: '认识人民币', description: '认识元角分', icon: '💰', level: 10, color: '#FF9F43' },
  { id: 'ml11', name: '分类归类', description: '按特征分类物品', icon: '📦', level: 11, color: '#55E6C1' },
  { id: 'ml12', name: '数的组成', description: '20以内数的分解与组成', icon: '🧩', level: 12, color: '#778BEB' },
]

function generateAddition(maxSum: number): MathProblem {
  const a = Math.floor(Math.random() * maxSum)
  const b = Math.floor(Math.random() * (maxSum - a))
  const answer = a + b
  const options = generateOptions(answer, 4)
  return {
    id: `add-${Date.now()}-${Math.random()}`,
    type: 'addition',
    level: maxSum <= 5 ? 2 : maxSum <= 10 ? 4 : 6,
    question: `${a} + ${b} = ?`,
    answer,
    options,
    visualAid: `${a}个🍎 + ${b}个🍎`,
    hint: `数一数：先数${a}个，再数${b}个，合在一起是多少？`,
  }
}

function generateSubtraction(maxMinuend: number): MathProblem {
  const a = Math.floor(Math.random() * maxMinuend) + 1
  const b = Math.floor(Math.random() * a)
  const answer = a - b
  const options = generateOptions(answer, 4)
  return {
    id: `sub-${Date.now()}-${Math.random()}`,
    type: 'subtraction',
    level: maxMinuend <= 5 ? 3 : maxMinuend <= 10 ? 5 : 6,
    question: `${a} - ${b} = ?`,
    answer,
    options,
    visualAid: `${a}个🍎，拿走${b}个`,
    hint: `数一数：有${a}个，拿走${b}个，还剩多少？`,
  }
}

function generateOptions(correct: number, count: number): number[] {
  const options = new Set<number>()
  options.add(correct)
  while (options.size < count) {
    const offset = Math.floor(Math.random() * 5) - 2
    const opt = correct + offset
    if (opt >= 0 && opt !== correct) {
      options.add(opt)
    }
  }
  if (options.size < count) {
    for (let i = 0; options.size < count; i++) {
      if (!options.has(i) && i >= 0) options.add(i)
    }
  }
  return Array.from(options).sort(() => Math.random() - 0.5)
}

function generateIndexOptions(count: number): number[] {
  const indices = Array.from({ length: count }, (_, i) => i + 1)
  return indices.sort(() => Math.random() - 0.5)
}

function generateComparison(): MathProblem {
  const a = Math.floor(Math.random() * 19) + 1
  const b = Math.floor(Math.random() * 19) + 1
  let answer: number
  let symbol: string
  if (a > b) {
    answer = 1
    symbol = '>'
  } else if (a < b) {
    answer = 2
    symbol = '<'
  } else {
    answer = 3
    symbol = '='
  }
  return {
    id: `cmp-${Date.now()}-${Math.random()}`,
    type: 'comparison',
    level: 7,
    question: `${a} ○ ${b}，○里应该填什么？\n1. >  2. <  3. =`,
    answer,
    options: generateIndexOptions(3),
    visualAid: `${a}个🍎  vs  ${b}个🍎`,
    hint: `左边有${a}个，右边有${b}个，哪边多就填>，哪边少就填<，一样多就填=`,
  }
}

function generatePattern(): MathProblem {
  const step = [1, 2, 3, 5][Math.floor(Math.random() * 4)]
  const start = Math.floor(Math.random() * 5) + 1
  const missingIndex = Math.floor(Math.random() * 3) + 1
  const sequence: number[] = []
  for (let i = 0; i < 5; i++) {
    sequence.push(start + step * i)
  }
  const answer = sequence[missingIndex]
  const display = sequence.map((n, i) => (i === missingIndex ? '?' : String(n))).join(', ')
  return {
    id: `pat-${Date.now()}-${Math.random()}`,
    type: 'pattern',
    level: 8,
    question: `找规律：${display}`,
    answer,
    options: generateOptions(answer, 4),
    visualAid: `每次增加${step}`,
    hint: `看看相邻两个数之间差多少，找出规律`,
  }
}

function generateClock(): MathProblem {
  const isHalf = Math.random() > 0.5
  const hour = Math.floor(Math.random() * 12) + 1
  let answer: number
  let question: string
  let hint: string
  if (isHalf) {
    answer = hour
    question = `时针指向${hour}和${hour < 12 ? hour + 1 : 1}之间，分针指向6，是几点半？`
    hint = `分针指向6就是半点，时针在${hour}和${hour < 12 ? hour + 1 : 1}之间就是${hour}点半`
  } else {
    answer = hour
    question = `时针指向${hour}，分针指向12，是几点？`
    hint = `分针指向12就是整点，时针指向${hour}就是${hour}点`
  }
  return {
    id: `clk-${Date.now()}-${Math.random()}`,
    type: 'clock',
    level: 9,
    question,
    answer,
    options: generateOptions(hour, 4).map(o => (o < 1 ? o + 12 : o > 12 ? o - 12 : o)),
    visualAid: isHalf ? `🕐 ${hour}:30` : `🕐 ${hour}:00`,
    hint,
  }
}

function generateMoney(): MathProblem {
  const type = Math.floor(Math.random() * 3)
  let question: string
  let answer: number
  let hint: string
  if (type === 0) {
    const yuan = Math.floor(Math.random() * 5) + 1
    answer = yuan * 10
    question = `${yuan}元 = ?角`
    hint = `1元 = 10角，${yuan}元就是${yuan}个10角`
  } else if (type === 1) {
    const jiao = Math.floor(Math.random() * 5) + 1
    answer = jiao * 10
    question = `${jiao}角 = ?分`
    hint = `1角 = 10分，${jiao}角就是${jiao}个10分`
  } else {
    const yuan = Math.floor(Math.random() * 3) + 1
    answer = yuan * 100
    question = `${yuan}元 = ?分`
    hint = `1元 = 100分，${yuan}元就是${yuan}个100分`
  }
  return {
    id: `mny-${Date.now()}-${Math.random()}`,
    type: 'money',
    level: 10,
    question,
    answer,
    options: generateOptions(answer, 4),
    visualAid: `💰 1元=10角=100分`,
    hint,
  }
}

function generateClassification(): MathProblem {
  const categories = [
    {
      name: '水果',
      items: ['苹果', '香蕉', '橘子', '西瓜', '葡萄', '草莓'],
      outsider: ['桌子', '铅笔', '小狗', '汽车', '书本', '椅子'],
    },
    {
      name: '动物',
      items: ['小狗', '小猫', '小鸟', '小鱼', '小兔', '小鸡'],
      outsider: ['苹果', '铅笔', '桌子', '汽车', '书本', '椅子'],
    },
    {
      name: '文具',
      items: ['铅笔', '橡皮', '尺子', '书本', '书包', '彩笔'],
      outsider: ['苹果', '小狗', '桌子', '汽车', '香蕉', '椅子'],
    },
    {
      name: '交通工具',
      items: ['汽车', '火车', '飞机', '轮船', '自行车', '公交车'],
      outsider: ['苹果', '铅笔', '小狗', '桌子', '香蕉', '橡皮'],
    },
  ]
  const cat = categories[Math.floor(Math.random() * categories.length)]
  const shuffledItems = [...cat.items].sort(() => Math.random() - 0.5)
  const outsider = cat.outsider[Math.floor(Math.random() * cat.outsider.length)]
  const correctPosition = Math.floor(Math.random() * 4)
  const choices: string[] = []
  let itemIndex = 0
  for (let i = 0; i < 4; i++) {
    if (i === correctPosition) {
      choices.push(outsider)
    } else {
      choices.push(shuffledItems[itemIndex++])
    }
  }
  const answer = correctPosition + 1
  const questionLines = choices.map((c, i) => `${i + 1}.${c}`).join('  ')
  return {
    id: `cls-${Date.now()}-${Math.random()}`,
    type: 'classification',
    level: 11,
    question: `哪个不是${cat.name}？${questionLines}`,
    answer,
    options: generateIndexOptions(4),
    visualAid: `找出不一样的那个`,
    hint: `看看哪个和其他的不是同一类`,
  }
}

function generateSequence(): MathProblem {
  const type = Math.floor(Math.random() * 2)
  let question: string
  let answer: number
  let hint: string
  if (type === 0) {
    const start = Math.floor(Math.random() * 10) + 1
    const step = Math.floor(Math.random() * 3) + 1
    answer = start + step
    question = `从${start}开始，每次加${step}，下一个是？`
    hint = `${start} + ${step} = ?`
  } else {
    const start = Math.floor(Math.random() * 10) + 5
    const step = Math.floor(Math.random() * Math.min(start - 1, 4)) + 1
    answer = start - step
    question = `从${start}开始，每次减${step}，下一个是？`
    hint = `${start} - ${step} = ?`
  }
  return {
    id: `seq-${Date.now()}-${Math.random()}`,
    type: 'sequence',
    level: 12,
    question,
    answer,
    options: generateOptions(answer, 4),
    visualAid: type === 0 ? `➕每次加` : `➖每次减`,
    hint,
  }
}

export function generateMathProblem(level: number): MathProblem {
  switch (level) {
    case 1: {
      const n = Math.floor(Math.random() * 10) + 1
      const options = generateOptions(n, 4)
      return {
        id: `cnt-${Date.now()}`,
        type: 'counting',
        level: 1,
        question: `数一数有几个🍎？`,
        answer: n,
        options,
        visualAid: '🍎'.repeat(n),
        hint: '一个一个数，看看有几个苹果',
      }
    }
    case 2:
      return generateAddition(5)
    case 3:
      return generateSubtraction(5)
    case 4:
      return generateAddition(10)
    case 5:
      return generateSubtraction(10)
    case 6:
      return Math.random() > 0.5 ? generateAddition(20) : generateSubtraction(20)
    case 7:
      return generateComparison()
    case 8:
      return generatePattern()
    case 9:
      return generateClock()
    case 10:
      return generateMoney()
    case 11:
      return generateClassification()
    case 12:
      return generateSequence()
    default:
      return generateAddition(5)
  }
}

export function generateMathProblems(level: number, count: number): MathProblem[] {
  return Array.from({ length: count }, () => generateMathProblem(level))
}
