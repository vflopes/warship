'use strict';
const shortid = require('shortid');
const {encoding,decoding} = require('./short-keys.js');
const Dispatcher = require('./dispatcher.js');

class Messenger {

	constructor ({namespace}, redis) {

		this._redis = redis;
		this._dispatcher = new Dispatcher(namespace, redis);

	}

	async reject (message, ttl = 0) {

		const currentMessage = await this._dispatcher.load(message, 'state');

		if (!currentMessage.state) 
			throw new Error(`This message does not exist: ${message.tracker_id}:${message.message_id}`);
		else if (message.state !== encoding.forwarded)
			throw new Error(`Only forwarded messages can be rejected: ${message.tracker_id}:${message.message_id} is ${decoding[message.state]}`);

		message.state = encoding.rejected;

		await this._dispatcher.giveBack(message);
		await this._dispatcher.drop(message, ttl);

	}

	async resolve (message, ttl = 0) {

		const currentMessage = await this._dispatcher.load(message, 'state');

		if (!currentMessage.state) 
			throw new Error(`This message does not exist: ${message.tracker_id}:${message.message_id}`);
		else if (currentMessage.state !== encoding.forwarded)
			throw new Error(`Only forwarded messages can be resolved: ${message.tracker_id}:${message.message_id} is ${decoding[message.state]}`);

		message.state = encoding.resolved;

		await this._dispatcher.giveBack(message);
		await this._dispatcher.drop(message, ttl);

	}

	async forward (message) {

		if (message.state === encoding.rejected) {
			if (!('retries' in message))
				message.retries = 0;
			message.retries++;
		} else if (message.state === encoding.resolved)
			throw new Error(`Resolved messages can't be forwarded: ${message.tracker_id}:${message.message_id}`)
		
		message.message_id = shortid.generate();
		message.state = encoding.forwarded;
		message = await this._dispatcher.update(message);
		return await this._dispatcher.dispatch(message);

	}

}

module.exports = Messenger;