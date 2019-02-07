'use strict';
const os = require('os');
const shortid = require('shortid');
const AsyncEventEmitter = require('./async-event-emitter.js');
const {encoding} = require('./short-keys.js');
const messageFactory = require('./message-factory.js');
const Claimer = require('./claimer.js');
const crypto = require('crypto');

class MethodProcessor extends AsyncEventEmitter {

	constructor ({namespace, name, methods, groupName}, redis) {

		super();
		this._namespace = namespace;
		this._name = name || os.hostname()+':'+shortid.generate();
		this._redis = redis;
		this._pendingAcks = 0;
		this._isRunning = false;
		this._canRun = false;
		this._claimer = null;
		this.configure({methods, groupName});
		this._processorClientName = `methodProcessor_${this._name}`;

	}

	get claimer () {
		return this._claimer;
	}

	get pendingAcks () {
		return this._pendingAcks;
	}

	get isRunning () {
		return this._isRunning;
	}

	_getStreamName (method) {
		return `${this._namespace}:${method}:in`;
	}

	async ack (message) {

		if (!this._options.methods.includes(message.method))
			throw new Error(`Invalid message method for this processor, expected "${this._options.methods.join(' or ')}", received "${message.method}"`);

		if (this._pendingAcks === 0)
			return 0;

		const streamName = this._getStreamName(message.method);

		await this._redis.clients[this._processorClientName].xack(
			streamName,
			this._options.groupName,
			message.stream_id
		);

		this._pendingAcks--;

		if (this._canRun && this._pendingAcks === 0)
			this.run();

		return this._pendingAcks;

	}

	configure (options = {}) {

		if (options.methods) {
			const methodHash = crypto.createHash('sha1');
			methodHash.update(options.methods.sort().join(''));
			this._methodHash = methodHash.digest('hex');
			options.groupName = `${this._namespace}:group:${this._methodHash}`;
			options.streamsNames = options.methods.map((method) => this._getStreamName(method));
		}

		this._options = Object.assign({
			count:10,
			block:1000
		}, this._options || {}, options);

		if (!this._redis.hasClient(this._processorClientName))
			this._redis.clients[this._processorClientName].on('close', () => {
				this._canRun = false;
				this._isRunning = false;
				this.emit('close');
			});

		if (
			this._options.claimerOptions
			&& this._options.groupName
			&& this._options.streamsNames
		) {
			this._claimer = new Claimer(Object.assign({
				streamsNames:this._options.streamsNames,
				groupName:this._options.groupName,
				consumerName:this._name
			}, this._options.claimerOptions), this._redis);

			this._claimer.on('claim', (message) => {
				this._pendingAcks++;
				const {id, data} = message;
				data[encoding.stream_id] = id;
				data[encoding.state] = encoding.forwarded;
				this.emit('message.received', messageFactory(data));
			});
		}

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

	_scheduleRun () {
		process.nextTick(() => {
			if (this._canRun)
				this.run();
		});
		return this;
	}

	async _run () {

		if (!this._canRun)
			return 0;

		if (this._redis.clients[this._processorClientName].status !== 'ready') {
			this._scheduleRun();
			return 0;
		}

		const messages = await this._redis.clients[this._processorClientName].xreadgroup(
			'group',
			this._options.groupName,
			this._name,
			'count',
			this._options.count,
			'block',
			this._options.block,
			'streams',
			...this._options.streamsNames,
			...this._options.streamsNames.map(() => '>')
		);

		if (messages) {
			let messageCount = 0;
			for (const streamName of Object.keys(messages)) {
				this._pendingAcks += messages[streamName].length;
				for (const {id, data} of messages[streamName]) {
					const [, method] = streamName.split(':');
					data[encoding.stream_id] = id;
					data[encoding.method] = method;
					data[encoding.state] = encoding.forwarded;
					this.emit('message.received', messageFactory(Object.assign(data, {acknowledged:false})));
				}
				messageCount++;
			}
			return messageCount;
		}

		this._scheduleRun();
		return 0;

	}

	async prepare (fromId = '$') {

		try {
			for (const streamName of this._options.streamsNames)
				await this._redis.clients[this._processorClientName].xgroup(
					'create',
					streamName,
					this._options.groupName,
					fromId,
					'mkstream'
				);
		} catch (error) {
			if (error.message.includes('BUSYGROUP'))
				return void 0;
			throw error;
		}

	}

	async stop (force = false, stopClients = true) {

		if (this._claimer)
			await this._claimer.stop(force, stopClients);

		if (!this._canRun)
			return void 0;

		this._canRun = false;

		if (!stopClients)
			return void 0;

		if (force) {
			this._redis.clients[this._processorClientName].disconnect(false);
			return void 0;
		}

		await this._redis.clients[this._processorClientName].quit();

	}

}

module.exports = MethodProcessor;