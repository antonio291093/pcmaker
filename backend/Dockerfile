FROM node:18-alpine

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN chown -R app:app /app
USER app

EXPOSE 5000

CMD ["npm", "start"]
