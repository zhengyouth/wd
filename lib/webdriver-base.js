var EventEmitter = require('events').EventEmitter,
    util = require( 'util' );

// configUrl: url object constructed via url.parse
var BaseWebdriver = module.exports = function() {
  EventEmitter.call( this );
};

//inherit from EventEmitter
util.inherits( BaseWebdriver, EventEmitter );
