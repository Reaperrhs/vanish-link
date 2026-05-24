FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY backend/ ./backend/
EXPOSE 3000
CMD ["node", "backend/index.js"]
