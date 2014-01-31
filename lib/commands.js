var fs = require("fs"),
    url = require('url'),
    path = require('path'),
    tmp = require('./tmp'),
    Q = require('q'),
    _ = require("./lodash"),
    __slice = Array.prototype.slice,
    config = require('./config'),
    responseHandlers = require("./response-handlers"),
    expectNoData = responseHandlers.expectNoData,    
    parseData = responseHandlers.parseData,
    parseElement = responseHandlers.parseElement,
    parseElements = responseHandlers.parseElements,    
    utils = require("./utils"),
    codeToString = utils.codeToString,
    deprecator = utils.deprecator,
    asserters = require("./asserters"),
    Asserter = asserters.Asserter;

var commands = {};

/**
 * init(desired, cb) -> cb(err, sessionID, capabilities)
 * Initialize the browser. capabilities return may be
 * absent, depending on driver.
 *
 * @jsonWire POST /session
 */
commands.init = function() {
  var args = __slice.call(arguments, 0);
  return this._init.apply(this, args);
};

/**
 * status(cb) -> cb(err, status)
 *
 * @jsonWire GET /status
 */
commands.status = function() {
  return this._jsonWireCall({
    method: 'GET'
    , absPath: 'status'
  }).then(parseData(this));
};

/**
 * sessions(cb) -> cb(err, sessions)
 *
 * @jsonWire GET /sessions
 */
commands.sessions = function() {
  return this._jsonWireCall({
    method: 'GET'
    , absPath: 'sessions'
  }).then(parseData(this));
};

/**
 * Retrieves the current session id.
 * getSessionId(cb) -> cb(err, sessionId)
 * getSessionId()
 */
commands.getSessionId = function() {
  return this.sessionID;
};

commands.getSessionID = commands.getSessionId;

/**
 * execute(code, args, cb) -> cb(err, result)
 * execute(code, cb) -> cb(err, result)
 * args: script argument array (optional)
 *
 * @jsonWire POST /session/:sessionId/execute
 * @docOrder 1
 */
commands.execute = function() {
  var fargs = utils.varargs(arguments),
      code = fargs.all[0],
      args = fargs.all[1] || [];
  code = codeToString(code);
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/execute'
    , data: {script: code, args: args}
  }).then(parseData(this));
};

// script to be executed in browser
var safeExecuteJsScript =
  utils.inlineJs(fs.readFileSync( __dirname + "/../browser-scripts/safe-execute.js", 'utf8'));

/**
 * Safely execute script within an eval block, always returning:
 * safeExecute(code, args, cb) -> cb(err, result)
 * safeExecute(code, cb) -> cb(err, result)
 * args: script argument array (optional)
 *
 * @jsonWire POST /session/:sessionId/execute
 * @docOrder 2
 */
commands.safeExecute = function() {
  var fargs = utils.varargs(arguments),
      code = fargs.all[0],
      args = fargs.all[1] || [];

  code = codeToString(code);
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/execute'
    , data: {script: safeExecuteJsScript, args: [code, args]}
  }).then(parseData(this));
};

/**
 * Evaluate expression (using execute):
 * eval(code, cb) -> cb(err, value)
 *
 * @jsonWire POST /session/:sessionId/execute
 */
(function() {
  // jshint evil: true
  commands.eval = function(code) {
    code = codeToString(code);
    code = "return " + code + ";";
    return commands.execute.apply(this, [code]);
  };
})();

/**
 * Safely evaluate expression, always returning  (using safeExecute):
 * safeEval(code, cb) -> cb(err, value)
 *
 * @jsonWire POST /session/:sessionId/execute
 */
commands.safeEval = function(code) {
  code = codeToString(code);
  return commands.safeExecute.apply(this, [code]);
};

/**
 * executeAsync(code, args, cb) -> cb(err, result)
 * executeAsync(code, cb) -> cb(err, result)
 * args: script argument array (optional)
 *
 * @jsonWire POST /session/:sessionId/execute_async
 */
  commands.executeAsync = function() {
  var fargs = utils.varargs(arguments),
      code = fargs.all[0],
      args = fargs.all[1] || [];

  code = codeToString(code);
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/execute_async'
    , data: {script: code, args: args}
  }).then(parseData(this));
};

// script to be executed in browser
var safeExecuteAsyncJsScript =
  utils.inlineJs(fs.readFileSync( __dirname + "/../browser-scripts/safe-execute-async.js", 'utf8'));

/**
 * Safely execute async script within an eval block, always returning:
 * safeExecuteAsync(code, args, cb) -> cb(err, result)
 * safeExecuteAsync(code, cb) -> cb(err, result)
 * args: script argument array (optional)
 *
 * @jsonWire POST /session/:sessionId/execute_async
 */
commands.safeExecuteAsync = function() {
  var fargs = utils.varargs(arguments),
      code = fargs.all[0],
      args = fargs.all[1] || [];

  code = codeToString(code);
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/execute_async'
    , data: {script: safeExecuteAsyncJsScript , args: [code, args]}
  }).then(parseData(this));
};

/**
 * Alternate strategy to get session capabilities from server session list:
 * altSessionCapabilities(cb) -> cb(err, capabilities)
 *
 * @jsonWire GET /sessions
 */
commands.altSessionCapabilities = function() {
  var _this = this;
  // looking for the current session
  return commands.sessions.apply(this).then(function(sessions) {
    sessions = sessions.filter(function(session) {
      return session.id === _this.sessionID;
    });
    return sessions[0]? sessions[0].capabilities : 0;
  });
};

/**
 * sessionCapabilities(cb) -> cb(err, capabilities)
 *
 * @jsonWire GET /session/:sessionId
 */
commands.sessionCapabilities = function() {
  return this._jsonWireCall({
    method: 'GET'
    // default url
  }).then(parseData(this));
};

/**
 * Opens a new window (using Javascript window.open):
 * newWindow(url, name, cb) -> cb(err)
 * newWindow(url, cb) -> cb(err)
 * name: optional window name
 * Window can later be accessed by name with the window method,
 * or by getting the last handle returned by the windowHandles method.
 */
