FROM node:18-alpine

WORKDIR /app

COPY shared/ ./shared/

COPY services/tracking-service/package*.json ./
RUN npm install
COPY services/tracking-service/ ./

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3003/health || exit 1

CMD ["npm", "start"]
