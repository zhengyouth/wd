//Element object
//Wrapper around browser methods
var _ = require("../utils/lodash")
  , util = require( 'util' )
  , Q = require('q')
  , helpers = require("../utils/helpers.js")
  , niceArgs = helpers.niceArgs
  , commands = require('../commands/element-commands')
  , enrich = require('./enrich')
  , BaseElement = require('./element-base');

// configUrl: url object constructed via url.parse
var Element = module.exports = function(value, browser, chained) {
  BaseElement.call(this, value, browser);
  this._chained = chained || true;
};

//inherit from EventEmitter
util.inherits(Element, BaseElement );

function convertEl(obj, browser) {
  if(obj instanceof BaseElement) { 
    return new Element(obj.value, browser); 
  } else {
    return obj;
  }
}

Element.convertRes = function(res, browser) {
  if(_.isArray(res)) {
    _(res).each(function(obj, i) {
      res[i] = convertEl(obj, browser);
    });
    return res;
  } else {
    return convertEl(res, browser);
  }  
};

_(commands).each(function(fn, name) {
  Element.prototype[name] = function() {
    var _this = this;
    var fargs = helpers.varargs(arguments);
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

module.exports = Element;
