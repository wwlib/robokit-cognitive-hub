FROM node:16-alpine AS builder

ARG BUILD_DIR="/usr/app"
ARG CONTAINER_USER="node"
ARG CONTAINER_EXPOSE_PORT="8082"

WORKDIR $BUILD_DIR
RUN chown -R $CONTAINER_USER:$CONTAINER_USER $BUILD_DIR
USER $CONTAINER_USER

COPY --chown=${CONTAINER_USER} . .

# RUN npm install
RUN npm run build

# keep going without src
FROM node:16-alpine

WORKDIR /usr/app
COPY --from=builder /usr/app/dist/ /usr/app/dist/
COPY --from=builder /usr/app/node_modules/ /usr/app/node_modules/
COPY --from=builder /usr/app/public/ /usr/app/public/
COPY --from=builder /usr/app/hub-controller-app/ /usr/app/hub-controller-app/

ENTRYPOINT ["node", "dist/index.js"]
# ENTRYPOINT ["bash"]
