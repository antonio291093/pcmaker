# Etapa de build
FROM node:18-alpine AS builder

WORKDIR /app

# Copia de archivos necesarios
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.ts ./
COPY postcss.config.mjs ./
COPY .env ./

RUN npm install

# Copia del resto del código
COPY . .

# Build de producción
RUN npm run build

# Etapa final
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
