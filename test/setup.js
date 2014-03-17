var path = require('path');

global.di = {};
require('mocha-as-promised')();

var paths = require('../paths');
paths.src.app.forEach(function(p) {
    require(path.join('..', p));
});
