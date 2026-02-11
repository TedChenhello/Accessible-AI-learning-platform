// ==================== 智能读屏系统 ====================
// 基于 Web Speech API 的增强型屏幕阅读器

class ScreenReader {
    constructor() {
        // 语音合成对象
        this.synth = window.speechSynthesis;
        this.currentUtterance = null;
        this.lastSpokenText = '';

        // 读屏设置
        this.settings = {
            autoRead: true,
            speed: 1.0,
            volume: 1.0,
            pitch: 1.0,
            lang: 'zh-CN'
        };

        // 状态管理
        this.state = {
            isSpeaking: false,
            isPaused: false,
            currentFocusedElement: null
        };

        // 初始化
        this.init();
    }

    init() {
        console.log('初始化智能读屏系统...');

        // 绑定控制按钮
        this.bindControls();

        // 设置焦点监听
        this.setupFocusTracking();

        // 设置键盘快捷键
        this.setupKeyboardShortcuts();

        // 页面加载完成后播放欢迎语音
        this.speakWelcome();

        console.log('智能读屏系统初始化完成');
    }

    // ==================== 语音合成核心功能 ====================

    speak(text, options = {}) {
        // 如果正在说话，先停止
        if (this.synth.speaking) {
            this.synth.cancel();
        }

        // 创建新的语音对象
        this.currentUtterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance.lang = this.settings.lang;
        this.currentUtterance.rate = options.speed || this.settings.speed;
        this.currentUtterance.volume = options.volume || this.settings.volume;
        this.currentUtterance.pitch = options.pitch || this.settings.pitch;

        // 保存最后说的内容
        this.lastSpokenText = text;

        // 事件监听
        this.currentUtterance.onstart = () => {
            this.state.isSpeaking = true;
            this.state.isPaused = false;
            this.updateVoiceStatus('正在朗读...', true);
        };

        this.currentUtterance.onend = () => {
            this.state.isSpeaking = false;
            this.state.isPaused = false;
            this.updateVoiceStatus('准备就绪', false);
        };

        this.currentUtterance.onerror = (event) => {
            console.error('语音合成错误:', event);
            this.state.isSpeaking = false;
            this.updateVoiceStatus('发生错误', false);
        };

        // 开始朗读
        this.synth.speak(this.currentUtterance);
    }

    pause() {
        if (this.synth.speaking && !this.state.isPaused) {
            this.synth.pause();
            this.state.isPaused = true;
            this.updateVoiceStatus('已暂停', false);
            this.showNotification('朗读已暂停', 'info');
        }
    }

    resume() {
        if (this.state.isPaused) {
            this.synth.resume();
            this.state.isPaused = false;
            this.updateVoiceStatus('正在朗读...', true);
            this.showNotification('继续朗读', 'info');
        }
    }

    stop() {
        if (this.synth.speaking) {
            this.synth.cancel();
            this.state.isSpeaking = false;
            this.state.isPaused = false;
            this.updateVoiceStatus('已停止', false);
            this.showNotification('朗读已停止', 'info');
        }
    }

    repeat() {
        if (this.lastSpokenText) {
            this.speak(this.lastSpokenText);
            this.showNotification('重复朗读', 'info');
        }
    }

    // ==================== 控制按钮绑定 ====================

