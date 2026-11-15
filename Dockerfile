# Stage 1: Build Web Dashboard SPA
FROM node:24-alpine AS web-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# Stage 2: Build Backend Server
FROM node:24-alpine AS server-builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY tsconfig.json ./
COPY src ./src/
RUN npm run prisma:generate && npm run build

# Stage 3: Production Runner
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Asia/Jakarta

# Install tzdata for accurate Asia/Jakarta timezone
RUN apk add --no-cache tzdata

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev && npm run prisma:generate

# Copy build outputs
COPY --from=server-builder /app/dist ./dist/
COPY --from=web-builder /app/web/dist ./web/dist/
COPY MASTER\ BLOK\ GANJIL\ 2026-2027\ KELAS\ XI-2.xlsx ./

# Ensure data directory exists for SQLite and WhatsApp auth
RUN mkdir -p /app/data/auth

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
