import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, isPostgres } from '../db.js';
import { generateToken, verifyToken } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { sendVerificationEmail } from '../utils/email.js';

const router = Router();

// 内存验证码存储（生产环境建议用 Redis）
const verificationCodes = new Map();

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getCodeKey(email, purpose) {
  return `${email}:${purpose}`;
}

function storeCode(email, code, purpose = 'register') {
  const key = getCodeKey(email, purpose);
  verificationCodes.set(key, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10分钟过期
    used: false,
  });
}

function verifyCode(email, code, purpose = 'register') {
  const key = getCodeKey(email, purpose);
  const record = verificationCodes.get(key);
  if (!record) return { valid: false, message: '验证码不存在，请先获取验证码' };
  if (record.used) return { valid: false, message: '验证码已使用，请重新获取' };
  if (Date.now() > record.expiresAt) return { valid: false, message: '验证码已过期，请重新获取' };
  if (record.code !== code) return { valid: false, message: '验证码错误' };

  record.used = true;
  return { valid: true };
}

async function insertUser(username, passwordHash, name, avatar, email) {
  const id = uuidv4();
  if (isPostgres()) {
    const result = await query(
      'INSERT INTO users (id, username, password_hash, name, avatar, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, name, avatar, stars, level, streak, email',
      [id, username, passwordHash, name, avatar, email]
    );
    return result.rows[0];
  } else {
    await query(
      'INSERT INTO users (id, username, password_hash, name, avatar, email) VALUES (?, ?, ?, ?, ?, ?)',
      [id, username, passwordHash, name, avatar, email]
    );
    return { id, username, name, avatar, stars: 0, level: 1, streak: 0, email };
  }
}

// 发送验证码
router.post('/send-code', async (req, res) => {
  try {
    const { email, purpose = 'register' } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }

    // 检查邮箱是否已被注册
    if (purpose === 'register') {
      const existingEmail = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
      if (existingEmail) {
        return res.status(409).json({ error: '该邮箱已被注册' });
      }
    }

    const code = generateCode();
    storeCode(email, code, purpose);

    // 发送邮件
    try {
      await sendVerificationEmail(email, code);
      res.json({ success: true, message: '验证码已发送' });
    } catch (emailErr) {
      console.error('Send email error:', emailErr);
      // 开发环境返回验证码，方便测试
      if (process.env.NODE_ENV !== 'production') {
        res.json({ success: true, message: '验证码已发送（开发模式）', code });
      } else {
        res.status(500).json({ error: '邮件发送失败，请稍后重试' });
      }
    }
  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({ error: '发送验证码失败' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, name, avatar, email, code } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: '用户名长度需在3-50个字符之间' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度不能少于6个字符' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }

    const existing = await queryOne('SELECT id FROM users WHERE username = $1', [username]);
    if (existing) {
      return res.status(409).json({ error: '用户名已存在' });
    }

    // 如果填写了邮箱，必须验证验证码
    if (email) {
      if (!code) {
        return res.status(400).json({ error: '请输入邮箱验证码' });
      }
      const verifyResult = verifyCode(email, code, 'register');
      if (!verifyResult.valid) {
        return res.status(400).json({ error: verifyResult.message });
      }

      const existingEmail = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
      if (existingEmail) {
        return res.status(409).json({ error: '该邮箱已被注册' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const displayName = name || username;
    const displayAvatar = avatar || 'default';

    const user = await insertUser(username, passwordHash, displayName, displayAvatar, email || null);
    const token = generateToken({ id: user.id, username: user.username });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
        stars: user.stars,
        level: user.level,
        streak: user.streak,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const user = await queryOne('SELECT * FROM users WHERE username = $1', [username]);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = generateToken({ id: user.id, username: user.username });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
        stars: user.stars,
        level: user.level,
        streak: user.streak,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { token: oldToken } = req.body;
    if (!oldToken) {
      return res.status(401).json({ error: '缺少令牌' });
    }

    const decoded = verifyToken(oldToken);
    const user = await queryOne('SELECT id, username, name, avatar, stars, level, streak FROM users WHERE id = $1', [decoded.id]);
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    const token = generateToken({ id: user.id, username: user.username });

    res.json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    res.status(401).json({ error: '令牌无效或已过期' });
  }
});

export default router;
