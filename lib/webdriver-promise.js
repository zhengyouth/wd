var _ = require("./lodash"),
    httpUtils = require('./http-utils'),
    Q = require( 'q' ),
    util = require( 'util' ),
    url = require( 'url' ),
    config = require( './config' ),
    utils = require("./utils"),
    niceArgs = utils.niceArgs,
    strip = utils.strip,
    PromiseElement = require('./element-promise'),
    commands = require('./commands'),
    enrich = require('./enrich'),
    AsyncWebdriver = require('./webdriver-async');

var BaseWebdriver = require('./webdriver-base');

// configUrl: url object constructed via url.parse
var PromiseWebdriver = module.exports = function(configUrl, chained) {  
  BaseWebdriver.call( this, configUrl);

  this.sessionID = null;
  this.configUrl = configUrl;

  // config url without auth
  this.noAuthConfigUrl = url.parse(url.format(this.configUrl));
  delete this.noAuthConfigUrl.auth;

  this.defaultCapabilities = {
    browserName: 'firefox'
     , version: ''
    , javascriptEnabled: true
    , platform: 'ANY'
  };
  // saucelabs default
  if (this.configUrl.auth) {
    this.defaultCapabilities.platform = 'VISTA';
  }

  this._httpConfig = _.clone(config.httpConfig);

  this._chained = chained || true;
  this._asyncFacade = new AsyncWebdriver(this);
};

//inherit from EventEmitter
util.inherits( PromiseWebdriver, BaseWebdriver );

PromiseWebdriver.wrapAsyncCommand = function(name, fn) {
  AsyncWebdriver.prototype[name] = fn;
  return function() {
    var _this = this; 
    var deferred = Q.defer();
    var fargs = utils.varargs(arguments);
    this._asyncFacade[name].apply(this._asyncFacade,fargs.all.concat(deferred.makeNodeResolver()));
    return deferred.promise.then(function(res) {
      return PromiseElement.convertRes(res, _this);
    });
  };
};

PromiseWebdriver.addCommand = function(name, fn) {
  PromiseWebdriver.prototype[name] = function() {
    var _this = this;
    var fargs = utils.varargs(arguments);
    this.emit('command', "CALL" , name, niceArgs(fargs.all));
    var fnRes = fn.apply(this, fargs.all);
    var promise;
    if(!Q.isPromise(fnRes)) {
      fnRes = new Q(fnRes);
    } 
    promise = fnRes.then(
      function(res) {
        _this.emit('command', "RESPONSE" , name + niceArgs(fargs.all), 
          niceArgs(res));
        return res;
      }, function(err) {
        err.message = '[' + name + niceArgs(fargs.all) + "] " + err.message;
        throw err;
      }
    );
    enrich.call(_this, promise);
    return promise;
  };  
};

PromiseWebdriver.prototype._init = function() {
  delete this.sessionID;
  var _this = this,
      fargs = utils.varargs(arguments),
      desired = fargs.all[0] || {};

  // copy containing defaults
  var _desired = _.clone(desired);
  _.defaults(_desired, this.defaultCapabilities);

  // http options
  var httpOpts = httpUtils.newHttpOpts('POST', _this._httpConfig);

  var url = httpUtils.buildInitUrl(this.configUrl);

  // building request
  var data = JSON.stringify({desiredCapabilities: _desired});

  httpOpts.prepareToSend(url, data);

  return httpUtils
    .requestWithRetry(httpOpts, this._httpConfig, this.emit)
    .then(function(r) {
      var res = r[0],
          data = r[1];
      var resData;
      // retrieving session
      try{
        var jsonData = JSON.parse(data);
        if( jsonData.status === 0 ){
          _this.sessionID = jsonData.sessionId;
          resData = jsonData.value;
        }
      } catch(ignore){}
      if(!_this.sessionID){
        // attempting to retrieve the session the old way
        try{
          var locationArr = res.headers.location.replace(/\/$/, '').split('/');
          _this.sessionID = locationArr[locationArr.length - 1];
        } catch(ignore){}
      }

      if (_this.sessionID) {
        _this.emit('status', '\nDriving the web on session: ' + _this.sessionID + '\n');
        return [_this.sessionID, resData];
      } else {
        data = strip(data);
        var err = new Error('The environment you requested was unavailable.');
        err.data = data;
        throw err;
        // when no cb
        // console.error('\x1b[31mError\x1b[0m: The environment you requested was unavailable.\n');
        // console.error('\x1b[33mReason\x1b[0m:\n');
        // console.error(data);
        // console.error('\nFor the available values please consult the WebDriver JSONWireProtocol,');
        // console.error('located at: \x1b[33mhttp://code.google.com/p/selenium/wiki/JsonWireProtocol#/session\x1b[0m');
      }
    });
};

// standard jsonwire call
PromiseWebdriver.prototype._jsonWireCall = function(opts) {  
  var _this = this;

  // http options init
  var httpOpts = httpUtils.newHttpOpts(opts.method, this._httpConfig);

  var url = httpUtils.buildJsonCallUrl(this.noAuthConfigUrl, this.sessionID,
    opts.relPath, opts.absPath);

  // logging
  _this.emit('command', httpOpts.method,
    url.path.replace(this.sessionID, ':sessionID')
      .replace(this.configUrl.pathname, ''), opts.data
  );

  // writting data
  var data = opts.data || {};
  if (typeof data === 'object') {
    data = JSON.stringify(data);
  }
  httpOpts.prepareToSend(url, data);
  // building request
  return httpUtils
    .requestWithRetry(httpOpts, this._httpConfig, this.emit)
    .then(function(r) {

      var data = r[1];
      if (opts.emit) {
        _this.emit(opts.emit.event, opts.emit.message);
      }
      data = strip(data);
      return data || "";
    });
};

PromiseWebdriver.prototype._sauceJobUpdate = function(jsonData) {
  var _this = this;
  if(!this.configUrl || !this.configUrl.auth){
    throw new Error("Missing auth token.");
  } else if(!this.configUrl.auth.match(/^.+:.+$/)){
    throw new Error("Invalid auth token.");
  }
  var httpOpts = {
    url: 'http://' + this.configUrl.auth + '@saucelabs.com/rest/v1/' +
      this.configUrl.auth.replace(/:.*$/,'') + '/jobs/' + this.sessionID,
    method: 'PUT',
    headers: {
      'Content-Type': 'text/json'
    },
    body: JSON.stringify(jsonData),
    jar: false // disable cookies: avoids CSRF issues
  };
  return httpUtils.requestWithoutRetry(httpOpts, this.emit).then(function() {
      _this.emit('command', 'POST' , '/rest/v1/:user/jobs/:sessionID', 
        jsonData);
  });
};
// creates a new element
PromiseWebdriver.prototype.newElement = function(jsonWireElement) {
  return new PromiseElement(jsonWireElement, this, this._chained);
};

_(commands).each(function(fn, name) {
  PromiseWebdriver.addCommand(name, fn);
});
