/**
 * parser.js - JSONL 解析器与正则配置引擎
 *
 * 核心功能：
 * - 流式解析 SillyTavern JSONL 聊天记录（支持 100MB+ 大文件）
 * - 可配置的正则规则提取（思维链、小总结、用户输入、时间栏等）
 * - 从 SillyTavern 预设文件自动导入正则规则
 * - 配置持久化（localStorage）
 */

// 默认正则配置
export const defaultConfig = {
  userInputPattern: '<本轮用户输入>\\s*([\\s\\S]*?)\\s*</本轮用户输入>',
  recallPattern: '<recall>([\\s\\S]*?)</recall>',
  thinkingPattern: '\\[metacognition\\]([\\s\\S]*?)(?=\\n<content>|$)',
  contentPattern: '<content>([\\s\\S]*?)</content>',
  summaryPattern: '<details>\\s*<summary>\\s*小总结\\s*</summary>([\\s\\S]*?)</details>',
  choicePattern: '<choice>([\\s\\S]*?)</choice>',
  timeBarPattern: '```([^`·]+·[^`]+)```',
  displayRules: []  // 自定义显示替换规则 [{scriptName, findRegex, replaceString, disabled}]
}

/**
 * 使用自定义配置提取内容
 */
export function extractContent(mes, config = defaultConfig) {
  if (!mes) return ''

  let content = mes

  // 提取用户输入
  if (config.userInputPattern) {
    try {
      const regex = new RegExp(config.userInputPattern, 'i')
      const match = content.match(regex)
      if (match && match[1]) {
        content = match[1]
      }
    } catch (e) {
      console.warn('用户输入正则错误:', e)
    }
  }

  // 移除记忆召回标签
  if (config.recallPattern) {
    try {
      const regex = new RegExp(config.recallPattern, 'gi')
      content = content.replace(regex, '')
    } catch (e) {
      console.warn('记忆召回正则错误:', e)
    }
  }

  // 移除思维链
  if (config.thinkingPattern) {
    try {
      const regex = new RegExp(config.thinkingPattern, 'gi')
      content = content.replace(regex, '')
    } catch (e) {
      console.warn('思维链正则错误:', e)
    }
  }

  // 提取正文内容
  if (config.contentPattern) {
    try {
      const regex = new RegExp(config.contentPattern, 'i')
      const match = content.match(regex)
      if (match && match[1]) {
        content = match[1]
      }
    } catch (e) {
      console.warn('正文内容正则错误:', e)
    }
  }

  // 应用自定义显示替换规则
  if (config.displayRules && config.displayRules.length > 0) {
    for (const rule of config.displayRules) {
      if (rule.disabled) continue
      try {
        const regex = parseFindRegex(rule.findRegex)
        if (regex) {
          content = content.replace(regex, rule.replaceString || '')
        }
      } catch (e) {
        console.warn(`显示规则 "${rule.scriptName}" 错误:`, e)
      }
    }
  }

  // 清理常见的系统注入文本
  content = content.replace(/以下是用户的本轮输入[\s\S]*?<\/本轮用户输入>/g, '')

  // 清理多余的空行
  content = content.trim()

  return content
}

/**
 * 解析时间栏
 */
export function parseTimeBar(mes, config = defaultConfig) {
  if (!mes || !config.timeBarPattern) return null
  try {
    const regex = new RegExp(config.timeBarPattern, 'i')
    const match = mes.match(regex)
    return match ? match[1] : null
  } catch (e) {
    console.warn('时间栏正则错误:', e)
    return null
  }
}

/**
 * 解析小总结
 */
export function parseSummary(mes, config = defaultConfig) {
  if (!mes || !config.summaryPattern) return null
  try {
    const regex = new RegExp(config.summaryPattern, 'i')
    const match = mes.match(regex)
    return match ? match[1].trim() : null
  } catch (e) {
    console.warn('小总结正则错误:', e)
    return null
  }
}

/**
 * 解析剧情选项
 */
export function parseChoices(mes, config = defaultConfig) {
  if (!mes || !config.choicePattern) return []
  try {
    const regex = new RegExp(config.choicePattern, 'i')
    const match = mes.match(regex)
    if (!match) return []

    const lines = match[1].trim().split('\n')
    const choices = []

    for (const line of lines) {
      const lineMatch = line.match(/^\s*(.+?)\s*-\s*(.+?)\s*$/)
      if (lineMatch) {
        choices.push({
          text: lineMatch[1].trim(),
          desc: lineMatch[2].trim()
        })
      }
    }

    return choices
  } catch (e) {
    console.warn('剧情选项正则错误:', e)
    return []
  }
}

/**
 * 解析思维链
 */
