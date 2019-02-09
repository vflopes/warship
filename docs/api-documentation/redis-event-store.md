# RedisEventStore

**RedisEventStore** is the default event store of Warship. It's the fastest event store.

---------------------------------

#### new RedisEventStore([redisCollection])

- `redisCollection` - must be an instance of [RedisCollection](api-documentation/redis-collection.md) or `null`, if `null` then Warship will inject the collection used to handle Redis clients.