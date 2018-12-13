'use strict';
const AsyncEventEmitter = require('./async-event-emitter.js');

const DEFAULT_COUNT = 10;
const DEFAULT_MESSAGE_TIMEOUT = 1800000;
const DEFAULT_MAX_RETRIES = 3;

class Claimer extends AsyncEventEmitter {

	constructor({
		streamName,
		groupName,
		consumerName,
		count,
		messageTimeout,
		maxRetries
	}, redis) {

		super();
		this._streamName = streamName;
		this._groupName = groupName;
		this._consumerName = consumerName;
		this._messageTimeout = messageTimeout || DEFAULT_MESSAGE_TIMEOUT;
		this._maxRetries = maxRetries || DEFAULT_MAX_RETRIES;
		this._startId = '-';
		this._count = count || DEFAULT_COUNT;
		this._redis = redis;

		this._clientName = this._consumerName+'_claimer';

		this._interval = null;
		this._isRunning = false;

	}

	async _filterPendingMessages () {

		const pendingMessages = await this._redis.clients[this._clientName].xpending(
			this._streamName,
			this._groupName,
			this._startId,
			'+',
			this._count
		);

		if (pendingMessages.length === 0)
			return [[], null];

		const filteredPendingMessages = pendingMessages.filter(
			(pendingMessage) => pendingMessage.elapsedMilliseconds >= this._messageTimeout
		);

		return [
			filteredPendingMessages,
			filteredPendingMessages.length === 0
				? null
				: filteredPendingMessages[filteredPendingMessages.length-1]
		];

	}

	async _checkForTimedOutMessages () {

		var pendingMessages;
		var lastMessage;

		do {

			[pendingMessages, lastMessage] = await this._filterPendingMessages();

			if (lastMessage === null)
				break;

			this._startId = lastMessage.id;

			for (const pendingMessage of pendingMessages) {

				if (pendingMessage.deliveryCount >= this._maxRetries) {
					await this._redis.clients[this._clientName].xdel(
						this._streamName,
						pendingMessage.id
					);
					this.emit('drop', pendingMessage);
					continue;
				}

				const [claimedMessage] = await this._redis.clients[this._clientName].xclaim(
					this._streamName,
					this._groupName,
					this._consumerName,
					this._messageTimeout,
					pendingMessage.id,
					'RETRYCOUNT',
					pendingMessage.deliveryCount+1
				);

				if (claimedMessage)
					this.emit('claim', claimedMessage);

			}

		} while(pendingMessages !== false);

	}

	run () {

		if (this._interval)
			return this;

		this._interval = setInterval(async () => {
			try {

				if (this._isRunning)
					return void 0;

				this._isRunning = true;

				try {
					await this._checkForTimedOutMessages();
				} catch (error) {
					if (error.message.includes('is closed') && !this._isRunning)
						return void 0;
					throw error;
				}

			} catch (error) {
				this.emit('error', error);
			} finally {
				this._isRunning = false;
			}
		}, this._messageTimeout);

		return this;

	}

	async stop (force = false, stopClients = true) {

		if (this._interval) {
			clearInterval(this._interval);
			this._interval = null;
		}

		this._isRunning = false;

		if (!stopClients)
			return void 0;

		if (force) {
			this._redis.clients[this._clientName].disconnect(false);
			return void 0;
		}

		await this._redis.clients[this._clientName].quit();

	}

}

module.exports = Claimer;