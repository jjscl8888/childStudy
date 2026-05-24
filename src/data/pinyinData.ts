export interface PinyinItem {
  id: string
  pinyin: string
  type: 'shengmu' | 'yunmu' | 'zhengti'
  group: string
  example: string
  examplePinyin: string
  emoji: string
  imageUrl: string
}

const img = (prompt: string) =>
  `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=square`

export const pinyinData: PinyinItem[] = [
  { id: 'sm-b', pinyin: 'b', type: 'shengmu', group: '声母第一组', example: '爸爸', examplePinyin: 'bà ba', emoji: '👨', imageUrl: img('cute cartoon dad hugging child warm illustration simple colorful') },
  { id: 'sm-p', pinyin: 'p', type: 'shengmu', group: '声母第一组', example: '跑步', examplePinyin: 'pǎo bù', emoji: '🏃', imageUrl: img('cute cartoon child running colorful illustration') },
  { id: 'sm-m', pinyin: 'm', type: 'shengmu', group: '声母第一组', example: '妈妈', examplePinyin: 'mā ma', emoji: '👩', imageUrl: img('cute cartoon mom with child warm illustration') },
  { id: 'sm-f', pinyin: 'f', type: 'shengmu', group: '声母第一组', example: '飞机', examplePinyin: 'fēi jī', emoji: '✈️', imageUrl: img('cute cartoon airplane flying in blue sky colorful') },
  { id: 'sm-d', pinyin: 'd', type: 'shengmu', group: '声母第二组', example: '大象', examplePinyin: 'dà xiàng', emoji: '🐘', imageUrl: img('cute cartoon elephant colorful children illustration') },
  { id: 'sm-t', pinyin: 't', type: 'shengmu', group: '声母第二组', example: '太阳', examplePinyin: 'tài yáng', emoji: '☀️', imageUrl: img('cute cartoon sun smiling colorful children illustration') },
  { id: 'sm-n', pinyin: 'n', type: 'shengmu', group: '声母第二组', example: '牛奶', examplePinyin: 'niú nǎi', emoji: '🥛', imageUrl: img('cute cartoon glass of milk colorful children illustration') },
  { id: 'sm-l', pinyin: 'l', type: 'shengmu', group: '声母第二组', example: '老虎', examplePinyin: 'lǎo hǔ', emoji: '🐯', imageUrl: img('cute cartoon tiger smiling colorful children illustration') },
  { id: 'sm-g', pinyin: 'g', type: 'shengmu', group: '声母第三组', example: '哥哥', examplePinyin: 'gē ge', emoji: '👦', imageUrl: img('cute cartoon older brother playing colorful illustration') },
  { id: 'sm-k', pinyin: 'k', type: 'shengmu', group: '声母第三组', example: '开心', examplePinyin: 'kāi xīn', emoji: '😊', imageUrl: img('cute cartoon happy child smiling colorful illustration') },
  { id: 'sm-h', pinyin: 'h', type: 'shengmu', group: '声母第三组', example: '花朵', examplePinyin: 'huā duǒ', emoji: '🌸', imageUrl: img('cute cartoon flower colorful children illustration') },
  { id: 'sm-j', pinyin: 'j', type: 'shengmu', group: '声母第四组', example: '橘子', examplePinyin: 'jú zi', emoji: '🍊', imageUrl: img('cute cartoon orange fruit colorful children illustration') },
  { id: 'sm-q', pinyin: 'q', type: 'shengmu', group: '声母第四组', example: '气球', examplePinyin: 'qì qiú', emoji: '🎈', imageUrl: img('cute cartoon colorful balloons children illustration') },
  { id: 'sm-x', pinyin: 'x', type: 'shengmu', group: '声母第四组', example: '西瓜', examplePinyin: 'xī guā', emoji: '🍉', imageUrl: img('cute cartoon watermelon colorful children illustration') },
  { id: 'sm-zh', pinyin: 'zh', type: 'shengmu', group: '声母第五组', example: '蜘蛛', examplePinyin: 'zhī zhū', emoji: '🕷️', imageUrl: img('cute cartoon spider on web colorful children illustration') },
  { id: 'sm-ch', pinyin: 'ch', type: 'shengmu', group: '声母第五组', example: '虫子', examplePinyin: 'chóng zi', emoji: '🐛', imageUrl: img('cute cartoon caterpillar bug colorful children illustration') },
  { id: 'sm-sh', pinyin: 'sh', type: 'shengmu', group: '声母第五组', example: '书本', examplePinyin: 'shū běn', emoji: '📚', imageUrl: img('cute cartoon book reading colorful children illustration') },
  { id: 'sm-r', pinyin: 'r', type: 'shengmu', group: '声母第五组', example: '日出', examplePinyin: 'rì chū', emoji: '🌅', imageUrl: img('cute cartoon sunrise colorful children illustration') },
  { id: 'sm-z', pinyin: 'z', type: 'shengmu', group: '声母第六组', example: '自己', examplePinyin: 'zì jǐ', emoji: '🙋', imageUrl: img('cute cartoon child pointing to self colorful illustration') },
  { id: 'sm-c', pinyin: 'c', type: 'shengmu', group: '声母第六组', example: '草地', examplePinyin: 'cǎo dì', emoji: '🌿', imageUrl: img('cute cartoon green grass field colorful children illustration') },
  { id: 'sm-s', pinyin: 's', type: 'shengmu', group: '声母第六组', example: '森林', examplePinyin: 'sēn lín', emoji: '🌲', imageUrl: img('cute cartoon forest trees colorful children illustration') },
  { id: 'sm-y', pinyin: 'y', type: 'shengmu', group: '声母第七组', example: '月亮', examplePinyin: 'yuè liang', emoji: '🌙', imageUrl: img('cute cartoon moon night sky colorful children illustration') },
  { id: 'sm-w', pinyin: 'w', type: 'shengmu', group: '声母第七组', example: '蜗牛', examplePinyin: 'wō niú', emoji: '🐌', imageUrl: img('cute cartoon snail colorful children illustration') },

  { id: 'ym-a', pinyin: 'a', type: 'yunmu', group: '单韵母', example: '阿姨', examplePinyin: 'ā yí', emoji: '👩', imageUrl: img('cute cartoon auntie waving colorful children illustration') },
  { id: 'ym-o', pinyin: 'o', type: 'yunmu', group: '单韵母', example: '哦', examplePinyin: 'ó', emoji: '😮', imageUrl: img('cute cartoon child saying oh surprised colorful illustration') },
  { id: 'ym-e', pinyin: 'e', type: 'yunmu', group: '单韵母', example: '鹅', examplePinyin: 'é', emoji: '🪿', imageUrl: img('cute cartoon goose colorful children illustration') },
  { id: 'ym-i', pinyin: 'i', type: 'yunmu', group: '单韵母', example: '衣服', examplePinyin: 'yī fu', emoji: '👕', imageUrl: img('cute cartoon clothes shirt colorful children illustration') },
  { id: 'ym-u', pinyin: 'u', type: 'yunmu', group: '单韵母', example: '乌鸦', examplePinyin: 'wū yā', emoji: '🐦‍⬛', imageUrl: img('cute cartoon crow bird colorful children illustration') },
  { id: 'ym-v', pinyin: 'ü', type: 'yunmu', group: '单韵母', example: '鱼', examplePinyin: 'yú', emoji: '🐟', imageUrl: img('cute cartoon fish colorful children illustration') },
  { id: 'ym-ai', pinyin: 'ai', type: 'yunmu', group: '复韵母', example: '爱心', examplePinyin: 'ài xīn', emoji: '❤️', imageUrl: img('cute cartoon heart love colorful children illustration') },
  { id: 'ym-ei', pinyin: 'ei', type: 'yunmu', group: '复韵母', example: '杯子', examplePinyin: 'bēi zi', emoji: '🥤', imageUrl: img('cute cartoon cup mug colorful children illustration') },
  { id: 'ym-ao', pinyin: 'ao', type: 'yunmu', group: '复韵母', example: '蛋糕', examplePinyin: 'dàn gāo', emoji: '🎂', imageUrl: img('cute cartoon birthday cake colorful children illustration') },
  { id: 'ym-ou', pinyin: 'ou', type: 'yunmu', group: '复韵母', example: '猴子', examplePinyin: 'hóu zi', emoji: '🐵', imageUrl: img('cute cartoon monkey banana colorful children illustration') },
  { id: 'ym-iu', pinyin: 'iu', type: 'yunmu', group: '复韵母', example: '牛奶', examplePinyin: 'niú nǎi', emoji: '🥛', imageUrl: img('cute cartoon cow milk colorful children illustration') },
  { id: 'ym-ie', pinyin: 'ie', type: 'yunmu', group: '复韵母', example: '爷爷', examplePinyin: 'yé ye', emoji: '👴', imageUrl: img('cute cartoon grandpa smiling colorful children illustration') },
  { id: 'ym-ue', pinyin: 'üe', type: 'yunmu', group: '复韵母', example: '月亮', examplePinyin: 'yuè liang', emoji: '🌙', imageUrl: img('cute cartoon crescent moon colorful children illustration') },
  { id: 'ym-er', pinyin: 'er', type: 'yunmu', group: '复韵母', example: '耳朵', examplePinyin: 'ěr duo', emoji: '👂', imageUrl: img('cute cartoon ear listening colorful children illustration') },
  { id: 'ym-an', pinyin: 'an', type: 'yunmu', group: '前鼻韵母', example: '安静', examplePinyin: 'ān jìng', emoji: '🤫', imageUrl: img('cute cartoon quiet library colorful children illustration') },
  { id: 'ym-en', pinyin: 'en', type: 'yunmu', group: '前鼻韵母', example: '门', examplePinyin: 'mén', emoji: '🚪', imageUrl: img('cute cartoon door gate colorful children illustration') },
  { id: 'ym-in', pinyin: 'in', type: 'yunmu', group: '前鼻韵母', example: '森林', examplePinyin: 'sēn lín', emoji: '🌲', imageUrl: img('cute cartoon forest pine trees colorful children illustration') },
  { id: 'ym-un', pinyin: 'un', type: 'yunmu', group: '前鼻韵母', example: '云朵', examplePinyin: 'yún duǒ', emoji: '☁️', imageUrl: img('cute cartoon white clouds sky colorful children illustration') },
  { id: 'ym-vn', pinyin: 'ün', type: 'yunmu', group: '前鼻韵母', example: '白云', examplePinyin: 'bái yún', emoji: '🌤️', imageUrl: img('cute cartoon white cloud sun blue sky colorful children illustration') },
  { id: 'ym-ang', pinyin: 'ang', type: 'yunmu', group: '后鼻韵母', example: '太阳', examplePinyin: 'tài yáng', emoji: '☀️', imageUrl: img('cute cartoon bright sun colorful children illustration') },
  { id: 'ym-eng', pinyin: 'eng', type: 'yunmu', group: '后鼻韵母', example: '风筝', examplePinyin: 'fēng zheng', emoji: '🪁', imageUrl: img('cute cartoon kite flying colorful children illustration') },
  { id: 'ym-ing', pinyin: 'ing', type: 'yunmu', group: '后鼻韵母', example: '星星', examplePinyin: 'xīng xing', emoji: '⭐', imageUrl: img('cute cartoon stars night sky colorful children illustration') },
  { id: 'ym-ong', pinyin: 'ong', type: 'yunmu', group: '后鼻韵母', example: '天空', examplePinyin: 'tiān kōng', emoji: '🌌', imageUrl: img('cute cartoon sky clouds colorful children illustration') },

  { id: 'zt-zhi', pinyin: 'zhi', type: 'zhengti', group: '整体认读', example: '知道', examplePinyin: 'zhī dào', emoji: '💡', imageUrl: img('cute cartoon child thinking knowing colorful illustration') },
  { id: 'zt-chi', pinyin: 'chi', type: 'zhengti', group: '整体认读', example: '吃饭', examplePinyin: 'chī fàn', emoji: '🍚', imageUrl: img('cute cartoon child eating rice colorful illustration') },
  { id: 'zt-shi', pinyin: 'shi', type: 'zhengti', group: '整体认读', example: '狮子', examplePinyin: 'shī zi', emoji: '🦁', imageUrl: img('cute cartoon lion colorful children illustration') },
  { id: 'zt-ri', pinyin: 'ri', type: 'zhengti', group: '整体认读', example: '日历', examplePinyin: 'rì lì', emoji: '📅', imageUrl: img('cute cartoon calendar colorful children illustration') },
  { id: 'zt-zi', pinyin: 'zi', type: 'zhengti', group: '整体认读', example: '自己', examplePinyin: 'zì jǐ', emoji: '🙋', imageUrl: img('cute cartoon child pointing to self colorful illustration') },
  { id: 'zt-ci', pinyin: 'ci', type: 'zhengti', group: '整体认读', example: '刺猬', examplePinyin: 'cì wei', emoji: '🦔', imageUrl: img('cute cartoon hedgehog colorful children illustration') },
  { id: 'zt-si', pinyin: 'si', type: 'zhengti', group: '整体认读', example: '四季', examplePinyin: 'sì jì', emoji: '🍂', imageUrl: img('cute cartoon four seasons tree colorful children illustration') },
  { id: 'zt-yi', pinyin: 'yi', type: 'zhengti', group: '整体认读', example: '一', examplePinyin: 'yī', emoji: '1️⃣', imageUrl: img('cute cartoon number one colorful children illustration') },
  { id: 'zt-wu', pinyin: 'wu', type: 'zhengti', group: '整体认读', example: '五', examplePinyin: 'wǔ', emoji: '5️⃣', imageUrl: img('cute cartoon number five colorful children illustration') },
  { id: 'zt-yu', pinyin: 'yu', type: 'zhengti', group: '整体认读', example: '雨', examplePinyin: 'yǔ', emoji: '🌧️', imageUrl: img('cute cartoon rain raindrops colorful children illustration') },
  { id: 'zt-ye', pinyin: 'ye', type: 'zhengti', group: '整体认读', example: '叶子', examplePinyin: 'yè zi', emoji: '🍃', imageUrl: img('cute cartoon green leaf colorful children illustration') },
  { id: 'zt-yue', pinyin: 'yue', type: 'zhengti', group: '整体认读', example: '月亮', examplePinyin: 'yuè liang', emoji: '🌙', imageUrl: img('cute cartoon full moon night colorful children illustration') },
  { id: 'zt-yuan', pinyin: 'yuan', type: 'zhengti', group: '整体认读', example: '圆圈', examplePinyin: 'yuán quān', emoji: '⭕', imageUrl: img('cute cartoon circle shape colorful children illustration') },
  { id: 'zt-yin', pinyin: 'yin', type: 'zhengti', group: '整体认读', example: '音乐', examplePinyin: 'yīn yuè', emoji: '🎵', imageUrl: img('cute cartoon music notes colorful children illustration') },
  { id: 'zt-yun', pinyin: 'yun', type: 'zhengti', group: '整体认读', example: '白云', examplePinyin: 'bái yún', emoji: '☁️', imageUrl: img('cute cartoon white fluffy cloud colorful children illustration') },
  { id: 'zt-ying', pinyin: 'ying', type: 'zhengti', group: '整体认读', example: '老鹰', examplePinyin: 'lǎo yīng', emoji: '🦅', imageUrl: img('cute cartoon eagle flying colorful children illustration') },
]