export function parseThinking(mes, config = defaultConfig) {
  if (!mes || !config.thinkingPattern) return null
  try {
    const regex = new RegExp(config.thinkingPattern, 'i')
    const match = mes.match(regex)
    return match ? match[1].trim() : null
  } catch (e) {
    console.warn('思维链正则错误:', e)
    return null
  }
}

/**
 * 流式解析 JSONL 文件
 */
export async function parseJsonl(file, onProgress, config = defaultConfig) {
  return new Promise((resolve, reject) => {
    const messages = []
    let metadata = null
    const chunkSize = 1024 * 1024 // 1MB chunks
    let leftover = ''
    let processedBytes = 0
    const totalBytes = file.size

    function processChunk(chunk, isLast = false) {
      const text = leftover + chunk
      const lines = text.split('\n')

      if (!isLast) {
        leftover = lines.pop() || ''
      } else {
        leftover = ''
      }

      for (const line of lines) {
        if (!line.trim()) continue

        try {
          const data = JSON.parse(line)

          // 第一行是 metadata
          if (data.chat_metadata) {
            metadata = data
            continue
          }

          // 处理消息
          const msg = {
            name: data.name || 'Unknown',
            is_user: data.is_user || false,
            is_system: data.is_system || false,
            send_date: data.send_date || new Date().toISOString(),
            mes: data.mes || '',
            swipes: data.swipes || [],
            extra: data.extra || {},
            // 解析后的内容
            content: extractContent(data.mes, config),
            timeBar: parseTimeBar(data.mes, config),
            summary: parseSummary(data.mes, config),
            choices: parseChoices(data.mes, config),
            thinking: parseThinking(data.mes, config)
          }

          messages.push(msg)
        } catch (parseError) {
          console.warn('解析行失败:', line.substring(0, 100))
        }
      }
    }

    function readNextChunk(start) {
      const end = Math.min(start + chunkSize, totalBytes)
      const blob = file.slice(start, end)
      const reader = new FileReader()

      reader.onload = (e) => {
        processedBytes = end
        if (onProgress) {
          onProgress(Math.round((end / totalBytes) * 100))
        }

        processChunk(e.target.result, end >= totalBytes)

        if (end < totalBytes) {
          readNextChunk(end)
        } else {
          resolve(messages)
        }
      }

      reader.onerror = () => reject(reader.error)
      reader.readAsText(blob)
    }

    readNextChunk(0)
  })
}

/**
 * 将 SillyTavern 的 findRegex 格式（"/pattern/flags"）解析为 RegExp 对象
 */
function parseFindRegex(findRegex) {
  if (!findRegex) return null

  // SillyTavern 的 findRegex 格式: "/pattern/flags"
  const slashMatch = findRegex.match(/^\/(.+)\/([gimsuy]*)$/s)
  if (slashMatch) {
    return new RegExp(slashMatch[1], slashMatch[2])
  }

  // 如果不是 /pattern/flags 格式，当作普通字符串
  return new RegExp(findRegex, 'g')
}

/**
 * 从 SillyTavern 预设或正则 JSON 中提取正则规则
 * 支持三种来源:
 * 1. 独立正则文件: JSON 数组 [{scriptName, findRegex, ...}]
 * 2. 预设 extensions.regex_scripts[]
 * 3. 预设 extensions.SPreset.RegexBinding.regexes[]
 */
export function parseSillyTavernRegex(jsonData) {
  const rules = []

  // 来源 1: 独立正则文件 (顶层是数组)
  if (Array.isArray(jsonData)) {
    for (const item of jsonData) {
      if (item.findRegex && item.scriptName !== undefined) {
        rules.push(normalizeRule(item))
      }
    }
    return rules
  }

  // 来源 2: 预设 extensions.regex_scripts
  if (jsonData.extensions?.regex_scripts && Array.isArray(jsonData.extensions.regex_scripts)) {
    for (const item of jsonData.extensions.regex_scripts) {
      if (item.findRegex) {
        rules.push(normalizeRule(item))
      }
    }
  }

  // 来源 3: 预设 extensions.SPreset.RegexBinding.regexes  
  if (jsonData.extensions?.SPreset?.RegexBinding?.regexes &&
    Array.isArray(jsonData.extensions.SPreset.RegexBinding.regexes)) {
    for (const item of jsonData.extensions.SPreset.RegexBinding.regexes) {
      if (item.findRegex) {
        const isDuplicate = rules.some(
          r => r.scriptName === item.scriptName && r.findRegex === item.findRegex
        )
        if (!isDuplicate) {
          rules.push(normalizeRule(item))
        }
      }
    }
  }

  // 来源 4: SPreset 的 config 字段（JSON字符串内嵌正则）
  if (jsonData.extensions?.SPreset?.config) {
    try {
      const configStr = jsonData.extensions.SPreset.config
      const configObj = typeof configStr === 'string' ? JSON.parse(configStr) : configStr
      if (configObj.RegexBinding?.regexes && Array.isArray(configObj.RegexBinding.regexes)) {
        for (const item of configObj.RegexBinding.regexes) {
          if (item.findRegex) {
            const isDuplicate = rules.some(
              r => r.scriptName === item.scriptName && r.findRegex === item.findRegex
            )
            if (!isDuplicate) {
              rules.push(normalizeRule(item))
            }
          }
        }
      }
    } catch (e) {
      // config字段解析失败，跳过
    }
  }

  return rules
}

