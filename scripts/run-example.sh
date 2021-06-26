#!/bin/sh

npm run build && \
cp package.json build/ && \
rm -rf example/plugins/test-plugin && \
cp -R build/. example/plugins/test-plugin && \
cd example/ && \
npm run start
