FROM node:18-alpine

WORKDIR /app

COPY services/api-gateway/package*.json ./
RUN npm install
COPY services/api-gateway/ ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["npm", "start"]
