'use strict';
const shortid = require('shortid');
const ioredis = require('ioredis');
const {encoding} = require('./short-keys.js');

class Dispatcher {

	constructor (namespace, redis, {eventStore} = {}) {

		this._namespace = namespace;
		this._redis = redis;
		this._eventStore = eventStore || null;

	}

	async load (message, ...fields) {

		if (!message.message_id) {
			message.message_id = await this._eventStore.getLastMessageId(message);

			if (!message.message_id)
				return message;
		}

		await this._eventStore.load(message, fields);

		return message;

	}

	async update (message) {

		if (!('tracker_id' in message))
			message.tracker_id = shortid.generate();
		if (!('creation_timestamp' in message))
			message.creation_timestamp = Date.now();

		await this._eventStore.store(message);

		return message;

	}

	async giveBack (message) {

		let channelKey = `${this._namespace}:out:${message.method}:${message.tracker_id}`;
		let replyToIndex = 0;

		await this._eventStore.store(message);

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
				await this._eventStore.rename(message, renameFromKey);
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

		await this._eventStore.drop(message, ttl);

	}

	async purge (message) {

		const methodKey = `${this._namespace}:${message.method}:in`;

		if (message.tracker_id && message.message_id && !this._eventStore)
			await this._eventStore.drop(message, 0);
		if (message.stream_id)
			await this._redis.clients.dispatcherProducer.xdel(methodKey, message.stream_id);

	}

}

module.exports = Dispatcher;