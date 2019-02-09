'use strict';
const EventStore = require('./event-store.js');
const {encoding, decoding} = require('./short-keys.js');

class RedisEventStore extends EventStore {

	constructor (redisCollection = null) {
		super();
		this._needReplaceRedis = redisCollection === null;
		this._redisCollection = redisCollection;
	}

	async drop (message, ttl = 0) {

		this.emit('drop', message, ttl);

		if (ttl > 0) {
			await this._redisCollection.clients.dispatcherOperator.pexpire(message.unique_id, ttl);
			this.emit('dropped', message, ttl);
			return void 0;
		}

		await this._redisCollection.clients.dispatcherOperator.del(message.unique_id);
		this.emit('dropped', message, ttl);

	}

	inject ({redis, namespace}) {
		this._namespace = namespace;
		this._redis = redis;
		if (this._needReplaceRedis)
			this._redisCollection = redis;
	}

	async getLastMessageId (message) {

		const foundKeys = await this._redisCollection.clients.dispatcherOperator.keys(message.tracker_id+':*');

		if (!foundKeys || foundKeys.length === 0)
			return null;

		return foundKeys[0].split(':').pop();

	}

	async load (message, fields) {

		let loaded = null;

		if (fields.length === 0)
			loaded = await this._redisCollection.clients.dispatcherOperator.hgetall(
				message.unique_id
			);
		else
			loaded = await this._redisCollection.clients.dispatcherOperator.hmget(
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

	}

	async store (message) {

		this.emit('store', message);

		const data = [
			encoding.update_timestamp, Date.now(),
			encoding.retries, (message.retries || 0),
			encoding.exclusive, message.exclusive ? 1 : 0
		];

		if ('payload' in message)
			data.push(encoding.payload, JSON.stringify(message.payload));
		if ('stack' in message)
			data.push(encoding.stack, JSON.stringify(message.stack));
		if ('reply_to' in message)
			data.push(encoding.reply_to, JSON.stringify(message.reply_to));

		[
			'creation_timestamp',
			'state',
			'method',
			'alpha_code',
			'numeric_code',
			'error'
		].forEach((field) => {
			if (field in message) {
				data.push(encoding[field]);
				data.push(message[field]);
			}
		});

		await this._redisCollection.clients.dispatcherOperator.hmset(
			message.unique_id,
			...data
		);

		this.emit('stored', message);

	}

	async rename (message, oldUniqueId) {
		this.emit('rename', message, oldUniqueId);
		await this._redisCollection.clients.dispatcherOperator.renamenx(
			oldUniqueId,
			message.unique_id
		);
		this.emit('renamed', message, oldUniqueId);
	}
}

module.exports = RedisEventStore;