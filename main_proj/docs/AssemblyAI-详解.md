# AssemblyAI 实时语音识别详解

## 什么是AssemblyAI？

AssemblyAI是一个专业的**语音识别（Speech-to-Text）API服务提供商**，成立于2017年，专注于为开发者提供高精度、低延迟的语音转文字解决方案。

### 核心特点

- **高精度识别**：词准确率达到94.1%
- **超低延迟**：约300毫秒的响应时间
- **多语言支持**：支持中文、英语、西班牙语、法语、德语等
- **企业级可靠性**：99.95%的正常运行时间SLA
- **无限并发**：支持同时处理数千个音频流

## 实时API调用工作原理

### 1. 技术架构

```
客户端应用 <--WebSocket--> AssemblyAI服务器
    |                           |
    |-- 发送音频流 ------------>|
    |                           |-- 实时处理
    |                           |-- AI模型识别
    |<-- 接收文字结果 ----------|
```

### 2. 工作流程详解

#### 步骤1：建立WebSocket连接

```javascript
// 1. 获取临时访问令牌
const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
    method: 'POST',
    headers: {
        'authorization': 'YOUR_API_KEY'
    }
});
const { token } = await response.json();

// 2. 建立WebSocket连接
const socket = new WebSocket(
    `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`
);
```

**关键参数**：
- `sample_rate`: 音频采样率（通常16000Hz）
- `token`: 临时访问令牌（有效期有限）

#### 步骤2：发送音频数据

```javascript
// 音频数据必须是Base64编码的PCM格式
socket.onopen = () => {
    // 发送音频数据
    const audioData = captureAudioFromMicrophone(); // 或从视频提取
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioData)));

    socket.send(JSON.stringify({
        audio_data: base64Audio
    }));
};
```

**音频要求**：
- 格式：PCM（原始音频）
- 编码：Base64
- 采样率：16000Hz（推荐）
- 声道：单声道（mono）

#### 步骤3：接收识别结果

```javascript
socket.onmessage = (message) => {
    const result = JSON.parse(message.data);

    if (result.message_type === 'PartialTranscript') {
        // 临时结果（可能会变化）
        console.log('临时:', result.text);
        displaySubtitle(result.text, true); // 显示为临时字幕
    }
    else if (result.message_type === 'FinalTranscript') {
        // 最终结果（不会再变化）
        console.log('最终:', result.text);
        displaySubtitle(result.text, false); // 显示为确定字幕
        saveToHistory(result.text, result.created); // 保存到历史
    }
};
```

**结果类型**：
- `PartialTranscript`: 临时识别结果，可能会被后续结果覆盖
- `FinalTranscript`: 最终识别结果，不会再改变（immutable）

#### 步骤4：处理结束

```javascript
// 发送结束信号
socket.send(JSON.stringify({
    terminate_session: true
}));

// 关闭连接
socket.close();
```

### 3. Universal-Streaming模型特性

AssemblyAI的Universal-Streaming模型是专为实时场景设计的：

**不可变转录（Immutable Transcripts）**：
- 一旦发出最终结果，就不会再修改
- 适合需要立即响应的应用（如AI语音助手）
- 避免了传统流式识别中频繁修正的问题

**智能端点检测（Intelligent Endpointing）**：
- 自动检测自然语音停顿
- 快速确定句子结束
- 减少用户感知的延迟

**自动功能**：
- 自动标点符号
- 自动大小写
- 词级时间戳
- 说话人识别（Speaker Diarization）

## 与Web Speech API的对比

| 特性 | AssemblyAI | Web Speech API |
|------|-----------|----------------|
| **准确率** | 94.1% | 约85-90% |
| **延迟** | ~300ms | ~500-1000ms |
| **浏览器支持** | 所有（通过API） | 仅Chrome/Edge |
| **音频源** | 任意（视频/麦克风/文件） | 仅麦克风 |
| **离线使用** | ❌ 需要网络 | ❌ 需要网络 |
| **成本** | 💰 按使用量付费 | ✅ 免费 |
| **多语言** | ✅ 支持多种 | ✅ 支持多种 |
| **说话人识别** | ✅ 支持 | ❌ 不支持 |
| **自定义词汇** | ✅ 支持 | ❌ 不支持 |

## 成本考虑

### 定价模型（2026年参考）

- **实时转录**：约$0.015/分钟（$0.90/小时）
- **批量转录**：约$0.00025/秒（$0.90/小时）
- **免费额度**：新用户通常有$50免费额度

### 成本估算示例

假设一个在线课程平台：
- 每天100个学生
- 每人观看30分钟视频
- 每月使用：100 × 30 × 30 = 90,000分钟
- 月成本：90,000 × $0.015 = **$1,350**

**优化建议**：
1. 仅为需要的用户启用（如听障用户）
2. 使用批量转录预生成字幕（更便宜）
3. 缓存已转录的内容

## 适用场景

### ✅ 适合使用AssemblyAI的场景

1. **预录视频字幕生成**
   - 上传视频时自动生成字幕
   - 一次生成，多次使用
   - 成本可控

2. **直播实时字幕**
   - 在线课程直播
   - 会议实时转录
   - 需要高准确率

3. **多语言支持**
   - 需要支持多种语言
   - 需要自动语言检测

4. **专业应用**
   - 医疗转录
   - 法律记录
   - 客服质检

### ❌ 不适合的场景

1. **预算极其有限**
   - 大量使用会产生高额费用
   - 考虑使用免费的Web Speech API

2. **离线使用**
   - AssemblyAI需要网络连接
   - 考虑使用本地模型（如Whisper）

3. **实时性要求不高**
   - 如果可以接受延迟
   - 考虑使用更便宜的批量转录

## 技术限制

1. **需要API密钥**
   - 需要注册账号
   - 密钥需要妥善保管

2. **网络依赖**
   - 需要稳定的网络连接
   - 网络波动会影响体验

3. **音频格式要求**
   - 必须转换为PCM格式
   - 需要Base64编码
   - 增加了处理复杂度

4. **成本累积**
   - 使用量大时成本显著
   - 需要监控和预算管理

## 安全考虑

1. **API密钥保护**
   - 不要在前端代码中暴露API密钥
   - 使用后端代理请求
   - 定期轮换密钥

2. **数据隐私**
   - 音频数据会发送到AssemblyAI服务器
   - 需要符合隐私法规（GDPR等）
   - 考虑数据保留政策

3. **访问控制**
   - 限制谁可以使用转录功能
   - 监控异常使用模式
   - 设置使用配额

## 总结

AssemblyAI是一个**专业、高精度、低延迟**的语音识别服务，特别适合：
- 需要高质量字幕的应用
- 预算充足的商业项目
- 需要处理视频音频的场景

对于您的无障碍AI学习平台：
- **推荐用途**：预生成视频字幕（批量转录）
- **不推荐**：实时转录每个用户的观看（成本太高）
- **最佳实践**：上传视频时自动生成字幕，存储为WebVTT文件

---

**参考资源**：
- [AssemblyAI官网](https://www.assemblyai.com)
- [AssemblyAI文档](https://www.assemblyai.com/docs)
- [实时转录指南](https://www.assemblyai.com/docs/guides/real-time-streaming-transcription)
