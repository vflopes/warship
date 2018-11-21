# Dispatcher

Dispatcher is a helper class that handles the interaction of Redis with Warship. Rarely you'll need to use this class directly.

---------------------------------

#### dispatcher.load(message[, ...fields])

This is an asynchronous method to load messages from cache. The first parameter must be a [Message](api-documentation/message.md) with the `unique_id` defined to load the message. If `fields` are specified then only those fields are loaded, otherwise all fields are loaded.

---------------------------------

#### dispatcher.update(message)

Updates the cache of the message in Redis. This method is asynchronous.

---------------------------------

#### dispatcher.giveBack(message)

Publishes the resulting state of a message (resolved or rejected). This method is asynchronous.

---------------------------------

#### dispatcher.dispatch(message)

Dispatches a message into the Redis stream of a method, it's effectively forwarding a message. This method is asynchronous.

---------------------------------

#### dispatcher.drop(message[, ttl])

Drops or defines the expiration of a message in milliseconds. If the `ttl` is not specified or is 0 then the message cache is dropped immediately. This method is asynchronous.