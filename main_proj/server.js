// ==================== 无障碍AI学习平台后端服务器 ====================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

// ==================== 中间件配置 ====================
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // 提供静态文件服务

// ==================== 数据文件路径 ====================
const COURSES_FILE = path.join(__dirname, 'data', 'courses.json');
const HOMEWORK_FILE = path.join(__dirname, 'data', 'homework.json');
const COMPLETIONS_FILE = path.join(__dirname, 'data', 'completions.json');
const SUBTITLES_DIR = path.join(__dirname, 'data', 'subtitles');
const PROGRESS_FILE = path.join(__dirname, 'data', 'student_progress.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// ==================== AssemblyAI配置 ====================
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || '';
const ASSEMBLYAI_API_URL = 'https://api.assemblyai.com/v2';

// ==================== 辅助函数 ====================
// 读取JSON文件
async function readJSONFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`读取文件失败: ${filePath}`, error);
        return null;
    }
}

// 写入JSON文件
async function writeJSONFile(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`写入文件失败: ${filePath}`, error);
        return false;
    }
}

// 生成唯一ID
function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}


// ==================== 课程管理API ====================
// 获取所有课程
app.get('/api/courses', async (req, res) => {
    const data = await readJSONFile(COURSES_FILE);
    if (data) {
        res.json({ success: true, courses: data.courses });
    } else {
        res.status(500).json({ success: false, message: '读取课程数据失败' });
    }
});

// 获取单个课程
app.get('/api/courses/:id', async (req, res) => {
    const data = await readJSONFile(COURSES_FILE);
    if (data) {
        const course = data.courses.find(c => c.id === req.params.id);
        if (course) {
            res.json({ success: true, course });
        } else {
            res.status(404).json({ success: false, message: '课程不存在' });
        }
    } else {
        res.status(500).json({ success: false, message: '读取课程数据失败' });
    }
});

// 创建新课程
app.post('/api/courses', async (req, res) => {
    const data = await readJSONFile(COURSES_FILE);
    if (!data) {
        return res.status(500).json({ success: false, message: '读取课程数据失败' });
    }

    const newCourse = {
        id: generateId('course'),
        title: req.body.title,
        description: req.body.description,
        content: req.body.content,
        videoUrl: req.body.videoUrl || '',
        aiToolLinks: req.body.aiToolLinks || [],
        tasks: req.body.tasks || [],
        createdAt: new Date().toISOString(),
        createdBy: req.body.createdBy || 'teacher_001',
        status: 'active'
    };

    data.courses.push(newCourse);
    const success = await writeJSONFile(COURSES_FILE, data);

    if (success) {
        res.json({ success: true, course: newCourse });
    } else {
        res.status(500).json({ success: false, message: '保存课程失败' });
    }
});


// 更新课程
app.put('/api/courses/:id', async (req, res) => {
    const data = await readJSONFile(COURSES_FILE);
    if (!data) {
        return res.status(500).json({ success: false, message: '读取课程数据失败' });
    }

    const courseIndex = data.courses.findIndex(c => c.id === req.params.id);
    if (courseIndex === -1) {
        return res.status(404).json({ success: false, message: '课程不存在' });
    }

    // 更新课程信息
    data.courses[courseIndex] = {
        ...data.courses[courseIndex],
        title: req.body.title || data.courses[courseIndex].title,
        description: req.body.description || data.courses[courseIndex].description,
        content: req.body.content || data.courses[courseIndex].content,
        videoUrl: req.body.videoUrl !== undefined ? req.body.videoUrl : data.courses[courseIndex].videoUrl,
        aiToolLinks: req.body.aiToolLinks || data.courses[courseIndex].aiToolLinks,
        tasks: req.body.tasks || data.courses[courseIndex].tasks,
        updatedAt: new Date().toISOString()
    };

    const success = await writeJSONFile(COURSES_FILE, data);

    if (success) {
        res.json({ success: true, course: data.courses[courseIndex] });
    } else {
        res.status(500).json({ success: false, message: '更新课程失败' });
    }
});

