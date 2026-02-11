# AssemblyAI 集成使用指南

## 快速开始

### 1. 注册AssemblyAI账号

1. 访问 [AssemblyAI官网](https://www.assemblyai.com)
2. 注册免费账号（通常有$50免费额度）
3. 获取API密钥

### 2. 配置环境变量

创建 `.env` 文件：

```env
ASSEMBLYAI_API_KEY=your_api_key_here
PORT=3001
```

### 3. 安装依赖

```bash
npm install express cors dotenv
```

### 4. 启动代理服务器

```bash
node assemblyai-proxy-server.js
```

## 使用方案

### 方案A：实时字幕（适合直播）

**前端代码**：
```javascript
// 1. 获取临时令牌
const response = await fetch('http://localhost:3001/api/assemblyai/token', {
    method: 'POST'
});
const { token } = await response.json();

// 2. 使用AssemblyAI生成器
const generator = new AssemblyAISubtitleGenerator({
    apiKey: token, // 使用临时令牌
    onFinalTranscript: (result) => {
        console.log('字幕:', result.text);
        displaySubtitle(result.text);
    }
});

// 3. 连接并开始
await generator.connect();
await generator.startFromMicrophone();
```

**成本**：约$0.015/分钟

### 方案B：预生成字幕（推荐）

**步骤**：
1. 上传视频时提取音频URL
2. 调用批量转录API
3. 等待转录完成
4. 转换为WebVTT格式
5. 保存字幕文件

**代码示例**：
```javascript
// 1. 提交转录任务
const response = await fetch('http://localhost:3001/api/assemblyai/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        audioUrl: 'https://example.com/video.mp4',
        language: 'zh'
    })
});
const { transcriptId } = await response.json();

// 2. 轮询查询状态
const checkStatus = async () => {
    const res = await fetch(`http://localhost:3001/api/assemblyai/transcribe/${transcriptId}`);
    const data = await res.json();

    if (data.status === 'completed') {
        console.log('转录完成:', data.text);
        return data;
    } else {
        setTimeout(checkStatus, 5000); // 5秒后重试
    }
};

// 3. 获取WebVTT字幕
const vttResponse = await fetch('http://localhost:3001/api/assemblyai/to-vtt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcriptId })
});
const vttContent = await vttResponse.text();

// 4. 保存为文件
// 保存到 data/subtitles/course_001.vtt
```

**成本**：约$0.00025/秒（更便宜）

## 推荐方案

对于您的无障碍AI学习平台，**强烈推荐使用方案B（预生成字幕）**：

### 优点
- ✅ 成本更低（批量转录比实时便宜）
- ✅ 一次生成，多次使用
- ✅ 可以人工校对和优化
- ✅ 加载速度快
- ✅ 不依赖实时网络

### 实施步骤
1. 在教师上传视频时自动触发转录
2. 后台异步处理，生成WebVTT文件
3. 保存到 `data/subtitles/` 目录
4. 视频播放时直接加载字幕文件

## 成本估算

假设平台有100个视频，每个30分钟：
- 总时长：100 × 30 = 3000分钟
- 批量转录成本：3000 × 60 × $0.00025 = **$45**
- 一次性投入，永久使用

## 安全注意事项

⚠️ **重要**：
- 不要在前端代码中暴露API密钥
- 使用后端代理服务器
- 添加访问控制和使用限制
- 监控API使用量

## 文件说明

- `AssemblyAI-详解.md` - 详细技术文档
- `assemblyai-subtitle-generator.js` - 前端实时字幕生成器
- `assemblyai-proxy-server.js` - 后端代理服务器
- 本文件 - 快速使用指南

## 下一步

1. 注册AssemblyAI账号
2. 测试批量转录功能
3. 集成到视频上传流程
4. 为现有视频生成字幕
