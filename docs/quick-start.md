# Quick start

In this page we're going to cover all the concepts of **Warship** in simple steps making you able to build any type of environment for distributed computing and event sourcing. It's really easy and fast to build microservices with **Warship** 😃!

--------------------

#### 1 - Run Redis

There are two requirements to run **Warship**:

- NodeJS 10+
- Redis 5+

To run Redis using Docker:

```bash
docker run -d -p 6379:6379 redis:5
```

--------------------

#### 2 - Creating a Payload Issuer

Let's create a simple PI that issues two random numbers as payload:

```javascript
const Warship = require('@warshipjs/core');

const payloadIssuer = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});

payloadIssuer.receivers.myReceiver.on('out.divideByPI', (message) => {
	console.log(`The result is: ${message.payload.z}`)
}).fromOut('divideByPI').listen().then(() => {
	
	console.log('Listening for messages');

	setInterval(async () => {
		await payloadIssuer.message.sum({
			x:Math.random(),
			y:Math.random()
		}).forward();
		console.log('Payload issued');
	}, 1000);

}).catch((error) => console.log(error));

```

--------------------

#### 3 - Creating a Method Processor to sum numbers

```javascript
const Warship = require('@warshipjs/core');

const methodProcessor = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});

methodProcessor.methods.sum.prepare().then(() => {

	methodProcessor.methods.sum.onAwait('message.pending', async (message) => {
		console.log(`Message ${message.unique_id} received`);
		message = await message.load();
		message.payload = {z:message.payload.x+message.payload.y};
		await message.ack();
		message.method = 'divideByPI'
		await message.forward();
		console.log(`Message ${message.unique_id} resolved`);
	}).on('error.async', (event, error, message) => console.log(event, error, message.unique_id)).run();

}).catch((error) => console.log(error));

```

--------------------

#### 4 - Creating a Method Processor to divide a number by PI

```javascript
const Warship = require('@warshipjs/core');

const methodProcessor = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});

methodProcessor.methods.divideByPI.prepare().then(() => {

	methodProcessor.methods.divideByPI.onAwait('message.pending', async (message) => {
		console.log(`Message ${message.unique_id} received`);
		message = await message.load();
		message.payload = {z:message.payload.z/Math.PI};
		await message.ack();
		await message.resolve();
		console.log(`Message ${message.unique_id} resolved`);
	}).on('error.async', (event, error, message) => console.log(event, error, message.unique_id)).run();

}).catch((error) => console.log(error));

```

--------------------

#### 5 - And if you want to log all messages received by all MPs

```javascript
const Warship = require('@warshipjs/core');

const loggerListener = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});

loggerListener.receivers.inReceiver.onAwait('in.forwarded', async (message) => {
	await message.load('payload');
	console.log(`Method ${message.method} received payload from message ${message.unique_id}`, message.payload);
}).on('error.async', (event, error, message) => console.log(event, error, message.unique_id)).fromIn().listen().then(() => {
	console.log('Logging messages');
}).catch((error) => console.log(error));

```