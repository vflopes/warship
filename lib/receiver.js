'use strict';
const AsyncEventEmitter = require('./async-event-emitter.js');
const {decoding} = require('./short-keys.js');
const messageFactory = require('./message-factory.js');
const shortid = require('shortid');

class Receiver extends AsyncEventEmitter {

	constructor ({namespace, name, messageDecorator}, redis) {

		super();
		this._namespace = namespace;
		this._name = name;
		this._messageDecorator = messageDecorator;
		this._redis = redis;
		this._isListening = false;
		this._methods = new Set();
		this._messages = new Map();
		this._channels = new Set();
		this._subscribedCommitChannels = new Set();

	}

	get isListening () {
		return this._isListening;
	}

	_getNames () {
		return {
			receiverClient:`receiverListener_${this._name}`,
			commitClient:`commitListener_${this._name}`
		};
	}

	_from (direction, ...methods) {

		if (this._isListening)
			throw new Error(`Receiver "${this._name}" is already listening for out events`);

		if (methods.length === 0) {
			this._methods.add(`${this._namespace}:${direction}:*`);
			return this;
		}

		const suffix = direction === 'out' ? ':*' : '';

		methods.forEach((method) => this._methods.add(`${this._namespace}:${direction}:${method}${suffix}`));

		return this;

	}

	fromIn (...methods) {
		return this._from('in', ...methods);
	}

	fromOut (...methods) {
		return this._from('out', ...methods);
	}

	fromChannels (...channels) {
		for (const channel of channels)
			this._channels.add(this._namespace+':'+channel);
		return this;
	}

	reset () {
		this._methods = new Set();
		this._channels = new Set();
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

		const channelsKeys = Array.from(this._methods).concat(Array.from(this._channels));

		await this._redis.clients[receiverClient].psubscribe(...channelsKeys);

		this._redis.clients[receiverClient].on('pmessage', (pattern, channel, shortenedMessage) => {
			const message = this._messageDecorator(messageFactory(JSON.parse(shortenedMessage)));
			let [, direction] = channel.split(':');
			direction = (direction === 'out' || direction === 'in') ? direction : 'out';
			const method = message.method;
			const state = decoding[message.state];
			this.emit(direction+'.'+state, message);
			this.emit(direction+'.'+method, message);
			this.emit(direction+'.'+state+':'+method, message);
		});

	}

	async commit (message, ...args) {

		if (!('tracker_id' in message))
			message.tracker_id = shortid.generate();

		let commitOptions = {
			keepHistory:false,
			timeout:null,
			channelName:`${this._namespace}:out:${message.method}:${message.tracker_id}`,
			unsubscribe:false
		};

		if (typeof args[0] === 'object')
			commitOptions = Object.assign(commitOptions, args[0]);
		else if (typeof args[0] === 'boolean') {
			commitOptions.keepHistory = args[0];
			commitOptions.timeout = args[1] || null;
		}

		const {commitClient} = this._getNames();

		if (!this._redis.hasClient(commitClient)) {
			this._redis.clients[commitClient].on('message', (channel, shortenedMessage) => {
				const outMessage = this._messageDecorator(messageFactory(JSON.parse(shortenedMessage)));
				let [, direction] = channel.split(':');
				direction = (direction === 'out' || direction === 'in') ? direction : 'out';
				const eventName = `${direction}.${outMessage.method}:${outMessage.tracker_id}`;
				this.emit(eventName, outMessage);
			}).on('close', () => {
				this._isListening = false;
				this.emit('close');
			});
		}

		try {
			if (!this._subscribedCommitChannels.has(commitOptions.channelName)) {
				await this._redis.clients[commitClient].subscribe(commitOptions.channelName);
				this._subscribedCommitChannels.add(commitOptions.channelName);
			}
		} catch (error) {
			message.error = error.message;
			message.stack = error.stack;
			throw message;
		}

		return new Promise((resolve, reject) => {
			const eventName = `out.${message.method}:${message.tracker_id}`;
			let abortTimeout = null;
			const listener = async (outMessage) => {
				if (abortTimeout)
					clearTimeout(abortTimeout);
				try {
					if (commitOptions.unsubscribe) {
						await this._redis.clients[commitClient].unsubscribe(commitOptions.channelName);
						this._subscribedCommitChannels.delete(commitOptions.channelName);
					}
				} catch (error) {
					outMessage.error = error.message;
					outMessage.stack = error.stack;
					return reject(outMessage);
				}
				if (outMessage.isRejected())
					return reject(outMessage);
				resolve(outMessage);
			};
			this.once(eventName, listener);
			message.forward(commitOptions.keepHistory).then(() => {
				if (commitOptions.timeout) {
					abortTimeout = setTimeout(() => {
						this.removeListener(eventName, listener);
						message.abort().then(() => {
							message.alpha_code = 'ETIMEOUT';
							reject(message);
						}).catch((error) => {
							message.error = error.message;
							message.stack = error.stack;
							reject(message);
						});
					}, commitOptions.timeout);
				}
			}).catch((error) => {
				this.removeListener(eventName, listener);
				message.error = error.message;
				message.stack = error.stack;
				reject(message);
			});
		});

	}


	async stop (force = false) {

		if (!this._isListening)
			return void 0;

		this._isListening = false;

		const {receiverClient, commitClient} = this._getNames();

		if (force) {
			if (this._redis.hasClient(receiverClient))
				this._redis.clients[receiverClient].disconnect(false);
			if (this._redis.hasClient(commitClient))
				this._redis.clients[commitClient].disconnect(false);
			return void 0;
		}

		if (this._redis.hasClient(receiverClient))
			await this._redis.clients[receiverClient].quit();
		if (this._redis.hasClient(commitClient))
			await this._redis.clients[commitClient].quit();

	}

}

module.exports = Receiver;