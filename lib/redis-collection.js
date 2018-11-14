'use strict';
const prepareIoredis = require('./prepare-ioredis.js');
prepareIoredis();

const IORedis = require('ioredis');
const EventEmitter = require('events');

class RedisCollection extends EventEmitter {

	constructor (options = {}) {

		super();
		this._options = Object.assign({}, options);
		this._options.enableReadyCheck = true;
		
		this._createClient = options.createClient || () => {
			if (this._options.nodes)
				return new IORedis.Cluster(this._options.nodes, this._options);
			return new IORedis(this._options);
		};

		this._clients = new Map();
		this._clientsProxy = new Proxy(
			this._clients,
			{
				get:(clients, name) => {
					if (!clients.has(name))
						clients.set(
							name, 
							this._bindClientEvents(
								name,
								this._createClient(this._options)
							)
						);
					return clients.get(name);
				},
				deleteProperty:(clients, name) => {
					if (!clients.has(name))
						return false;
					clients.delete(name);
					return true;
				}
			}
		);

	}

	get clients () {
		return this._clientsProxy;
	}

	_bindClientEvents (name, client) {
		[
			'connect',
			'ready',
			'error',
			'close',
			'reconnecting',
			'end'
		].forEach((event) => 
			client.on(
				event,
				(...args) =>
					this.emit(
						`client.${event}`,
						name,
						...args
					)
			)
		);
		return client;
	}

}

module.exports = RedisCollection;