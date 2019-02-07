'use strict';
const EventEmitter = require('eventemitter3');

class AsyncEventEmitter extends EventEmitter {

	constructor () {
		super();
	}

	_wrapAsyncListener (type, event, asyncListener) {
		this[type](event, (...args) => asyncListener(...args).catch((error) => this.emit('error.async', event, error, ...args)));
		return this;
	}

	onceAwait (event, asyncListener) {
		return this._wrapAsyncListener('once', event, asyncListener);
	}

	onAwait (event, asyncListener) {
		return this._wrapAsyncListener('on', event, asyncListener);
	}

}

module.exports = AsyncEventEmitter;