/**
 * 标准化单条正则规则
 */
function normalizeRule(item) {
  return {
    scriptName: item.scriptName || '未命名规则',
    findRegex: item.findRegex || '',
    replaceString: item.replaceString || '',
    disabled: item.disabled || false,
    promptOnly: item.promptOnly || false,
    markdownOnly: item.markdownOnly || false,
    placement: Array.isArray(item.placement) ? item.placement : [],
    minDepth: item.minDepth ?? null,
    maxDepth: item.maxDepth ?? null
  }
}

/**
 * 筛选出显示相关的规则（非 promptOnly，且 placement 包含 2=AI输出）
 */
function filterDisplayRules(rules) {
  return rules.filter(rule => {
    if (rule.promptOnly) return false
    if (rule.disabled) return false
    if (rule.placement.length === 0) return true
    return rule.placement.includes(2)
  })
}

/**
 * 将提取的正则规则转换为查看器的配置
 * 通过 scriptName 关键词匹配自动映射到对应字段
 * 无法匹配的存入 displayRules
 */
export function convertRegexToConfig(rules) {
  const displayRules = filterDisplayRules(rules)

  const fieldMappings = [
    {
      field: 'thinkingPattern',
      keywords: ['思维链', 'think', 'meow', 'metacognition', '内心', '思考', 'cognition', 'inner']
    },
    {
      field: 'summaryPattern',
      keywords: ['小总结', 'summary', '摘要', '总结']
    },
    {
      field: 'userInputPattern',
      keywords: ['用户输入', 'user.?input', '本轮用户']
    },
    {
      field: 'timeBarPattern',
      keywords: ['时间', 'time', 'timebar', '状态栏', '地点']
    },
    {
      field: 'recallPattern',
      keywords: ['recall', '记忆', '召回', '回忆']
    },
    {
      field: 'contentPattern',
      keywords: ['content', '正文', '内容']
    },
    {
      field: 'choicePattern',
      keywords: ['choice', '选项', 'option', '选择']
    }
  ]

  const result = {
    matchedRules: {},
    unmatchedRules: []
  }

  for (const rule of displayRules) {
    const name = (rule.scriptName || '').toLowerCase()
    let wasMatched = false

    for (const mapping of fieldMappings) {
      if (result.matchedRules[mapping.field]) continue

      const isMatch = mapping.keywords.some(keyword => {
        try {
          return new RegExp(keyword, 'i').test(name)
        } catch {
          return name.includes(keyword.toLowerCase())
        }
      })

      if (isMatch) {
        let pattern = ''
        try {
          const slashMatch = rule.findRegex.match(/^\/(.+)\/([gimsuy]*)$/s)
          if (slashMatch) {
            pattern = slashMatch[1]
          } else {
            pattern = rule.findRegex
          }
        } catch {
          pattern = rule.findRegex
        }

        result.matchedRules[mapping.field] = {
          rule,
          pattern
        }
        wasMatched = true
        break
      }
    }

    if (!wasMatched) {
      result.unmatchedRules.push(rule)
    }
  }

  return result
}

/**
 * 将转换结果应用到配置
 */
export function applyRegexToConfig(conversionResult, currentConfig) {
  const newConfig = { ...currentConfig }

  for (const [field, data] of Object.entries(conversionResult.matchedRules)) {
    newConfig[field] = data.pattern
  }

  newConfig.displayRules = conversionResult.unmatchedRules.map(rule => ({
    scriptName: rule.scriptName,
    findRegex: rule.findRegex,
    replaceString: rule.replaceString,
    disabled: false
  }))

  return newConfig
}

/**
 * 从 localStorage 加载配置
 */
export function loadConfig() {
  try {
    const saved = localStorage.getItem('tavern-viewer-config')
    if (saved) {
      return { ...defaultConfig, ...JSON.parse(saved) }
    }
  } catch (e) {
    console.warn('加载配置失败:', e)
  }
  return { ...defaultConfig }
}

/**
 * 保存配置到 localStorage
 */
export function saveConfig(config) {
  try {
    localStorage.setItem('tavern-viewer-config', JSON.stringify(config))
  } catch (e) {
    console.warn('保存配置失败:', e)
  }
}
