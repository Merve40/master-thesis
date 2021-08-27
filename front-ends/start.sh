#! /bin/sh
(cd charterer && npm start) & (cd shipowner && npm start) & (cd customer && npm start) & (cd logger && npm start)