commands.newWindow = function() {
  var fargs = utils.varargs(arguments),
      url =  fargs.all[0],
      name = fargs.all[1];
  return commands.execute.apply(
    this, 
    [ "var url=arguments[0], name=arguments[1]; window.open(url, name);",
      [url,name]]
  );
};

/**
 * close(cb) -> cb(err)
 *
 * @jsonWire DELETE /session/:sessionId/window
 */
commands.close = function() {
  return this._jsonWireCall({
    method: 'DELETE'
    , relPath: '/window'
  }).then(expectNoData);
};

/**
 * window(name, cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/window
 */
commands.window = function(windowRef) {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/window'
    , data: { name: windowRef }
  }).then(expectNoData);
};

/**
 * frame(frameRef, cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/frame
 */
commands.frame = function(frameRef) {
  // avoid using this, Webdriver seems very buggy
  // doesn't work at all with chromedriver
  if(frameRef && typeof(frameRef.value) !== "undefined"){
    // we have an element object
    frameRef = {ELEMENT: frameRef.value};
  }
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/frame'
    , data: { id: frameRef }
  }).then(expectNoData);
};

/**
 * windowName(cb) -> cb(err, name)
 */
commands.windowName = function() {
  // jshint evil: true
  return commands.eval.apply(this, ["window.name"]);
};

/**
 * windowHandle(cb) -> cb(err, handle)
 *
 * @jsonWire GET /session/:sessionId/window_handle
 */
commands.windowHandle = function() {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/window_handle'
  }).then(parseData(this));
};

/**
 * windowHandles(cb) -> cb(err, arrayOfHandles)
 *
 * @jsonWire GET /session/:sessionId/window_handles
 */
commands.windowHandles = function() {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/window_handles'
  }).then(parseData(this));
};

/**
 * logTypes(cb) -> cb(err, arrayOfLogTypes)
 *
 * @jsonWire GET /session/:sessionId/log/types
 */
commands.logTypes = function() {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/log/types'
  }).then(parseData(this));
};

/**
 * log(logType, cb) -> cb(err, arrayOfLogs)
 *
 * @jsonWire POST /session/:sessionId/log
 */
commands.log = function(logType) {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/log'
    , data: { type: logType }
  }).then(parseData(this));
};

/**
 * quit(cb) -> cb(err)
 * Destroy the browser.
 *
 * @jsonWire DELETE /session/:sessionId
 */
commands.quit = function() {
  return this._jsonWireCall({
    method: 'DELETE'
    // default url
    , emit: {event: 'status', message: '\nEnding your web drivage..\n'}
  }).then(expectNoData);
};

/**
 * get(url,cb) -> cb(err)
 * Get a new url.
 *
 * @jsonWire POST /session/:sessionId/url
 */
commands.get = function(_url) {
  if(this._httpConfig.baseUrl) {_url = url.resolve(this._httpConfig.baseUrl, _url); }
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/url'
    , data: {'url': _url}
  }).then(expectNoData);
};

/**
 * refresh(cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/refresh
 */
commands.refresh = function() {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/refresh'
  }).then(expectNoData);
};

/**
  * maximize(handle, cb) -> cb(err)
  *
  * @jsonWire POST /session/:sessionId/window/:windowHandle/maximize
 */
commands.maximize = function(win) {
this._jsonWireCall({
    method: 'POST'
  , relPath: '/window/'+ win + '/maximize'
  }).then(expectNoData);
};

/**
  * windowSize(handle, width, height, cb) -> cb(err)
  *
  * @jsonWire POST /session/:sessionId/window/:windowHandle/size
 */
commands.windowSize = function(win, width, height) {
  this._jsonWireCall({
    method: 'POST'
    , relPath: '/window/'+ win + '/size'
    , data: {'width':width, 'height':height}
  }).then(expectNoData);
};

/**
  * getWindowSize(handle, cb) -> cb(err, size)
  * getWindowSize(cb) -> cb(err, size)
  * handle: window handle to get size (optional, default: 'current')
  *
  * @jsonWire GET /session/:sessionId/window/:windowHandle/size
 */
commands.getWindowSize = function() {
  var fargs = utils.varargs(arguments),
      win = fargs.all[0] || 'current';
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/window/'+ win + '/size'
  }).then(parseData(this));
};

/**
  * setWindowSize(width, height, handle, cb) -> cb(err)
  * setWindowSize(width, height, cb) -> cb(err)
  * width: width in pixels to set size to
  * height: height in pixels to set size to
  * handle: window handle to set size for (optional, default: 'current')
  * @jsonWire POST /session/:sessionId/window/:windowHandle/size
 */
commands.setWindowSize = function() {
  var fargs = utils.varargs(arguments),
      width = fargs.all[0],
      height = fargs.all[1],
      win = fargs.all[2] || 'current';
  return this._jsonWireCall({
    method: 'POST'
  , relPath: '/window/'+ win + '/size'
  , data: {width: width, height: height}
  }).then(expectNoData);
};

/**
  * getWindowPosition(handle, cb) -> cb(err, position)
  * getWindowPosition(cb) -> cb(err, position)
  * handle: window handle to get position (optional, default: 'current')
  *
  * @jsonWire GET /session/:sessionId/window/:windowHandle/position
 */
commands.getWindowPosition = function() {
  var fargs = utils.varargs(arguments),
      win = fargs.all[0] || 'current';
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/window/'+ win + '/position'
  }).then(parseData(this));
};

/**
  * setWindowPosition(x, y, handle, cb) -> cb(err)
  * setWindowPosition(x, y, cb) -> cb(err)
  * x: the x-coordinate in pixels to set the window position
  * y: the y-coordinate in pixels to set the window position
  * handle: window handle to set position for (optional, default: 'current')
  * @jsonWire POST /session/:sessionId/window/:windowHandle/position
 */
