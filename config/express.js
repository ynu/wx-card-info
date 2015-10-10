var path = require('path'),
    rootPath = path.normalize(__dirname + '/..');

var express = require('express');
var glob = require('glob');

var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var compress = require('compression');
var methodOverride = require('method-override');
var session = require('express-session');


module.exports = function(app, config) {

  app.use(logger('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(cookieParser());
  app.use(compress());
  app.use(methodOverride());

  app.use(session({
    secret: 'nagu.cc sessionkey',
    resave: true,
    saveUninitialized: true
  }));
  var controllers = glob.sync(rootPath + '/app/controllers/*.js');
  controllers.forEach(function (controller) {
    require(controller)(app, config);
  });
};