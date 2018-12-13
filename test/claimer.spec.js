'use strict';
const Warship = require('../');
const {expect} = require('chai');

describe('Claimer', function () {

	var methodProcessor;
	var deadMethodProcessor;
	var payloadIssuer;

	beforeEach(async function () {
		deadMethodProcessor = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});
		payloadIssuer = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});
		await deadMethodProcessor.methods.sum.prepare();
	});

	afterEach(async function () {
		if (methodProcessor)
			await methodProcessor.stop();
		await deadMethodProcessor.stop();
		await payloadIssuer.stop();
	});

	it('Should claim message from dead method processor', function (done) {

		this.timeout(20000);

		const payload = {
			x:Math.random(),
			y:Math.random()
		};

		deadMethodProcessor.methods.sum.onAwait('message.pending', async (message) => {
			message = await message.load();

			methodProcessor = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});

			methodProcessor.methods.sum.onAwait('message.pending', async (message) => {
				message = await message.load();
				message.payload = {z:message.payload.x+message.payload.y};
				await message.ack();
				await message.resolve();
			}).on('error.async', (event, error) => done(error)).run();

			await methodProcessor.methods.sum.prepare();

			methodProcessor.methods.sum.configure({
				claimerOptions:{
					messageTimeout:1000,
					maxRetries:2
				}
			}).claimer.run();

		}).on('error.async', (event, error) => done(error)).run();

		payloadIssuer.receivers.sum.onAwait('out.sum', async (message) => {
			expect(message.payload).to.be.an('object');
			expect(message.payload.z).to.be.a('number');
			expect(message.payload.z).to.be.equal(payload.x+payload.y);
			done();
		}).on('error.async', (event, error) => done(error)).fromOut('sum').listen().then(() => {
			payloadIssuer.message.sum(payload).forward().catch(done);
		}).catch((error) => done(error));

	});

	it('Should drop message from dead method processor (max retries)', function (done) {

		this.timeout(20000);

		const payload = {
			x:Math.random(),
			y:Math.random()
		};

		methodProcessor = null;

		deadMethodProcessor.methods.sum.onAwait('message.pending', async (message) => {
			message = await message.load();
		}).on('error.async', (event, error) => done(error)).run().configure({
			claimerOptions:{
				messageTimeout:1000,
				maxRetries:2
			}
		}).claimer.run().once('drop', () => done());

		payloadIssuer.message.sum(payload).forward().catch(done);

	});

});