// 删除课程
app.delete('/api/courses/:id', async (req, res) => {
    const data = await readJSONFile(COURSES_FILE);
    if (!data) {
        return res.status(500).json({ success: false, message: '读取课程数据失败' });
    }

    const courseIndex = data.courses.findIndex(c => c.id === req.params.id);
    if (courseIndex === -1) {
        return res.status(404).json({ success: false, message: '课程不存在' });
    }

    data.courses.splice(courseIndex, 1);
    const success = await writeJSONFile(COURSES_FILE, data);

    if (success) {
        res.json({ success: true, message: '课程已删除' });
    } else {
        res.status(500).json({ success: false, message: '删除课程失败' });
    }
});


// ==================== 作业管理API ====================
// 获取所有作业
app.get('/api/homework', async (req, res) => {
    const data = await readJSONFile(HOMEWORK_FILE);
    if (data) {
        res.json({ success: true, homework: data.homework });
    } else {
        res.status(500).json({ success: false, message: '读取作业数据失败' });
    }
});

// 获取单个作业
app.get('/api/homework/:id', async (req, res) => {
    const data = await readJSONFile(HOMEWORK_FILE);
    if (data) {
        const homework = data.homework.find(h => h.id === req.params.id);
        if (homework) {
            res.json({ success: true, homework });
        } else {
            res.status(404).json({ success: false, message: '作业不存在' });
        }
    } else {
        res.status(500).json({ success: false, message: '读取作业数据失败' });
    }
});

// 创建新作业
app.post('/api/homework', async (req, res) => {
    const data = await readJSONFile(HOMEWORK_FILE);
    if (!data) {
        return res.status(500).json({ success: false, message: '读取作业数据失败' });
    }

    const newHomework = {
        id: generateId('hw'),
        title: req.body.title,
        description: req.body.description,
        courseId: req.body.courseId || '',
        deadline: req.body.deadline,
        aiToolLinks: req.body.aiToolLinks || [],
        tasks: req.body.tasks || [],
        createdAt: new Date().toISOString(),
        createdBy: req.body.createdBy || 'teacher_001',
        status: 'active'
    };

    data.homework.push(newHomework);
    const success = await writeJSONFile(HOMEWORK_FILE, data);

    if (success) {
        res.json({ success: true, homework: newHomework });
    } else {
        res.status(500).json({ success: false, message: '保存作业失败' });
    }
});


// 更新作业
app.put('/api/homework/:id', async (req, res) => {
    const data = await readJSONFile(HOMEWORK_FILE);
    if (!data) {
        return res.status(500).json({ success: false, message: '读取作业数据失败' });
    }

    const homeworkIndex = data.homework.findIndex(h => h.id === req.params.id);
    if (homeworkIndex === -1) {
        return res.status(404).json({ success: false, message: '作业不存在' });
    }

    data.homework[homeworkIndex] = {
        ...data.homework[homeworkIndex],
        title: req.body.title || data.homework[homeworkIndex].title,
        description: req.body.description || data.homework[homeworkIndex].description,
        deadline: req.body.deadline || data.homework[homeworkIndex].deadline,
        aiToolLinks: req.body.aiToolLinks || data.homework[homeworkIndex].aiToolLinks,
        tasks: req.body.tasks || data.homework[homeworkIndex].tasks,
        updatedAt: new Date().toISOString()
    };

    const success = await writeJSONFile(HOMEWORK_FILE, data);

    if (success) {
        res.json({ success: true, homework: data.homework[homeworkIndex] });
    } else {
        res.status(500).json({ success: false, message: '更新作业失败' });
    }
});

// 删除作业
app.delete('/api/homework/:id', async (req, res) => {
    const data = await readJSONFile(HOMEWORK_FILE);
    if (!data) {
        return res.status(500).json({ success: false, message: '读取作业数据失败' });
    }

    const homeworkIndex = data.homework.findIndex(h => h.id === req.params.id);
    if (homeworkIndex === -1) {
        return res.status(404).json({ success: false, message: '作业不存在' });
    }

    data.homework.splice(homeworkIndex, 1);
    const success = await writeJSONFile(HOMEWORK_FILE, data);

    if (success) {
        res.json({ success: true, message: '作业已删除' });
    } else {
        res.status(500).json({ success: false, message: '删除作业失败' });
    }
});


