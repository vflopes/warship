# ElasticsearchEventStore

**ElasticsearchEventStore** is an EventStore that implements Elasticsearch as persistence layer for messages. Elasticsearch as EventStore is relatively slower than Redis, but it have some advantages over in-memory store:

- Messages can persists forever while in Redis Warship have to clean message's history to keep the memory usage low.
- You can perform search over your messages.
- It's a logging system *per se*.
- It's the real implementation of the event sourcing paradigm because you can reproduce the state of your application replaying all events emitted.

---------------------------------

#### new ElasticsearchEventStore(client, options)

- `client` - must be an instance of [elasticsearch.Client](https://www.npmjs.com/package/elasticsearch)
- `options.indexName` - can be a string with the index name to store the messages or an async function that receives a message as argument and returns the index name as a string.

---------------------------------

#### ElasticsearchEventStore.mapping

An object with the suggested mapping for the index that will store the messages.