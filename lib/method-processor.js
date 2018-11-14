'use strict';
const os = require('os');
const shortid = require('shortid');
const EventEmitter = require('events');
const {encoding} = require('./short-keys.js');
const messageFactory = require('./message-factory.js');

class MethodProcessor extends EventEmitter {

	constructor ({namespace,name}, redis) {

		super();
		this._namespace = namespace;
		this._name = name || os.hostname()+':'+shortid.generate();
		this._redis = redis;
		this._pendingAcks = 0;
		this._isRunning = false;
		this.configure();

	}

	get pendingAcks () {
		return this._pendingAcks;
	}

	get isRunning () {
		return this._isRunning;
	}

	async ack (message) {

		if (message.method !== this._options.method)
			throw new Error(`Invalid message method for this processor, expected "${this._options.method}", received "${message.method}"`)

		if (this._pendingAcks === 0)
			return 0;

		const processorClient = `methodProcessor_${this._options.method}`;

		await this._redis.clients[processorClient].xack(
			`${this._namespace}:${this._options.method}:in`,
			`${this._namespace}:group:${this._options.method}`,
			message.stream_id
		);

		this._pendingAcks--;

		if (this._pendingAcks === 0)
			this.run();

		return this._pendingAcks;

	}

	configure (options = {}) {

		this._options = Object.assign({
			count:10,
			block:0
		}, this._options || {}, options);

		return this;

	}

	run () {

		if (this._isRunning)
			return this;

		this._isRunning = true;

		this._run()
			.then((count) => this.emit('processing', count))
			.catch((error) => this.emit('error', error))
			.finally(() => this._isRunning = false);

	}

	async _run () {

		const method = this._options.method;
		const processorClient = `methodProcessor_${method}`;
		const streamName = `${this._namespace}:${method}:in`;

		const messages = await this._redis.clients[processorClient].xreadgroup(
			'group',
			`${this._namespace}:group:${method}`,
			this._name,
			'count',
			this._options.count,
			'block',
			this._options.block,
			'streams',
			streamName
		);

		if (
			messages
			&& Reflect.has(messages, streamName)
			&& messages[streamName].length > 0
		) {
			this._pendingAcks += messages[streamName].length;
			for (const {id,data} of messages[streamName]) {
				data[encoding.stream_id] = id;
				this.emit('message', messageFactory(data));
			}
			return messages[streamName].length;
		}

		process.nextTick(() => this.run());
		return 0;

	}

	async prepare () {

		const method = this._options.method;
		const processorClient = `methodProcessor_${method}`;
		const streamName = `${this._namespace}:${method}:in`;
		const groupName =`${this._namespace}:group:${method}`;

	}

}

module.exports = MethodProcessor;