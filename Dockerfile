FROM node:20-alpine AS build

WORKDIR /app

RUN apk add --no-cache python3 py3-pip make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY requirements.txt ./
RUN pip3 install --break-system-packages --no-cache-dir -r requirements.txt

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache python3 py3-pip

ENV NODE_ENV=production
ENV PORT=5001

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server/ml ./server/ml
COPY --from=build /app/requirements.txt ./requirements.txt

RUN pip3 install --break-system-packages --no-cache-dir -r requirements.txt

EXPOSE 5001

CMD ["npm", "start"]
