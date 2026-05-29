-- 邮箱验证码表（用于注册验证）
CREATE TABLE IF NOT EXISTS email_verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  purpose VARCHAR(50) NOT NULL DEFAULT 'register',
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 清理过期验证码的索引
CREATE INDEX IF NOT EXISTS idx_email_verification_email ON email_verification_codes(email, purpose);
CREATE INDEX IF NOT EXISTS idx_email_verification_expires ON email_verification_codes(expires_at);
