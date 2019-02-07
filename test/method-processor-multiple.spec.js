'use strict';
const Warship = require('../');
const RedisCollection = require('../lib/redis-collection.js');
const {expect} = require('chai');

describe('Method Processor Multiple', function () {

	var methodProcessor;
	var payloadIssuer;
	var redis;

	beforeEach(async function () {
		redis = new RedisCollection({port:6379, host:'127.0.0.1'});
		await redis.clients.flushClient.flushall();
		methodProcessor = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});
		payloadIssuer = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});
		await methodProcessor.createMethodProcessor('customGroup', ['sum', 'multiply']).prepare();
	});

	afterEach(async function () {
		await redis.stop(true);
		await methodProcessor.stop();
		await payloadIssuer.stop();
	});

	it('Should process message', function (done) {

		const payload = {
			x:Math.random(),
			y:Math.random()
		};

		methodProcessor.methods.customGroup.onAwait('message.pending:sum', async (message) => {
			message = await message.load();
			expect(message.payload).to.be.an('object');
			expect(message.payload.x).to.be.a('number');
			expect(message.payload.x).to.be.equal(payload.x);
			expect(message.payload.y).to.be.a('number');
			expect(message.payload.y).to.be.equal(payload.y);
			message.payload = {z:message.payload.x+message.payload.y};
			await message.ack();
			await message.resolve();
		}).onAwait('message.pending:multiply', async (message) => {
			message = await message.load();
			expect(message.payload).to.be.an('object');
			expect(message.payload.x).to.be.a('number');
			expect(message.payload.x).to.be.equal(payload.x);
			expect(message.payload.y).to.be.a('number');
			expect(message.payload.y).to.be.equal(payload.y);
			message.payload = {z:message.payload.x*message.payload.y};
			await message.ack();
			await message.resolve();
		}).on('error.async', (event, error) => done(error)).run();

		let okCounter = 0;
		const ok = () => {
			if (okCounter === 1)
				done();
			okCounter++;
		}
		payloadIssuer.receivers.customGroup.onAwait('out.sum', async (message) => {
			expect(message.payload).to.be.an('object');
			expect(message.payload.z).to.be.a('number');
			expect(message.payload.z).to.be.equal(payload.x+payload.y);
			ok();
		}).onAwait('out.multiply', async (message) => {
			expect(message.payload).to.be.an('object');
			expect(message.payload.z).to.be.a('number');
			expect(message.payload.z).to.be.equal(payload.x*payload.y);
			ok();
		}).on('error.async', (event, error) => done(error)).fromOut('sum', 'multiply').listen().then(() => {
			payloadIssuer.message.sum(payload).forward().catch(done);
			payloadIssuer.message.multiply(payload).forward().catch(done);
		}).catch((error) => done(error));

	});

});