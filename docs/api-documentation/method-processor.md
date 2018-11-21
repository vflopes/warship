# MethodProcessor

This class represents a method in the **Warship** namespace. Methods are units of business logic and data processing services. We don't call services because a service can have multiple methods to provide an contextualized functionality. This class extends [AsyncEventEmitter](api-documentation/async-event-emitter.md).

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

---------------------------------

#### methodProcessor.run()

Starts the processor, the returned value is a reference to the instance itself.

---------------------------------

#### methodProcessor.prepare([fromId])

Prepares Redis to run the processor (creates the required consumer group). The `fromId` argument is the `id-or-$` value of the [XGROUP CREATE](https://redis.io/commands/xgroup) command and the default value is `$`. This method is asynchronous and must be called before `MethodProcessor.run()`.

---------------------------------

#### methodProcessor.stop([force])

Stops the processor. The `force` argument indicates if the processor should close the connections with Redis immediately and the default value is `false`. This method is asynchronous.

