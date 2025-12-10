# 1) 빌드용 스테이지
FROM node:20-bullseye-slim AS builder

# 컨테이너 안 작업 폴더
WORKDIR /app

# (옵션) sharp 같은 네이티브 모듈 빌드가 필요할 때 대비해서 빌드 도구 설치
RUN apt-get update && apt-get install -y \
  build-essential \
  python3 \
  && rm -rf /var/lib/apt/lists/*

# package.json / package-lock.json만 먼저 복사해서 의존성 설치 캐시 활용
COPY package*.json ./

# devDependencies까지 모두 설치 (TS 컴파일, Strapi build에 필요)
RUN npm ci

# 나머지 소스 전체 복사
COPY . .

# Strapi v5 프로덕션 빌드 (admin, 서버 코드 컴파일)
RUN npm run build

# 2) 런타임 스테이지 (슬림한 최종 이미지)
FROM node:20-bullseye-slim

WORKDIR /app

ENV NODE_ENV=production
# 타임존 등 필요하면 여기에 ENV 추가 가능

# 빌더에서 만들어진 앱 전체 복사
COPY --from=builder /app . 

# devDependencies 제거 (런타임에 불필요)
RUN npm prune --omit=dev

# Strapi 기본 포트
EXPOSE 1337

# 컨테이너 실행 시 Strapi 서버 시작
CMD ["npm", "run", "start"]