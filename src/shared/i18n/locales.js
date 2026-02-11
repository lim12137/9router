// English translations
export const en = {
  // Common
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    loading: "Loading...",
    success: "Success",
    error: "Error",
    confirm: "Confirm",
    close: "Close",
    copy: "Copy",
    copied: "Copied!",
    test: "Test",
    enabled: "Enabled",
    disabled: "Disabled",
    active: "Active",
    inactive: "Inactive",
    name: "Name",
    description: "Description",
    actions: "Actions",
  },

  // Navigation
  nav: {
    dashboard: "Dashboard",
    providers: "Providers",
    combos: "Combos",
    usage: "Usage",
    cliTools: "CLI Tools",
    settings: "Settings",
    logout: "Logout",
  },

  // Dashboard/Endpoint
  endpoint: {
    title: "Endpoint",
    description: "API endpoint configuration",
    localMode: "Local Mode",
    runningOnMachine: "Running on your machine",
    dataStoredLocally: "All data is stored locally in {path} file.",
    apiKey: "API Key",
    copyKey: "Copy Key",
    addKey: "Add Key",
    keyName: "Key Name",
    createKey: "Create Key",
    deleteKey: "Delete Key",
    noKeys: "No API keys yet. Create one to get started.",
  },

  // Providers
  providers: {
    title: "Providers",
    description: "Manage your AI provider connections",
    addProvider: "Add Provider",
    oauthProviders: "OAuth Providers",
    apiKeyProviders: "API Key Providers",
    compatibleNodes: "Compatible Nodes",
    connect: "Connect",
    connected: "Connected",
    disconnect: "Disconnect",
    testConnection: "Test Connection",
    connectionStatus: "Connection Status",
    accounts: "Accounts",
    addAccount: "Add Account",
    priority: "Priority",
    active: "Active",
    testStatus: {
      untested: "Not tested",
      testing: "Testing...",
      success: "Connected",
      failed: "Failed",
    },
  },

  // Combos
  combos: {
    title: "Combos",
    description: "Model combos with fallback",
    createCombo: "Create Combo",
    editCombo: "Edit Combo",
    comboName: "Combo Name",
    models: "Models",
    addModel: "Add Model",
    removeModel: "Remove",
    noCombos: "No combos yet. Create one to get started.",
    dragToReorder: "Drag to reorder models",
    fallbackOn: "Fallback on",
  },

  // Usage
  usage: {
    title: "Usage & Analytics",
    description: "Monitor your API usage, token consumption, and request logs",
    today: "Today",
    week: "This Week",
    month: "This Month",
    totalTokens: "Total Tokens",
    totalCost: "Total Cost",
    requestCount: "Requests",
    byProvider: "By Provider",
    byModel: "By Model",
    requestLogs: "Request Logs",
    noLogs: "No request logs yet.",
    filterByProvider: "Filter by provider",
    filterByModel: "Filter by model",
  },

  // CLI Tools
  cliTools: {
    title: "CLI Tools",
    description: "Configure CLI tools",
    applySettings: "Apply Settings",
    settingsApplied: "Settings applied successfully!",
    selectModel: "Select Model",
  },

  // Settings
  settings: {
    title: "Settings",
    description: "Manage your preferences",

    // Security
    security: "Security",
    requireLogin: "Require login",
    requireLoginDesc: "When ON, dashboard requires password. When OFF, access without login.",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    updatePassword: "Update Password",
    setPassword: "Set Password",
    passwordMatch: "Passwords do not match",
    passwordUpdated: "Password updated successfully",
    passwordUpdateFailed: "Failed to update password",

    // Routing
    routing: "Routing Strategy",
    roundRobin: "Round Robin",
    roundRobinDesc: "Cycle through accounts to distribute load",
    stickyLimit: "Sticky Limit",
    stickyLimitDesc: "Calls per account before switching",
    fillFirst: "Fill First",
    fillFirstDesc: "Use accounts in priority order",

    // Proxy (New)
    proxy: "Proxy Settings",
    proxyDesc: "Configure outbound proxy for API requests",
    httpProxy: "HTTP Proxy",
    httpsProxy: "HTTPS Proxy",
    allProxy: "All Proxy (HTTP/HTTPS/SOCKS)",
    noProxy: "No Proxy",
    httpProxyPlaceholder: "http://proxy.example.com:8080",
    httpsProxyPlaceholder: "https://proxy.example.com:8080",
    allProxyPlaceholder: "socks5://proxy.example.com:1080",
    noProxyPlaceholder: "localhost,127.0.0.1,*.local",
    noProxyDesc: "Comma-separated list of hosts to bypass proxy",
    testProxy: "Test Proxy",
    proxyTestSuccess: "Proxy connection successful!",
    proxyTestFailed: "Proxy connection failed: {error}",
    proxyEnabled: "Proxy enabled",
    proxyDisabled: "Proxy disabled",

    // Appearance
    appearance: "Appearance",
    darkMode: "Dark Mode",
    darkModeDesc: "Switch between light and dark themes",
    language: "Language",
    languageDesc: "Select your preferred language",

    // Data
    data: "Data",
    databaseLocation: "Database Location",
    databasePath: "~/.9router/db.json",

    // Observability
    observability: "Observability",
    maxRecords: "Max Records",
    maxRecordsDesc: "Maximum request detail records to keep (older records are auto-deleted)",
    batchSize: "Batch Size",
    batchSizeDesc: "Number of items to accumulate before writing to database (higher = better performance)",
    flushInterval: "Flush Interval (ms)",
    flushIntervalDesc: "Maximum time to wait before flushing buffer (prevents data loss during low traffic)",
    maxJsonSize: "Max JSON Size (KB)",
    maxJsonSizeDesc: "Maximum size for each JSON field (request/response) before truncation",
  },

  // Errors
  errors: {
    invalidPassword: "Invalid current password",
    passwordRequired: "Password required",
    networkError: "Network error",
    unknownError: "An error occurred",
  },

  // Login
  login: {
    title: "9Router",
    subtitle: "Enter your password to access the dashboard",
    password: "Password",
    login: "Login",
    loginFailed: "Login failed",
    incorrectPassword: "Incorrect password",
  },
};

