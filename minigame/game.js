/**
 * 八卦立方体 - 微信小游戏
 * 四维超立方体的三维投影 - 时空切片
 * 边长10m的正方体内部视角
 */

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

const sysInfo = wx.getSystemInfoSync();
const W = sysInfo.windowWidth;
const H = sysInfo.windowHeight;
const DPR = sysInfo.pixelRatio;

canvas.width = W * DPR;
canvas.height = H * DPR;

// ==================== 工具函数 ====================

// 美术风格配置
const STYLE = {
  // 主色调
  primary: '#6366f1',      // 靛蓝
  secondary: '#8b5cf6',    // 紫色
  accent: '#f59e0b',       // 琥珀
  danger: '#ef4444',       // 红色
  success: '#22c55e',      // 绿色

  // 背景色
  bgDark: '#0f0f1a',
  bgPanel: 'rgba(15, 15, 30, 0.95)',

  // 发光色
  glowBlue: '#60a5fa',
  glowPurple: '#a78bfa',
  glowGold: '#fbbf24'
};

// 绘制发光效果
function drawGlow(x, y, radius, color, intensity = 1) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color + Math.floor(intensity * 80).toString(16).padStart(2, '0'));
  gradient.addColorStop(0.5, color + Math.floor(intensity * 30).toString(16).padStart(2, '0'));
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

// 绘制圆角矩形
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// 绘制按钮（增强版）
function drawButton(x, y, w, h, text, options = {}) {
  const {
    bgColor = 'rgba(80, 80, 80, 0.9)',
    borderColor = '#888888',
    textColor = '#FFFFFF',
    fontSize = 14,
    fontWeight = 'bold',
    disabled = false,
    gradient = null,
    glow = false,
    pulse = false,
    rounded = 4
  } = options;

  ctx.save();

  // 脉冲动画
  const pulseScale = pulse && !disabled ? 1 + Math.sin(Date.now() / 300) * 0.02 : 1;
  const pulseAlpha = pulse && !disabled ? 0.8 + Math.sin(Date.now() / 300) * 0.2 : 1;

  // 发光效果
  if (glow && !disabled) {
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 15 + Math.sin(Date.now() / 200) * 5;
  }

  // 背景
  roundRect(x, y, w * pulseScale, h, rounded);
  if (gradient && !disabled) {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, gradient[0]);
    grad.addColorStop(1, gradient[1]);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = disabled ? 'rgba(60,60,70,0.7)' : bgColor;
  }
  ctx.fill();

  // 顶部高光
  if (!disabled) {
    roundRect(x, y, w, h / 2, rounded);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fill();
  }

  // 边框
  roundRect(x, y, w, h, rounded);
  ctx.strokeStyle = disabled ? '#444455' : borderColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.shadowBlur = 0;

  // 文字阴影
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.font = `${fontWeight} ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2 + 1, y + h / 2 + 1);

  // 文字
  ctx.fillStyle = disabled ? '#666677' : textColor;
  ctx.globalAlpha = pulseAlpha;
  ctx.fillText(text, x + w / 2, y + h / 2);

  ctx.restore();
  return { x, y, w, h };
}

// 绘制面板背景
function drawPanel(x, y, w, h, options = {}) {
  const { rounded = 8, borderColor = '#333355', glow = false } = options;

  ctx.save();

  if (glow) {
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 20;
  }

  // 背景渐变
  roundRect(x, y, w, h, rounded);
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, 'rgba(25, 25, 45, 0.98)');
  grad.addColorStop(1, 'rgba(15, 15, 30, 0.98)');
  ctx.fillStyle = grad;
  ctx.fill();

  // 边框
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // 内部高光边
  roundRect(x + 1, y + 1, w - 2, h - 2, rounded - 1);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.stroke();

  ctx.restore();
}

// 绘制标题文字（带光效）
function drawTitle(text, x, y, options = {}) {
  const { fontSize = 24, color = '#FFFFFF', glow = true, glowColor = STYLE.glowBlue } = options;

  ctx.save();

  if (glow) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 20;
  }

  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 外发光文字
  ctx.fillStyle = glowColor + '40';
  ctx.fillText(text, x, y);

  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);

  ctx.restore();
}

// 绘制文本（通用）
function drawText(text, x, y, options = {}) {
  const {
    color = '#FFFFFF',
    fontSize = 14,
    fontWeight = '',
    align = 'center',
    baseline = 'middle',
    shadow = false,
    glow = false,
    glowColor = null
  } = options;

  ctx.save();
  ctx.font = `${fontWeight} ${fontSize}px sans-serif`.trim();
  ctx.textAlign = align;
  ctx.textBaseline = baseline;

  if (glow && glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
  }

  if (shadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(text, x + 1, y + 1);
    ctx.shadowBlur = 0;
  }

  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// 绘制进度条
function drawProgressBar(x, y, w, h, progress, options = {}) {
  const { bgColor = '#1a1a2e', fillColor = STYLE.primary, glowColor = STYLE.glowBlue, showGlow = true } = options;

  ctx.save();

  // 背景
  roundRect(x, y, w, h, h / 2);
  ctx.fillStyle = bgColor;
  ctx.fill();

  // 填充
  if (progress > 0) {
    const fillW = Math.max(h, w * Math.min(1, progress));
    roundRect(x, y, fillW, h, h / 2);

    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, fillColor);
    grad.addColorStop(1, shadeColor(fillColor, -30));
    ctx.fillStyle = grad;
    ctx.fill();

    // 高光
    roundRect(x, y, fillW, h / 2, h / 4);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fill();

    // 发光
    if (showGlow) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;
      roundRect(x, y, fillW, h, h / 2);
      ctx.strokeStyle = glowColor + '60';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  ctx.restore();
}

// 颜色变暗/变亮
function shadeColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// 检查游戏状态
function isInGame() {
  return gameState === 'adventure' || gameState === 'dungeon' || gameState === 'boss_intro';
}

// 检查是否可以交互
function canInteract() {
  return !isPaused && !isSelectingSkill && !isSelectingClass && !isWeaponCreating;
}

// ==================== 颜色配置 ====================
const COLOR_BG = '#eef2f7';

// ==================== 音效系统 ====================
let audioContext = null;
let soundEnabled = true;

// 初始化音频上下文
function initAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.log('Web Audio API not supported');
    soundEnabled = false;
  }
}

// 播放音效
function playSound(type) {
  if (!soundEnabled || !audioContext) return;

  // 确保音频上下文是运行状态
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const now = audioContext.currentTime;

  switch (type) {
    case 'attack':
      // 攻击音效：短促的打击声
      playSweep(200, 80, 0.08, 0.3);
      break;
    case 'hit':
      // 击中音效：低沉撞击
      playNoise(0.05, 0.4);
      playTone(100, 0.05, 0.2, 'square');
      break;
    case 'crit':
      // 暴击音效：更响亮的打击
      playSweep(400, 100, 0.1, 0.5);
      playTone(600, 0.05, 0.3, 'sine');
      break;
    case 'hurt':
      // 受伤音效：低频撞击
      playTone(80, 0.15, 0.4, 'sawtooth');
      break;
    case 'kill':
      // 击杀音效：满足的叮声
      playTone(880, 0.08, 0.2, 'sine');
      setTimeout(() => playTone(1100, 0.08, 0.15, 'sine'), 50);
      break;
    case 'levelup':
      // 升级音效：上升音阶
      playTone(440, 0.1, 0.3, 'sine');
      setTimeout(() => playTone(550, 0.1, 0.3, 'sine'), 100);
      setTimeout(() => playTone(660, 0.1, 0.3, 'sine'), 200);
      setTimeout(() => playTone(880, 0.15, 0.4, 'sine'), 300);
      break;
    case 'skill':
      // 技能音效：能量释放
      playSweep(300, 600, 0.15, 0.4);
      playNoise(0.1, 0.2);
      break;
    case 'pickup':
      // 拾取音效：清脆的叮
      playTone(1200, 0.05, 0.2, 'sine');
      break;
    case 'heal':
      // 回血音效：柔和上升
      playTone(400, 0.1, 0.2, 'sine');
      setTimeout(() => playTone(500, 0.1, 0.2, 'sine'), 80);
      break;
    case 'death':
      // 死亡音效：下降音调
      playSweep(400, 80, 0.5, 0.5);
      break;
    case 'start':
      // 开始冒险音效
      playTone(330, 0.1, 0.3, 'sine');
      setTimeout(() => playTone(440, 0.1, 0.3, 'sine'), 100);
      setTimeout(() => playTone(550, 0.15, 0.4, 'sine'), 200);
      break;
  }
}

// 播放单音（应用音效音量）
function playTone(freq, duration, volume, type = 'sine') {
  if (!audioContext) return;
  const adjustedVolume = volume * soundVolume;
  if (adjustedVolume < 0.01) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(adjustedVolume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + duration);
}

// 播放扫频（应用音效音量）
function playSweep(startFreq, endFreq, duration, volume) {
  if (!audioContext) return;
  const adjustedVolume = volume * soundVolume;
  if (adjustedVolume < 0.01) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(startFreq, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, audioContext.currentTime + duration);
  gain.gain.setValueAtTime(adjustedVolume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + duration);
}

// 播放噪声（应用音效音量）
function playNoise(duration, volume) {
  if (!audioContext) return;
  const adjustedVolume = volume * soundVolume;
  if (adjustedVolume < 0.01) return;
  const bufferSize = audioContext.sampleRate * duration;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  noise.buffer = buffer;
  gain.gain.setValueAtTime(adjustedVolume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  noise.connect(gain);
  gain.connect(audioContext.destination);
  noise.start();
}

// 切换音效
function toggleSound() {
  soundEnabled = !soundEnabled;
  if (soundEnabled && !audioContext) {
    initAudio();
  }
  return soundEnabled;
}

// ==================== 程序化背景音乐系统 ====================
let musicEnabled = true;
let musicVolume = 0.15;
let soundVolume = 0.5;  // 音效音量
let currentMusicMode = 'idle'; // 'idle' | 'combat'
let musicScheduler = null;
let musicNodes = [];
let nextNoteTime = 0;
let currentBeat = 0;

// 音量等级 (0-4 对应 0%, 25%, 50%, 75%, 100%)
const VOLUME_LEVELS = [0, 0.25, 0.5, 0.75, 1.0];
let musicVolumeLevel = 2;  // 默认50%
let soundVolumeLevel = 3;  // 默认75%

// 设置音乐音量等级
function setMusicVolumeLevel(level) {
  musicVolumeLevel = Math.max(0, Math.min(4, level));
  musicVolume = 0.15 * VOLUME_LEVELS[musicVolumeLevel];
  saveAudioSettings();
}

// 设置音效音量等级
function setSoundVolumeLevel(level) {
  soundVolumeLevel = Math.max(0, Math.min(4, level));
  soundVolume = VOLUME_LEVELS[soundVolumeLevel];
  saveAudioSettings();
}

// 保存音频设置
function saveAudioSettings() {
  try {
    wx.setStorageSync('audioSettings', {
      musicEnabled,
      soundEnabled,
      musicVolumeLevel,
      soundVolumeLevel
    });
  } catch (e) {
    console.log('保存音频设置失败');
  }
}

// 加载音频设置
function loadAudioSettings() {
  try {
    const settings = wx.getStorageSync('audioSettings');
    if (settings) {
      musicEnabled = settings.musicEnabled !== false;
      soundEnabled = settings.soundEnabled !== false;
      musicVolumeLevel = settings.musicVolumeLevel ?? 2;
      soundVolumeLevel = settings.soundVolumeLevel ?? 3;
      musicVolume = 0.15 * VOLUME_LEVELS[musicVolumeLevel];
      soundVolume = VOLUME_LEVELS[soundVolumeLevel];
    }
  } catch (e) {
    console.log('加载音频设置失败');
  }
}

// 五声音阶 - 宫商角徵羽 (更有东方韵味)
const PENTATONIC_IDLE = [261.63, 293.66, 329.63, 392.00, 440.00]; // C D E G A
const PENTATONIC_COMBAT = [329.63, 392.00, 440.00, 523.25, 587.33]; // E G A C5 D5

// 待机模式节奏模式（16拍循环，0=休止，1-5=音阶位置）
const IDLE_PATTERN = [
  1, 0, 3, 0, 2, 0, 5, 0, 4, 0, 3, 0, 2, 0, 1, 0,
  3, 0, 5, 0, 4, 0, 2, 0, 3, 0, 1, 0, 2, 0, 3, 0
];

// 战斗模式节奏模式（更快更紧张）
const COMBAT_PATTERN = [
  1, 3, 0, 2, 4, 0, 3, 5, 1, 0, 4, 2, 0, 3, 5, 1,
  2, 4, 1, 3, 0, 5, 2, 4, 1, 3, 5, 0, 2, 4, 1, 3
];

// 低音伴奏模式
const BASS_IDLE = [1, 0, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 5, 0, 0, 0];
const BASS_COMBAT = [1, 0, 1, 0, 3, 0, 1, 0, 2, 0, 2, 0, 4, 0, 2, 0];

// 播放音乐音符
function playMusicNote(freq, duration, volume, type = 'sine', detune = 0) {
  if (!audioContext || !musicEnabled) return null;

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;

  // 柔和的 ADSR 包络
  const now = audioContext.currentTime;
  const attackTime = 0.02;
  const decayTime = 0.1;
  const sustainLevel = volume * 0.6;
  const releaseTime = duration * 0.3;

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + attackTime);
  gain.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
  gain.gain.setValueAtTime(sustainLevel, now + duration - releaseTime);
  gain.gain.linearRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);

  return { osc, gain };
}

// 调度下一个音符
function scheduleNextNote() {
  if (!audioContext || !musicEnabled) return;

  const pattern = currentMusicMode === 'combat' ? COMBAT_PATTERN : IDLE_PATTERN;
  const scale = currentMusicMode === 'combat' ? PENTATONIC_COMBAT : PENTATONIC_IDLE;
  const bassPattern = currentMusicMode === 'combat' ? BASS_COMBAT : BASS_IDLE;
  const tempo = currentMusicMode === 'combat' ? 0.15 : 0.25; // 每拍时长

  const patternIndex = currentBeat % pattern.length;
  const noteValue = pattern[patternIndex];
  const bassValue = bassPattern[patternIndex % bassPattern.length];

  // 主旋律
  if (noteValue > 0) {
    const freq = scale[noteValue - 1];
    // 添加轻微随机变化
    const variation = 1 + (Math.random() - 0.5) * 0.02;
    playMusicNote(freq * variation, tempo * 0.8, musicVolume, 'sine', Math.random() * 5);
  }

  // 低音伴奏（每4拍一次）
  if (bassValue > 0 && patternIndex % 4 === 0) {
    const bassFreq = scale[bassValue - 1] / 2; // 低八度
    playMusicNote(bassFreq, tempo * 1.5, musicVolume * 0.5, 'triangle');
  }

  // 战斗模式添加鼓点
  if (currentMusicMode === 'combat' && patternIndex % 4 === 0) {
    playNoise(0.05, musicVolume * 0.3);
  }

  currentBeat++;
  nextNoteTime += tempo;
}

// 音乐调度循环
function musicLoop() {
  if (!musicEnabled || !audioContext) {
    musicScheduler = null;
    return;
  }

  // 确保音频上下文运行
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  // 提前调度音符以保持流畅
  while (nextNoteTime < audioContext.currentTime + 0.1) {
    scheduleNextNote();
  }

  musicScheduler = setTimeout(musicLoop, 50);
}

// 开始播放音乐
function startMusic(mode = 'idle') {
  if (!audioContext) {
    initAudio();
  }
  if (!audioContext) return;

  currentMusicMode = mode;

  if (!musicScheduler) {
    nextNoteTime = audioContext.currentTime;
    currentBeat = 0;
    musicLoop();
  }
}

// 停止音乐
function stopMusic() {
  if (musicScheduler) {
    clearTimeout(musicScheduler);
    musicScheduler = null;
  }
  currentBeat = 0;
}

// 切换音乐模式
function setMusicMode(mode) {
  if (currentMusicMode !== mode) {
    currentMusicMode = mode;
    // 模式切换时重置节拍，让音乐自然过渡
    currentBeat = 0;
  }
}

// 切换音乐开关
function toggleMusic() {
  musicEnabled = !musicEnabled;
  if (musicEnabled) {
    startMusic(currentMusicMode);
  } else {
    stopMusic();
  }
  return musicEnabled;
}

function getNodeColor(bits) {
  let ones = 0;
  for (const c of bits) if (c === '1') ones++;
  const gray = Math.round(255 * (1 - ones / 3));
  return `rgb(${gray},${gray},${gray})`;
}

function getEdgeColor(val) {
  return val === 0 ? '#FFFFFF' : '#000000';
}

// ==================== 八卦数据 ====================
const bitsToName = {
  '000': '乾', '001': '兑', '010': '离', '011': '震',
  '100': '巽', '101': '坎', '110': '艮', '111': '坤'
};

const trigramPos = {};
const trigramBits = ['000', '001', '010', '011', '100', '101', '110', '111'];

for (const bits of trigramBits) {
  const b0 = bits[0], b1 = bits[1], b2 = bits[2];
  const x = (b2 === '1') ? 1 : -1;
  const y = (b0 === '1') ? 1 : -1;
  const z = (b1 === '1') ? 1 : -1;
  trigramPos[bits] = { x, y, z, bits, name: bitsToName[bits] };
}

// 边
const edges = [];
for (let i = 0; i < trigramBits.length; i++) {
  for (let j = i + 1; j < trigramBits.length; j++) {
    const a = trigramBits[i];
    const b = trigramBits[j];
    let diffBit = -1;
    let diffCount = 0;
    for (let k = 0; k < 3; k++) {
      if (a[k] !== b[k]) {
        diffBit = k;
        diffCount++;
      }
    }
    if (diffCount === 1) {
      const val = parseInt(a[diffBit]);
      edges.push({ a, b, diffBit, val });
    }
  }
}

// 宫位对
const palacePairs = {
  '乾': ['000', '111'], '坤': ['111', '000'],
  '兑': ['001', '110'], '艮': ['110', '001'],
  '离': ['010', '101'], '坎': ['101', '010'],
  '震': ['011', '100'], '巽': ['100', '011']
};

let currentPalace = '艮';
let selectedPalace = '艮'; // 冒险时选择的宫位

function getFrontBits() { return palacePairs[currentPalace][0]; }
function getBackBits() { return palacePairs[currentPalace][1]; }

// ==================== 向量运算 ====================
function vecSub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function vecLength(v) { return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); }
function vecNorm(v) { const L = vecLength(v) || 1; return { x: v.x / L, y: v.y / L, z: v.z / L }; }

function neighborBitsForUp(bits) {
  const b0 = bits[0], b1 = bits[1], b2 = bits[2];
  const flipped = b1 === '0' ? '1' : '0';
  return '' + b0 + flipped + b2;
}

function basisForPalace(frontBits, backBits) {
  const pA = trigramPos[frontBits];
  const pB = trigramPos[backBits];
  const forward = vecNorm(vecSub(pB, pA));

  const qBits = neighborBitsForUp(frontBits);
  const q = trigramPos[qBits];
  let upCand = vecSub(q, pA);
  const projLen = upCand.x * forward.x + upCand.y * forward.y + upCand.z * forward.z;
  upCand = { x: upCand.x - forward.x * projLen, y: upCand.y - forward.y * projLen, z: upCand.z - forward.z * projLen };
  const up = vecNorm(upCand);

  let right = {
    x: up.y * forward.z - up.z * forward.y,
    y: up.z * forward.x - up.x * forward.z,
    z: up.x * forward.y - up.y * forward.x
  };
  right = vecNorm(right);

  return [right.x, right.y, right.z, up.x, up.y, up.z, forward.x, forward.y, forward.z];
}

const palaceBases = {};
for (const name in palacePairs) {
  const [f, b] = palacePairs[name];
  palaceBases[name] = basisForPalace(f, b);
}

// ==================== 3D 变换 ====================
let rotX = 0, rotY = 0, rotZ = Math.PI;
const zoom = 1.0;

function applyPalaceMat(p) {
  const m = palaceBases[currentPalace];
  if (!m) return p;
  return {
    x: m[0] * p.x + m[1] * p.y + m[2] * p.z,
    y: m[3] * p.x + m[4] * p.y + m[5] * p.z,
    z: m[6] * p.x + m[7] * p.y + m[8] * p.z
  };
}

function rotate3D(p) {
  let v = applyPalaceMat(p);
  let x = v.x * zoom, y = v.y * zoom, z = v.z * zoom;
  const cy = Math.cos(rotY), sy = Math.sin(rotY);
  let x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
  const cx = Math.cos(rotX), sx = Math.sin(rotX);
  let y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
  const cz = Math.cos(rotZ), sz = Math.sin(rotZ);
  let x3 = x1 * cz - y2 * sz, y3 = x1 * sz + y2 * cz;
  return { x: x3, y: y3, z: z2 };
}

function project(p) {
  const pr = rotate3D(p);
  const scale = Math.min(W, H) * 0.25;
  return { x: pr.x * scale + W / 2, y: -pr.y * scale + H / 2, z: pr.z };
}

let projCache = new Map();

function updateProjCache() {
  projCache.clear();
  for (const bits in trigramPos) {
    projCache.set(bits, project(trigramPos[bits]));
  }
}

// ==================== 动画状态 ====================
let walkTime = 0;
const CUBE_SIZE = 10;
let sceneOffset = 0;
let stickManSpeed = 0.7;
let targetSpeed = 0.7;
const SPEED_LERP = 0.05;
const BASE_SCENE_SPEED = 0.004;

const poseState = { facing: 0, initialized: false };

function lerp(a, b, t) { return a + (b - a) * t; }

function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

// ==================== 角色系统 ====================
// 默认角色（10级前使用较强基础属性，便于新手生存）
const DEFAULT_CHARACTER = {
  name: '火柴人',
  color: '#666666',
  stats: {
    hp: 120,      // 提高初始生命
    spd: 0.8,     // 移速
    dmg: 8,       // 基础伤害
    atkSpd: 0.6,  // 较快攻速
    range: 0.15,  // 攻击范围
    luck: 3,      // 基础暴击
    healRate: 1   // 基础回血
  },
  weapon: 'none',
  armor: 'none',
  description: '普通的火柴人'
};

// 职阶系统（10级后解锁）
// 参考以撒的结合设计：HP、移速、伤害、攻速、射程、幸运
const CLASS_TYPES = {
  warrior: {
    name: '战士',
    color: '#C62828',
    stats: {
      hp: 100,      // 生命值
      spd: 0.8,     // 移速 (1.0为基准)
      dmg: 12,      // 伤害
      atkSpd: 0.6,  // 攻速 (秒/次，越小越快)
      range: 0.15,  // 攻击范围
      luck: 5       // 幸运(暴击率%)
    },
    weapon: 'sword',
    armor: 'heavy',
    description: '均衡近战，高生命'
  },
  mage: {
    name: '法师',
    color: '#5E35B1',
    stats: {
      hp: 60,
      spd: 0.7,
      dmg: 18,      // 高伤害
      atkSpd: 0.8,  // 攻击慢
      range: 0.25,  // 远程
      luck: 3
    },
    weapon: 'staff',
    armor: 'robe',
    description: '脆皮高伤，远程攻击'
  },
  archer: {
    name: '弓箭手',
    color: '#2E7D32',
    stats: {
      hp: 70,
      spd: 1.0,     // 标准速度
      dmg: 10,
      atkSpd: 0.4,  // 攻击快
      range: 0.22,  // 远程
      luck: 8
    },
    weapon: 'bow',
    armor: 'light',
    description: '灵活远程，高攻速'
  },
  assassin: {
    name: '刺客',
    color: '#37474F',
    stats: {
      hp: 50,       // 最脆
      spd: 1.3,     // 最快
      dmg: 15,      // 高伤害
      atkSpd: 0.35, // 最快攻速
      range: 0.12,  // 近战
      luck: 20      // 高暴击
    },
    weapon: 'dagger',
    armor: 'light',
    description: '高速高暴击，极脆'
  },
  priest: {
    name: '牧师',
    color: '#FDD835',
    stats: {
      hp: 80,
      spd: 0.85,
      dmg: 6,       // 低伤害
      atkSpd: 0.7,
      range: 0.18,
      luck: 10,
      healRate: 2   // 每秒回血
    },
    weapon: 'wand',
    armor: 'robe',
    description: '持续回血，低伤害'
  },
  knight: {
    name: '骑士',
    color: '#1565C0',
    stats: {
      hp: 150,      // 最高血量
      spd: 0.6,     // 最慢
      dmg: 10,
      atkSpd: 0.8,  // 攻击慢
      range: 0.18,
      luck: 3,
      armor: 30     // 减伤%
    },
    weapon: 'lance',
    armor: 'heavy',
    description: '超高血量，移速极慢'
  }
};

let currentClass = 'none'; // 10级前无职业
let playerLevel = 1;
let playerExp = 0;
let expToNext = 60;  // 第一级只需60经验（3只僵尸）

// ==================== 技能系统 ====================
// 基于八卦设计的技能系统
// 八卦：乾(天)、坤(地)、震(雷)、巽(风)、坎(水)、离(火)、艮(山)、兑(泽)

// 宫位属性加成
const PALACE_BONUS = {
  '乾': { dmg: 1.2, luck: 5, description: '天之力：伤害+20%，暴击+5%' },
  '坤': { hp: 1.3, armor: 10, description: '地之护：生命+30%，护甲+10' },
  '震': { atkSpd: 0.8, spd: 1.15, description: '雷之速：攻速+20%，移速+15%' },
  '巽': { range: 1.2, spd: 1.1, description: '风之翼：射程+20%，移速+10%' },
  '坎': { healRate: 3, hp: 1.1, description: '水之愈：回血+3/秒，生命+10%' },
  '离': { dmg: 1.15, atkSpd: 0.9, description: '火之怒：伤害+15%，攻速+10%' },
  '艮': { armor: 20, hp: 1.2, description: '山之固：护甲+20，生命+20%' },
  '兑': { luck: 10, dmg: 1.1, description: '泽之泽：暴击+10%，伤害+10%' }
};

const SKILL_POOL = {
  // ===== 乾卦 ☰ 天 =====
  tianwei: {
    name: '天威',
    trigram: '乾',
    trigramName: '天',
    type: 'active',
    icon: '☰',
    color: '#FFD700',
    description: '天降神威，对周围敌人造成大量伤害',
    cooldown: 8,
    damage: 50,
    effect: 'spin_attack'
  },
  tiandao: {
    name: '天道',
    trigram: '乾',
    trigramName: '天',
    type: 'passive',
    icon: '👑',
    color: '#FFD700',
    description: '天命所归，每次攻击有概率造成双倍伤害',
    critBonus: 15,
    effect: 'crit_boost'
  },

  // ===== 坤卦 ☷ 地 =====
  dizhao: {
    name: '地召',
    trigram: '坤',
    trigramName: '地',
    type: 'active',
    icon: '☷',
    color: '#8B4513',
    description: '召唤大地之力，获得护盾抵挡伤害',
    cooldown: 12,
    duration: 3,
    effect: 'invincible'
  },
  dimai: {
    name: '地脉',
    trigram: '坤',
    trigramName: '地',
    type: 'passive',
    icon: '🏔️',
    color: '#8B4513',
    description: '大地滋养，持续恢复生命值',
    healRate: 2,
    effect: 'passive_heal'
  },

  // ===== 震卦 ☳ 雷 =====
  leiting: {
    name: '雷霆',
    trigram: '震',
    trigramName: '雷',
    type: 'active',
    icon: '☳',
    color: '#9400D3',
    description: '召唤雷霆，对前方敌人造成连锁伤害',
    cooldown: 5,
    damage: 35,
    effect: 'laser_beam'
  },
  leishen: {
    name: '雷神',
    trigram: '震',
    trigramName: '雷',
    type: 'passive',
    icon: '⚡',
    color: '#9400D3',
    description: '雷神庇佑，攻击速度大幅提升',
    atkSpdBoost: 0.3,
    effect: 'attack_speed_boost'
  },

  // ===== 巽卦 ☴ 风 =====
  fengren: {
    name: '风刃',
    trigram: '巽',
    trigramName: '风',
    type: 'active',
    icon: '☴',
    color: '#00CED1',
    description: '发射风刃，穿透多个敌人',
    cooldown: 3,
    damage: 25,
    effect: 'projectile_cdr'
  },
  fengxing: {
    name: '风行',
    trigram: '巽',
    trigramName: '风',
    type: 'active',
    icon: '🌬️',
    color: '#00CED1',
    description: '化身为风，瞬间移动一段距离',
    cooldown: 8,
    effect: 'blink'
  },

  // ===== 坎卦 ☵ 水 =====
  shuibo: {
    name: '水波',
    trigram: '坎',
    trigramName: '水',
    type: 'active',
    icon: '☵',
    color: '#1E90FF',
    description: '释放水波，减缓周围敌人速度',
    cooldown: 10,
    duration: 2,
    effect: 'root_aoe'
  },
  shuiyuan: {
    name: '水源',
    trigram: '坎',
    trigramName: '水',
    type: 'passive',
    icon: '💧',
    color: '#1E90FF',
    description: '水之治愈，受伤时恢复生命',
    healOnHit: 5,
    effect: 'lifesteal'
  },

  // ===== 离卦 ☲ 火 =====
  lieyan: {
    name: '烈焰',
    trigram: '离',
    trigramName: '火',
    type: 'active',
    icon: '☲',
    color: '#FF4500',
    description: '释放烈焰，灼烧周围所有敌人',
    cooldown: 6,
    damage: 40,
    effect: 'spin_attack'
  },
  huoling: {
    name: '火灵',
    trigram: '离',
    trigramName: '火',
    type: 'passive',
    icon: '🔥',
    color: '#FF4500',
    description: '火焰附体，攻击附带灼烧效果',
    burnDamage: 5,
    effect: 'burn_attack'
  },

  // ===== 艮卦 ☶ 山 =====
  shanshi: {
    name: '山石',
    trigram: '艮',
    trigramName: '山',
    type: 'active',
    icon: '☶',
    color: '#A0522D',
    description: '召唤巨石，砸向最近的敌人',
    cooldown: 7,
    damage: 45,
    effect: 'hook_pull'
  },
  shanzhen: {
    name: '山镇',
    trigram: '艮',
    trigramName: '山',
    type: 'passive',
    icon: '🛡️',
    color: '#A0522D',
    description: '山之坚固，减少受到的伤害',
    damageReduction: 15,
    effect: 'armor_stacking'
  },

  // ===== 兑卦 ☱ 泽 =====
  zezhao: {
    name: '泽沼',
    trigram: '兑',
    trigramName: '泽',
    type: 'active',
    icon: '☱',
    color: '#32CD32',
    description: '创造沼泽，困住踏入的敌人',
    cooldown: 10,
    damage: 30,
    duration: 5,
    effect: 'place_trap'
  },
  zelu: {
    name: '泽露',
    trigram: '兑',
    trigramName: '泽',
    type: 'passive',
    icon: '✨',
    color: '#32CD32',
    description: '泽之恩惠，击杀敌人恢复生命',
    healOnKill: 15,
    effect: 'kill_heal'
  }
};

// ==================== 技能进化系统 ====================
// 当同一卦象的两个技能都获得时，可以合成为终极技能
const SKILL_EVOLUTIONS = {
  // 乾卦进化：天威 + 天道 = 天罚
  qian_ultimate: {
    name: '天罚',
    trigram: '乾',
    trigramName: '天',
    type: 'evolved',
    icon: '⚡️',
    color: '#FFD700',
    rarity: 'legendary',
    description: '【终极】天罚降临，全屏闪电风暴',
    cooldown: 15,
    damage: 100,
    effect: 'sky_judgement',
    requires: ['tianwei', 'tiandao'],
    bonusStats: { critBonus: 25, dmg: 1.3 }
  },

  // 坤卦进化：地召 + 地脉 = 山河
  kun_ultimate: {
    name: '山河',
    trigram: '坤',
    trigramName: '地',
    type: 'evolved',
    icon: '🌍',
    color: '#8B4513',
    rarity: 'legendary',
    description: '【终极】山河永固，超强护盾+持续回血',
    cooldown: 20,
    duration: 5,
    effect: 'earth_fortress',
    requires: ['dizhao', 'dimai'],
    bonusStats: { armor: 50, healRate: 5 }
  },

  // 震卦进化：雷霆 + 雷神 = 雷劫
  zhen_ultimate: {
    name: '雷劫',
    trigram: '震',
    trigramName: '雷',
    type: 'evolved',
    icon: '🌩️',
    color: '#9400D3',
    rarity: 'legendary',
    description: '【终极】九天雷劫，连续落雷毁灭敌人',
    cooldown: 12,
    damage: 60,
    hitCount: 5,
    effect: 'thunder_calamity',
    requires: ['leiting', 'leishen'],
    bonusStats: { atkSpdBoost: 0.5 }
  },

  // 巽卦进化：风刃 + 风行 = 风暴
  xun_ultimate: {
    name: '风暴',
    trigram: '巽',
    trigramName: '风',
    type: 'evolved',
    icon: '🌪️',
    color: '#00CED1',
    rarity: 'legendary',
    description: '【终极】狂风席卷，吸引并撕裂敌人',
    cooldown: 10,
    damage: 45,
    duration: 3,
    effect: 'tornado',
    requires: ['fengren', 'fengxing'],
    bonusStats: { spd: 1.3, range: 1.3 }
  },

  // 坎卦进化：水波 + 水源 = 洪流
  kan_ultimate: {
    name: '洪流',
    trigram: '坎',
    trigramName: '水',
    type: 'evolved',
    icon: '🌊',
    color: '#1E90FF',
    rarity: 'legendary',
    description: '【终极】洪水滔天，治愈自身并淹没敌人',
    cooldown: 14,
    damage: 50,
    healAmount: 50,
    effect: 'great_flood',
    requires: ['shuibo', 'shuiyuan'],
    bonusStats: { healRate: 8, hp: 1.2 }
  },

  // 离卦进化：烈焰 + 火灵 = 焚天
  li_ultimate: {
    name: '焚天',
    trigram: '离',
    trigramName: '火',
    type: 'evolved',
    icon: '☀️',
    color: '#FF4500',
    rarity: 'legendary',
    description: '【终极】焚天烈火，持续灼烧整个战场',
    cooldown: 12,
    damage: 30,
    duration: 5,
    effect: 'inferno',
    requires: ['lieyan', 'huoling'],
    bonusStats: { dmg: 1.4, burnDamage: 10 }
  },

  // 艮卦进化：山石 + 山镇 = 镇岳
  gen_ultimate: {
    name: '镇岳',
    trigram: '艮',
    trigramName: '山',
    type: 'evolved',
    icon: '⛰️',
    color: '#A0522D',
    rarity: 'legendary',
    description: '【终极】五岳镇世，召唤山岳碾压敌人',
    cooldown: 16,
    damage: 80,
    stunDuration: 2,
    effect: 'mountain_crush',
    requires: ['shanshi', 'shanzhen'],
    bonusStats: { armor: 40, damageReduction: 25 }
  },

  // 兑卦进化：泽沼 + 泽露 = 泽润
  dui_ultimate: {
    name: '泽润',
    trigram: '兑',
    trigramName: '泽',
    type: 'evolved',
    icon: '🌈',
    color: '#32CD32',
    rarity: 'legendary',
    description: '【终极】泽被苍生，击杀回血+持续陷阱',
    cooldown: 8,
    damage: 40,
    healOnKill: 30,
    effect: 'blessing_swamp',
    requires: ['zezhao', 'zelu'],
    bonusStats: { luck: 20, healOnKill: 25 }
  }
};

// 检查是否可以进化
function checkEvolutionAvailable() {
  const ownedSkillIds = [...playerSkills.map(s => s.id)];
  if (playerPassive) ownedSkillIds.push(playerPassive.id);

  for (const [evoId, evolution] of Object.entries(SKILL_EVOLUTIONS)) {
    if (evolution.requires.every(req => ownedSkillIds.includes(req))) {
      // 检查是否已经进化过
      if (!playerSkills.some(s => s.id === evoId)) {
        return { id: evoId, ...evolution };
      }
    }
  }
  return null;
}

// 进化状态
let pendingEvolution = null;
let showEvolutionNotice = false;
let evolutionNoticeTimer = 0;

// 玩家技能槽
let playerSkills = []; // 最多4个主动技能
let playerPassive = null; // 1个被动技能
let skillCooldowns = {}; // 技能冷却计时器

// 技能强化系统（卦象叠加）
let skillEnhancements = {}; // 技能强化等级 { skillId: level } (0-3)
const MAX_ENHANCEMENT_LEVEL = 3; // 最大强化等级
const ENHANCEMENT_MULTIPLIERS = [1.0, 1.3, 1.7, 2.2]; // 各等级伤害倍率

// 强化连携效果定义（每个技能的独特强化效果）
const ENHANCEMENT_EFFECTS = {
  // ===== 乾卦 天 =====
  tianwei: {
    1: { name: '雷震', desc: '攻击附带眩晕', effect: 'stun', value: 0.5 },
    2: { name: '连锁雷', desc: '雷电链式伤害', effect: 'chain', value: 3 },
    3: { name: '天罚', desc: '触发全屏雷击', effect: 'sky_strike', value: 50 }
  },
  tiandao: {
    1: { name: '天命', desc: '暴击额外+10%', effect: 'crit_bonus', value: 10 },
    2: { name: '天威', desc: '暴击伤害+50%', effect: 'crit_dmg', value: 0.5 },
    3: { name: '天帝', desc: '暴击恢复生命', effect: 'crit_heal', value: 10 }
  },
  // ===== 坤卦 地 =====
  dizhao: {
    1: { name: '地刺', desc: '护盾反弹伤害', effect: 'reflect', value: 0.3 },
    2: { name: '地震', desc: '护盾破时震击', effect: 'shield_burst', value: 30 },
    3: { name: '大地之力', desc: '护盾后增伤50%', effect: 'empower', value: 0.5 }
  },
  dimai: {
    1: { name: '厚土', desc: '回血+50%', effect: 'heal_bonus', value: 0.5 },
    2: { name: '地脉涌动', desc: '低血时回血翻倍', effect: 'emergency_heal', value: 2 },
    3: { name: '大地庇护', desc: '受伤减免15%', effect: 'damage_reduce', value: 0.15 }
  },
  // ===== 震卦 雷 =====
  leiting: {
    1: { name: '麻痹', desc: '命中减速敌人', effect: 'slow', value: 0.5 },
    2: { name: '雷链', desc: '弹射3个敌人', effect: 'bounce', value: 3 },
    3: { name: '雷云', desc: '召唤持续落雷', effect: 'thunder_cloud', value: 3 }
  },
  leishen: {
    1: { name: '疾雷', desc: '攻速额外+15%', effect: 'atk_spd', value: 0.15 },
    2: { name: '雷霆一击', desc: '每5击必暴', effect: 'guaranteed_crit', value: 5 },
    3: { name: '雷神降临', desc: '攻击附带雷伤', effect: 'lightning_dmg', value: 15 }
  },
  // ===== 巽卦 风 =====
  fengren: {
    1: { name: '锐风', desc: '穿透数+1', effect: 'pierce', value: 1 },
    2: { name: '回旋刃', desc: '风刃返回', effect: 'boomerang', value: true },
    3: { name: '风暴', desc: '形成追踪龙卷', effect: 'tornado', value: 3 }
  },
  fengxing: {
    1: { name: '疾风', desc: '闪现距离+30%', effect: 'blink_range', value: 0.3 },
    2: { name: '残影', desc: '留下伤害残影', effect: 'afterimage', value: 20 },
    3: { name: '风遁', desc: '闪现后无敌1秒', effect: 'blink_invuln', value: 1 }
  },
  // ===== 坎卦 水 =====
  shuibo: {
    1: { name: '寒冰', desc: '减速效果+30%', effect: 'slow_bonus', value: 0.3 },
    2: { name: '冰封', desc: '几率冻结敌人', effect: 'freeze', value: 0.2 },
    3: { name: '海啸', desc: '击退并造成伤害', effect: 'tsunami', value: 40 }
  },
  shuiyuan: {
    1: { name: '甘露', desc: '受伤回血+50%', effect: 'lifesteal_bonus', value: 0.5 },
    2: { name: '治愈之泉', desc: '周围队友也回血', effect: 'aoe_heal', value: true },
    3: { name: '生命涌泉', desc: '低血时大量回复', effect: 'emergency_burst', value: 30 }
  },
  // ===== 离卦 火 =====
  lieyan: {
    1: { name: '灼烧', desc: '附加持续伤害', effect: 'burn', value: 5 },
    2: { name: '爆燃', desc: '低血敌人+50%伤', effect: 'execute', value: 0.5 },
    3: { name: '烈焰风暴', desc: '火焰持续燃烧', effect: 'fire_storm', value: 3 }
  },
  huoling: {
    1: { name: '炎附', desc: '灼烧伤害+50%', effect: 'burn_bonus', value: 0.5 },
    2: { name: '引燃', desc: '灼烧可传播', effect: 'spread_burn', value: true },
    3: { name: '浴火', desc: '击杀回复生命', effect: 'kill_heal', value: 20 }
  },
  // ===== 艮卦 山 =====
  shanshi: {
    1: { name: '震击', desc: '命中眩晕0.5秒', effect: 'stun', value: 0.5 },
    2: { name: '落石', desc: '额外召唤2块石', effect: 'multi_rock', value: 2 },
    3: { name: '山崩', desc: '大范围震荡', effect: 'earthquake', value: 60 }
  },
  shanzhen: {
    1: { name: '坚壁', desc: '减伤额外+10%', effect: 'armor_bonus', value: 10 },
    2: { name: '磐石', desc: '低血时减伤翻倍', effect: 'last_stand', value: 2 },
    3: { name: '不动如山', desc: '免疫控制效果', effect: 'cc_immune', value: true }
  },
  // ===== 兑卦 泽 =====
  zezhao: {
    1: { name: '泥沼', desc: '陷阱范围+30%', effect: 'trap_size', value: 0.3 },
    2: { name: '爆裂', desc: '陷阱结束时爆炸', effect: 'trap_explode', value: 25 },
    3: { name: '连环阱', desc: '自动放置多陷阱', effect: 'multi_trap', value: 3 }
  },
  zelu: {
    1: { name: '恩泽', desc: '击杀回血+50%', effect: 'kill_heal_bonus', value: 0.5 },
    2: { name: '生机', desc: '击杀回蓝', effect: 'kill_mp', value: 10 },
    3: { name: '泽被苍生', desc: '击杀全屏回血', effect: 'aoe_kill_heal', value: 10 }
  }
};

// 获取技能强化效果描述
function getEnhancementEffectDesc(skillId, level) {
  const effects = ENHANCEMENT_EFFECTS[skillId];
  if (!effects || !effects[level]) return null;
  return effects[level];
}

// 获取技能所有已解锁的强化效果
function getActiveEnhancementEffects(skillId) {
  const level = getSkillEnhancement(skillId);
  const effects = [];
  for (let i = 1; i <= level; i++) {
    const effect = getEnhancementEffectDesc(skillId, i);
    if (effect) effects.push(effect);
  }
  return effects;
}

// 检查技能是否有特定强化效果
function hasEnhancementEffect(skillId, effectName) {
  const effects = getActiveEnhancementEffects(skillId);
  return effects.some(e => e.effect === effectName);
}

// 获取强化效果的值
function getEnhancementEffectValue(skillId, effectName) {
  const effects = getActiveEnhancementEffects(skillId);
  const effect = effects.find(e => e.effect === effectName);
  return effect ? effect.value : 0;
}

// 应用强化效果 - 触发额外特效
function applyEnhancementEffects(skill, targets) {
  const skillId = skill.id;
  const level = getSkillEnhancement(skillId);
  if (level === 0) return;

  const effects = getActiveEnhancementEffects(skillId);

  for (const effect of effects) {
    switch (effect.effect) {
      case 'stun':
        // 眩晕效果 - 减速敌人
        for (const target of targets) {
          target.stunTimer = (target.stunTimer || 0) + effect.value;
        }
        break;

      case 'chain':
        // 连锁伤害
        createChainLightning(targets, effect.value, skill.damage * 0.5);
        break;

      case 'sky_strike':
        // 全屏雷击
        createSkyStrike(effect.value);
        break;

      case 'burn':
        // 灼烧持续伤害
        for (const target of targets) {
          target.burnDamage = effect.value;
          target.burnTimer = 3;
        }
        break;

      case 'execute':
        // 斩杀效果 - 低血敌人额外伤害
        for (const target of targets) {
          if (target.hp < target.maxHp * 0.3) {
            const extraDmg = Math.floor(skill.damage * effect.value);
            target.hp -= extraDmg;
            createDamageNumber(target.x, target.y, extraDmg, '#FF6600');
          }
        }
        break;

      case 'fire_storm':
        // 火焰风暴
        createFireStorm(playerX, playerY, effect.value);
        break;

      case 'slow':
        // 减速效果
        for (const target of targets) {
          target.slowTimer = (target.slowTimer || 0) + 2;
          target.slowAmount = Math.max(target.slowAmount || 0, effect.value);
        }
        break;

      case 'bounce':
        // 弹射效果
        createBounceDamage(targets[0], effect.value, skill.damage * 0.7);
        break;

      case 'thunder_cloud':
        // 雷云
        createThunderCloud(playerX, playerY, effect.value);
        break;

      case 'freeze':
        // 冻结效果
        for (const target of targets) {
          if (Math.random() < effect.value) {
            target.freezeTimer = 1.5;
          }
        }
        break;

      case 'tsunami':
        // 海啸击退
        createTsunami(effect.value);
        break;

      case 'multi_rock':
        // 多重落石
        for (let i = 0; i < effect.value; i++) {
          setTimeout(() => createFallingRock(skill.damage * 0.6), i * 200);
        }
        break;

      case 'earthquake':
        // 地震
        createEarthquake(effect.value);
        break;

      case 'trap_explode':
        // 陷阱爆炸 - 标记陷阱
        skill.explodeOnEnd = true;
        skill.explodeDamage = effect.value;
        break;

      case 'tornado':
        // 龙卷风
        createTornado(playerX, playerY, effect.value);
        break;

      case 'afterimage':
        // 残影伤害
        dealAOEDamage(effect.value, 0.15);
        break;
    }
  }
}

// ===== 强化特效实现 =====

// 连锁闪电
function createChainLightning(targets, bounces, damage) {
  if (targets.length === 0) return;
  let currentTarget = targets[0];
  let remaining = bounces;

  const hitTargets = new Set([currentTarget]);

  while (remaining > 0 && currentTarget) {
    // 找最近的未击中目标
    let nearest = null;
    let minDist = 0.3;
    for (const m of monsters) {
      if (hitTargets.has(m)) continue;
      const dx = m.x - currentTarget.x;
      const dy = m.y - currentTarget.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = m;
      }
    }

    if (nearest) {
      // 创建闪电特效
      attackEffects.push({
        type: 'chain_lightning',
        x1: currentTarget.x,
        y1: currentTarget.y,
        x2: nearest.x,
        y2: nearest.y,
        timer: 0.3,
        duration: 0.3
      });
      nearest.hp -= damage;
      nearest.hitTimer = 0.1;
      hitTargets.add(nearest);
      currentTarget = nearest;
    }
    remaining--;
  }
}

// 全屏雷击
function createSkyStrike(damage) {
  triggerScreenShake(1.0, 0.3);
  playSound('skill');

  for (const m of monsters) {
    m.hp -= damage;
    m.hitTimer = 0.2;
    attackEffects.push({
      type: 'sky_strike',
      x: m.x,
      y: m.y,
      timer: 0.5,
      duration: 0.5
    });
  }
}

// 火焰风暴
function createFireStorm(x, y, duration) {
  skillEffects.push({
    type: 'fire_storm',
    x, y,
    timer: duration,
    duration: duration,
    damage: 10,
    radius: 0.2
  });
}

// 雷云
function createThunderCloud(x, y, duration) {
  skillEffects.push({
    type: 'thunder_cloud',
    x, y,
    timer: duration,
    duration: duration,
    damage: 15,
    strikeInterval: 0.5,
    nextStrike: 0
  });
}

// 海啸
function createTsunami(damage) {
  triggerScreenShake(0.8, 0.4);
  // 击退所有敌人
  for (const m of monsters) {
    const dx = m.x - playerX;
    const dy = m.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
    m.x += (dx / dist) * 0.15;
    m.y += (dy / dist) * 0.15;
    m.hp -= damage;
    m.hitTimer = 0.2;
  }
}

// 落石
function createFallingRock(damage) {
  // 随机位置
  const angle = Math.random() * Math.PI * 2;
  const dist = 0.1 + Math.random() * 0.2;
  const x = playerX + Math.cos(angle) * dist;
  const y = playerY + Math.sin(angle) * dist;

  attackEffects.push({
    type: 'falling_rock',
    x, y,
    timer: 0.5,
    duration: 0.5,
    damage: damage
  });
}

// 地震
function createEarthquake(damage) {
  triggerScreenShake(1.2, 0.5);
  playSound('skill');
  dealAOEDamage(damage, 0.35);

  // 所有敌人眩晕
  for (const m of monsters) {
    const dx = m.x - playerX;
    const dy = m.y - playerY;
    if (Math.sqrt(dx * dx + dy * dy) < 0.35) {
      m.stunTimer = 1.0;
    }
  }
}

// 龙卷风
function createTornado(x, y, duration) {
  skillEffects.push({
    type: 'tornado',
    x, y,
    timer: duration,
    duration: duration,
    damage: 8,
    radius: 0.1
  });
}

// 弹射伤害
function createBounceDamage(firstTarget, bounces, damage) {
  if (!firstTarget) return;
  let current = firstTarget;
  let remaining = bounces;
  const hit = new Set([current]);

  while (remaining > 0) {
    let nearest = null;
    let minDist = 0.4;
    for (const m of monsters) {
      if (hit.has(m)) continue;
      const dx = m.x - current.x;
      const dy = m.y - current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = m;
      }
    }
    if (nearest) {
      nearest.hp -= damage;
      nearest.hitTimer = 0.1;
      hit.add(nearest);
      current = nearest;
    }
    remaining--;
  }
}

// 技能选择状态
let isSelectingSkill = false;
let skillChoices = []; // 4个待选技能

// 技能特效状态
let skillEffects = []; // 当前活跃的技能特效
let passiveStacks = {}; // 被动技能层数

// 技能长按提示状态
let skillTooltip = null; // { skill, x, y } 当前显示的技能提示
let longPressTimer = null; // 长按计时器
let skillHitBoxes = []; // 技能槽点击区域

// 职业选择状态
let isSelectingClass = false;

// 开始职业选择
function startClassSelection() {
  if (playerLevel >= 10 && currentClass === 'none') {
    isSelectingClass = true;
  }
}

// 选择职业
function selectClass(classId) {
  if (CLASS_TYPES[classId]) {
    currentClass = classId;
    isSelectingClass = false;
    // 更新属性
    const newStats = getPlayerStats();
    playerMaxHP = newStats.hp;
    playerHP = playerMaxHP; // 选择职业后满血
    saveGameData();
    console.log(`选择职业: ${CLASS_TYPES[classId].name}`);
  }
}

// 绘制职业选择UI
function drawClassSelectionUI() {
  // 半透明背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, W, H);

  // 标题
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎉 达到10级！选择你的职业', W / 2, 50);

  // 职业卡片
  const classKeys = Object.keys(CLASS_TYPES);
  const cardW = 100;
  const cardH = 140;
  const gap = 10;
  const totalW = classKeys.length * cardW + (classKeys.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const startY = 90;

  classKeys.forEach((classId, i) => {
    const cls = CLASS_TYPES[classId];
    const x = startX + i * (cardW + gap);
    const y = startY;

    // 卡片背景
    ctx.fillStyle = 'rgba(40, 40, 50, 0.95)';
    ctx.fillRect(x, y, cardW, cardH);

    // 卡片边框
    ctx.strokeStyle = cls.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, cardW, cardH);

    // 职业颜色块
    ctx.fillStyle = cls.color;
    ctx.fillRect(x + 10, y + 10, cardW - 20, 40);

    // 职业名称
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cls.name, x + cardW / 2, y + 30);

    // 属性简介
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.textAlign = 'left';
    ctx.fillText(`HP: ${cls.stats.hp}`, x + 8, y + 65);
    ctx.fillText(`伤害: ${cls.stats.dmg}`, x + 8, y + 80);
    ctx.fillText(`攻速: ${cls.stats.atkSpd}s`, x + 8, y + 95);
    ctx.fillText(`范围: ${(cls.stats.range * 100).toFixed(0)}`, x + 8, y + 110);

    // 描述
    ctx.fillStyle = '#888888';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cls.description.slice(0, 8), x + cardW / 2, y + cardH - 10);
  });

  // 提示
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('点击选择职业', W / 2, H - 30);
}

// 获取可用的技能列表（排除已拥有的）
function getAvailableSkills() {
  const ownedSkillIds = playerSkills.map(s => s.id);
  if (playerPassive) ownedSkillIds.push(playerPassive.id);

  const available = [];
  for (const [id, skill] of Object.entries(SKILL_POOL)) {
    if (!ownedSkillIds.includes(id)) {
      available.push({ id, ...skill });
    }
  }
  return available;
}

// 生成4个随机技能选项
function generateSkillChoices() {
  let available = getAvailableSkills();
  if (available.length === 0) return [];

  // 已有被动技能时，降低被动技能出现概率（70%概率过滤掉被动）
  if (playerPassive) {
    const filtered = available.filter(s => {
      if (s.type === 'passive') {
        return Math.random() < 0.3; // 只有30%概率保留被动技能选项
      }
      return true;
    });
    // 确保至少有一些选项
    if (filtered.length > 0) {
      available = filtered;
    }
  }

  // 打乱顺序
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  // 取前4个（或更少）
  return available.slice(0, Math.min(4, available.length));
}

// 检查技能槽是否已满
function isSkillSlotsFull() {
  return playerSkills.length >= 4 && playerPassive !== null;
}

// 获取技能强化等级
function getSkillEnhancement(skillId) {
  return skillEnhancements[skillId] || 0;
}

// 获取技能强化倍率
function getSkillEnhancementMultiplier(skillId) {
  const level = getSkillEnhancement(skillId);
  return ENHANCEMENT_MULTIPLIERS[level] || 1.0;
}

// 生成强化选项（技能满后）
function generateEnhancementChoices() {
  const enhanceableSkills = [];

  // 收集可强化的主动技能
  for (const skill of playerSkills) {
    const currentLevel = getSkillEnhancement(skill.id);
    if (currentLevel < MAX_ENHANCEMENT_LEVEL) {
      const nextEffect = getEnhancementEffectDesc(skill.id, currentLevel + 1);
      enhanceableSkills.push({
        ...skill,
        isEnhancement: true,
        currentEnhanceLevel: currentLevel,
        nextEnhanceLevel: currentLevel + 1,
        enhanceEffect: nextEffect // 下一级的连携效果
      });
    }
  }

  // 收集可强化的被动技能
  if (playerPassive) {
    const currentLevel = getSkillEnhancement(playerPassive.id);
    if (currentLevel < MAX_ENHANCEMENT_LEVEL) {
      const nextEffect = getEnhancementEffectDesc(playerPassive.id, currentLevel + 1);
      enhanceableSkills.push({
        ...playerPassive,
        isEnhancement: true,
        currentEnhanceLevel: currentLevel,
        nextEnhanceLevel: currentLevel + 1,
        enhanceEffect: nextEffect
      });
    }
  }

  // 打乱并返回最多4个
  for (let i = enhanceableSkills.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [enhanceableSkills[i], enhanceableSkills[j]] = [enhanceableSkills[j], enhanceableSkills[i]];
  }

  return enhanceableSkills.slice(0, Math.min(4, enhanceableSkills.length));
}

// 开始技能选择
function startSkillSelection() {
  // 检查是否有进化可用
  const evolution = checkEvolutionAvailable();

  // 检查技能槽是否已满
  if (isSkillSlotsFull() && !evolution) {
    // 技能已满，提供强化选项
    skillChoices = generateEnhancementChoices();
  } else if (evolution) {
    // 进化作为第一个选项
    skillChoices = [evolution, ...generateSkillChoices().slice(0, 2)];
  } else {
    skillChoices = generateSkillChoices();
  }

  if (skillChoices.length > 0) {
    isSelectingSkill = true;
  }
}

// 选择技能
function selectSkill(index) {
  if (index < 0 || index >= skillChoices.length) return;

  const skill = skillChoices[index];

  // 如果选择的是强化选项
  if (skill.isEnhancement) {
    skillEnhancements[skill.id] = skill.nextEnhanceLevel;
    playSound('levelup');

    // 显示强化通知
    const levelNames = ['', '叠一', '叠二', '叠三'];
    const multiplier = ENHANCEMENT_MULTIPLIERS[skill.nextEnhanceLevel];
    console.log(`技能强化！${skill.name} -> ${levelNames[skill.nextEnhanceLevel]} (${Math.floor(multiplier * 100)}%威力)`);

    // 显示进化通知复用
    showEvolutionNotice = true;
    evolutionNoticeTimer = 1.5;
  }
  // 如果选择的是进化技能
  else if (skill.type === 'evolved') {
    // 移除原技能
    const reqIds = skill.requires || [];
    playerSkills = playerSkills.filter(s => !reqIds.includes(s.id));
    if (playerPassive && reqIds.includes(playerPassive.id)) {
      playerPassive = null;
    }
    // 添加进化技能
    playerSkills.push(skill);
    skillCooldowns[skill.id] = 0;
    playSound('levelup');
    showEvolutionNotice = true;
    evolutionNoticeTimer = 2;
    console.log(`技能进化！获得终极技能: ${skill.name}`);
  } else if (skill.type === 'passive') {
    // 被动技能（只能有一个）
    if (playerPassive) {
      // 替换旧被动
      playerPassive = skill;
    } else {
      playerPassive = skill;
    }
    console.log(`获得被动技能: ${skill.name}`);
  } else {
    // 主动技能（最多4个）
    if (playerSkills.length < 4) {
      playerSkills.push(skill);
      skillCooldowns[skill.id] = 0;
      console.log(`获得技能: ${skill.name}`);
    } else {
      console.log('技能槽已满！');
    }
  }

  isSelectingSkill = false;
  skillChoices = [];

  // 检查是否有新的进化可用
  pendingEvolution = checkEvolutionAvailable();
}

// 更新技能冷却
function updateSkillCooldowns(dt) {
  for (const skillId in skillCooldowns) {
    if (skillCooldowns[skillId] > 0) {
      skillCooldowns[skillId] -= dt;
    }
  }
}

// 自动释放技能
function autoUseSkills() {
  for (const skill of playerSkills) {
    if (skillCooldowns[skill.id] <= 0 && monsters.length > 0) {
      useSkill(skill);
      // 每日挑战：快速冷却修饰符 - 技能冷却-25%
      let cooldown = skill.cooldown;
      if (isDailyChallenge && hasDailyModifier('skill_cd')) {
        cooldown *= 0.75;
      }
      skillCooldowns[skill.id] = cooldown;
    }
  }
}

// 使用技能
function useSkill(skill) {
  playSound('skill');
  const nearestMonster = findNearestMonster();

  // 触发技能使用动画
  skillAnimTimer = 0.5;
  skillAnimName = skill.name;

  // 获取强化倍率
  const enhanceMult = getSkillEnhancementMultiplier(skill.id);

  // 创建强化后的技能对象
  const enhancedSkill = {
    ...skill,
    damage: skill.damage ? Math.floor(skill.damage * enhanceMult) : skill.damage,
    duration: skill.duration ? skill.duration * (1 + (enhanceMult - 1) * 0.3) : skill.duration
  };

  // 创建技能释放特效（使用强化后的技能）
  createSkillCastEffect(enhancedSkill, enhanceMult);

  // 收集命中目标用于触发强化效果
  let hitTargets = [];

  switch (skill.effect) {
    case 'dash_attack': // 亚索Q
      hitTargets = createDashAttackEffect(enhancedSkill);
      break;
    case 'invincible': // 亚索W
      createInvincibleEffect(enhancedSkill);
      break;
    case 'root_aoe': // 拉克丝Q
      hitTargets = createRootAOEEffect(enhancedSkill);
      break;
    case 'laser_beam': // 拉克丝R
      hitTargets = createLaserBeamEffect(enhancedSkill);
      break;
    case 'spin_attack': // 德莱厄斯Q
    case 'spin_continuous': // 盖伦E
      createSpinAttackEffect(enhancedSkill);
      break;
    case 'cone_attack': // 阿卡丽Q
      hitTargets = createConeAttackEffect(enhancedSkill);
      break;
    case 'missile_swarm': // 卡莎Q
      createMissileSwarmEffect(enhancedSkill);
      break;
    case 'multi_strike': // 剑圣Q
      hitTargets = createMultiStrikeEffect(enhancedSkill);
      break;
    case 'blink': // EZ E
      createBlinkEffect(enhancedSkill);
      break;
    case 'projectile_cdr': // EZ Q
      createProjectileEffect(enhancedSkill);
      break;
    case 'hook_pull': // 锤石Q
    case 'grab_pull': // 机器人Q
    case 'pull_harpoon': // 派克Q
      hitTargets = createHookEffect(enhancedSkill);
      break;
    case 'place_trap': // 金克丝E
    case 'poison_trap': // 提莫R
      createTrapEffect(enhancedSkill);
      break;
    case 'bounce_shot': // MF Q
    case 'bouncing_blade': // 卡特Q
      hitTargets = createBounceEffect(enhancedSkill);
      break;
    case 'aoe_silence': // 机器人R
      hitTargets = createAOESilenceEffect(enhancedSkill);
      break;
    default:
      // 默认AOE伤害
      hitTargets = dealAOEDamage(enhancedSkill.damage || 20, 0.2);
      createGenericSkillEffect(enhancedSkill);
  }

  // 触发强化效果（如果有命中目标且技能已强化）
  if (hitTargets && hitTargets.length > 0) {
    applyEnhancementEffects(enhancedSkill, hitTargets);
  }
}

// 创建技能释放特效
function createSkillCastEffect(skill, enhanceMult = 1) {
  // 强化等级标记
  const enhanceLevel = enhanceMult > 1 ? Math.round((enhanceMult - 1) / 0.3) : 0;
  const enhanceMarks = enhanceLevel > 0 ? '★'.repeat(enhanceLevel) : '';

  // 技能名称显示（带强化标记）
  attackEffects.push({
    type: 'skill_name',
    x: playerX,
    y: playerY,
    name: enhanceMarks ? `${skill.name} ${enhanceMarks}` : skill.name,
    icon: skill.icon,
    color: enhanceMult > 1 ? '#FFD700' : skill.color, // 强化技能金色显示
    timer: 0.8,
    duration: 0.8
  });

  // 技能光环（强化技能光环更大更亮）
  attackEffects.push({
    type: 'skill_aura',
    x: playerX,
    y: playerY,
    color: skill.color,
    timer: 0.4 * enhanceMult,
    duration: 0.4 * enhanceMult,
    scale: enhanceMult
  });

  // 触发攻击动画
  isAttacking = true;
  attackAnimTimer = 0.4;
}

// 找到最近的怪物
function findNearestMonster() {
  let nearest = null;
  let minDist = Infinity;
  for (const m of monsters) {
    const dx = m.x - playerX;
    const dy = m.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      nearest = m;
    }
  }
  return nearest;
}

// ===== 技能特效实现 =====

// 突刺攻击（亚索Q）
function createDashAttackEffect(skill) {
  const angle = Math.atan2(smoothDirY, smoothDirX);
  skillEffects.push({
    type: 'dash',
    x: playerX,
    y: playerY,
    angle: angle,
    color: skill.color,
    duration: 0.3,
    timer: 0.3,
    damage: skill.damage
  });
  // 对前方敌人造成伤害
  return dealDirectionalDamage(skill.damage, angle, 0.25);
}

// 无敌效果（亚索W）
function createInvincibleEffect(skill) {
  skillEffects.push({
    type: 'shield',
    x: playerX,
    y: playerY,
    color: skill.color,
    duration: skill.duration,
    timer: skill.duration
  });
  // 设置无敌状态
  playerInvincible = skill.duration;
}

// AOE定身（拉克丝Q）
function createRootAOEEffect(skill) {
  skillEffects.push({
    type: 'light_burst',
    x: playerX,
    y: playerY,
    radius: 0.25,
    color: skill.color,
    duration: 0.5,
    timer: 0.5
  });
  // 定身周围敌人
  const hitTargets = [];
  for (const m of monsters) {
    const dx = m.x - playerX;
    const dy = m.y - playerY;
    if (Math.sqrt(dx * dx + dy * dy) < 0.25) {
      m.rooted = skill.duration;
      hitTargets.push(m);
    }
  }
  return hitTargets;
}

// 激光（拉克丝R）
function createLaserBeamEffect(skill) {
  const angle = Math.atan2(smoothDirY || 0.1, smoothDirX || 0.1);
  skillEffects.push({
    type: 'laser',
    x: playerX,
    y: playerY,
    angle: angle,
    color: skill.color,
    duration: 0.8,
    timer: 0.8,
    width: 0.08
  });
  return dealDirectionalDamage(skill.damage, angle, 0.8);
}

// 旋转攻击（盖伦E/德莱厄斯Q）
function createSpinAttackEffect(skill) {
  skillEffects.push({
    type: 'spin',
    x: playerX,
    y: playerY,
    radius: 0.2,
    color: skill.color,
    duration: skill.duration || 0.5,
    timer: skill.duration || 0.5,
    damage: skill.damage,
    tickRate: 0.2,
    lastTick: 0
  });
}

// 扇形攻击（阿卡丽Q）
function createConeAttackEffect(skill) {
  const angle = Math.atan2(smoothDirY || 0.1, smoothDirX || 0.1);
  skillEffects.push({
    type: 'cone',
    x: playerX,
    y: playerY,
    angle: angle,
    spread: Math.PI / 3,
    range: 0.25,
    color: skill.color,
    duration: 0.3,
    timer: 0.3
  });
  return dealConeDamage(skill.damage, angle, Math.PI / 3, 0.25);
}

// 导弹群（卡莎Q）
function createMissileSwarmEffect(skill) {
  const count = skill.missiles || 6;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    skillEffects.push({
      type: 'missile',
      x: playerX,
      y: playerY,
      vx: Math.cos(angle) * 0.02,
      vy: Math.sin(angle) * 0.02,
      color: skill.color,
      duration: 1,
      timer: 1,
      damage: skill.damage / count
    });
  }
}

// 多重打击（剑圣Q）
function createMultiStrikeEffect(skill) {
  const targets = monsters.slice(0, skill.targets || 4);
  let delay = 0;
  for (const target of targets) {
    setTimeout(() => {
      skillEffects.push({
        type: 'strike',
        x: target.x,
        y: target.y,
        color: skill.color,
        duration: 0.2,
        timer: 0.2
      });
      target.hp -= skill.damage;
      target.hitTimer = 0.15;
    }, delay);
    delay += 150;
  }
  // 短暂无敌
  playerInvincible = 0.6;
  return targets;
}

// 闪现（EZ E）
function createBlinkEffect(skill) {
  const blinkDist = 0.2;
  const angle = Math.atan2(smoothDirY || 0.1, smoothDirX || 0.1);
  // 起点特效
  skillEffects.push({
    type: 'blink_start',
    x: playerX,
    y: playerY,
    color: skill.color,
    duration: 0.3,
    timer: 0.3
  });
  // 移动玩家
  playerX += Math.cos(angle) * blinkDist;
  playerY += Math.sin(angle) * blinkDist;
  // 终点特效
  skillEffects.push({
    type: 'blink_end',
    x: playerX,
    y: playerY,
    color: skill.color,
    duration: 0.3,
    timer: 0.3
  });
}

// 投射物（EZ Q）
function createProjectileEffect(skill) {
  const angle = Math.atan2(smoothDirY || 0.1, smoothDirX || 0.1);
  skillEffects.push({
    type: 'projectile',
    x: playerX,
    y: playerY,
    vx: Math.cos(angle) * 0.025,
    vy: Math.sin(angle) * 0.025,
    color: skill.color,
    duration: 1.5,
    timer: 1.5,
    damage: skill.damage,
    hit: false
  });
}

// 钩子（锤石Q/机器人Q/派克Q）
function createHookEffect(skill) {
  const nearest = findNearestMonster();
  if (!nearest) return [];
  const dx = nearest.x - playerX;
  const dy = nearest.y - playerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 0.4) return [];

  skillEffects.push({
    type: 'hook',
    startX: playerX,
    startY: playerY,
    endX: nearest.x,
    endY: nearest.y,
    color: skill.color,
    duration: 0.4,
    timer: 0.4,
    target: nearest
  });
  // 拉近敌人
  const pullDist = dist * 0.6;
  nearest.x -= (dx / dist) * pullDist;
  nearest.y -= (dy / dist) * pullDist;
  nearest.hp -= skill.damage;
  nearest.hitTimer = 0.2;
  return [nearest];
}

// 陷阱（金克丝E/提莫R）
function createTrapEffect(skill) {
  skillEffects.push({
    type: 'trap',
    x: playerX + (Math.random() - 0.5) * 0.2,
    y: playerY + (Math.random() - 0.5) * 0.2,
    color: skill.color,
    duration: skill.duration || 10,
    timer: skill.duration || 10,
    damage: skill.damage,
    triggered: false,
    icon: skill.icon
  });
}

// 弹射攻击（MF Q/卡特Q）
function createBounceEffect(skill) {
  const target = findNearestMonster();
  if (!target) return [];

  let currentTarget = target;
  let bounceCount = skill.bounces || 2;
  let damage = skill.damage;

  const bounce = (t, dmg, count) => {
    if (count <= 0 || !t) return;
    skillEffects.push({
      type: 'bounce_hit',
      x: t.x,
      y: t.y,
      color: skill.color,
      duration: 0.2,
      timer: 0.2
    });
    t.hp -= dmg;
    t.hitTimer = 0.15;

    // 找下一个目标
    setTimeout(() => {
      let nextTarget = null;
      let minDist = Infinity;
      for (const m of monsters) {
        if (m !== t && m.hp > 0) {
          const dx = m.x - t.x;
          const dy = m.y - t.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.3 && dist < minDist) {
            minDist = dist;
            nextTarget = m;
          }
        }
      }
      bounce(nextTarget, dmg * (skill.bounceMultiplier || 1), count - 1);
    }, 100);
  };

  bounce(currentTarget, damage, bounceCount);
  return [target];
}

// AOE沉默（机器人R）
function createAOESilenceEffect(skill) {
  skillEffects.push({
    type: 'electric_burst',
    x: playerX,
    y: playerY,
    radius: 0.25,
    color: skill.color,
    duration: 0.5,
    timer: 0.5
  });
  return dealAOEDamage(skill.damage, 0.25);
}

// 通用技能特效
function createGenericSkillEffect(skill) {
  skillEffects.push({
    type: 'generic',
    x: playerX,
    y: playerY,
    color: skill.color,
    duration: 0.5,
    timer: 0.5,
    icon: skill.icon
  });
}

// ===== 伤害计算 =====

// AOE伤害 - 返回命中的目标
function dealAOEDamage(damage, radius) {
  const hitTargets = [];
  for (const m of monsters) {
    const dx = m.x - playerX;
    const dy = m.y - playerY;
    if (Math.sqrt(dx * dx + dy * dy) < radius) {
      m.hp -= damage;
      m.hitTimer = 0.15;
      hitTargets.push(m);
    }
  }
  return hitTargets;
}

// 方向性伤害 - 返回命中的目标
function dealDirectionalDamage(damage, angle, range) {
  const hitTargets = [];
  for (const m of monsters) {
    const dx = m.x - playerX;
    const dy = m.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > range) continue;
    const mAngle = Math.atan2(dy, dx);
    let angleDiff = Math.abs(mAngle - angle);
    if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
    if (angleDiff < Math.PI / 4) {
      m.hp -= damage;
      m.hitTimer = 0.15;
      hitTargets.push(m);
    }
  }
  return hitTargets;
}

// 扇形伤害 - 返回命中的目标
function dealConeDamage(damage, angle, spread, range) {
  const hitTargets = [];
  for (const m of monsters) {
    const dx = m.x - playerX;
    const dy = m.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > range) continue;
    const mAngle = Math.atan2(dy, dx);
    let angleDiff = Math.abs(mAngle - angle);
    if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
    if (angleDiff < spread / 2) {
      m.hp -= damage;
      m.hitTimer = 0.15;
      hitTargets.push(m);
    }
  }
  return hitTargets;
}

// 无敌时间
let playerInvincible = 0;

// 更新技能特效
function updateSkillEffects(dt) {
  // 更新无敌时间
  if (playerInvincible > 0) {
    playerInvincible -= dt;
  }

  // 更新怪物定身
  for (const m of monsters) {
    if (m.rooted && m.rooted > 0) {
      m.rooted -= dt;
    }
  }

  // 更新特效
  for (let i = skillEffects.length - 1; i >= 0; i--) {
    const effect = skillEffects[i];
    effect.timer -= dt;

    // 特效专属更新
    if (effect.type === 'spin' && effect.timer > 0) {
      effect.lastTick += dt;
      if (effect.lastTick >= effect.tickRate) {
        effect.lastTick = 0;
        dealAOEDamage(effect.damage / 3, effect.radius);
      }
      effect.x = playerX;
      effect.y = playerY;
    }

    if (effect.type === 'missile' || effect.type === 'projectile') {
      effect.x += effect.vx;
      effect.y += effect.vy;
      // 检测碰撞
      for (const m of monsters) {
        const dx = m.x - effect.x;
        const dy = m.y - effect.y;
        if (Math.sqrt(dx * dx + dy * dy) < 0.05 && !effect.hit) {
          m.hp -= effect.damage;
          m.hitTimer = 0.15;
          effect.hit = true;
          effect.timer = 0;
        }
      }
    }

    if (effect.type === 'trap' && !effect.triggered) {
      for (const m of monsters) {
        const dx = m.x - effect.x;
        const dy = m.y - effect.y;
        if (Math.sqrt(dx * dx + dy * dy) < 0.08) {
          m.hp -= effect.damage;
          m.hitTimer = 0.2;
          effect.triggered = true;
          effect.timer = 0.3; // 爆炸动画时间
          skillEffects.push({
            type: 'explosion',
            x: effect.x,
            y: effect.y,
            color: effect.color,
            duration: 0.3,
            timer: 0.3
          });
        }
      }
    }

    // 移除过期特效
    if (effect.timer <= 0) {
      skillEffects.splice(i, 1);
    }
  }
}

// 绘制技能特效 - 增强版
function drawSkillEffects(groundQuad) {
  for (const effect of skillEffects) {
    // 转换到屏幕坐标
    const screenX = effect.x - playerX + 0.5;
    const screenY = effect.y - playerY + 0.5;

    if (screenX < 0 || screenX > 1 || screenY < 0 || screenY > 1) continue;

    const pt = getGroundPoint(groundQuad, screenX, screenY);
    const progress = 1 - effect.timer / effect.duration;

    ctx.save();

    switch (effect.type) {
      case 'dash':
        // 冲刺残影效果
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 5;
        ctx.globalAlpha = effect.timer / effect.duration;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x + Math.cos(effect.angle) * 40, pt.y + Math.sin(effect.angle) * 40);
        ctx.stroke();
        // 拖尾
        for (let i = 1; i <= 3; i++) {
          ctx.globalAlpha = (effect.timer / effect.duration) * (0.3 / i);
          ctx.lineWidth = 5 - i;
          ctx.beginPath();
          ctx.moveTo(pt.x - Math.cos(effect.angle) * i * 10, pt.y - Math.sin(effect.angle) * i * 10);
          ctx.lineTo(pt.x + Math.cos(effect.angle) * (40 - i * 8), pt.y + Math.sin(effect.angle) * (40 - i * 8));
          ctx.stroke();
        }
        break;

      case 'shield':
        // 护盾 - 能量波纹
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 20;
        const shieldR = 25 * pt.scale;
        const pulseR = shieldR * (1 + Math.sin(Date.now() * 0.01) * 0.1);
        // 外圈
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - 20, pulseR, 0, Math.PI * 2);
        ctx.stroke();
        // 内圈能量
        const innerGrad = ctx.createRadialGradient(pt.x, pt.y - 20, 0, pt.x, pt.y - 20, pulseR);
        innerGrad.addColorStop(0, effect.color + '00');
        innerGrad.addColorStop(0.7, effect.color + '20');
        innerGrad.addColorStop(1, effect.color + '60');
        ctx.fillStyle = innerGrad;
        ctx.fill();
        break;

      case 'light_burst':
      case 'electric_burst':
        // 爆发光波 - 多层渐变
        const burstR = effect.radius * 200 * pt.scale;
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 25;
        // 外圈
        const burstGrad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, burstR);
        burstGrad.addColorStop(0, effect.color);
        burstGrad.addColorStop(0.5, effect.color + '80');
        burstGrad.addColorStop(1, effect.color + '00');
        ctx.fillStyle = burstGrad;
        ctx.globalAlpha = effect.timer / effect.duration * 0.7;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, burstR, 0, Math.PI * 2);
        ctx.fill();
        // 闪电效果（电系）
        if (effect.type === 'electric_burst') {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + Date.now() * 0.005;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            let lx = pt.x, ly = pt.y;
            for (let j = 0; j < 4; j++) {
              lx += Math.cos(angle + (Math.random() - 0.5)) * burstR * 0.25;
              ly += Math.sin(angle + (Math.random() - 0.5)) * burstR * 0.25;
              ctx.lineTo(lx, ly);
            }
            ctx.stroke();
          }
        }
        break;

      case 'laser':
        // 激光 - 多层光束
        const laserLen = 150;
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 30;
        // 核心光束
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = effect.width * 100 * pt.scale;
        ctx.globalAlpha = effect.timer / effect.duration;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x + Math.cos(effect.angle) * laserLen, pt.y + Math.sin(effect.angle) * laserLen);
        ctx.stroke();
        // 外层光晕
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = effect.width * 250 * pt.scale;
        ctx.globalAlpha = effect.timer / effect.duration * 0.5;
        ctx.stroke();
        // 最外层
        ctx.lineWidth = effect.width * 400 * pt.scale;
        ctx.globalAlpha = effect.timer / effect.duration * 0.2;
        ctx.stroke();
        break;

      case 'spin':
        // 旋风斩 - 刀光效果
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 15;
        const spinR = effect.radius * 200 * pt.scale;
        const spinAngle = walkTime * 12;
        // 旋转刀光
        for (let i = 0; i < 4; i++) {
          const a = spinAngle + (i * Math.PI / 2);
          const trailLen = 0.4;
          // 刀光渐变
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = effect.color;
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(pt.x + Math.cos(a - trailLen) * spinR * 0.3, pt.y - 15 + Math.sin(a - trailLen) * spinR * 0.15);
          ctx.quadraticCurveTo(
            pt.x + Math.cos(a) * spinR, pt.y - 15 + Math.sin(a) * spinR * 0.5,
            pt.x + Math.cos(a + trailLen) * spinR * 0.3, pt.y - 15 + Math.sin(a + trailLen) * spinR * 0.15
          );
          ctx.stroke();
        }
        // 中心漩涡
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - 15, spinR * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = effect.color + '40';
        ctx.fill();
        break;

      case 'cone':
        // 锥形攻击 - 渐变扇形
        const coneR = effect.range * 200 * pt.scale;
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 20;
        // 渐变填充
        const coneGrad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, coneR);
        coneGrad.addColorStop(0, effect.color);
        coneGrad.addColorStop(0.6, effect.color + 'AA');
        coneGrad.addColorStop(1, effect.color + '00');
        ctx.fillStyle = coneGrad;
        ctx.globalAlpha = effect.timer / effect.duration * 0.7;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.arc(pt.x, pt.y, coneR, effect.angle - effect.spread / 2, effect.angle + effect.spread / 2);
        ctx.closePath();
        ctx.fill();
        break;

      case 'missile':
      case 'projectile':
        // 飞弹 - 带拖尾
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = effect.timer / effect.duration;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fill();
        // 外圈
        ctx.fillStyle = effect.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
        ctx.globalAlpha = effect.timer / effect.duration * 0.5;
        ctx.fill();
        // 拖尾
        if (effect.vx !== undefined) {
          const trailAngle = Math.atan2(-effect.vy, -effect.vx);
          ctx.globalAlpha = effect.timer / effect.duration * 0.3;
          for (let i = 1; i <= 4; i++) {
            ctx.beginPath();
            ctx.arc(pt.x + Math.cos(trailAngle) * i * 6, pt.y + Math.sin(trailAngle) * i * 6, 6 - i, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;

      case 'strike':
      case 'bounce_hit':
        // 打击波纹 - 多重扩散
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 15;
        const strikeR = 20 * progress;
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3 * (1 - progress);
        ctx.globalAlpha = effect.timer / effect.duration;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, strikeR, 0, Math.PI * 2);
        ctx.stroke();
        // 第二层波纹
        ctx.globalAlpha = effect.timer / effect.duration * 0.5;
        ctx.lineWidth = 2 * (1 - progress);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, strikeR * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'blink_start':
      case 'blink_end':
        // 传送效果 - 能量漩涡
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 25;
        const blinkR = 25 * progress;
        // 漩涡
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = effect.timer / effect.duration * 0.8;
        for (let i = 0; i < 3; i++) {
          const angle = Date.now() * 0.01 + i * Math.PI * 2 / 3;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, blinkR * (0.5 + i * 0.25), angle, angle + Math.PI);
          ctx.stroke();
        }
        // 中心光点
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = effect.timer / effect.duration;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5 * (1 - progress), 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'hook':
        // 钩索 - 带光链
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 10;
        const startPt = getGroundPoint(groundQuad, effect.startX - playerX + 0.5, effect.startY - playerY + 0.5);
        const endPt = getGroundPoint(groundQuad, effect.endX - playerX + 0.5, effect.endY - playerY + 0.5);
        // 主链
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 4;
        ctx.globalAlpha = effect.timer / effect.duration;
        ctx.beginPath();
        ctx.moveTo(startPt.x, startPt.y);
        ctx.lineTo(endPt.x, endPt.y);
        ctx.stroke();
        // 光点
        const hookProgress = 1 - effect.timer / effect.duration;
        const hpx = startPt.x + (endPt.x - startPt.x) * hookProgress;
        const hpy = startPt.y + (endPt.y - startPt.y) * hookProgress;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(hpx, hpy, 6, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'trap':
        if (!effect.triggered) {
          ctx.shadowColor = '#FF6600';
          ctx.shadowBlur = 10 + Math.sin(Date.now() * 0.01) * 5;
          ctx.font = `${22 * pt.scale}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(effect.icon || '💣', pt.x, pt.y);
        }
        break;

      case 'explosion':
        // 爆炸 - 多层波纹
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 30;
        const expR = 40 * progress * pt.scale;
        // 内核
        const expGrad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, expR);
        expGrad.addColorStop(0, '#FFFFFF');
        expGrad.addColorStop(0.3, effect.color);
        expGrad.addColorStop(1, effect.color + '00');
        ctx.fillStyle = expGrad;
        ctx.globalAlpha = effect.timer / effect.duration * 0.9;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, expR, 0, Math.PI * 2);
        ctx.fill();
        // 碎片
        for (let i = 0; i < 8; i++) {
          const fragAngle = (i / 8) * Math.PI * 2;
          const fragDist = expR * (0.8 + Math.random() * 0.4);
          ctx.fillStyle = effect.color;
          ctx.globalAlpha = effect.timer / effect.duration * 0.6;
          ctx.beginPath();
          ctx.arc(pt.x + Math.cos(fragAngle) * fragDist, pt.y + Math.sin(fragAngle) * fragDist, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'generic':
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 15;
        ctx.font = `${32 * pt.scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.globalAlpha = effect.timer / effect.duration;
        ctx.fillText(effect.icon || '✨', pt.x, pt.y - 20);
        break;
    }

    ctx.restore();
  }
}

// ==================== 数据持久化 ====================
const SAVE_KEY = 'bagua_game_save';
const SAVE_VERSION = 2;  // 版本2: 新经验曲线

// 保存游戏数据
function saveGameData() {
  try {
    const saveData = {
      currentClass,
      playerLevel,
      playerExp,
      expToNext,
      currentPalace,
      version: SAVE_VERSION
    };
    wx.setStorageSync(SAVE_KEY, JSON.stringify(saveData));
    console.log('游戏数据已保存');
  } catch (e) {
    console.error('保存游戏数据失败:', e);
  }
}

// 加载游戏数据
function loadGameData() {
  try {
    const saved = wx.getStorageSync(SAVE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      // 检查版本，旧版本数据自动重置
      if (!data.version || data.version < SAVE_VERSION) {
        console.log('检测到旧版本存档，自动重置');
        wx.removeStorageSync(SAVE_KEY);
        return false;  // 使用默认值
      }
      // 先加载等级
      if (typeof data.playerLevel === 'number' && data.playerLevel >= 1) {
        playerLevel = data.playerLevel;
      }
      // 只有10级以上才能使用职业
      if (playerLevel >= 10 && data.currentClass && CLASS_TYPES[data.currentClass]) {
        currentClass = data.currentClass;
      } else {
        currentClass = 'none';
      }
      if (typeof data.playerExp === 'number' && data.playerExp >= 0) {
        playerExp = data.playerExp;
      }
      if (typeof data.expToNext === 'number' && data.expToNext > 0) {
        expToNext = data.expToNext;
      }
      if (data.currentPalace && palacePairs[data.currentPalace]) {
        currentPalace = data.currentPalace;
      }
      const character = getCurrentCharacter();
      console.log(`游戏数据已加载: ${character.name} Lv.${playerLevel}`);
      return true;
    }
  } catch (e) {
    console.error('加载游戏数据失败:', e);
  }
  return false;
}

// 重置游戏数据（新游戏）
function resetGameData() {
  try {
    // 先清除存储
    wx.removeStorageSync(SAVE_KEY);
    // 重置所有变量
    playerLevel = 1;
    playerExp = 0;
    expToNext = 60;  // 第一级只需60经验
    currentClass = 'none';
    currentPalace = '艮';
    // 保存新数据
    saveGameData();
    console.log('游戏数据已重置到1级');
    // 提示用户
    wx.showToast && wx.showToast({
      title: '已重置到1级',
      icon: 'success',
      duration: 1500
    });
    return true;
  } catch (e) {
    console.error('重置游戏数据失败:', e);
    return false;
  }
}

// ==================== 新手引导系统 ====================
const TUTORIAL_KEY = 'bagua_tutorial_done';

// 检查是否需要显示新手引导
function checkTutorial() {
  try {
    const done = wx.getStorageSync(TUTORIAL_KEY);
    if (!done) {
      showTutorial = true;
      tutorialStep = 0;
    }
  } catch (e) {
    console.log('检查新手引导失败:', e);
  }
}

// 完成新手引导
function completeTutorial() {
  try {
    wx.setStorageSync(TUTORIAL_KEY, true);
    showTutorial = false;
    tutorialStep = 0;
  } catch (e) {
    console.log('保存新手引导状态失败:', e);
  }
}

// 新手引导内容
const TUTORIAL_PAGES = [
  {
    title: '欢迎来到八卦冒险！',
    icon: '☯️',
    lines: [
      '这是一款基于八卦的Roguelike游戏',
      '火柴人会自动战斗，你只需要...',
      '',
      '• 选择宫位获得不同加成',
      '• 升级解锁新技能',
      '• 尽可能存活更久！'
    ]
  },
  {
    title: '八卦宫位系统',
    icon: '☰',
    lines: [
      '点击立方体顶点切换宫位视角',
      '',
      '每个宫位提供不同属性加成：',
      '☰ 乾宫：伤害+20%',
      '☷ 坤宫：生命+30%',
      '☳ 震宫：攻速+20%',
      '... 更多宫位等你探索！'
    ]
  },
  {
    title: '战斗与成长',
    icon: '⚔️',
    lines: [
      '• 击杀怪物获得经验升级',
      '• 每次升级可选择新技能',
      '• 10级后可选择职业',
      '',
      '死亡会重置等级，但别担心',
      '每次冒险都是新的开始！'
    ]
  },
  {
    title: '操作说明',
    icon: '👆',
    lines: [
      '🔊 右上角：音效开关',
      '⏸️ 战斗中右上角：暂停',
      '',
      '火柴人会自动移动和攻击',
      '你可以专注于策略选择！',
      '',
      '点击"开始冒险"开始游戏'
    ]
  }
];

// 绘制新手引导界面
function drawTutorial() {
  // 半透明背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.fillRect(0, 0, W, H);

  const page = TUTORIAL_PAGES[tutorialStep];
  const centerX = W / 2;
  const centerY = H / 2;

  // 标题图标
  ctx.font = '48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(page.icon, centerX, centerY - 120);

  // 标题
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(page.title, centerX, centerY - 60);

  // 内容
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#DDDDDD';
  let lineY = centerY - 20;
  for (const line of page.lines) {
    ctx.fillText(line, centerX, lineY);
    lineY += 24;
  }

  // 页码指示器
  ctx.fillStyle = '#666666';
  let dotX = centerX - (TUTORIAL_PAGES.length - 1) * 10;
  for (let i = 0; i < TUTORIAL_PAGES.length; i++) {
    ctx.beginPath();
    ctx.arc(dotX + i * 20, H - 100, i === tutorialStep ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle = i === tutorialStep ? '#FFD700' : '#666666';
    ctx.fill();
  }

  // 按钮
  const btnW = 120;
  const btnH = 44;
  const btnY = H - 60;

  if (tutorialStep < TUTORIAL_PAGES.length - 1) {
    // 下一步按钮
    const nextBtnX = centerX - btnW / 2;
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(nextBtnX, btnY, btnW, btnH);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('下一步 →', centerX, btnY + btnH / 2);

    // 跳过按钮
    ctx.fillStyle = '#888888';
    ctx.font = '12px sans-serif';
    ctx.fillText('跳过引导', centerX, btnY + btnH + 20);
  } else {
    // 开始游戏按钮
    const startBtnX = centerX - btnW / 2;
    ctx.fillStyle = '#FF5722';
    ctx.fillRect(startBtnX, btnY, btnW, btnH);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('开始游戏！', centerX, btnY + btnH / 2);
  }

  return {
    nextBtn: { x: centerX - btnW / 2, y: btnY, w: btnW, h: btnH },
    skipY: btnY + btnH + 10
  };
}

// ==================== 成就系统 ====================
const ACHIEVEMENT_KEY = 'bagua_achievements';

// 成就定义
const ACHIEVEMENTS = {
  // 击杀成就
  kill_10: { name: '初出茅庐', desc: '累计击杀10只怪物', icon: '🗡️', condition: s => s.totalKills >= 10 },
  kill_100: { name: '百人斩', desc: '累计击杀100只怪物', icon: '⚔️', condition: s => s.totalKills >= 100 },
  kill_500: { name: '千人斩', desc: '累计击杀500只怪物', icon: '🔪', condition: s => s.totalKills >= 500 },

  // Boss成就
  boss_1: { name: '挑战者', desc: '击杀第一个Boss', icon: '💀', condition: s => s.totalBossKills >= 1 },
  boss_5: { name: 'Boss猎手', desc: '累计击杀5个Boss', icon: '👹', condition: s => s.totalBossKills >= 5 },
  boss_10: { name: '魔王终结者', desc: '累计击杀10个Boss', icon: '☠️', condition: s => s.totalBossKills >= 10 },

  // 存活成就
  survive_60: { name: '坚持一分钟', desc: '单次存活超过60秒', icon: '⏱️', condition: s => s.bestTime >= 60 },
  survive_180: { name: '三分钟先生', desc: '单次存活超过180秒', icon: '⏰', condition: s => s.bestTime >= 180 },
  survive_300: { name: '生存大师', desc: '单次存活超过300秒', icon: '🏆', condition: s => s.bestTime >= 300 },

  // 等级成就
  level_10: { name: '职业觉醒', desc: '达到10级解锁职业', icon: '⭐', condition: s => s.maxLevel >= 10 },
  level_20: { name: '强者之路', desc: '达到20级', icon: '🌟', condition: s => s.maxLevel >= 20 },
  level_30: { name: '传奇', desc: '达到30级', icon: '💫', condition: s => s.maxLevel >= 30 },

  // 金币成就
  gold_100: { name: '小财主', desc: '单次收集100金币', icon: '💰', condition: s => s.bestGold >= 100 },
  gold_500: { name: '大富翁', desc: '单次收集500金币', icon: '💎', condition: s => s.bestGold >= 500 },

  // 连击成就
  combo_10: { name: '连击新手', desc: '达成10连击', icon: '🔥', condition: s => s.bestCombo >= 10 },
  combo_30: { name: '连击大师', desc: '达成30连击', icon: '💥', condition: s => s.bestCombo >= 30 },

  // 冒险次数
  runs_10: { name: '屡败屡战', desc: '完成10次冒险', icon: '🎮', condition: s => s.totalRuns >= 10 },
  runs_50: { name: '永不言弃', desc: '完成50次冒险', icon: '🎯', condition: s => s.totalRuns >= 50 }
};

// 统计数据
let gameStats = {
  totalKills: 0,
  totalBossKills: 0,
  totalRuns: 0,
  bestTime: 0,
  bestGold: 0,
  bestCombo: 0,
  maxLevel: 1
};

// 已解锁的成就
let unlockedAchievements = {};

// 成就通知队列
let achievementNotifications = [];
let currentNotification = null;
let notificationTimer = 0;

// 加载成就数据
function loadAchievements() {
  try {
    const saved = wx.getStorageSync(ACHIEVEMENT_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.stats) gameStats = { ...gameStats, ...data.stats };
      if (data.unlocked) unlockedAchievements = data.unlocked;
    }
  } catch (e) {
    console.log('加载成就数据失败:', e);
  }
}

// 保存成就数据
function saveAchievements() {
  try {
    wx.setStorageSync(ACHIEVEMENT_KEY, JSON.stringify({
      stats: gameStats,
      unlocked: unlockedAchievements
    }));
  } catch (e) {
    console.log('保存成就数据失败:', e);
  }
}

// 检查成就解锁
function checkAchievements() {
  for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
    if (!unlockedAchievements[id] && achievement.condition(gameStats)) {
      unlockAchievement(id, achievement);
    }
  }
}

// 解锁成就
function unlockAchievement(id, achievement) {
  unlockedAchievements[id] = Date.now();
  achievementNotifications.push({
    id,
    name: achievement.name,
    desc: achievement.desc,
    icon: achievement.icon
  });
  saveAchievements();
  console.log(`成就解锁: ${achievement.name}`);
}

// 更新成就通知显示
function updateAchievementNotification(dt) {
  if (currentNotification) {
    notificationTimer -= dt;
    if (notificationTimer <= 0) {
      currentNotification = null;
    }
  } else if (achievementNotifications.length > 0) {
    currentNotification = achievementNotifications.shift();
    notificationTimer = 3.0;  // 显示3秒
    playSound('levelup');  // 成就音效
  }
}

// 绘制成就通知
function drawAchievementNotification() {
  if (!currentNotification) return;

  const alpha = Math.min(1, notificationTimer, 3 - notificationTimer + 1);
  const slideY = (1 - alpha) * -50;

  ctx.save();
  ctx.globalAlpha = alpha;

  // 通知背景
  const notifW = 200;
  const notifH = 60;
  const notifX = (W - notifW) / 2;
  const notifY = 80 + slideY;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.fillRect(notifX, notifY, notifW, notifH);

  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.strokeRect(notifX, notifY, notifW, notifH);

  // 成就图标
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(currentNotification.icon, notifX + 10, notifY + notifH / 2);

  // 成就文字
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('🏆 成就解锁!', notifX + 45, notifY + 18);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(currentNotification.name, notifX + 45, notifY + 36);

  ctx.fillStyle = '#AAAAAA';
  ctx.font = '10px sans-serif';
  ctx.fillText(currentNotification.desc, notifX + 45, notifY + 50);

  ctx.restore();
}

// 获取成就统计
function getAchievementStats() {
  const total = Object.keys(ACHIEVEMENTS).length;
  const unlocked = Object.keys(unlockedAchievements).length;
  return { total, unlocked, percent: Math.floor(unlocked / total * 100) };
}

// ==================== 每日挑战系统 ====================

// 每日挑战状态
let isDailyChallenge = false;
let dailySeed = 0;
let dailyRNG = null;
let dailyChallengeScore = 0;
let dailyChallengeCompleted = false;
let dailyLeaderboard = [];  // { name, score, time }
let todayBestScore = 0;
let activeDailyModifiers = [];  // 当前生效的每日修饰符

// 生成每日种子（基于日期）
function getDailySeed() {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// 伪随机数生成器（基于种子）
function createSeededRNG(seed) {
  let state = seed;
  return function() {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// 获取每日挑战的随机数
function dailyRandom() {
  if (dailyRNG) {
    return dailyRNG();
  }
  return Math.random();
}

// 获取今天的日期字符串
function getTodayDateStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 加载每日挑战数据
function loadDailyChallengeData() {
  try {
    const data = wx.getStorageSync('dailyChallenge');
    if (data) {
      const today = getTodayDateStr();
      if (data.date === today) {
        todayBestScore = data.bestScore || 0;
        dailyChallengeCompleted = data.completed || false;
        dailyLeaderboard = data.leaderboard || [];
      } else {
        // 新的一天，重置数据
        todayBestScore = 0;
        dailyChallengeCompleted = false;
        dailyLeaderboard = [];
      }
    }
  } catch (e) {
    console.log('加载每日挑战数据失败');
  }
}

// 保存每日挑战数据
function saveDailyChallengeData() {
  try {
    wx.setStorageSync('dailyChallenge', {
      date: getTodayDateStr(),
      bestScore: todayBestScore,
      completed: dailyChallengeCompleted,
      leaderboard: dailyLeaderboard.slice(0, 10)  // 保留前10名
    });
  } catch (e) {
    console.log('保存每日挑战数据失败');
  }
}

// 计算每日挑战分数
function calculateDailyChallengeScore() {
  const killScore = killCount * 100;
  const timeScore = Math.floor(adventureTime) * 10;
  const comboScore = gameStats.bestCombo * 50;
  const bossScore = bossCount * 500;
  const levelScore = playerLevel * 200;
  const goldScore = goldCollected * 5;

  return killScore + timeScore + comboScore + bossScore + levelScore + goldScore;
}

// 开始每日挑战
function startDailyChallenge() {
  isDailyChallenge = true;
  dailySeed = getDailySeed();
  dailyRNG = createSeededRNG(dailySeed);
  dailyChallengeScore = 0;
  activeDailyModifiers = getDailyChallengeModifiers();

  // 使用固定的宫位（基于种子）
  const palaces = Object.keys(PALACE_BONUS);
  const palaceIndex = dailySeed % palaces.length;
  selectedPalace = palaces[palaceIndex];

  startAdventure();
  playSound('start');
}

// 结束每日挑战
function endDailyChallenge() {
  dailyChallengeScore = calculateDailyChallengeScore();

  // 更新最佳分数
  if (dailyChallengeScore > todayBestScore) {
    todayBestScore = dailyChallengeScore;

    // 添加到排行榜
    dailyLeaderboard.push({
      name: '我',
      score: dailyChallengeScore,
      time: Math.floor(adventureTime),
      kills: killCount
    });

    // 排序并保留前10名
    dailyLeaderboard.sort((a, b) => b.score - a.score);
    dailyLeaderboard = dailyLeaderboard.slice(0, 10);
  }

  dailyChallengeCompleted = true;
  saveDailyChallengeData();

  isDailyChallenge = false;
  dailyRNG = null;
  activeDailyModifiers = [];
}

// 检查是否有某个每日修饰符
function hasDailyModifier(effect) {
  return activeDailyModifiers.some(m => m.effect === effect);
}

// 获取每日挑战修饰符（增加趣味性）
function getDailyChallengeModifiers() {
  const seed = getDailySeed();
  const rng = createSeededRNG(seed);

  const modifiers = [];
  const allModifiers = [
    { name: '怪物狂潮', desc: '怪物刷新速度+50%', icon: '👹', effect: 'monster_speed' },
    { name: '强化敌人', desc: '怪物生命值+30%', icon: '💪', effect: 'monster_hp' },
    { name: '快速冷却', desc: '技能冷却-25%', icon: '⚡', effect: 'skill_cd' },
    { name: '暴击日', desc: '暴击率+20%', icon: '💥', effect: 'crit' },
    { name: '金币雨', desc: '金币掉落+100%', icon: '💰', effect: 'gold' },
    { name: '治愈之日', desc: '回血效果+50%', icon: '💚', effect: 'heal' },
    { name: '速度之日', desc: '移动速度+20%', icon: '🏃', effect: 'speed' },
    { name: 'Boss猎人', desc: 'Boss出现更频繁', icon: '💀', effect: 'boss' }
  ];

  // 每天选择2个修饰符
  const idx1 = Math.floor(rng() * allModifiers.length);
  let idx2 = Math.floor(rng() * allModifiers.length);
  while (idx2 === idx1) idx2 = Math.floor(rng() * allModifiers.length);

  modifiers.push(allModifiers[idx1]);
  modifiers.push(allModifiers[idx2]);

  return modifiers;
}

// 游戏启动时加载数据
loadGameData();
loadAchievements();
loadAudioSettings();
loadDailyChallengeData();
checkTutorial();

// 音乐会在首次用户交互时启动（浏览器音频策略）
let musicInitialized = false;

// 设置面板状态
let showSettingsPanel = false;

// 主界面按钮位置缓存
let idleScreenButtons = null;

// 获取当前角色信息
function getCurrentCharacter() {
  // 10级后才能使用职业
  if (playerLevel >= 10 && currentClass !== 'none' && CLASS_TYPES[currentClass]) {
    return CLASS_TYPES[currentClass];
  }
  return DEFAULT_CHARACTER;
}

// 计算当前属性（基础 + 等级加成）
function getPlayerStats() {
  const character = getCurrentCharacter();
  const base = character.stats;
  const levelBonus = playerLevel - 1;
  // 等级成长：每级+3%基础属性（降低成长速度）
  const levelMult = 1 + levelBonus * 0.03;

  // 获取宫位加成
  const palace = PALACE_BONUS[currentPalace] || {};

  // 计算基础属性
  let hp = Math.floor(base.hp * levelMult);
  let spd = base.spd;
  let dmg = Math.floor(base.dmg * levelMult);
  let atkSpd = Math.max(0.2, base.atkSpd - levelBonus * 0.01);
  let range = base.range + levelBonus * 0.002;
  let luck = base.luck + levelBonus * 0.3;
  let healRate = base.healRate || 0;
  let armor = base.armor || 0;

  // 应用宫位加成
  if (palace.hp) hp = Math.floor(hp * palace.hp);
  if (palace.spd) spd *= palace.spd;
  if (palace.dmg) dmg = Math.floor(dmg * palace.dmg);
  if (palace.atkSpd) atkSpd = Math.max(0.15, atkSpd * palace.atkSpd);
  if (palace.range) range *= palace.range;
  if (palace.luck) luck += palace.luck;
  if (palace.healRate) healRate += palace.healRate;
  if (palace.armor) armor += palace.armor;

  // 应用每日挑战修饰符
  if (isDailyChallenge && activeDailyModifiers.length > 0) {
    if (hasDailyModifier('crit')) luck += 20;      // 暴击日：暴击率+20%
    if (hasDailyModifier('heal')) healRate += 0.5; // 治愈之日：回血效果+50%
    if (hasDailyModifier('speed')) spd *= 1.2;     // 速度之日：移动速度+20%
  }

  // 应用自定义武器加成
  const weaponBonus = getWeaponBonus();
  if (weaponBonus) {
    dmg += weaponBonus.damage;                     // 武器伤害加成
    atkSpd = Math.max(0.15, atkSpd * weaponBonus.attackSpeed); // 武器攻速
    luck += weaponBonus.critChance;                // 武器暴击
  }

  return { hp, spd, dmg, atkSpd, range, luck, healRate, armor, weaponBonus };
}

// ==================== 冒险系统 ====================
let gameState = 'idle'; // 'idle' | 'adventure' | 'gameover' | 'story' | 'dungeon' | 'boss_intro'
let isPaused = false;   // 暂停状态
let showTutorial = false;  // 新手引导状态
let tutorialStep = 0;      // 引导步骤
let adventureTime = 0;
let killCount = 0;
let playerHP = 100;
let playerMaxHP = 100;
let playerMP = 100;       // 蓝量/魔法值
let playerMaxMP = 100;
let showDetailedStats = false;  // 是否显示详细数值
let playerX = 0.5;  // 玩家在地面上的位置 (0-1)
let playerY = 0.5;
let playerTargetX = 0.5;
let playerTargetY = 0.5;
let isMoving = false;
let lastAttackTime = 0;
let lastHurtSoundTime = 0;  // 受伤音效冷却
// 平滑移动方向
let smoothDirX = 0;
let smoothDirY = 0;
let comboCount = 0;
let comboTimer = 0;            // 连击计时（2秒内无击杀则重置）
let lastComboAnnounce = 0;     // 上次连击播报的击杀数

// ==================== 剧情系统 ====================
let storyProgress = 0;         // 剧情进度: 0=新手, 1=武器完成, 2=Boss战, 3=战败入狱, 4=地牢开始
let storyDialogue = [];        // 当前对话内容
let storyDialogueIndex = 0;    // 当前对话索引
let storyFadeAlpha = 0;        // 过场淡入淡出
let storyBossHP = 0;           // 剧情Boss血量
let storyBossMaxHP = 0;
let isFirstWeaponCreation = true; // 是否第一次创建武器

// ==================== 地牢系统 ====================
let dungeonFloor = 1;          // 当前地牢层数
let dungeonRooms = [];         // 房间数据
let currentRoom = null;        // 当前房间
let currentRoomIndex = 0;      // 当前房间索引
let roomCleared = false;       // 当前房间是否清理完毕
let dungeonMap = {};           // 已探索的房间地图
let roomExits = [];            // 当前房间的出口

// 房间类型
const ROOM_TYPES = {
  NORMAL: 'normal',      // 普通战斗房
  TREASURE: 'treasure',  // 宝藏房
  SHOP: 'shop',          // 商店
  BOSS: 'boss',          // Boss房
  START: 'start',        // 起始房
  SECRET: 'secret'       // 秘密房
};

// 屏幕震动系统
let screenShakeX = 0;
let screenShakeY = 0;
let screenShakeTimer = 0;
let screenShakeIntensity = 0;

// 时间缩放（击杀Boss时慢动作）
let timeScale = 1;
let timeScaleTimer = 0;

// 连击提示文字
let comboAnnouncements = [];    // { text, x, y, timer, color }

// 击杀特效粒子
let killParticles = [];

// 攻击动画状态
let attackAnimTimer = 0;      // 攻击动画计时器
let attackAnimDuration = 0.3; // 攻击动画持续时间
let attackTargetX = 0;        // 攻击目标方向
let attackTargetY = 0;
let isAttacking = false;      // 是否正在攻击动画中
let attackEffects = [];       // 攻击特效列表

// 技能使用动画
let skillAnimTimer = 0;
let skillAnimName = '';       // 当前技能动画名称

// 怪物数组
let monsters = [];
let monsterSpawnTimer = 0;
let monsterSpawnInterval = 3.0; // 初始生成间隔（更宽松）

// Boss系统
let bossTimer = 0;              // Boss计时器
let bossInterval = 60;          // 每60秒一个Boss
let bossWarningTimer = 0;       // Boss警告显示时间
let bossCount = 0;              // 已击杀Boss数量
let currentBoss = null;         // 当前Boss引用

// 怪物类型定义（降低早期怪物伤害，提高生存能力）
const MONSTER_TYPES = {
  zombie: {
    name: '僵尸',
    color: '#4A7C59',
    hp: 25,
    damage: 4,      // 大幅降低伤害
    speed: 0.0025,  // 稍慢移速
    exp: 25,        // 提高经验
    size: 0.8,
    unlockTime: 0,
    drawType: 'zombie'
  },
  skeleton: {
    name: '骷髅',
    color: '#E0E0E0',
    hp: 20,
    damage: 6,      // 降低伤害
    speed: 0.003,
    exp: 30,        // 提高经验
    size: 0.75,
    unlockTime: 30, // 延后出现时间
    drawType: 'skeleton'
  },
  ghost: {
    name: '幽灵',
    color: '#B0BEC5',
    hp: 18,
    damage: 8,      // 降低伤害
    speed: 0.004,
    exp: 35,
    size: 0.7,
    unlockTime: 45, // 延后出现
    drawType: 'ghost'
  },
  demon: {
    name: '恶魔',
    color: '#C62828',
    hp: 50,
    damage: 12,     // 降低伤害
    speed: 0.002,
    exp: 60,
    size: 1.0,
    unlockTime: 75, // 延后出现
    drawType: 'demon'
  },
  darkKnight: {
    name: '黑骑士',
    color: '#37474F',
    hp: 70,
    damage: 15,     // 降低伤害
    speed: 0.0018,
    exp: 80,
    size: 1.1,
    unlockTime: 100, // 延后出现
    drawType: 'knight'
  },
  boss: {
    name: '魔王',
    color: '#4A148C',
    hp: 180,
    damage: 20,     // 降低伤害
    speed: 0.0012,
    exp: 200,
    size: 1.4,
    unlockTime: 150, // 延后出现
    drawType: 'boss'
  }
};

// Boss类型定义（根据击杀数递进）
const BOSS_TYPES = [
  {
    name: '骷髅王',
    color: '#FFD700',
    baseHp: 300,
    baseDamage: 8,
    speed: 0.0015,
    size: 1.6,
    icon: '💀',
    description: '亡灵之王'
  },
  {
    name: '炎魔',
    color: '#FF4500',
    baseHp: 450,
    baseDamage: 12,
    speed: 0.0018,
    size: 1.7,
    icon: '🔥',
    description: '烈焰化身'
  },
  {
    name: '冰霜巨人',
    color: '#00BFFF',
    baseHp: 600,
    baseDamage: 10,
    speed: 0.0012,
    size: 1.8,
    icon: '❄️',
    description: '永冻之躯'
  },
  {
    name: '暗影领主',
    color: '#4B0082',
    baseHp: 800,
    baseDamage: 15,
    speed: 0.002,
    size: 1.9,
    icon: '👿',
    description: '黑暗主宰'
  },
  {
    name: '混沌魔神',
    color: '#FF00FF',
    baseHp: 1000,
    baseDamage: 18,
    speed: 0.0016,
    size: 2.0,
    icon: '☠️',
    description: '终极Boss'
  }
];

// 生成Boss
function spawnBoss() {
  // 根据已击杀Boss数选择类型（循环）
  const bossIndex = bossCount % BOSS_TYPES.length;
  const bossType = BOSS_TYPES[bossIndex];

  // Boss属性随击杀数增强（每轮+50%）
  const round = Math.floor(bossCount / BOSS_TYPES.length);
  const scaling = 1 + round * 0.5;

  // 在玩家前方生成Boss
  const angle = Math.random() * Math.PI * 2;
  const distance = 0.6;

  const boss = {
    x: playerX + Math.cos(angle) * distance,
    y: playerY + Math.sin(angle) * distance,
    hp: Math.floor(bossType.baseHp * scaling),
    maxHp: Math.floor(bossType.baseHp * scaling),
    damage: Math.floor(bossType.baseDamage * scaling),
    speed: bossType.speed,
    exp: 100 + bossCount * 50,  // 经验随Boss数增加
    size: bossType.size,
    color: bossType.color,
    name: bossType.name,
    icon: bossType.icon,
    isBoss: true,
    hitTimer: 0,
    bossIndex: bossIndex
  };

  monsters.push(boss);
  currentBoss = boss;
  playSound('skill');  // Boss出现音效

  console.log(`Boss出现: ${bossType.name} (HP: ${boss.hp})`);
}

// 获取可用的怪物类型（根据冒险时间）
function getAvailableMonsterTypes() {
  const available = [];
  for (const [key, info] of Object.entries(MONSTER_TYPES)) {
    if (adventureTime >= info.unlockTime) {
      available.push(key);
    }
  }
  return available;
}

// 计算怪物强化倍率（随时间增加）
function getMonsterScaling() {
  // 每30秒增加10%的属性
  let scaleFactor = 1 + Math.floor(adventureTime / 30) * 0.1;
  scaleFactor = Math.min(scaleFactor, 3.0); // 最多3倍

  // 每日挑战：强化敌人修饰符
  if (isDailyChallenge && hasDailyModifier('monster_hp')) {
    scaleFactor *= 1.3;  // 怪物生命值+30%
  }

  return scaleFactor;
}

// 创建怪物（在玩家周围的世界坐标生成）
function spawnMonster() {
  // 在玩家周围0.5-0.8距离处生成
  const angle = Math.random() * Math.PI * 2;
  const distance = 0.5 + Math.random() * 0.3;
  const x = playerX + Math.cos(angle) * distance;
  const y = playerY + Math.sin(angle) * distance;

  // 根据时间选择怪物类型
  const available = getAvailableMonsterTypes();
  // 新解锁的怪物有更高概率出现
  let type;
  const rand = Math.random();
  if (rand < 0.3 && available.length > 1) {
    // 30%概率生成最新解锁的怪物
    type = available[available.length - 1];
  } else {
    // 70%概率随机选择
    type = available[Math.floor(Math.random() * available.length)];
  }

  const info = MONSTER_TYPES[type];
  const scaling = getMonsterScaling();

  monsters.push({
    type,
    x,
    y,
    hp: Math.floor(info.hp * scaling),
    maxHp: Math.floor(info.hp * scaling),
    damage: Math.floor(info.damage * scaling),
    speed: info.speed * (0.8 + Math.random() * 0.4) * (1 + scaling * 0.1), // 速度也略微增加
    exp: Math.floor(info.exp * scaling),
    size: info.size,
    hitTimer: 0, // 被击中闪烁
    walkPhase: Math.random() * Math.PI * 2, // 走路动画相位
    floatPhase: Math.random() * Math.PI * 2 // 漂浮动画相位（幽灵用）
  });
}

// 绘制怪物（统一入口）
function drawMonster(x, y, scale, monster, time) {
  // Boss使用自己的属性，普通怪物从MONSTER_TYPES查找
  let info;
  let drawType;

  if (monster.isBoss) {
    // Boss直接使用自身属性
    info = {
      size: monster.size,
      color: monster.color
    };
    drawType = 'boss';
  } else {
    info = MONSTER_TYPES[monster.type];
    if (!info) {
      console.warn('Unknown monster type:', monster.type);
      return;
    }
    drawType = info.drawType;
  }

  // ===== 状态视觉效果（底层） =====
  drawMonsterStatusEffects(x, y, scale, monster, time, false);

  // 冻结/眩晕时颜色变化
  ctx.save();
  if (monster.freezeTimer > 0) {
    ctx.globalAlpha = 0.7;
    ctx.filter = 'saturate(0.3) brightness(1.3) hue-rotate(180deg)';
  } else if (monster.stunTimer > 0) {
    ctx.filter = 'brightness(1.5)';
  } else if (monster.slowTimer > 0) {
    ctx.filter = 'saturate(0.6)';
  }

  switch (drawType) {
    case 'zombie':
      drawZombieType(x, y, scale, monster, time, info);
      break;
    case 'skeleton':
      drawSkeletonType(x, y, scale, monster, time, info);
      break;
    case 'ghost':
      drawGhostType(x, y, scale, monster, time, info);
      break;
    case 'demon':
      drawDemonType(x, y, scale, monster, time, info);
      break;
    case 'knight':
      drawKnightType(x, y, scale, monster, time, info);
      break;
    case 'boss':
      drawBossType(x, y, scale, monster, time, info);
      break;
    default:
      drawZombieType(x, y, scale, monster, time, info);
  }

  ctx.restore();

  // ===== 状态视觉效果（顶层） =====
  drawMonsterStatusEffects(x, y, scale, monster, time, true);
}

// 绘制怪物状态特效
function drawMonsterStatusEffects(x, y, scale, monster, time, isTop) {
  const s = scale * (monster.isBoss ? 1.5 : 1);
  const h = BASE_UNIT * 1.5 * s;

  if (!isTop) {
    // 底层效果：冰冻光环、减速圈
    if (monster.freezeTimer > 0) {
      // 冰冻光环
      ctx.save();
      ctx.strokeStyle = '#88DDFF';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6 + Math.sin(time * 8) * 0.2;
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(x, y - h * 0.4, h * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      // 冰晶
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + time * 2;
        const r = h * 0.45;
        ctx.fillStyle = '#AAEEFF';
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r, y - h * 0.4 + Math.sin(a) * r * 0.5);
        ctx.lineTo(x + Math.cos(a + 0.1) * (r - 5), y - h * 0.4 + Math.sin(a + 0.1) * (r - 5) * 0.5);
        ctx.lineTo(x + Math.cos(a - 0.1) * (r - 5), y - h * 0.4 + Math.sin(a - 0.1) * (r - 5) * 0.5);
        ctx.fill();
      }
      ctx.restore();
    }

    if (monster.slowTimer > 0) {
      // 减速圈
      ctx.save();
      ctx.strokeStyle = '#8866FF';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(x, y, h * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  } else {
    // 顶层效果：火焰、眩晕星星
    if (monster.burnTimer > 0) {
      // 火焰粒子
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const flameT = (time * 4 + i * 0.7) % 1;
        const fx = x + Math.sin(time * 8 + i * 2) * h * 0.2;
        const fy = y - h * 0.3 - flameT * h * 0.5;
        const fSize = (1 - flameT) * h * 0.15;
        ctx.globalAlpha = (1 - flameT) * 0.8;
        ctx.fillStyle = flameT < 0.5 ? '#FFAA00' : '#FF4400';
        ctx.beginPath();
        ctx.arc(fx, fy, fSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (monster.stunTimer > 0) {
      // 眩晕星星
      ctx.save();
      ctx.fillStyle = '#FFFF00';
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < 3; i++) {
        const a = time * 5 + (i / 3) * Math.PI * 2;
        const r = h * 0.35;
        const sx = x + Math.cos(a) * r;
        const sy = y - h * 0.9 + Math.sin(a * 2) * 5;
        ctx.font = `${10 * scale}px sans-serif`;
        ctx.fillText('✦', sx, sy);
      }
      ctx.restore();
    }
  }
}

// 绘制僵尸类型
function drawZombieType(x, y, scale, monster, time, info) {
  const s = scale * info.size;
  const personH = BASE_UNIT * 1.5 * s;
  const len = personH / 3.5;
  const headR = len * 0.45;
  const bodyLen = len * 1.2;
  const legLen = len * 0.9;
  const armLen = len * 0.7;

  const t = time * 3 + monster.walkPhase;
  const legSwing = Math.sin(t) * 0.4;
  const armSwing = Math.sin(t + Math.PI) * 0.3;

  ctx.save();
  ctx.translate(x, y);

  const baseColor = monster.hitTimer > 0 ? '#FFFFFF' : info.color;
  ctx.strokeStyle = baseColor;
  ctx.fillStyle = baseColor;
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.lineCap = 'round';

  const hipY = 0;
  const shoulderY = -bodyLen;
  const headY = shoulderY - headR;

  // 腿
  ctx.beginPath();
  ctx.moveTo(-len * 0.2, hipY);
  ctx.lineTo(-len * 0.2 + Math.sin(legSwing) * legLen * 0.3, hipY + legLen);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.2, hipY);
  ctx.lineTo(len * 0.2 + Math.sin(-legSwing) * legLen * 0.3, hipY + legLen);
  ctx.stroke();

  // 身体
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(0, shoulderY);
  ctx.stroke();

  // 手臂（前伸）
  ctx.beginPath();
  ctx.moveTo(-len * 0.3, shoulderY);
  ctx.lineTo(-len * 0.3 + armLen * 0.8, shoulderY + Math.sin(armSwing) * armLen * 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.3, shoulderY);
  ctx.lineTo(len * 0.3 + armLen * 0.8, shoulderY + Math.sin(-armSwing) * armLen * 0.2);
  ctx.stroke();

  // 头
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(len * 0.1, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // 红眼
  ctx.fillStyle = '#FF0000';
  ctx.beginPath();
  ctx.arc(len * 0.05, headY - headR * 0.2, headR * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(len * 0.2, headY - headR * 0.2, headR * 0.15, 0, Math.PI * 2);
  ctx.fill();

  drawMonsterHPBar(len, headY, headR, monster);
  ctx.restore();
}

// 绘制骷髅类型
function drawSkeletonType(x, y, scale, monster, time, info) {
  const s = scale * info.size;
  const personH = BASE_UNIT * 1.5 * s;
  const len = personH / 3.5;
  const headR = len * 0.4;
  const bodyLen = len * 1.1;
  const legLen = len * 0.85;
  const armLen = len * 0.65;

  const t = time * 4 + monster.walkPhase;
  const legSwing = Math.sin(t) * 0.5;

  ctx.save();
  ctx.translate(x, y);

  const baseColor = monster.hitTimer > 0 ? '#FFFFFF' : info.color;
  ctx.strokeStyle = baseColor;
  ctx.fillStyle = baseColor;
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.lineCap = 'round';

  const hipY = 0;
  const shoulderY = -bodyLen;
  const headY = shoulderY - headR;

  // 骨腿
  ctx.beginPath();
  ctx.moveTo(-len * 0.15, hipY);
  ctx.lineTo(-len * 0.15 + Math.sin(legSwing) * legLen * 0.4, hipY + legLen);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.15, hipY);
  ctx.lineTo(len * 0.15 + Math.sin(-legSwing) * legLen * 0.4, hipY + legLen);
  ctx.stroke();

  // 脊椎（分节）
  for (let i = 0; i < 4; i++) {
    const segY = hipY - (bodyLen / 4) * i;
    ctx.beginPath();
    ctx.arc(0, segY, len * 0.08, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 肋骨
  ctx.beginPath();
  ctx.moveTo(-len * 0.25, shoulderY + bodyLen * 0.3);
  ctx.lineTo(len * 0.25, shoulderY + bodyLen * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-len * 0.2, shoulderY + bodyLen * 0.5);
  ctx.lineTo(len * 0.2, shoulderY + bodyLen * 0.5);
  ctx.stroke();

  // 手臂（骨头）
  ctx.beginPath();
  ctx.moveTo(-len * 0.25, shoulderY);
  ctx.lineTo(-len * 0.25 - armLen * 0.5, shoulderY + armLen * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.25, shoulderY);
  ctx.lineTo(len * 0.25 + armLen * 0.5, shoulderY + armLen * 0.3);
  ctx.stroke();

  // 头骨
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.stroke();

  // 眼眶（黑洞）
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(-len * 0.1, headY - headR * 0.1, headR * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(len * 0.1, headY - headR * 0.1, headR * 0.25, 0, Math.PI * 2);
  ctx.fill();

  // 牙齿
  ctx.strokeStyle = baseColor;
  ctx.beginPath();
  ctx.moveTo(-len * 0.12, headY + headR * 0.5);
  ctx.lineTo(len * 0.12, headY + headR * 0.5);
  ctx.stroke();

  drawMonsterHPBar(len, headY, headR, monster);
  ctx.restore();
}

// 绘制幽灵类型
function drawGhostType(x, y, scale, monster, time, info) {
  const s = scale * info.size;
  const personH = BASE_UNIT * 1.5 * s;
  const len = personH / 3.5;
  const headR = len * 0.5;

  // 漂浮动画
  const floatY = Math.sin(time * 2 + monster.floatPhase) * 5;
  const wobble = Math.sin(time * 3 + monster.floatPhase) * 0.1;

  ctx.save();
  ctx.translate(x, y + floatY);
  ctx.globalAlpha = 0.7; // 半透明

  const baseColor = monster.hitTimer > 0 ? '#FFFFFF' : info.color;
  ctx.fillStyle = baseColor;
  ctx.strokeStyle = baseColor;

  // 身体（飘逸的形状）
  ctx.beginPath();
  ctx.moveTo(0, -headR * 2);
  ctx.quadraticCurveTo(-len * 0.6, -headR, -len * 0.5 + wobble * len, len * 0.5);
  ctx.quadraticCurveTo(-len * 0.3, len * 0.3, 0, len * 0.6);
  ctx.quadraticCurveTo(len * 0.3, len * 0.3, len * 0.5 - wobble * len, len * 0.5);
  ctx.quadraticCurveTo(len * 0.6, -headR, 0, -headR * 2);
  ctx.fill();

  // 眼睛（发光）
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#00FFFF';
  ctx.beginPath();
  ctx.arc(-len * 0.15, -headR * 0.8, headR * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(len * 0.15, -headR * 0.8, headR * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  drawMonsterHPBar(len, -headR * 2, headR, monster);
  ctx.restore();
}

// 绘制恶魔类型
function drawDemonType(x, y, scale, monster, time, info) {
  const s = scale * info.size;
  const personH = BASE_UNIT * 1.5 * s;
  const len = personH / 3.5;
  const headR = len * 0.45;
  const bodyLen = len * 1.3;
  const legLen = len * 0.9;
  const armLen = len * 0.8;

  const t = time * 2.5 + monster.walkPhase;
  const legSwing = Math.sin(t) * 0.35;

  ctx.save();
  ctx.translate(x, y);

  const baseColor = monster.hitTimer > 0 ? '#FFFFFF' : info.color;
  ctx.strokeStyle = baseColor;
  ctx.fillStyle = baseColor;
  ctx.lineWidth = Math.max(1, 3 * s);
  ctx.lineCap = 'round';

  const hipY = 0;
  const shoulderY = -bodyLen;
  const headY = shoulderY - headR;

  // 粗壮的腿
  ctx.beginPath();
  ctx.moveTo(-len * 0.25, hipY);
  ctx.lineTo(-len * 0.3 + Math.sin(legSwing) * legLen * 0.3, hipY + legLen);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.25, hipY);
  ctx.lineTo(len * 0.3 + Math.sin(-legSwing) * legLen * 0.3, hipY + legLen);
  ctx.stroke();

  // 粗壮的身体
  ctx.lineWidth = Math.max(1, 4 * s);
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(0, shoulderY);
  ctx.stroke();

  // 强壮的手臂
  ctx.lineWidth = Math.max(1, 3 * s);
  ctx.beginPath();
  ctx.moveTo(-len * 0.4, shoulderY);
  ctx.lineTo(-len * 0.4 - armLen * 0.6, shoulderY + armLen * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.4, shoulderY);
  ctx.lineTo(len * 0.4 + armLen * 0.6, shoulderY + armLen * 0.4);
  ctx.stroke();

  // 头
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // 角
  ctx.strokeStyle = '#8B0000';
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.beginPath();
  ctx.moveTo(-headR * 0.6, headY - headR * 0.5);
  ctx.lineTo(-headR * 0.8, headY - headR * 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(headR * 0.6, headY - headR * 0.5);
  ctx.lineTo(headR * 0.8, headY - headR * 1.5);
  ctx.stroke();

  // 发光的眼睛
  ctx.fillStyle = '#FFFF00';
  ctx.beginPath();
  ctx.arc(-len * 0.1, headY - headR * 0.1, headR * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(len * 0.1, headY - headR * 0.1, headR * 0.2, 0, Math.PI * 2);
  ctx.fill();

  drawMonsterHPBar(len, headY, headR * 1.5, monster);
  ctx.restore();
}

// 绘制黑骑士类型
function drawKnightType(x, y, scale, monster, time, info) {
  const s = scale * info.size;
  const personH = BASE_UNIT * 1.5 * s;
  const len = personH / 3.5;
  const headR = len * 0.4;
  const bodyLen = len * 1.4;
  const legLen = len * 1.0;
  const armLen = len * 0.8;

  const t = time * 2 + monster.walkPhase;
  const legSwing = Math.sin(t) * 0.3;

  ctx.save();
  ctx.translate(x, y);

  const baseColor = monster.hitTimer > 0 ? '#FFFFFF' : info.color;
  ctx.strokeStyle = baseColor;
  ctx.fillStyle = baseColor;
  ctx.lineWidth = Math.max(1, 3.5 * s);
  ctx.lineCap = 'round';

  const hipY = 0;
  const shoulderY = -bodyLen;
  const headY = shoulderY - headR;

  // 铠甲腿
  ctx.beginPath();
  ctx.moveTo(-len * 0.25, hipY);
  ctx.lineTo(-len * 0.25 + Math.sin(legSwing) * legLen * 0.25, hipY + legLen);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.25, hipY);
  ctx.lineTo(len * 0.25 + Math.sin(-legSwing) * legLen * 0.25, hipY + legLen);
  ctx.stroke();

  // 铠甲身体
  ctx.lineWidth = Math.max(1, 5 * s);
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(0, shoulderY);
  ctx.stroke();

  // 肩甲
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(-len * 0.4, shoulderY, len * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(len * 0.4, shoulderY, len * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // 手臂持剑
  ctx.lineWidth = Math.max(1, 3 * s);
  ctx.beginPath();
  ctx.moveTo(-len * 0.4, shoulderY);
  ctx.lineTo(-len * 0.5, shoulderY + armLen * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.4, shoulderY);
  ctx.lineTo(len * 0.6, shoulderY + armLen * 0.3);
  ctx.stroke();

  // 剑
  ctx.strokeStyle = '#78909C';
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.beginPath();
  ctx.moveTo(len * 0.6, shoulderY + armLen * 0.3);
  ctx.lineTo(len * 0.6, shoulderY - armLen * 0.8);
  ctx.stroke();

  // 头盔
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // 头盔面罩缝隙（眼睛）
  ctx.strokeStyle = '#FF4444';
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath();
  ctx.moveTo(-headR * 0.5, headY);
  ctx.lineTo(headR * 0.5, headY);
  ctx.stroke();

  drawMonsterHPBar(len, headY, headR, monster);
  ctx.restore();
}

// 绘制魔王类型
function drawBossType(x, y, scale, monster, time, info) {
  const s = scale * info.size;
  const personH = BASE_UNIT * 1.5 * s;
  const len = personH / 3.5;
  const headR = len * 0.55;
  const bodyLen = len * 1.5;
  const legLen = len * 1.0;
  const armLen = len * 0.9;

  const t = time * 1.5 + monster.walkPhase;
  const legSwing = Math.sin(t) * 0.25;
  const breathe = Math.sin(time * 2) * 0.05; // 呼吸效果

  ctx.save();
  ctx.translate(x, y);

  const baseColor = monster.hitTimer > 0 ? '#FFFFFF' : info.color;
  ctx.strokeStyle = baseColor;
  ctx.fillStyle = baseColor;
  ctx.lineWidth = Math.max(1, 4 * s);
  ctx.lineCap = 'round';

  const hipY = 0;
  const shoulderY = -bodyLen * (1 + breathe);
  const headY = shoulderY - headR;

  // 粗壮的腿
  ctx.beginPath();
  ctx.moveTo(-len * 0.3, hipY);
  ctx.lineTo(-len * 0.35 + Math.sin(legSwing) * legLen * 0.2, hipY + legLen);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.3, hipY);
  ctx.lineTo(len * 0.35 + Math.sin(-legSwing) * legLen * 0.2, hipY + legLen);
  ctx.stroke();

  // 巨大的身体
  ctx.lineWidth = Math.max(1, 6 * s);
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(0, shoulderY);
  ctx.stroke();

  // 披风效果
  ctx.strokeStyle = '#1A0033';
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.beginPath();
  ctx.moveTo(-len * 0.5, shoulderY);
  ctx.quadraticCurveTo(-len * 0.7, hipY, -len * 0.4, hipY + legLen * 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.5, shoulderY);
  ctx.quadraticCurveTo(len * 0.7, hipY, len * 0.4, hipY + legLen * 0.8);
  ctx.stroke();

  // 强壮的手臂
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = Math.max(1, 4 * s);
  ctx.beginPath();
  ctx.moveTo(-len * 0.5, shoulderY);
  ctx.lineTo(-len * 0.7, shoulderY + armLen * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.5, shoulderY);
  ctx.lineTo(len * 0.7, shoulderY + armLen * 0.5);
  ctx.stroke();

  // 头
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // 王冠/角
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.beginPath();
  ctx.moveTo(-headR * 0.5, headY - headR * 0.8);
  ctx.lineTo(-headR * 0.3, headY - headR * 1.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, headY - headR);
  ctx.lineTo(0, headY - headR * 1.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(headR * 0.5, headY - headR * 0.8);
  ctx.lineTo(headR * 0.3, headY - headR * 1.6);
  ctx.stroke();

  // 邪恶的眼睛
  ctx.fillStyle = '#FF0000';
  ctx.beginPath();
  ctx.arc(-len * 0.12, headY - headR * 0.15, headR * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(len * 0.12, headY - headR * 0.15, headR * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // 光芒效果
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + time;
    const rayLen = headR * 0.8;
    ctx.beginPath();
    ctx.moveTo(0, headY);
    ctx.lineTo(Math.cos(angle) * rayLen, headY + Math.sin(angle) * rayLen);
    ctx.stroke();
  }

  drawMonsterHPBar(len * 1.2, headY, headR * 1.8, monster);
  ctx.restore();
}

// 绘制怪物血条（通用）- 增强版
function drawMonsterHPBar(len, headY, headR, monster) {
  if (monster.hp < monster.maxHp) {
    const barW = len * 2.2;
    const barH = 4;
    const barY = headY - headR - 10;
    const hpRatio = Math.max(0, monster.hp / monster.maxHp);

    // 背景条 - 圆角
    ctx.fillStyle = 'rgba(20, 15, 25, 0.8)';
    ctx.beginPath();
    ctx.roundRect(-barW / 2, barY, barW, barH, barH / 2);
    ctx.fill();

    // 血条 - 根据血量变色
    if (hpRatio > 0) {
      const hpColor = hpRatio > 0.5 ? '#4CAF50' : (hpRatio > 0.25 ? '#FFC107' : '#E53935');
      ctx.shadowColor = hpColor;
      ctx.shadowBlur = 6;
      ctx.fillStyle = hpColor;
      ctx.beginPath();
      ctx.roundRect(-barW / 2 + 1, barY + 1, Math.max(0, (barW - 2) * hpRatio), barH - 2, (barH - 2) / 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(-barW / 2, barY, barW, barH, barH / 2);
    ctx.stroke();
  }
}

// 开始冒险
function startAdventure() {
  initAudio();  // 确保音频初始化
  playSound('start');
  setMusicMode('combat');  // 切换到战斗音乐
  startMusic('combat');     // 确保音乐开始播放
  gameState = 'adventure';
  isPaused = false;
  // 记录当前选择的宫位（普通冒险使用当前宫位）
  if (!isDailyChallenge) {
    selectedPalace = currentPalace;
  }
  adventureTime = 0;
  killCount = 0;
  const stats = getPlayerStats();
  playerMaxHP = stats.hp;
  playerHP = playerMaxHP;
  playerMaxMP = 100;  // 基础蓝量
  playerMP = playerMaxMP;
  showDetailedStats = false;
  playerX = 0.5;
  playerY = 0.5;
  playerTargetX = 0.5;
  playerTargetY = 0.5;
  isMoving = false;
  monsters = [];
  monsterSpawnTimer = 0;
  monsterSpawnInterval = 3.0;
  // 重置Boss状态
  bossTimer = 0;
  bossWarningTimer = 0;
  currentBoss = null;
  comboCount = 0;
  // 重置拾取物
  collectibles = [];
  collectibleSpawnTimer = 0;
  goldCollected = 0;
  // 重置平滑方向
  smoothDirX = 0;
  smoothDirY = 0;
  // 重置技能
  playerSkills = [];
  playerPassive = null;
  skillCooldowns = {};
  skillEffects = [];
  passiveStacks = {};
  skillEnhancements = {}; // 重置技能强化等级
  isSelectingSkill = false;
  skillChoices = [];
  playerInvincible = 0;
  // 重置攻击动画
  attackAnimTimer = 0;
  isAttacking = false;
  attackEffects = [];
  skillAnimTimer = 0;
  skillAnimName = '';
  console.log('冒险开始！');
  // 开始时立即选择第一个技能
  startSkillSelection();
}

// 结束冒险
function endAdventure() {
  gameState = 'gameover';
  playSound('death');
  setMusicMode('idle');  // 死亡后切换到待机音乐

  // 如果是每日挑战，结束挑战并计算分数
  if (isDailyChallenge) {
    endDailyChallenge();
  }

  // 更新成就统计
  gameStats.totalRuns++;
  if (adventureTime > gameStats.bestTime) {
    gameStats.bestTime = Math.floor(adventureTime);
  }
  if (goldCollected > gameStats.bestGold) {
    gameStats.bestGold = goldCollected;
  }
  checkAchievements();
  saveAchievements();

  console.log(`冒险结束！击杀: ${killCount}, 存活时间: ${Math.floor(adventureTime)}秒`);
}

// 返回待机（死亡后重置所有数据）
function returnToIdle() {
  gameState = 'idle';
  isPaused = false;
  monsters = [];
  // 死亡后重置所有进度
  playerLevel = 1;
  playerExp = 0;
  expToNext = 60;
  currentClass = 'none';
  saveGameData();
  setMusicMode('idle');  // 切换到待机音乐
  console.log('数据已重置，从1级重新开始');
}

// 暂停游戏
function pauseGame() {
  if (gameState === 'adventure') {
    isPaused = true;
    console.log('游戏已暂停');
  }
}

// 继续游戏
function resumeGame() {
  isPaused = false;
  console.log('游戏继续');
}

// 放弃当前冒险（从暂停菜单退出）
function quitAdventure() {
  isPaused = false;
  returnToIdle();
}

// 绘制暂停按钮
function drawPauseButton() {
  const btnSize = 36;
  const btnX = W - btnSize - 10;
  const btnY = 60;

  // 按钮背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.arc(btnX + btnSize / 2, btnY + btnSize / 2, btnSize / 2, 0, Math.PI * 2);
  ctx.fill();

  // 暂停图标（两条竖线）
  ctx.fillStyle = '#FFFFFF';
  const barW = 6;
  const barH = 16;
  const gap = 4;
  ctx.fillRect(btnX + btnSize / 2 - barW - gap / 2, btnY + (btnSize - barH) / 2, barW, barH);
  ctx.fillRect(btnX + btnSize / 2 + gap / 2, btnY + (btnSize - barH) / 2, barW, barH);

  return { x: btnX, y: btnY, size: btnSize };
}

// 绘制音频控制按钮（设置按钮）
function drawSoundButton() {
  const btnSize = 36;

  // 设置按钮（右上角）
  const settingsBtnX = W - btnSize - 10;
  const settingsBtnY = 10;

  // 按钮背景 - 根据音频状态显示不同颜色
  const allOn = soundEnabled && musicEnabled;
  const allOff = !soundEnabled && !musicEnabled;
  ctx.fillStyle = allOn ? 'rgba(0, 100, 0, 0.6)' : (allOff ? 'rgba(100, 0, 0, 0.6)' : 'rgba(100, 80, 0, 0.6)');
  ctx.beginPath();
  ctx.arc(settingsBtnX + btnSize / 2, settingsBtnY + btnSize / 2, btnSize / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚙️', settingsBtnX + btnSize / 2, settingsBtnY + btnSize / 2);

  return {
    settings: { x: settingsBtnX, y: settingsBtnY, size: btnSize }
  };
}

// 设置面板按钮位置缓存
let settingsPanelButtons = null;

// 绘制设置面板
function drawSettingsPanel() {
  if (!showSettingsPanel) return;

  // 半透明背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, W, H);

  // 面板
  const panelW = Math.min(W - 40, 300);
  const panelH = 320;
  const panelX = (W - panelW) / 2;
  const panelY = (H - panelH) / 2;

  // 面板背景
  ctx.fillStyle = 'rgba(40, 40, 60, 0.95)';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 3;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  // 标题
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚙️ 音频设置', W / 2, panelY + 30);

  // 音效设置区域
  let y = panelY + 70;
  const sliderW = panelW - 60;
  const sliderX = panelX + 30;
  const sliderH = 24;
  const dotSize = 20;

  // 音效开关和音量
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🔊 音效', sliderX, y);

  // 音效开关
  const soundToggleX = sliderX + sliderW - 50;
  ctx.fillStyle = soundEnabled ? '#00AA00' : '#AA0000';
  ctx.fillRect(soundToggleX, y - 12, 50, 24);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(soundEnabled ? '开' : '关', soundToggleX + 25, y);

  // 音效音量滑块
  y += 35;
  ctx.fillStyle = '#333333';
  ctx.fillRect(sliderX, y, sliderW, sliderH);

  // 音量等级指示
  for (let i = 0; i <= 4; i++) {
    const dotX = sliderX + (sliderW / 4) * i;
    const isActive = i <= soundVolumeLevel;
    ctx.fillStyle = isActive ? '#00FF00' : '#555555';
    ctx.beginPath();
    ctx.arc(dotX, y + sliderH / 2, isActive ? dotSize / 2 : dotSize / 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 百分比显示
  ctx.fillStyle = '#AAAAAA';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${VOLUME_LEVELS[soundVolumeLevel] * 100}%`, sliderX + sliderW, y - 5);

  // 音乐设置区域
  y += 55;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🎵 音乐', sliderX, y);

  // 音乐开关
  const musicToggleX = sliderX + sliderW - 50;
  ctx.fillStyle = musicEnabled ? '#00AA00' : '#AA0000';
  ctx.fillRect(musicToggleX, y - 12, 50, 24);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(musicEnabled ? '开' : '关', musicToggleX + 25, y);

  // 音乐音量滑块
  y += 35;
  ctx.fillStyle = '#333333';
  ctx.fillRect(sliderX, y, sliderW, sliderH);

  // 音量等级指示
  for (let i = 0; i <= 4; i++) {
    const dotX = sliderX + (sliderW / 4) * i;
    const isActive = i <= musicVolumeLevel;
    ctx.fillStyle = isActive ? '#9966FF' : '#555555';
    ctx.beginPath();
    ctx.arc(dotX, y + sliderH / 2, isActive ? dotSize / 2 : dotSize / 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 百分比显示
  ctx.fillStyle = '#AAAAAA';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${VOLUME_LEVELS[musicVolumeLevel] * 100}%`, sliderX + sliderW, y - 5);

  // 关闭按钮
  const closeBtnY = panelY + panelH - 50;
  const closeBtnW = 100;
  const closeBtnH = 36;
  const closeBtnX = (W - closeBtnW) / 2;

  ctx.fillStyle = 'rgba(100, 100, 100, 0.9)';
  ctx.fillRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('关闭', W / 2, closeBtnY + closeBtnH / 2);

  // 缓存按钮位置
  settingsPanelButtons = {
    soundToggle: { x: soundToggleX, y: panelY + 70 - 12, w: 50, h: 24 },
    soundSlider: { x: sliderX, y: panelY + 105, w: sliderW, h: sliderH },
    musicToggle: { x: musicToggleX, y: panelY + 160 - 12, w: 50, h: 24 },
    musicSlider: { x: sliderX, y: panelY + 195, w: sliderW, h: sliderH },
    close: { x: closeBtnX, y: closeBtnY, w: closeBtnW, h: closeBtnH }
  };
}

// 绘制暂停菜单
function drawPauseMenu() {
  const time = Date.now() * 0.001;

  // 渐变遮罩
  const overlayGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W * 0.7);
  overlayGrad.addColorStop(0, 'rgba(15, 15, 30, 0.85)');
  overlayGrad.addColorStop(1, 'rgba(5, 5, 15, 0.95)');
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, 0, W, H);

  // 背景网格动画
  ctx.save();
  ctx.strokeStyle = 'rgba(100, 100, 200, 0.1)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(time + x * 0.01) * 5, 0);
    ctx.lineTo(x + Math.sin(time + x * 0.01) * 5, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.cos(time + y * 0.01) * 5);
    ctx.lineTo(W, y + Math.cos(time + y * 0.01) * 5);
    ctx.stroke();
  }
  ctx.restore();

  // 面板背景
  const panelW = 200;
  const panelH = 250;
  const panelX = (W - panelW) / 2;
  const panelY = (H - panelH) / 2 - 20;

  ctx.save();
  ctx.shadowColor = STYLE.glowPurple;
  ctx.shadowBlur = 30;
  roundRect(panelX, panelY, panelW, panelH, 16);
  const panelGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  panelGrad.addColorStop(0, 'rgba(30, 28, 55, 0.98)');
  panelGrad.addColorStop(1, 'rgba(20, 18, 40, 0.98)');
  ctx.fillStyle = panelGrad;
  ctx.fill();

  // 面板边框
  ctx.shadowBlur = 0;
  roundRect(panelX, panelY, panelW, panelH, 16);
  const borderGrad = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY + panelH);
  borderGrad.addColorStop(0, STYLE.primary);
  borderGrad.addColorStop(0.5, STYLE.glowPurple);
  borderGrad.addColorStop(1, STYLE.secondary);
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 暂停标题 - 发光效果
  ctx.save();
  ctx.shadowColor = STYLE.glowBlue;
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⏸ 游戏暂停', W / 2, panelY + 40);
  ctx.restore();

  // 当前状态 - 带图标
  ctx.font = '13px sans-serif';
  ctx.fillStyle = STYLE.glowBlue;
  ctx.textAlign = 'center';
  ctx.fillText(`⚔ Lv.${playerLevel}  💀 ${killCount}  ⏱ ${Math.floor(adventureTime)}s`, W / 2, panelY + 80);

  // 分割线
  ctx.beginPath();
  ctx.moveTo(panelX + 20, panelY + 100);
  ctx.lineTo(panelX + panelW - 20, panelY + 100);
  ctx.strokeStyle = 'rgba(100, 100, 200, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 继续按钮
  const btnW = 160;
  const btnH = 48;
  const btnX = (W - btnW) / 2;
  const resumeBtnY = panelY + 120;

  ctx.save();
  ctx.shadowColor = STYLE.success;
  ctx.shadowBlur = 15;
  roundRect(btnX, resumeBtnY, btnW, btnH, 10);
  const resumeGrad = ctx.createLinearGradient(btnX, resumeBtnY, btnX, resumeBtnY + btnH);
  resumeGrad.addColorStop(0, 'rgba(34, 197, 94, 0.9)');
  resumeGrad.addColorStop(1, 'rgba(22, 163, 74, 0.9)');
  ctx.fillStyle = resumeGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('▶ 继续游戏', btnX + btnW / 2, resumeBtnY + btnH / 2);

  // 退出按钮
  const quitBtnY = panelY + 185;
  ctx.save();
  ctx.shadowColor = STYLE.danger;
  ctx.shadowBlur = 15;
  roundRect(btnX, quitBtnY, btnW, btnH, 10);
  const quitGrad = ctx.createLinearGradient(btnX, quitBtnY, btnX, quitBtnY + btnH);
  quitGrad.addColorStop(0, 'rgba(239, 68, 68, 0.9)');
  quitGrad.addColorStop(1, 'rgba(185, 28, 28, 0.9)');
  ctx.fillStyle = quitGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('✕ 放弃冒险', btnX + btnW / 2, quitBtnY + btnH / 2);

  return {
    resumeBtn: { x: btnX, y: resumeBtnY, w: btnW, h: btnH },
    quitBtn: { x: btnX, y: quitBtnY, w: btnW, h: btnH }
  };
}

// 攻击怪物
function attackMonsters() {
  const stats = getPlayerStats();

  // 使用职业攻速
  if (walkTime - lastAttackTime < stats.atkSpd) return;

  let hitAny = false;
  let firstTarget = null;

  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];
    const dx = m.x - playerX;
    const dy = m.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 使用职业攻击范围
    if (dist < stats.range) {
      // 记录第一个攻击目标（用于动画方向）
      if (!firstTarget) {
        firstTarget = m;
        attackTargetX = dx;
        attackTargetY = dy;
      }

      // 计算伤害（含暴击）
      let damage = stats.dmg;
      const isCrit = Math.random() * 100 < stats.luck;
      if (isCrit) {
        damage = Math.floor(damage * 2); // 暴击2倍伤害
      }

      m.hp -= damage;
      m.hitTimer = isCrit ? 0.25 : 0.15; // 暴击闪烁更久
      hitAny = true;

      // 应用武器特殊效果
      if (stats.weaponBonus && stats.weaponBonus.effect !== 'none') {
        applyWeaponEffect(m, stats.weaponBonus, damage);
      }

      // 播放击中音效
      playSound(isCrit ? 'crit' : 'hit');

      // 创建攻击特效
      createAttackEffect(m.x, m.y, damage, isCrit);

      if (m.hp <= 0) {
        // 怪物死亡
        playSound('kill');
        playerExp += m.exp;
        killCount++;
        comboCount++;

        // 触发击杀反馈效果
        onKill(m, m.isBoss);

        // 更新成就统计
        gameStats.totalKills++;
        if (comboCount > gameStats.bestCombo) {
          gameStats.bestCombo = comboCount;
        }

        // Boss击杀特殊奖励
        if (m.isBoss) {
          bossCount++;
          gameStats.totalBossKills++;
          currentBoss = null;
          // Boss击杀回满血
          playerHP = playerMaxHP;

          // Boss掉落武器碎片（有自定义武器时掉落更多）
          const fragmentDrop = customWeapon ? (2 + Math.floor(bossCount / 2)) : 1;
          weaponFragments += fragmentDrop;
          saveWeaponFragments();
          showFloatingText(`+${fragmentDrop} 武器碎片`, '#FFD700');

          // 触发技能选择
          if (!isSelectingSkill && !isSelectingClass) {
            startSkillSelection();
          }
          console.log(`Boss已击杀! 总计: ${bossCount}, 获得碎片: ${fragmentDrop}`);
        }

        // 检查成就
        checkAchievements();

        monsters.splice(i, 1);

        // 升级检测
        while (playerExp >= expToNext) {
          playerExp -= expToNext;
          playerLevel++;
          // 前10级经验需求增长较慢，之后加速
          if (playerLevel <= 10) {
            expToNext = 60 + (playerLevel - 1) * 20; // 60, 80, 100, 120...
          } else {
            expToNext = Math.floor(expToNext * 1.3); // 10级后增长加速
          }
          const newStats = getPlayerStats();
          playerMaxHP = newStats.hp;
          playerHP = Math.min(playerHP + 20, playerMaxHP);
          playSound('levelup');
          console.log(`升级! Lv.${playerLevel}`);
          // 更新最高等级成就
          if (playerLevel > gameStats.maxLevel) {
            gameStats.maxLevel = playerLevel;
            checkAchievements();
          }
          saveGameData(); // 保存升级数据
          // 10级时触发职业选择
          if (playerLevel === 10 && currentClass === 'none') {
            startClassSelection();
          }
          // 触发技能选择
          else if (!isSelectingSkill && !isSelectingClass) {
            startSkillSelection();
          }
        }
      }
    }
  }

  if (hitAny) {
    lastAttackTime = walkTime;
    // 触发攻击动画
    isAttacking = true;
    attackAnimTimer = attackAnimDuration;
  }
}

// ==================== 爽感反馈系统 ====================

// 触发屏幕震动
function triggerScreenShake(intensity, duration) {
  screenShakeIntensity = Math.max(screenShakeIntensity, intensity);
  screenShakeTimer = Math.max(screenShakeTimer, duration);
}

// 触发时间缩放（慢动作）
function triggerTimeScale(scale, duration) {
  timeScale = scale;
  timeScaleTimer = duration;
}

// 更新屏幕震动
function updateScreenShake(dt) {
  if (screenShakeTimer > 0) {
    screenShakeTimer -= dt;
    const intensity = screenShakeIntensity * (screenShakeTimer / 0.3);
    screenShakeX = (Math.random() - 0.5) * intensity * W * 0.02;
    screenShakeY = (Math.random() - 0.5) * intensity * H * 0.02;
  } else {
    screenShakeX = 0;
    screenShakeY = 0;
    screenShakeIntensity = 0;
  }
}

// 更新时间缩放
function updateTimeScale(dt) {
  if (timeScaleTimer > 0) {
    timeScaleTimer -= dt;
  } else {
    timeScale = 1;
  }
}

// 添加连击提示
function addComboAnnouncement(text, color = '#FFD700') {
  comboAnnouncements.push({
    text: text,
    x: W / 2,
    y: H * 0.3,
    timer: 1.5,
    color: color,
    scale: 2.0
  });
}

// 创建击杀粒子效果
function createKillParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const speed = 0.3 + Math.random() * 0.3;
    killParticles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      timer: 0.5 + Math.random() * 0.3,
      color: color,
      size: 3 + Math.random() * 4
    });
  }
}

// 处理击杀反馈（在击杀时调用）
function onKill(monster, isBoss = false) {
  // 重置连击计时
  comboTimer = 2.0;

  // 创建击杀粒子
  createKillParticles(monster.x, monster.y, monster.color || '#FF4444', isBoss ? 20 : 8);

  // 震动强度
  if (isBoss) {
    triggerScreenShake(1.5, 0.4);
    triggerTimeScale(0.3, 0.3);
    addComboAnnouncement('💀 BOSS击杀！', '#FF4500');
  } else {
    triggerScreenShake(0.3, 0.1);
  }

  // 连击播报
  const milestones = [5, 10, 20, 30, 50, 75, 100, 150, 200];
  for (const m of milestones) {
    if (comboCount >= m && lastComboAnnounce < m) {
      lastComboAnnounce = m;
      let text, color;
      if (m >= 100) {
        text = `🔥 ${m} COMBO! 无双！`;
        color = '#FF0000';
        triggerScreenShake(1.0, 0.3);
      } else if (m >= 50) {
        text = `⚡ ${m} COMBO! 狂暴！`;
        color = '#FF4500';
        triggerScreenShake(0.7, 0.2);
      } else if (m >= 20) {
        text = `💥 ${m} COMBO! 连斩！`;
        color = '#FFD700';
        triggerScreenShake(0.5, 0.15);
      } else {
        text = `✨ ${m} COMBO!`;
        color = '#00FF00';
      }
      addComboAnnouncement(text, color);
      playSound('skill');
      break;
    }
  }
}

// 更新连击计时
function updateComboTimer(dt) {
  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) {
      // 连击中断
      if (comboCount >= 10) {
        addComboAnnouncement(`连击结束: ${comboCount}`, '#888888');
      }
      comboCount = 0;
      lastComboAnnounce = 0;
    }
  }
}

// 更新连击提示
function updateComboAnnouncements(dt) {
  for (let i = comboAnnouncements.length - 1; i >= 0; i--) {
    const a = comboAnnouncements[i];
    a.timer -= dt;
    a.y -= dt * 30; // 上升
    a.scale = Math.max(1.0, a.scale - dt * 2); // 缩小
    if (a.timer <= 0) {
      comboAnnouncements.splice(i, 1);
    }
  }
}

// 更新击杀粒子
function updateKillParticles(dt) {
  for (let i = killParticles.length - 1; i >= 0; i--) {
    const p = killParticles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += dt * 0.5; // 重力
    p.timer -= dt;
    if (p.timer <= 0) {
      killParticles.splice(i, 1);
    }
  }
}

// 绘制连击提示
function drawComboAnnouncements() {
  for (const a of comboAnnouncements) {
    const alpha = Math.min(1, a.timer / 0.3);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = a.color;
    ctx.font = `bold ${Math.floor(24 * a.scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 描边
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(a.text, a.x, a.y);
    ctx.fillText(a.text, a.x, a.y);

    ctx.restore();
  }
}

// 绘制击杀粒子
function drawKillParticles() {
  for (const p of killParticles) {
    const alpha = p.timer / 0.8;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(p.x * W, p.y * H, p.size * (1 + (1 - alpha) * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// 绘制连击计数（HUD）
function drawComboCounter() {
  if (comboCount >= 3) {
    const x = 10;
    const y = H - 80;
    const pulse = 1 + Math.sin(Date.now() / 100) * 0.1;

    ctx.save();
    ctx.fillStyle = comboCount >= 50 ? '#FF4500' : (comboCount >= 20 ? '#FFD700' : '#00FF00');
    ctx.font = `bold ${Math.floor(20 * pulse)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText(`${comboCount} COMBO`, x, y);
    ctx.fillText(`${comboCount} COMBO`, x, y);

    // 连击条
    const barWidth = 60;
    const barHeight = 4;
    const progress = comboTimer / 2.0;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y + 15, barWidth, barHeight);
    ctx.fillStyle = comboCount >= 20 ? '#FFD700' : '#00FF00';
    ctx.fillRect(x, y + 15, barWidth * progress, barHeight);

    ctx.restore();
  }
}

// ==================== 战绩分享系统 ====================

// 计算战斗评级
function calculateBattleRating() {
  const killScore = killCount * 10;
  const timeScore = Math.floor(adventureTime) * 5;
  const comboScore = gameStats.bestCombo * 3;
  const bossScore = bossCount * 100;
  const levelScore = playerLevel * 50;
  const goldScore = goldCollected * 2;

  const totalScore = killScore + timeScore + comboScore + bossScore + levelScore + goldScore;

  if (totalScore >= 5000) return { grade: 'SSS', color: '#FFD700', desc: '传说级' };
  if (totalScore >= 3000) return { grade: 'SS', color: '#FF6600', desc: '史诗级' };
  if (totalScore >= 2000) return { grade: 'S', color: '#FF00FF', desc: '卓越' };
  if (totalScore >= 1200) return { grade: 'A', color: '#00FF00', desc: '优秀' };
  if (totalScore >= 600) return { grade: 'B', color: '#00BFFF', desc: '良好' };
  if (totalScore >= 300) return { grade: 'C', color: '#FFFFFF', desc: '普通' };
  return { grade: 'D', color: '#888888', desc: '新手' };
}

// 生成分享文案
function generateShareText() {
  const rating = calculateBattleRating();
  const palace = Object.keys(PALACE_BONUS).find(p => selectedPalace === p) || '未知';
  const skills = playerSkills.map(s => s.name).join('、') || '无';

  let text = `【八卦立方体】战绩分享\n`;
  text += `━━━━━━━━━━━━━\n`;
  text += `🎖️ 评级: ${rating.grade} (${rating.desc})\n`;
  text += `☯️ 宫位: ${palace}宫\n`;
  text += `━━━━━━━━━━━━━\n`;
  text += `⚔️ 击杀: ${killCount}只\n`;
  text += `⏱️ 存活: ${Math.floor(adventureTime)}秒\n`;
  text += `🔥 最高连击: ${gameStats.bestCombo}\n`;
  text += `💀 Boss击杀: ${bossCount}\n`;
  text += `📊 等级: Lv.${playerLevel}\n`;
  text += `💰 金币: ${goldCollected}\n`;
  text += `━━━━━━━━━━━━━\n`;
  text += `🌟 技能: ${skills}\n`;
  text += `━━━━━━━━━━━━━\n`;
  text += `来挑战我的记录吧！`;

  return text;
}

// 分享战绩（微信小游戏）
function shareBattleResult() {
  const rating = calculateBattleRating();

  try {
    wx.shareAppMessage({
      title: `【${rating.grade}级】我在八卦立方体击杀了${killCount}只怪物，存活${Math.floor(adventureTime)}秒！`,
      query: `kill=${killCount}&time=${Math.floor(adventureTime)}&grade=${rating.grade}`,
      imageUrl: '' // 可以后续添加自定义分享图
    });
  } catch (e) {
    console.log('分享功能不可用');
  }
}

// 绘制战绩结算屏幕
function drawBattleResultScreen() {
  // 背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, W, H);

  // 标题
  ctx.fillStyle = '#FF4444';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💀 战斗结束', W / 2, 45);

  // 评级展示
  const rating = calculateBattleRating();
  const ratingY = 95;

  // 评级背景光晕
  const glowIntensity = 0.5 + Math.sin(Date.now() / 300) * 0.3;
  ctx.shadowColor = rating.color;
  ctx.shadowBlur = 20 * glowIntensity;

  ctx.fillStyle = rating.color;
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText(rating.grade, W / 2, ratingY);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#AAAAAA';
  ctx.font = '14px sans-serif';
  ctx.fillText(rating.desc, W / 2, ratingY + 30);

  // 战绩面板
  const panelY = 145;
  const panelH = 180;

  ctx.fillStyle = 'rgba(40, 40, 60, 0.9)';
  ctx.fillRect(20, panelY, W - 40, panelH);
  ctx.strokeStyle = rating.color;
  ctx.lineWidth = 2;
  ctx.strokeRect(20, panelY, W - 40, panelH);

  // 战绩数据 - 左列
  ctx.textAlign = 'left';
  ctx.font = '14px sans-serif';
  const leftX = 40;
  let y = panelY + 25;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`⚔️ 击杀数`, leftX, y);
  ctx.fillStyle = '#00FF00';
  ctx.textAlign = 'right';
  ctx.fillText(`${killCount}`, W / 2 - 20, y);

  y += 28;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`⏱️ 存活时间`, leftX, y);
  ctx.fillStyle = '#00BFFF';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.floor(adventureTime)}秒`, W / 2 - 20, y);

  y += 28;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`🔥 最高连击`, leftX, y);
  ctx.fillStyle = '#FF6600';
  ctx.textAlign = 'right';
  ctx.fillText(`${gameStats.bestCombo}`, W / 2 - 20, y);

  // 战绩数据 - 右列
  const rightX = W / 2 + 20;
  y = panelY + 25;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`💀 Boss击杀`, rightX, y);
  ctx.fillStyle = '#FF4500';
  ctx.textAlign = 'right';
  ctx.fillText(`${bossCount}`, W - 40, y);

  y += 28;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`📊 达到等级`, rightX, y);
  ctx.fillStyle = '#FFD700';
  ctx.textAlign = 'right';
  ctx.fillText(`Lv.${playerLevel}`, W - 40, y);

  y += 28;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`💰 获得金币`, rightX, y);
  ctx.fillStyle = '#FFD700';
  ctx.textAlign = 'right';
  ctx.fillText(`${goldCollected}`, W - 40, y);

  // 宫位和技能
  y = panelY + panelH - 35;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#888888';
  ctx.font = '12px sans-serif';
  const palace = selectedPalace || '未选择';
  const trigramSymbols = { '乾': '☰', '坤': '☷', '震': '☳', '巽': '☴', '坎': '☵', '离': '☲', '艮': '☶', '兑': '☱' };
  ctx.fillText(`${trigramSymbols[palace] || ''} ${palace}宫 | 技能: ${playerSkills.length}个`, W / 2, y);

  // 历史最佳提示
  const newRecords = [];
  if (killCount > 0 && killCount >= gameStats.totalKills / Math.max(1, gameStats.totalRuns) * 1.5) {
    newRecords.push('击杀');
  }
  if (adventureTime >= gameStats.bestTime) {
    newRecords.push('存活');
  }
  if (goldCollected >= gameStats.bestGold) {
    newRecords.push('金币');
  }

  if (newRecords.length > 0) {
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`🎉 新纪录: ${newRecords.join('、')}`, W / 2, panelY + panelH + 15);
  }

  // 每日挑战分数展示
  if (dailyChallengeScore > 0) {
    const dailyY = newRecords.length > 0 ? panelY + panelH + 35 : panelY + panelH + 15;

    ctx.fillStyle = 'rgba(255, 165, 0, 0.9)';
    ctx.fillRect(40, dailyY, W - 80, 45);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, dailyY, W - 80, 45);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📅 每日挑战分数', W / 2, dailyY + 15);

    ctx.font = 'bold 18px sans-serif';
    const isNewBest = dailyChallengeScore >= todayBestScore;
    ctx.fillStyle = isNewBest ? '#FFD700' : '#FFFFFF';
    ctx.fillText(`${dailyChallengeScore} 分 ${isNewBest ? '(今日最佳!)' : `(最佳: ${todayBestScore})`}`, W / 2, dailyY + 36);
  }

  // 按钮区域
  const btnY = panelY + panelH + (dailyChallengeScore > 0 ? 90 : 35);
  const btnW = 100;
  const btnH = 42;
  const btnGap = 15;

  // 分享按钮
  const shareBtnX = (W - btnW * 2 - btnGap) / 2;
  ctx.fillStyle = 'rgba(0, 120, 200, 0.9)';
  ctx.fillRect(shareBtnX, btnY, btnW, btnH);
  ctx.strokeStyle = '#00BFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(shareBtnX, btnY, btnW, btnH);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('📤 分享', shareBtnX + btnW / 2, btnY + btnH / 2);

  // 返回按钮
  const returnBtnX = shareBtnX + btnW + btnGap;
  ctx.fillStyle = 'rgba(50, 150, 50, 0.9)';
  ctx.fillRect(returnBtnX, btnY, btnW, btnH);
  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 2;
  ctx.strokeRect(returnBtnX, btnY, btnW, btnH);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('🏠 返回', returnBtnX + btnW / 2, btnY + btnH / 2);

  // 再来一局按钮
  const retryBtnY = btnY + btnH + 10;
  const retryBtnW = btnW * 2 + btnGap;
  ctx.fillStyle = 'rgba(200, 50, 50, 0.9)';
  ctx.fillRect(shareBtnX, retryBtnY, retryBtnW, btnH);
  ctx.strokeStyle = '#FF4444';
  ctx.lineWidth = 2;
  ctx.strokeRect(shareBtnX, retryBtnY, retryBtnW, btnH);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('⚔️ 再来一局', W / 2, retryBtnY + btnH / 2);

  // 小提示
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '10px sans-serif';
  ctx.fillText('分享给好友，挑战你的记录！', W / 2, retryBtnY + btnH + 20);

  // 保存按钮位置用于点击检测
  battleResultButtons = {
    share: { x: shareBtnX, y: btnY, w: btnW, h: btnH },
    return: { x: returnBtnX, y: btnY, w: btnW, h: btnH },
    retry: { x: shareBtnX, y: retryBtnY, w: retryBtnW, h: btnH }
  };
}

// 战绩按钮位置
let battleResultButtons = null;

// 创建攻击特效
function createAttackEffect(targetX, targetY, damage, isCrit) {
  const character = getCurrentCharacter();

  // 斩击特效
  attackEffects.push({
    type: 'slash',
    x: targetX,
    y: targetY,
    angle: Math.atan2(targetY - playerY, targetX - playerX),
    timer: 0.25,
    duration: 0.25,
    color: character.color || '#FFFFFF',
    size: isCrit ? 1.5 : 1.0
  });

  // 伤害数字
  attackEffects.push({
    type: 'damage_number',
    x: targetX + (Math.random() - 0.5) * 0.05,
    y: targetY,
    damage: damage,
    isCrit: isCrit,
    timer: 0.8,
    duration: 0.8,
    vy: -0.15 // 上升速度
  });

  // 暴击特效
  if (isCrit) {
    attackEffects.push({
      type: 'crit_burst',
      x: targetX,
      y: targetY,
      timer: 0.4,
      duration: 0.4
    });
  }
}

// 更新攻击特效
function updateAttackEffects(dt) {
  // 更新攻击动画
  if (attackAnimTimer > 0) {
    attackAnimTimer -= dt;
    if (attackAnimTimer <= 0) {
      isAttacking = false;
    }
  }

  // 更新技能动画
  if (skillAnimTimer > 0) {
    skillAnimTimer -= dt;
    if (skillAnimTimer <= 0) {
      skillAnimName = '';
    }
  }

  // 更新特效
  for (let i = attackEffects.length - 1; i >= 0; i--) {
    const effect = attackEffects[i];
    effect.timer -= dt;

    // 伤害数字上升
    if (effect.type === 'damage_number') {
      effect.y += effect.vy * dt;
    }

    // 移除过期特效
    if (effect.timer <= 0) {
      attackEffects.splice(i, 1);
    }
  }
}

// 绘制攻击特效
function drawAttackEffects(groundQuad) {
  for (const effect of attackEffects) {
    // 转换到屏幕坐标
    const screenX = effect.x - playerX + 0.5;
    const screenY = effect.y - playerY + 0.5;

    if (screenX < -0.2 || screenX > 1.2 || screenY < -0.2 || screenY > 1.2) continue;

    const pt = getGroundPoint(groundQuad, Math.max(0, Math.min(1, screenX)), Math.max(0, Math.min(1, screenY)));
    const progress = 1 - effect.timer / effect.duration;

    ctx.save();

    switch (effect.type) {
      case 'slash':
        // 斩击弧线
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 4 * effect.size * pt.scale;
        ctx.globalAlpha = 1 - progress;
        ctx.lineCap = 'round';

        const slashLen = 25 * effect.size * pt.scale;
        const slashAngle = effect.angle;
        const spread = Math.PI * 0.6;

        ctx.beginPath();
        ctx.arc(pt.x, pt.y - 10, slashLen,
          slashAngle - spread / 2 + progress * 0.3,
          slashAngle + spread / 2 + progress * 0.3);
        ctx.stroke();

        // 内层亮线
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2 * effect.size * pt.scale;
        ctx.globalAlpha = (1 - progress) * 0.8;
        ctx.stroke();
        break;

      case 'damage_number':
        // 伤害数字
        const fontSize = effect.isCrit ? 18 : 14;
        ctx.font = `bold ${fontSize * pt.scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = Math.min(1, effect.timer / 0.3);

        // 文字阴影
        ctx.fillStyle = '#000000';
        ctx.fillText(effect.damage.toString(), pt.x + 1, pt.y - 20 * pt.scale + 1);

        // 伤害数字
        ctx.fillStyle = effect.isCrit ? '#FF4444' : '#FFFFFF';
        ctx.fillText(effect.damage.toString(), pt.x, pt.y - 20 * pt.scale);

        // 暴击标签
        if (effect.isCrit) {
          ctx.font = `bold ${10 * pt.scale}px sans-serif`;
          ctx.fillStyle = '#FFD700';
          ctx.fillText('暴击!', pt.x, pt.y - 35 * pt.scale);
        }
        break;

      case 'crit_burst':
        // 暴击爆发效果
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 1 - progress;

        const burstRadius = 15 + progress * 25;
        const rays = 8;
        for (let i = 0; i < rays; i++) {
          const angle = (i / rays) * Math.PI * 2 + progress * Math.PI;
          const innerR = burstRadius * 0.3;
          const outerR = burstRadius;
          ctx.beginPath();
          ctx.moveTo(pt.x + Math.cos(angle) * innerR, pt.y - 10 + Math.sin(angle) * innerR * 0.5);
          ctx.lineTo(pt.x + Math.cos(angle) * outerR, pt.y - 10 + Math.sin(angle) * outerR * 0.5);
          ctx.stroke();
        }
        break;

      case 'skill_name':
        // 技能名称显示
        ctx.globalAlpha = progress < 0.2 ? progress * 5 : (1 - (progress - 0.2) / 0.8);
        const nameY = pt.y - 60 * pt.scale - progress * 20;

        // 背景条
        ctx.fillStyle = effect.color || '#FFFFFF';
        const nameWidth = ctx.measureText(effect.name).width + 30;
        ctx.fillRect(pt.x - nameWidth / 2, nameY - 12, nameWidth, 24);

        // 技能图标和名称
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${14 * pt.scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${effect.icon} ${effect.name}`, pt.x, nameY);
        break;

      case 'skill_aura':
        // 技能释放光环
        ctx.strokeStyle = effect.color || '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.globalAlpha = (1 - progress) * 0.8;

        const auraRadius = 20 + progress * 40;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - 20, auraRadius * pt.scale, 0, Math.PI * 2);
        ctx.stroke();

        // 内层光环
        ctx.globalAlpha = (1 - progress) * 0.4;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - 20, auraRadius * pt.scale * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        // 能量粒子
        ctx.fillStyle = effect.color || '#FFFFFF';
        ctx.globalAlpha = (1 - progress) * 0.6;
        for (let i = 0; i < 6; i++) {
          const pAngle = (i / 6) * Math.PI * 2 + progress * Math.PI * 3;
          const pRadius = auraRadius * pt.scale * (0.8 + Math.sin(progress * Math.PI * 2) * 0.2);
          const px = pt.x + Math.cos(pAngle) * pRadius;
          const py = pt.y - 20 + Math.sin(pAngle) * pRadius * 0.5;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'floating_text':
        // 屏幕浮动文字（用于系统提示）
        ctx.globalAlpha = progress < 0.2 ? progress * 5 : Math.max(0, 1 - (progress - 0.5) * 2);
        const floatY = H / 2 - 50 - progress * 80;

        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 文字阴影
        ctx.fillStyle = '#000000';
        ctx.fillText(effect.text, W / 2 + 2, floatY + 2);

        // 文字内容
        ctx.fillStyle = effect.color || '#FFFFFF';
        ctx.fillText(effect.text, W / 2, floatY);
        break;
    }

    ctx.restore();
  }
}

// 显示屏幕浮动文字
function showFloatingText(text, color) {
  attackEffects.push({
    type: 'floating_text',
    x: playerX, // 用于坐标判断但实际绘制在屏幕固定位置
    y: playerY,
    text: text,
    color: color || '#FFD700',
    timer: 1.5,
    duration: 1.5
  });
}

// 更新冒险逻辑
function updateAdventure(dt) {
  if (!isInGame()) return;

  adventureTime += dt;

  // 地牢模式特殊逻辑
  if (gameState === 'dungeon') {
    checkRoomCleared();
    checkRoomExit();
  }

  // 难度随时间增加（更缓慢的递进）
  if (adventureTime > 45) monsterSpawnInterval = 2.5;
  if (adventureTime > 90) monsterSpawnInterval = 2.0;
  if (adventureTime > 150) monsterSpawnInterval = 1.5;
  if (adventureTime > 200) monsterSpawnInterval = 1.2;

  // Boss系统计时
  bossTimer += dt;
  if (bossWarningTimer > 0) {
    bossWarningTimer -= dt;
  }

  // 每日挑战：Boss猎人修饰符 - Boss出现更频繁
  let effectiveBossInterval = bossInterval;
  if (isDailyChallenge && hasDailyModifier('boss')) {
    effectiveBossInterval = 40;  // 40秒一个Boss
  }

  // Boss警告（出现前3秒）
  if (bossTimer >= effectiveBossInterval - 3 && bossTimer < effectiveBossInterval - 2.9 && !currentBoss) {
    bossWarningTimer = 3;
  }

  // 生成Boss
  if (bossTimer >= effectiveBossInterval && !currentBoss) {
    bossTimer = 0;
    spawnBoss();
  }

  // 检查Boss是否还存活
  if (currentBoss && currentBoss.hp <= 0) {
    currentBoss = null;
  }

  // 生成怪物（在玩家周围生成）
  monsterSpawnTimer += dt;
  // 每日挑战：怪物狂潮修饰符 - 刷新速度+50%
  let effectiveInterval = monsterSpawnInterval;
  if (isDailyChallenge && hasDailyModifier('monster_speed')) {
    effectiveInterval *= 0.67;  // 间隔缩短33%，相当于刷新速度+50%
  }
  if (monsterSpawnTimer >= effectiveInterval) {
    monsterSpawnTimer = 0;
    spawnMonster();
  }

  // 自动移动AI - 每帧计算移动方向
  const moveDir = calculateMoveDirection();

  // 平滑方向过渡（关键：避免抖动）
  const smoothFactor = 0.08; // 平滑系数，越小越平滑
  smoothDirX += (moveDir.dx - smoothDirX) * smoothFactor;
  smoothDirY += (moveDir.dy - smoothDirY) * smoothFactor;

  // 玩家持续移动（使用平滑后的方向）
  const stats = getPlayerStats();
  const baseSpeed = 0.007; // 降低基础速度
  const playerSpeed = baseSpeed * stats.spd * dt * 60;
  const dirLen = Math.sqrt(smoothDirX * smoothDirX + smoothDirY * smoothDirY);
  if (dirLen > 0.05) { // 只有方向足够明确时才移动
    playerX += (smoothDirX / dirLen) * playerSpeed;
    playerY += (smoothDirY / dirLen) * playerSpeed;
  }

  // 牧师被动回血
  if (stats.healRate > 0 && playerHP < playerMaxHP) {
    playerHP = Math.min(playerHP + stats.healRate * dt, playerMaxHP);
  }

  // 更新怪物（相对于玩家位置生成和移动）
  for (const m of monsters) {
    // 更新控制效果计时器
    if (m.stunTimer > 0) m.stunTimer -= dt;
    if (m.freezeTimer > 0) m.freezeTimer -= dt;
    if (m.slowTimer > 0) m.slowTimer -= dt;
    if (m.burnTimer > 0) {
      m.burnTimer -= dt;
      // 灼烧持续伤害
      if (m.burnDamage) {
        m.hp -= m.burnDamage * dt;
      }
    }

    // 朝玩家移动（受控制效果影响）
    const dx = playerX - m.x;
    const dy = playerY - m.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.05) {
      // 冻结或眩晕时无法移动
      if (m.freezeTimer > 0 || m.stunTimer > 0) {
        // 不移动
      } else if (m.rooted > 0) {
        // 定身时也不移动
      } else {
        // 减速效果
        let speedMult = 1;
        if (m.slowTimer > 0) {
          speedMult = 1 - (m.slowAmount || 0.5);
        }
        m.x += (dx / dist) * m.speed * speedMult;
        m.y += (dy / dist) * m.speed * speedMult;
      }
    }

    // 攻击玩家（无敌时不受伤，冻结/眩晕时无法攻击）
    if (dist < 0.08 && playerInvincible <= 0 && m.freezeTimer <= 0 && m.stunTimer <= 0) {
      // 骑士护甲减伤
      const armorReduction = 1 - (stats.armor / 100);
      playerHP -= m.damage * dt * armorReduction;
      comboCount = 0;
      // 受伤音效（0.3秒冷却避免刷屏）
      if (walkTime - lastHurtSoundTime > 0.3) {
        playSound('hurt');
        lastHurtSoundTime = walkTime;
      }
    }

    // 更新被击中闪烁
    if (m.hitTimer > 0) {
      m.hitTimer -= dt;
    }
  }

  // 移除太远的怪物
  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];
    const dx = m.x - playerX;
    const dy = m.y - playerY;
    if (Math.sqrt(dx * dx + dy * dy) > 2.0) {
      monsters.splice(i, 1);
    }
  }

  // 检查死亡
  if (playerHP <= 0) {
    playerHP = 0;
    endAdventure();
  }

  // 更新拾取物
  updateCollectibles(dt);
}

// 计算移动方向（平滑AI）
function calculateMoveDirection() {
  let dirX = 0;
  let dirY = 0;

  const stats = getPlayerStats();

  // 找出最近的怪物距离和危险怪物数量
  let nearestMonster = null;
  let nearestMonsterDist = Infinity;
  let dangerCount = 0; // 危险范围内的怪物数量
  const dangerZone = 0.06; // 危险距离（只有非常近才算危险）
  const attackRange = stats.range; // 使用职业攻击范围
  const optimalRange = stats.range * 0.7; // 最佳战斗距离

  for (const m of monsters) {
    const dx = playerX - m.x;
    const dy = playerY - m.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < nearestMonsterDist) {
      nearestMonsterDist = dist;
      nearestMonster = m;
    }

    if (dist < dangerZone) {
      dangerCount++;
    }
  }

  // 战斗AI逻辑：主动进攻！
  // 1. 只有被围攻（3个以上近身）才考虑后退
  // 2. 正常情况主动接近并攻击敌人
  // 3. 没有怪物时寻找物品或随机移动

  if (dangerCount >= 3) {
    // 被围攻，轻微后撤但不完全逃跑
    for (const m of monsters) {
      const dx = playerX - m.x;
      const dy = playerY - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.1 && dist > 0.001) {
        const force = (0.1 - dist) / 0.1;
        dirX += (dx / dist) * force * 0.8; // 降低逃跑力度
        dirY += (dy / dist) * force * 0.8;
      }
    }
  } else if (nearestMonster) {
    // 主动接近并攻击敌人！
    const dx = nearestMonster.x - playerX;
    const dy = nearestMonster.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.01) {
      if (dist > optimalRange) {
        // 不在攻击范围内，积极接近敌人
        const approachForce = 1.5; // 增加接近力度
        dirX += (dx / dist) * approachForce;
        dirY += (dy / dist) * approachForce;
      }
      // 在攻击范围内时站定攻击，不后退！

      // 轻微环绕移动（让战斗更生动）
      const perpX = -dy / dist;
      const perpY = dx / dist;
      const circleForce = Math.sin(walkTime * 3) * 0.15;
      dirX += perpX * circleForce;
      dirY += perpY * circleForce;
    }
  }

  // 靠近安全的拾取物
  let nearestSafeCollectible = null;
  let nearestDist = Infinity;
  for (const c of collectibles) {
    const dx = c.x - playerX;
    const dy = c.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 检查这个拾取物是否安全
    let isSafe = true;
    for (const m of monsters) {
      const mdx = c.x - m.x;
      const mdy = c.y - m.y;
      if (Math.sqrt(mdx * mdx + mdy * mdy) < 0.25) {
        isSafe = false;
        break;
      }
    }

    if (isSafe && dist < nearestDist) {
      nearestDist = dist;
      nearestSafeCollectible = c;
    }
  }

  if (nearestSafeCollectible && nearestDist < 0.8) {
    const dx = nearestSafeCollectible.x - playerX;
    const dy = nearestSafeCollectible.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.01) {
      // 低血量时更倾向于拾取血瓶
      let priority = 0.5;
      if (nearestSafeCollectible.type === 'health' && playerHP < playerMaxHP * 0.5) {
        priority = 1.5;
      }
      dirX += (dx / dist) * priority;
      dirY += (dy / dist) * priority;
    }
  }

  // 如果没有怪物，轻微随机移动
  if (monsters.length === 0) {
    dirX += Math.sin(walkTime * 0.5) * 0.3;
    dirY += Math.cos(walkTime * 0.7) * 0.3;
  }

  return { dx: dirX, dy: dirY };
}

// ==================== 拾取物系统 ====================
let collectibles = [];
let collectibleSpawnTimer = 0;
const collectibleSpawnInterval = 3.0;
let goldCollected = 0;

const COLLECTIBLE_TYPES = {
  gold: { name: '金币', color: '#FFD700', value: 10, size: 0.02 },
  health: { name: '血瓶', color: '#FF6B6B', value: 20, size: 0.025 },
  exp: { name: '经验球', color: '#9C27B0', value: 15, size: 0.018 }
};

function spawnCollectible() {
  const types = Object.keys(COLLECTIBLE_TYPES);
  const type = types[Math.floor(Math.random() * types.length)];
  const info = COLLECTIBLE_TYPES[type];

  // 在玩家周围0.2-0.5距离处生成
  const angle = Math.random() * Math.PI * 2;
  const distance = 0.2 + Math.random() * 0.3;

  collectibles.push({
    type,
    x: playerX + Math.cos(angle) * distance,
    y: playerY + Math.sin(angle) * distance,
    value: info.value,
    size: info.size,
    bobPhase: Math.random() * Math.PI * 2
  });
}

function updateCollectibles(dt) {
  // 生成拾取物
  collectibleSpawnTimer += dt;
  if (collectibleSpawnTimer >= collectibleSpawnInterval && collectibles.length < 8) {
    collectibleSpawnTimer = 0;
    spawnCollectible();
  }

  // 检测拾取和移除太远的物品
  for (let i = collectibles.length - 1; i >= 0; i--) {
    const c = collectibles[i];
    const dx = c.x - playerX;
    const dy = c.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 移除太远的物品
    if (dist > 1.5) {
      collectibles.splice(i, 1);
      continue;
    }

    if (dist < 0.08) {
      // 拾取成功
      const info = COLLECTIBLE_TYPES[c.type];
      if (c.type === 'gold') {
        playSound('pickup');
        // 每日挑战：金币雨修饰符 - 金币掉落+100%
        let goldValue = c.value;
        if (isDailyChallenge && hasDailyModifier('gold')) {
          goldValue *= 2;
        }
        goldCollected += goldValue;
      } else if (c.type === 'health') {
        playSound('heal');
        playerHP = Math.min(playerHP + c.value, playerMaxHP);
      } else if (c.type === 'exp') {
        playSound('pickup');
        playerExp += c.value;
        // 检查升级
        while (playerExp >= expToNext) {
          playerExp -= expToNext;
          playerLevel++;
          // 前10级经验需求增长较慢，之后加速
          if (playerLevel <= 10) {
            expToNext = 60 + (playerLevel - 1) * 20;
          } else {
            expToNext = Math.floor(expToNext * 1.3);
          }
          const newStats = getPlayerStats();
          playerMaxHP = newStats.hp;
          playerHP = Math.min(playerHP + 20, playerMaxHP);
          saveGameData();
          // 触发技能选择
          if (!isSelectingSkill) {
            startSkillSelection();
          }
        }
      }
      collectibles.splice(i, 1);
    }
  }
}

function drawCollectible(x, y, scale, collectible, time) {
  const info = COLLECTIBLE_TYPES[collectible.type];
  const bob = Math.sin(time * 4 + collectible.bobPhase) * 3;
  const size = BASE_UNIT * 0.3 * scale;

  ctx.save();
  ctx.translate(x, y + bob);

  if (collectible.type === 'gold') {
    // 金币 - 圆形
    ctx.fillStyle = info.color;
    ctx.beginPath();
    ctx.arc(0, -size / 2, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#B8860B';
    ctx.font = `bold ${size * 0.4}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, -size / 2);
  } else if (collectible.type === 'health') {
    // 血瓶 - 瓶子形状
    ctx.fillStyle = info.color;
    ctx.fillRect(-size * 0.2, -size, size * 0.4, size * 0.8);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-size * 0.1, -size * 0.5, size * 0.2, size * 0.1);
    ctx.fillRect(-size * 0.05, -size * 0.6, size * 0.1, size * 0.3);
  } else if (collectible.type === 'exp') {
    // 经验球 - 星形
    ctx.fillStyle = info.color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 72 - 90) * Math.PI / 180;
      const r = size * 0.4;
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, -size / 2 + Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, -size / 2 + Math.sin(angle) * r);
      const angle2 = ((i * 72 + 36) - 90) * Math.PI / 180;
      ctx.lineTo(Math.cos(angle2) * r * 0.4, -size / 2 + Math.sin(angle2) * r * 0.4);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// ==================== 程序化地图生成 ====================
// 种子随机数生成器
function seededRandom(seed) {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// 根据世界坐标生成场景元素
function getWorldElements(worldX, worldY, radius) {
  const elements = [];
  const tileSize = 0.15; // 每个格子的大小

  // 遍历玩家周围的格子
  const minTileX = Math.floor((worldX - radius) / tileSize);
  const maxTileX = Math.floor((worldX + radius) / tileSize);
  const minTileY = Math.floor((worldY - radius) / tileSize);
  const maxTileY = Math.floor((worldY + radius) / tileSize);

  for (let tx = minTileX; tx <= maxTileX; tx++) {
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      // 使用格子坐标作为种子
      const seed = tx * 7919 + ty * 104729;
      const rand = seededRandom(seed);

      // 30%概率生成元素
      if (rand < 0.3) {
        const rand2 = seededRandom(seed + 1);
        const rand3 = seededRandom(seed + 2);
        const rand4 = seededRandom(seed + 3);

        // 确定类型
        let type;
        if (rand2 < 0.25) type = 'tree';
        else if (rand2 < 0.6) type = 'grass';
        else type = 'flower';

        // 在格子内随机偏移
        const elemX = tx * tileSize + rand3 * tileSize;
        const elemY = ty * tileSize + rand4 * tileSize;

        elements.push({
          type,
          x: elemX,
          y: elemY,
          seed: seed // 用于随机大小变化
        });
      }
    }
  }

  return elements;
}

// 待机模式的固定场景元素（向后兼容）
const idleGroundElements = [
  { type: 'tree', x: 0.12, y: 0.18 },
  { type: 'tree', x: 0.82, y: 0.28 },
  { type: 'grass', x: 0.28, y: 0.38 },
  { type: 'flower', x: 0.68, y: 0.12 },
  { type: 'grass', x: 0.42, y: 0.58 },
  { type: 'tree', x: 0.22, y: 0.72 },
  { type: 'flower', x: 0.58, y: 0.42 },
  { type: 'grass', x: 0.78, y: 0.62 },
  { type: 'tree', x: 0.48, y: 0.88 },
  { type: 'flower', x: 0.32, y: 0.52 },
  { type: 'grass', x: 0.72, y: 0.82 },
];

let lastSceneOffset = 0;

function getGroundPoint(groundQuad, x, y) {
  const p00 = groundQuad.farRight;
  const p10 = groundQuad.nearRight;
  const p01 = groundQuad.nearLeft;
  const p11 = groundQuad.farLeft;
  const screenX = (1-x)*(1-y)*p00.x + x*(1-y)*p10.x + (1-x)*y*p01.x + x*y*p11.x;
  const screenY = (1-x)*(1-y)*p00.y + x*(1-y)*p10.y + (1-x)*y*p01.y + x*y*p11.y;
  const distTo010 = Math.sqrt(x*x + y*y);
  const scale = 1.0 - distTo010 * 0.4;
  return { x: screenX, y: screenY, scale: Math.max(0.3, scale) };
}

function getDiamondCenter(groundQuad) { return getGroundPoint(groundQuad, 0.5, 0.5); }

// ==================== 绘制场景元素 ====================
// 比例说明：边长10m，人高1.7m(17%)，树高3m(30%)，草高0.3m(3%)，花高0.5m(5%)
// 屏幕上地面高度约为 H * 0.3，所以基础单位 = H * 0.3 / 10 = H * 0.03
const BASE_UNIT = Math.min(W, H) * 0.03;  // 1米在屏幕上的像素

function drawTree(x, y, scale) {
  const h = BASE_UNIT * 3 * scale;  // 树高3米
  const trunkH = h * 0.35;
  const crownH = h * 0.65;
  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - trunkH);
  ctx.stroke();
  ctx.strokeStyle = '#2E7D32';
  ctx.beginPath();
  ctx.moveTo(x, y - trunkH - crownH);
  ctx.lineTo(x - crownH * 0.4, y - trunkH);
  ctx.lineTo(x + crownH * 0.4, y - trunkH);
  ctx.closePath();
  ctx.stroke();
}

function drawGrass(x, y, scale) {
  const h = BASE_UNIT * 0.3 * scale;  // 草高0.3米
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = Math.max(1, 0.8 * scale);
  ctx.beginPath(); ctx.moveTo(x - 2 * scale, y); ctx.lineTo(x - 3 * scale, y - h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h * 1.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 2 * scale, y); ctx.lineTo(x + 3 * scale, y - h); ctx.stroke();
}

function drawFlower(x, y, scale) {
  const h = BASE_UNIT * 0.5 * scale;  // 花高0.5米
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = Math.max(1, 0.8 * scale);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
  ctx.strokeStyle = '#FF6B6B';
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  const flowerSize = BASE_UNIT * 0.12 * scale;
  const cx = x, cy = y - h;
  ctx.beginPath(); ctx.moveTo(cx, cy - flowerSize); ctx.lineTo(cx, cy + flowerSize); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - flowerSize, cy); ctx.lineTo(cx + flowerSize, cy); ctx.stroke();
}

// ==================== 武器绘制 ====================
function drawWeapon(weaponType, handX, handY, scale, angle, facingRight) {
  const s = scale * 0.8;
  const flip = facingRight;
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(angle);
  ctx.scale(flip, 1);

  switch (weaponType) {
    case 'sword': // 剑
      ctx.strokeStyle = '#757575';
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -BASE_UNIT * 0.8 * s);
      ctx.stroke();
      // 剑刃
      ctx.strokeStyle = '#B0BEC5';
      ctx.lineWidth = Math.max(1, 3 * s);
      ctx.beginPath();
      ctx.moveTo(0, -BASE_UNIT * 0.8 * s);
      ctx.lineTo(0, -BASE_UNIT * 1.5 * s);
      ctx.stroke();
      // 剑尖
      ctx.beginPath();
      ctx.moveTo(0, -BASE_UNIT * 1.5 * s);
      ctx.lineTo(0, -BASE_UNIT * 1.7 * s);
      ctx.strokeStyle = '#CFD8DC';
      ctx.lineWidth = Math.max(1, 1 * s);
      ctx.stroke();
      // 护手
      ctx.strokeStyle = '#8D6E63';
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.beginPath();
      ctx.moveTo(-BASE_UNIT * 0.15 * s, -BASE_UNIT * 0.75 * s);
      ctx.lineTo(BASE_UNIT * 0.15 * s, -BASE_UNIT * 0.75 * s);
      ctx.stroke();
      break;

    case 'staff': // 法杖
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.beginPath();
      ctx.moveTo(0, BASE_UNIT * 0.3 * s);
      ctx.lineTo(0, -BASE_UNIT * 1.8 * s);
      ctx.stroke();
      // 法杖头部水晶
      ctx.fillStyle = '#7E57C2';
      ctx.beginPath();
      ctx.arc(0, -BASE_UNIT * 1.9 * s, BASE_UNIT * 0.12 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#B39DDB';
      ctx.lineWidth = 1;
      ctx.stroke();
      break;

    case 'bow': // 弓
      ctx.strokeStyle = '#8D6E63';
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.beginPath();
      ctx.arc(BASE_UNIT * 0.3 * s, -BASE_UNIT * 0.5 * s, BASE_UNIT * 0.8 * s, Math.PI * 0.7, Math.PI * 1.3);
      ctx.stroke();
      // 弓弦
      ctx.strokeStyle = '#BDBDBD';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(BASE_UNIT * 0.05 * s, BASE_UNIT * 0.2 * s);
      ctx.lineTo(BASE_UNIT * 0.05 * s, -BASE_UNIT * 1.2 * s);
      ctx.stroke();
      break;

    case 'dagger': // 匕首
      ctx.strokeStyle = '#424242';
      ctx.lineWidth = Math.max(1, 1.5 * s);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -BASE_UNIT * 0.5 * s);
      ctx.stroke();
      ctx.strokeStyle = '#90A4AE';
      ctx.lineWidth = Math.max(1, 2.5 * s);
      ctx.beginPath();
      ctx.moveTo(0, -BASE_UNIT * 0.5 * s);
      ctx.lineTo(0, -BASE_UNIT * 0.9 * s);
      ctx.stroke();
      break;

    case 'wand': // 魔杖
      ctx.strokeStyle = '#FFF8E1';
      ctx.lineWidth = Math.max(1, 1.5 * s);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -BASE_UNIT * 1.0 * s);
      ctx.stroke();
      // 魔杖顶部星星
      ctx.fillStyle = '#FFD54F';
      ctx.beginPath();
      const starY = -BASE_UNIT * 1.1 * s;
      for (let i = 0; i < 5; i++) {
        const a = (i * 72 - 90) * Math.PI / 180;
        const r = BASE_UNIT * 0.08 * s;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, starY + Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, starY + Math.sin(a) * r);
        const a2 = ((i * 72 + 36) - 90) * Math.PI / 180;
        ctx.lineTo(Math.cos(a2) * r * 0.4, starY + Math.sin(a2) * r * 0.4);
      }
      ctx.closePath();
      ctx.fill();
      break;

    case 'lance': // 长枪
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = Math.max(1, 2.5 * s);
      ctx.beginPath();
      ctx.moveTo(0, BASE_UNIT * 0.5 * s);
      ctx.lineTo(0, -BASE_UNIT * 2.0 * s);
      ctx.stroke();
      // 枪头
      ctx.fillStyle = '#78909C';
      ctx.beginPath();
      ctx.moveTo(0, -BASE_UNIT * 2.0 * s);
      ctx.lineTo(-BASE_UNIT * 0.08 * s, -BASE_UNIT * 2.3 * s);
      ctx.lineTo(0, -BASE_UNIT * 2.5 * s);
      ctx.lineTo(BASE_UNIT * 0.08 * s, -BASE_UNIT * 2.3 * s);
      ctx.closePath();
      ctx.fill();
      break;
  }
  ctx.restore();
}

// 绘制玩家自定义武器
function drawCustomWeapon(handX, handY, scale, angle, facingRight, attackProgress) {
  if (!customWeapon || !customWeapon.normalizedPoints || customWeapon.normalizedPoints.length < 2) {
    return;
  }

  const s = scale * 0.8;
  const flip = facingRight;
  const weaponScale = BASE_UNIT * 0.7 * s; // 武器缩放

  // 获取武器品质信息
  const quality = customWeapon.quality || 'broken';
  const qualityInfo = WEAPON_QUALITY[quality] || WEAPON_QUALITY.broken;
  const qualityAlpha = qualityInfo.glowAlpha;

  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(angle - Math.PI * 0.1); // 稍微旋转使武器看起来被握住
  ctx.scale(flip, 1);

  // 获取武器效果颜色（低品质时颜色变暗）
  const effectColors = {
    burn: '#FF6600',
    freeze: '#00FFFF',
    stun: '#FFFF00',
    lifesteal: '#00FF00',
    pierce: '#FF00FF',
    none: '#00FFFF'
  };
  let weaponColor = effectColors[customWeapon.effect] || '#00FFFF';

  // 残缺武器使用灰暗色调
  if (quality === 'broken') {
    weaponColor = '#666666';
  } else if (quality === 'legendary') {
    // 传说武器颜色闪烁
    const time = Date.now() / 1000;
    const hue = (time * 60) % 360;
    weaponColor = `hsl(${hue}, 100%, 60%)`;
  }

  // 攻击时的发光效果（受品质影响）
  if (attackProgress > 0) {
    ctx.shadowColor = quality === 'legendary' ? '#FFD700' : weaponColor;
    ctx.shadowBlur = 15 * attackProgress * qualityAlpha;
  }

  // 高品质武器常驻发光
  if (quality === 'perfect' || quality === 'legendary') {
    ctx.shadowColor = qualityInfo.color;
    ctx.shadowBlur = 8 * qualityAlpha;
  }

  // 绘制武器轮廓
  ctx.strokeStyle = weaponColor;
  ctx.lineWidth = Math.max(2, 3 * s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const points = customWeapon.normalizedPoints;
  ctx.beginPath();
  let started = false;
  for (const pt of points) {
    // 归一化坐标转为实际坐标，Y轴向上（负方向）
    const px = pt.x * weaponScale;
    const py = -pt.y * weaponScale - weaponScale * 0.5; // 偏移使武器在手上方

    if (pt.newStroke || !started) {
      ctx.moveTo(px, py);
      started = true;
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();

  // 添加内部发光效果
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath();
  started = false;
  for (const pt of points) {
    const px = pt.x * weaponScale;
    const py = -pt.y * weaponScale - weaponScale * 0.5;
    if (pt.newStroke || !started) {
      ctx.moveTo(px, py);
      started = true;
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();

  // 武器效果粒子
  if (customWeapon.effect && customWeapon.effect !== 'none') {
    const time = Date.now() / 1000;
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 3; i++) {
      const angle = time * 2 + i * Math.PI * 0.67;
      const dist = weaponScale * 0.3 + Math.sin(time * 3 + i) * weaponScale * 0.1;
      const px = Math.cos(angle) * dist * 0.3;
      const py = -weaponScale * 0.5 + Math.sin(angle) * dist;

      ctx.fillStyle = weaponColor;
      ctx.beginPath();
      ctx.arc(px, py, 2 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

// 绘制护甲效果
function drawArmor(armorType, x, shoulderY, bodyLen, bodyW, headR, scale, classColor) {
  const s = scale;
  switch (armorType) {
    case 'heavy': // 重甲
      ctx.strokeStyle = classColor;
      ctx.lineWidth = Math.max(2, 4 * s);
      // 胸甲
      ctx.beginPath();
      ctx.moveTo(-bodyW * 1.3, shoulderY);
      ctx.lineTo(-bodyW * 1.3, shoulderY + bodyLen * 0.6);
      ctx.lineTo(bodyW * 1.3, shoulderY + bodyLen * 0.6);
      ctx.lineTo(bodyW * 1.3, shoulderY);
      ctx.stroke();
      // 肩甲
      ctx.beginPath();
      ctx.arc(-bodyW * 1.5, shoulderY, bodyW * 0.4, 0, Math.PI, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bodyW * 1.5, shoulderY, bodyW * 0.4, 0, Math.PI, true);
      ctx.stroke();
      break;

    case 'light': // 轻甲
      ctx.strokeStyle = classColor;
      ctx.lineWidth = Math.max(1, 2 * s);
      // 皮甲
      ctx.beginPath();
      ctx.moveTo(-bodyW, shoulderY + bodyLen * 0.2);
      ctx.lineTo(-bodyW, shoulderY + bodyLen * 0.5);
      ctx.lineTo(bodyW, shoulderY + bodyLen * 0.5);
      ctx.lineTo(bodyW, shoulderY + bodyLen * 0.2);
      ctx.stroke();
      break;

    case 'robe': // 法袍
      ctx.strokeStyle = classColor;
      ctx.lineWidth = Math.max(1, 1.5 * s);
      // 长袍
      ctx.beginPath();
      ctx.moveTo(-bodyW * 0.8, shoulderY);
      ctx.lineTo(-bodyW * 1.2, shoulderY + bodyLen * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bodyW * 0.8, shoulderY);
      ctx.lineTo(bodyW * 1.2, shoulderY + bodyLen * 1.5);
      ctx.stroke();
      // 兜帽轮廓
      ctx.beginPath();
      ctx.arc(0, shoulderY - headR * 0.5, headR * 1.3, Math.PI * 0.8, Math.PI * 0.2, true);
      ctx.stroke();
      break;
  }
}

// ==================== 火柴人 ====================
function getStickManDirection(groundQuad) {
  const zeroPos = getZeroGroundCoords(groundQuad);
  const dx = zeroPos.x - 0.5;
  const dy = zeroPos.y - 0.5;
  return Math.atan2(dx, -dy);
}

function drawStickMan(x, y, scale, time, groundQuad) {
  const speed = stickManSpeed;
  const t = time * (4 + speed * 6);
  const targetFacing = groundQuad ? getStickManDirection(groundQuad) : 0;
  const facing = poseState.initialized ? lerpAngle(poseState.facing, targetFacing, 0.1) : targetFacing;
  poseState.facing = facing;
  poseState.initialized = true;

  // ===== 玩家发光效果 =====
  if (gameState === 'adventure') {
    const glowIntensity = 0.4 + Math.sin(time * 3) * 0.15;
    const glowRadius = BASE_UNIT * 2 * scale;
    const character = getCurrentCharacter();
    const glowColor = character.color || '#FFFFFF';

    ctx.save();
    ctx.globalAlpha = glowIntensity * 0.3;
    const gradient = ctx.createRadialGradient(x, y - glowRadius * 0.3, 0, x, y - glowRadius * 0.3, glowRadius);
    gradient.addColorStop(0, glowColor);
    gradient.addColorStop(0.5, glowColor + '44');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y - glowRadius * 0.3, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const sideView = Math.abs(Math.sin(facing));
  const facingRight = Math.sin(facing) >= 0 ? 1 : -1;
  const facingAway = Math.cos(facing);

  // 人高1.7米，头0.25m，躯干0.6m，腿0.85m
  const personH = BASE_UNIT * 1.7 * scale;
  const len = personH / 3.8;  // 基础单位
  const headR = len * 0.5;    // 头半径 ~0.25m
  const bodyLen = len * 1.3;  // 躯干 ~0.6m
  const legLen = len * 1.0;   // 腿 ~0.85m (大腿+小腿)
  const armLen = len * 0.7;   // 手臂
  const bodyW = len * 0.4 * (0.3 + Math.abs(facingAway) * 0.7);

  const swingAmp = 0.5 + speed * 0.3;
  const rThigh = Math.sin(t) * swingAmp;
  const rShin = Math.sin(t - 0.5) * swingAmp * 0.8 - 0.3;
  const lThigh = Math.sin(t + Math.PI) * swingAmp;
  const lShin = Math.sin(t + Math.PI - 0.5) * swingAmp * 0.8 - 0.3;

  // 攻击动画进度 (0-1)
  const attackProgress = isAttacking ? (1 - attackAnimTimer / attackAnimDuration) : 0;
  const attackSwing = isAttacking ? Math.sin(attackProgress * Math.PI) * 1.5 : 0;

  // 手臂角度（攻击时向前挥舞）
  let rArm = Math.sin(t + Math.PI) * swingAmp * 0.6;
  let rForearm = Math.sin(t + Math.PI - 0.3) * swingAmp * 0.4 + 0.5;
  let lArm = Math.sin(t) * swingAmp * 0.6;
  let lForearm = Math.sin(t - 0.3) * swingAmp * 0.4 + 0.5;

  // 攻击时手臂动作
  if (isAttacking) {
    // 根据攻击目标方向决定用哪只手攻击
    const attackDirX = attackTargetX;
    const useRightArm = attackDirX * facingRight >= 0;

    if (useRightArm) {
      rArm = -0.5 - attackSwing; // 向前挥
      rForearm = 0.3 + attackSwing * 0.5;
    } else {
      lArm = -0.5 - attackSwing;
      lForearm = 0.3 + attackSwing * 0.5;
    }
  }

  const bounce = Math.abs(Math.sin(t * 2)) * 2 * scale * speed;

  ctx.save();
  ctx.translate(x, y - bounce);

  const hipY = 0;
  const shoulderY = hipY - bodyLen;
  const headY = shoulderY - len * 0.3 - headR;
  const rHipX = bodyW * facingRight;
  const lHipX = -bodyW * facingRight;
  const rShoulderX = bodyW * 1.2 * facingRight;
  const lShoulderX = -bodyW * 1.2 * facingRight;
  const legSwingX = sideView * facingRight;

  const rKneeX = rHipX + Math.sin(rThigh) * legLen * legSwingX;
  const rKneeY = hipY + Math.cos(rThigh) * legLen;
  const rFootX = rKneeX + Math.sin(rThigh + rShin) * legLen * legSwingX;
  const rFootY = rKneeY + Math.cos(rThigh + rShin) * legLen;
  const lKneeX = lHipX + Math.sin(lThigh) * legLen * legSwingX;
  const lKneeY = hipY + Math.cos(lThigh) * legLen;
  const lFootX = lKneeX + Math.sin(lThigh + lShin) * legLen * legSwingX;
  const lFootY = lKneeY + Math.cos(lThigh + lShin) * legLen;
  const rElbowX = rShoulderX + Math.sin(rArm) * armLen * legSwingX;
  const rElbowY = shoulderY + Math.cos(rArm) * armLen;
  const rHandX = rElbowX + Math.sin(rArm + rForearm) * armLen * legSwingX;
  const rHandY = rElbowY + Math.cos(rArm + rForearm) * armLen;
  const lElbowX = lShoulderX + Math.sin(lArm) * armLen * legSwingX;
  const lElbowY = shoulderY + Math.cos(lArm) * armLen;
  const lHandX = lElbowX + Math.sin(lArm + lForearm) * armLen * legSwingX;
  const lHandY = lElbowY + Math.cos(lArm + lForearm) * armLen;

  ctx.strokeStyle = '#333333';
  ctx.fillStyle = '#333333';
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const rLegForward = rThigh > 0;
  const drawRightFirst = facingAway > 0 ? !rLegForward : rLegForward;
  const frontColor = '#333333';
  const backColor = '#666666';

  ctx.strokeStyle = backColor;
  if (drawRightFirst) {
    ctx.beginPath(); ctx.moveTo(rHipX, hipY); ctx.lineTo(rKneeX, rKneeY); ctx.lineTo(rFootX, rFootY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rShoulderX, shoulderY); ctx.lineTo(rElbowX, rElbowY); ctx.lineTo(rHandX, rHandY); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(lHipX, hipY); ctx.lineTo(lKneeX, lKneeY); ctx.lineTo(lFootX, lFootY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lShoulderX, shoulderY); ctx.lineTo(lElbowX, lElbowY); ctx.lineTo(lHandX, lHandY); ctx.stroke();
  }

  ctx.strokeStyle = frontColor;
  ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(0, shoulderY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lHipX, hipY); ctx.lineTo(rHipX, hipY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lShoulderX, shoulderY); ctx.lineTo(rShoulderX, shoulderY); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, headY, headR, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = frontColor;
  if (drawRightFirst) {
    ctx.beginPath(); ctx.moveTo(lHipX, hipY); ctx.lineTo(lKneeX, lKneeY); ctx.lineTo(lFootX, lFootY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lShoulderX, shoulderY); ctx.lineTo(lElbowX, lElbowY); ctx.lineTo(lHandX, lHandY); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(rHipX, hipY); ctx.lineTo(rKneeX, rKneeY); ctx.lineTo(rFootX, rFootY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rShoulderX, shoulderY); ctx.lineTo(rElbowX, rElbowY); ctx.lineTo(rHandX, rHandY); ctx.stroke();
  }

  // 绘制装备和武器（10级后有职业才显示）
  const character = getCurrentCharacter();

  // 绘制护甲（只有有护甲时才绘制）
  if (character.armor && character.armor !== 'none') {
    drawArmor(character.armor, 0, shoulderY, bodyLen, bodyW, headR, scale, character.color);
  }

  // 绘制武器（优先绘制自定义武器）
  const weaponAngle = Math.sin(t) * 0.3; // 武器随走路摆动
  const handX = drawRightFirst ? lHandX : rHandX;
  const handY = drawRightFirst ? lHandY : rHandY;

  if (customWeapon && customWeapon.normalizedPoints && customWeapon.normalizedPoints.length > 1) {
    // 绘制玩家自定义武器
    drawCustomWeapon(handX, handY, scale, weaponAngle, facingRight, attackProgress);
  } else if (character.weapon && character.weapon !== 'none') {
    // 绘制职业默认武器
    drawWeapon(character.weapon, handX, handY, scale, weaponAngle, facingRight);
  }

  ctx.restore();
}

function getZeroGroundCoords(groundQuad) {
  const zero = projCache.get('000');
  if (!zero) return { x: 0.5, y: 0.5 };
  const p00 = groundQuad.farRight;
  const p10 = groundQuad.nearRight;
  const p01 = groundQuad.nearLeft;
  const xAxis = { x: p10.x - p00.x, y: p10.y - p00.y };
  const yAxis = { x: p01.x - p00.x, y: p01.y - p00.y };
  const v = { x: zero.x - p00.x, y: zero.y - p00.y };
  const det = xAxis.x * yAxis.y - xAxis.y * yAxis.x;
  if (Math.abs(det) < 0.001) return { x: 0.5, y: 0.5 };
  const gx = (v.x * yAxis.y - v.y * yAxis.x) / det;
  const gy = (xAxis.x * v.y - xAxis.y * v.x) / det;
  return { x: gx, y: gy };
}

function drawGroundElement(groundQuad, type, x, y) {
  // 严格限制在正方形面内 (0-1 范围)
  if (x < 0.02 || x > 0.98 || y < 0.02 || y > 0.98) return;
  const pt = getGroundPoint(groundQuad, x, y);
  if (type === 'tree') drawTree(pt.x, pt.y, pt.scale);
  else if (type === 'grass') drawGrass(pt.x, pt.y, pt.scale);
  else if (type === 'flower') drawFlower(pt.x, pt.y, pt.scale);
}

function drawGroundScene(groundQuad) {
  const zeroPos = getZeroGroundCoords(groundQuad);
  const dirX = 0.5 - zeroPos.x;
  const dirY = 0.5 - zeroPos.y;
  const len = Math.sqrt(dirX * dirX + dirY * dirY);
  const normX = len > 0.01 ? dirX / len : 0;
  const normY = len > 0.01 ? dirY / len : 0;
  const deltaOffset = sceneOffset - lastSceneOffset;
  lastSceneOffset = sceneOffset;

  const isAdventure = (gameState === 'adventure' || gameState === 'gameover');

  if (isAdventure) {
    // 冒险模式：使用程序化生成的世界元素
    const worldElements = getWorldElements(playerX, playerY, 0.6);

    for (const elem of worldElements) {
      // 转换到屏幕坐标（相对于玩家位置）
      const screenX = elem.x - playerX + 0.5;
      const screenY = elem.y - playerY + 0.5;

      if (screenX >= 0.02 && screenX <= 0.98 && screenY >= 0.02 && screenY <= 0.98) {
        drawGroundElement(groundQuad, elem.type, screenX, screenY);
      }
    }

    // 绘制拾取物（世界坐标转屏幕坐标）
    for (const c of collectibles) {
      const screenX = c.x - playerX + 0.5;
      const screenY = c.y - playerY + 0.5;
      if (screenX >= 0.02 && screenX <= 0.98 && screenY >= 0.02 && screenY <= 0.98) {
        const pt = getGroundPoint(groundQuad, screenX, screenY);
        drawCollectible(pt.x, pt.y, pt.scale, c, walkTime);
      }
    }

    // 绘制怪物（世界坐标转屏幕坐标）
    for (const m of monsters) {
      const screenX = m.x - playerX + 0.5;
      const screenY = m.y - playerY + 0.5;
      if (screenX >= 0.02 && screenX <= 0.98 && screenY >= 0.02 && screenY <= 0.98) {
        const pt = getGroundPoint(groundQuad, screenX, screenY);
        drawMonster(pt.x, pt.y, pt.scale, m, walkTime);
      }
    }

    // 玩家始终在中心
    const centerPt = getGroundPoint(groundQuad, 0.5, 0.5);
    drawStickMan(centerPt.x, centerPt.y, centerPt.scale, walkTime, groundQuad);

    // 绘制技能特效
    drawSkillEffects(groundQuad);

    // 绘制攻击特效
    drawAttackEffects(groundQuad);

  } else {
    // 待机模式：使用固定的场景元素
    for (const elem of idleGroundElements) {
      elem.x += deltaOffset * normX;
      elem.y += deltaOffset * normY;
      elem.x = ((elem.x % 1.0) + 1.0) % 1.0;
      elem.y = ((elem.y % 1.0) + 1.0) % 1.0;
    }

    for (const elem of idleGroundElements) {
      drawGroundElement(groundQuad, elem.type, elem.x, elem.y);
    }

    const stickPt = getDiamondCenter(groundQuad);
    drawStickMan(stickPt.x, stickPt.y, stickPt.scale, walkTime, groundQuad);
  }
}

// ==================== 点击检测 ====================
function hitTest(px, py) {
  let best = null;
  let bestD2 = Infinity;
  const hitRadius = 25;
  const frontBits = getFrontBits();
  for (const bits in trigramPos) {
    if (bits === frontBits) continue;
    const p = projCache.get(bits);
    if (!p) continue;
    const dx = px - p.x;
    const dy = py - p.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < hitRadius * hitRadius && d2 < bestD2) {
      bestD2 = d2;
      best = bits;
    }
  }
  return best;
}

// ==================== 主绘制函数 ====================
function draw() {
  // 应用屏幕震动偏移
  ctx.setTransform(DPR, 0, 0, DPR, screenShakeX * DPR, screenShakeY * DPR);
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(-screenShakeX, -screenShakeY, W + Math.abs(screenShakeX) * 2, H + Math.abs(screenShakeY) * 2);

  updateProjCache();
  const frontBits = getFrontBits();

  // 绘制边
  const visibleEdges = edges.filter(e => e.a !== frontBits && e.b !== frontBits);
  const sortedEdges = visibleEdges.map(e => {
    const pa = projCache.get(e.a);
    const pb = projCache.get(e.b);
    return { ...e, pa, pb, avgZ: (pa.z + pb.z) / 2 };
  }).sort((a, b) => a.avgZ - b.avgZ);

  for (const e of sortedEdges) {
    ctx.beginPath();
    ctx.moveTo(e.pa.x, e.pa.y);
    ctx.lineTo(e.pb.x, e.pb.y);
    ctx.strokeStyle = getEdgeColor(e.val);
    ctx.lineWidth = e.avgZ > 0 ? 4 : 3;
    if (e.val === 0) {
      ctx.save();
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = e.avgZ > 0 ? 6 : 5;
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = e.avgZ > 0 ? 3 : 2;
    }
    ctx.stroke();
  }

  // 绘制顶点
  const sortedVerts = trigramBits
    .filter(bits => bits !== frontBits)
    .map(bits => ({ bits, p: projCache.get(bits), name: bitsToName[bits] }))
    .sort((a, b) => a.p.z - b.p.z);

  for (const v of sortedVerts) {
    const p = v.p;
    const isFront = p.z > 0;
    const radius = isFront ? 12 : 9;
    const nodeColor = getNodeColor(v.bits);
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = '#666666';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = nodeColor;
    ctx.fill();
    ctx.fillStyle = '#333333';
    ctx.font = isFront ? 'bold 13px sans-serif' : '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(v.bits, p.x, p.y - radius - 12);
  }

  // 地面场景
  const visibleVerts = trigramBits
    .filter(bits => bits !== getFrontBits())
    .map(bits => ({ bits, p: projCache.get(bits) }))
    .filter(v => v.p);
  visibleVerts.sort((a, b) => b.p.y - a.p.y);

  if (visibleVerts.length >= 4) {
    const bottom4 = visibleVerts.slice(0, 4);
    const bottomPt = bottom4[0].p;
    const sidePts = bottom4.slice(1, 3);
    const leftPt = sidePts[0].p.x < sidePts[1].p.x ? sidePts[0].p : sidePts[1].p;
    const rightPt = sidePts[0].p.x < sidePts[1].p.x ? sidePts[1].p : sidePts[0].p;
    const topPt = bottom4[3].p;
    const groundQuad = { nearLeft: leftPt, nearRight: rightPt, farLeft: topPt, farRight: bottomPt };
    drawGroundScene(groundQuad);
  }

  // UI - 左上角宫位信息
  const trigramIcons = { '乾': '☰', '坤': '☷', '震': '☳', '巽': '☴', '坎': '☵', '离': '☲', '艮': '☶', '兑': '☱' };
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${trigramIcons[currentPalace] || ''} ${currentPalace}宫`, 15, 25);
  // 显示宫位加成
  const palaceBonus = PALACE_BONUS[currentPalace];
  if (palaceBonus) {
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(palaceBonus.description, 15, 42);
  }
  if (gameState === 'idle') {
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillText('点击顶点切换视角', 15, palaceBonus ? 56 : 42);
  }

  // 左下角 - 角色状态面板
  const character = getCurrentCharacter();
  const stats = getPlayerStats();
  drawCharacterStatusPanel(character, stats);

  // 底部 - 开始冒险按钮（只在待机模式显示）
  if (gameState === 'idle') {
    // 右上角音效按钮
    drawSoundButton();

    // 两个主按钮并排
    const btnW = 110;
    const btnH = 45;
    const btnGap = 12;
    const totalW = btnW * 2 + btnGap;
    const startX = (W - totalW) / 2;
    const btnY = H - btnH - 35;

    // === 普通冒险按钮 ===
    const adventureBtnX = startX;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(adventureBtnX + 2, btnY + 2, btnW, btnH);

    ctx.fillStyle = 'rgba(180, 40, 40, 0.95)';
    ctx.fillRect(adventureBtnX, btnY, btnW, btnH);

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(adventureBtnX, btnY, btnW, btnH / 2);

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(adventureBtnX, btnY, btnW, btnH);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚔️ 冒险', adventureBtnX + btnW / 2, btnY + btnH / 2);

    // === 每日挑战按钮 ===
    const dailyBtnX = startX + btnW + btnGap;
    const modifiers = getDailyChallengeModifiers();

    // 闪烁边框效果
    const glowIntensity = 0.6 + Math.sin(Date.now() / 300) * 0.4;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(dailyBtnX + 2, btnY + 2, btnW, btnH);

    // 渐变背景
    const dailyGradient = ctx.createLinearGradient(dailyBtnX, btnY, dailyBtnX + btnW, btnY + btnH);
    dailyGradient.addColorStop(0, 'rgba(100, 50, 150, 0.95)');
    dailyGradient.addColorStop(1, 'rgba(150, 80, 200, 0.95)');
    ctx.fillStyle = dailyGradient;
    ctx.fillRect(dailyBtnX, btnY, btnW, btnH);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(dailyBtnX, btnY, btnW, btnH / 2);

    ctx.shadowColor = '#AA66FF';
    ctx.shadowBlur = 10 * glowIntensity;
    ctx.strokeStyle = '#CC88FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(dailyBtnX, btnY, btnW, btnH);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('📅 每日挑战', dailyBtnX + btnW / 2, btnY + btnH / 2 - 6);

    // 显示今日最佳分数
    ctx.fillStyle = '#FFDD88';
    ctx.font = '10px sans-serif';
    if (todayBestScore > 0) {
      ctx.fillText(`最高: ${todayBestScore}`, dailyBtnX + btnW / 2, btnY + btnH / 2 + 10);
    } else {
      ctx.fillText('今日未挑战', dailyBtnX + btnW / 2, btnY + btnH / 2 + 10);
    }

    // 每日修饰符预览
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(startX, btnY - 28, totalW, 22);
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '10px sans-serif';
    ctx.fillText(`今日加成: ${modifiers[0].icon} ${modifiers[0].name} | ${modifiers[1].icon} ${modifiers[1].name}`, W / 2, btnY - 17);

    // 小提示
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px sans-serif';
    ctx.fillText('点击顶点可切换八卦视角', W / 2, btnY - 42);

    // 缓存按钮位置
    idleScreenButtons = {
      adventure: { x: adventureBtnX, y: btnY, w: btnW, h: btnH },
      daily: { x: dailyBtnX, y: btnY, w: btnW, h: btnH }
    };

    // 锻造武器区域（左上角）
    const forgeBtnW = customWeapon ? 120 : 80;
    const forgeBtnH = customWeapon ? 75 : 32;
    const forgeBtnX = 10;
    const forgeBtnY = 55;

    // 渐变背景
    const forgeGradient = ctx.createLinearGradient(forgeBtnX, forgeBtnY, forgeBtnX + forgeBtnW, forgeBtnY + forgeBtnH);
    forgeGradient.addColorStop(0, 'rgba(100, 60, 150, 0.9)');
    forgeGradient.addColorStop(1, 'rgba(150, 80, 180, 0.9)');
    ctx.fillStyle = forgeGradient;
    ctx.fillRect(forgeBtnX, forgeBtnY, forgeBtnW, forgeBtnH);
    ctx.strokeStyle = '#AA66FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(forgeBtnX, forgeBtnY, forgeBtnW, forgeBtnH);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (customWeapon) {
      // 有武器时显示武器信息
      const quality = customWeapon.quality || 'broken';
      const qualityInfo = WEAPON_QUALITY[quality];

      // 武器名称和品质
      ctx.fillStyle = qualityInfo.color;
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${customWeapon.name}`, forgeBtnX + forgeBtnW / 2, forgeBtnY + 14);

      ctx.font = '10px sans-serif';
      ctx.fillText(`【${qualityInfo.name}】`, forgeBtnX + forgeBtnW / 2, forgeBtnY + 28);

      // 属性显示
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '9px sans-serif';
      ctx.fillText(`伤害:${customWeapon.damage} 暴击:${customWeapon.critChance}%`, forgeBtnX + forgeBtnW / 2, forgeBtnY + 42);

      // 碎片显示
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`🔹碎片: ${weaponFragments}`, forgeBtnX + forgeBtnW / 2, forgeBtnY + 55);

      // 升级按钮（如果可以升级）
      const nextQuality = getNextQualityInfo();
      if (nextQuality) {
        const upgradeBtnY = forgeBtnY + forgeBtnH - 18;
        const canUpgrade = goldCollected >= nextQuality.cost.gold && weaponFragments >= nextQuality.cost.fragments;

        ctx.fillStyle = canUpgrade ? 'rgba(60, 150, 60, 0.9)' : 'rgba(80, 80, 80, 0.7)';
        ctx.fillRect(forgeBtnX + 5, upgradeBtnY, forgeBtnW - 10, 16);
        ctx.strokeStyle = canUpgrade ? '#66FF66' : '#666666';
        ctx.lineWidth = 1;
        ctx.strokeRect(forgeBtnX + 5, upgradeBtnY, forgeBtnW - 10, 16);

        ctx.fillStyle = canUpgrade ? '#FFFFFF' : '#888888';
        ctx.font = '9px sans-serif';
        ctx.fillText(`强化→${nextQuality.name}`, forgeBtnX + forgeBtnW / 2, upgradeBtnY + 9);

        idleScreenButtons.upgradeWeapon = { x: forgeBtnX + 5, y: upgradeBtnY, w: forgeBtnW - 10, h: 16 };
      } else {
        // 已满级
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('✨ 已达最高品质', forgeBtnX + forgeBtnW / 2, forgeBtnY + forgeBtnH - 8);
      }
    } else {
      // 无武器时显示锻造按钮
      ctx.fillText('🗡️ 锻造', forgeBtnX + forgeBtnW / 2, forgeBtnY + forgeBtnH / 2);
    }

    idleScreenButtons.forge = { x: forgeBtnX, y: forgeBtnY, w: forgeBtnW, h: forgeBtnH };

    // 重置数据按钮（右上角，红色醒目）
    const resetBtnW = 70;
    const resetBtnH = 28;
    const resetBtnX = W - resetBtnW - 10;
    const resetBtnY = 10;

    // 红色背景更醒目
    ctx.fillStyle = 'rgba(180, 60, 60, 0.9)';
    ctx.fillRect(resetBtnX, resetBtnY, resetBtnW, resetBtnH);
    ctx.strokeStyle = '#FF6666';
    ctx.lineWidth = 2;
    ctx.strokeRect(resetBtnX, resetBtnY, resetBtnW, resetBtnH);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('重置数据', resetBtnX + resetBtnW / 2, resetBtnY + resetBtnH / 2);

    // 成就进度显示（右下角）
    const achStats = getAchievementStats();
    const achX = W - 10;
    const achY = H - 20;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(achX - 95, achY - 15, 100, 25);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFD700';
    ctx.font = '11px sans-serif';
    ctx.fillText(`🏆 成就: ${achStats.unlocked}/${achStats.total}`, achX - 5, achY);

    // 进度条
    const barW = 88;
    const barH = 4;
    const barX = achX - 93;
    const barY = achY + 5;
    ctx.fillStyle = '#333333';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(barX, barY, barW * (achStats.percent / 100), barH);
  }

  // 冒险模式UI
  if (gameState === 'adventure') {
    // 每日挑战模式指示器（左上角）
    if (isDailyChallenge && activeDailyModifiers.length > 0) {
      const modY = 8;
      ctx.fillStyle = 'rgba(255, 165, 0, 0.85)';
      ctx.fillRect(5, modY, 120, 45);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.strokeRect(5, modY, 120, 45);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('📅 每日挑战', 12, modY + 14);

      // 显示当日修饰符
      ctx.font = '10px sans-serif';
      for (let i = 0; i < activeDailyModifiers.length && i < 2; i++) {
        const mod = activeDailyModifiers[i];
        ctx.fillText(`${mod.icon} ${mod.name}`, 12, modY + 28 + i * 12);
      }
    }

    // 右上角 - 战斗信息
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(W - 115, 5, 110, 50);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`击杀: ${killCount}`, W - 10, 22);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`金币: ${goldCollected}`, W - 10, 38);
    ctx.fillStyle = '#00BCD4';
    ctx.fillText(`时间: ${Math.floor(adventureTime)}s`, W - 10, 54);

    // 音效按钮和暂停按钮（右上角）
    drawSoundButton();
    drawPauseButton();

    // 操作提示（顶部中央）
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('点击头像查看详细属性', W / 2, 25);

    // Boss血条（顶部中央）- 增强版
    if (currentBoss) {
      const barW = W * 0.65;
      const barH = 22;
      const barX = (W - barW) / 2;
      const barY = 42;
      const time = Date.now() * 0.001;

      ctx.save();

      // 背景面板 - 带发光
      ctx.shadowColor = currentBoss.color;
      ctx.shadowBlur = 20;
      roundRect(barX - 10, barY - 10, barW + 20, barH + 35, 10);
      const bgGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH + 35);
      bgGrad.addColorStop(0, 'rgba(30, 20, 40, 0.95)');
      bgGrad.addColorStop(1, 'rgba(15, 10, 25, 0.95)');
      ctx.fillStyle = bgGrad;
      ctx.fill();

      // 边框
      ctx.shadowBlur = 0;
      roundRect(barX - 10, barY - 10, barW + 20, barH + 35, 10);
      const borderGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
      borderGrad.addColorStop(0, currentBoss.color + '80');
      borderGrad.addColorStop(0.5, currentBoss.color);
      borderGrad.addColorStop(1, currentBoss.color + '80');
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Boss名称和图标 - 发光效果
      ctx.shadowColor = currentBoss.color;
      ctx.shadowBlur = 15;
      ctx.fillStyle = currentBoss.color;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${currentBoss.icon} ${currentBoss.name}`, W / 2, barY + 5);
      ctx.shadowBlur = 0;

      // 血条背景
      roundRect(barX, barY + 14, barW, barH, barH / 2);
      ctx.fillStyle = 'rgba(20, 15, 30, 0.9)';
      ctx.fill();

      // 血条 - 渐变 + 脉冲
      const hpRatio = Math.max(0, currentBoss.hp / currentBoss.maxHp);
      if (hpRatio > 0) {
        const pulseIntensity = hpRatio < 0.3 ? (1 + Math.sin(time * 6) * 0.2) : 1;

        ctx.shadowColor = currentBoss.color;
        ctx.shadowBlur = 12 * pulseIntensity;
        roundRect(barX + 2, barY + 16, Math.max(0, (barW - 4) * hpRatio), barH - 4, (barH - 4) / 2);
        const hpGrad = ctx.createLinearGradient(barX, barY + 14, barX, barY + 14 + barH);
        hpGrad.addColorStop(0, shadeColor(currentBoss.color, 30));
        hpGrad.addColorStop(0.5, currentBoss.color);
        hpGrad.addColorStop(1, shadeColor(currentBoss.color, -20));
        ctx.fillStyle = hpGrad;
        ctx.fill();

        // 高光
        ctx.shadowBlur = 0;
        roundRect(barX + 4, barY + 17, Math.max(0, (barW - 8) * hpRatio), (barH - 4) / 3, (barH - 4) / 6);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
      }

      // 血条边框
      roundRect(barX, barY + 14, barW, barH, barH / 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // HP数值
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(`${Math.ceil(currentBoss.hp)} / ${currentBoss.maxHp}`, W / 2, barY + 27);

      ctx.restore();
    }

    // Boss警告
    if (bossWarningTimer > 0) {
      const alpha = 0.5 + Math.sin(bossWarningTimer * 10) * 0.3;
      ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.3})`;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠️ BOSS来袭 ⚠️', W / 2, H / 2 - 30);

      const nextBossIndex = bossCount % BOSS_TYPES.length;
      const nextBoss = BOSS_TYPES[nextBossIndex];
      ctx.font = '18px sans-serif';
      ctx.fillStyle = nextBoss.color;
      ctx.fillText(`${nextBoss.icon} ${nextBoss.name}`, W / 2, H / 2 + 10);

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`${Math.ceil(bossWarningTimer)}秒后出现...`, W / 2, H / 2 + 40);
    }

    // 绘制击杀粒子
    drawKillParticles();

    // 绘制连击计数器
    drawComboCounter();

    // 绘制连击提示
    drawComboAnnouncements();
  }

  // 暂停菜单（最高优先级显示）
  if (isPaused && gameState === 'adventure') {
    drawPauseMenu();
  }

  // 游戏结束UI - 增强版战绩分享
  if (gameState === 'gameover') {
    drawBattleResultScreen();
  }

  // 技能HUD - 显示已获得的技能和冷却
  if (gameState === 'adventure' && !isSelectingSkill) {
    drawSkillHUD();
  }

  // 技能选择UI（全屏覆盖）
  if (isSelectingSkill && skillChoices.length > 0) {
    drawSkillSelectionUI();
  }

  // 职业选择UI（全屏覆盖，优先级高于技能选择）
  if (isSelectingClass) {
    drawClassSelectionUI();
  }

  // 成就通知（浮动显示）
  drawAchievementNotification();

  // 设置面板（高优先级）
  drawSettingsPanel();

  // 新手引导（最高优先级）
  if (showTutorial && gameState === 'idle') {
    drawTutorial();
  }

  // 武器创建界面（全屏覆盖）
  if (isWeaponCreating) {
    drawWeaponCreateUI();
  }

  // 剧情界面（全屏覆盖）
  if (gameState === 'story') {
    drawStoryUI();
  }

  // 地牢模式UI
  if (gameState === 'dungeon') {
    drawDungeonUI();
  }

  // Boss战介绍
  if (gameState === 'boss_intro') {
    // 显示Boss战场景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💀 地牢守卫 💀', W / 2, 60);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('逃跑是不可能的...', W / 2, 90);
  }

  // ===== 后处理效果 =====
  drawPostProcessing();
}

// 环境粒子系统
let ambientParticles = [];
const MAX_AMBIENT_PARTICLES = 40;

// 后处理效果
function drawPostProcessing() {
  // 暗角效果 (Vignette) - 增加氛围
  if (isInGame()) {
    // 动态暗角 - 根据血量变化
    const healthRatio = playerHP / playerMaxHP;
    const dangerTint = healthRatio < 0.3 ? (0.3 - healthRatio) * 2 : 0;

    const vignetteGradient = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9);
    vignetteGradient.addColorStop(0, 'rgba(0,0,0,0)');
    vignetteGradient.addColorStop(0.5, `rgba(${Math.floor(dangerTint * 50)},0,0,0.1)`);
    vignetteGradient.addColorStop(0.8, `rgba(${Math.floor(dangerTint * 100)},0,0,0.3)`);
    vignetteGradient.addColorStop(1, `rgba(0,0,0,0.6)`);
    ctx.fillStyle = vignetteGradient;
    ctx.fillRect(0, 0, W, H);

    // 低血量脉冲警告
    if (healthRatio < 0.3) {
      const pulse = Math.sin(Date.now() / 200) * 0.15 + 0.15;
      ctx.fillStyle = `rgba(255,0,0,${pulse * (0.3 - healthRatio) * 3})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // 地牢模式 - 更暗更神秘
  if (gameState === 'dungeon') {
    // 紫色调暗角
    const dungeonVignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, H * 0.75);
    dungeonVignette.addColorStop(0, 'rgba(20,10,30,0)');
    dungeonVignette.addColorStop(0.6, 'rgba(20,10,30,0.2)');
    dungeonVignette.addColorStop(1, 'rgba(10,5,20,0.5)');
    ctx.fillStyle = dungeonVignette;
    ctx.fillRect(0, 0, W, H);

    // 微弱的扫描线效果
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    for (let y = 0; y < H; y += 3) {
      ctx.fillRect(0, y, W, 1);
    }
  }

  // 环境粒子（漂浮的光点）
  if (isInGame() || gameState === 'idle') {
    updateAndDrawAmbientParticles();
  }

  // 顶部渐变遮罩（让UI更突出）
  if (gameState === 'idle') {
    const topGrad = ctx.createLinearGradient(0, 0, 0, 80);
    topGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
    topGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, 80);
  }
}

// 更新并绘制环境粒子
function updateAndDrawAmbientParticles() {
  // 生成新粒子
  while (ambientParticles.length < MAX_AMBIENT_PARTICLES) {
    ambientParticles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      size: 1 + Math.random() * 2,
      alpha: Math.random() * 0.4 + 0.1,
      speed: 0.2 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.7 ? '#FFD700' : '#FFFFFF'
    });
  }

  ctx.save();
  for (let i = ambientParticles.length - 1; i >= 0; i--) {
    const p = ambientParticles[i];

    // 更新位置（缓慢上升 + 左右摆动）
    p.y -= p.speed;
    p.x += Math.sin(walkTime * 2 + p.phase) * 0.3;
    p.phase += 0.02;

    // 移出屏幕则重置
    if (p.y < -10) {
      p.y = H + 10;
      p.x = Math.random() * W;
    }

    // 绘制
    const flicker = 0.7 + Math.sin(walkTime * 5 + p.phase * 3) * 0.3;
    ctx.globalAlpha = p.alpha * flicker;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

// 角色头像点击区域
let avatarHitBox = { x: 0, y: 0, w: 0, h: 0 };

// 绘制角色状态面板（左下角）
function drawCharacterStatusPanel(character, stats) {
  const panelX = 10;
  const panelY = H - 75;
  const avatarSize = 50;
  const barWidth = 100;
  const barHeight = 10;

  // 存储头像点击区域
  avatarHitBox = { x: panelX, y: panelY - 5, w: avatarSize, h: avatarSize + 25 };

  // 面板背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.beginPath();
  ctx.moveTo(panelX, panelY);
  ctx.lineTo(panelX + avatarSize + barWidth + 20, panelY);
  ctx.lineTo(panelX + avatarSize + barWidth + 20, panelY + avatarSize + 15);
  ctx.lineTo(panelX, panelY + avatarSize + 15);
  ctx.closePath();
  ctx.fill();

  // 头像背景
  ctx.fillStyle = character.color || '#666666';
  ctx.fillRect(panelX + 5, panelY + 5, avatarSize - 10, avatarSize - 10);

  // 头像边框
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX + 5, panelY + 5, avatarSize - 10, avatarSize - 10);

  // 绘制小人头像
  drawAvatarHead(panelX + avatarSize / 2, panelY + avatarSize / 2, avatarSize * 0.35, character.color);

  // 等级标签
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Lv.${playerLevel}`, panelX + avatarSize / 2, panelY + avatarSize + 8);

  // 条形图起始位置
  const barsX = panelX + avatarSize + 8;
  const barsY = panelY + 8;

  // HP条
  const hpRatio = gameState === 'adventure' ? Math.max(0, playerHP / playerMaxHP) : 1;
  drawStatusBar(barsX, barsY, barWidth, barHeight, hpRatio, '#4CAF50', '#2E7D32', 'HP');

  // MP条（蓝条）
  const mpRatio = Math.max(0, playerMP / playerMaxMP);
  drawStatusBar(barsX, barsY + barHeight + 4, barWidth, barHeight, mpRatio, '#2196F3', '#1565C0', 'MP');

  // EXP条
  const expRatio = playerExp / expToNext;
  drawStatusBar(barsX, barsY + (barHeight + 4) * 2, barWidth, barHeight, expRatio, '#9C27B0', '#6A1B9A', 'EXP');

  // 显示详细数值面板
  if (showDetailedStats) {
    drawDetailedStatsPanel(character, stats);
  }
}

// 绘制状态条
function drawStatusBar(x, y, width, height, ratio, fgColor, bgColor, label) {
  ctx.save();

  // 圆角参数
  const r = height / 2;

  // 背景 - 深色渐变
  roundRect(x, y, width, height, r);
  const bgGrad = ctx.createLinearGradient(x, y, x, y + height);
  bgGrad.addColorStop(0, 'rgba(10, 10, 20, 0.9)');
  bgGrad.addColorStop(1, 'rgba(20, 20, 35, 0.9)');
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // 前景 - 渐变填充
  if (ratio > 0) {
    ctx.shadowColor = fgColor;
    ctx.shadowBlur = 8;
    roundRect(x + 1, y + 1, Math.max(0, (width - 2) * ratio), height - 2, r - 1);
    const fgGrad = ctx.createLinearGradient(x, y, x, y + height);
    fgGrad.addColorStop(0, fgColor);
    fgGrad.addColorStop(0.5, shadeColor(fgColor, 20));
    fgGrad.addColorStop(1, fgColor);
    ctx.fillStyle = fgGrad;
    ctx.fill();

    // 高光效果
    ctx.shadowBlur = 0;
    roundRect(x + 2, y + 2, Math.max(0, (width - 4) * ratio), height / 3, r / 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fill();
  }

  // 边框
  ctx.shadowBlur = 0;
  roundRect(x, y, width, height, r);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 标签 - 带阴影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 4 + 1, y + height / 2 + 1);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(label, x + 4, y + height / 2);

  ctx.restore();
}

// 绘制头像中的小人头
function drawAvatarHead(x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);

  // 头
  ctx.fillStyle = color || '#666666';
  ctx.beginPath();
  ctx.arc(0, -size * 0.3, size * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // 身体
  ctx.strokeStyle = color || '#666666';
  ctx.lineWidth = size * 0.15;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.1);
  ctx.lineTo(0, size * 0.4);
  ctx.stroke();

  // 手臂
  ctx.beginPath();
  ctx.moveTo(-size * 0.35, size * 0.1);
  ctx.lineTo(size * 0.35, size * 0.1);
  ctx.stroke();

  // 腿
  ctx.beginPath();
  ctx.moveTo(0, size * 0.4);
  ctx.lineTo(-size * 0.25, size * 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, size * 0.4);
  ctx.lineTo(size * 0.25, size * 0.8);
  ctx.stroke();

  ctx.restore();
}

// 绘制详细数值面板
function drawDetailedStatsPanel(character, stats) {
  const panelW = 160;
  const panelH = 180;
  const panelX = 10;
  const panelY = H - 75 - panelH - 10;

  // 背景
  ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
  ctx.fillRect(panelX, panelY, panelW, panelH);

  // 边框
  ctx.strokeStyle = character.color || '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  // 标题栏
  ctx.fillStyle = character.color || '#666666';
  ctx.fillRect(panelX, panelY, panelW, 25);

  // 角色名称
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${character.name} Lv.${playerLevel}`, panelX + panelW / 2, panelY + 16);

  // 属性列表
  ctx.textAlign = 'left';
  ctx.font = '11px sans-serif';
  const lineHeight = 18;
  let y = panelY + 40;

  const statItems = [
    { label: '生命值', value: `${Math.ceil(playerHP)} / ${playerMaxHP}`, color: '#4CAF50' },
    { label: '魔法值', value: `${Math.ceil(playerMP)} / ${playerMaxMP}`, color: '#2196F3' },
    { label: '经验值', value: `${playerExp} / ${expToNext}`, color: '#9C27B0' },
    { label: '攻击力', value: stats.dmg.toString(), color: '#FF5722' },
    { label: '攻击速度', value: `${stats.atkSpd.toFixed(2)}s`, color: '#FFC107' },
    { label: '移动速度', value: stats.spd.toFixed(2), color: '#00BCD4' },
    { label: '攻击范围', value: (stats.range * 100).toFixed(0), color: '#8BC34A' },
    { label: '暴击率', value: `${stats.luck.toFixed(1)}%`, color: '#E91E63' }
  ];

  for (const item of statItems) {
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(item.label + ':', panelX + 10, y);
    ctx.fillStyle = item.color;
    ctx.textAlign = 'right';
    ctx.fillText(item.value, panelX + panelW - 10, y);
    ctx.textAlign = 'left';
    y += lineHeight;
  }

  // 描述
  ctx.fillStyle = '#888888';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(character.description, panelX + panelW / 2, panelY + panelH - 8);
}

// 绘制技能HUD
function drawSkillHUD() {
  const skillSlotSize = 42;
  const skillSpacing = 6;
  const startX = 12;
  const startY = H - 155; // 上移一点，给状态面板让位

  // 清空技能点击区域
  skillHitBoxes = [];

  const totalSkills = playerSkills.length;
  const hasPassive = playerPassive !== null;

  if (totalSkills === 0 && !hasPassive) return;

  // 计算背景大小
  const bgWidth = Math.max(totalSkills * (skillSlotSize + skillSpacing) + skillSpacing, hasPassive ? 90 : 50);
  const bgHeight = skillSlotSize + (hasPassive ? 28 : 10);

  // 背景面板（圆角效果）
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  const bgX = startX - 8;
  const bgY = startY - 8;
  const radius = 8;
  ctx.moveTo(bgX + radius, bgY);
  ctx.lineTo(bgX + bgWidth - radius, bgY);
  ctx.quadraticCurveTo(bgX + bgWidth, bgY, bgX + bgWidth, bgY + radius);
  ctx.lineTo(bgX + bgWidth, bgY + bgHeight - radius);
  ctx.quadraticCurveTo(bgX + bgWidth, bgY + bgHeight, bgX + bgWidth - radius, bgY + bgHeight);
  ctx.lineTo(bgX + radius, bgY + bgHeight);
  ctx.quadraticCurveTo(bgX, bgY + bgHeight, bgX, bgY + bgHeight - radius);
  ctx.lineTo(bgX, bgY + radius);
  ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY);
  ctx.closePath();
  ctx.fill();

  // 绘制主动技能
  for (let i = 0; i < playerSkills.length; i++) {
    const skill = playerSkills[i];
    const x = startX + i * (skillSlotSize + skillSpacing);
    const y = startY;

    // 存储点击区域
    skillHitBoxes.push({
      skill: skill,
      x: x,
      y: y,
      w: skillSlotSize,
      h: skillSlotSize,
      type: 'active'
    });

    const cd = skillCooldowns[skill.id] || 0;
    const isReady = cd <= 0;

    // 技能槽背景（渐变效果）
    if (isReady) {
      // 就绪状态 - 亮色
      const gradient = ctx.createLinearGradient(x, y, x, y + skillSlotSize);
      gradient.addColorStop(0, skill.color || '#555555');
      gradient.addColorStop(1, shadeColor(skill.color || '#555555', -30));
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = '#333333';
    }
    ctx.fillRect(x, y, skillSlotSize, skillSlotSize);

    // 冷却遮罩（扇形）
    if (cd > 0) {
      const cdRatio = cd / skill.cooldown;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.moveTo(x + skillSlotSize / 2, y + skillSlotSize / 2);
      ctx.arc(x + skillSlotSize / 2, y + skillSlotSize / 2, skillSlotSize / 2 + 2,
        -Math.PI / 2, -Math.PI / 2 + cdRatio * Math.PI * 2);
      ctx.closePath();
      ctx.fill();

      // 冷却数字
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.ceil(cd).toString(), x + skillSlotSize / 2, y + skillSlotSize / 2);
    }

    // 技能图标
    if (isReady || cd < skill.cooldown * 0.3) {
      ctx.font = `${skillSlotSize * 0.55}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = isReady ? 1 : 0.5;
      ctx.fillText(skill.icon, x + skillSlotSize / 2, y + skillSlotSize / 2);
      ctx.globalAlpha = 1;
    }

    // 强化等级标记（右下角星星）
    const enhanceLevel = getSkillEnhancement(skill.id);
    if (enhanceLevel > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('★'.repeat(enhanceLevel), x + skillSlotSize - 2, y + skillSlotSize - 2);
    }

    // 边框
    ctx.strokeStyle = isReady ? '#FFFFFF' : '#666666';
    ctx.lineWidth = isReady ? 2 : 1;
    ctx.strokeRect(x, y, skillSlotSize, skillSlotSize);

    // 就绪闪光效果
    if (isReady) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + skillSlotSize - 3);
      ctx.lineTo(x + 3, y + 3);
      ctx.lineTo(x + skillSlotSize - 3, y + 3);
      ctx.stroke();
    }
  }

  // 绘制被动技能
  if (playerPassive) {
    const passiveX = startX;
    const passiveY = startY + skillSlotSize + 4;
    const passiveW = 85;
    const passiveH = 18;

    // 存储点击区域
    skillHitBoxes.push({
      skill: playerPassive,
      x: passiveX,
      y: passiveY,
      w: passiveW,
      h: passiveH,
      type: 'passive'
    });

    // 被动技能背景
    const gradient = ctx.createLinearGradient(passiveX, passiveY, passiveX + passiveW, passiveY);
    gradient.addColorStop(0, playerPassive.color || '#666666');
    gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(passiveX, passiveY, passiveW, passiveH);

    // 被动图标和名称
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // 显示强化等级
    const passiveEnhance = getSkillEnhancement(playerPassive.id);
    const passiveStars = passiveEnhance > 0 ? ' ' + '★'.repeat(passiveEnhance) : '';
    ctx.fillText(`${playerPassive.icon} ${playerPassive.name}`, passiveX + 4, passiveY + passiveH / 2);

    // 强化标记（右侧）
    if (passiveEnhance > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.textAlign = 'right';
      ctx.fillText('★'.repeat(passiveEnhance), passiveX + passiveW - 4, passiveY + passiveH / 2);
    }

    // 金色边框（强化后更亮）
    ctx.strokeStyle = passiveEnhance > 0 ? '#FFAA00' : '#FFD700';
    ctx.lineWidth = passiveEnhance > 0 ? 2 : 1.5;
    ctx.strokeRect(passiveX, passiveY, passiveW, passiveH);
  }

  // 绘制技能提示
  if (skillTooltip) {
    drawSkillTooltip(skillTooltip.skill, skillTooltip.x, skillTooltip.y);
  }
}

// 绘制技能提示框
function drawSkillTooltip(skill, tx, ty) {
  const tooltipW = 160;
  const tooltipH = 95;

  // 确保提示框在屏幕内
  let x = tx - tooltipW / 2;
  let y = ty - tooltipH - 10;
  if (x < 5) x = 5;
  if (x + tooltipW > W - 5) x = W - tooltipW - 5;
  if (y < 5) y = ty + 50;

  // 背景
  ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
  ctx.fillRect(x, y, tooltipW, tooltipH);

  // 边框
  ctx.strokeStyle = skill.color || '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, tooltipW, tooltipH);

  // 标题栏
  ctx.fillStyle = skill.color || '#FFFFFF';
  ctx.fillRect(x, y, tooltipW, 24);

  // 技能名称
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${skill.icon} ${skill.name}`, x + 8, y + 12);

  // 卦象
  ctx.fillStyle = '#AAAAAA';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  const triSymbols = { '乾': '☰', '坤': '☷', '震': '☳', '巽': '☴', '坎': '☵', '离': '☲', '艮': '☶', '兑': '☱' };
  ctx.fillText(skill.trigram ? `${triSymbols[skill.trigram]} ${skill.trigram}` : '', x + tooltipW - 8, y + 12);

  // 类型标签
  const isPassive = skill.type === 'passive';
  ctx.fillStyle = isPassive ? '#FFD700' : '#00BFFF';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(isPassive ? '⭐ 被动技能' : `⚔️ 主动 | CD: ${skill.cooldown}s`, x + 8, y + 38);

  // 描述（自动换行）
  ctx.fillStyle = '#DDDDDD';
  ctx.font = '10px sans-serif';
  const desc = skill.description || '无描述';
  const maxWidth = tooltipW - 16;
  let line = '';
  let lineY = y + 55;
  for (const char of desc) {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth) {
      ctx.fillText(line, x + 8, lineY);
      line = char;
      lineY += 13;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x + 8, lineY);

  // 伤害信息（如果有）
  if (skill.damage) {
    ctx.fillStyle = '#FF6B6B';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`伤害: ${skill.damage}`, x + tooltipW - 8, y + tooltipH - 8);
  }
}

// 绘制技能选择UI
function drawSkillSelectionUI() {
  // 半透明背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, W, H);

  // 检查是否是强化模式
  const isEnhanceMode = skillChoices.length > 0 && skillChoices[0].isEnhancement;

  // 标题
  ctx.fillStyle = isEnhanceMode ? '#FF6600' : '#FFD700';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isEnhanceMode ? '⬆️ 卦象叠加' : '🎁 选择技能', W / 2, 50);

  ctx.fillStyle = '#AAAAAA';
  ctx.font = '12px sans-serif';
  if (isEnhanceMode) {
    ctx.fillText('技能已满，选择一个技能进行强化！', W / 2, 75);
  } else {
    ctx.fillText(`已拥有: ${playerSkills.length}/4 主动技能${playerPassive ? ' + 1被动' : ''}`, W / 2, 75);
  }

  // 技能选项（2x2布局）
  const cardW = W * 0.42;
  const cardH = H * 0.28;
  const gapX = W * 0.04;
  const gapY = H * 0.03;
  const startX = (W - cardW * 2 - gapX) / 2;
  const startY = 95;

  for (let i = 0; i < skillChoices.length; i++) {
    const skill = skillChoices[i];
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);

    // 卡片背景
    const isPassive = skill.type === 'passive';
    const isEvolved = skill.type === 'evolved';
    const isEnhancement = skill.isEnhancement === true;
    const canSelect = isPassive || isEvolved || isEnhancement || playerSkills.length < 4;

    // 强化选项特殊背景
    if (isEnhancement) {
      // 橙色渐变背景
      const gradient = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
      gradient.addColorStop(0, 'rgba(100, 50, 20, 0.95)');
      gradient.addColorStop(0.5, 'rgba(120, 70, 30, 0.95)');
      gradient.addColorStop(1, 'rgba(100, 50, 20, 0.95)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, cardW, cardH);

      // 闪光边框
      const glowIntensity = 0.5 + Math.sin(Date.now() / 250) * 0.3;
      ctx.shadowColor = '#FF6600';
      ctx.shadowBlur = 12 * glowIntensity;
      ctx.strokeStyle = '#FF6600';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, cardW, cardH);
      ctx.shadowBlur = 0;

      // 强化标签
      const levelNames = ['', '叠一', '叠二', '叠三'];
      const nextLevel = skill.nextEnhanceLevel;
      const stars = '★'.repeat(nextLevel);
      ctx.fillStyle = '#FF6600';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`⬆️ 强化至 ${levelNames[nextLevel]} ${stars}`, x + cardW / 2, y + 12);
    }
    // 进化技能特殊背景
    else if (isEvolved) {
      // 金色渐变背景
      const gradient = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
      gradient.addColorStop(0, 'rgba(80, 60, 20, 0.95)');
      gradient.addColorStop(0.5, 'rgba(100, 80, 30, 0.95)');
      gradient.addColorStop(1, 'rgba(80, 60, 20, 0.95)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, cardW, cardH);

      // 闪光边框
      const glowIntensity = 0.5 + Math.sin(Date.now() / 200) * 0.3;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 15 * glowIntensity;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, cardW, cardH);
      ctx.shadowBlur = 0;

      // 进化标签
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('⬆️ 技能进化！', x + cardW / 2, y + 12);
    } else {
      ctx.fillStyle = canSelect ? 'rgba(40, 40, 60, 0.95)' : 'rgba(40, 40, 40, 0.7)';
      ctx.fillRect(x, y, cardW, cardH);

      // 边框颜色
      ctx.strokeStyle = isPassive ? '#FFD700' : skill.color || '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, cardW, cardH);
    }

    // 技能图标
    ctx.font = isEvolved ? '40px sans-serif' : '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(skill.icon, x + cardW / 2, y + (isEvolved ? 40 : 35));

    // 技能名称
    ctx.fillStyle = isEvolved ? '#FFD700' : (skill.color || '#FFFFFF');
    ctx.font = isEvolved ? 'bold 16px sans-serif' : 'bold 14px sans-serif';
    ctx.fillText(skill.name, x + cardW / 2, y + (isEvolved ? 68 : 60));

    // 卦象
    ctx.fillStyle = isEvolved ? '#FFAA00' : '#888888';
    ctx.font = '11px sans-serif';
    const trigramSymbols = { '乾': '☰', '坤': '☷', '震': '☳', '巽': '☴', '坎': '☵', '离': '☲', '艮': '☶', '兑': '☱' };
    const trigramText = skill.trigram ? `${trigramSymbols[skill.trigram] || ''} ${skill.trigram}卦` : '';
    ctx.fillText(trigramText, x + cardW / 2, y + (isEvolved ? 86 : 78));

    // 类型标签
    if (isEnhancement) {
      // 显示强化效果
      const currentMult = ENHANCEMENT_MULTIPLIERS[skill.currentEnhanceLevel];
      const nextMult = ENHANCEMENT_MULTIPLIERS[skill.nextEnhanceLevel];
      ctx.fillStyle = '#FF6600';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`威力: ${Math.floor(currentMult * 100)}% → ${Math.floor(nextMult * 100)}%`, x + cardW / 2, y + 95);
    } else if (isEvolved) {
      ctx.fillStyle = '#FF6600';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`🌟 终极技能 CD:${skill.cooldown}s`, x + cardW / 2, y + 103);
    } else {
      ctx.fillStyle = isPassive ? '#FFD700' : '#00BFFF';
      ctx.font = '10px sans-serif';
      ctx.fillText(isPassive ? '⭐ 被动' : `⚔️ 主动 CD:${skill.cooldown}s`, x + cardW / 2, y + 95);
    }

    // 描述
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '11px sans-serif';
    let desc = '';
    let lineY = y + 115;

    if (isEnhancement) {
      // 强化选项显示连携效果
      if (skill.enhanceEffect) {
        // 显示新获得的连携效果
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`✨ 新效果: ${skill.enhanceEffect.name}`, x + cardW / 2, lineY);
        lineY += 16;
        ctx.fillStyle = '#AAFFAA';
        ctx.font = '10px sans-serif';
        desc = skill.enhanceEffect.desc;
      } else {
        desc = `强化后${skill.type === 'passive' ? '效果' : '伤害/持续'}提升`;
      }
    } else {
      desc = skill.description || '';
    }

    // 自动换行
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '11px sans-serif';
    const maxLineWidth = cardW - 20;
    let line = '';
    for (const char of desc) {
      const testLine = line + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxLineWidth) {
        ctx.fillText(line, x + cardW / 2, lineY);
        line = char;
        lineY += 14;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, x + cardW / 2, lineY);
    }

    // 强化时显示已有效果
    if (isEnhancement && skill.currentEnhanceLevel > 0) {
      lineY += 18;
      ctx.fillStyle = '#888888';
      ctx.font = '9px sans-serif';
      const currentEffects = getActiveEnhancementEffects(skill.id);
      if (currentEffects.length > 0) {
        ctx.fillText(`已有: ${currentEffects.map(e => e.name).join('+')}`, x + cardW / 2, lineY);
      }
    }

    // 不可选择提示
    if (!canSelect) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(x, y, cardW, cardH);
      ctx.fillStyle = '#FF4444';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('技能槽已满', x + cardW / 2, y + cardH / 2);
    }

    // 存储点击区域（用于触摸检测）
    skillChoices[i].hitBox = { x, y, w: cardW, h: cardH };
  }

  // 跳过按钮
  const skipBtnW = 100;
  const skipBtnH = 35;
  const skipBtnX = (W - skipBtnW) / 2;
  const skipBtnY = H - 60;

  ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
  ctx.fillRect(skipBtnX, skipBtnY, skipBtnW, skipBtnH);
  ctx.strokeStyle = '#AAAAAA';
  ctx.lineWidth = 2;
  ctx.strokeRect(skipBtnX, skipBtnY, skipBtnW, skipBtnH);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '14px sans-serif';
  ctx.fillText('跳过', skipBtnX + skipBtnW / 2, skipBtnY + skipBtnH / 2);
}

// ==================== 武器绘制系统 ====================
let isWeaponCreating = false;      // 是否在武器创建模式
let weaponDrawingPoints = [];      // 绘制的点
let isDrawing = false;             // 是否正在绘制
let weaponDescription = '';        // 武器描述
let customWeapon = null;           // 当前自定义武器
let weaponCreateStep = 0;          // 0:绘制, 1:描述, 2:生成中, 3:完成
let weaponCreateButtons = null;    // 按钮缓存
let generatedWeaponData = null;    // AI生成的武器数据
let weaponApiError = null;         // API错误信息
let weaponFragments = 0;           // 武器碎片（Boss掉落）

// 武器品质系统
const WEAPON_QUALITY = {
  broken: { name: '残缺', color: '#888888', statMult: 0.4, glowAlpha: 0.3 },
  normal: { name: '普通', color: '#FFFFFF', statMult: 0.7, glowAlpha: 0.5 },
  fine: { name: '精良', color: '#00FF00', statMult: 1.0, glowAlpha: 0.7 },
  perfect: { name: '完美', color: '#FF00FF', statMult: 1.3, glowAlpha: 0.9 },
  legendary: { name: '传说', color: '#FFD700', statMult: 1.6, glowAlpha: 1.0 }
};

// 武器强化所需材料
const WEAPON_UPGRADE_COST = {
  broken: { gold: 100, fragments: 0 },      // 残缺 -> 普通
  normal: { gold: 300, fragments: 3 },      // 普通 -> 精良
  fine: { gold: 800, fragments: 8 },        // 精良 -> 完美
  perfect: { gold: 2000, fragments: 15 }    // 完美 -> 传说
};

// 品质升级顺序
const QUALITY_ORDER = ['broken', 'normal', 'fine', 'perfect', 'legendary'];

// DeepSeek API配置 (用户需要填入自己的API Key)
const DEEPSEEK_API_KEY = 'YOUR_API_KEY_HERE'; // 请替换为你的DeepSeek API Key
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 开始武器创建
function startWeaponCreate() {
  isWeaponCreating = true;
  weaponDrawingPoints = [];
  weaponDescription = '';
  weaponCreateStep = 0;
  generatedWeaponData = null;
  weaponApiError = null;
  playSound('start');
}

// 退出武器创建
function exitWeaponCreate() {
  isWeaponCreating = false;
  weaponDrawingPoints = [];
  weaponCreateStep = 0;
}

// 清除绘制
function clearWeaponDrawing() {
  weaponDrawingPoints = [];
}

// 添加绘制点
function addWeaponDrawPoint(x, y, isNewStroke) {
  weaponDrawingPoints.push({ x, y, newStroke: isNewStroke });
}

// 进入描述步骤
function goToDescriptionStep() {
  if (weaponDrawingPoints.length < 10) {
    wx.showToast && wx.showToast({ title: '请先绘制武器形状', icon: 'none' });
    return;
  }
  weaponCreateStep = 1;
  // 弹出输入框
  showWeaponDescriptionInput();
}

// 显示武器描述输入
function showWeaponDescriptionInput() {
  wx.showModal && wx.showModal({
    title: '描述你的武器',
    editable: true,
    placeholderText: '例如：一把燃烧的火焰剑，能造成持续灼烧伤害',
    success: (res) => {
      if (res.confirm && res.content) {
        weaponDescription = res.content;
        weaponCreateStep = 2;
        generateWeaponWithAI();
      } else {
        weaponCreateStep = 0; // 返回绘制
      }
    }
  });
}

// 使用DeepSeek生成武器
function generateWeaponWithAI() {
  const prompt = `你是一个游戏武器设计师。根据玩家的描述，生成一个平衡的武器数据。

玩家描述: "${weaponDescription}"

请生成一个JSON格式的武器数据，必须严格遵循以下格式（不要加任何其他文字）:
{
  "name": "武器名称（2-4个字）",
  "description": "简短描述（10-20字）",
  "damage": 数值(15-50之间，基础伤害),
  "attackSpeed": 数值(0.3-1.5之间，攻击间隔秒数，越小越快),
  "critChance": 数值(0-30之间，暴击率百分比),
  "effect": "特殊效果类型(burn/freeze/stun/lifesteal/pierce/none)",
  "effectValue": 数值(效果强度，0-20),
  "effectDesc": "效果描述（5-15字）",
  "rarity": "稀有度(common/rare/epic/legendary)"
}

平衡规则：
- 伤害高则攻速慢，伤害低则攻速快
- 特殊效果越强，基础属性越低
- legendary武器总属性最高但有明显缺点`;

  // 检查API Key
  if (DEEPSEEK_API_KEY === 'YOUR_API_KEY_HERE') {
    // 没有配置API Key，使用本地生成
    generateWeaponLocally();
    return;
  }

  wx.request && wx.request({
    url: DEEPSEEK_API_URL,
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    data: {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500
    },
    success: (res) => {
      try {
        const content = res.data.choices[0].message.content;
        // 提取JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const weaponData = JSON.parse(jsonMatch[0]);
          applyGeneratedWeapon(weaponData);
        } else {
          throw new Error('无法解析武器数据');
        }
      } catch (e) {
        console.error('AI生成失败:', e);
        weaponApiError = 'AI解析失败，使用本地生成';
        generateWeaponLocally();
      }
    },
    fail: (err) => {
      console.error('API调用失败:', err);
      weaponApiError = '网络错误，使用本地生成';
      generateWeaponLocally();
    }
  });
}

// 本地生成武器（备用方案）
function generateWeaponLocally() {
  // 根据描述关键词生成
  const desc = weaponDescription.toLowerCase();
  let weapon = {
    name: '自制武器',
    description: weaponDescription.slice(0, 20),
    damage: 20 + Math.floor(Math.random() * 20),
    attackSpeed: 0.5 + Math.random() * 0.8,
    critChance: Math.floor(Math.random() * 20),
    effect: 'none',
    effectValue: 0,
    effectDesc: '无特殊效果',
    rarity: 'common'
  };

  // 根据关键词调整
  if (desc.includes('火') || desc.includes('燃烧') || desc.includes('flame') || desc.includes('fire')) {
    weapon.name = '炎魔之刃';
    weapon.effect = 'burn';
    weapon.effectValue = 8;
    weapon.effectDesc = '攻击附带灼烧';
    weapon.rarity = 'rare';
    weapon.damage -= 5;
  } else if (desc.includes('冰') || desc.includes('冻') || desc.includes('frost') || desc.includes('ice')) {
    weapon.name = '霜寒之刃';
    weapon.effect = 'freeze';
    weapon.effectValue = 15;
    weapon.effectDesc = '几率冻结敌人';
    weapon.rarity = 'rare';
    weapon.attackSpeed += 0.2;
  } else if (desc.includes('雷') || desc.includes('电') || desc.includes('lightning') || desc.includes('thunder')) {
    weapon.name = '雷霆之怒';
    weapon.effect = 'stun';
    weapon.effectValue = 10;
    weapon.effectDesc = '几率眩晕敌人';
    weapon.rarity = 'epic';
    weapon.critChance += 10;
  } else if (desc.includes('吸血') || desc.includes('生命') || desc.includes('vampir') || desc.includes('life')) {
    weapon.name = '血饮之刃';
    weapon.effect = 'lifesteal';
    weapon.effectValue = 12;
    weapon.effectDesc = '攻击回复生命';
    weapon.rarity = 'epic';
    weapon.damage -= 8;
  } else if (desc.includes('穿透') || desc.includes('刺穿') || desc.includes('pierce')) {
    weapon.name = '破甲之矛';
    weapon.effect = 'pierce';
    weapon.effectValue = 15;
    weapon.effectDesc = '穿透多个敌人';
    weapon.rarity = 'rare';
    weapon.attackSpeed += 0.3;
  } else if (desc.includes('神') || desc.includes('圣') || desc.includes('光') || desc.includes('divine')) {
    weapon.name = '圣光裁决';
    weapon.effect = 'burn';
    weapon.effectValue = 12;
    weapon.effectDesc = '圣光灼烧邪恶';
    weapon.rarity = 'legendary';
    weapon.damage += 10;
    weapon.critChance += 15;
    weapon.attackSpeed += 0.4; // legendary缺点：攻速慢
  } else if (desc.includes('暗') || desc.includes('黑') || desc.includes('shadow') || desc.includes('dark')) {
    weapon.name = '暗影之刃';
    weapon.effect = 'lifesteal';
    weapon.effectValue = 18;
    weapon.effectDesc = '汲取生命精华';
    weapon.rarity = 'legendary';
    weapon.damage += 5;
    weapon.attackSpeed -= 0.1;
  } else if (desc.includes('快') || desc.includes('速') || desc.includes('swift') || desc.includes('fast')) {
    weapon.name = '疾风匕首';
    weapon.effect = 'none';
    weapon.effectValue = 0;
    weapon.effectDesc = '无特殊效果';
    weapon.rarity = 'rare';
    weapon.damage -= 10;
    weapon.attackSpeed = 0.3;
    weapon.critChance += 15;
  } else if (desc.includes('重') || desc.includes('锤') || desc.includes('hammer') || desc.includes('heavy')) {
    weapon.name = '毁灭巨锤';
    weapon.effect = 'stun';
    weapon.effectValue = 20;
    weapon.effectDesc = '重击眩晕敌人';
    weapon.rarity = 'epic';
    weapon.damage += 15;
    weapon.attackSpeed = 1.2;
    weapon.critChance += 5;
  }

  // 根据绘制复杂度调整稀有度
  if (weaponDrawingPoints.length > 200) {
    if (weapon.rarity === 'common') weapon.rarity = 'rare';
    else if (weapon.rarity === 'rare') weapon.rarity = 'epic';
    weapon.damage += 3;
  }

  applyGeneratedWeapon(weapon);
}

// 应用生成的武器
function applyGeneratedWeapon(weaponData) {
  // 数值校验和平衡
  weaponData.damage = Math.max(10, Math.min(60, weaponData.damage || 20));
  weaponData.attackSpeed = Math.max(0.2, Math.min(2, weaponData.attackSpeed || 0.8));
  weaponData.critChance = Math.max(0, Math.min(50, weaponData.critChance || 0));
  weaponData.effectValue = Math.max(0, Math.min(25, weaponData.effectValue || 0));

  generatedWeaponData = weaponData;
  weaponCreateStep = 3;
  playSound('levelup');
}

// 确认装备武器
function equipCustomWeapon() {
  if (!generatedWeaponData) return;

  // 计算绘制区域边界（用于归一化武器图形）
  const points = weaponDrawingPoints;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const pt of points) {
    minX = Math.min(minX, pt.x);
    maxX = Math.max(maxX, pt.x);
    minY = Math.min(minY, pt.y);
    maxY = Math.max(maxY, pt.y);
  }

  // 画布区域（与drawWeaponDrawingCanvas一致）
  const canvasX = 20;
  const canvasY = 80;
  const canvasW = W - 40;
  const canvasH = H - 200;

  // 归一化点坐标到 -1 ~ 1 范围
  const drawW = maxX - minX || 1;
  const drawH = maxY - minY || 1;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const normalizedPoints = points.map(pt => ({
    x: (pt.x - centerX) / Math.max(drawW, drawH) * 2,
    y: (pt.y - centerY) / Math.max(drawW, drawH) * 2,
    newStroke: pt.newStroke
  }));

  // 保存基础属性（满品质时的属性）
  const baseStats = {
    damage: generatedWeaponData.damage,
    attackSpeed: generatedWeaponData.attackSpeed,
    critChance: generatedWeaponData.critChance,
    effectValue: generatedWeaponData.effectValue
  };

  customWeapon = {
    ...generatedWeaponData,
    drawingPoints: [...weaponDrawingPoints],
    normalizedPoints: normalizedPoints,
    bounds: { minX, maxX, minY, maxY, width: drawW, height: drawH },
    quality: 'broken',  // 新武器默认是残缺品质
    baseStats: baseStats, // 保存完整属性用于升级计算
    createdAt: Date.now()
  };

  // 第一次创建武器时，给予完美品质并触发剧情
  if (isFirstWeaponCreation && storyProgress === 0) {
    customWeapon.quality = 'perfect';  // 完美品质
    applyWeaponQuality();
    saveCustomWeapon();

    isFirstWeaponCreation = false;
    storyProgress = 1;
    saveStoryProgress();

    // 触发剧情Boss战
    exitWeaponCreate();
    startStoryBossFight();
    return;
  }

  // 正常流程：应用残缺品质的属性削减
  applyWeaponQuality();

  // 保存到本地
  saveCustomWeapon();

  wx.showToast && wx.showToast({ title: `获得了残缺的 ${customWeapon.name}！`, icon: 'none' });
  exitWeaponCreate();
}

// 保存自定义武器
function saveCustomWeapon() {
  try {
    wx.setStorageSync('customWeapon', JSON.stringify(customWeapon));
  } catch (e) {
    console.error('保存武器失败:', e);
  }
}

// 加载自定义武器
function loadCustomWeapon() {
  try {
    const data = wx.getStorageSync('customWeapon');
    if (data) {
      customWeapon = JSON.parse(data);
    }
  } catch (e) {
    console.error('加载武器失败:', e);
  }
}

// 获取武器加成
function getWeaponBonus() {
  if (!customWeapon) return null;
  return {
    damage: customWeapon.damage,
    attackSpeed: customWeapon.attackSpeed,
    critChance: customWeapon.critChance,
    effect: customWeapon.effect,
    effectValue: customWeapon.effectValue
  };
}

// 应用武器品质到属性
function applyWeaponQuality() {
  if (!customWeapon || !customWeapon.baseStats) return;

  const quality = customWeapon.quality || 'broken';
  const mult = WEAPON_QUALITY[quality].statMult;
  const base = customWeapon.baseStats;

  customWeapon.damage = Math.floor(base.damage * mult);
  customWeapon.attackSpeed = 1 - (1 - base.attackSpeed) * mult; // 攻速反向计算
  customWeapon.critChance = Math.floor(base.critChance * mult);
  customWeapon.effectValue = Math.floor(base.effectValue * mult);
}

// 强化武器
function upgradeWeapon() {
  if (!customWeapon) return false;

  const currentQuality = customWeapon.quality || 'broken';
  const currentIndex = QUALITY_ORDER.indexOf(currentQuality);

  // 已经是最高品质
  if (currentIndex >= QUALITY_ORDER.length - 1) {
    wx.showToast && wx.showToast({ title: '武器已达最高品质！', icon: 'none' });
    return false;
  }

  // 检查升级所需材料
  const cost = WEAPON_UPGRADE_COST[currentQuality];
  if (!cost) return false;

  if (goldCollected < cost.gold) {
    wx.showToast && wx.showToast({ title: `金币不足！需要${cost.gold}`, icon: 'none' });
    return false;
  }
  if (weaponFragments < cost.fragments) {
    wx.showToast && wx.showToast({ title: `碎片不足！需要${cost.fragments}`, icon: 'none' });
    return false;
  }

  // 扣除材料
  goldCollected -= cost.gold;
  weaponFragments -= cost.fragments;

  // 升级品质
  const nextQuality = QUALITY_ORDER[currentIndex + 1];
  customWeapon.quality = nextQuality;
  applyWeaponQuality();
  saveCustomWeapon();
  saveWeaponFragments();

  const qualityInfo = WEAPON_QUALITY[nextQuality];
  wx.showToast && wx.showToast({ title: `武器升级为 ${qualityInfo.name}！`, icon: 'success' });
  playSound('levelup');

  return true;
}

// 获取下一品质信息
function getNextQualityInfo() {
  if (!customWeapon) return null;

  const currentQuality = customWeapon.quality || 'broken';
  const currentIndex = QUALITY_ORDER.indexOf(currentQuality);

  if (currentIndex >= QUALITY_ORDER.length - 1) return null;

  const nextQuality = QUALITY_ORDER[currentIndex + 1];
  return {
    quality: nextQuality,
    ...WEAPON_QUALITY[nextQuality],
    cost: WEAPON_UPGRADE_COST[currentQuality]
  };
}

// 保存武器碎片
function saveWeaponFragments() {
  try {
    wx.setStorageSync('weaponFragments', weaponFragments);
  } catch (e) {
    console.error('保存碎片失败:', e);
  }
}

// 加载武器碎片
function loadWeaponFragments() {
  try {
    const data = wx.getStorageSync('weaponFragments');
    if (data !== undefined && data !== null) {
      weaponFragments = parseInt(data) || 0;
    }
  } catch (e) {
    console.error('加载碎片失败:', e);
  }
}

// 应用武器特殊效果
function applyWeaponEffect(target, weaponBonus, damage) {
  if (!target || !weaponBonus) return;

  const effect = weaponBonus.effect;
  const value = weaponBonus.effectValue;

  switch (effect) {
    case 'burn':
      // 灼烧效果
      target.burnDamage = value;
      target.burnTimer = 3;
      break;

    case 'freeze':
      // 冻结效果（几率触发）
      if (Math.random() * 100 < value) {
        target.freezeTimer = 1.5;
      }
      break;

    case 'stun':
      // 眩晕效果（几率触发）
      if (Math.random() * 100 < value) {
        target.stunTimer = 0.8;
      }
      break;

    case 'lifesteal':
      // 吸血效果
      const healAmount = Math.floor(damage * value / 100);
      if (healAmount > 0) {
        playerHP = Math.min(playerHP + healAmount, playerMaxHP);
      }
      break;

    case 'pierce':
      // 穿透效果 - 对周围敌人也造成伤害
      const pierceDamage = Math.floor(damage * 0.5);
      for (const m of monsters) {
        if (m !== target) {
          const dx = m.x - target.x;
          const dy = m.y - target.y;
          if (Math.sqrt(dx * dx + dy * dy) < 0.15) {
            m.hp -= pierceDamage;
            m.hitTimer = 0.1;
          }
        }
      }
      break;
  }
}

// ==================== 剧情和地牢系统 ====================

// 保存剧情进度
function saveStoryProgress() {
  try {
    wx.setStorageSync('storyProgress', storyProgress);
    wx.setStorageSync('isFirstWeaponCreation', isFirstWeaponCreation);
  } catch (e) {
    console.error('保存剧情进度失败:', e);
  }
}

// 加载剧情进度
function loadStoryProgress() {
  try {
    const progress = wx.getStorageSync('storyProgress');
    if (progress !== undefined && progress !== null) {
      storyProgress = parseInt(progress) || 0;
    }
    const firstWeapon = wx.getStorageSync('isFirstWeaponCreation');
    if (firstWeapon !== undefined && firstWeapon !== null) {
      isFirstWeaponCreation = firstWeapon === 'true' || firstWeapon === true;
    } else {
      isFirstWeaponCreation = true;
    }
  } catch (e) {
    console.error('加载剧情进度失败:', e);
  }
}

// 剧情对话数据
const STORY_DIALOGUES = {
  // 武器完成后 -> Boss战前
  preBoss: [
    { speaker: '???', text: '你...终于锻造出了武器？' },
    { speaker: '???', text: '愚蠢的囚徒，你以为这样就能逃出去？' },
    { speaker: '地牢守卫', text: '来吧，让我看看你的实力！' }
  ],
  // Boss战败后
  defeat: [
    { speaker: '地牢守卫', text: '哈哈哈...就这？' },
    { speaker: '地牢守卫', text: '你的武器...我收下了。' },
    { speaker: '', text: '【武器碎裂的声音】' },
    { speaker: '地牢守卫', text: '把这个废物丢回最底层的牢房！' },
    { speaker: '', text: '你失去了意识...' }
  ],
  // 醒来后
  awakening: [
    { speaker: '', text: '......' },
    { speaker: '', text: '你缓缓睁开眼睛...' },
    { speaker: '', text: '这是...地牢最深处？' },
    { speaker: '', text: '你的武器已经碎成了残片...' },
    { speaker: '', text: '但是，求生的意志让你站了起来。' },
    { speaker: '', text: '你决定从这个地牢中杀出一条路！' }
  ]
};

// 开始剧情Boss战
function startStoryBossFight() {
  gameState = 'story';
  storyDialogue = STORY_DIALOGUES.preBoss;
  storyDialogueIndex = 0;
  storyFadeAlpha = 0;

  // Boss战准备
  storyBossMaxHP = 9999;
  storyBossHP = storyBossMaxHP;

  playSound('boss');
}

// 开始实际的剧情Boss战斗
function startActualBossFight() {
  gameState = 'boss_intro';
  storyProgress = 2;

  // 重置玩家位置
  playerX = 0.5;
  playerY = 0.7;
  playerHP = playerMaxHP;

  // 清空怪物，添加剧情Boss
  monsters = [];
  monsters.push({
    x: 0.5,
    y: 0.2,
    hp: storyBossHP,
    maxHP: storyBossMaxHP,
    damage: 999,        // 超高伤害确保玩家失败
    speed: 0.08,
    exp: 0,
    scale: 2.5,
    type: 'boss',
    isBoss: true,
    name: '地牢守卫',
    attackCooldown: 0,
    isStoryBoss: true   // 标记为剧情Boss
  });

  // 5秒后强制触发失败
  setTimeout(() => {
    if (gameState === 'boss_intro' || gameState === 'adventure') {
      triggerStoryDefeat();
    }
  }, 5000);
}

// 触发剧情失败
function triggerStoryDefeat() {
  gameState = 'story';
  storyProgress = 3;
  storyDialogue = STORY_DIALOGUES.defeat;
  storyDialogueIndex = 0;

  playSound('gameover');
}

// 剧情：武器损坏，进入地牢
function enterDungeonAfterDefeat() {
  // 武器降级为残缺
  if (customWeapon) {
    customWeapon.quality = 'broken';
    applyWeaponQuality();
    saveCustomWeapon();
  }

  // 显示醒来剧情
  gameState = 'story';
  storyProgress = 4;
  storyDialogue = STORY_DIALOGUES.awakening;
  storyDialogueIndex = 0;
}

// 开始地牢探索
function startDungeonExploration() {
  gameState = 'dungeon';
  storyProgress = 5;
  saveStoryProgress();

  // 初始化地牢
  initDungeon();
}

// 初始化地牢
function initDungeon() {
  dungeonFloor = 1;
  dungeonRooms = [];
  dungeonMap = {};

  // 生成地牢布局（以立方体6个面为基础）
  generateDungeonFloor();

  // 设置起始房间
  currentRoomIndex = 0;
  currentRoom = dungeonRooms[0];
  enterRoom(currentRoom);
}

// 生成一层地牢
function generateDungeonFloor() {
  dungeonRooms = [];

  // 房间数量随层数增加
  const roomCount = 5 + dungeonFloor * 2;

  // 创建起始房间
  dungeonRooms.push({
    id: 0,
    type: ROOM_TYPES.START,
    x: 0, y: 0,
    enemies: [],
    items: [],
    cleared: true,
    exits: {}
  });

  // 生成普通房间
  const positions = [[0, 0]];
  const directions = [
    { dx: 1, dy: 0, dir: 'right', opposite: 'left' },
    { dx: -1, dy: 0, dir: 'left', opposite: 'right' },
    { dx: 0, dy: 1, dir: 'down', opposite: 'up' },
    { dx: 0, dy: -1, dir: 'up', opposite: 'down' }
  ];

  for (let i = 1; i < roomCount - 1; i++) {
    // 从已有房间随机选择一个扩展
    const parentIdx = Math.floor(Math.random() * positions.length);
    const parent = positions[parentIdx];
    const dir = directions[Math.floor(Math.random() * directions.length)];

    const newX = parent[0] + dir.dx;
    const newY = parent[1] + dir.dy;

    // 检查是否已有房间在这个位置
    const exists = positions.some(p => p[0] === newX && p[1] === newY);
    if (!exists) {
      // 决定房间类型
      let roomType = ROOM_TYPES.NORMAL;
      if (Math.random() < 0.15) roomType = ROOM_TYPES.TREASURE;
      else if (Math.random() < 0.1) roomType = ROOM_TYPES.SHOP;

      const newRoom = {
        id: dungeonRooms.length,
        type: roomType,
        x: newX, y: newY,
        enemies: [],
        items: [],
        cleared: false,
        exits: {}
      };

      // 连接房间
      newRoom.exits[dir.opposite] = parentIdx;
      dungeonRooms[parentIdx].exits[dir.dir] = newRoom.id;

      dungeonRooms.push(newRoom);
      positions.push([newX, newY]);
    }
  }

  // 添加Boss房（在最远的位置）
  let farthest = { idx: 0, dist: 0 };
  positions.forEach((pos, idx) => {
    const dist = Math.abs(pos[0]) + Math.abs(pos[1]);
    if (dist > farthest.dist) {
      farthest = { idx, dist, pos };
    }
  });

  // 在最远房间旁边添加Boss房
  const bossDir = directions[Math.floor(Math.random() * directions.length)];
  const bossRoom = {
    id: dungeonRooms.length,
    type: ROOM_TYPES.BOSS,
    x: farthest.pos[0] + bossDir.dx,
    y: farthest.pos[1] + bossDir.dy,
    enemies: [],
    items: [],
    cleared: false,
    exits: {},
    bossName: `第${dungeonFloor}层守卫`
  };
  bossRoom.exits[bossDir.opposite] = farthest.idx;
  dungeonRooms[farthest.idx].exits[bossDir.dir] = bossRoom.id;
  dungeonRooms.push(bossRoom);
}

// 进入房间
function enterRoom(room) {
  currentRoom = room;
  roomCleared = room.cleared;

  // 重置玩家位置
  playerX = 0.5;
  playerY = 0.5;

  // 清空现有怪物
  monsters = [];
  collectibles = [];

  if (!room.cleared) {
    // 生成房间内容
    if (room.type === ROOM_TYPES.NORMAL) {
      spawnRoomEnemies(2 + dungeonFloor);
    } else if (room.type === ROOM_TYPES.BOSS) {
      spawnBossForRoom();
    } else if (room.type === ROOM_TYPES.TREASURE) {
      spawnTreasure();
    } else if (room.type === ROOM_TYPES.SHOP) {
      spawnShopItems();
    }
  }

  // 设置房间出口
  updateRoomExits();
}

// 生成房间敌人
function spawnRoomEnemies(count) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const dist = 0.25;
    monsters.push({
      x: 0.5 + Math.cos(angle) * dist,
      y: 0.5 + Math.sin(angle) * dist,
      hp: 30 + dungeonFloor * 15,
      maxHP: 30 + dungeonFloor * 15,
      damage: 5 + dungeonFloor * 2,
      speed: 0.03 + dungeonFloor * 0.005,
      exp: 10 + dungeonFloor * 5,
      scale: 0.8 + Math.random() * 0.4,
      type: 'normal'
    });
  }
}

// 生成Boss
function spawnBossForRoom() {
  monsters.push({
    x: 0.5,
    y: 0.3,
    hp: 200 + dungeonFloor * 100,
    maxHP: 200 + dungeonFloor * 100,
    damage: 15 + dungeonFloor * 5,
    speed: 0.04 + dungeonFloor * 0.01,
    exp: 100 + dungeonFloor * 50,
    scale: 2.0,
    type: 'boss',
    isBoss: true,
    name: currentRoom.bossName || `第${dungeonFloor}层守卫`
  });
}

// 生成宝藏
function spawnTreasure() {
  collectibles.push({
    x: 0.5,
    y: 0.5,
    type: 'chest',
    value: 50 + dungeonFloor * 20
  });
  roomCleared = true;
  currentRoom.cleared = true;
}

// 生成商店物品
function spawnShopItems() {
  const shopItems = [
    { x: 0.3, y: 0.4, type: 'shop_heal', price: 30, value: 50 },
    { x: 0.5, y: 0.4, type: 'shop_damage', price: 50, value: 5 },
    { x: 0.7, y: 0.4, type: 'shop_fragment', price: 100, value: 1 }
  ];
  collectibles = shopItems;
  roomCleared = true;
  currentRoom.cleared = true;
}

// 更新房间出口
function updateRoomExits() {
  roomExits = [];
  const exits = currentRoom.exits;

  if (exits.up !== undefined) roomExits.push({ dir: 'up', x: 0.5, y: 0.05, targetRoom: exits.up });
  if (exits.down !== undefined) roomExits.push({ dir: 'down', x: 0.5, y: 0.95, targetRoom: exits.down });
  if (exits.left !== undefined) roomExits.push({ dir: 'left', x: 0.05, y: 0.5, targetRoom: exits.left });
  if (exits.right !== undefined) roomExits.push({ dir: 'right', x: 0.95, y: 0.5, targetRoom: exits.right });
}

// 检查玩家是否到达出口
function checkRoomExit() {
  if (!roomCleared) return;

  for (const exit of roomExits) {
    const dx = playerX - exit.x;
    const dy = playerY - exit.y;
    if (Math.sqrt(dx * dx + dy * dy) < 0.08) {
      // 进入下一个房间
      const nextRoom = dungeonRooms[exit.targetRoom];
      if (nextRoom) {
        enterRoom(nextRoom);
        currentRoomIndex = exit.targetRoom;

        // 设置进入位置（从对面进入）
        if (exit.dir === 'up') playerY = 0.85;
        else if (exit.dir === 'down') playerY = 0.15;
        else if (exit.dir === 'left') playerX = 0.85;
        else if (exit.dir === 'right') playerX = 0.15;

        playSound('start');
      }
      break;
    }
  }
}

// 检查房间是否清理完毕
function checkRoomCleared() {
  if (currentRoom && !currentRoom.cleared && monsters.length === 0) {
    currentRoom.cleared = true;
    roomCleared = true;

    // Boss房清理后进入下一层或胜利
    if (currentRoom.type === ROOM_TYPES.BOSS) {
      dungeonFloor++;
      showFloatingText(`第${dungeonFloor - 1}层通关！`, '#FFD700');

      // 掉落武器碎片
      const fragmentDrop = 2 + dungeonFloor;
      weaponFragments += fragmentDrop;
      saveWeaponFragments();
      showFloatingText(`+${fragmentDrop} 武器碎片`, '#FFD700');

      // 3秒后生成下一层
      setTimeout(() => {
        if (gameState === 'dungeon') {
          generateDungeonFloor();
          currentRoomIndex = 0;
          currentRoom = dungeonRooms[0];
          enterRoom(currentRoom);
        }
      }, 3000);
    } else {
      showFloatingText('房间已清理！', '#00FF00');
    }
  }
}

// 绘制剧情界面
function drawStoryUI() {
  // 渐变黑色背景
  const bgGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W * 0.8);
  bgGrad.addColorStop(0, `rgba(20, 15, 30, ${0.85 + storyFadeAlpha * 0.1})`);
  bgGrad.addColorStop(1, `rgba(5, 5, 15, ${0.95 + storyFadeAlpha * 0.05})`);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // 添加微光粒子背景
  const time = Date.now() * 0.001;
  ctx.save();
  for (let i = 0; i < 30; i++) {
    const px = (Math.sin(time * 0.3 + i * 1.7) * 0.5 + 0.5) * W;
    const py = (Math.cos(time * 0.2 + i * 2.3) * 0.5 + 0.5) * H;
    const alpha = Math.sin(time + i) * 0.3 + 0.4;
    ctx.fillStyle = `rgba(100, 100, 180, ${alpha * 0.3})`;
    ctx.beginPath();
    ctx.arc(px, py, 2 + Math.sin(time + i) * 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (storyDialogue.length === 0) return;

  const currentDialogue = storyDialogue[storyDialogueIndex];
  if (!currentDialogue) return;

  // 对话框 - 增强视觉
  const boxH = 140;
  const boxY = H - boxH - 30;
  const boxX = 25;
  const boxW = W - 50;

  ctx.save();

  // 外发光
  ctx.shadowColor = STYLE.glowPurple;
  ctx.shadowBlur = 25;

  // 绘制圆角对话框背景
  roundRect(boxX, boxY, boxW, boxH, 12);
  const boxGrad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
  boxGrad.addColorStop(0, 'rgba(35, 30, 60, 0.97)');
  boxGrad.addColorStop(0.5, 'rgba(25, 22, 45, 0.98)');
  boxGrad.addColorStop(1, 'rgba(20, 18, 35, 0.99)');
  ctx.fillStyle = boxGrad;
  ctx.fill();

  // 边框渐变
  ctx.shadowBlur = 0;
  roundRect(boxX, boxY, boxW, boxH, 12);
  const borderGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
  borderGrad.addColorStop(0, STYLE.secondary);
  borderGrad.addColorStop(0.5, STYLE.glowPurple);
  borderGrad.addColorStop(1, STYLE.primary);
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 顶部装饰线
  ctx.beginPath();
  ctx.moveTo(boxX + 30, boxY);
  ctx.lineTo(boxX + boxW - 30, boxY);
  ctx.strokeStyle = `rgba(167, 139, 250, 0.5)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();

  // 说话者名称 - 带发光效果
  if (currentDialogue.speaker) {
    ctx.save();
    ctx.shadowColor = STYLE.glowGold;
    ctx.shadowBlur = 15;
    ctx.fillStyle = STYLE.glowGold;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(currentDialogue.speaker, boxX + 20, boxY + 18);
    ctx.restore();

    // 名字下划线
    ctx.font = 'bold 16px sans-serif';
    ctx.beginPath();
    ctx.moveTo(boxX + 20, boxY + 40);
    ctx.lineTo(boxX + 20 + ctx.measureText(currentDialogue.speaker).width + 10, boxY + 40);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 对话内容 - 带阴影
  ctx.fillStyle = '#E8E8F0';
  ctx.font = '15px sans-serif';
  ctx.textAlign = 'left';
  const textY = currentDialogue.speaker ? boxY + 55 : boxY + 30;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 4;
  ctx.fillText(currentDialogue.text, boxX + 20, textY);
  ctx.restore();

  // 提示继续 - 呼吸动画
  const promptAlpha = 0.5 + Math.sin(time * 3) * 0.3;
  ctx.fillStyle = `rgba(150, 150, 200, ${promptAlpha})`;
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  const prompt = storyDialogueIndex < storyDialogue.length - 1 ? '▼ 点击继续 ▼' : '✦ 点击开始 ✦';
  ctx.fillText(prompt, W / 2, boxY + boxH - 18);
}

// 绘制地牢界面
function drawDungeonUI() {
  // 房间类型配置（带颜色）
  const roomConfig = {
    [ROOM_TYPES.NORMAL]: { name: '战斗房', icon: '⚔', color: STYLE.danger },
    [ROOM_TYPES.TREASURE]: { name: '宝藏房', icon: '💎', color: STYLE.glowGold },
    [ROOM_TYPES.SHOP]: { name: '商店', icon: '🛒', color: STYLE.glowBlue },
    [ROOM_TYPES.BOSS]: { name: 'BOSS房', icon: '💀', color: '#FF3333' },
    [ROOM_TYPES.START]: { name: '起始房', icon: '🚪', color: STYLE.success },
    [ROOM_TYPES.SECRET]: { name: '秘密房', icon: '❓', color: STYLE.secondary }
  };

  const config = roomConfig[currentRoom?.type] || { name: '未知', icon: '?', color: '#888' };

  // 顶部标题栏背景
  ctx.save();
  const titleGrad = ctx.createLinearGradient(0, 0, W, 0);
  titleGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  titleGrad.addColorStop(0.3, 'rgba(15, 15, 30, 0.9)');
  titleGrad.addColorStop(0.7, 'rgba(15, 15, 30, 0.9)');
  titleGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = titleGrad;
  ctx.fillRect(0, 0, W, 40);

  // 标题文字发光
  ctx.shadowColor = config.color;
  ctx.shadowBlur = 15;
  ctx.fillStyle = config.color;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${config.icon} 地牢 第${dungeonFloor}层 - ${config.name}`, W / 2, 22);
  ctx.restore();

  // 小地图
  drawMiniMap();

  // 房间出口指示
  if (roomCleared) {
    drawRoomExits();
  }
}

// 绘制小地图
function drawMiniMap() {
  const mapX = W - 85;
  const mapY = 45;
  const cellSize = 13;
  const mapW = 75;
  const mapH = 75;

  ctx.save();

  // 小地图背景
  ctx.shadowColor = STYLE.glowPurple;
  ctx.shadowBlur = 10;
  roundRect(mapX - 8, mapY - 8, mapW + 6, mapH + 6, 8);
  const mapBg = ctx.createLinearGradient(mapX, mapY, mapX, mapY + mapH);
  mapBg.addColorStop(0, 'rgba(20, 18, 35, 0.95)');
  mapBg.addColorStop(1, 'rgba(10, 10, 20, 0.95)');
  ctx.fillStyle = mapBg;
  ctx.fill();

  // 边框
  ctx.shadowBlur = 0;
  roundRect(mapX - 8, mapY - 8, mapW + 6, mapH + 6, 8);
  ctx.strokeStyle = 'rgba(100, 100, 150, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();

  // 绘制已探索的房间
  for (const room of dungeonRooms) {
    const rx = mapX + 30 + room.x * cellSize;
    const ry = mapY + 30 + room.y * cellSize;

    // 房间颜色配置
    const roomColors = {
      current: { fill: STYLE.success, glow: true },
      cleared: { fill: '#555566', glow: false },
      boss: { fill: '#FF4444', glow: true },
      treasure: { fill: STYLE.glowGold, glow: true },
      shop: { fill: STYLE.glowBlue, glow: false },
      normal: { fill: '#666677', glow: false }
    };

    let style;
    if (room.id === currentRoomIndex) style = roomColors.current;
    else if (room.cleared) style = roomColors.cleared;
    else if (room.type === ROOM_TYPES.BOSS) style = roomColors.boss;
    else if (room.type === ROOM_TYPES.TREASURE) style = roomColors.treasure;
    else if (room.type === ROOM_TYPES.SHOP) style = roomColors.shop;
    else style = roomColors.normal;

    ctx.save();
    if (style.glow) {
      ctx.shadowColor = style.fill;
      ctx.shadowBlur = 6;
    }

    // 绘制圆角小方块
    roundRect(rx - cellSize / 2, ry - cellSize / 2, cellSize - 2, cellSize - 2, 2);
    ctx.fillStyle = style.fill;
    ctx.fill();

    ctx.restore();
  }
}

// 绘制房间出口
function drawRoomExits() {
  const time = Date.now() * 0.001;

  for (const exit of roomExits) {
    // 脉冲效果
    const pulse = Math.sin(time * 4) * 0.3 + 0.7;

    // 根据方向绘制出口
    let ex, ey, ew, eh, arrowDir;
    if (exit.dir === 'up') {
      ex = W * 0.4; ey = 5; ew = W * 0.2; eh = 18; arrowDir = '▲';
    } else if (exit.dir === 'down') {
      ex = W * 0.4; ey = H - 23; ew = W * 0.2; eh = 18; arrowDir = '▼';
    } else if (exit.dir === 'left') {
      ex = 5; ey = H * 0.4; ew = 18; eh = H * 0.2; arrowDir = '◀';
    } else {
      ex = W - 23; ey = H * 0.4; ew = 18; eh = H * 0.2; arrowDir = '▶';
    }

    ctx.save();

    // 外发光
    ctx.shadowColor = STYLE.success;
    ctx.shadowBlur = 15 * pulse;

    // 渐变填充
    roundRect(ex, ey, ew, eh, 4);
    const exitGrad = ctx.createLinearGradient(ex, ey, ex + ew, ey + eh);
    exitGrad.addColorStop(0, `rgba(34, 197, 94, ${0.3 * pulse})`);
    exitGrad.addColorStop(0.5, `rgba(34, 197, 94, ${0.5 * pulse})`);
    exitGrad.addColorStop(1, `rgba(34, 197, 94, ${0.3 * pulse})`);
    ctx.fillStyle = exitGrad;
    ctx.fill();

    // 边框
    roundRect(ex, ey, ew, eh, 4);
    ctx.strokeStyle = `rgba(34, 197, 94, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 箭头指示
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(arrowDir, ex + ew / 2, ey + eh / 2);

    ctx.restore();
  }
}

// 处理剧情点击
function handleStoryClick() {
  storyDialogueIndex++;

  if (storyDialogueIndex >= storyDialogue.length) {
    // 对话结束，根据进度决定下一步
    if (storyProgress === 1) {
      // 开始Boss战
      startActualBossFight();
    } else if (storyProgress === 3) {
      // 进入地牢
      enterDungeonAfterDefeat();
    } else if (storyProgress === 4) {
      // 开始地牢探索
      startDungeonExploration();
    }
  }

  playSound('click');
}

// 绘制武器创建界面
function drawWeaponCreateUI() {
  if (!isWeaponCreating) return;

  // 全屏背景
  ctx.fillStyle = 'rgba(20, 20, 35, 0.98)';
  ctx.fillRect(0, 0, W, H);

  // 标题
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🗡️ 锻造武器', W / 2, 35);

  const stepNames = ['绘制武器', '描述效果', '生成中...', '锻造完成'];
  ctx.fillStyle = '#AAAAAA';
  ctx.font = '12px sans-serif';
  ctx.fillText(`步骤 ${weaponCreateStep + 1}/4: ${stepNames[weaponCreateStep]}`, W / 2, 58);

  // 初始化按钮缓存对象
  weaponCreateButtons = {};

  if (weaponCreateStep === 0) {
    drawWeaponDrawingCanvas();
  } else if (weaponCreateStep === 1) {
    drawWeaponDescriptionUI();
  } else if (weaponCreateStep === 2) {
    drawWeaponGeneratingUI();
  } else if (weaponCreateStep === 3) {
    drawWeaponResultUI();
  }

  // 返回按钮
  weaponCreateButtons.back = drawButton(15, 15, 60, 30, '← 返回', {
    bgColor: 'rgba(100, 100, 100, 0.8)',
    fontSize: 12,
    fontWeight: ''
  });
}

// 绘制绘画画布
function drawWeaponDrawingCanvas() {
  // 画布区域
  const canvasX = 20;
  const canvasY = 80;
  const canvasW = W - 40;
  const canvasH = H - 200;

  // 画布背景
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(canvasX, canvasY, canvasW, canvasH);
  ctx.strokeStyle = '#444466';
  ctx.lineWidth = 2;
  ctx.strokeRect(canvasX, canvasY, canvasW, canvasH);

  // 网格
  ctx.strokeStyle = 'rgba(100, 100, 150, 0.2)';
  ctx.lineWidth = 1;
  const gridSize = 30;
  for (let x = canvasX + gridSize; x < canvasX + canvasW; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, canvasY);
    ctx.lineTo(x, canvasY + canvasH);
    ctx.stroke();
  }
  for (let y = canvasY + gridSize; y < canvasY + canvasH; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(canvasX, y);
    ctx.lineTo(canvasX + canvasW, y);
    ctx.stroke();
  }

  // 绘制玩家画的线条
  if (weaponDrawingPoints.length > 1) {
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    let started = false;
    for (const pt of weaponDrawingPoints) {
      if (pt.newStroke || !started) {
        ctx.moveTo(pt.x, pt.y);
        started = true;
      } else {
        ctx.lineTo(pt.x, pt.y);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // 提示文字
  if (weaponDrawingPoints.length < 10) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('在此区域绘制你的武器形状', W / 2, canvasY + canvasH / 2);
  }

  // 按钮区域
  const btnY = canvasY + canvasH + 20;
  const btnW = 100, btnH = 40, gap = 20;
  const canProceed = weaponDrawingPoints.length >= 10;

  // 清除和下一步按钮
  weaponCreateButtons.clear = drawButton(W / 2 - btnW - gap / 2, btnY, btnW, btnH, '🗑️ 清除', {
    bgColor: 'rgba(150, 80, 80, 0.9)', borderColor: '#FF6666'
  });
  weaponCreateButtons.next = drawButton(W / 2 + gap / 2, btnY, btnW, btnH, '下一步 →', {
    bgColor: 'rgba(80, 150, 80, 0.9)', borderColor: '#66FF66', disabled: !canProceed
  });

  // 绘制点数统计
  drawText(`笔画点数: ${weaponDrawingPoints.length}`, W / 2, btnY + btnH + 25, { color: '#888888', fontSize: 11 });

  weaponCreateButtons.canvas = { x: canvasX, y: canvasY, w: canvasW, h: canvasH };
}

// 绘制描述输入UI
function drawWeaponDescriptionUI() {
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('正在等待输入描述...', W / 2, H / 2);

  ctx.fillStyle = '#888888';
  ctx.font = '12px sans-serif';
  ctx.fillText('请在弹出的对话框中输入武器描述', W / 2, H / 2 + 30);
}

// 绘制生成中UI
function drawWeaponGeneratingUI() {
  // 加载动画
  const dotCount = Math.floor((Date.now() / 300) % 4);
  const dots = '.'.repeat(dotCount);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`⚙️ 正在锻造武器${dots}`, W / 2, H / 2 - 20);

  if (weaponApiError) {
    ctx.fillStyle = '#FFAA00';
    ctx.font = '12px sans-serif';
    ctx.fillText(weaponApiError, W / 2, H / 2 + 20);
  }

  // 绘制武器预览（缩小版）
  drawWeaponPreview(W / 2, H / 2 + 80, 0.4);
}

// 绘制结果UI
function drawWeaponResultUI() {
  if (!generatedWeaponData) return;

  const weapon = generatedWeaponData;

  // 稀有度颜色
  const rarityColors = {
    common: '#AAAAAA',
    rare: '#4488FF',
    epic: '#AA44FF',
    legendary: '#FFD700'
  };
  const rarityNames = {
    common: '普通',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说'
  };

  const color = rarityColors[weapon.rarity] || '#FFFFFF';

  // 武器卡片
  const cardW = W - 60;
  const cardH = 280;
  const cardX = 30;
  const cardY = 80;

  // 卡片背景
  ctx.fillStyle = 'rgba(30, 30, 50, 0.95)';
  ctx.fillRect(cardX, cardY, cardW, cardH);

  // 发光边框
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(cardX, cardY, cardW, cardH);
  ctx.shadowBlur = 0;

  // 武器名称
  ctx.fillStyle = color;
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(weapon.name, W / 2, cardY + 35);

  // 稀有度标签
  ctx.fillStyle = color;
  ctx.font = '12px sans-serif';
  ctx.fillText(`✦ ${rarityNames[weapon.rarity]} ✦`, W / 2, cardY + 55);

  // 武器预览
  drawWeaponPreview(W / 2, cardY + 110, 0.5);

  // 属性面板
  const statsY = cardY + 160;
  ctx.textAlign = 'left';
  ctx.font = '13px sans-serif';

  const stats = [
    { label: '⚔️ 伤害', value: weapon.damage, color: '#FF6666' },
    { label: '⚡ 攻速', value: (1 / weapon.attackSpeed).toFixed(1) + '/秒', color: '#66FF66' },
    { label: '💥 暴击', value: weapon.critChance + '%', color: '#FFFF66' }
  ];

  stats.forEach((stat, i) => {
    const x = cardX + 25 + (i % 3) * ((cardW - 50) / 3);
    ctx.fillStyle = stat.color;
    ctx.fillText(`${stat.label}: ${stat.value}`, x, statsY);
  });

  // 特效
  if (weapon.effect !== 'none') {
    ctx.fillStyle = '#00FFFF';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`✨ ${weapon.effectDesc}`, W / 2, statsY + 25);
  }

  // 描述
  ctx.fillStyle = '#CCCCCC';
  ctx.font = '11px sans-serif';
  ctx.fillText(`"${weapon.description}"`, W / 2, statsY + 50);

  // 装备按钮
  const equipBtnW = 140;
  const equipBtnH = 45;
  const equipBtnX = (W - equipBtnW) / 2;
  const equipBtnY = cardY + cardH + 20;

  ctx.fillStyle = 'rgba(80, 180, 80, 0.9)';
  ctx.fillRect(equipBtnX, equipBtnY, equipBtnW, equipBtnH);
  ctx.strokeStyle = '#66FF66';
  ctx.lineWidth = 2;
  ctx.strokeRect(equipBtnX, equipBtnY, equipBtnW, equipBtnH);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✓ 装备武器', equipBtnX + equipBtnW / 2, equipBtnY + equipBtnH / 2);

  weaponCreateButtons.equip = { x: equipBtnX, y: equipBtnY, w: equipBtnW, h: equipBtnH };

  // 重新锻造按钮
  const retryBtnY = equipBtnY + equipBtnH + 15;
  ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
  ctx.fillRect(equipBtnX, retryBtnY, equipBtnW, 35);
  ctx.strokeStyle = '#888888';
  ctx.strokeRect(equipBtnX, retryBtnY, equipBtnW, 35);
  ctx.fillStyle = '#CCCCCC';
  ctx.font = '13px sans-serif';
  ctx.fillText('🔄 重新锻造', equipBtnX + equipBtnW / 2, retryBtnY + 17);

  weaponCreateButtons.retry = { x: equipBtnX, y: retryBtnY, w: equipBtnW, h: 35 };
}

// 绘制武器预览（使用玩家绘制的形状）
function drawWeaponPreview(cx, cy, scale) {
  if (weaponDrawingPoints.length < 2) return;

  // 计算绘制的边界
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const pt of weaponDrawingPoints) {
    minX = Math.min(minX, pt.x);
    maxX = Math.max(maxX, pt.x);
    minY = Math.min(minY, pt.y);
    maxY = Math.max(maxY, pt.y);
  }

  const drawW = maxX - minX;
  const drawH = maxY - minY;
  const drawCx = (minX + maxX) / 2;
  const drawCy = (minY + maxY) / 2;

  // 缩放和居中
  const maxSize = 100;
  const fitScale = Math.min(maxSize / drawW, maxSize / drawH, 1) * scale;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(fitScale, fitScale);
  ctx.translate(-drawCx, -drawCy);

  // 绘制武器
  ctx.strokeStyle = generatedWeaponData ?
    (generatedWeaponData.rarity === 'legendary' ? '#FFD700' :
      generatedWeaponData.rarity === 'epic' ? '#AA44FF' :
        generatedWeaponData.rarity === 'rare' ? '#4488FF' : '#CCCCCC') : '#00FFFF';
  ctx.lineWidth = 4 / fitScale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 15 / fitScale;

  ctx.beginPath();
  let started = false;
  for (const pt of weaponDrawingPoints) {
    if (pt.newStroke || !started) {
      ctx.moveTo(pt.x, pt.y);
      started = true;
    } else {
      ctx.lineTo(pt.x, pt.y);
    }
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.restore();
}

// 处理武器创建触摸事件
function handleWeaponCreateTouch(tx, ty, isStart, isEnd) {
  if (!isWeaponCreating || !weaponCreateButtons) return false;

  const btns = weaponCreateButtons;

  // 返回按钮
  if (btns.back && isEnd) {
    if (tx >= btns.back.x && tx <= btns.back.x + btns.back.w &&
      ty >= btns.back.y && ty <= btns.back.y + btns.back.h) {
      exitWeaponCreate();
      return true;
    }
  }

  if (weaponCreateStep === 0) {
    // 绘制阶段
    if (btns.canvas) {
      if (tx >= btns.canvas.x && tx <= btns.canvas.x + btns.canvas.w &&
        ty >= btns.canvas.y && ty <= btns.canvas.y + btns.canvas.h) {
        if (isStart) {
          isDrawing = true;
          addWeaponDrawPoint(tx, ty, true);
        } else if (!isEnd && isDrawing) {
          addWeaponDrawPoint(tx, ty, false);
        } else if (isEnd) {
          isDrawing = false;
        }
        return true;
      }
    }

    if (isEnd) {
      // 清除按钮
      if (btns.clear && tx >= btns.clear.x && tx <= btns.clear.x + btns.clear.w &&
        ty >= btns.clear.y && ty <= btns.clear.y + btns.clear.h) {
        clearWeaponDrawing();
        return true;
      }
      // 下一步按钮
      if (btns.next && tx >= btns.next.x && tx <= btns.next.x + btns.next.w &&
        ty >= btns.next.y && ty <= btns.next.y + btns.next.h) {
        goToDescriptionStep();
        return true;
      }
    }
  } else if (weaponCreateStep === 3 && isEnd) {
    // 结果阶段
    if (btns.equip && tx >= btns.equip.x && tx <= btns.equip.x + btns.equip.w &&
      ty >= btns.equip.y && ty <= btns.equip.y + btns.equip.h) {
      equipCustomWeapon();
      return true;
    }
    if (btns.retry && tx >= btns.retry.x && tx <= btns.retry.x + btns.retry.w &&
      ty >= btns.retry.y && ty <= btns.retry.y + btns.retry.h) {
      weaponCreateStep = 0;
      weaponDrawingPoints = [];
      generatedWeaponData = null;
      return true;
    }
  }

  return false;
}

// 初始化时加载武器和剧情进度
loadCustomWeapon();
loadWeaponFragments();
loadStoryProgress();

// ==================== 游戏循环 ====================
let lastTime = Date.now();

function gameLoop() {
  const now = Date.now();
  let dt = Math.min((now - lastTime) / 1000, 0.1); // 最大0.1秒，防止跳帧
  lastTime = now;

  // 更新时间缩放
  updateTimeScale(dt);

  // 应用时间缩放到游戏逻辑（慢动作效果）
  const scaledDt = dt * timeScale;

  // 暂停时只更新动画时间，不更新游戏逻辑
  if (!isPaused) {
    walkTime += scaledDt;
    stickManSpeed += (targetSpeed - stickManSpeed) * SPEED_LERP;
    sceneOffset += BASE_SCENE_SPEED * stickManSpeed;

    // 更新冒险逻辑
    updateAdventure(scaledDt);

    // 冒险模式下自动攻击和技能
    if (gameState === 'adventure') {
      attackMonsters();
      // 更新攻击特效
      updateAttackEffects(scaledDt);
      // 更新技能冷却和自动释放（技能/职业选择时暂停）
      if (!isSelectingSkill && !isSelectingClass) {
        updateSkillCooldowns(scaledDt);
        autoUseSkills();
      }
      updateSkillEffects(scaledDt);
      // 更新连击计时
      updateComboTimer(scaledDt);
    }
  }

  // 更新反馈效果（始终更新）
  updateScreenShake(dt);
  updateComboAnnouncements(dt);
  updateKillParticles(dt);

  // 更新成就通知（始终更新）
  updateAchievementNotification(dt);

  draw();
  requestAnimationFrame(gameLoop);
}

// ==================== 触摸事件 ====================
let touchStart = null;
let cachedGroundQuad = null;

// 缓存地面四边形用于点击检测
function updateGroundQuadCache() {
  const frontBits = getFrontBits();
  const visibleVerts = trigramBits
    .filter(bits => bits !== frontBits)
    .map(bits => ({ bits, p: projCache.get(bits) }))
    .filter(v => v.p);
  visibleVerts.sort((a, b) => b.p.y - a.p.y);

  if (visibleVerts.length >= 4) {
    const bottom4 = visibleVerts.slice(0, 4);
    const bottomPt = bottom4[0].p;
    const sidePts = bottom4.slice(1, 3);
    const leftPt = sidePts[0].p.x < sidePts[1].p.x ? sidePts[0].p : sidePts[1].p;
    const rightPt = sidePts[0].p.x < sidePts[1].p.x ? sidePts[1].p : sidePts[0].p;
    const topPt = bottom4[3].p;
    cachedGroundQuad = { nearLeft: leftPt, nearRight: rightPt, farLeft: topPt, farRight: bottomPt };
  }
}

// 屏幕坐标转地面坐标
function screenToGround(sx, sy) {
  if (!cachedGroundQuad) return null;
  const q = cachedGroundQuad;
  // 简化：使用逆双线性插值近似
  const p00 = q.farRight;
  const p10 = q.nearRight;
  const p01 = q.nearLeft;
  const p11 = q.farLeft;

  // 迭代求解
  let gx = 0.5, gy = 0.5;
  for (let iter = 0; iter < 10; iter++) {
    const px = (1-gx)*(1-gy)*p00.x + gx*(1-gy)*p10.x + (1-gx)*gy*p01.x + gx*gy*p11.x;
    const py = (1-gx)*(1-gy)*p00.y + gx*(1-gy)*p10.y + (1-gx)*gy*p01.y + gx*gy*p11.y;
    const errX = sx - px;
    const errY = sy - py;
    if (Math.abs(errX) < 1 && Math.abs(errY) < 1) break;
    // 简单梯度下降
    gx += errX * 0.002;
    gy += errY * 0.002;
    gx = Math.max(0, Math.min(1, gx));
    gy = Math.max(0, Math.min(1, gy));
  }
  return { x: gx, y: gy };
}

wx.onTouchStart((e) => {
  // 首次触摸时初始化音乐（浏览器音频策略要求用户交互）
  if (!musicInitialized) {
    initAudio();
    startMusic('idle');
    musicInitialized = true;
  }

  if (e.touches.length > 0) {
    const tx = e.touches[0].clientX;
    const ty = e.touches[0].clientY;
    touchStart = { x: tx, y: ty, t: Date.now() };
    updateGroundQuadCache();

    // 武器创建模式优先处理
    if (isWeaponCreating) {
      handleWeaponCreateTouch(tx, ty, true, false);
      return;
    }

    // 清除之前的长按计时器
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    skillTooltip = null;

    // 检查是否点击了技能槽（冒险模式且非技能选择状态）
    if (gameState === 'adventure' && !isSelectingSkill) {
      for (const hb of skillHitBoxes) {
        if (tx >= hb.x && tx <= hb.x + hb.w && ty >= hb.y && ty <= hb.y + hb.h) {
          // 开始长按计时（300ms后显示提示）
          longPressTimer = setTimeout(() => {
            skillTooltip = {
              skill: hb.skill,
              x: hb.x + hb.w / 2,
              y: hb.y
            };
          }, 300);
          break;
        }
      }
    }
  }
});

// 触摸移动事件（用于武器绘制）
wx.onTouchMove && wx.onTouchMove((e) => {
  if (e.touches.length > 0) {
    const tx = e.touches[0].clientX;
    const ty = e.touches[0].clientY;

    // 武器创建模式
    if (isWeaponCreating) {
      handleWeaponCreateTouch(tx, ty, false, false);
    }
  }
});

wx.onTouchEnd((e) => {
  // 清除长按计时器和提示
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  const wasShowingTooltip = skillTooltip !== null;
  skillTooltip = null;

  if (!e.changedTouches.length) return;
  const touch = e.changedTouches[0];
  const tx = touch.clientX;
  const ty = touch.clientY;

  // 武器创建模式优先处理
  if (isWeaponCreating) {
    handleWeaponCreateTouch(tx, ty, false, true);
    touchStart = null;
    return;
  }

  // 剧情模式 - 点击继续对话
  if (gameState === 'story') {
    handleStoryClick();
    touchStart = null;
    return;
  }

  if (!touchStart) return;
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  const dt = Date.now() - touchStart.t;

  // 如果正在显示技能提示，松开后不执行其他操作
  if (wasShowingTooltip) {
    touchStart = null;
    return;
  }

  // 新手引导 - 最高优先级
  if (showTutorial && gameState === 'idle') {
    const centerX = W / 2;
    const btnW = 120;
    const btnH = 44;
    const btnY = H - 60;
    const btnX = centerX - btnW / 2;

    // 检查下一步/开始游戏按钮
    if (tx >= btnX && tx <= btnX + btnW && ty >= btnY && ty <= btnY + btnH) {
      if (tutorialStep < TUTORIAL_PAGES.length - 1) {
        tutorialStep++;
      } else {
        completeTutorial();
      }
      touchStart = null;
      return;
    }

    // 检查跳过按钮（在最后一页之前可见）
    if (tutorialStep < TUTORIAL_PAGES.length - 1) {
      const skipY = btnY + btnH + 10;
      if (ty >= skipY && ty <= skipY + 30 && tx >= centerX - 50 && tx <= centerX + 50) {
        completeTutorial();
        touchStart = null;
        return;
      }
    }

    // 新手引导期间阻止其他操作
    touchStart = null;
    return;
  }

  // 暂停菜单状态 - 最高优先级
  if (isPaused && gameState === 'adventure') {
    const btnW = 140;
    const btnH = 45;
    const btnX = (W - btnW) / 2;
    const resumeBtnY = H / 2;
    const quitBtnY = H / 2 + 60;

    // 检查继续按钮
    if (tx >= btnX && tx <= btnX + btnW && ty >= resumeBtnY && ty <= resumeBtnY + btnH) {
      resumeGame();
      touchStart = null;
      return;
    }

    // 检查退出按钮
    if (tx >= btnX && tx <= btnX + btnW && ty >= quitBtnY && ty <= quitBtnY + btnH) {
      quitAdventure();
      touchStart = null;
      return;
    }

    touchStart = null;
    return;
  }

  // 设置面板优先处理
  if (showSettingsPanel && settingsPanelButtons) {
    const btns = settingsPanelButtons;

    // 音效开关
    if (tx >= btns.soundToggle.x && tx <= btns.soundToggle.x + btns.soundToggle.w &&
        ty >= btns.soundToggle.y && ty <= btns.soundToggle.y + btns.soundToggle.h) {
      toggleSound();
      saveAudioSettings();
      touchStart = null;
      return;
    }

    // 音效音量滑块
    if (tx >= btns.soundSlider.x && tx <= btns.soundSlider.x + btns.soundSlider.w &&
        ty >= btns.soundSlider.y && ty <= btns.soundSlider.y + btns.soundSlider.h) {
      const relX = tx - btns.soundSlider.x;
      const level = Math.round((relX / btns.soundSlider.w) * 4);
      setSoundVolumeLevel(level);
      playSound('hit'); // 预览音效
      touchStart = null;
      return;
    }

    // 音乐开关
    if (tx >= btns.musicToggle.x && tx <= btns.musicToggle.x + btns.musicToggle.w &&
        ty >= btns.musicToggle.y && ty <= btns.musicToggle.y + btns.musicToggle.h) {
      toggleMusic();
      saveAudioSettings();
      touchStart = null;
      return;
    }

    // 音乐音量滑块
    if (tx >= btns.musicSlider.x && tx <= btns.musicSlider.x + btns.musicSlider.w &&
        ty >= btns.musicSlider.y && ty <= btns.musicSlider.y + btns.musicSlider.h) {
      const relX = tx - btns.musicSlider.x;
      const level = Math.round((relX / btns.musicSlider.w) * 4);
      setMusicVolumeLevel(level);
      touchStart = null;
      return;
    }

    // 关闭按钮
    if (tx >= btns.close.x && tx <= btns.close.x + btns.close.w &&
        ty >= btns.close.y && ty <= btns.close.y + btns.close.h) {
      showSettingsPanel = false;
      touchStart = null;
      return;
    }

    // 点击面板外关闭
    const panelW = Math.min(W - 40, 300);
    const panelH = 320;
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;
    if (tx < panelX || tx > panelX + panelW || ty < panelY || ty > panelY + panelH) {
      showSettingsPanel = false;
    }

    touchStart = null;
    return;
  }

  // 检查设置按钮（所有状态下都可用）
  const settingsBtnSize = 36;
  const settingsBtnX = W - settingsBtnSize - 10;
  const settingsBtnY = 10;
  const settingsCenterX = settingsBtnX + settingsBtnSize / 2;
  const settingsCenterY = settingsBtnY + settingsBtnSize / 2;
  const settingsDist = Math.sqrt((tx - settingsCenterX) ** 2 + (ty - settingsCenterY) ** 2);
  if (settingsDist <= settingsBtnSize / 2 + 5) {
    showSettingsPanel = true;
    touchStart = null;
    return;
  }

  // 冒险模式中检查暂停按钮
  if (gameState === 'adventure' && !isPaused && !isSelectingSkill && !isSelectingClass) {
    const btnSize = 36;
    const pauseBtnX = W - btnSize - 10;
    const pauseBtnY = 60;
    const centerX = pauseBtnX + btnSize / 2;
    const centerY = pauseBtnY + btnSize / 2;
    const dist = Math.sqrt((tx - centerX) ** 2 + (ty - centerY) ** 2);

    if (dist <= btnSize / 2 + 5) { // 稍微增大点击区域
      pauseGame();
      touchStart = null;
      return;
    }
  }

  // 职业选择状态
  if (isSelectingClass) {
    const classKeys = Object.keys(CLASS_TYPES);
    const cardW = 100;
    const cardH = 140;
    const gap = 10;
    const totalW = classKeys.length * cardW + (classKeys.length - 1) * gap;
    const startX = (W - totalW) / 2;
    const startY = 90;

    for (let i = 0; i < classKeys.length; i++) {
      const x = startX + i * (cardW + gap);
      const y = startY;
      if (tx >= x && tx <= x + cardW && ty >= y && ty <= y + cardH) {
        selectClass(classKeys[i]);
        touchStart = null;
        return;
      }
    }
    touchStart = null;
    return;
  }

  // 技能选择状态
  if (isSelectingSkill && skillChoices.length > 0) {
    // 检查是否点击了技能卡片
    for (let i = 0; i < skillChoices.length; i++) {
      const skill = skillChoices[i];
      if (skill.hitBox) {
        const hb = skill.hitBox;
        if (tx >= hb.x && tx <= hb.x + hb.w && ty >= hb.y && ty <= hb.y + hb.h) {
          // 检查是否可以选择
          const isPassive = skill.type === 'passive';
          const isEvolved = skill.type === 'evolved';
          const isEnhancement = skill.isEnhancement === true;
          const canSelect = isPassive || isEvolved || isEnhancement || playerSkills.length < 4;
          if (canSelect) {
            selectSkill(i);
            touchStart = null;
            return;
          }
        }
      }
    }

    // 检查是否点击了跳过按钮
    const skipBtnW = 100;
    const skipBtnH = 35;
    const skipBtnX = (W - skipBtnW) / 2;
    const skipBtnY = H - 60;
    if (tx >= skipBtnX && tx <= skipBtnX + skipBtnW && ty >= skipBtnY && ty <= skipBtnY + skipBtnH) {
      isSelectingSkill = false;
      skillChoices = [];
      touchStart = null;
      return;
    }

    touchStart = null;
    return;
  }

  // 游戏结束状态 - 检查战绩界面按钮
  if (gameState === 'gameover' && battleResultButtons) {
    const btns = battleResultButtons;

    // 分享按钮
    if (tx >= btns.share.x && tx <= btns.share.x + btns.share.w &&
        ty >= btns.share.y && ty <= btns.share.y + btns.share.h) {
      shareBattleResult();
      touchStart = null;
      return;
    }

    // 返回按钮
    if (tx >= btns.return.x && tx <= btns.return.x + btns.return.w &&
        ty >= btns.return.y && ty <= btns.return.y + btns.return.h) {
      returnToIdle();
      touchStart = null;
      return;
    }

    // 再来一局按钮
    if (tx >= btns.retry.x && tx <= btns.retry.x + btns.retry.w &&
        ty >= btns.retry.y && ty <= btns.retry.y + btns.retry.h) {
      returnToIdle();
      // 短暂延迟后开始新游戏
      setTimeout(() => {
        if (gameState === 'idle') {
          startAdventure();
        }
      }, 100);
      touchStart = null;
      return;
    }

    touchStart = null;
    return;
  }

  // 冒险模式 - 点击移动
  if (gameState === 'adventure') {
    const groundPos = screenToGround(tx, ty);
    if (groundPos) {
      // 屏幕坐标转世界坐标（因为相机跟随玩家，屏幕中心=玩家位置）
      const worldX = groundPos.x - 0.5 + playerX;
      const worldY = groundPos.y - 0.5 + playerY;
      // 限制在有效范围内
      if (worldX >= 0.1 && worldX <= 0.9 && worldY >= 0.1 && worldY <= 0.9) {
        playerTargetX = worldX;
        playerTargetY = worldY;
        isMoving = true;
      }
    }
    touchStart = null;
    return;
  }

  // 点击头像显示/隐藏详细数值
  if (tx >= avatarHitBox.x && tx <= avatarHitBox.x + avatarHitBox.w &&
      ty >= avatarHitBox.y && ty <= avatarHitBox.y + avatarHitBox.h) {
    showDetailedStats = !showDetailedStats;
    touchStart = null;
    return;
  }

  // 点击其他地方关闭详细数值面板
  if (showDetailedStats) {
    showDetailedStats = false;
    touchStart = null;
    return;
  }

  // 待机模式的交互
  if (dt < 300 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
    // 检查是否点击了"重置数据"按钮（右上角）
    if (gameState === 'idle') {
      const resetBtnW = 70;
      const resetBtnH = 28;
      const resetBtnX = W - resetBtnW - 10;
      const resetBtnY = 10;
      if (tx >= resetBtnX && tx <= resetBtnX + resetBtnW && ty >= resetBtnY && ty <= resetBtnY + resetBtnH) {
        resetGameData();
        touchStart = null;
        return;
      }
    }

    // 检查是否点击了主界面按钮
    if (idleScreenButtons) {
      const btns = idleScreenButtons;

      // 普通冒险按钮
      if (tx >= btns.adventure.x && tx <= btns.adventure.x + btns.adventure.w &&
          ty >= btns.adventure.y && ty <= btns.adventure.y + btns.adventure.h) {
        startAdventure();
        touchStart = null;
        return;
      }

      // 每日挑战按钮
      if (tx >= btns.daily.x && tx <= btns.daily.x + btns.daily.w &&
          ty >= btns.daily.y && ty <= btns.daily.y + btns.daily.h) {
        startDailyChallenge();
        touchStart = null;
        return;
      }

      // 武器强化按钮（必须在锻造按钮之前检查，因为它在锻造区域内）
      if (btns.upgradeWeapon && tx >= btns.upgradeWeapon.x && tx <= btns.upgradeWeapon.x + btns.upgradeWeapon.w &&
          ty >= btns.upgradeWeapon.y && ty <= btns.upgradeWeapon.y + btns.upgradeWeapon.h) {
        upgradeWeapon();
        touchStart = null;
        return;
      }

      // 锻造武器按钮
      if (btns.forge && tx >= btns.forge.x && tx <= btns.forge.x + btns.forge.w &&
          ty >= btns.forge.y && ty <= btns.forge.y + btns.forge.h) {
        startWeaponCreate();
        touchStart = null;
        return;
      }
    }

    // 检查是否点击了立方体顶点
    const hit = hitTest(tx, ty);
    if (hit) {
      const name = bitsToName[hit];
      if (palacePairs[name]) {
        currentPalace = name;
        rotX = 0; rotY = 0; rotZ = Math.PI;
        saveGameData(); // 保存宫位选择
      }
    }
  }
  touchStart = null;
});

// ==================== 启动 ====================
console.log('========================================');
console.log('八卦立方体 - Canvas 2D 模式');
console.log('版本: 1.0.0');
console.log('========================================');

requestAnimationFrame(gameLoop);
