# Receiver

`Receiver` is a class to listen for events from channels of Redis Pub/Sub. There are two main categories of channels: **in** and **out**.

- **in** - messages are published without the payload only announcing that message was forwarded to a method and added to a Redis stream.
- **out** - messages are published with the payload announcing that the message was resolved or rejected.

The channels names follow the pattern: `[namespace]:[in|out]:[method]`.

This class extends [AsyncEventEmitter](api-documentation/async-event-emitter.md).

---------------------------------

#### receiver.isListening

Boolean indicating if the receiver is listening.

---------------------------------

#### receiver.fromIn([...methods])

Prepare the receiver to listen **in** channels from specified methods. If no method is specified then receiver will subscribe into all **in** methods. The returned value is a reference to `Receiver` itself.

---------------------------------

#### receiver.fromOut([...methods])

Prepare the receiver to listen **out** channels from specified methods. If no method is specified then receiver will subscribe into all **out** methods. The returned value is a reference to `Receiver` itself.

---------------------------------

#### receiver.reset()

Resets the channels from previous calls to `receiver.fromOut()` and/or `receiver.fromIn()`. The returned value is a reference to `Receiver` itself.

---------------------------------

#### receiver.listen()

This is an asynchronous method to put the receiver into subscribed mode. From this point the events of `Receiver` start to be emitted.

---------------------------------

#### receiver.stop(force)

Stops the receiver (unsubscribe from channels). The `force` argument tells the receiver to force the Redis connection closure and the default value is `false`. This method is asynchronous.

---------------------------------

#### receiver.processed(message[, method])

This is an asynchronous method to await for messages to be resolved or rejected, you can optionally specify a method which the message should be resolved or rejected.

```javascript
receiver.processed(message).then(() => console.log(message.state)).catch(() => console.log('canceled'));
```

---------------------------------

#### receiver.cancel(message[, method])

This method cancel all `Receiver.processed` calls from a message (by `tracker_id`), optionally you can cancel only for the specified method. The `Receiver.processed` will be rejected without error.

```javascript
receiver.processed(message).catch(() => console.log('canceled'));
receiver.cancel(message);
```

---------------------------------

#### Events: '[in|out].[state]', '[in|out].[method]', '[in|out].[state]:[method]'

All these events are fired with a decorated message (see [Message](api-documentation/message.md)) when a new event from channel is received by Receiver's subscriber.

```javascript
receiver.onAwait('out.resolved:myMethod', async (message) => {
	// do something with the resolved message
}).fromOut('myMethod').listen().catch((error) => console.log(error));
```