commands.setWindowPosition = function() {
  var fargs = utils.varargs(arguments),
      x = fargs.all[0],
      y = fargs.all[1],
      win = fargs.all[2] || 'current';
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/window/'+ win + '/position'
    , data: {x: x, y: y}
  }).then(expectNoData);
};

/**
 * forward(cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/forward
 */
commands.forward = function() {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/forward'
  }).then(expectNoData);
};

/**
 * back(cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/back
 */
commands.back = function() {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/back'
  }).then(expectNoData);
};

commands.setHttpTimeout = function() {
  deprecator.warn('setHttpTimeout',
    'setHttpTimeout/setHTTPInactivityTimeout has been deprecated, use configureHttp instead.');
  var fargs = utils.varargs(arguments);
  var ms = fargs.all[0];
  return commands.configureHttp.apply(this, [{timeout: ms}]);
};

commands.setHTTPInactivityTimeout = commands.setHttpTimeout;

/**
 * configureHttp(opts)
 *
 * opts example:
 * {timeout:60000, retries: 3, 'retryDelay': 15, baseUrl='http://example.com/'}
 * more info in README.
 *
 */
commands.configureHttp = function() {
  var fargs = utils.varargs(arguments),
      opts = fargs.all[0];
  config._configureHttp(this._httpConfig, opts);
};

/**
 * setImplicitWaitTimeout(ms, cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/timeouts/implicit_wait
 */
commands.setImplicitWaitTimeout = function(ms) {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/timeouts/implicit_wait'
    , data: {ms: ms}
  }).then(expectNoData);
};

// for backward compatibility
commands.setWaitTimeout = commands.setImplicitWaitTimeout;

/**
 * setAsyncScriptTimeout(ms, cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/timeouts/async_script
 */
commands.setAsyncScriptTimeout = function(ms) {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/timeouts/async_script'
    , data: {ms: ms}
  }).then(expectNoData);
};

/**
 * setPageLoadTimeout(ms, cb) -> cb(err)
 * (use setImplicitWaitTimeout and setAsyncScriptTimeout to set the other timeouts)
 *
 * @jsonWire POST /session/:sessionId/timeouts
 */
commands.setPageLoadTimeout = function(ms) {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/timeouts'
    , data: {type: 'page load', ms: ms}
  }).then(expectNoData);
};

/**
 * element(using, value, cb) -> cb(err, element)
 *
 * @jsonWire POST /session/:sessionId/element
 */
commands.element = function(using, value) {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/element'
    , data: {using: using, value: value}
  }).then(parseElement(this));
};

/**
 * Retrieve an element avoiding not found exception and returning null instead:
 * elementOrNull(using, value, cb) -> cb(err, element)
 *
 * @jsonWire POST /session/:sessionId/elements
 * @docOrder 3
 */
commands.elementOrNull = function(using, value) {
  return commands
    .elements.apply(this, [using, value])
    .then(function(elements) {
      return elements.length>0? elements[0] : null;      
    });
};

/**
 * Retrieve an element avoiding not found exception and returning undefined instead:
 * elementIfExists(using, value, cb) -> cb(err, element)
 *
 * @jsonWire POST /session/:sessionId/elements
 * @docOrder 5
 */
commands.elementIfExists = function(using, value) {
  return commands
    .elements.apply(this, [using, value])
    .then(function(elements) {
      return elements.length>0? elements[0] : undefined;      
    });
};

/**
 * elements(using, value, cb) -> cb(err, elements)
 *
 * @jsonWire POST /session/:sessionId/elements
 * @docOrder 1
 */
commands.elements = function(using, value) {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/elements'
    , data: {using: using, value: value}
  }).then(parseElements(this));
};

/**
 * Check if element exists:
 * hasElement(using, value, cb) -> cb(err, boolean)
 *
 * @jsonWire POST /session/:sessionId/elements
 * @docOrder 7
 */
commands.hasElement = function(using, value){
  return commands
    .elements.apply(this, [using, value])
    .then(function(elements) { return elements.length>0; });
};

/**
 * waitFor(asserter, timeout, pollFreq, cb) -> cb(err, return_value)
 * timeout and pollFreq are optional (default 1000ms/200ms)
 * waitFor(opts, cb) -> cb(err)
 * opts with the following fields: timeout, pollFreq, asserter.
 * asserter like: function(browser , cb) -> cb(err, satisfied, return_value)
 */
commands.waitFor = function(){
  var fargs = utils.varargs(arguments);
  var opts;
  // retrieving options
  if(typeof fargs.all[0] === 'object' && !(fargs.all[0] instanceof Asserter)){
    opts = fargs.all[0];
  } else
  {
    opts = {
      asserter: fargs.all[0],
      timeout: fargs.all[1],
      pollFreq: fargs.all[2]
    };
  }

  // default
  opts.timeout = opts.timeout || 1000;
  opts.pollFreq = opts.pollFreq || 200;

  if(!opts.asserter) { throw new Error('Missing asserter!'); }

  var _this = this;
  var endTime = Date.now() + opts.timeout;

  var promisedAsserter = new Asserter(
    function(browser) {
      var deferred = Q.defer();
      var promise = opts.asserter.assert(browser, deferred.makeNodeResolver());
      if(Q.isPromiseAlike(promise)) {
        return promise;
      } else {
        return deferred.promise.then(function(res) {
          var satisfied = res[0];
          if(satisfied) {
            return res[1]; // value
          } else {
            var err = new Error('Condition not satisfied');
            err.retriable = true;
            throw err;
          } 
        });
      }      
    }
  );

  function poll(isFinalCheck){
    return promisedAsserter
      .assert(_this)
      .catch(function(err) {
        if(!err.retriable) { throw err; }
        if(isFinalCheck) { throw new Error("Condition wasn't satisfied!"); }
        if(Date.now() > endTime) {
          // trying one more time for safety
          return poll(true);
        } else {
          return Q.delay(opts.pollFreq).then(function() {
            return poll(); 
          });          
        }
      });
  }

  return poll();
};

