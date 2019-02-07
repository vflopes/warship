'use strict';
const shortid = require('shortid');
const ioredis = require('ioredis');
const {encoding, decoding} = require('./short-keys.js');

class Dispatcher {

	constructor (namespace, redis, {eventStore} = {}) {

		this._namespace = namespace;
		this._redis = redis;
		this._eventStore = eventStore || null;

	}

	async load (message, ...fields) {

		let loaded = null;

		if (!message.message_id) {

			if (this._eventStore) {

				message.message_id = await this._eventStore.getLastMessageId(message);

				if (!message.message_id)
					return message;

			} else {
				const foundKeys = await this._redis.clients.dispatcherOperator.keys(message.tracker_id+':*');

				if (!foundKeys || foundKeys.length === 0)
					return message;

				message.message_id = foundKeys[0].split(':').pop();
			}
		}

		if (this._eventStore) {
			await this._eventStore.load(message, fields);
			return message;
		} else if (fields.length === 0)
			loaded = await this._redis.clients.dispatcherOperator.hgetall(
				message.unique_id
			);
		else
			loaded = await this._redis.clients.dispatcherOperator.hmget(
				message.unique_id,
				...(fields.map((field) => encoding[field]))
			);

		loaded = loaded || {};

		if (Array.isArray(loaded)) {
			const object = {};
			for (let x = 0;x < fields.length;x++)
				object[encoding[fields[x]]] = loaded[x];
			loaded = object;
		}

		for (const field in loaded) {
			switch (field) {
			case encoding.payload:
			case encoding.stack:
			case encoding.reply_to:
				loaded[field] = JSON.parse(loaded[field]);
				break;
			case encoding.numeric_code:
				loaded[field] = Number(loaded[field]);
				break;
			case encoding.exclusive:
				loaded[field] = parseInt(loaded[field]) === 0 ? false : true;
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

		if (this._eventStore) {
			await this._eventStore.store(message);
			return message;
		}

		const data = [
			encoding.method, message.method,
			encoding.state, message.state,
			encoding.update_timestamp, Date.now(),
			encoding.creation_timestamp, message.creation_timestamp,
			encoding.payload, JSON.stringify(message.payload),
			encoding.retries, (message.retries || 0),
			encoding.reply_to, JSON.stringify(message.reply_to),
			encoding.exclusive, message.exclusive ? 1 : 0
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
			message.unique_id,
			...data
		);

		return message;

	}

	async giveBack (message) {

		let channelKey = `${this._namespace}:out:${message.method}:${message.tracker_id}`;
		let replyToIndex = 0;

		if (this._eventStore)
			await this._eventStore.store(message);
		else
			await this._redis.clients.dispatcherOperator.hmset(
				message.unique_id,
				encoding.method, message.method,
				encoding.state, message.state,
				encoding.retries, message.retries,
				encoding.update_timestamp, Date.now()
			);

		const serializedMessage = JSON.stringify(message.toShortened());

		do {

			if (replyToIndex > 0 || (replyToIndex === 0 && !message.exclusive))
				await this._redis.clients.dispatcherProducer.publish(channelKey, serializedMessage);

			channelKey = null;

			if (message.reply_to.length > replyToIndex) {
				channelKey = this._namespace+':'+message.reply_to[replyToIndex];
				replyToIndex++;
			}

		} while (channelKey !== null);

	}

	async generateMessageId (message) {

		let renameFromKey = null;

		if ('message_id' in message)
			renameFromKey = message.unique_id;

		message.message_id = shortid.generate();

		if (renameFromKey !== null && 'tracker_id' in message) {
			try {
				if (this._eventStore)
					await this._eventStore.rename(message);
				else
					await this._redis.clients.dispatcherOperator.renamenx(renameFromKey, message.unique_id);
			} catch (error) {
				if (error instanceof ioredis.ReplyError && error.message === 'ERR no such key')
					return message;
				throw error;
			}
		}

		return message;

	}

	async dispatch (message) {

		const channelKey = `${this._namespace}:in:${message.method}`;
		const methodKey = `${this._namespace}:${message.method}:in`;

		message.stream_id = await this._redis.clients.dispatcherProducer.xadd(
			methodKey, '*',
			encoding.tracker_id, message.tracker_id,
			encoding.message_id, message.message_id
		);

		await this._redis.clients.dispatcherProducer.publish(
			channelKey,
			JSON.stringify({
				[encoding.method]:message.method,
				[encoding.tracker_id]:message.tracker_id,
				[encoding.message_id]:message.message_id,
				[encoding.stream_id]:message.stream_id,
				[encoding.state]:message.state,
				[encoding.reply_to]:message.reply_to,
				[encoding.exclusive]:message.exclusive
			})
		);

		return message;

	}

	async drop (message, ttl = 0) {

		if (this._eventStore) {
			await this._eventStore.drop(message, ttl);
			return void 0;
		}

		if (ttl > 0) {
			await this._redis.clients.dispatcherOperator.pexpire(message.unique_id, ttl);
			return void 0;
		}

		await this._redis.clients.dispatcherOperator.del(message.unique_id);

	}

	async purge (message) {

		const methodKey = `${this._namespace}:${message.method}:in`;

		if (message.tracker_id && message.message_id && !this._eventStore)
			await this._redis.clients.dispatcherOperator.del(message.unique_id);
		if (message.stream_id)
			await this._redis.clients.dispatcherProducer.xdel(methodKey, message.stream_id);

	}

}

module.exports = Dispatcher;