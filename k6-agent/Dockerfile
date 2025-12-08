FROM grafana/k6:1.4.0 as k6-stage
FROM node:24-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
COPY --from=k6-stage /usr/bin/k6 /usr/bin/k6
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
