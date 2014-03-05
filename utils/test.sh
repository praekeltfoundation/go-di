#!/bin/bash -e
jshint `find lib/ test/ -name "*.js"`
mocha --require "test/setup.js" `find "$@" -name "*.js"`
