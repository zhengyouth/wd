//Element object
//Wrapper around browser methods
var _ = require('../utils/lodash'),
    Q = require('q'),
    helpers = require('../utils/helpers'),
    deprecator = helpers.deprecator,
    fs = require('fs'),
    responseHandlers = require('../core/response-handlers'),
    parseElement = responseHandlers.parseElement,
    parseElements = responseHandlers.parseElements,
    webdriverCommands = require('./webdriver-commands');

var commands = {};

/**
 * element.type(keys, cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/element/:id/value
 */
commands.type = function (keys) {
  return webdriverCommands.type.apply(this.browser, [this, keys]);
};

/**
 * element.keys(keys, cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/element/:id/value
 */
commands.keys = function (keys) {
  return webdriverCommands.keys.apply(this.browser, [keys]);
};

function _isLocalFile(path) {
  var deferred = Q.defer();
  fs.exists(path, function (exists) {
    if (exists) {
      var lstat = Q.denodeify(fs.lstat);
      deferred.resolve(
        lstat(path).then(function (stats) {
          return stats.isFile();
        })
      );
    } else { deferred.resolve(false); }
  });
  return deferred.promise;
}

/**
 * Equivalent to the python sendKeys binding. Upload file if
 * a local file is detected, otherwise behaves like type.
 * element.sendKeys(keys, cb) -> cb(err)
 */
commands.sendKeys = function (keys) {
  var _this = this;
  if (!(keys instanceof Array)) { keys = [keys]; }

  // ensure all keystrokes are strings to conform to JSONWP
  _.each(keys, function (key, idx) {
    if (typeof key !== 'string') {
      keys[idx] = key.toString();
    }
  });

  var path = keys.join('');
  return _isLocalFile(path).then(function (isLocalFile) {
    if (isLocalFile) {
      return webdriverCommands.uploadFile.apply(_this.browser, [path])
        .then(function (distantFilePath) {
          return webdriverCommands.type.apply(
            _this.browser,
            [_this, distantFilePath]);
        });
    } else {
      return webdriverCommands.type.apply(_this.browser, [_this, keys]);
    }
  });
};

/**
 * element.click(cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/element/:id/click
 */
commands.click = function () {
  return webdriverCommands.clickElement.apply(this.browser, [this]);
};

/**
 * element.tap(cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/touch/click
 */
commands.tap = function () {
  return webdriverCommands.tapElement.apply(this.browser, [this]);
};

/**
 * element.doubleClick(cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/doubleclick
 */
commands.doubleclick = function () {
  var _this = this;
  return webdriverCommands.moveTo.apply(this.browser, [this])
    .then(function () {
      return webdriverCommands.doubleclick.apply(_this.browser);
    });
};

commands.doubleClick = commands.doubleclick;

/**
 * element.moveTo(xoffset, yoffset, cb) -> cb(err)
 * xoffset and y offset are optional.
 *
 * @jsonWire POST /session/:sessionId/moveto
 */
commands.moveTo = function () {
  var fargs = helpers.varargs(arguments),
      xoffset = fargs.all[0],
      yoffset = fargs.all[1];
  return webdriverCommands.moveTo.apply(
    this.browser,
    [this, xoffset, yoffset]);
};

/**
 * element.flick(xoffset, yoffset, speed, cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/touch/flick
 */
commands.flick = function (xoffset, yoffset, speed) {
  return webdriverCommands.flick.apply(
    this.browser,
    [this.value, xoffset, yoffset, speed]);
};


/**
 * element.text(cb) -> cb(err, text)
 *
 * @jsonWire GET /session/:sessionId/element/:id/text
 * @docOrder 2
 */
commands.text = function () {
  return webdriverCommands.text.apply(this.browser, [this]);
};

/**
 * element.textPresent(searchText, cb) -> cb(err, boolean)
 *
 * @jsonWire GET /session/:sessionId/element/:id/text
 * @docOrder 4
 */
commands.textPresent = function (searchText) {
  return webdriverCommands.textPresent.apply(this.browser, [searchText, this]);
};

/**
 * element.getAttribute(attrName, cb) -> cb(err, value)
 *
 * @jsonWire GET /session/:sessionId/element/:id/attribute/:name
 * @docOrder 2
 */
commands.getAttribute = function (name) {
  return webdriverCommands.getAttribute.apply(this.browser, [this, name]);
};

/**
 * element.getTagName(cb) -> cb(err, name)
 *
 * @jsonWire GET /session/:sessionId/element/:id/name
 */
commands.getTagName = function () {
  return webdriverCommands.getTagName.apply(this.browser, [this]);
};

/**
 * element.isDisplayed(cb) -> cb(err, displayed)
 *
 * @jsonWire GET /session/:sessionId/element/:id/displayed
 */
commands.isDisplayed = function () {
  return webdriverCommands.isDisplayed.apply(this.browser, [this]);
};

commands.displayed = commands.isDisplayed;

/**
 * element.isSelected(cb) -> cb(err, selected)
 *
 * @jsonWire GET /session/:sessionId/element/:id/selected
 */
commands.isSelected = function () {
  return webdriverCommands.isSelected.apply(this.browser, [this]);
};

commands.selected = commands.isSelected;

/**
  * element.isEnabled(cb) -> cb(err, enabled)
  *
  * @jsonWire GET /session/:sessionId/element/:id/enabled
  */
commands.isEnabled = function () {
  return webdriverCommands.isEnabled.apply(this.browser, [this]);
};

commands.enabled = commands.isEnabled;

/**
 * isVisible(cb) -> cb(err, boolean)
 */
