'use strict';
const EventStore = require('./event-store.js');
const RedisEventStore = require('./redis-event-store.js');
const ElasticsearchEventStore = require('./elasticsearch-event-store.js');

class RelasticEventStore extends EventStore {


	constructor (redisCollection, elasticsearch, options = {}) {
		super();
		this._options = {
			loadFrom:'redis',
			waitForStore:false,
			...options
		};
		this._redisEventStore = new RedisEventStore(redisCollection);
		this._elasticsearchEventStore = new ElasticsearchEventStore(elasticsearch, options);

		this.drop = this._redisEventStore.drop.bind(this._redisEventStore);
		this.getLastMessageId = this._redisEventStore.getLastMessageId.bind(this._redisEventStore);
		this.rename = this._redisEventStore.rename.bind(this._redisEventStore);

		if (this._options.loadFrom === 'redis')
			this.load = this._redisEventStore.load.bind(this._redisEventStore);
		else if (this._options.loadFrom === 'elasticsearch')
			this.load = this._elasticsearchEventStore.load.bind(this._elasticsearchEventStore);
		else
			throw new Error(`Uknown source to load events: ${this._options.loadFrom}`);

	}

	inject ({redis, namespace}) {
		this._namespace = namespace;
		this._redis = redis;
		this._redisEventStore.inject({redis, namespace});
		this._elasticsearchEventStore.inject({redis, namespace});
	}

	async store (message) {

		this.emit('store', message);

		await this._redisEventStore.store(message);

		this.emit('cached', message);

		if (this._options.waitForStore) {
			await this._elasticsearchEventStore.store(message, false);
			this.emit('stored', message);
			return void 0;
		}

		this._elasticsearchEventStore.store(message, false).then(() => {
			this.emit('stored', message);
		}).catch((error) => {
			error.sourceMessage = message;
			this.emit('error', error);
		});

	}

}

module.exports = RelasticEventStore;