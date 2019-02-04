'use strict';
const shortid = require('shortid');
const AsyncEventEmitter = require('./lib/async-event-emitter.js');
const Receiver = require('./lib/receiver.js');
const Messenger = require('./lib/messenger.js');
const RedisCollection = require('./lib/redis-collection.js');
const MethodProcessor = require('./lib/method-processor.js');
const messageFactory = require('./lib/message-factory.js');
const shortKeys = require('./lib/short-keys.js');

var Redlock = null;

try {
	Redlock = require.main.require('redlock');
} catch (error) {}

class Warship extends AsyncEventEmitter {

	constructor ({namespace, redlockOptions} = {}, redisOptions = {}) {

		super();
		this._namespace = namespace || 'warship';
		this._redisOptions = redisOptions;
		this._customDecorator = null;
		this._redlockOptions = redlockOptions || {};
		this.reset();

	}

	setCustomMessageDecorator (customDecorator = null) {
		this._customDecorator = customDecorator;
		return this;
	}

	_messageDecorator (message, {processor} = {}) {
		if (processor)
			message.ack = async () => {
				message.acknowledged = true;
				await processor.ack(message);
			};
		message.load = async (...fields) => await this._messenger.dispatcher.load(message, ...fields);
		message.forward = async (keepHistory = false) => await this._messenger.forward(message, keepHistory);
		message.abort = async () => await this._messenger.abort(message);
		message.resolve = async (ttl = 0) => {
			if (!message.isAcknowledged())
				await message.ack();
			await this._messenger.resolve(message, ttl);
		};
		message.reject = async (ttl = 0) => {
			if (!message.isAcknowledged())
				await message.ack();
			await this._messenger.reject(message, ttl);
		};
		if (this._redlock)
			message.lock = async (ttl, lockName = 'global') => await this._redlock.lock(
				`${this._namespace}:lock:${message.tracker_id}:${lockName}`,
				ttl
			);
		if (this._customDecorator)
			return this._customDecorator(message, {
				warship:this,
				processor
			});
		return message;
	}

	get message () {
		return this._messageProxy;
	}

	get receivers () {
		return this._receiversProxy;
	}

	get methods () {
		return this._methodsProxy;
	}

	get messenger () {
		return this._messenger;
	}

	get redis () {
		return this._redis;
	}

	async stop (force = false) {
		for (const [, processor] of this._methods)
			await processor.stop(force, false);
		await this._redis.stop(force);
	}

	createMethodProcessor (groupName, methods) {
		const processor = new MethodProcessor(
			{
				namespace:this._namespace,
				name:groupName+':'+shortid.generate(),
				groupName,
				methods
			},
			this._redis
		);
		processor.on('message.received', (message) => {
			this._messageDecorator(message, {processor});
			this.emit('message.pending', message);
			processor.emit('message.pending', message);
			processor.emit('message.pending:'+message.method, message);
		});
		this._methods.set(
			groupName,
			processor
		);
		return processor;
	}

	reset () {

		this._redis = new RedisCollection(this._redisOptions);
		this._messenger = new Messenger({namespace:this._namespace}, this._redis);

		this._receiversProxy = new Proxy(
			new Map(),
			{
				get:(receivers, name) => {
					if (!receivers.has(name))
						receivers.set(
							name,
							new Receiver(
								{
									namespace:this._namespace,
									messageDecorator:(message) => this._messageDecorator(message),
									name
								},
								this._redis
							)
						);
					return receivers.get(name);
				}
			}
		);

		this._methods = new Map();
		this._methodsProxy = new Proxy(
			this._methods,
			{
				get:(processors, name) => {

					if (!processors.has(name))
						return this.createMethodProcessor(name, [name]);

					return processors.get(name);
				}
			}
		);

		this._messageProxy = new Proxy(
			{},
			{
				get:(target, method) => (payload = null) => {
					const message = messageFactory({method, payload, acknowledged:false}, false);
					message.forward =
						async (keepHistory = false) =>
							await this._messenger.forward(message, keepHistory);
					message.load =
						async (...fields) =>
							await this._messenger.dispatcher.load(message, ...fields);
					message.abort = async () => await this._messenger.abort(message);
					return message;
				}
			}
		);

		if (Redlock)
			this._redlock = new Redlock([this._redis.clients.locker], this._redlockOptions);

		return this;
	}

}

Warship.shortKeys = shortKeys;
Warship.AsyncEventEmitter = AsyncEventEmitter;

module.exports = Warship;