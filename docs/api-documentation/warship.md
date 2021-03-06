# Warship

The main class exported by this package is the [Warship](api-documentation/warship.md). This class uses other class to compose a representation of endpoint that is able to operate as a MP (method processor) or PI (payload issuer) or both.

---------------------------------

#### new Warship([options], [redisOptions])

The first argument is an object with options to build new instance of warship.

- `namespace` - this option must be a string to prefix the keys used by Warship in Redis. The default value is `'warship'`.
- `redlockOptions` - options to be passed to `Redlock` if you have installed [redlock](https://www.npmjs.com/package/redlock) into your project.
- `eventStore` - you can use this option to specify a custom `EventStore`.

The second argument is passed directly to [ioredis](https://github.com/luin/ioredis/) with addition of:

- `createClient` - a function that must return a instance of `Redis` or `Cluster` from **ioredis**. This function receives `redisOptions` as argument.
- `nodes` - if this property is present as an array of objects then a `Cluster` instance is created each time a conection to Redis is required by Warship.

---------------------------------

#### Warship.shortKeys

This is an object with two properties:

- `encoding` - keys are the expanded keys and values the short keys.
- `decoding` - keys are the short keys and values the expanded keys.

These keys are used to encode and decode objects and keys before passing to Redis. This strategy reduces the overhead of the data structure used by Warship.

---------------------------------

#### Warship.AsyncEventEmitter

Constructor of [AsyncEventEmitter](api-documentation/async-event-emitter.md).

---------------------------------

#### Warship.EventStore

Constructor of [EventStore](api-documentation/event-store.md).

---------------------------------

#### Warship.ElasticsearchEventStore

Constructor of [ElasticsearchEventStore](api-documentation/elasticsearch-event-store.md).

---------------------------------

#### warship.message

This **Proxy** is a [Message](api-documentation/message.md) instance builder. The only methods decorated in the message are `forward()` and `load()`. The name accessed in this **Proxy** is used as the method name of the message:

```javascript
const myPayload = {x:Math.random()};
const message = warship.message.someMethod(myPayload);
message.forward().catch((error) => console.log(error));
```

---------------------------------

#### warship.receivers

This **Proxy** is a [Receiver](api-documentation/receiver.md) instance builder.

---------------------------------

#### warship.methods

This **Proxy** is a [MethodProcessor](api-documentation/method-processor.md) instance builder.

---------------------------------

#### warship.createMethodProcessor(groupName, methods)

Creates a method processor. The `groupName` is the key used to access the MP through `warship.methods` proxy. The difference between using directly the proxy and creating a method processor with this method is that you can manipulate the `groupName` and with one connection receive messages from multiple methods, when using the proxy to create a MP, one connection is used to handle messages from one stream and the `groupName` will be generated by Warship. The returned value is the created MP.

---------------------------------

#### warship.messenger

A instance of [Messenger](api-documentation/messenger.md) used by Warship to communicate messages with Redis.

---------------------------------

#### warship.redis

A instance of [RedisCollection](api-documentation/redis-collection.md) used by Warship to handle all the instances of `Redis` or `Cluster` from **ioredis**.

---------------------------------

#### warship.stop([force])

This method stops the **RedisCollection** and all the open connections. This method is an alias to `warship.redis.stop([force])`. The default value of `force` is `false`. This method is asynchronous and the resolution of the **Promise** returns void.

---------------------------------

#### warship.reset()

Calling this method resets all the instances and proxies of Warship. **Avoid calling this method, there are rare cases that a instance of Warship must be reused after it was stopped.**

---------------------------------

#### Event: 'message.pending'

The event is triggered every time a **MethodProcessor** receives a new message and the event **message.received** is fired. The Warship instance decorates the message with all methods decribed in [Message](api-documentation/message.md) and pass the message as argument for listeners of this event. This is an alternative to listen for the same event directly from a **MethodProcessor** instance.

```javascript
warship.onAwait('message.pending', async (message) => {
	message.payload = 'My process result';
	await message.ack();
	await message.forward();
});
```