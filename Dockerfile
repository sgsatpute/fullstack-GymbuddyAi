FROM node:20-alpine AS build

WORKDIR /app

RUN apk add --no-cache python3 py3-pip build-base

COPY package*.json ./
COPY requirements.txt ./
RUN npm ci
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache python3 py3-pip

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server/ml ./server/ml
COPY --from=build /app/requirements.txt ./requirements.txt

EXPOSE 5001

CMD ["npm", "start"]