/**
 * waitForElement(using, value, asserter, timeout, pollFreq, cb) -> cb(err)
 * waitForElement(using, value, timeout, pollFreq, cb) -> cb(err)
 * timeout and pollFreq are optional (default 1000ms/200ms)
 * waitForElement(using, value, opts, cb) -> cb(err)
 * opts with the following fields: timeout, pollFreq, asserter.
 * asserter like: function(element , cb) -> cb(err, satisfied)
 */
commands.waitForElement = function(){

  var fargs = utils.varargs(arguments);
  var using = fargs.all[0],
      value = fargs.all[1];
  var opts;

  // retrieving options
  if(typeof fargs.all[2] === 'object' && !(fargs.all[2] instanceof Asserter)){
    opts = fargs.all[2];
  } else if(fargs.all[2] instanceof Asserter) {
    opts = {
      asserter: fargs.all[2],
      timeout: fargs.all[3],
      pollFreq: fargs.all[4]
    };
  } else {
    opts = {
      timeout: fargs.all[2],
      pollFreq: fargs.all[3]
    };
  }

  // default
  opts.asserter = opts.asserter || new Asserter(function(el, cb) { cb(null, true); });

  var unpromisedAsserter = new Asserter(
    function(el, cb) {
      var promise = opts.asserter.assert(el, cb);
      if(promise && promise.then && typeof promise.then === 'function'){
        promise.then(
          function() { cb(null, true); },
          function(err) {
            if(err.retriable) { cb(null, false); }
            else { throw err; }
          }
        );
      }
    }
  );

  var wrappedAsserter = new Asserter(
    function(browser, cb){
      browser.elements(using, value, function(err, els){
        if(err) { return cb(err); }
        if(els.length > 0){
          unpromisedAsserter.assert(els[0], function(err, satisfied) {
            if(err) { return cb(err); }
            cb(err, satisfied, satisfied? els[0]: undefined);
          });
        }
        else
          { cb(null, false); }
      });
    }
  );


  return commands.waitFor.apply(this,[
    {
      asserter: wrappedAsserter,
      timeout: opts.timeout,
      pollFreq: opts.pollFreq
    }]).catch(function(err) {
      if(err && err.message && err.message.match(/Condition/)) {
        throw new Error("Element condition wasn't satisfied!");
      }      
    });
};

commands.waitForVisible = function(using, value, timeout, pollFreq) {
  deprecator.warn('waitForVisible',
    'waitForVisible has been deprecated, use waitForElement + isVisible asserter instead.');
  return commands.waitForElement
    .apply(this, [using, value, asserters.isVisible, timeout, pollFreq])
    .catch(function(err) {
      if(err && err.message && err.message.match(/Element condition wasn't satisfied!/)){
        throw new Error("Element didn't become visible");
      } 
  });
};

/**
 * takeScreenshot(cb) -> cb(err, screenshot)
 *
 * @jsonWire GET /session/:sessionId/screenshot
 */
commands.takeScreenshot = function() {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/screenshot'
  }).then(parseData(this));
};

/**
 * saveScreenshot(path, cb) -> cb(err, filePath)
 *
 * path maybe a full file path, a directory path (finishing with /),
 * the screenshot name, or left blank (will create a file in the system temp dir).
 */
commands.saveScreenshot = function() {
  var _this = this;
  var fargs = utils.varargs(arguments);
  var _path = fargs.all[0];
  var writeFile = Q.denodeify(require("fs").writeFile);
  var tmpName = Q.denodeify(tmp.tmpName);   

  function buildFilePath(_path) {
    if(!_path) { _path = tmp.tmpdir + '/'; }
    if(_path.match(/.*\/$/)) {
      return tmpName( {template: 'screenshot-XXXXXX.png'})
        .then(function(fileName) { return  path.join( _path , fileName); });
    } else {
      if(path.extname(_path) === '') { _path = _path + '.png'; }
      return new Q(_path);
    }
  }

  var filePath;
  return buildFilePath(_path)
    .then(function(_filePath) { filePath = _filePath; })
    .then(function() { return commands.takeScreenshot.apply(_this); })    
    .then(function(base64Data) {
      return writeFile(filePath, base64Data, 'base64');
    }).then(function() { return filePath; });
};

// adding all elementBy... , elementsBy... function