// ==================== 作业提交管理API ====================
// 获取所有提交
app.get('/api/submissions', async (req, res) => {
    const data = await readJSONFile(HOMEWORK_FILE);
    if (data) {
        res.json({ success: true, submissions: data.submissions });
    } else {
        res.status(500).json({ success: false, message: '读取提交数据失败' });
    }
});

// 提交作业
app.post('/api/submissions', async (req, res) => {
    const data = await readJSONFile(HOMEWORK_FILE);
    if (!data) {
        return res.status(500).json({ success: false, message: '读取数据失败' });
    }

    const newSubmission = {
        id: generateId('sub'),
        homeworkId: req.body.homeworkId,
        studentId: req.body.studentId || 'student_001',
        note: req.body.note || '',
        files: req.body.files || [],
        submittedAt: new Date().toISOString(),
        status: 'submitted'
    };

    data.submissions.push(newSubmission);
    const success = await writeJSONFile(HOMEWORK_FILE, data);

    if (success) {
        res.json({ success: true, submission: newSubmission });
    } else {
        res.status(500).json({ success: false, message: '提交作业失败' });
    }
});

// ==================== 课程完成管理API ====================
// 记录课程完成
app.post('/api/course-completion', async (req, res) => {
    let data = await readJSONFile(COMPLETIONS_FILE);

    // 如果文件不存在，创建新的数据结构
    if (!data) {
        data = { completions: [] };
    }

    const newCompletion = {
        id: generateId('completion'),
        courseId: req.body.courseId,
        completedAt: req.body.completedAt || new Date().toISOString(),
        userMode: req.body.userMode || 'hearing'
    };

    data.completions.push(newCompletion);
    const success = await writeJSONFile(COMPLETIONS_FILE, data);

    if (success) {
        res.json({ success: true, completion: newCompletion });
    } else {
        res.status(500).json({ success: false, message: '保存完成记录失败' });
    }
});

// ==================== AssemblyAI字幕生成API ====================
// 获取AssemblyAI API密钥
app.get('/api/assemblyai/key', (req, res) => {
    if (!ASSEMBLYAI_API_KEY) {
        return res.status(500).json({ success: false, message: 'AssemblyAI API密钥未配置' });
    }

    res.json({ success: true, apiKey: ASSEMBLYAI_API_KEY });
});

