var _ = require("./lodash")
  , util = require( 'util' )
  , elementCommands = require('./element-commands')
  , utils = require("./utils");
  
var BaseElement = require('./element-base');

// configUrl: url object constructed via url.parse
var AsyncElement = function(value, browser) {
  BaseElement.call(this, value, browser);
};


//inherit from EventEmitter
util.inherits(AsyncElement, BaseElement );

function convertEl(obj, master) {
  if(obj instanceof BaseElement) { 
    return new AsyncElement(obj.value, master); 
  } else {
    return obj;
  }
}

AsyncElement.convertRes = function(res, master) {
  if(_.isArray(res)) {
    _(res).each(function(obj, i) {
      res[i] = convertEl(obj, master);
    });
    return res;
  } else {
    return convertEl(res, master);
  }  
};

_(elementCommands).each(function(fn, name) {
  AsyncElement.prototype[name] = function() {
    var _this = this;
    var fargs = utils.varargs(arguments);
    fn.apply(this, fargs.all)
        .then(function(res) {
          return AsyncElement.convertRes(res, _this.browser);
        })
        .nodeify(fargs.callback);
  };
});

module.exports = AsyncElement;