var addMethodsForSuffix = function(type, singular, plural) {
  if(singular){
    /**
     * elementByClassName(value, cb) -> cb(err, element)
     * elementByCssSelector(value, cb) -> cb(err, element)
     * elementById(value, cb) -> cb(err, element)
     * elementByName(value, cb) -> cb(err, element)
     * elementByLinkText(value, cb) -> cb(err, element)
     * elementByPartialLinkText(value, cb) -> cb(err, element)
     * elementByTagName(value, cb) -> cb(err, element)
     * elementByXPath(value, cb) -> cb(err, element)
     * elementByCss(value, cb) -> cb(err, element)
     *
     * @jsonWire POST /session/:sessionId/element
     */
    commands['element' + utils.elFuncSuffix(type)] = function() {
      var args = __slice.call(arguments, 0);
      args.unshift(utils.elFuncFullType(type));
      return commands.element.apply(this, args);
    };

    /**
     * elementByClassNameOrNull(value, cb) -> cb(err, element)
     * elementByCssSelectorOrNull(value, cb) -> cb(err, element)
     * elementByIdOrNull(value, cb) -> cb(err, element)
     * elementByNameOrNull(value, cb) -> cb(err, element)
     * elementByLinkTextOrNull(value, cb) -> cb(err, element)
     * elementByPartialLinkTextOrNull(value, cb) -> cb(err, element)
     * elementByTagNameOrNull(value, cb) -> cb(err, element)
     * elementByXPathOrNull(value, cb) -> cb(err, element)
     * elementByCssOrNull(value, cb) -> cb(err, element)
     *
     * @jsonWire POST /session/:sessionId/elements
     * @docOrder 4
     */
    commands['element' + utils.elFuncSuffix(type)+ 'OrNull'] = function() {
      var fargs = utils.varargs(arguments);
      var args = fargs.all;
      args.unshift(utils.elFuncFullType(type));
      return commands.elementOrNull.apply(this, args );
    };

    /**
     * elementByClassNameIfExists(value, cb) -> cb(err, element)
     * elementByCssSelectorIfExists(value, cb) -> cb(err, element)
     * elementByIdIfExists(value, cb) -> cb(err, element)
     * elementByNameIfExists(value, cb) -> cb(err, element)
     * elementByLinkTextIfExists(value, cb) -> cb(err, element)
     * elementByPartialLinkTextIfExists(value, cb) -> cb(err, element)
     * elementByTagNameIfExists(value, cb) -> cb(err, element)
     * elementByXPathIfExists(value, cb) -> cb(err, element)
     * elementByCssIfExists(value, cb) -> cb(err, element)
     *
     * @jsonWire POST /session/:sessionId/elements
     * @docOrder 6
     */
    commands['element' + utils.elFuncSuffix(type)+ 'IfExists'] = function() {
      var fargs = utils.varargs(arguments);
      var args = fargs.all;
      args.unshift(utils.elFuncFullType(type));
      return commands.elementIfExists.apply(this, args );
    };

    /**
     * hasElementByClassName(value, cb) -> cb(err, boolean)
     * hasElementByCssSelector(value, cb) -> cb(err, boolean)
     * hasElementById(value, cb) -> cb(err, boolean)
     * hasElementByName(value, cb) -> cb(err, boolean)
     * hasElementByLinkText(value, cb) -> cb(err, boolean)
     * hasElementByPartialLinkText(value, cb) -> cb(err, boolean)
     * hasElementByTagName(value, cb) -> cb(err, boolean)
     * hasElementByXPath(value, cb) -> cb(err, boolean)
     * hasElementByCss(value, cb) -> cb(err, boolean)
     *
     * @jsonWire POST /session/:sessionId/elements
     * @docOrder 8
     */
    commands['hasElement' + utils.elFuncSuffix(type)] = function() {
      var fargs = utils.varargs(arguments);
      var args = fargs.all;
      args.unshift(utils.elFuncFullType(type));
      return commands.hasElement.apply(this, args);
    };

    /**
     * waitForElementByClassName(value, asserter, timeout, pollFreq, cb) -> cb(err)
     * waitForElementByCssSelector(value, asserter, timeout, pollFreq, cb) -> cb(err)
     * waitForElementById(value, asserter, timeout, pollFreq, cb) -> cb(err)
     * waitForElementByName(value, asserter, timeout, pollFreq, cb) -> cb(err)
     * waitForElementByLinkText(value, asserter, timeout, pollFreq, cb) -> cb(err)
     * waitForElementByPartialLinkText(value, asserter, timeout, pollFreq, cb) -> cb(err)
     * waitForElementByTagName(value, asserter, timeout, pollFreq, cb) -> cb(err)
     * waitForElementByXPath(value, asserter, timeout, pollFreq, cb) -> cb(err)
     * waitForElementByCss(value, asserter, timeout, pollFreq, cb) -> cb(err)
     * asserter, timeout, pollFreq are optional, opts may be passed instead,
     * as in waitForElement.
     */
    commands['waitForElement' + utils.elFuncSuffix(type)] = function() {
      var fargs = utils.varargs(arguments);
      var args = fargs.all;
      args.unshift(utils.elFuncFullType(type));
      return commands.waitForElement.apply(this, args);
    };

    commands['waitForVisible' + utils.elFuncSuffix(type)] = function() {
      var fargs = utils.varargs(arguments);
      var args = fargs.all;
      args.unshift(utils.elFuncFullType(type));
      return commands.waitForVisible.apply(this, args);
    };

    /**
     * elementsByClassName(value, cb) -> cb(err, elements)
     * elementsByCssSelector(value, cb) -> cb(err, elements)
     * elementsById(value, cb) -> cb(err, elements)
     * elementsByName(value, cb) -> cb(err, elements)
     * elementsByLinkText(value, cb) -> cb(err, elements)
     * elementsByPartialLinkText(value, cb) -> cb(err, elements)
     * elementsByTagName(value, cb) -> cb(err, elements)
     * elementsByXPath(value, cb) -> cb(err, elements)
     * elementsByCss(value, cb) -> cb(err, elements)
     *
     * @jsonWire POST /session/:sessionId/elements
     * @docOrder 2
     */
  }
  if(plural){
    commands['elements' + utils.elFuncSuffix(type)] = function() {
      var fargs = utils.varargs(arguments);
      var args = fargs.all;
      args.unshift(utils.elFuncFullType(type));
      return commands.elements.apply(this, args);
    };
  }
};

_.each(utils.elementFuncTypes, function(suffix) {
  addMethodsForSuffix(suffix, true, true);
});

/**
 * getTagName(element, cb) -> cb(err, name)
 *
 * @jsonWire GET /session/:sessionId/element/:id/name
 */
commands.getTagName = function(element) {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/element/' + element + '/name'
  }).then(parseData(this));
};

/**
 * getAttribute(element, attrName, cb) -> cb(err, value)
 *
 * @jsonWire GET /session/:sessionId/element/:id/attribute/:name
 * @docOrder 1
 */
commands.getAttribute = function() {
  var fargs = utils.varargs(arguments),
      element = fargs.all[0],
      attrName = fargs.all[1];
  if(!element) { throw new Error('Missing element.'); }
  if(!attrName) { throw new Error('Missing attribute name.'); }
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/element/' + element + '/attribute/' + attrName
  }).then(parseData(this));
};

/**
 * isDisplayed(element, cb) -> cb(err, displayed)
 *
 * @jsonWire GET /session/:sessionId/element/:id/displayed
 */
commands.isDisplayed = function(element) {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/element/' + element + '/displayed'
  }).then(parseData(this));
};

commands.displayed = commands.isDisplayed;

/**
  * isEnabled(element, cb) -> cb(err, enabled)
  *
  * @jsonWire GET /session/:sessionId/element/:id/enabled
  */
commands.isEnabled = function(element) {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/element/' + element + '/enabled'
  }).then(parseData(this));
};

