'use strict';
const Warship = require('../');
const RedisCollection = require('../lib/redis-collection.js');
const {expect} = require('chai');
const crypto = require('crypto');

const password = 'password';
const salt = 'salt';
const secretKey = crypto.scryptSync(password, salt, 24);

describe('Message Cryptography', function () {

	var methodProcessor;
	var payloadIssuer;
	var redis;

	beforeEach(async function () {
		redis = new RedisCollection({port:6379, host:'127.0.0.1'});
		await redis.clients.flushClient.flushall();
		methodProcessor = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});
		payloadIssuer = new Warship({namespace:'test-warship'}, {port:6379, host:'127.0.0.1'});
		await methodProcessor.methods.sum.prepare();
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

		methodProcessor.methods.sum.onAwait('message.pending', async (message) => {
			message = await message.load();
			expect(message.payload).to.have.property('encrypted');
			message.decrypt({key:secretKey});
			expect(message.payload).to.be.an('object');
			expect(message.payload.x).to.be.a('number');
			expect(message.payload.x).to.be.equal(payload.x);
			expect(message.payload.y).to.be.a('number');
			expect(message.payload.y).to.be.equal(payload.y);
			message.payload = {z:message.payload.x+message.payload.y};
			await message.ack();
			await message.encrypt({key:secretKey}).resolve();
		}).on('error.async', (event, error) => done(error)).run();

		payloadIssuer.receivers.sum.onAwait('out.sum', async (message) => {
			expect(message.payload).to.have.property('encrypted');
			message.decrypt({key:secretKey});
			expect(message.payload).to.be.an('object');
			expect(message.payload.z).to.be.a('number');
			expect(message.payload.z).to.be.equal(payload.x+payload.y);
			done();
		}).on('error.async', (event, error) => done(error)).fromOut('sum').listen().then(() => {
			payloadIssuer.message.sum(payload).encrypt({key:secretKey}).forward().catch(done);
		}).catch((error) => done(error));

	});

});