/**
 * AssemblyAI 实时字幕生成器
 * 用于从视频音频生成实时字幕
 */

class AssemblyAISubtitleGenerator {
    constructor(options = {}) {
        this.apiKey = options.apiKey || '';
        this.sampleRate = options.sampleRate || 16000;
        this.language = options.language || 'zh'; // zh, en, es, fr, de, it, pt
        this.onPartialTranscript = options.onPartialTranscript || null;
        this.onFinalTranscript = options.onFinalTranscript || null;
        this.onError = options.onError || null;

        this.socket = null;
        this.isConnected = false;
        this.audioContext = null;
        this.mediaStreamSource = null;
        this.processor = null;
    }

    /**
     * 获取临时访问令牌
     */
    async getTemporaryToken() {
        try {
            const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
                method: 'POST',
                headers: {
                    'authorization': this.apiKey,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    expires_in: 3600 // 1小时有效期
                })
            });

            if (!response.ok) {
                throw new Error('获取令牌失败: ' + response.statusText);
            }

            const data = await response.json();
            return data.token;
        } catch (error) {
            console.error('获取令牌错误:', error);
            if (this.onError) {
                this.onError('TOKEN_ERROR', error);
            }
            throw error;
        }
    }

    /**
     * 连接到AssemblyAI WebSocket
     */
    async connect() {
        if (this.isConnected) {
            console.warn('已经连接到AssemblyAI');
            return;
        }

        try {
            // 获取临时令牌
            const token = await this.getTemporaryToken();

            // 建立WebSocket连接
            const socketUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${this.sampleRate}&token=${token}`;
            this.socket = new WebSocket(socketUrl);

            // 连接打开
            this.socket.onopen = () => {
                console.log('AssemblyAI WebSocket已连接');
                this.isConnected = true;
            };

            // 接收消息
            this.socket.onmessage = (message) => {
                this.handleMessage(message);
            };

            // 连接关闭
            this.socket.onclose = () => {
                console.log('AssemblyAI WebSocket已关闭');
                this.isConnected = false;
            };

            // 连接错误
            this.socket.onerror = (error) => {
                console.error('WebSocket错误:', error);
                if (this.onError) {
                    this.onError('WEBSOCKET_ERROR', error);
                }
            };

        } catch (error) {
            console.error('连接失败:', error);
            if (this.onError) {
                this.onError('CONNECTION_ERROR', error);
            }
        }
    }

    /**
     * 处理接收到的消息
     */
    handleMessage(message) {
        const result = JSON.parse(message.data);

        if (result.message_type === 'SessionBegins') {
            console.log('会话开始:', result);
        }
        else if (result.message_type === 'PartialTranscript') {
            // 临时识别结果
            if (this.onPartialTranscript) {
                this.onPartialTranscript({
                    text: result.text,
                    confidence: result.confidence,
                    created: result.created
                });
            }
        }
        else if (result.message_type === 'FinalTranscript') {
            // 最终识别结果
            if (this.onFinalTranscript) {
                this.onFinalTranscript({
                    text: result.text,
                    confidence: result.confidence,
                    created: result.created,
                    words: result.words // 词级时间戳
                });
            }
        }
        else if (result.message_type === 'SessionTerminated') {
            console.log('会话终止');
            this.isConnected = false;
        }
    }

    /**
     * 从麦克风捕获音频并发送
     */
    async startFromMicrophone() {
        try {
            // 请求麦克风权限
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: this.sampleRate,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            // 创建音频处理管道
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.sampleRate
            });

            this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

            // 处理音频数据
            this.processor.onaudioprocess = (e) => {
                if (!this.isConnected) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = this.convertFloat32ToInt16(inputData);
                const base64Audio = this.arrayBufferToBase64(pcmData.buffer);

                // 发送音频数据
                this.sendAudio(base64Audio);
            };

            // 连接音频节点
            this.mediaStreamSource.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            console.log('开始从麦克风捕获音频');

        } catch (error) {
            console.error('麦克风访问失败:', error);
            if (this.onError) {
                this.onError('MICROPHONE_ERROR', error);
            }
        }
    }

    /**
     * 发送音频数据
     */
    sendAudio(base64Audio) {
        if (!this.isConnected || !this.socket) {
            return;
        }

        try {
            this.socket.send(JSON.stringify({
                audio_data: base64Audio
            }));
        } catch (error) {
            console.error('发送音频失败:', error);
        }
    }

    /**
     * 转换Float32到Int16
     */
    convertFloat32ToInt16(float32Array) {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return int16Array;
    }

    /**
     * ArrayBuffer转Base64
     */
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * 停止捕获
     */
    stop() {
        // 停止音频处理
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }

        if (this.mediaStreamSource) {
            this.mediaStreamSource.disconnect();
            this.mediaStreamSource = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        // 发送终止信号
        if (this.isConnected && this.socket) {
            this.socket.send(JSON.stringify({
                terminate_session: true
            }));
        }

        console.log('已停止音频捕获');
    }

    /**
     * 断开连接
     */
    disconnect() {
        this.stop();

        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        this.isConnected = false;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssemblyAISubtitleGenerator;
}