commands.enabled = commands.isEnabled;

/**
 * isSelected(element, cb) -> cb(err, selected)
 *
 * @jsonWire GET /session/:sessionId/element/:id/selected
 */
commands.isSelected = function(element) {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/element/' + element + '/selected'
  }).then(parseData(this));
};

// commands.selected = commands.isSelected;

/**
 * Get element value (in value attribute):
 * getValue(element, cb) -> cb(err, value)
 *
 * @jsonWire GET /session/:sessionId/element/:id/attribute/:name
 * @docOrder 3
 */
commands.getValue = function() {
  var fargs = utils.varargs(arguments),
      element = fargs.all[0];
  if(!element) { throw new Error('Missing element.'); }
  return commands.getAttribute.apply(this, [element, 'value']);
};

/**
 * clickElement(element, cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/element/:id/click
 */
commands.clickElement = function(element) {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/element/' + element + '/click'
  }).then(expectNoData);
};

/**
 * getComputedCss(element, cssProperty , cb) -> cb(err, value)
 *
 * @jsonWire GET /session/:sessionId/element/:id/css/:propertyName
 */
commands.getComputedCss = function(element, cssProperty) {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/element/' + element + '/css/' + cssProperty
  }).then(parseData(this));
};

commands.getComputedCSS = commands.getComputedCss;

/**
 * equalsElement(element, other , cb) -> cb(err, value)
 *
 * @jsonWire GET /session/:sessionId/element/:id/equals/:other
 */
commands.equalsElement = function(element, other) {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/element/' + element + '/equals/' + other
  }).then(parseData(this));
};

var _flick1 = function(){
  var fargs = utils.varargs(arguments),
      xspeed = fargs.all[0],
      yspeed = fargs.all[1],
      swipe = fargs.all[2];

  var data = { xspeed: xspeed, yspeed: yspeed };
  if (swipe) {
    data.swipe = swipe;
  }

  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/touch/flick'
    , data: data
  }).then(expectNoData);
};

var _flick2 = function() {
  var fargs = utils.varargs(arguments),
      element = fargs.all[0],
      xoffset = fargs.all[1],
      yoffset = fargs.all[2],
      speed = fargs.all[3];

  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/touch/flick'
    , data: { element: element, xoffset: xoffset, yoffset: yoffset, speed: speed }
  }).then(expectNoData);
};

/**
 * flick(xSpeed, ySpeed, swipe, cb) -> cb(err)
 * Flicks, starting anywhere on the screen.
 *
 * flick(element, xoffset, yoffset, speed, cb) -> cb(err)
 * Flicks, starting at element center.
 *
 * @jsonWire POST /session/:sessionId/touch/flick
 */
commands.flick = function() {
  var args = __slice.call(arguments, 0);
  if (args.length <= 4) {
    _flick1.apply(this, args);
  } else {
    _flick2.apply(this, args);
  }
};

/**
 * tap(element) -> cb(err)
 * Taps element
 *
 * @jsonWire POST /session/:sessionId/touch/click
 */
commands.tapElement = function(element) {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/touch/click'
    , data: { element: element.value.toString() }
  }).then(expectNoData);
};

/**
 * moveTo(element, xoffset, yoffset, cb) -> cb(err)
 * Move to element, element may be null, xoffset and y offset
 * are optional.
 *
 * @jsonWire POST /session/:sessionId/moveto
 */
commands.moveTo = function() {
  var fargs = utils.varargs(arguments),
      element = fargs.all[0],
      xoffset = fargs.all[1],
      yoffset = fargs.all[2];

  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/moveto'
    , data: { element:
      element? element.toString(): null,
      xoffset: xoffset,
      yoffset: yoffset }
  }).then(expectNoData);
};

/**
 * buttonDown(button ,cb) -> cb(err)
 * button is optional.
 * {LEFT = 0, MIDDLE = 1 , RIGHT = 2}.
 * LEFT if not specified.
 *
 * @jsonWire POST /session/:sessionId/buttondown
 */
commands.buttonDown = function() {
  var fargs = utils.varargs(arguments),
      button = fargs.all[0];
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/buttondown'
    , data: {button: button}
  }).then(expectNoData);
};

/**
 * buttonUp(button, cb) -> cb(err)
 * button is optional.
 * {LEFT = 0, MIDDLE = 1 , RIGHT = 2}.
 * LEFT if not specified.
 *
 * @jsonWire POST /session/:sessionId/buttonup
 */
commands.buttonUp = function() {
  var fargs = utils.varargs(arguments),
      button = fargs.all[0];
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/buttonup'
    , data: {button: button}
  }).then(expectNoData);
};

/**
 * click(button, cb) -> cb(err)
 * Click on current element.
 * Buttons: {left: 0, middle: 1 , right: 2}
 *
 * @jsonWire POST /session/:sessionId/click
 */
commands.click = function() {
  // parsing args, button optional
  var fargs = utils.varargs(arguments),
      button = fargs.all[0];

  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/click'
    , data: {button: button}
  }).then(expectNoData);
};

/**
 * doubleclick(cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/doubleclick
 */
commands.doubleclick = function() {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/doubleclick'
  }).then(expectNoData);
};

/**
 * type(element, keys, cb) -> cb(err)
 * Type keys (all keys are up at the end of command).
 * special key map: wd.SPECIAL_KEYS (see lib/special-keys.js)
 *
 * @jsonWire POST /session/:sessionId/element/:id/value
 */
commands.type = function(element, keys) {
  if (!(keys instanceof Array)) {keys = [keys];}
  // ensure all keystrokes are strings to conform to JSONWP
  _.each(keys, function(key, idx) {
    if (typeof key !== "string") {
      keys[idx] = key.toString();
    }
  });
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/element/' + element + '/value'
    , data: {value: keys}
  }).then(expectNoData);
};

/**
 * submit(element, cb) -> cb(err)
 * Submit a `FORM` element.
 *
 * @jsonWire POST /session/:sessionId/element/:id/submit
 */
commands.submit = function(element) {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/element/' + element + '/submit'
  }).then(expectNoData);
};

