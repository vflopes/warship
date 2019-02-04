# MethodProcessor

This class represents a method in the **Warship** namespace. Methods are units of business logic and data processing services. We don't call services because a service can have multiple methods to provide an contextualized functionality. This class extends [AsyncEventEmitter](api-documentation/async-event-emitter.md).

---------------------------------

#### methodProcessor.claimer

Return the instance of [Claimer](api-documentation/claimer.md) or null if it was not configured.

---------------------------------

#### methodProcessor.pendingAcks

Number of pending acknowledgements from messages.

---------------------------------

#### methodProcessor.isRunning

A boolean indicating if the the method processor is running.

---------------------------------

#### methodProcessor.ack(message)

Acknowledges a message, this method is asynchronous. When a message is acknowledged it leaves the occupied counter from `pendingAcks`.

---------------------------------

#### methodProcessor.configure([options])

This method configures the `MethodProcessor` instance. The returned value is a reference to the instance itself and valid options are:

- `count` - number of maximum parallel messages being processed (a.k.a maximum `pendingAcks` value). The default value is `10`.
- `block` - time to block the [XREADGROUP](https://redis.io/commands/xreadgroup) command sent to Redis. See the `BLOCK` parameter in Redis documentation. The default value is `1000` milliseconds (1 second).
- `claimerOptions` - if specified as an object, this value will be passed to the [Claimer](api-documentation/claimer.md) constructor as the first parameter that will be availabe through `methodProcessor.claimer`, otherwise this property will be null.
- `groupName` - the consumer group name that will be used to receive messages from methods streams, if not specified, the class will generate an unique hash of methods supported by the MP.

---------------------------------

#### methodProcessor.run()

Starts the processor, the returned value is a reference to the instance itself.

---------------------------------

#### methodProcessor.prepare([fromId])

Prepares Redis to run the processor (creates the required consumer group). The `fromId` argument is the `id-or-$` value of the [XGROUP CREATE](https://redis.io/commands/xgroup) command and the default value is `$`. This method is asynchronous and must be called before `MethodProcessor.run()`.

---------------------------------

#### methodProcessor.stop([force[, stopClients]])

Stops the processor. The `force` argument indicates if the processor should close the connections with Redis immediately and the default value is `false`. The `stopClients` parameter will also stop all clients connected to Redis, the default value is `true`. This method is asynchronous.

---------------------------------

#### Events: 'message.pending:[method]'

Emmitted when a new pending message is received to be processed.