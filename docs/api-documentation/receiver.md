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

#### receiver.fromChannels([...channels])

Prepare the receiver to listen custom channels. This is very useful to ensure that resolved/reject messages are returned to single payload issuer. Messages with **reply_to** channels keep publishing in normal **out** channels unless you set `message.exclusive` to `true`.

```javascript
await receiver.onAwait('out.sum', async (message) => {
	// Do something with the message.
}).fromChannels('sumCustom').listen();

const message = payloadIssuer.message.sum({x:1,y:2});
message.reply_to.push('sumCustom');
await message.forward();
```

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

#### receiver.commit(message[, keepHistory[, timeout]])
###### overload: receiver.commit(message[, options])

This method is used to commit a message through Warship. It's like the `.forward()` method but it resolves the returned promise when the message is resolved or rejected by a method processor. The **timeout** parameter is the number of milliseconds to wait for the message to be resolved or rejected before call to abort. If the message is aborted the `alpha_code` property will be set to `'ETIMEOUT'`.

The `options` object accepts the following properties:

- `keepHistory`
- `timeout`
- `channelName` - the channel name which the message will be received, the default channel is the internal channel name used by Warship MPs to publish resolved/rejected messages, it can be used for messages with `reply_to` specification.
- `unsubscribe` - this parameter tells to receiver to unsubscribe the commit Redis client from the channel after the message is received, only set this parameter to `true` if your application will not commit messages with the same method, the default value is `false`.

```javascript
const resolvedOrRejectedMessage = await receiver.commit(message);
```

---------------------------------

#### Events: '[in|out].[state]', '[in|out].[method]', '[in|out].[state]:[method]'

All these events are fired with a decorated message (see [Message](api-documentation/message.md)) when a new event from channel is received by Receiver's subscriber.

```javascript
receiver.onAwait('out.resolved:myMethod', async (message) => {
	// do something with the resolved message
}).fromOut('myMethod').listen().catch((error) => console.log(error));
```