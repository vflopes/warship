# AsyncEventEmitter

This class extends [EventEmitter](https://nodejs.org/docs/latest/api/events.html) from NodeJS and implements two methods to handle asynchronous event listeners.

---------------------------------

#### asyncEventEmitter.onAwait(eventName, asyncFunction)

Equivalent of **emitter.on** for asynchronous functions.

---------------------------------

#### asyncEventEmitter.onceAwait(eventName, asyncFunction)

Equivalent of **emitter.once** for asynchronous functions.

---------------------------------

#### Event: 'error.async'

This event is emitted when any asynchronous listener rejects. The first received parameter is the `eventName` rejected by listener, the second is the `error` returned by the rejection of the async function and other arguments are the parameters passed to listeners of the event. Example:

```javascript

const {AsyncEventEmitter} = require('@warshipjs/core');

const e = new AsyncEventEmitter();

e.onAwait('myEvent', async (data) => {
	throw new Error('Error!');
}).on('error.async', (eventName, error, data) => {
	console.log(`Event Name: ${eventName}`); // Event Name: myEvent
});

e.emit('myEvent', Math.random());

```