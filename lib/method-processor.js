'use strict';
const os = require('os');
const shortid = require('shortid');
const AsyncEventEmitter = require('./async-event-emitter.js');
const {encoding} = require('./short-keys.js');
const messageFactory = require('./message-factory.js');

class MethodProcessor extends AsyncEventEmitter {

	constructor ({namespace, name}, redis) {

		super();
		this._namespace = namespace;
		this._name = name || os.hostname()+':'+shortid.generate();
		this._redis = redis;
		this._pendingAcks = 0;
		this._isRunning = false;
		this._canRun = false;
		this.configure();

	}

	get pendingAcks () {
		return this._pendingAcks;
	}

	get isRunning () {
		return this._isRunning;
	}

	_getNames () {
		return {
			method:this._options.method,
			processorClient:`methodProcessor_${this._options.method}`,
			streamName:`${this._namespace}:${this._options.method}:in`,
			groupName:`${this._namespace}:group:${this._options.method}`
		};
	}

	async ack (message) {
		if (message.method !== this._options.method)
			throw new Error(`Invalid message method for this processor, expected "${this._options.method}", received "${message.method}"`);
		if (this._pendingAcks === 0)
			return 0;
		const {processorClient, streamName, groupName} = this._getNames();
		await this._redis.clients[processorClient].xack(
			streamName,
			groupName,
			message.stream_id
		);
		this._pendingAcks--;
		if (this._canRun && this._pendingAcks === 0)
			this.run();
		return this._pendingAcks;
	}

	configure (options = {}) {
		this._options = Object.assign({
			count:10,
			block:1000
		}, this._options || {}, options);
		return this;
	}

	run () {
		this._canRun = true;
		if (this._isRunning)
			return this;
		this._isRunning = true;
		this._run()
			.then((count) => this.emit('processing', count))
			.catch((error) => this.emit('error', error))
			.finally(() => this._isRunning = false);
		return this;
	}

	async _run () {
		if (!this._canRun)
			return 0;
		const {processorClient, streamName, groupName} = this._getNames();
		const messages = await this._redis.clients[processorClient].xreadgroup(
			'group',
			groupName,
			this._name,
			'count',
			this._options.count,
			'block',
			this._options.block,
			'streams',
			streamName,
			'>'
		);
		if (
			messages
			&& Reflect.has(messages, streamName)
			&& messages[streamName].length > 0
		) {
			this._pendingAcks += messages[streamName].length;
			for (const {id, data} of messages[streamName]) {
				data[encoding.stream_id] = id;
				this.emit('message.received', messageFactory(data));
			}
			return messages[streamName].length;
		}
		process.nextTick(() => {
			if (this._canRun)
				this.run();
		});
		return 0;
	}

	async prepare (fromId = '$') {
		try {
			const {processorClient, streamName, groupName} = this._getNames();
			await this._redis.clients[processorClient].xgroup('create', streamName, groupName, fromId, 'mkstream');
		} catch (error) {
			if (error.message.includes('BUSYGROUP'))
				return void 0;
			throw error;
		}
	}

	async stop (force = false) {

		if (!this._canRun)
			return void 0;

		this._canRun = false;

		const {processorClient} = this._getNames();

		if (force) {
			this._redis.clients[processorClient].disconnect(false);
			return void 0;
		}

		await this._redis.clients[processorClient].quit();

	}

}

module.exports = MethodProcessor;