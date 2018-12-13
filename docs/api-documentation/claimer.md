# Claimer

**Claimer** is a class to claim (or drop) stuck messages from others instances of the same **MP**. There are two policies to claim messages (using the [XCLAIM](https://redis.io/commands/xclaim) command): number of retries and last time the message was delivered (idle time).

---------------------------------

#### new Claimer(options, redis)

You don't need to care about instantiating a Claimer directly, it'll be done using the `MethodProcessor.configure()` method. The `claimerOptions` passed to this method will be the first parameter of the constructor, and this object is composed by the following properties:

- `count` - the number of messages retrieved by the `XPENDING` command, this command is used to check for timed out messages, the default value is `10`.
- `messageTimeout` - this property is the number of milliseconds to consider a message as "timed out" and avaible to be claimed by the **MP**, the default value is `1800000`.
- `maxRetries` - this property is the number of maximum retries of claiming the message, when the number of retries reaches this value the message will be dropped and the `'drop'` event will be emitted.

---------------------------------

#### claimer.run()

This method starts the Claimer to watch for timed out messages, the returned value is a reference to the instance itself.

---------------------------------

#### claimer.stop([force[, stopClients]])

This method stops the Claimer interval. The `force` argument indicates if the processor should close the connections with Redis immediately and the default value is `false`. The `stopClients` parameter will also stop all clients connected to Redis, the default value is `true`. This method is asynchronous.

---------------------------------

#### Event: 'drop'

This event is emitted when a message reaches the maximum retries number, and the argument passed to the listener is an object with the message returned by the `XPENDING` command.

---------------------------------

#### Event: 'claim'

This event is emitted when a message is claimed, the argument passed to the listener is an object with the claimed message returned by `XCLAIN` command.