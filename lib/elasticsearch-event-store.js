'use strict';
const EventStore = require('./event-store.js');
const {encoding} = require('./short-keys.js');

class ElasticsearchEventStore extends EventStore {

	constructor (elasticsearch, {indexName} = {}) {
		super();
		this._elasticsearch = elasticsearch;
		this._getIndexName = typeof indexName === 'string' ?
			async () => indexName : indexName;
	}

	async drop (message, ttl = 0) {

		this.emit('drop', message, ttl);

		if (ttl > 0) {
			await this._redis.clients.dispatcherOperator.pexpire(
				`${this._namespace}:mid:${message.tracker_id}`,
				ttl
			);
			this.emit('dropped', message, ttl);
			return void 0;
		}

		await this._redis.clients.dispatcherOperator.del(
			`${this._namespace}:mid:${message.tracker_id}`,
			message.message_id
		);
		this.emit('dropped', message, ttl);

	}

	async getLastMessageId (message) {
		return await this._redis.clients.dispatcherOperator.get(
			`${this._namespace}:mid:${message.tracker_id}`
		);
	}

	async load (message, fields) {

		const parameters = {
			index:await this._getIndexName(message),
			type:'_doc',
			id:message.unique_id+':'+message.state
		};

		if (fields.length > 0)
			parameters._sourceInclude = fields;

		const response = await this._elasticsearch.get(parameters);

		Object.keys(response._source).forEach((field) => {
			if (!(field in encoding))
				return true;
			message[field] = response._source[field];
		});

	}

	async store (message, rename = true) {

		this.emit('store', message);

		const doc = message.toExpanded();
		doc.update_timestamp = Date.now();

		const parameters = {
			index:await this._getIndexName(message),
			type:'_doc',
			id:message.unique_id+':'+message.state,
			_source:false,
			refresh:'false',
			retryOnConflict:0,
			body:{
				doc,
				doc_as_upsert:true
			}
		};

		await this._elasticsearch.update(parameters);

		this.emit('stored', message);

		if (rename)
			await this.rename(message);

	}

	async rename (message, oldUniqueId) {
		this.emit('rename', message, oldUniqueId);
		await this._redis.clients.dispatcherOperator.set(
			`${this._namespace}:mid:${message.tracker_id}`,
			message.message_id
		);
		this.emit('renamed', message, oldUniqueId);
	}
}

ElasticsearchEventStore.mapping = {
	properties:{
		method:{
			type:'keyword'
		},
		payload:{
			enabled:false
		},
		state:{
			type:'keyword'
		},
		error:{
			type:'text'
		},
		alpha_code:{
			type:'keyword'
		},
		numeric_code:{
			type:'integer'
		},
		stack:{
			type:'text'
		},
		message_id:{
			type:'keyword'
		},
		stream_id:{
			type:'keyword'
		},
		tracker_id:{
			type:'keyword'
		},
		update_timestamp:{
			type:'date',
			format:'epoch_millis'
		},
		creation_timestamp:{
			type:'date',
			format:'epoch_millis'
		},
		retries:{
			type:'integer'
		},
		reply_to:{
			type:'keyword'
		},
		exclusive:{
			type:'boolean'
		}
	}
};

module.exports = ElasticsearchEventStore;