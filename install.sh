#! /bin/sh
cd servers && npm i \
    && cd ../dlt && npm i \
    && cd ../front-ends && ./install.sh