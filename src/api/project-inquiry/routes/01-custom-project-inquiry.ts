export default {
  routes: [
    {
      method: "POST",
      path: "/project-inquiries/submit",
      handler: "api::project-inquiry.project-inquiry.submit",
      config: {
        auth: false, // 공개 엔드포인트면 false, 아니면 빼고 RP에서 권한 켜기
        policies: [],
        middlewares: [],
      },
    },
  ],
};
