'use strict';
const Warship = require('../');
const {expect} = require('chai');

describe('Multiple Method Processor', function () {

	var methodProcessor;
	var payloadIssuer;

	beforeEach(async function () {
		methodProcessor = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});
		payloadIssuer = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});
		await methodProcessor.methods.sum.prepare();
	});

	afterEach(async function () {
		await methodProcessor.methods.sum.stop();
	});

	it('Should process messages', function (done) {

		methodProcessor.methods.sum.onAwait('message.pending', async (message) => {
			message = await message.load();
			expect(message.payload).to.be.an('object');
			expect(message.payload.x).to.be.a('number');
			expect(message.payload.y).to.be.a('number');
			message.payload = {z:message.payload.x+message.payload.y};
			await message.ack();
			await message.resolve();
			done();
		}).on('error.async', (event, error) => done(error)).run();

		payloadIssuer.message.sum({
			x:Math.random(),
			y:Math.random()
		}).forward().catch(done);

	});

});