/**
 * i18n.js - 国际化模块
 *
 * 支持语言：中文 (zh)、英文 (en)、日文 (ja)
 * 语言偏好自动持久化到 localStorage
 */
import { ref } from 'vue'

// 当前语言
export const currentLang = ref(localStorage.getItem('appLang') || 'zh')

export function setLang(lang) {
    currentLang.value = lang
    localStorage.setItem('appLang', lang)
}

export function toggleLang() {
    const langs = ['zh', 'en', 'ja']
    const idx = langs.indexOf(currentLang.value)
    const next = langs[(idx + 1) % langs.length]
    setLang(next)
}

const dict = {
    zh: {
        appTitle: '📚 酒馆查看器',
        importBtn: '📁 导入',
        searchBtn: '🔍 搜索',
        configBtn: '⚙️ 配置',
        exportMD: '💾 导出 MD',
        exportJSON: '📤 导出 JSON',
        langBtn: '🌐 语言',
        more: '更多',
        viewSettings: '视图设置',
        panelCharacter: '角色列表',
        panelInfo: '信息面板',
        panelChapter: '章节导航',
        statusOpened: '已展开',
        statusCollapsed: '已收起',
        statusOpenable: '可打开',
        resetLayout: '重置布局',

        // 状态
        user: '用户',
        ai: 'AI',
        thinking: '🧠 思维链',
        summary: '📜 小总结',
        choice: '🎲 选项',

        // 面板
        floor: '楼层',
        role: '角色',
        editMsg: '✏️ 编辑消息',
        save: '保存',
        cancel: '取消',

        // 统计
        statsTotal: '总对话数',
        statsUser: '用户消息',
        statsAI: 'AI 消息',
        statsChars: '总字符数',
        statsAvg: '平均回复',
        contentAI: 'AI正文',
        contentUser: '用户正文',

        searchTitle: '🔍 搜索与替换',
        searchPlace: '搜索内容...',
        replacePlace: '替换为...',
        search: '搜索',
        replace: '替换',

        // 配置项
        tabImport: '导入预设',
        tabRules: '正则规则',
        tabDisplay: '显示规则',
        presetTitle: 'Built-in Presets',
        toolsTitle: '🛠️ 工具',
        importConfig: '📥 导入配置文件',
        exportConfig: '📤 导出配置',
        resetConfig: '🔄 重置默认',

        modeTag: '🏷️ 标签模式',
        modeRegex: '🔧 正则模式',
        hintTag: '只需填写包裹内容的开始标签和结束标签，系统自动提取中间的内容。留空则跳过。',
        hintRegex: '使用捕获组 () 提取内容。留空则跳过该规则。',
        userInputPattern: '用户输入',
        userInputDesc: '提取用户实际输入内容',
        recallPattern: '记忆召回',
        recallDesc: '提取召回的记忆编码',
        thinkingPattern: '思维链',
        thinkingDesc: '提取AI思考过程',
        contentPattern: '正文内容',
        contentDesc: '提取正文（可选标签）',
        summaryPattern: '小总结',
        summaryDesc: '提取剧情总结',
        choicePattern: '剧情选项',
        choiceDesc: '提取选项列表',
        timeBarPattern: '时间栏',
        timeBarDesc: '提取时间地点信息',

        displayRulesTitle: '🧹 自定义显示规则',
        displayRulesHint: '这些规则用于替换或隐藏源文本中的特定模式，在加载文件时将自动应用。',
        ruleEnabled: '启用',
        ruleDisabled: '禁用',
        ruleTarget: '目标内容',
        ruleReplace: '替换为',
        deleteRule: '删除',
        emptyRules: '暂无自定义显示规则',
        applyImport: '应用并替换现有配置',

        // 服务器模式
        serverMode: '服务器模式',
        characterList: '角色列表',
        searchCharacter: '搜索角色...',
        selectChat: '选择一个聊天记录',
        selectChatHint: '从左侧角色列表中选择要查看的聊天记录',
        noCharacters: '未找到聊天记录',
        noCharactersHint: '请确认数据目录已正确映射',
        refresh: '刷新',
        loading: '加载中...',
        retry: '重试',
        messages: '条消息',
        characters: '个角色',
        totalChats: '条聊天',
        searchPlace: '搜索内容...'
    },
    en: {
        appTitle: '📚 Tavern Viewer',
        importBtn: '📁 Import',
        searchBtn: '🔍 Search',
        configBtn: '⚙️ Config',
        exportMD: '💾 Export MD',
        exportJSON: '📤 Export JSON',
        langBtn: '🌐 Lang',
        more: 'More',
        viewSettings: 'View Settings',
        panelCharacter: 'Character List',
        panelInfo: 'Info Panel',
        panelChapter: 'Chapter Panel',
        statusOpened: 'Expanded',
        statusCollapsed: 'Collapsed',
        statusOpenable: 'Available',
        resetLayout: 'Reset Layout',

        user: 'User',
        ai: 'AI',
        thinking: '🧠 Thinking',
        summary: '📜 Summary',
        choice: '🎲 Choices',

        floor: 'Floor',
        role: 'Role',
        editMsg: '✏️ Edit Message',
        save: 'Save',
        cancel: 'Cancel',

        statsTotal: 'Total Msgs',
        statsUser: 'User Msgs',
        statsAI: 'AI Msgs',
        statsChars: 'Total Chars',
        statsAvg: 'Avg Length',
        contentAI: 'AI Content',
        contentUser: 'User Content',

        searchTitle: '🔍 Search & Replace',
        searchPlace: 'Search...',
        replacePlace: 'Replace with...',
        search: 'Search',
        replace: 'Replace',

        // Config
        tabImport: 'Import Preset',
        tabRules: 'Extraction Rules',
        tabDisplay: 'Display Rules',
        presetTitle: 'Built-in Presets',
        toolsTitle: '🛠️ Tools',
        importConfig: '📥 Import Config',
        exportConfig: '📤 Export Config',
        resetConfig: '🔄 Reset to Default',

        modeTag: '🏷️ Tag Mode',
        modeRegex: '🔧 Regex Mode',
        hintTag: 'Fill in the opening and closing tags. System will extract the content between them. Leave empty to skip.',
        hintRegex: 'Use capture group () to extract content. Leave empty to skip.',
        userInputPattern: 'User Input',
        userInputDesc: 'Extract actual user input',
        recallPattern: 'Memory Recall',
        recallDesc: 'Extract injected recall string',
        thinkingPattern: 'Thinking',
        thinkingDesc: 'Extract AI thinking process',
        contentPattern: 'Main Content',
        contentDesc: 'Extract character content',
        summaryPattern: 'Summary',
        summaryDesc: 'Extract story summary',
        choicePattern: 'Choices',
        choiceDesc: 'Extract roleplay choices',
        timeBarPattern: 'Time Bar',
        timeBarDesc: 'Extract timestamp format',

        displayRulesTitle: '🧹 Custom Display Rules',
        displayRulesHint: 'These rules are used to replace or hide specific text patterns, running automatically when loading.',
        ruleEnabled: 'Enabled',
        ruleDisabled: 'Disabled',
        ruleTarget: 'Target Regex',
        ruleReplace: 'Replace With',
        deleteRule: 'Delete',
        emptyRules: 'No custom display rules yet',
        applyImport: 'Apply and Overwrite Config',

        // Server mode
        serverMode: 'Server Mode',
        characterList: 'Characters',
        searchCharacter: 'Search characters...',
        selectChat: 'Select a Chat',
        selectChatHint: 'Choose a chat from the character list on the left',
        noCharacters: 'No chat logs found',
        noCharactersHint: 'Make sure the data directory is correctly mapped',
        refresh: 'Refresh',
        loading: 'Loading...',
        retry: 'Retry',
        messages: 'messages',
        characters: 'characters',
        totalChats: 'chats',
        searchPlace: 'Search...'
    },
    ja: {
        appTitle: '📚 酒場ビューア',
        importBtn: '📁 インポート',
        searchBtn: '🔍 検索',
        configBtn: '⚙️ 設定',
        exportMD: '💾 MD出力',
        exportJSON: '📤 JSON出力',
        langBtn: '🌐 言語',
        more: 'その他',
        viewSettings: '表示設定',
        panelCharacter: 'キャラ一覧',
        panelInfo: '情報パネル',
        panelChapter: '章ナビ',
        statusOpened: '展開中',
        statusCollapsed: '折りたたみ',
        statusOpenable: '開ける',
        resetLayout: 'レイアウトをリセット',

        user: 'ユーザー',
        ai: 'AI',
        thinking: '🧠 思考プロセス',
        summary: '📜 サマリー',
        choice: '🎲 選択肢',

        floor: '階層',
        role: 'ロール',
        editMsg: '✏️ メッセージ編集',
        save: '保存',
        cancel: 'キャンセル',

        statsTotal: '総会話数',
        statsUser: 'ユーザー発言',
        statsAI: 'AI発言',
        statsChars: '総文字数',
        statsAvg: '平均文字数',
        contentAI: 'AI本文',
        contentUser: 'ユーザー本文',

        searchTitle: '🔍 検索と置換',
        searchPlace: '検索内容...',
        replacePlace: '置換内容...',
        search: '検索',
        replace: '置換',

        // 設定
        tabImport: 'プリセット導入',
        tabRules: '抽出ルール',
        tabDisplay: '表示ルール',
        presetTitle: '組み込みプリセット',
        toolsTitle: '🛠️ ツール',
        importConfig: '📥 設定インポート',
        exportConfig: '📤 設定エクスポート',
        resetConfig: '🔄 デフォルトに戻す',

        modeTag: '🏷️ タグモード',
        modeRegex: '🔧 正規表現モード',
        hintTag: '開始タグと終了タグを入力するだけです。システムが中身を自動抽出します。空白でスキップ。',
        hintRegex: '捕獲グループ () を使って内容を抽出します。空白でスキップ。',
        userInputPattern: 'ユーザー入力',
        userInputDesc: '実際のユーザー入力を抽出',
        recallPattern: '記憶の呼び出し',
        recallDesc: '呼び出し文を抽出',
        thinkingPattern: '思考プロセス',
        thinkingDesc: 'AIの思考過程を抽出',
        contentPattern: '本文内容',
        contentDesc: 'セリフなどを抽出',
        summaryPattern: 'サマリー',
        summaryDesc: 'ストーリーの要約を抽出',
        choicePattern: '選択肢',
        choiceDesc: '選択肢リストを抽出',
        timeBarPattern: 'タイムバー',
        timeBarDesc: '時間・場所情報を抽出',

        displayRulesTitle: '🧹 カスタム表示ルール',
        displayRulesHint: 'これらのルールは、文中の特定のパターンを置き換えたり隠したりするために自動適用されます。',
        ruleEnabled: '有効',
        ruleDisabled: '無効',
        ruleTarget: '対象の内容',
        ruleReplace: '置換後',
        deleteRule: '削除',
        emptyRules: 'カスタム表示ルールはありません',
        applyImport: '適用して設定を上書きする',

        // サーバーモード
        serverMode: 'サーバーモード',
        characterList: 'キャラクター一覧',
        searchCharacter: 'キャラ検索...',
        selectChat: 'チャットを選択',
        selectChatHint: '左側のキャラクターリストから選択してください',
        noCharacters: 'チャットログが見つかりません',
        noCharactersHint: 'データディレクトリが正しくマッピングされているか確認してください',
        refresh: '更新',
        loading: '読み込み中...',
        retry: 'リトライ',
        messages: '件',
        characters: 'キャラ',
        totalChats: 'チャット',
        searchPlace: '検索...'
    }
}

export function t(key) {
    return dict[currentLang.value]?.[key] || dict['zh'][key] || key
}
