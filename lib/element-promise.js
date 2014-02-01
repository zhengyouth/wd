//Element object
//Wrapper around browser methods
var _ = require("./lodash")
  , util = require( 'util' )
  , Q = require('q')
  , utils = require("./utils.js")
  , niceArgs = utils.niceArgs
  , elementCommands = require('./element-commands')
  , enrich = require('./enrich');   

var BaseElement = require('./element-base');

// configUrl: url object constructed via url.parse
var PromiseElement = module.exports = function(value, browser, chained) {
  BaseElement.call(this, value, browser);
  this._chained = chained || true;
};

//inherit from EventEmitter
util.inherits(PromiseElement, BaseElement );

function convertEl(obj, browser) {
  if(obj instanceof BaseElement) { 
    return new PromiseElement(obj.value, browser); 
  } else {
    return obj;
  }
}

PromiseElement.convertRes = function(res, browser) {
  if(_.isArray(res)) {
    _(res).each(function(obj, i) {
      res[i] = convertEl(obj, browser);
    });
    return res;
  } else {
    return convertEl(res, browser);
  }  
};

_(elementCommands).each(function(fn, name) {
  PromiseElement.prototype[name] = function() {
    var _this = this;
    var fargs = utils.varargs(arguments);
    this.emit('command', "CALL" , "element." + name, niceArgs(fargs.all));
    var fnRes = fn.apply(this, fargs.all);
    var promise;
    if(!Q.isPromiseAlike(fnRes)) {
      promise = new Q(fnRes);
    } else {
      promise = fnRes.then(
        function(res) {
          _this.emit('command', "RESPONSE" , "element." + name + niceArgs(fargs.all), 
            niceArgs(res));
          return res;
        }, function(err) {
          err.message = '[element.' + name + niceArgs(fargs.all) + "] " + err.message;
          throw err;
        }
      );
    }
    enrich.call(_this, promise);      
    return promise;
  };
});

module.exports = PromiseElement;
