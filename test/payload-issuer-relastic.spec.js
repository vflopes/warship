'use strict';
const Warship = require('../');
const RedisCollection = require('../lib/redis-collection.js');
const {expect} = require('chai');
const elasticsearch = require('elasticsearch');
const {RelasticEventStore} = Warship;

describe('Payload Issuer (Relastic EventStore)', function () {

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

		payloadIssuer.receivers.sum.onAwait('out.sum', async (message) => {
			expect(message.payload).to.be.an('object');
			expect(message.payload.z).to.be.a('number');
			expect(message.payload.z).to.be.equal(payload.x+payload.y);
			done();
		}).on('error.async', (event, error) => done(error)).fromOut('sum').listen().then(() => {
			payloadIssuer.message.sum(payload).forward().catch(done);
		}).catch((error) => done(error));

	});

});