FROM recksato/robosats:${ROBOSATS_TAG:-v0.8.4-alpha@sha256:e47f1225260d2508d4501af237714574dd467da4f735b6dce19d88bab41e744f} AS robosats

FROM nginx:${NGINX_TAG:-1.25.2-alpine-slim@sha256:1b0cb433e90260a96528c987ee78b797e842d510473935304a0931536d10f50d} AS nginx

COPY --from=robosats /usr/src/static /usr/src/static