// Chinese translations
export const zh = {
  // 通用
  common: {
    save: "保存",
    cancel: "取消",
    delete: "删除",
    edit: "编辑",
    add: "添加",
    loading: "加载中...",
    success: "成功",
    error: "错误",
    confirm: "确认",
    close: "关闭",
    copy: "复制",
    copied: "已复制！",
    test: "测试",
    enabled: "已启用",
    disabled: "已禁用",
    active: "活跃",
    inactive: "未活跃",
    name: "名称",
    description: "描述",
    actions: "操作",
  },

  // 导航
  nav: {
    dashboard: "仪表板",
    providers: "提供商",
    combos: "组合模型",
    usage: "使用统计",
    cliTools: "CLI 工具",
    settings: "设置",
    logout: "退出登录",
  },

  // 仪表板/端点
  endpoint: {
    title: "端点",
    description: "API 端点配置",
    localMode: "本地模式",
    runningOnMachine: "在您的机器上运行",
    dataStoredLocally: "所有数据本地存储在 {path} 文件中。",
    apiKey: "API 密钥",
    copyKey: "复制密钥",
    addKey: "添加密钥",
    keyName: "密钥名称",
    createKey: "创建密钥",
    deleteKey: "删除密钥",
    noKeys: "还没有 API 密钥。创建一个以开始使用。",
  },

  // 提供商
  providers: {
    title: "提供商",
    description: "管理您的 AI 提供商连接",
    addProvider: "添加提供商",
    oauthProviders: "OAuth 提供商",
    apiKeyProviders: "API 密钥提供商",
    compatibleNodes: "兼容节点",
    connect: "连接",
    connected: "已连接",
    disconnect: "断开",
    testConnection: "测试连接",
    connectionStatus: "连接状态",
    accounts: "账户",
    addAccount: "添加账户",
    priority: "优先级",
    active: "活跃",
    testStatus: {
      untested: "未测试",
      testing: "测试中...",
      success: "已连接",
      failed: "失败",
    },
  },

  // 组合模型
  combos: {
    title: "组合模型",
    description: "支持自动回退的模型组合",
    createCombo: "创建组合",
    editCombo: "编辑组合",
    comboName: "组合名称",
    models: "模型列表",
    addModel: "添加模型",
    removeModel: "移除",
    noCombos: "还没有组合模型。创建一个以开始使用。",
    dragToReorder: "拖动调整模型顺序",
    fallbackOn: "在以下情况回退：",
  },

  // 使用统计
  usage: {
    title: "使用统计与分析",
    description: "监控您的 API 使用量、token 消耗和请求日志",
    today: "今天",
    week: "本周",
    month: "本月",
    totalTokens: "总 Token 数",
    totalCost: "总费用",
    requestCount: "请求数",
    byProvider: "按提供商",
    byModel: "按模型",
    requestLogs: "请求日志",
    noLogs: "暂无请求日志。",
    filterByProvider: "按提供商筛选",
    filterByModel: "按模型筛选",
  },

  // CLI 工具
  cliTools: {
    title: "CLI 工具",
    description: "配置 CLI 工具",
    applySettings: "应用设置",
    settingsApplied: "设置已成功应用！",
    selectModel: "选择模型",
  },

  // 设置
  settings: {
    title: "设置",
    description: "管理您的偏好设置",

    // 安全
    security: "安全",
    requireLogin: "需要登录",
    requireLoginDesc: "开启时，仪表板需要密码。关闭时，无需登录即可访问。",
    currentPassword: "当前密码",
    newPassword: "新密码",
    confirmNewPassword: "确认新密码",
    updatePassword: "更新密码",
    setPassword: "设置密码",
    passwordMatch: "密码不匹配",
    passwordUpdated: "密码更新成功",
    passwordUpdateFailed: "密码更新失败",

    // 路由
    routing: "路由策略",
    roundRobin: "轮询",
    roundRobinDesc: "循环使用账户以分散负载",
    stickyLimit: "粘性限制",
    stickyLimitDesc: "切换账户前每个账户的调用次数",
    fillFirst: "优先填充",
    fillFirstDesc: "按优先级顺序使用账户",

    // 代理（新增）
    proxy: "代理设置",
    proxyDesc: "配置 API 请求的出站代理",
    httpProxy: "HTTP 代理",
    httpsProxy: "HTTPS 代理",
    allProxy: "全局代理（HTTP/HTTPS/SOCKS）",
    noProxy: "代理绕过",
    httpProxyPlaceholder: "http://proxy.example.com:8080",
    httpsProxyPlaceholder: "https://proxy.example.com:8080",
    allProxyPlaceholder: "socks5://proxy.example.com:1080",
    noProxyPlaceholder: "localhost,127.0.0.1,*.local",
    noProxyDesc: "逗号分隔的不使用代理的主机列表",
    testProxy: "测试代理",
    proxyTestSuccess: "代理连接成功！",
    proxyTestFailed: "代理连接失败：{error}",
    proxyEnabled: "代理已启用",
    proxyDisabled: "代理已禁用",

    // 外观
    appearance: "外观",
    darkMode: "深色模式",
    darkModeDesc: "切换亮色/深色主题",
    language: "语言",
    languageDesc: "选择您的首选语言",

    // 数据
    data: "数据",
    databaseLocation: "数据库位置",
    databasePath: "~/.9router/db.json",

    // 可观测性
    observability: "可观测性",
    maxRecords: "最大记录数",
    maxRecordsDesc: "保留的最大请求数据记录（旧记录会自动删除）",
    batchSize: "批处理大小",
    batchSizeDesc: "写入数据库前累积的项目数（越高=性能越好）",
    flushInterval: "刷新间隔（毫秒）",
    flushIntervalDesc: "刷新缓冲区前的最大等待时间（防止低流量期间数据丢失）",
    maxJsonSize: "最大 JSON 大小（KB）",
    maxJsonSizeDesc: "每个 JSON 字段（请求/响应）截断前的最大大小",
  },

  // 错误
  errors: {
    invalidPassword: "当前密码无效",
    passwordRequired: "需要密码",
    networkError: "网络错误",
    unknownError: "发生错误",
  },

  // 登录
  login: {
    title: "9Router",
    subtitle: "输入密码访问仪表板",
    password: "密码",
    login: "登录",
    loginFailed: "登录失败",
    incorrectPassword: "密码错误",
  },
};
