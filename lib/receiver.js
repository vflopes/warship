'use strict';
const EventEmitter = require('events');
const {decoding} = require('./short-keys.js');
const messageFactory = require('./message-factory.js');

class Receiver extends EventEmitter {

	constructor ({namespace,name}, redis) {

		super();
		this._namespace = namespace;
		this._name = name;
		this._redis = redis;
		this._isListening = false;

	}

	get isListening () {
		return this._isListening;
	}

	async listen (...methods) {

		if (this._isListening)
			throw new Error(`Receiver "${this._name}" is already listening for out events`);

		this._isListening = true;

		const receiverClient = `receiverListener_${this._name}`;

		const channelsKeys = methods.map((method) => `${this._namespace}:out:${method}`);

		if (channelsKeys.length === 0)
			channelsKeys.push(`${this._namespace}:out:*`);
		
		await this._redis.clients[receiverClient].psubscribe(...channelsKeys);

		this._redis.clients[receiverClient].on('pmessage', (pattern, channel, shortenedMessage) => {
			const message = messageFactory(JSON.parse(shortenedMessage));
			const method = channel.split(':').pop();
			const state = decoding[message.state];
			this.emit(state, message);
			this.emit(state+':'+method, message);
		});

	}

	async stop (force = false) {

		if (!this._isListening)
			return void 0;

		this._isListening = false;

		const receiverClient = `receiverListener_${this._name}`;

		if (force) {
			this._redis.clients.disconnect(false);
			return void 0;
		}

		await this._redis.clients[receiverClient].quit();

	}

}

module.exports = Receiver;