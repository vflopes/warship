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

const message = warship.message.sum({x:1, y:2});


warship.receivers.sum.onAwait('sum', async (message) => {
	//await message.load();
	console.log(message.payload);
}).on('error.async', (error) => console.log(error)).listen('sum').then(() => {
	console.log('listening for sum feedback');
	message.forward().then(() => console.log('Message forwarded: '+message.tracker_id+':'+message.message_id)).catch((error) => console.log(error));
}).catch((error) => console.log(error));