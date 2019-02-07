'use strict';
const AsyncEventEmitter = require('./async-event-emitter.js');

class EventStore extends AsyncEventEmitter {

	constructor () {
		super();
	}

	inject ({redis, namespace}) {
		this._namespace = namespace;
		this._redis = redis;
	}

	async drop (message, ttl = 0) {
		throw new Error('Undefined method for EventStore interface: drop');
	}

	async getLastMessageId (message) {
		throw new Error('Undefined method for EventStore interface: getLastMessageId');
	}

	async load (message, fields) {
		throw new Error('Undefined method for EventStore interface: load');
	}

	async store (message) {
		throw new Error('Undefined method for EventStore interface: store');
	}

	async rename (message) {
		throw new Error('Undefined method for EventStore interface: rename');
	}

}

module.exports = EventStore;