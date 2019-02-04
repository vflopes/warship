'use strict';
const Warship = require('../');
const {expect} = require('chai');

describe('Custom Channel', function () {

	var methodProcessor;
	var payloadIssuer;

	beforeEach(async function () {
		methodProcessor = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});
		payloadIssuer = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});
		await methodProcessor.methods.sumCustomChannel.prepare();
	});

	afterEach(async function () {
		await methodProcessor.stop();
		await payloadIssuer.stop();
	});

	it('Should receive message feedback', function (done) {

		const payload = {
			x:Math.random(),
			y:Math.random()
		};

		methodProcessor.methods.sumCustomChannel.onAwait('message.pending', async (message) => {
			message = await message.load();
			message.payload = {z:message.payload.x+message.payload.y};
			await message.ack();
			await message.resolve();
		}).on('error.async', (event, error) => done(error)).run();

		payloadIssuer.receivers.sum.onAwait('out.sumCustomChannel', async (message) => {
			expect(message.payload).to.be.an('object');
			expect(message.payload.z).to.be.a('number');
			expect(message.payload.z).to.be.equal(payload.x+payload.y);
			done();
		}).on('error.async', (event, error) => done(error)).fromChannels('sumCustom').listen().then(() => {
			const message = payloadIssuer.message.sumCustomChannel(payload);
			message.reply_to.push('sumCustom');
			message.exclusive = true;
			message.forward().catch(done);
		}).catch((error) => done(error));

	});

});