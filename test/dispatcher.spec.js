'use strict';
const RedisCollection = require('../lib/redis-collection.js');
const Dispatcher = require('../lib/dispatcher.js');
const messageFactory = require('../lib/message-factory.js');
const {expect} = require('chai');
const shortid = require('shortid');

describe('RedisCollection', function () {

	var redis;
	var dispatcher;
	var message;

	beforeEach(async function () {
		redis = new RedisCollection({port:6379, host:'127.0.0.1'});
		await redis.clients.flushClient.flushdb();
		dispatcher = new Dispatcher('test-warship', redis);
		message = messageFactory({payload:Math.random()}, false);
		message.tracker_id = shortid.generate();
		message.message_id = shortid.generate();
	});

	afterEach(async function () {
		await redis.stop(true);
	});

	it('Should create a message', async function () {

		await dispatcher.update(message);

		expect(message.tracker_id).to.be.a('string');

		const exists = parseInt(await redis.clients.testClient.exists(message.unique_id));

		expect(exists).to.be.equal(1);

	});

	it('Should load a message', async function () {

		await dispatcher.update(message);

		expect(message.tracker_id).to.be.a('string');

		const exists = parseInt(await redis.clients.testClient.exists(message.unique_id));

		expect(exists).to.be.equal(1);

		const loadedMessage = messageFactory({
			tracker_id:message.tracker_id,
			message_id:message.message_id
		}, false);

		await dispatcher.load(loadedMessage);

		expect(loadedMessage.payload).to.be.equal(message.payload);

	});

	it('Should generate a message id', async function () {

		const previousMessageId = message.message_id;

		await dispatcher.generateMessageId(message);

		expect(message.message_id).to.be.not.equal(previousMessageId);

	});

	it('Should generate a message id', async function () {

		const previousMessageId = message.message_id;

		await dispatcher.update(message);

		const exists = parseInt(await redis.clients.testClient.exists(message.unique_id));

		expect(exists).to.be.equal(1);

		await dispatcher.generateMessageId(message);

		expect(message.message_id).to.be.not.equal(previousMessageId);

		const existsPreviousMessageId = parseInt(await redis.clients.testClient.exists(message.tracker_id+':'+previousMessageId));

		expect(existsPreviousMessageId).to.be.equal(0);

		const existsCurrentMessageId = parseInt(await redis.clients.testClient.exists(message.unique_id));

		expect(existsCurrentMessageId).to.be.equal(1);

	});

	it('Should drop a message', async function () {

		await dispatcher.update(message);

		expect(message.tracker_id).to.be.a('string');

		const exists = parseInt(await redis.clients.testClient.exists(message.unique_id));

		expect(exists).to.be.equal(1);

		await dispatcher.drop(message);

		const existsAfterDrop = parseInt(await redis.clients.testClient.exists(message.unique_id));

		expect(existsAfterDrop).to.be.equal(0);

	});

	it('Should set the TTL of a message', async function () {

		await dispatcher.update(message);

		expect(message.tracker_id).to.be.a('string');

		const exists = parseInt(await redis.clients.testClient.exists(message.unique_id));

		expect(exists).to.be.equal(1);

		await dispatcher.drop(message, 5000);

		const ttl = parseInt(await redis.clients.testClient.pttl(message.unique_id));

		expect(ttl).to.be.above(0);

	});

	it('Should publish into out:* channel', function (done) {

		dispatcher.update(message).then(() => {

			redis.clients.testOutSubscriber.on('message', (channel, shortenedMessage) => {
				try {
					const receivedMessage = messageFactory(JSON.parse(shortenedMessage));
					expect(channel).to.be.equal('test-warship:out:testMethod:'+message.tracker_id)
					expect(message.unique_id).to.be.equal(receivedMessage.unique_id);
					done();
				} catch (error) {
					done(error);
				}
			});

			redis.clients.testOutSubscriber.subscribe('test-warship:out:testMethod:'+message.tracker_id).then(() => {
				message.method = 'testMethod';
				return dispatcher.giveBack(message);
			}).catch(done);

		}).catch(done);

	});

	it('Should publish into in:* channel', function (done) {

		dispatcher.update(message).then(() => {

			redis.clients.testInSubscriber.on('message', (channel, shortenedMessage) => {
				try {
					expect(channel).to.be.equal('test-warship:in:testMethod')
					const receivedMessage = messageFactory(JSON.parse(shortenedMessage));
					expect(message.unique_id).to.be.equal(receivedMessage.unique_id);
					done();
				} catch (error) {
					done(error);
				}
			});

			redis.clients.testInSubscriber.subscribe('test-warship:in:testMethod').then(() => {
				message.method = 'testMethod';
				return dispatcher.dispatch(message);
			}).catch(done);

		}).catch(done);

	});

	it('Should add message into stream', function (done) {

		dispatcher.update(message).then(() => {

			message.method = 'testMethod';
			dispatcher.dispatch(message).then(() => {
				return redis.clients.testStream.xlen('test-warship:testMethod:in');
			}).then((streamSize) => {
				try {
					expect(streamSize).to.be.equal(1);
					done();
				} catch(error) {
					done(error);
				}
			}).catch(done);

		}).catch(done);

	});

});