commands.isVisible = function () {
  deprecator.warn(
    'element.isVisible',
    'element.isVisible has been deprecated, use element.isDisplayed instead.');
  return webdriverCommands.isVisible.apply(this.browser, [this]);
};

/**
 * element.getLocation(cb) -> cb(err, location)
 *
 * @jsonWire GET /session/:sessionId/element/:id/location
 */
commands.getLocation = function () {
  return webdriverCommands.getLocation.apply(this.browser, [this]);
};

/**
 * element.getLocationInView(cb) -> cb(err, location)
 *
 * @jsonWire GET /session/:sessionId/element/:id/location
 */
commands.getLocationInView = function () {
  return webdriverCommands.getLocationInView.apply(this.browser, [this]);
};

/**
 * element.getSize(cb) -> cb(err, size)
 *
 * @jsonWire GET /session/:sessionId/element/:id/size
 */
commands.getSize = function () {
  return webdriverCommands.getSize.apply(this.browser, [this]);
};

/**
 * element.getValue(cb) -> cb(err, value)
 *
 * @jsonWire GET /session/:sessionId/element/:id/attribute/:name
 * @docOrder 4
 */
commands.getValue = function () {
  return webdriverCommands.getValue.apply(this.browser, [this]);
};

/**
 * element.getComputedCss(cssProperty , cb) -> cb(err, value)
 *
 * @jsonWire GET /session/:sessionId/element/:id/css/:propertyName
 */
commands.getComputedCss = function (styleName) {
  return webdriverCommands.getComputedCss.apply(
    this.browser, [this, styleName]);
};

commands.getComputedCSS = commands.getComputedCss;

/**
 * element.clear(cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/element/:id/clear
 */
commands.clear = function () {
  return webdriverCommands.clear.apply(this.browser, [this]);
};

/**
 * element.submit(cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/element/:id/submit
 */
commands.submit = function () {
  return webdriverCommands.submit.apply(this.browser, [this]);
};

/**
 * element.getComputedCss(cssProperty , cb) -> cb(err, value)
 *
 * @jsonWire GET /session/:sessionId/element/:id/css/:propertyName
 */
commands.getComputedCss = function (styleName) {
  return webdriverCommands.getComputedCss.apply(
    this.browser,
    [this, styleName]);
};

_.each(helpers.elementFuncTypes, function (type) {
  /**
   * element.elementByClassName(value, cb) -> cb(err, element)
   * element.elementByCssSelector(value, cb) -> cb(err, element)
   * element.elementById(value, cb) -> cb(err, element)
   * element.elementByName(value, cb) -> cb(err, element)
   * element.elementByLinkText(value, cb) -> cb(err, element)
   * element.elementByPartialLinkText(value, cb) -> cb(err, element)
   * element.elementByTagName(value, cb) -> cb(err, element)
   * element.elementByXPath(value, cb) -> cb(err, element)
   * element.elementByCss(value, cb) -> cb(err, element)
   *
   * @jsonWire POST /session/:sessionId/element/:id/element
   * @docOrder 2
   */
  commands['element' + helpers.elFuncSuffix(type)] = function (value) {
    return commands.element.apply(this, [helpers.elFuncFullType(type), value]);
  };

  /**
   * element.elementsByClassName(value, cb) -> cb(err, elements)
   * element.elementsByCssSelector(value, cb) -> cb(err, elements)
   * element.elementsById(value, cb) -> cb(err, elements)
   * element.elementsByName(value, cb) -> cb(err, elements)
   * element.elementsByLinkText(value, cb) -> cb(err, elements)
   * element.elementsByPartialLinkText(value, cb) -> cb(err, elements)
   * element.elementsByTagName(value, cb) -> cb(err, elements)
   * element.elementsByXPath(value, cb) -> cb(err, elements)
   * element.elementsByCss(value, cb) -> cb(err, elements)
   *
   * @jsonWire POST /session/:sessionId/element/:id/elements
   * @docOrder 2
   */
  commands['elements' + helpers.elFuncSuffix(type)] = function (value) {
    return commands.elements.apply(this, [helpers.elFuncFullType(type), value]);
  };
});

/**
 * element.element(using, value, cb) -> cb(err, element)
 *
 * @jsonWire POST /session/:sessionId/element/:id/element
 * @docOrder 1
 */
commands.element = function (using, value) {
  var _this = this;
  return this.browser._jsonWireCall({
    method: 'POST',
    relPath: '/element/' + _this.value + '/element',
    data: {using: using, value: value}
  }).then(parseElement(this.browser));
};

/**
 * element.elements(using, value, cb) -> cb(err, elements)
 *
 * @jsonWire POST /session/:sessionId/element/:id/elements
 * @docOrder 1
 */
commands.elements = function (using, value) {
  var _this = this;
  return this.browser._jsonWireCall({
    method: 'POST',
    relPath: '/element/' + _this.value + '/elements',
    data: {using: using, value: value}
  }).then(parseElements(this.browser));
};

/**
 * element.equals(other, cb) -> cb(err, value)
 *
 * @jsonWire GET /session/:sessionId/element/:id/equals/:other
 * @docOrder 1
 */
commands.equals = function (other) {
  return webdriverCommands.equalsElement.apply(this.browser, [this, other]);
};

/**
 * element.sleep(ms, cb) -> cb(err)
 */
commands.sleep = function (ms) {
  return Q.delay(ms);
};

/**
 * element.noop(cb) -> cb(err)
 */
commands.noop = function () {
  return new Q();
};

/**
 * element.chain(cb) -> cb(err)
 */
commands.chain = function () {
  return new Q();
};

/**
 * element.resolve(promise)
 */
commands.resolve = function (promise) {
  var qPromise = new Q(promise);
  return qPromise;
};

module.exports = commands;
