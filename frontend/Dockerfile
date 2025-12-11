##############################
# 1) Build
##############################
FROM node:18-alpine AS builder

WORKDIR /app

# Declarar ARG para que docker-compose pueda pasarlo
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY package*.json ./
RUN npm ci

COPY . .

# Ahora Next sí recibe la variable en tiempo de build
RUN npm run build

##############################
# 2) Imagen final
##############################
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
