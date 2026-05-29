import nodemailer from 'nodemailer';

// 邮件发送器，从环境变量读取配置
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.qq.com',
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: process.env.EMAIL_SECURE !== 'false',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
});

/**
 * 发送验证码邮件
 * @param {string} to - 收件人邮箱
 * @param {string} code - 验证码
 */
export async function sendVerificationEmail(to, code) {
  // 检查邮件配置是否已设置
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[邮件服务] 邮件配置未设置，跳过发送邮件');
    throw new Error('邮件服务未配置');
  }

  const mailOptions = {
    from: `"趣学堂" <${process.env.EMAIL_USER}>`,
    to,
    subject: '趣学堂 - 邮箱验证码',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 10px;">
        <h2 style="color: #2ED573; text-align: center;">🎓 趣学堂</h2>
        <p style="font-size: 16px; color: #333;">您好！</p>
        <p style="font-size: 14px; color: #666;">您的邮箱验证码是：</p>
        <div style="text-align: center; padding: 20px; background: #E8F8E8; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; color: #2ED573; letter-spacing: 8px;">${code}</span>
        </div>
        <p style="font-size: 12px; color: #999; text-align: center;">验证码 10 分钟内有效，请勿泄露给他人。</p>
        <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">如非本人操作，请忽略此邮件。</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
