'use strict';
const Warship = require('../');
const RedisCollection = require('../lib/redis-collection.js');
const {expect} = require('chai');

describe('Message Lock', function () {

	var methodProcessor;
	var payloadIssuer;
	var redis;

	beforeEach(async function () {
		redis = new RedisCollection({port:6379, host:'127.0.0.1'});
		await redis.clients.flushClient.flushall();
		methodProcessor = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});
		payloadIssuer = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});
		await methodProcessor.methods.sumLock.prepare();
	});

	afterEach(async function () {
		await redis.stop(true);
		await methodProcessor.stop();
		await payloadIssuer.stop();
	});

	it('Should lock message', function (done) {

		const payload = {
			x:Math.random(),
			y:Math.random()
		};

		this.timeout(20000);

		methodProcessor.methods.sumLock.onAwait('message.pending', async (message) => {
			message = await message.load();
			message.payload = {z:message.payload.x+message.payload.y};
			await message.ack();
			await message.resolve();
		}).on('error.async', (event, error) => done(error)).run();

		payloadIssuer.receivers.sum.onAwait('out.sumLock', async (message) => {
			expect(message.payload).to.be.an('object');
			expect(message.payload.z).to.be.a('number');
			expect(message.payload.z).to.be.equal(payload.x+payload.y);
			message.lock(10000).then((lock) => {
				message.lock(10000).catch((error) => {
					expect(error.name).to.be.equal('LockError');
					done();
				});
			});
		}).on('error.async', (event, error) => done(error)).fromOut('sumLock').listen().then(() => {
			payloadIssuer.message.sumLock(payload).forward().catch(done);
		}).catch((error) => done(error));

	});

});