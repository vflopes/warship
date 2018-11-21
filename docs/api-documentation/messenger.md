# Messenger

**Messenger** is a class to handle the states of the messages from endpoints. This class is used to decorate messages and you'll rarely need to use the class directly.

---------------------------------

#### messenger.dispatcher

Returns the [Dispatcher](api-documentation/dispatcher.md) used by **Messenger** instance.

---------------------------------

#### messenger.forward(message)

This is an asynchronous function to forward messages to methods. The resolution of the function is the message itself.

---------------------------------

#### messenger.reject(message[, ttl])

This is an asynchronous function to reject messages. The `ttl` parameter is optional and specifies the value in milliseconds to expire the last saved state of the forwarded message, the default value i 0 (expire immediately).

---------------------------------

#### messenger.resolve(message[, ttl])

This is an asynchronous function to resolve messages. The `ttl` parameter is optional and specifies the value in milliseconds to expire the last saved state of the forwarded message, the default value i 0 (expire immediately).