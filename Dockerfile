# Stage 1: Build Web Dashboard SPA
FROM node:24-alpine AS web-builder
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml package.json ./
COPY web/package.json ./web/
COPY web/ ./web/
RUN pnpm --filter web-dashboard install && pnpm --filter web-dashboard run build

# Stage 2: Build Backend Server
FROM node:24-alpine AS server-builder
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml package.json ./
COPY prisma ./prisma/
RUN pnpm install
COPY tsconfig.json ./
COPY src ./src/
RUN pnpm prisma:generate && pnpm build

# Stage 3: Production Runner
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Asia/Jakarta

RUN apk add --no-cache tzdata
RUN npm install -g pnpm

COPY pnpm-workspace.yaml package.json ./
COPY prisma ./prisma/
RUN pnpm install --prod && pnpm prisma:generate

# Copy build outputs
COPY --from=server-builder /app/dist ./dist/
COPY --from=web-builder /app/web/dist ./web/dist/
COPY MASTER\ BLOK\ GANJIL\ 2026-2027\ KELAS\ XI-2.xlsx ./

RUN mkdir -p /app/data/auth

EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma db push && node dist/index.js"]
