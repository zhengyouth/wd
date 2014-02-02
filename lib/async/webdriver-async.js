var _ = require("../utils/lodash"),
    util = require( 'util' ),
    helpers = require("../utils/helpers"),    
    deprecator = helpers.deprecator,
    AsyncElement = require('./element-async'),
    commands = require('../commands/webdriver-commands'),
    BaseWebdriver = require('../core/webdriver-base');

// configUrl: url object constructed via url.parse
var AsyncWebdriver = function(master) {
//  BaseWebdriver.call( this, configUrl);
  _(Object.getOwnPropertyNames(master)).each(function(name) {
    Object.defineProperty(this, name, {
      get: function () { return master[name]; },
      set: function (val) { master[name] = val; }
    });
  }, this);
  this._master = master;
};

//inherit from EventEmitter
util.inherits( AsyncWebdriver, BaseWebdriver );

AsyncWebdriver.addAsyncCommand = function(name, fn) {
  AsyncWebdriver.prototype[name] = fn;
};

AsyncWebdriver.addCommand = function(name, fn) {
  AsyncWebdriver.prototype[name] = function() {
    var fargs = helpers.varargs(arguments);
    var _this = this;
    fn.apply(this._master, fargs.all)
      .then(function(res) {
        return AsyncElement.convertRes(res, _this._master);
      }).nodeify(fargs.callback);
  };
};

_(commands).each(function(fn, name) {
  AsyncWebdriver.addCommand(name, fn);
});

AsyncWebdriver.prototype.chain = function(obj){
  deprecator.warn('chain', 'chain api has been deprecated, use promise chain instead.');
  require("./deprecated-chain").patch(this);
  return this.chain(obj);
};

module.exports = AsyncWebdriver;

