'use strict';
const EventEmitter = require('events');
const shortid = require('shortid');
const Receiver = require('./lib/receiver.js');
const Messenger = require('./lib/messenger.js');
const RedisCollection = require('./lib/redis-collection.js');
const MethodProcessor = require('./lib/method-processor.js');

class Warship extends EventEmitter {

	constructor ({namespace} = {}, redisOptions = {}) {

		super();
		this._namespace = namespace || 'warship';
		this._redis = new RedisCollection(redisOptions);
		this._messenger = new Messenger({namespace:this._namespace}, this._redis);
		this._receiversProxy = new Proxy(
			new Map(),
			{
				get:(receivers, name) => {
					if (!receivers.has(name))
						receivers.set(
							name, 
							new Receiver(
								{
									namespace:this._namespace,
									name
								},
								this._redis
							)
						);
					return receivers.get(name);
				}
			}
		);
		this._methodsProxy = new Proxy(
			new Map(),
			{
				get:(receivers, name) => {
					if (!receivers.has(name)) {
						const processor = new MethodProcessor(
							{
								namespace:this._namespace,
								name:name+':'+shortid.generate()
							},
							this._redis
						);
						processor.configure({method:name}).on('message', (message) => {
							message.ack = async () => await processor.ack(message);
							message.forward = async () => await this._messenger.forward(message);
							message.resolve = async (ttl = 0) => await this._messenger.resolve(message, ttl);
							message.reject = async (ttl = 0) => await this._messenger.reject(message, ttl);
						});
						receivers.set(
							name,
							processor
						);
					}
					return receivers.get(name);
				}
			}
		);

	}

	get receivers () {
		return this._receiversProxy;
	}

	get methods () {
		return this._methodsProxy;
	}

	get messenger () {
		return this._messenger;
	}

	get redis () {
		return this._redis;
	}

}

module.exports = Warship;