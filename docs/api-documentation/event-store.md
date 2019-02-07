# EventStore

**EventStore** is a class to handle the persistence layer of messages. This class is just an interface to be extended by implementations of persistence mechanisms. This class extends [AsyncEventEmitter](api-documentation/async-event-emitter.md). **All methods of this class must be asynchronous (async).**

---------------------------------

#### eventStore.drop(message[, ttl = 0])

This method is called when a message is dropped from cache, normally when a method processor emits an ack.

---------------------------------

#### eventStore.getLastMessageId(message)

This method is must return the last known `message_id` using the `tracker_id` value from message.

---------------------------------

#### eventStore.load(message, fields)

This method is called to load messages. If the `fields` parameter is empty, all the fields must be loaded.

---------------------------------

#### eventStore.store(message)

This method is called when the message is stored (inserted or updated).

---------------------------------

#### eventStore.rename(message)

This method is called when the `message_id` value from message is renewed.