FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts && npm rebuild better-sqlite3
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm rebuild better-sqlite3
COPY server ./server
COPY --from=build /app/dist ./dist
ENV PORT=5311
ENV DATA_DIR=/data
VOLUME /data
EXPOSE 5311
CMD ["node", "server/index.js"]