/**
 * keys(keys, cb) -> cb(err)
 * Press keys (keys may still be down at the end of command).
 * special key map: wd.SPECIAL_KEYS (see lib/special-keys.js)
 *
 * @jsonWire POST /session/:sessionId/keys
 */
commands.keys = function(keys) {
  if (!(keys instanceof Array)) {keys = [keys];}
  // ensure all keystrokes are strings to conform to JSONWP
  _.each(keys, function(key, idx) {
    if (typeof key !== "string") {
      keys[idx] = key.toString();
    }
  });
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/keys'
    , data: {value: keys}
  }).then(expectNoData);
};

/**
 * clear(element, cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/element/:id/clear
 */
commands.clear = function(element) {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/element/' + element + '/clear'
  }).then(expectNoData);
};

/**
 * title(cb) -> cb(err, title)
 *
 * @jsonWire GET /session/:sessionId/title
 */
commands.title = function() {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/title'
  }).then(parseData(this));
};

/**
 * source(cb) -> cb(err, source)
 *
 * @jsonWire GET /session/:sessionId/source
 */
commands.source = function() {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/source'
  }).then(parseData(this));
};

// element must be specified
var _rawText = function(element) {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/element/' + element + '/text'
  }).then(parseData(this));
};

/**
 * text(element, cb) -> cb(err, text)
 * element: specific element, 'body', or undefined
 *
 * @jsonWire GET /session/:sessionId/element/:id/text
 * @docOrder 1
 */
commands.text = function() {
  var fargs = utils.varargs(arguments);
  var element = fargs.all[0];
  var _this = this;
  if (!element || element === 'body') {
    return commands
      .element.apply(this, ['tag name', 'body'])
      .then(function(bodyEl) { return _rawText.apply(_this, [bodyEl]); });
  } else { return _rawText.apply(_this, [element]); }
};

/**
 * Check if text is present:
 * textPresent(searchText, element, cb) -> cb(err, boolean)
 * element: specific element, 'body', or undefined
 *
 * @jsonWire GET /session/:sessionId/element/:id/text
 * @docOrder 3
 */
commands.textPresent = function(searchText, element) {
  return commands.text.apply(this, [element])
    .then(function(text) { return text.indexOf(searchText) >= 0; });
};

/**
 * alertText(cb) -> cb(err, text)
 *
 * @jsonWire GET /session/:sessionId/alert_text
 */
commands.alertText = function() {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/alert_text'
  }).then(parseData(this));
};

/**
 * alertKeys(keys, cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/alert_text
 */
commands.alertKeys = function(keys) {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/alert_text'
    , data: {text: keys}
  }).then(expectNoData);
};

/**
 * acceptAlert(cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/accept_alert
 */
commands.acceptAlert = function() {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/accept_alert'
  }).then(expectNoData);
};

/**
 * dismissAlert(cb) -> cb(err)
 *
 * @jsonWire POST /session/:sessionId/dismiss_alert
 */
commands.dismissAlert = function() {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/dismiss_alert'
  }).then(expectNoData);
};

/**
 * active(cb) -> cb(err, element)
 *
 * @jsonWire POST /session/:sessionId/element/active
 */
commands.active = function() {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/element/active'
  }).then(parseData(this));
};

/**
 * url(cb) -> cb(err, url)
 *
 * @jsonWire GET /session/:sessionId/url
 */
commands.url = function() {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/url'
  }).then(parseData(this));
};

/**
 * allCookies() -> cb(err, cookies)
 *
 * @jsonWire GET /session/:sessionId/cookie
 */
commands.allCookies = function() {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/cookie'
  }).then(parseData(this));
};

/**
 * setCookie(cookie, cb) -> cb(err)
 * cookie example:
 *  {name:'fruit', value:'apple'}
 * Optional cookie fields:
 *  path, domain, secure, expiry
 *
 * @jsonWire POST /session/:sessionId/cookie
 */
commands.setCookie = function(cookie) {
  // setting secure otherwise selenium server throws
  if(cookie){ cookie.secure = cookie.secure || false; }

  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/cookie'
    , data: { cookie: cookie }
  }).then(expectNoData);
};

/**
 * deleteAllCookies(cb) -> cb(err)
 *
 * @jsonWire DELETE /session/:sessionId/cookie
 */
commands.deleteAllCookies = function() {
  return this._jsonWireCall({
    method: 'DELETE'
    , relPath: '/cookie'
  }).then(expectNoData);
};

/**
 * deleteCookie(name, cb) -> cb(err)
 *
 * @jsonWire DELETE /session/:sessionId/cookie/:name
 */
commands.deleteCookie = function(name) {
  return this._jsonWireCall({
    method: 'DELETE'
    , relPath: '/cookie/' + encodeURIComponent(name)
  }).then(expectNoData);
};

/**
 * getOrientation(cb) -> cb(err, orientation)
 *
 * @jsonWire GET /session/:sessionId/orientation
 */
commands.getOrientation = function() {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/orientation'
  }).then(parseData(this));
};

/**
 * setOrientation(cb) -> cb(err, orientation)
 *
 * @jsonWire POST /session/:sessionId/orientation
 */
commands.setOrientation = function(orientation) {
  return this._jsonWireCall({
    method: 'POST'
    , relPath: '/orientation'
    , data: { orientation: orientation }
  }).then(expectNoData);
};

/**
 * setLocalStorageKey(key, value, cb) -> cb(err)
 *
 * # uses safeExecute() due to localStorage bug in Selenium
 *
 * @jsonWire POST /session/:sessionId/local_storage
 */
commands.setLocalStorageKey = function() {
  var fargs = utils.varargs(arguments),
      key = fargs.all[0],
      value = fargs.all[1];

  return commands.safeExecute.apply(
    this, 
    ["localStorage.setItem(arguments[0], arguments[1])", [key, value]]
  );
};

/**
 * getLocalStorageKey(key, cb) -> cb(err)
 *
 * # uses safeEval() due to localStorage bug in Selenium
 *
 * @jsonWire GET /session/:sessionId/local_storage/key/:key
 */