    bindControls() {
        // 自动朗读开关
        const toggleAutoReadBtn = document.getElementById('toggleAutoReadBtn');
        if (toggleAutoReadBtn) {
            toggleAutoReadBtn.addEventListener('click', () => {
                this.settings.autoRead = !this.settings.autoRead;
                toggleAutoReadBtn.textContent = this.settings.autoRead ?
                    '🔊 自动朗读：开' : '🔇 自动朗读：关';
                toggleAutoReadBtn.setAttribute('aria-pressed', this.settings.autoRead);
                toggleAutoReadBtn.classList.toggle('active', this.settings.autoRead);

                const message = this.settings.autoRead ? '已开启自动朗读' : '已关闭自动朗读';
                this.speak(message);
                this.showNotification(message, 'success');
            });
        }

        // 暂停/继续按钮
        const pauseResumeBtn = document.getElementById('pauseResumeBtn');
        if (pauseResumeBtn) {
            pauseResumeBtn.addEventListener('click', () => {
                if (this.state.isPaused) {
                    this.resume();
                    pauseResumeBtn.textContent = '⏸️ 暂停';
                } else {
                    this.pause();
                    pauseResumeBtn.textContent = '▶️ 继续';
                }
            });
        }

        // 停止按钮
        const stopBtn = document.getElementById('stopBtn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stop();
            });
        }

        // 重复按钮
        const repeatBtn = document.getElementById('repeatBtn');
        if (repeatBtn) {
            repeatBtn.addEventListener('click', () => {
                this.repeat();
            });
        }

        // 语速滑块
        const speedSlider = document.getElementById('speedSlider');
        const speedValue = document.getElementById('speedValue');
        if (speedSlider && speedValue) {
            speedSlider.addEventListener('input', (e) => {
                this.settings.speed = parseFloat(e.target.value);
                speedValue.textContent = this.settings.speed.toFixed(1);
                speedSlider.setAttribute('aria-valuenow', this.settings.speed);
            });

            speedSlider.addEventListener('change', () => {
                this.speak(`语速已调整为${this.settings.speed.toFixed(1)}倍`);
            });
        }

        // 音量滑块
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeValue = document.getElementById('volumeValue');
        if (volumeSlider && volumeValue) {
            volumeSlider.addEventListener('input', (e) => {
                this.settings.volume = parseInt(e.target.value) / 100;
                volumeValue.textContent = e.target.value;
                volumeSlider.setAttribute('aria-valuenow', e.target.value);
            });

            volumeSlider.addEventListener('change', () => {
                this.speak(`音量已调整为${Math.round(this.settings.volume * 100)}%`);
            });
        }

        // 音调滑块
        const pitchSlider = document.getElementById('pitchSlider');
        const pitchValue = document.getElementById('pitchValue');
        if (pitchSlider && pitchValue) {
            pitchSlider.addEventListener('input', (e) => {
                this.settings.pitch = parseFloat(e.target.value);
                pitchValue.textContent = this.settings.pitch.toFixed(1);
                pitchSlider.setAttribute('aria-valuenow', this.settings.pitch);
            });

            pitchSlider.addEventListener('change', () => {
                this.speak(`音调已调整为${this.settings.pitch.toFixed(1)}`);
            });
        }
    }

    // ==================== 焦点跟踪 ====================

    setupFocusTracking() {
        // 监听所有可聚焦元素的焦点事件
        document.addEventListener('focusin', (e) => {
            const element = e.target;

            // 移除之前的焦点样式
            if (this.state.currentFocusedElement) {
                this.state.currentFocusedElement.classList.remove('focused');
            }

            // 添加新的焦点样式
            this.state.currentFocusedElement = element;

            // 如果是课程卡片，添加焦点样式
            const courseCard = element.closest('.course-card');
            if (courseCard) {
                courseCard.classList.add('focused');
            }

            // 自动朗读焦点元素
            if (this.settings.autoRead) {
                this.readFocusedElement(element);
            }
        });

        // 监听焦点离开
        document.addEventListener('focusout', (e) => {
            const element = e.target;
            const courseCard = element.closest('.course-card');
            if (courseCard) {
                courseCard.classList.remove('focused');
            }
        });
    }

    readFocusedElement(element) {
        let textToRead = '';

        // 根据元素类型决定朗读内容
        if (element.classList.contains('course-card')) {
            textToRead = this.getCourseCardText(element);
        } else if (element.classList.contains('course-button')) {
            const courseCard = element.closest('.course-card');
            if (courseCard) {
                textToRead = this.getCourseCardText(courseCard);
            }
        } else if (element.hasAttribute('aria-label')) {
            textToRead = element.getAttribute('aria-label');
        } else if (element.classList.contains('sr-btn')) {
            textToRead = element.textContent.trim();
        } else {
            textToRead = element.textContent.trim();
        }

        if (textToRead) {
            this.speak(textToRead);
        }
    }

    getCourseCardText(courseCard) {
        const courseId = courseCard.dataset.courseId;
        const title = courseCard.querySelector('.course-title')?.textContent || '';
        const description = courseCard.querySelector('.course-description')?.textContent || '';
        const status = courseCard.querySelector('.course-status-badge')?.textContent || '';

        // 获取课程元数据
        const metaItems = courseCard.querySelectorAll('.meta-item');
        let metaText = '';
        metaItems.forEach(item => {
            metaText += item.textContent.trim() + '。';
        });

        return `课程${courseId}：${title}。${status}。${description}。${metaText}按回车键开始学习。`;
    }

    // ==================== 键盘快捷键 ====================

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Space - 暂停/继续
            if (e.code === 'Space' && !this.isInputElement(e.target)) {
                e.preventDefault();
                if (this.state.isPaused) {
                    this.resume();
                } else {
                    this.pause();
                }
            }

            // R - 重复
            if (e.code === 'KeyR' && !this.isInputElement(e.target)) {
                e.preventDefault();
                this.repeat();
            }

            // S - 停止
            if (e.code === 'KeyS' && !this.isInputElement(e.target)) {
                e.preventDefault();
                this.stop();
            }

            // Enter - 选择课程
            if (e.code === 'Enter' && e.target.classList.contains('course-card')) {
                e.preventDefault();
                this.selectCourse(e.target);
            }
        });
    }

    isInputElement(element) {
        return element.tagName === 'INPUT' ||
               element.tagName === 'TEXTAREA' ||
               element.tagName === 'SELECT' ||
               element.isContentEditable;
    }

    // ==================== 课程选择 ====================

    selectCourse(courseCard) {
        const courseId = courseCard.dataset.courseId;
        const isDisabled = courseCard.classList.contains('disabled');

        if (isDisabled) {
            this.speak('该课程即将推出，敬请期待');
            this.showNotification('该课程即将推出，敬请期待', 'warning');
            return;
        }

        // 课程1可以学习
        if (courseId === '1') {
            this.speak('正在进入AI助手基础入门课程');
            this.showNotification('正在进入课程...', 'success');

            setTimeout(() => {
                window.location.href = 'qianduan.html';
            }, 1500);
        }
    }

    // ==================== UI更新 ====================

    updateVoiceStatus(text, isSpeaking) {
        const statusElement = document.getElementById('voiceStatusText');
        if (statusElement) {
            statusElement.textContent = text;
            if (isSpeaking) {
                statusElement.classList.add('speaking');
            } else {
                statusElement.classList.remove('speaking');
            }
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // ==================== 欢迎语音 ====================

    speakWelcome() {
        setTimeout(() => {
            const welcomeText = '欢迎使用无障碍AI学习平台视障用户模式。' +
                              '智能读屏系统已启动。' +
                              '您可以使用Tab键在课程间导航，按回车键选择课程。' +
                              '按空格键暂停或继续朗读，按R键重复，按S键停止。' +
                              '当前共有3门课程，第1门课程可立即学习。';
            this.speak(welcomeText);
        }, 1000);
    }
}

// ==================== 初始化读屏系统 ====================
let screenReader;

document.addEventListener('DOMContentLoaded', () => {
    // 创建读屏系统实例
    screenReader = new ScreenReader();

    // 为课程卡片添加点击事件
    document.querySelectorAll('.course-card').forEach(card => {
        card.addEventListener('click', () => {
            screenReader.selectCourse(card);
        });

        // 为课程按钮添加点击事件
        const button = card.querySelector('.course-button');
        if (button) {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                screenReader.selectCourse(card);
            });
        }
    });

    console.log('页面加载完成，读屏系统已就绪');
});

// 导出供外部使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScreenReader;
}
