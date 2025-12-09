FROM node:18-alpine

WORKDIR /app

# Copiar solo paquetes para cache eficiente
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --omit=dev

# Copiar el resto del código
COPY . .

EXPOSE 5000

CMD ["npm", "start"]
