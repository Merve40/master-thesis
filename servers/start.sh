#! /bin/sh
node ./demo/idm.js \
    & node ./demo/charterer/broker.js \
    & node ./demo/charterer/oracle.js \
    & node ./demo/shipowner/broker.js \
    & node ./demo/shipowner/oracle.js \
    & node ./demo/customer/client.js