// 提交视频转录任务
app.post('/api/subtitles/generate', async (req, res) => {
    const { videoUrl, courseId, language } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ success: false, message: '缺少videoUrl参数' });
    }

    if (!ASSEMBLYAI_API_KEY) {
        return res.status(500).json({ success: false, message: 'AssemblyAI API密钥未配置' });
    }

    try {
        // 提交转录任务到AssemblyAI
        const response = await fetch(`${ASSEMBLYAI_API_URL}/transcript`, {
            method: 'POST',
            headers: {
                'authorization': ASSEMBLYAI_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                audio_url: videoUrl,
                language_code: language || 'zh',
                speech_models: ['universal-2']
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('AssemblyAI API详细错误:', data);
            throw new Error(`AssemblyAI API错误: ${response.statusText} - ${JSON.stringify(data)}`);
        }

        res.json({
            success: true,
            transcriptId: data.id,
            status: data.status,
            courseId: courseId
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

// 检查转录状态
app.get('/api/subtitles/status/:transcriptId', async (req, res) => {
    const { transcriptId } = req.params;

    if (!ASSEMBLYAI_API_KEY) {
        return res.status(500).json({ success: false, message: 'AssemblyAI API密钥未配置' });
    }

    try {
        const response = await fetch(`${ASSEMBLYAI_API_URL}/transcript/${transcriptId}`, {
            method: 'GET',
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
            transcriptId: data.id,
            status: data.status,
            text: data.text,
            words: data.words
        });

    } catch (error) {
        console.error('检查转录状态失败:', error);
        res.status(500).json({
            success: false,
            message: '检查转录状态失败',
            error: error.message
        });
    }
});

// 转换为WebVTT格式并保存
app.post('/api/subtitles/to-vtt', async (req, res) => {
    const { transcriptId, courseId } = req.body;

    if (!transcriptId || !courseId) {
        return res.status(400).json({ success: false, message: '缺少transcriptId或courseId参数' });
    }

    if (!ASSEMBLYAI_API_KEY) {
        return res.status(500).json({ success: false, message: 'AssemblyAI API密钥未配置' });
    }

    try {
        // 获取转录结果
        const response = await fetch(`${ASSEMBLYAI_API_URL}/transcript/${transcriptId}`, {
            method: 'GET',
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
        const vttContent = convertToWebVTT(data.words);

        // 确保字幕目录存在
        await fs.mkdir(SUBTITLES_DIR, { recursive: true });

        // 保存VTT文件
        const vttFilePath = path.join(SUBTITLES_DIR, `${courseId}_subtitles.vtt`);
        await fs.writeFile(vttFilePath, vttContent, 'utf8');

        res.json({
            success: true,
            message: '字幕生成成功',
            filePath: `data/subtitles/${courseId}_subtitles.vtt`,
            courseId: courseId
        });

    } catch (error) {
        console.error('生成VTT文件失败:', error);
        res.status(500).json({
            success: false,
            message: '生成VTT文件失败',
            error: error.message
        });
    }
});

// 获取课程字幕文件
app.get('/api/subtitles/:courseId', async (req, res) => {
    const { courseId } = req.params;
    const vttFilePath = path.join(SUBTITLES_DIR, `${courseId}_subtitles.vtt`);

    try {
        await fs.access(vttFilePath);
        res.json({
            success: true,
            filePath: `data/subtitles/${courseId}_subtitles.vtt`,
            exists: true
        });
    } catch (error) {
        res.json({
            success: true,
            exists: false,
            message: '字幕文件不存在'
        });
    }
});

// 辅助函数：转换为WebVTT格式
function convertToWebVTT(words) {
    if (!words || words.length === 0) {
        return 'WEBVTT\n\n';
    }

    let vtt = 'WEBVTT\n\n';
    let cueIndex = 1;
    let currentCue = [];
    let cueStart = words[0].start;
    const maxCueDuration = 5000; // 每个字幕最多5秒
    const maxWordsPerCue = 15; // 每个字幕最多15个词

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        currentCue.push(word.text);

        const shouldBreak =
            currentCue.length >= maxWordsPerCue ||
            (word.end - cueStart) >= maxCueDuration ||
            i === words.length - 1;

        if (shouldBreak) {
            const cueEnd = word.end;
            const cueText = currentCue.join(' ');

            vtt += `${cueIndex}\n`;
            vtt += `${formatTime(cueStart)} --> ${formatTime(cueEnd)}\n`;
            vtt += `${cueText}\n\n`;

            cueIndex++;
            currentCue = [];
            if (i < words.length - 1) {
                cueStart = words[i + 1].start;
            }
        }
    }

    return vtt;
}

// 辅助函数：格式化时间为WebVTT格式
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ms = milliseconds % 1000;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

// ==================== 用户认证API ====================
// 用户登录
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    const data = await readJSONFile(USERS_FILE);
    if (!data) {
        return res.status(500).json({ success: false, message: '读取用户数据失败' });
    }

    // 查找用户
    const user = data.users.find(u => u.username === username && u.password === password);

    if (user) {
        // 登录成功，返回用户信息（不包含密码）
        const { password, ...userInfo } = user;
        res.json({ success: true, user: userInfo });
    } else {
        res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
});

// 获取用户信息
app.get('/api/user/:id', async (req, res) => {
    const data = await readJSONFile(USERS_FILE);
    if (!data) {
        return res.status(500).json({ success: false, message: '读取用户数据失败' });
    }

    const user = data.users.find(u => u.id === req.params.id);
    if (user) {
        const { password, ...userInfo } = user;
        res.json({ success: true, user: userInfo });
    } else {
        res.status(404).json({ success: false, message: '用户不存在' });
    }
});

// ==================== 学生进度跟踪API ====================
// 更新学生进度
app.post('/api/progress/update', async (req, res) => {
    const { studentId, courseId, taskIndex, action } = req.body;

    if (!studentId || !courseId || taskIndex === undefined) {
        return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    let data = await readJSONFile(PROGRESS_FILE);
    if (!data) {
        data = { progress: [] };
    }

    const now = new Date().toISOString();
    const progressKey = `${studentId}_${courseId}_${taskIndex}`;

    // 查找现有进度记录
    let progressRecord = data.progress.find(p =>
        p.studentId === studentId &&
        p.courseId === courseId &&
        p.taskIndex === taskIndex
    );

    if (progressRecord) {
        // 更新现有记录
        progressRecord.lastActivity = now;
        progressRecord.visitCount = (progressRecord.visitCount || 1) + 1;
        if (action === 'complete') {
            progressRecord.completed = true;
            progressRecord.completedAt = now;
        }
    } else {
        // 创建新记录
        progressRecord = {
            studentId: studentId,
            courseId: courseId,
            taskIndex: taskIndex,
            startTime: now,
            lastActivity: now,
            visitCount: 1,
            completed: action === 'complete',
            completedAt: action === 'complete' ? now : null
        };
        data.progress.push(progressRecord);
    }

    const success = await writeJSONFile(PROGRESS_FILE, data);

    if (success) {
        res.json({ success: true, progress: progressRecord });
    } else {
        res.status(500).json({ success: false, message: '保存进度失败' });
    }
});

// 获取所有学生进度
app.get('/api/progress/all', async (req, res) => {
    const data = await readJSONFile(PROGRESS_FILE);
    if (data) {
        res.json({ success: true, progress: data.progress });
    } else {
        res.status(500).json({ success: false, message: '读取进度数据失败' });
    }
});

// 获取卡住的学生（停留时间超过5分钟且未完成）
app.get('/api/progress/stuck', async (req, res) => {
    const data = await readJSONFile(PROGRESS_FILE);
    if (!data) {
        return res.status(500).json({ success: false, message: '读取进度数据失败' });
    }

    const now = new Date();
    const stuckThreshold = 5 * 60 * 1000; // 5分钟（毫秒）

    const stuckStudents = data.progress.filter(p => {
        if (p.completed) return false;

        const lastActivity = new Date(p.lastActivity);
        const timeDiff = now - lastActivity;

        return timeDiff > stuckThreshold;
    });

    res.json({ success: true, stuckStudents: stuckStudents });
});

// ==================== 服务器启动 ====================
app.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`无障碍AI学习平台后端服务器已启动`);
    console.log(`服务器地址: http://localhost:${PORT}`);
    console.log(`API文档:`);
    console.log(`  - GET    /api/courses          获取所有课程`);
    console.log(`  - GET    /api/courses/:id      获取单个课程`);
    console.log(`  - POST   /api/courses          创建新课程`);
    console.log(`  - PUT    /api/courses/:id      更新课程`);
    console.log(`  - DELETE /api/courses/:id      删除课程`);
    console.log(`  - GET    /api/homework         获取所有作业`);
    console.log(`  - POST   /api/homework         创建新作业`);
    console.log(`  - POST   /api/submissions      提交作业`);
    console.log(`  - POST   /api/course-completion 记录课程完成`);
    console.log(`  - POST   /api/subtitles/generate 提交视频转录任务`);
    console.log(`  - GET    /api/subtitles/status/:id 检查转录状态`);
    console.log(`  - POST   /api/subtitles/to-vtt 转换为WebVTT格式`);
    console.log(`  - GET    /api/subtitles/:courseId 获取课程字幕`);
    console.log(`===========================================`);
});

