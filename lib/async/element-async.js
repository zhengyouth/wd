var _ = require('../utils/lodash'),
    util = require('util'),
    commands = require('../commands/element-commands'),
    helpers = require('../utils/helpers'),
    BaseElement = require('../core/element-base');

// configUrl: url object constructed via url.parse
var AsyncElement = function (value, browser) {
  BaseElement.call(this, value, browser);
};


//inherit from EventEmitter
util.inherits(AsyncElement, BaseElement);

function convertEl(obj, master) {
  if (obj instanceof BaseElement) {
    return new AsyncElement(obj.value, master);
  } else {
    return obj;
  }
}

AsyncElement.convertRes = function (res, master) {
  if (_.isArray(res)) {
    _(res).each(function (obj, i) {
      res[i] = convertEl(obj, master);
    });
    return res;
  } else {
    return convertEl(res, master);
  }
};

_(commands).each(function (fn, name) {
  AsyncElement.prototype[name] = function () {
    var _this = this;
    var vargs = helpers.varargs(arguments);
    fn.apply(this, vargs.all)
        .then(function (res) {
          return AsyncElement.convertRes(res, _this.browser);
        })
        .nodeify(vargs.callback);
  };
});

module.exports = AsyncElement;
