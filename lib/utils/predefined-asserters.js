var _ = require('./lodash');
var __slice = Array.prototype.slice;
var helpers = require('./helpers');
var deprecator = helpers.deprecator;
var AsyncAsserter = require('../core/asserters').AsyncAsserter;

/**
 * asserters.nonEmptyText
 *
 * @asserter
 */
var nonEmptyText = new AsyncAsserter(
  function (target, cb) {
    target.text(function (err, text) {
      if (err) { return cb(err); }
      var satisfied = text && _(text).trim().value().length > 0;
      cb(null, satisfied, satisfied ? text : undefined);
    });
  }
);

/**
 * asserters.textInclude(content) -> Asserter
 *
 * @asserter
 */
function textInclude(content) {
  return new AsyncAsserter(
    function (target, cb) {
      target.text(function (err, text) {
        if (err) { return cb(err); }
        var satisfied = text && _(text).includeString(content).value();
        cb(null, satisfied, satisfied ? text : undefined);
      });
    }
  );
}

/**
 * asserters.isVisible
 *
 * @asserter
 */
var isDisplayed = new AsyncAsserter(
  function (el, cb) {
    el.isDisplayed(function (err, displayed) {
      if (err) { return cb(err); }
      cb(null, displayed);
    });
  }
);
var isVisible = new AsyncAsserter(
  function () {
    deprecator.warn(
      'isVisible asserter', 'isVisible asserter has been deprecated, ' +
      'use isDisplayed asserter instead.');
    var args = __slice.call(arguments, 0);
    isDisplayed.assert.apply(this, args);
  }
);

/**
 * asserters.isHidden
 *
 * @asserter
 */
var isNotDisplayed = new AsyncAsserter(
  function (el, cb) {
    el.isDisplayed(function (err, displayed) {
      if (err) { return cb(err); }
      cb(null, !displayed);
    });
  }
);
var isHidden = new AsyncAsserter(
  function () {
    deprecator.warn(
      'isHidden asserter', 'isHidden asserter has been deprecated, ' +
      'use isNotDisplayed asserter instead.');
    var args = __slice.call(arguments, 0);
    isNotDisplayed.assert.apply(this, args);
  }
);

/**
 * asserters.jsCondition(jsConditionExpr) -> Asserter
 * jsConditionExpr: js script expression, should evaluate as boolean.
 *
 * @asserter
 */
function jsCondition(jsConditionExpr, safe) {
  // jshint evil: true
  if (safe === undefined) { safe = false; }
  return new AsyncAsserter(
    function (browser, cb) {
      var _eval = safe ? browser.safeEval : browser.eval;
      _eval.apply(browser, [jsConditionExpr, function (err, res) {
        if (err) { return cb(err); }
        cb(null, res, res);
      }]);
    }
  );
}

module.exports = {
  nonEmptyText: nonEmptyText,
  isDisplayed: isDisplayed,
  isNotDisplayed: isNotDisplayed,
  textInclude: textInclude,
  jsCondition: jsCondition,
  // deprecated
  isVisible: isVisible,
  isHidden: isHidden,
};
