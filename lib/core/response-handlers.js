var helpers = require('../utils/helpers'),
    newError = helpers.newError,
    getJsonwireError = helpers.getJsonwireError,
    isWebDriverException = helpers.isWebDriverException;

// just calls the callback when there is no result
exports.expectNoData = function (data) {
  // empty/OK response is expected
  if ((data === '') || (data === 'OK')) { return; }
  
  // looking for JsonWire response
  var jsonWireRes;
  try { jsonWireRes = JSON.parse(data); } catch (ign) {}
  if (jsonWireRes && (jsonWireRes.sessionId) &&
    (jsonWireRes.status !== undefined)) {
    // valid JsonWire response
    if (jsonWireRes.status === 0) {
      return;
    } else {
      var error = newError(
        { message: 'Error response status: ' + jsonWireRes.status +  '.',
          status: jsonWireRes.status,
          cause: jsonWireRes });
      var jsonwireError  = getJsonwireError(jsonWireRes.status);
      if (jsonwireError) { error['jsonwire-error'] = jsonwireError; }
      throw error;
    }
  } else {
    // something wrong
    throw newError({
      message: 'Unexpected data in simpleCallback.',
      data: jsonWireRes || data
    });
  }
};

// base for all callback handling data
var parseRawData = function (rawData) {
  var data,
      alertText;
  try { data = JSON.parse(rawData); } catch (e) {
    throw newError({message: 'Not JSON response', data: rawData});
  }
  try { alertText = data.value.alert.text; } catch (e) { alertText = ''; }
  if (data.status > 0) {
    var error = newError(
      { message: 'Error response status: ' + data.status + '. ' + alertText,
        status: data.status,
        cause: data });
    var jsonwireError  = getJsonwireError(data.status);
    if (jsonwireError) { error['jsonwire-error'] = jsonwireError; }
    throw error;
  } else {
    return data;
  }
};

// retrieves field value from result
exports.parseData = function (browser) {
  return function (rawData) {
    var data = parseRawData(rawData);
    if (isWebDriverException(data.value)) {
      throw newError({message: data.value.message, cause: data.value});
    }
    // we might get a WebElement back as part of executeScript, so let's
    // check to make sure we convert if necessary to element objects
    if (data.value !== null && typeof data.value.ELEMENT !== 'undefined') {
      data.value = browser.newElement(data.value.ELEMENT);
    } else if (
        Object.prototype.toString.call(data.value) === '[object Array]') {
      for (var i = 0; i < data.value.length; i++) {
        if (data.value[i] !== null &&
            typeof data.value[i].ELEMENT !== 'undefined') {
          data.value[i] = browser.newElement(data.value[i].ELEMENT);
        }
      }
    }
    return data.value;
  };
};

// retrieves ONE element
exports.parseElement = function (browser) {
  return function (rawData) {
    var data = parseRawData(rawData);
    if (isWebDriverException(data.value)) {
      throw newError({message: data.value.message, cause: data.value});
    }
    if (!data.value.ELEMENT) {
      throw newError({message: 'no ELEMENT in response value field.',
        cause: data});
    } else {
      var el = browser.newElement(data.value.ELEMENT);
      return el;
    }
  };
};

// retrieves SEVERAL elements
exports.parseElements = function (browser) {
  return function (rawData) {
    var data = parseRawData(rawData);
    if (isWebDriverException(data.value)) {
      throw newError({message: data.value.message, cause: data.value});
    }
    if (!(data.value instanceof Array)) {
      throw newError({
        message: 'Response value field is not an Array.',
        cause: data.value
      });
    }
    var i, elements = [];
    for (i = 0; i < data.value.length; i++) {
      var el = browser.newElement(data.value[i].ELEMENT);
      elements.push(el);
    }
    return elements;
  };
};
