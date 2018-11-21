# RedisCollection

This class represents a collection of connections from `ioredis` that uses the same configuration to setup a `Redis` or `Cluster` instance. This class extends `EventEmitter`.

---------------------------------

#### redis.clients

This attribute is a `Proxy` representing an object that when any property is accessed a new or existing Redis client is created/returned. The identifier of the client is the property name.

```javascript
redis.clients.myClient.set('key', 'value').catch((error) => console.log(error));
// or
redis.clients['myClient'].set('key', 'value').catch((error) => console.log(error));
```

---------------------------------

#### redis.hasClient(name)

Returns a boolean indicating if the collection have certain client identified by the property name.

---------------------------------

#### redis.stop([force])

This is an asynchronous method to stop all the clients of the collection. The `force` argument indicate if the `RedisCollection` should call `client.disconnect(false)` (`force = true`) or `client.quit()` (`force = false`, the default value).

---------------------------------

#### Event: 'connect'

This event is re-emitted when an `ioredis` instance emits `'connect'`. The first argument received by listener is the name of the client that emitted the event and other arguments are the same emitted by the client.

---------------------------------

#### Event: 'ready'

This event is re-emitted when an `ioredis` instance emits `'ready'`. The first argument received by listener is the name of the client that emitted the event and other arguments are the same emitted by the client.

---------------------------------

#### Event: 'error'

This event is re-emitted when an `ioredis` instance emits `'error'`. The first argument received by listener is the name of the client that emitted the event and other arguments are the same emitted by the client.

---------------------------------

#### Event: 'close'

This event is re-emitted when an `ioredis` instance emits `'close'`. The first argument received by listener is the name of the client that emitted the event and other arguments are the same emitted by the client.

---------------------------------

#### Event: 'reconnecting'

This event is re-emitted when an `ioredis` instance emits `'reconnecting'`. The first argument received by listener is the name of the client that emitted the event and other arguments are the same emitted by the client.

---------------------------------

#### Event: 'end'

This event is re-emitted when an `ioredis` instance emits `'end'`. The first argument received by listener is the name of the client that emitted the event and other arguments are the same emitted by the client.