'use strict';
const AsyncEventEmitter = require('./async-event-emitter.js');
const {decoding} = require('./short-keys.js');
const messageFactory = require('./message-factory.js');

class Receiver extends AsyncEventEmitter {

	constructor ({namespace, name, messageDecorator}, redis) {

		super();
		this._namespace = namespace;
		this._name = name;
		this._messageDecorator = messageDecorator;
		this._redis = redis;
		this._isListening = false;
		this._methods = new Set();

	}

	get isListening () {
		return this._isListening;
	}

	_getNames () {
		return {
			receiverClient:`receiverListener_${this._name}`
		};
	}

	_from (direction, ...methods) {

		if (this._isListening)
			throw new Error(`Receiver "${this._name}" is already listening for out events`);

		if (methods.length === 0) {
			this._methods.add(`${this._namespace}:${direction}:*`);
			return this;
		}

		methods.forEach((method) => this._methods.add(`${this._namespace}:${direction}:${method}`));

		return this;

	}

	fromIn (...methods) {
		return this._from('in', ...methods);
	}

	fromOut (...methods) {
		return this._from('out', ...methods);
	}

	reset () {
		this._methods = new Set();
		return this;
	}

	async listen () {

		if (this._isListening)
			throw new Error(`Receiver "${this._name}" is already listening for out events`);

		this._isListening = true;

		const {receiverClient} = this._getNames();

		if (!this._redis.hasClient(receiverClient))
			this._redis.clients[receiverClient].on('close', () => {
				this._isListening = false;
				this.emit('close');
			});

		const channelsKeys = Array.from(this._methods);

		await this._redis.clients[receiverClient].psubscribe(...channelsKeys);

		this._redis.clients[receiverClient].on('pmessage', (pattern, channel, shortenedMessage) => {
			const message = this._messageDecorator(messageFactory(JSON.parse(shortenedMessage)));
			const [, direction, method] = channel.split(':');
			const state = decoding[message.state];
			this.emit(direction+'.'+state, message);
			this.emit(direction+'.'+method, message);
			this.emit(direction+'.'+state+':'+method, message);
		});

	}

	async stop (force = false) {

		if (!this._isListening)
			return void 0;

		this._isListening = false;

		const {receiverClient} = this._getNames();

		if (force) {
			this._redis.clients[receiverClient].disconnect(false);
			return void 0;
		}

		await this._redis.clients[receiverClient].quit();

	}

}

module.exports = Receiver;