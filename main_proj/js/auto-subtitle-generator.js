/**
 * 自动字幕生成器 - 使用Web Speech API
 * 适用于听障用户的视频播放器
 *
 * 功能：
 * 1. 实时语音识别
 * 2. 自动生成字幕
 * 3. 支持多语言
 * 4. 字幕样式自定义
 */

class AutoSubtitleGenerator {
    constructor(videoElement, options = {}) {
        this.videoElement = videoElement;
        this.options = {
            language: options.language || 'zh-CN', // 默认中文
            continuous: options.continuous !== false, // 默认连续识别
            interimResults: options.interimResults !== false, // 默认显示临时结果
            maxAlternatives: options.maxAlternatives || 1,
            subtitleContainer: options.subtitleContainer || null,
            onResult: options.onResult || null,
            onError: options.onError || null,
            ...options
        };

        this.recognition = null;
        this.isRecognizing = false;
        this.currentSubtitle = '';
        this.subtitleHistory = [];
        this.audioContext = null;
        this.mediaStreamSource = null;

        this.init();
    }

    /**
     * 初始化语音识别
     */
    init() {
        // 检查浏览器支持
        if (!this.checkBrowserSupport()) {
            console.error('当前浏览器不支持Web Speech API');
            if (this.options.onError) {
                this.options.onError('BROWSER_NOT_SUPPORTED');
            }
            return;
        }

        // 创建语音识别实例
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        // 配置语音识别
        this.recognition.continuous = this.options.continuous;
        this.recognition.interimResults = this.options.interimResults;
        this.recognition.maxAlternatives = this.options.maxAlternatives;
        this.recognition.lang = this.options.language;

        // 绑定事件
        this.bindEvents();
    }

    /**
     * 检查浏览器支持
     */
    checkBrowserSupport() {
        return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    }

    /**
     * 绑定语音识别事件
     */
    bindEvents() {
        if (!this.recognition) return;

        // 识别开始
        this.recognition.onstart = () => {
            console.log('语音识别已开始');
            this.isRecognizing = true;
        };

        // 识别结束
        this.recognition.onend = () => {
            console.log('语音识别已结束');
            this.isRecognizing = false;

            // 如果视频还在播放，自动重启识别
            if (!this.videoElement.paused && this.options.continuous) {
                setTimeout(() => {
                    this.start();
                }, 100);
            }
        };

        // 识别结果
        this.recognition.onresult = (event) => {
            this.handleResult(event);
        };

        // 识别错误
        this.recognition.onerror = (event) => {
            console.error('语音识别错误:', event.error);
            if (this.options.onError) {
                this.options.onError(event.error);
            }
        };
    }

    /**
     * 处理识别结果
     */
    handleResult(event) {
        let interimTranscript = '';
        let finalTranscript = '';

        // 遍历识别结果
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        // 更新当前字幕
        if (finalTranscript) {
            this.currentSubtitle = finalTranscript;
            this.addToHistory(finalTranscript);
        } else if (interimTranscript) {
            this.currentSubtitle = interimTranscript;
        }

        // 显示字幕
        this.displaySubtitle(this.currentSubtitle, !finalTranscript);

        // 回调
        if (this.options.onResult) {
            this.options.onResult({
                transcript: this.currentSubtitle,
                isFinal: !!finalTranscript,
                timestamp: this.videoElement.currentTime
            });
        }
    }

    /**
     * 添加到历史记录
     */
    addToHistory(text) {
        this.subtitleHistory.push({
            text: text,
            timestamp: this.videoElement.currentTime,
            time: new Date().toISOString()
        });
    }

    /**
     * 显示字幕
     */
    displaySubtitle(text, isInterim = false) {
        if (!this.options.subtitleContainer) return;

        const container = this.options.subtitleContainer;
        container.textContent = text;

        // 添加样式类
        if (isInterim) {
            container.classList.add('interim');
        } else {
            container.classList.remove('interim');
        }
    }

    /**
     * 开始识别
     */
    start() {
        if (!this.recognition) {
            console.error('语音识别未初始化');
            return;
        }

        if (this.isRecognizing) {
            console.warn('语音识别已在运行');
            return;
        }

        try {
            this.recognition.start();
        } catch (error) {
            console.error('启动语音识别失败:', error);
            if (this.options.onError) {
                this.options.onError(error);
            }
        }
    }

    /**
     * 停止识别
     */
    stop() {
        if (!this.recognition || !this.isRecognizing) {
            return;
        }

        try {
            this.recognition.stop();
        } catch (error) {
            console.error('停止语音识别失败:', error);
        }
    }

    /**
     * 切换识别状态
     */
    toggle() {
        if (this.isRecognizing) {
            this.stop();
        } else {
            this.start();
        }
    }

    /**
     * 更改语言
     */
    setLanguage(language) {
        this.options.language = language;
        if (this.recognition) {
            this.recognition.lang = language;
        }
    }

    /**
     * 获取字幕历史
     */
    getHistory() {
        return this.subtitleHistory;
    }

    /**
     * 导出字幕为SRT格式
     */
    exportToSRT() {
        let srt = '';
        this.subtitleHistory.forEach((item, index) => {
            const startTime = this.formatSRTTime(item.timestamp);
            const endTime = this.formatSRTTime(
                index < this.subtitleHistory.length - 1
                    ? this.subtitleHistory[index + 1].timestamp
                    : item.timestamp + 3
            );

            srt += `${index + 1}\n`;
            srt += `${startTime} --> ${endTime}\n`;
            srt += `${item.text}\n\n`;
        });

        return srt;
    }

    /**
     * 格式化SRT时间
     */
    formatSRTTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    }

    /**
     * 清空历史记录
     */
    clearHistory() {
        this.subtitleHistory = [];
        this.currentSubtitle = '';
        if (this.options.subtitleContainer) {
            this.options.subtitleContainer.textContent = '';
        }
    }

    /**
     * 销毁实例
     */
    destroy() {
        this.stop();
        this.clearHistory();
        this.recognition = null;
        this.videoElement = null;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutoSubtitleGenerator;
}
