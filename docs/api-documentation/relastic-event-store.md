# RelasticEventStore

**RelasticEventStore** is an event store that combines Elasticsearch and Redis to handle event sourcing in Warship. This event store provides performance and persistence for messages transactions but will cause some network overload due to the communication with both persistence layers.

---------------------------------

#### new RelasticEventStore(redisCollection, elasticsearchClient, options)

- `redisCollection` - must be an instance of [RedisCollection](api-documentation/redis-collection.md) or `null`, if `null` then Warship will inject the collection used to handle Redis clients.
- `elasticsearchClient` - must be an instance of [elasticsearch.Client](https://www.npmjs.com/package/elasticsearch)
- `options` - this object will be passed to [ElasticsearchEventStore](api-documentation/elasticsearch-event-store.md)
- `options.loadFrom` - this option is a string that can be `'redis'` or `'elasticsearch'` and tells to event store from which persistence endpoint the messages should be loaded, the default value is `'redis'`.
- `options.waitForStore` - a boolean that tells if the event store must wait for messages to be stored in Elasticsearch, the behavior when this values is `'false'` is to wait only for Redis and asynchronous store messages into Elasticsearch, otherwise the `RelasticEventStore.store()` will wait for Redis and Elasticsearch, the default value is `'false'`.