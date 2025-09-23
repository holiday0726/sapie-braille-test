# 종속성 설치 단계
FROM node:18-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* yarn.lock* ./
RUN npm ci

# 빌드 단계
FROM node:18-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
# ✅ front의 '내용'을 /app 루트로 복사 (중요!)
COPY . ./

# (필요하면) 환경파일도 넣기
# COPY front/.env.production ./.env.production
# 또는
# COPY .env.saltware .env.production

RUN npm run build

# 프로덕션 단계
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 보안 사용자
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# 산출물 복사 (+ 권한)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]