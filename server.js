import { webcrypto } from 'crypto';
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}.wav`),
});
const upload = multer({ storage });

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

app.get('/api/voices', async (req, res) => {
  try {
    const tts = new MsEdgeTTS();
    const voices = await tts.getVoices();
    res.json(voices);
  } catch (error) {
    console.error('msedge-tts getVoices failed, trying direct fetch:', error.message);
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
        console.error('Direct fetch voices failed:', e.message);
        res.status(500).json({ error: '获取音色列表失败' });
      });
    } catch (e2) {
      res.status(500).json({ error: '获取音色列表失败' });
    }
  }
});

app.post('/api/tts', async (req, res) => {
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
      console.error('TTS流错误:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: '语音合成失败' });
      }
    });
  } catch (error) {
    console.error('TTS合成错误:', error);
    res.status(500).json({ error: '语音合成失败: ' + error.message });
  }
});

app.post('/api/assess', upload.single('audio'), async (req, res) => {
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
    console.error('评测错误:', error);
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

app.listen(PORT, () => {
  console.log(`✅ TTS服务已启动: http://localhost:${PORT}`);
});
