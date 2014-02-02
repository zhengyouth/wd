var request = require('request'),
    Q = require("q"),
    helpers = require("./helpers");

request = Q.denodeify(request.bind(request));

exports.buildInitUrl =function(baseUrl)
{
  return helpers.resolveUrl(baseUrl, 'session');
};

exports.buildJsonCallUrl = function(baseUrl ,sessionID, relPath, absPath){
  var path = ['session'];
  if(sessionID)
    { path.push('/' , sessionID); }
  if(relPath)
    { path.push(relPath); }
  if(absPath)
    { path = [absPath]; }
  path = path.join('');

  return helpers.resolveUrl(baseUrl, path);
};

exports.newHttpOpts = function(method, httpConfig) {
  // this._httpConfig
  var opts = {};

  opts.method = method;
  opts.headers = {};

  opts.headers.Connection = 'keep-alive';
  opts.timeout = httpConfig.timeout;

  // we need to check method here to cater for DELETE case
  if(opts.method === 'GET' || opts.method === 'POST'){
    opts.headers.Accept = 'application/json';
  }

  opts.prepareToSend = function(url, data) {
    this.url = url;
    if (opts.method === 'POST') {
      this.headers['Content-Type'] = 'application/json; charset=UTF-8';
      this.headers['Content-Length'] = Buffer.byteLength(data, 'utf8');
      this.body = data;
    }
  };
  return opts;
};

var requestWithRetry = function(httpOpts, httpConfig, emit, attempts) {
  if(!attempts) { attempts = 1; }
  return request(httpOpts)
    .catch(function(err) {
      if( httpConfig.retries >= 0 &&
        (httpConfig.retries === 0 || (attempts -1) <= httpConfig.retries) &&
        (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT')) {
          emit('http', err.code, 'Lost http connection retrying in' + httpConfig.retryDelay + 'ms.', err);
          return Q
            .delay(httpConfig.retryDelay)
            .then(function() {
              return requestWithRetry(httpOpts, httpConfig, emit, attempts + 1);
            });
      } else {
        emit('http', err.code, 'Unexpected error.' , err);
        throw err;
      }
    });
};
exports.requestWithRetry = requestWithRetry;

var requestWithoutRetry = function(httpOpts, emit) {
  return request(httpOpts).catch(function(err) {
    emit('http', err.code, 'Unexpected error.' , err);
    throw err;
  });
};
exports.requestWithoutRetry = requestWithoutRetry;
