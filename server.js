import 'dotenv/config';
import { webcrypto } from 'crypto';
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import https from 'https';
import { fileURLToPath } from 'url';
import pino from 'pino';
import authRoutes from './server/routes/auth.js';
import syncRoutes from './server/routes/sync.js';
import { optionalAuth } from './server/middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined,
});

const app = express();
const PORT = process.env.PORT || 3000;

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: corsOrigins,
}));
app.use(helmet());
const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '60'),
  message: { error: '请求过于频繁，请稍后再试' },
});
app.use('/api', rateLimiter);
app.use(express.json());
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
    });
  });
  next();
});

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}.wav`),
});
const ALLOWED_AUDIO_TYPES = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/webm', 'audio/ogg', 'audio/x-wav'];
const ALLOWED_EXTENSIONS = ['.wav', '.mp3', '.webm', '.ogg'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('仅支持音频文件格式（wav/mp3/webm/ogg）'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760') },
});

function getPythonCommand() {
  return process.platform === 'win32' ? 'python' : 'python3';
}

function runAssessment(audioPath, expectedText, language) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(getPythonCommand(), [
      path.join(__dirname, 'scripts', 'assess.py'),
      '--audio', audioPath,
      '--text', expectedText,
      '--language', language,
    ]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || '评测脚本执行失败'));
        return;
      }
      try {
        const result = JSON.parse(stdout);
        if (result.error) {
          reject(new Error(result.error));
          return;
        }
        resolve(result);
      } catch {
        reject(new Error('解析评测结果失败'));
      }
    });
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);

app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      api: 'ok',
      tts: 'unknown',
      assessment: 'unknown',
    },
  };

  try {
    const tts = new MsEdgeTTS();
    await tts.getVoices();
    health.services.tts = 'ok';
  } catch {
    health.services.tts = 'degraded';
  }

  try {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const check = spawn(pythonCmd, ['--version']);
    await new Promise((resolve, reject) => {
      check.on('close', (code) => code === 0 ? resolve() : reject());
      check.on('error', reject);
    });
    health.services.assessment = 'ok';
  } catch {
    health.services.assessment = 'unavailable';
  }

  const hasDegraded = Object.values(health.services).some(s => s !== 'ok');
  res.status(hasDegraded ? 200 : 200).json(health);
});

app.get('/api/voices', async (req, res) => {
  try {
    const tts = new MsEdgeTTS();
    const voices = await tts.getVoices();
    res.json(voices);
  } catch (error) {
    logger.error({ err: error }, 'msedge-tts getVoices failed, trying direct fetch:');
    try {
      const url = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';
      https.get(url, (apiRes) => {
        let data = '';
        apiRes.on('data', (chunk) => { data += chunk; });
        apiRes.on('end', () => {
          try {
            const voices = JSON.parse(data);
            res.json(voices);
          } catch (e) {
            res.status(500).json({ error: '解析音色列表失败' });
          }
        });
      }).on('error', (e) => {
        logger.error({ err: e }, 'Direct fetch voices failed:');
        res.status(500).json({ error: '获取音色列表失败' });
      });
    } catch (e2) {
      res.status(500).json({ error: '获取音色列表失败' });
    }
  }
});

app.post('/api/tts', optionalAuth, async (req, res) => {
  try {
    const { text, voice, rate, pitch, volume } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: '请输入文本' });
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata(
      voice || 'zh-CN-XiaoxiaoNeural',
      OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3
    );

    const options = {};
    if (rate) options.rate = `${rate}%`;
    if (pitch) options.pitch = `${pitch}Hz`;
    if (volume) options.volume = `${volume}%`;

    const { audioStream } = tts.toStream(text, options);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'inline; filename="speech.mp3"');

    const chunks = [];
    audioStream.on('data', (data) => {
      chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
    });

    audioStream.on('close', () => {
      res.send(Buffer.concat(chunks));
    });

    audioStream.on('error', (err) => {
      logger.error({ err }, 'TTS流错误:');
      if (!res.headersSent) {
        res.status(500).json({ error: '语音合成失败' });
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'TTS合成错误:');
    res.status(500).json({ error: '语音合成失败: ' + error.message });
  }
});

app.post('/api/assess', optionalAuth, upload.single('audio'), async (req, res) => {
  try {
    const { expectedText, language } = req.body;
    const audioPath = req.file?.path;

    if (!expectedText || !audioPath) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const result = await runAssessment(audioPath, expectedText, language || 'zh');

    res.json({
      success: true,
      audioUrl: `/uploads/${req.file.filename}`,
      ...result,
    });
  } catch (error) {
    logger.error({ err: error }, '评测错误:');
    res.status(500).json({ error: '评测失败: ' + error.message });
  }
});

app.delete('/api/audio/:filename', (req, res) => {
  const filepath = path.join(uploadsDir, req.params.filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
  res.json({ success: true });
});

app.use('/uploads', express.static(uploadsDir));

function cleanOldUploads() {
  try {
    const files = fs.readdirSync(uploadsDir);
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    for (const file of files) {
      const filepath = path.join(uploadsDir, file);
      const stat = fs.statSync(filepath);
      if (now - stat.mtimeMs > ONE_HOUR) {
        fs.unlinkSync(filepath);
      }
    }
  } catch {}
}

cleanOldUploads();
setInterval(cleanOldUploads, 10 * 60 * 1000);

app.listen(PORT, () => {
  logger.info(`TTS服务已启动: http://localhost:${PORT}`);
});