commands.getLocalStorageKey = function() {
  var fargs = utils.varargs(arguments),
      key = fargs.all[0];

  return commands.safeEval.apply(
    this,
    ["localStorage.getItem('" + key + "')"]
  );
};

/**
 * removeLocalStorageKey(key, cb) -> cb(err)
 *
 * # uses safeExecute() due to localStorage bug in Selenium
 *
 * @jsonWire DELETE /session/:sessionId/local_storage/key/:key
 */
commands.removeLocalStorageKey = function() {
  var fargs = utils.varargs(arguments),
      key = fargs.all[0];

  return commands.safeExecute.apply(
    this,
    ["localStorage.removeItem(arguments[0])", [key]]
  );
};

/**
 * clearLocalStorage(cb) -> cb(err)
 *
 * # uses safeExecute() due to localStorage bug in Selenium
 *
 * @jsonWire DELETE /session/:sessionId/local_storage
 */
commands.clearLocalStorage = function() {
  return commands.safeExecute.apply(
    this,
    ["localStorage.clear()"]
  );
};

// deprecated
var _isVisible1 = function(element){
  return commands.getComputedCSS.apply(this, [element, "display"])
    .then(function(display){ return display !== "none"; });
};

// deprecated
var _isVisible2 = function(queryType, querySelector){
  return commands.elementIfExists.apply(this, [queryType, querySelector])
    .then(function(element){ return element? element.isVisible() : false; });
};

// deprecated
commands.isVisible = function() {
  deprecator.warn('isVisible', 'isVisible has been deprecated, use isDisplayed instead.');
  var args = __slice.call(arguments, 0);
  if (args.length <= 1) {
    return _isVisible1.apply(this, args);
  } else {
    return _isVisible2.apply(this, args);
  }
};

/**
 * Retrieves the pageIndex element (added for Appium):
 * getPageIndex(element, cb) -> cb(err, pageIndex)
 */
commands.getPageIndex = function(element) {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/element/' + element + '/pageIndex'
  }).then(parseData(this));
};

/**
 * getLocation(element, cb) -> cb(err, location)
 *
 * @jsonWire GET /session/:sessionId/element/:id/location
 */
commands.getLocation = function(element) {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/element/' + element + '/location'
  }).then(parseData(this));
};

/**
 * getLocationInView(element, cb) -> cb(err, location)
 *
 * @jsonWire GET /session/:sessionId/element/:id/location_in_view
 */
commands.getLocationInView = function(element) {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/element/' + element + '/location_in_view'
  }).then(parseData(this));
};

/**
 * getSize(element, cb) -> cb(err, size)
 *
 * @jsonWire GET /session/:sessionId/element/:id/size
 */
commands.getSize = function(element) {
  return this._jsonWireCall({
    method: 'GET'
    , relPath: '/element/' + element + '/size'
  }).then(parseData(this));
};

/**
 * Uploads a local file using undocumented
 * POST /session/:sessionId/file
 * uploadFile(filepath, cb) -> cb(err, filepath)
 */
commands.uploadFile = function(filepath) {
  var _this = this;
  return utils.fileToBase64String(filepath).then(function(base64Data) {
    return _this._jsonWireCall({
        method: 'POST'
      , relPath: '/file'
      , data: { file: base64Data }
      }).then(parseData(_this));
  });
};

commands.waitForJsCondition = function(){
  deprecator.warn('waitForJsCondition',
    'waitForJsCondition has been deprecated, use waitFor + jsCondition asserter instead.');

  var fargs = utils.varargs(arguments);
  var jsConditionExpr = fargs.all[0],
      timeout = fargs.all[1],
      pollFreq = fargs.all[2];
  return commands.waitFor.apply(this, [
    {
      asserter: asserters.jsCondition(jsConditionExpr, true),
      timeout: timeout,
      pollFreq: pollFreq
    }]).catch(function(err) {
      if(err.message && err.message.match(/Condition/)) {
        throw new Error("Element condition wasn't satisfied!");
      } else {
        throw err;
      }
    });
};
commands.waitForCondition = commands.waitForJsCondition;

// script to be executed in browser
var _waitForConditionInBrowserJsScript =
  utils.inlineJs(fs.readFileSync( __dirname + "/../browser-scripts/wait-for-cond-in-browser.js", 'utf8'));

/**
 * Waits for JavaScript condition to be true (async script polling within browser):
 * waitForConditionInBrowser(conditionExpr, timeout, pollFreq, cb) -> cb(err, boolean)
 * conditionExpr: condition expression, should return a boolean
 * timeout and  pollFreq are optional, default: 1000/100.
 * return true if condition satisfied, error otherwise.
 */
commands.waitForConditionInBrowser = function() {
  var _this = this;
  // parsing args
  var fargs = utils.varargs(arguments),
      conditionExpr = fargs.all[0],
      timeout = fargs.all[1] || 1000,
      poll = fargs.all[2] || 100;

  // calling script
  return commands.safeExecuteAsync.apply( _this, [_waitForConditionInBrowserJsScript,
      [conditionExpr,timeout,poll]]
    ).then(function(res) {
      if(res !== true) { throw new Error("waitForConditionInBrowser failure for: " + conditionExpr);}
      return res;
    });
};

/**
 * sauceJobUpdate(jsonData, cb) -> cb(err)
 */
commands.sauceJobUpdate = function() {
  var args = __slice.call(arguments, 0);
  return this._sauceJobUpdate.apply(this, args);
};

/**
 * sauceJobStatus(hasPassed, cb) -> cb(err)
 */
commands.sauceJobStatus = function(hasPassed) {
  return commands.sauceJobUpdate.apply(this, [{passed: hasPassed}]);
};

/**
 * sleep(ms, cb) -> cb(err)
 */
commands.sleep = function(ms) {
  return Q.delay(ms);
};

/**
 * noop(cb) -> cb(err)
 */
commands.noop = function() {
  return new Q();
};

module.exports = commands;

