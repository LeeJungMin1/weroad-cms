/**
 * project-inquiry controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::project-inquiry.project-inquiry",
  ({ strapi }) => ({
    async submit(ctx) {
      const { files, body } = ctx.request as any;

      // 0. base URL 가져오기
      const serverUrl =
        (strapi.config.get("server.url") as string) || "http://localhost:1337";

      const toAbsoluteUrl = (url: string) => {
        if (!url) return "";
        if (url.startsWith("http://") || url.startsWith("https://")) {
          return url; // 이미 절대경로면 그대로
        }
        const base = serverUrl.replace(/\/$/, "");
        const path = url.startsWith("/") ? url : `/${url}`;
        return `${base}${path}`;
      };

      // 1) 파일 업로드
      let fileIds: number[] = [];
      const PROJECT_INQUIRY_FOLDER_ID = 3; // Project Inquiries 폴더 ID

      if (files?.attachment) {
        const uploaded = await strapi
          .plugin("upload")
          .service("upload")
          .upload({
            data: {
              fileInfo: {
                folder: PROJECT_INQUIRY_FOLDER_ID,
              },
            },
            files: files.attachment,
          });

        const arr = Array.isArray(uploaded) ? uploaded : [uploaded];
        fileIds = arr
          .map((f: any) => (typeof f?.id === "number" ? f.id : null))
          .filter((id: number | null) => id != null) as number[];
      }

      // 2) 개인정보 동의 값 정리 (문자/불리언 둘 다 대응)
      const agreePrivacy =
        body.agree_privacy === true ||
        body.agree_privacy === "true" ||
        body.agree_privacy === "on";

      // 3) Project Inquiry 엔트리 생성 (+ 첨부파일 관계 연결)
      const entry = await strapi.entityService.create(
        "api::project-inquiry.project-inquiry",
        {
          data: {
            inquiry_type: body.inquiry_type,
            name: body.name,
            company: body.company,
            phone: body.phone,
            email: body.email,
            position: body.position,
            project_url: body.project_url,
            description: body.description,
            agree_privacy: agreePrivacy,
            attachment: fileIds, // ← 미디어 필드에 파일 id 연결
          },
        }
      );

      // 4) 첨부파일 정보 조회
      let attachments: any[] = [];
      if (fileIds.length > 0) {
        attachments = await strapi.entityService.findMany(
          "plugin::upload.file",
          {
            filters: { id: { $in: fileIds } },
          }
        );
      }

      const attachmentLinks = attachments
        .map((file) => {
          const url = toAbsoluteUrl(file.url);
          return `<li><a href="${url}" target="_blank" rel="noreferrer">${file.name}</a></li>`;
        })
        .join("");

      // 5) 메일 HTML 구성 (전에 lifecycles.ts에서 쓰던 템플릿 그대로)
      const data: any = entry;

      const html = `
        <h2>[위로드엑스 프로젝트 문의]</h2>
        <p><b>문의 유형:</b> ${data.inquiry_type}</p>
        <p><b>이름:</b> ${data.name}</p>
        <p><b>회사명:</b> ${data.company}</p>
        <p><b>전화번호:</b> ${data.phone}</p>
        <p><b>이메일:</b> ${data.email}</p>
        <p><b>직책:</b> ${data.position}</p>
        <p><b>URL:</b> ${data.project_url}</p>
        <p><b>프로젝트 설명:</b><br/>${data.description || ""}</p>
        <p><b>개인정보 동의:</b> ${data.agree_privacy ? "동의함" : "동의 안 함"}</p>
        ${
          attachmentLinks
            ? `<p><b>첨부파일:</b></p><ul>${attachmentLinks}</ul>`
            : "<p><b>첨부파일:</b> 없음</p>"
        }
      `;

      // 6) 메일 발송
      await strapi.plugin("email").service("email").send({
        to: "dlwjdals5600@gmail.com", // 수신 메일
        subject: "새 프로젝트 문의가 접수되었습니다",
        html,
      });

      // 7) 클라이언트 응답
      ctx.body = { data: entry };
    },
  })
);
