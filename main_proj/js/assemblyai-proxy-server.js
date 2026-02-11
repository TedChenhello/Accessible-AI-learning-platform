/**
 * AssemblyAI 后端代理服务器
 * 用于安全地管理API密钥和生成临时令牌
 *
 * 安装依赖：
 * npm install express cors dotenv
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// AssemblyAI API密钥（从环境变量读取）
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

if (!ASSEMBLYAI_API_KEY) {
    console.error('错误: 未设置ASSEMBLYAI_API_KEY环境变量');
    process.exit(1);
}

/**
 * 获取AssemblyAI临时令牌
 * POST /api/assemblyai/token
 */
app.post('/api/assemblyai/token', async (req, res) => {
    try {
        // 可以在这里添加用户认证和权限检查
        // 例如：检查用户是否登录，是否有权限使用转录功能

        const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
            method: 'POST',
            headers: {
                'authorization': ASSEMBLYAI_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                expires_in: 3600 // 1小时
            })
        });

        if (!response.ok) {
            throw new Error(`AssemblyAI API错误: ${response.statusText}`);
        }

        const data = await response.json();

        res.json({
            success: true,
            token: data.token
        });

    } catch (error) {
        console.error('获取令牌失败:', error);
        res.status(500).json({
            success: false,
            message: '获取令牌失败',
            error: error.message
        });
    }
});

/**
 * 批量转录（用于预生成字幕）
 * POST /api/assemblyai/transcribe
 * Body: { audioUrl: string, language?: string }
 */
app.post('/api/assemblyai/transcribe', async (req, res) => {
    try {
        const { audioUrl, language } = req.body;

        if (!audioUrl) {
            return res.status(400).json({
                success: false,
                message: '缺少audioUrl参数'
            });
        }

        // 提交转录任务
        const response = await fetch('https://api.assemblyai.com/v2/transcript', {
            method: 'POST',
            headers: {
                'authorization': ASSEMBLYAI_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                audio_url: audioUrl,
                language_code: language || 'zh'
            })
        });

        if (!response.ok) {
            throw new Error(`AssemblyAI API错误: ${response.statusText}`);
        }

        const data = await response.json();

        res.json({
            success: true,
            transcriptId: data.id,
            status: data.status
        });

    } catch (error) {
        console.error('提交转录失败:', error);
        res.status(500).json({
            success: false,
            message: '提交转录失败',
            error: error.message
        });
    }
});

/**
 * 查询转录状态
 * GET /api/assemblyai/transcribe/:id
 */
app.get('/api/assemblyai/transcribe/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const response = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
            headers: {
                'authorization': ASSEMBLYAI_API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`AssemblyAI API错误: ${response.statusText}`);
        }

        const data = await response.json();

        res.json({
            success: true,
            status: data.status,
            text: data.text,
            words: data.words,
            confidence: data.confidence
        });

    } catch (error) {
        console.error('查询转录失败:', error);
        res.status(500).json({
            success: false,
            message: '查询转录失败',
            error: error.message
        });
    }
});

/**
 * 转换为WebVTT格式
 * POST /api/assemblyai/to-vtt
 * Body: { transcriptId: string }
 */
app.post('/api/assemblyai/to-vtt', async (req, res) => {
    try {
        const { transcriptId } = req.body;

        if (!transcriptId) {
            return res.status(400).json({
                success: false,
                message: '缺少transcriptId参数'
            });
        }

        // 获取转录结果
        const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
            headers: {
                'authorization': ASSEMBLYAI_API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`AssemblyAI API错误: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status !== 'completed') {
            return res.json({
                success: false,
                message: '转录尚未完成',
                status: data.status
            });
        }

        // 转换为WebVTT格式
        const vtt = convertToWebVTT(data.words);

        res.setHeader('Content-Type', 'text/vtt');
        res.send(vtt);

    } catch (error) {
        console.error('转换VTT失败:', error);
        res.status(500).json({
            success: false,
            message: '转换VTT失败',
            error: error.message
        });
    }
});

/**
 * 转换为WebVTT格式
 */
function convertToWebVTT(words) {
    let vtt = 'WEBVTT\n\n';

    if (!words || words.length === 0) {
        return vtt;
    }

    // 按句子分组（简单实现：每10个词一组）
    const wordsPerLine = 10;
    for (let i = 0; i < words.length; i += wordsPerLine) {
        const chunk = words.slice(i, i + wordsPerLine);
        const startTime = chunk[0].start / 1000; // 转换为秒
        const endTime = chunk[chunk.length - 1].end / 1000;
        const text = chunk.map(w => w.text).join(' ');

        vtt += `${i / wordsPerLine + 1}\n`;
        vtt += `${formatVTTTime(startTime)} --> ${formatVTTTime(endTime)}\n`;
        vtt += `${text}\n\n`;
    }

    return vtt;
}

/**
 * 格式化VTT时间
 */
function formatVTTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

// 启动服务器
app.listen(PORT, () => {
    console.log('===========================================');
    console.log('AssemblyAI代理服务器已启动');
    console.log(`服务器地址: http://localhost:${PORT}`);
    console.log('API端点:');
    console.log('  - POST   /api/assemblyai/token        获取临时令牌');
    console.log('  - POST   /api/assemblyai/transcribe   提交转录任务');
    console.log('  - GET    /api/assemblyai/transcribe/:id 查询转录状态');
    console.log('  - POST   /api/assemblyai/to-vtt       转换为WebVTT');
    console.log('===========================================');
});
