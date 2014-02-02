var Q = require('q'),
    _ = require('../utils/lodash'),
    BaseElement = require('./element-base'),
    webdriverCommands = require('../commands/webdriver-commands'),
    elementCommands = require('../commands/element-commands'),
    helpers = require('../utils/helpers');

// The method below returns no result, so we are able hijack the result to
// preserve the element scope.
// This alows for thing like: field.click().clear().input('hello').getValue()
var elementChainableMethods = ['clear', 'click', 'doubleClick', 'doubleclick',
  'flick', 'sendKeys', 'submit', 'type', 'keys', 'moveTo', 'sleep', 'noop'];

// enriches a promise with the browser + element methods.
var enrich = function (obj, currentEl) {
  // pass if not chained
  if (!this._chained) { return obj; }

  var _this = this;
  // There are cases were enrich may be called on non-promise objects.
  // It is easier and safer to check within the method.
  if (Q.isPromiseAlike(obj) && !obj.__wdPromiseEnriched) {
    var promise = obj;

    // __wdPromiseEnriched is there to avoid enriching twice.
    promise.__wdPromiseEnriched = true;

    // making sure all the sub-promises are also enriched.
    _(promise).functions().each(function (fname) {
      var _orig = promise[fname];
      promise[fname] = function () {
        return enrich.call(_this, _orig.apply(this,
          helpers.varargs(arguments).array), currentEl);
      };
    });

    // we get the list of methods dynamically.
    var browserMethods = _.union(_.keys(webdriverCommands));
    var elementMethods = _.union(_.keys(elementCommands));
    var allPromisedMethods = _.union(browserMethods, elementMethods);

    // adding browser + element methods to the current promise.
    _(allPromisedMethods).each(function (fname) {
      promise[fname] = function () {
        var args = helpers.varargs(arguments).array;
        // This is a hint to figure out if we need to call a browser method or
        // an element method.
        // "<" --> browser method
        // ">" --> element method
        var scopeHint;
        if (args && args[0] && typeof args[0] === 'string' &&
          args[0].match(/^[<>]$/)) {
          scopeHint = args[0];
          args = _.rest(args);
        }

        return this.then(function (res) {
          var el;
          // if the result is an element it has priority
          if (res instanceof BaseElement) {
            el = res;
          }
          // if we are within an element
          el = el || currentEl;

          // testing the water for the next call scope
          var isBrowserMethod =
            _.indexOf(browserMethods, fname) >= 0;
          var isElementMethod =
            el && _.indexOf(elementMethods, fname) >= 0;
          if (!isBrowserMethod && !isElementMethod) {
            // doesn't look good
            throw new Error('Invalid method ' + fname);
          }

          if (isBrowserMethod && isElementMethod) {
            // we need to resolve the conflict.
            if (scopeHint === '<') {
              isElementMethod = false;
            } else if (scopeHint === '>') {
              isBrowserMethod = false;
            } else if (fname.match(/element/) ||
              (BaseElement && args[0] instanceof BaseElement)) {
              // method with element locators are browser scoped by default.
              // When an element is passed, we are also obviously in the global 
              // scope.
              isElementMethod = false;
            } else {
              // otherwise we stay in the element scope to allow sequential
              // calls
              isBrowserMethod = false;
            }
          }

          if (isElementMethod) {
            // element method case.
            return el[fname].apply(el, args).then(function (res) {
              if (_.indexOf(elementChainableMethods, fname) >= 0) {
                // method like click, where no result is expected, we return
                // the element to make it chainable
                return el;
              } else {
                return res; // we have no choice but loosing the scope
              }
            });
          } else {
            // browser case.
            return _this[fname].apply(_this, args);
          }
        });
      };
    });
    // transfering _enrich
    promise._enrich = function (target) {
      return enrich.call(_this, target, currentEl);
    };

    // gets the element at index (starting at 0)
    promise.at = function (i) {
      return enrich.call(_this, promise.then(function (vals) {
        return vals[i];
      }), currentEl);
    };

    // gets the element at index (starting at 0)
    promise.last = function () {
      return promise.then(function (vals) {
        return vals[vals.length - 1];
      });
    };

    // gets nth element (starting at 1)
    promise.nth = function (i) {
      return promise.at(i - 1);
    };

    // gets the first element
    promise.first = function () {
      return promise.nth(1);
    };

    // gets the first element
    promise.second = function () {
      return promise.nth(2);
    };

    // gets the first element
    promise.third = function () {
      return promise.nth(3);
    };

    // print error
    promise.printError = function (prepend) {
      prepend = prepend || '';
      return enrich.call(_this, promise.catch(function (err) {
        console.log(prepend + err);
        throw err;
      }), currentEl);
    };

    // print
    promise.print = function (prepend) {
      prepend = prepend || '';
      return enrich.call(_this, promise.then(function (val) {
        console.log(prepend + val);
      }), currentEl);
    };
  }
  return obj;
};

module.exports = enrich;
