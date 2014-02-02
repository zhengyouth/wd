var helpers = require('../utils/helpers');

var BaseElement = function (value, browser) {
  this.value = value;
  this.browser = browser;

  if (!value) {
    throw new Error('no value passed to Element constructor');
  }

  if (!browser) {
    throw new Error('no browser passed to Element constructor');
  }
};

BaseElement.prototype.emit = function () {
  this.browser.emit.apply(this.browser, helpers.varargs(arguments).array);
};

BaseElement.prototype.toString = function () {
  return String(this.value);
};

BaseElement.prototype.toJSON = function () {
  return { ELEMENT: this.value };
};

module.exports = BaseElement;
