'use strict';
const Warship = require('../');
const RedisCollection = require('../lib/redis-collection.js');
const {expect} = require('chai');
const elasticsearch = require('elasticsearch');
const {RelasticEventStore} = Warship;

describe('Method Processor (Relastic EventStore)', function () {

	var methodProcessor;
	var payloadIssuer;
	var redis;

	const esClient = elasticsearch.Client({host:'http://localhost:9200'});
	const eventStore = new RelasticEventStore(null, esClient, {indexName:'test-warship'});

	beforeEach(async function () {
		redis = new RedisCollection({port:6379, host:'127.0.0.1'});
		await redis.clients.flushClient.flushall();
		methodProcessor = new Warship({namespace:'test-warship', eventStore}, {port:6379, host:'127.0.0.1'});
		payloadIssuer = new Warship({namespace:'test-warship', eventStore}, {port:6379, host:'127.0.0.1'});
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
			expect(message.payload).to.be.an('object');
			expect(message.payload.x).to.be.a('number');
			expect(message.payload.x).to.be.equal(payload.x);
			expect(message.payload.y).to.be.a('number');
			expect(message.payload.y).to.be.equal(payload.y);
			message.payload = {z:message.payload.x+message.payload.y};
			await message.ack();
			await message.resolve();
			done();
		}).on('error.async', (event, error) => done(error)).run();

		payloadIssuer.message.sum(payload).forward().catch(done);

	});

});