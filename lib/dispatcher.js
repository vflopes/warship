'use strict';
const shortid = require('shortid');
const {encoding, decoding} = require('./short-keys.js');

class Dispatcher {

	constructor (namespace, redis) {

		this._namespace = namespace;
		this._redis = redis;

	}

	async load (message, ...fields) {

		const messageKey = `${message.tracker_id}:${message.message_id}`;

		let loaded = null;

		if (fields.length === 0)
			loaded = await this._redis.clients.dispatcherOperator.hgetall(
				messageKey
			);
		else
			loaded = await this._redis.clients.dispatcherOperator.hmget(
				messageKey,
				...(fields.map((field) => encoding[field]))
			);

		loaded = loaded || {};

		for (const field in loaded) {
			switch (field) {
			case encoding.payload:
			case encoding.stack:
				loaded[field] = JSON.parse(loaded[field]);
				break;
			case encoding.numeric_code:
				loaded[field] = Number(loaded[field]);
				break;
			case encoding.update_timestamp:
			case encoding.creation_timestamp:
			case encoding.retries:
				loaded[field] = parseInt(loaded[field]);
				break;
			}
			message[decoding[field]] = loaded[field];
		}

		return message;

	}

	async update (message) {

		if (!('tracker_id' in message))
			message.tracker_id = shortid.generate();
		if (!('creation_timestamp' in message))
			message.creation_timestamp = Date.now();

		const messageKey = `${message.tracker_id}:${message.message_id}`;

		const data = [
			encoding.method, message.method,
			encoding.state, message.state,
			encoding.update_timestamp, Date.now(),
			encoding.creation_timestamp, message.creation_timestamp,
			encoding.payload, JSON.stringify(message.payload),
			encoding.retries, (message.retries || 0)
		];

		if ('stack' in message)
			data.push(JSON.stringify(message.stack));

		[
			'alpha_code',
			'numeric_code',
			'error'
		].forEach((field) => {
			if (field in message) {
				data.push(encoding[field]);
				data.push(message[field]);
			}
		});

		await this._redis.clients.dispatcherOperator.hmset(
			messageKey,
			...data
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

		message.stream_id = await this._redis.clients.dispatcherProducer.xadd(
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
				[encoding.stream_id]:message.stream_id
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