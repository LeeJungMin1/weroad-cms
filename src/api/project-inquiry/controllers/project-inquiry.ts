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

      const ALLOWED_TYPES = [
        "project",
        "tech",
        "product",
        "service",
        "partnership",
        "etc",
      ];

      let inquiryTypes: string[] = [];

      if (Array.isArray(body.inquiry_type)) {
        inquiryTypes = body.inquiry_type;
      } else if (typeof body.inquiry_type === "string") {
        try {
          const parsed = JSON.parse(body.inquiry_type);
          if (Array.isArray(parsed)) {
            inquiryTypes = parsed;
          } else if (typeof parsed === "string") {
            inquiryTypes = [parsed];
          }
        } catch {
          // 그냥 단일 문자열인 경우
          if (body.inquiry_type.trim() !== "") {
            inquiryTypes = [body.inquiry_type.trim()];
          }
        }
      }

      inquiryTypes = inquiryTypes.filter((t) => ALLOWED_TYPES.includes(t));

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

      // 3) 엔트리 생성용 데이터 구성
      const dataToCreate: any = {
        inquiry_type: inquiryTypes,
        name: body.name,
        company: body.company,
        phone: body.phone,
        email: body.email,
        position: body.position,
        agree_privacy: agreePrivacy,
      };

      // 선택값: 비어 있지 않을 때만 넣기
      if (body.project_url && String(body.project_url).trim() !== "") {
        dataToCreate.project_url = body.project_url;
      }
      if (body.description && String(body.description).trim() !== "") {
        dataToCreate.description = body.description;
      }
      if (fileIds.length > 0) {
        dataToCreate.attachment = fileIds;
      }

      // 3) Project Inquiry 엔트리 생성 (+ 첨부파일 관계 연결)
      const entry = await strapi.entityService.create(
        "api::project-inquiry.project-inquiry",
        {
          data: dataToCreate,
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

      // 라벨 매핑
      const TYPE_LABELS: Record<string, string> = {
        project: "프로젝트 문의",
        tech: "기술 문의",
        product: "제품 문의",
        service: "서비스 문의",
        partnership: "제휴 문의",
        etc: "기타 문의",
      };

      // 5) 메일 HTML 구성 (전에 lifecycles.ts에서 쓰던 템플릿 그대로)
      const data: any = entry;

      const inquiryTypeText =
        Array.isArray(data.inquiry_type) && data.inquiry_type.length > 0
          ? data.inquiry_type.map((t: string) => TYPE_LABELS[t] || t).join(", ")
          : "미선택";

      const html = `
        <h2>[위로드엑스 프로젝트 문의]</h2>
        <p><b>문의 유형:</b> ${inquiryTypeText}</p>
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
