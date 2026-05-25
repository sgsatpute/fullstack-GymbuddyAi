FROM node:20-slim AS build

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-venv build-essential \
  && python3 -m venv "${VIRTUAL_ENV}" \
  && pip install --upgrade pip setuptools wheel \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001
ENV PYTHONUNBUFFERED=1
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server/ml ./server/ml
COPY --from=build /app/requirements.txt ./requirements.txt
COPY --from=build /opt/venv /opt/venv

EXPOSE 5001

CMD ["npm", "start"]
