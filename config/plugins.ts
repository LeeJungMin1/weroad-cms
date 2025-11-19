export default ({ env }) => ({
  // Email plugin 설정
  email: {
    config: {
      provider: "nodemailer",
      providerOptions: {
        host: env("SMTP_HOST", "smtp.gmail.com"),
        port: env.int("SMTP_PORT", 587),
        secure: false, // 465면 true, 587은 false
        auth: {
          user: env("SMTP_USER"),
          pass: env("SMTP_PASS"),
        },
      },
      settings: {
        defaultFrom: env("SMTP_DEFAULT_FROM"),
        defaultReplyTo: env("SMTP_DEFAULT_REPLY_TO"),
      },
    },
  },

  // Upload 플러그인은 기본값(로컬 디스크)으로 두고 나중에 S3 쓰고 싶으면 여기 확장
});
