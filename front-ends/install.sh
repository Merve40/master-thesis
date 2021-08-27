#! /bin/sh
cd charterer && npm i \
    && cd ../customer && npm i \
    && cd ../idm && npm i \
    && cd ../logger && yarn install \
    && cd ../shipowner && npm i 