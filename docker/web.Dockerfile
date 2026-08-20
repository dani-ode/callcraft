FROM oven/bun:1-alpine as base

WORKDIR /app

COPY apps/web/package.json ./
RUN bun install

COPY apps/web/ ./
ENV NODE_ENV=production
RUN bun run build

EXPOSE 3000

ENV PORT=3000
CMD ["bun", "run", "start"]
