FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY apps/backend/package.json ./apps/backend/
RUN npm install --ignore-scripts
COPY apps/backend ./apps/backend/
COPY package.json .
RUN npm run build --workspace=@aura/backend

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
COPY --from=builder /app/apps/backend/dist/src ./dist
COPY --from=builder /app/apps/backend/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 4000
CMD ["node", "dist/main"]
