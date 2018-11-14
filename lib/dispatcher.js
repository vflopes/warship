'use strict';
const shortid = require('shortid');
const {encoding} = require('./short-keys.js');
const messageFactory = require('./message-factory.js');

class Dispatcher {

	constructor (namespace, redis) {

		this._namespace = namespace;
		this._redis = redis;

	}

	async load (message, ...fields) {

		const messageKey = `${message.tracker_id}:${message.message_id}`;

		let loaded = null;
		
		if (fields.length === 0)
			loaded = await this._redis.clients.dispatcherOperator.hmget(
				messageKey,
				...(fields.map((field) => encoding[field]))
			);
		else
			loaded = await this._redis.clients.dispatcherOperator.hmget(
				messageKey,
				...(fields.map((field) => encoding[field]))
			);

		return loaded ? messageFactory(loaded) : messageFactory({});

	}

	async update (message) {

		if (!('tracker_id' in message))
			message.tracker_id = shortid.generate();
		if (!('creation_timestamp' in message))
			message.creation_timestamp = Date.now();

		const messageKey = `${message.tracker_id}:${message.message_id}`;

		await this._redis.clients.dispatcherOperator.hmset(
			messageKey,
			encoding.method, message.method,
			encoding.update_timestamp, Date.now(),
			encoding.creation_timestamp, message.creation_timestamp,
			encoding.payload, JSON.stringify(message.payload),
			encoding.retries, (message.retries || 0)
		);

		return message;

	}

	async giveBack (message) {

		const channelKey = `${this._namespace}:out:${message.method}`;

		await this._redis.clients.dispatcherPublisher.publish(channelKey, JSON.stringify(message.toShortened()));

	}

	async dispatch (message) {

		const channelKey = `${this._namespace}:in:${message.method}`;
		const methodKey = `${this._namespace}:${message.method}:in`;

		const streamId = await this._redis.clients.dispatcherProducer.xadd(
			methodKey, '*',
			encoding.tracker_id, message.tracker_id,
			encoding.message_id, message.message_id
		);

		await this._redis.clients.dispatcherPublisher.publish(
			channelKey,
			JSON.stringify({
				[encoding.method]:message.method,
				[encoding.tracker_id]:message.tracker_id,
				[encoding.message_id]:message.message_id,
				[encoding.stream_id]:streamId
			})
		);

		return message;

	}

	async drop (message, ttl = 0) {

		const messageKey = `${message.tracker_id}:${message.message_id}`;

		if (ttl > 0) {
			await this._redis.clients.dispatcherOperator.pexpire(messageKey, ttl);
			return void 0;
		}

		await this._redis.clients.dispatcherOperator.del(messageKey);

	}

}

module.exports = Dispatcher;