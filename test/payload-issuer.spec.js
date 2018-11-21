'use strict';
const Warship = require('../');
const {expect} = require('chai');

describe('Payload Issuer', function () {

	var methodProcessor;
	var payloadIssuer;

	beforeEach(async function () {
		methodProcessor = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});
		payloadIssuer = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});
		await methodProcessor.methods.sum.prepare();
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

		methodProcessor.methods.sum.onAwait('message.pending', async (message) => {
			message = await message.load();
			message.payload = {z:message.payload.x+message.payload.y};
			await message.ack();
			await message.resolve();
		}).on('error.async', (event, error) => done(error)).run();

		payloadIssuer.receivers.sum.onAwait('sum', async (message) => {
			expect(message.payload).to.be.an('object');
			expect(message.payload.z).to.be.a('number');
			expect(message.payload.z).to.be.equal(payload.x+payload.y);
			done();
		}).on('error.async', (event, error) => done(error)).listen('sum').then(() => {
			payloadIssuer.message.sum(payload).forward().catch(done);
		}).catch((error) => done(error));

	});

});