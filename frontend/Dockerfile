##############################
# 1) Build
##############################
FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependencias primero
COPY package*.json ./
RUN npm ci

# Copiar el resto del código
COPY . .

# Build para producción (Next.js standalone)
RUN npm run build

##############################
# 2) Imagen final
##############################
FROM node:18-alpine

WORKDIR /app

# Copiar la app standalone generada por Next
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
