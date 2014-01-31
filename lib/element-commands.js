//Element object
//Wrapper around browser methods
var _ = require("./lodash")
  , Q = require('q')
  , utils = require("./utils.js")
  , deprecator = utils.deprecator
  , fs = require("fs"),
    responseHandlers = require("./response-handlers"),
    parseElement = responseHandlers.parseElement,
    parseElements = responseHandlers.parseElements,    
    commands = require('./commands');   

var elementCommands = {};

/**
 * element.type(keys, cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/element/:id/value
 */
elementCommands.type = function (keys) {
  return commands.type.apply(this.browser, [this, keys]);
};

/**
 * element.keys(keys, cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/element/:id/value
 */
elementCommands.keys = function (keys) {
  return commands.keys.apply(this.browser, [keys]);
};

function _isLocalFile(path) {
  var deferred = Q.defer();
  fs.exists(path, function (exists) {
    if(exists) {
      var lstat = Q.denodeify(fs.lstat);
      deferred.resolve( 
        lstat(path).then(function(stats) {
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
elementCommands.sendKeys = function (keys) {
  var _this = this;
  if (!(keys instanceof Array)) {keys = [keys];}

  // ensure all keystrokes are strings to conform to JSONWP
  _.each(keys, function(key, idx) {
    if (typeof key !== "string") {
      keys[idx] = key.toString();
    }
  });

  var path = keys.join('');
  return _isLocalFile(path).then(function (isLocalFile) {
    if(isLocalFile) {
      return commands.uploadFile.apply(_this.browser, [path])
        .then(function (distantFilePath) {
          return commands.type.apply(_this.browser, [_this, distantFilePath]);
        });
    } else {
      return commands.type.apply(_this.browser, [_this, keys]);
    }
  });
};

/**
 * element.click(cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/element/:id/click
 */
elementCommands.click = function () {
  return commands.clickElement.apply(this.browser, [this]);
};

/**
 * element.tap(cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/touch/click
 */
elementCommands.tap = function () {
  return commands.tapElement.apply(this.browser, [this]);
};

/**
 * element.doubleClick(cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/doubleclick
 */
elementCommands.doubleclick = function() {
  var _this = this;
  return commands.moveTo.apply(this.browser, [this])
    .then(function() {
      return commands.doubleclick.apply(_this.browser);
    });
};

elementCommands.doubleClick = elementCommands.doubleclick;

/**
 * element.moveTo(xoffset, yoffset, cb) -> cb(err)
 * xoffset and y offset are optional.
 *
 * @jsonWire POST /session/:sessionId/moveto
 */
elementCommands.moveTo = function() {
  var fargs = utils.varargs(arguments),
      xoffset = fargs.all[0],
      yoffset = fargs.all[1];
  return commands.moveTo.apply(this.browser, [this,xoffset, yoffset]);
};

/**
 * element.flick(xoffset, yoffset, speed, cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/touch/flick
 */
elementCommands.flick = function (xoffset, yoffset, speed) {
  return commands.flick.apply(this.browser, [this.value, xoffset, yoffset, speed]);
};


/**
 * element.text(cb) -> cb(err, text)
 *
 * @jsonWire GET /session/:sessionId/element/:id/text
 * @docOrder 2
 */
elementCommands.text = function () {
  return commands.text.apply(this.browser, [this]);
};

/**
 * element.textPresent(searchText, cb) -> cb(err, boolean)
 *
 * @jsonWire GET /session/:sessionId/element/:id/text
 * @docOrder 4
 */
elementCommands.textPresent = function(searchText) {
  return commands.textPresent.apply(this.browser, [searchText, this]);
};

/**
 * element.getAttribute(attrName, cb) -> cb(err, value)
 *
 * @jsonWire GET /session/:sessionId/element/:id/attribute/:name
 * @docOrder 2
 */
elementCommands.getAttribute = function(name) {
  return commands.getAttribute.apply(this.browser, [this, name]);
};

/**
 * element.getTagName(cb) -> cb(err, name)
 *
 * @jsonWire GET /session/:sessionId/element/:id/name
 */
elementCommands.getTagName = function() {
  return commands.getTagName.apply(this.browser, [this]);
};

/**
 * element.isDisplayed(cb) -> cb(err, displayed)
 *
 * @jsonWire GET /session/:sessionId/element/:id/displayed
 */
elementCommands.isDisplayed = function() {
  return commands.isDisplayed.apply(this.browser, [this]);
};

elementCommands.displayed = elementCommands.isDisplayed;

/**
 * element.isSelected(cb) -> cb(err, selected)
 *
 * @jsonWire GET /session/:sessionId/element/:id/selected
 */
elementCommands.isSelected = function() {
  return commands.isSelected.apply(this.browser, [this]);
};

elementCommands.selected = elementCommands.isSelected;

/**
  * element.isEnabled(cb) -> cb(err, enabled)
  *
  * @jsonWire GET /session/:sessionId/element/:id/enabled
  */
elementCommands.isEnabled = function() {
  return commands.isEnabled.apply(this.browser, [this]);
};

elementCommands.enabled = elementCommands.isEnabled;

/**
 * isVisible(cb) -> cb(err, boolean)
 */
elementCommands.isVisible = function() {
  deprecator.warn('element.isVisible', 'element.isVisible has been deprecated, use element.isDisplayed instead.');  
  return commands.isVisible.apply(this.browser, [this]);
};

/**
 * element.getLocation(cb) -> cb(err, location)
 *
 * @jsonWire GET /session/:sessionId/element/:id/location
 */
elementCommands.getLocation = function () {
  return commands.getLocation.apply(this.browser, [this]);
};

/**
 * element.getLocationInView(cb) -> cb(err, location)
 *
 * @jsonWire GET /session/:sessionId/element/:id/location
 */
elementCommands.getLocationInView = function () {
  return commands.getLocationInView.apply(this.browser, [this]);
};

/**
 * element.getSize(cb) -> cb(err, size)
 *
 * @jsonWire GET /session/:sessionId/element/:id/size
 */
elementCommands.getSize = function () {
  return commands.getSize.apply(this.browser, [this]);
};

/**
 * element.getValue(cb) -> cb(err, value)
 *
 * @jsonWire GET /session/:sessionId/element/:id/attribute/:name
 * @docOrder 4
 */
elementCommands.getValue = function() {
  return commands.getValue.apply(this.browser, [this]);
};

/**
 * element.getComputedCss(cssProperty , cb) -> cb(err, value)
 *
 * @jsonWire GET /session/:sessionId/element/:id/css/:propertyName
 */
elementCommands.getComputedCss = function(styleName) {
  return commands.getComputedCss.apply(this.browser, [this, styleName]);
};

elementCommands.getComputedCSS = elementCommands.getComputedCss;

/**
 * element.clear(cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/element/:id/clear
 */
elementCommands.clear = function() {
  return commands.clear.apply(this.browser, [this]);
};

/**
 * element.submit(cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/element/:id/submit
 */
elementCommands.submit = function() {
  return commands.submit.apply(this.browser, [this]);
};

/**
 * element.getComputedCss(cssProperty , cb) -> cb(err, value)
 *
 * @jsonWire GET /session/:sessionId/element/:id/css/:propertyName
 */
elementCommands.getComputedCss = function(styleName) {
    return commands.getComputedCss.apply(this.browser, [this, styleName]);
};

_.each(utils.elementFuncTypes, function(type) {
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
  elementCommands['element' + utils.elFuncSuffix(type)] = function(value) {
    return elementCommands.element.apply(this, [utils.elFuncFullType(type), value]);
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
  elementCommands['elements' + utils.elFuncSuffix(type)] = function(value) {
    return elementCommands.elements.apply(this, [utils.elFuncFullType(type), value]);
  };
});

/**
 * element.element(using, value, cb) -> cb(err, element)
 *
 * @jsonWire POST /session/:sessionId/element/:id/element
 * @docOrder 1
 */
elementCommands.element = function(using, value) {
    var _this = this;
    return this.browser._jsonWireCall({
      method: 'POST'
      , relPath: '/element/' + _this.value + '/element'
      , data: {using: using, value: value}
    }).then(parseElement(this.browser));
};

/**
 * element.elements(using, value, cb) -> cb(err, elements)
 *
 * @jsonWire POST /session/:sessionId/element/:id/elements
 * @docOrder 1
 */
elementCommands.elements = function(using, value) {
    var _this = this;
    return this.browser._jsonWireCall({
      method: 'POST'
      , relPath: '/element/' + _this.value + '/elements'
      , data: {using: using, value: value}
    }).then(parseElements(this.browser));
};

/**
 * element.equals(other, cb) -> cb(err, value)
 *
 * @jsonWire GET /session/:sessionId/element/:id/equals/:other
 * @docOrder 1
 */
elementCommands.equals = function(other) {
  return commands.equalsElement.apply(this.browser, [this, other]);
};

/**
 * element.sleep(ms, cb) -> cb(err)
 */
elementCommands.sleep = function(ms) {
  return Q.delay(ms);
};

/**
 * element.noop(cb) -> cb(err)
 */
elementCommands.noop = function() {
  return new Q();
};

module.exports = elementCommands;
