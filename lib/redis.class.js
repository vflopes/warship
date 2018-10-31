'use strict';
const redis = require('redis');
const util = require('util');

class Redis {

	constructor (replicate = false) {

		this._createClient()._buildCommandsProxy();

		this._commandsProxy = null;
		this._commands = {};
		this._client = null;
		this._replicas = new Map();

		if (replicate && process.env.REDIS_REPLICA_COUNT) {
			for (let number = 0;number < parseInt(process.env.REDIS_REPLICA_COUNT); number++)
				this._createClient(number);
		}

	}

	get client () {
		return this._client;
	}

	get commands () {
		return this._commandsProxy;
	}

	_ensureAsyncCommand (command) {		

		if (!Reflect.has(this._commands, command))
			this._commands[command] = util.promisify(this._client[command]).bind(this._client);

		return this;

	}

	_buildCommandsProxy () {

		this._commandsProxy = new Proxy(
			this._commands,
			{
				get:(commands, command) => {

					this._ensureAsyncCommand(command);

					return this._commands[command];

				}
			}
		);

		return this;
	}

	_createClient (number = null) {

		const index = number === null ? '' : '_'+number;

		const methodKey = `REDIS_CONNECTION_METHOD${index}`;
		const defaultOptions = {
			string_numbers:null,
			return_buffers:false,
			detect_buffers:false,
			socket_keepalive:process.env[`REDIS_KEEPALIVE${index}`] === 'true',
			enable_offline_queue:false,
			db:process.env[`REDIS_DB${index}`]|| '0'
		};

		let client;

		switch (process.env[methodKey]) {
			case 'host':
				client = redis.createClient(Object.assign(defaultOptions, {
					host:process.env[`REDIS_HOST${index}`] || '127.0.0.1',
					port:process.env[`REDIS_PORT${index}`] || 6379
				}));
				break;
			case 'unix':
				client = redis.createClient(Object.assign(defaultOptions, {
					path:process.env[`REDIS_UNIX_PATH${index}`]
				}));
				break;
			default:
				throw new Error(`Unknown redis connection method (${methodKey}): ${process.env[methodKey]}`);
		}

		if (number === null) {
			this._client = client;
			return this;
		}

		this._replicas.set(number, client);

		return this;

	}

}

module.exports = Redis;