var __slice = Array.prototype.slice;

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
  this.browser.emit.apply(this.browser, __slice.call(arguments, 0));
};

BaseElement.prototype.toString = function () {
  return String(this.value);
};

BaseElement.prototype.toJSON = function () {
  return { ELEMENT: this.value };
};

module.exports = BaseElement;
