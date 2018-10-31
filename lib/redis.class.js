'use strict';
const redis = require('redis');
const util = require('util');

class Redis {

	constructor () {

		this._createClient();
		this._commands = {};

	}

	get client () {
		return this._client;
	}

	command (command) {

		if (!Reflect.has(this._commands, command))
			this._commands[command] = util.promisify(this._client.get).bind(this._client);

		return this._commands[command];

	}

	_createClient () {

		const defaultOptions = {
			string_numbers:null,
			return_buffers:false,
			detect_buffers:false,
			socket_keepalive:process.env.REDIS_KEEPALIVE === 'true',
			enable_offline_queue:false,
			db:process.env.REDIS_DB || '0'
		};

		switch (process.env.REDIS_CONNECTION_METHOD) {
			case 'host':
				this._client = redis.createClient(Object.assign(defaultOptions, {
					host:process.env.REDIS_HOST || '127.0.0.1',
					port:process.env.REDIS_PORT || 6379
				}));
				break;
			case 'unix':
				this._client = redis.createClient(Object.assign(defaultOptions, {
					path:process.env.REDIS_UNIX_PATH
				}));
				break;
			default:
				throw new Error(`Unknown redis connection method: ${process.env.REDIS_CONNECTION_METHOD}`);
		}

		return this;

	}

}

module.exports = Redis;