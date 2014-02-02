var util = require('util');

function Asserter(_assert) {
  this.assert = _assert;
}

function AsyncAsserter(_assert) {
  Asserter.call(this, _assert);
}
util.inherits(AsyncAsserter, Asserter);

module.exports = {
  Asserter: Asserter,
  AsyncAsserter: AsyncAsserter,
};
