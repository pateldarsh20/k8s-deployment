FROM node:18-alpine

WORKDIR /app

COPY shared/ ./shared/

COPY services/notification-service/package*.json ./
RUN npm install --legacy-peer-deps
COPY services/notification-service/ ./

EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3005/health || exit 1

CMD ["npm", "start"]
