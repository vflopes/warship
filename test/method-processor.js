'use strict';
const Warship = require('../');

const warship = new Warship(
	{
		namespace:'test-warship'
	},
	{
		port:6379,
		host:'172.17.0.2'
		/*nodes:[
			{
				port:6379,
				host:'redis'
			}
		],
		maxRedirections:64*/
	}
);

warship.methods.sum.prepare().then(() => {
	warship.methods.sum.onAwait('message.pending', async (message) => {
		message = await message.load();
		message.payload = {z:message.payload.x+message.payload.y};
		await message.ack();
		await message.resolve();
		console.log('resolved');
	}).on('error.async', (event, error, message) => {
		console.log(`Event error "${event}": ${error.message}`);
	}).on('error', (error) => {
		console.log(`Error: ${error.message}`);
		console.log(error);
	}).run();
}).catch((error) => console.log(error));

