# Message

Message is not a class, is an object proxied to encode/decode using short keys when any property is accessed. In this page we're going to cover the properties and decorated methods.

---------------------------------

#### message.method

The method to process the payload of the message. Must be a `string`.

---------------------------------

#### message.payload

The payload of the message. Can be any valid JavaScript type.

---------------------------------

#### message.state

The state of the message, is a string shortened by short keys. Can be any of the states presented below:

```javascript
const {shortKeys} = require('@warship/core');

switch (message.state) {
	case shortKeys.encoding.pending:
	break;
	case shortKeys.encoding.forwarded:
	break;
	case shortKeys.encoding.rejected:
	break;
	case shortKeys.encoding.resolved:
	break;
}
```

---------------------------------

#### message.error

String representing the error of a rejected message.

---------------------------------

#### message.alpha_code

Alpha-numeric code representing the state of the message.

---------------------------------

#### message.numeric_code

Numeric code representing the state of the message. If defined, must be a `number`.

---------------------------------

#### message.stack

Stack of the error if the message is rejected, can be a `string` or an `array`.

---------------------------------

#### message.message_id

Alpha-numeric ID of the message mutable by each step of the message on the processing flow, this ID is generated every time the message is forwarded. The string is URL-safe.

---------------------------------

#### message.stream_id

The ID returned by the Redis stream where the message was added.

---------------------------------

#### message.tracker_id

Alpha-numeric immutable ID of the message, this ID is generated once the message is created. The string is URL-safe and the composition of `${message.tracker_id}:${message.message_id}` is the unique ID of the message (`unique_id`).

---------------------------------

#### message.unique_id

Alpha-numeric unique ID of the message, this property is read-only.

---------------------------------

#### message.update_timestamp

Last time (UNIX epoch in ms) that the payload of the message was updated. Every time the message is forwarded this timestamp is updated.

---------------------------------

#### message.creation_timestamp

The timestamp (UNIX epoch in ms) of the creation of the message.

---------------------------------

#### message.retries

Number of retries after message was rejected. A retry is counted every time a rejected message is forwarded.

---------------------------------

#### message.toShortened()

Returns the raw object with shortened keys (a.k.a encoded object).

---------------------------------

#### message.toExpanded()

Returns the raw object with expanded keys (a.k.a decoded object).

---------------------------------

#### <small>decorated:</small> message.ack()

An asynchronous function to acknowledge a message. This is an alias to call `MethodProcessor.ack()`. This method is only decorated when the message is emitted by a `'message.pending'` event from `Warship` or `MethodProcessor` class.

---------------------------------

#### <small>decorated:</small> message.load([...fields])

Loads message from forward state cache. The arguments are fields of the message to load, if none is specified then all the fields are loaded. This method is an alias to call `Dispatcher.load()`. This method is asynchronous.

---------------------------------

#### <small>decorated:</small> message.forward()

Asynchrononous function to forward the message to a method.

---------------------------------

#### <small>decorated:</small> message.reject([ttl])

Rejects a message, the TTL is the number of milliseconds to keep the last message forward cache, the default value is 0 (expire immediately). This method is asynchronous.

---------------------------------

#### <small>decorated:</small> message.resolve([ttl])

Resolves a message, the TTL is the number of milliseconds to keep the last message forward cache, the default value is 0 (expire immediately). This method is asynchronous.