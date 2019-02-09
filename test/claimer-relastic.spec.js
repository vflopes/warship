'use strict';
const Warship = require('../');
const RedisCollection = require('../lib/redis-collection.js');
const {expect} = require('chai');
const elasticsearch = require('elasticsearch');
const {RelasticEventStore} = Warship;

describe('Claimer (Relastic EventStore)', function () {

	var methodProcessor;
	var deadMethodProcessor;
	var payloadIssuer;
	var redis;

	const esClient = elasticsearch.Client({host:'http://localhost:9200'});
	const eventStore = new RelasticEventStore(null, esClient, {indexName:'test-warship'});

	beforeEach(async function () {
		redis = new RedisCollection({port:6379, host:'127.0.0.1'});
		await redis.clients.flushClient.flushall();
		deadMethodProcessor = new Warship({namespace:'test-warship', eventStore}, {port:6379, host:'127.0.0.1'});
		payloadIssuer = new Warship({namespace:'test-warship', eventStore}, {port:6379, host:'127.0.0.1'});
		await deadMethodProcessor.methods.sumClaimer.prepare();
	});

	afterEach(async function () {
		await redis.stop(true);
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

		deadMethodProcessor.methods.sumClaimer.onAwait('message.pending', async (message) => {
			message = await message.load();
			
			methodProcessor = new Warship({namespace:'test-warship', eventStore}, {port:6379, host:'127.0.0.1'});

			await methodProcessor.methods.sumClaimer.prepare();

			methodProcessor.methods.sumClaimer.onAwait('message.pending', async (message) => {
				message = await message.load();
				message.payload = {z:message.payload.x+message.payload.y};
				await message.ack();
				await message.resolve();
			}).on('error.async', (event, error) => done(error)).run();

			methodProcessor.methods.sumClaimer.configure({
				claimerOptions:{
					messageTimeout:1000,
					maxRetries:2
				}
			}).claimer.run();

		}).on('error.async', (event, error) => done(error)).run();

		payloadIssuer.receivers.sum.onAwait('out.sumClaimer', async (message) => {
			expect(message.payload).to.be.an('object');
			expect(message.payload.z).to.be.a('number');
			expect(message.payload.z).to.be.equal(payload.x+payload.y);
			done();
		}).on('error.async', (event, error) => done(error)).fromOut('sumClaimer').listen().then(() => {
			payloadIssuer.message.sumClaimer(payload).forward().catch(done);
		}).catch((error) => done(error));

	});

	it('Should drop message from dead method processor (max retries)', function (done) {

		this.timeout(20000);

		const payload = {
			x:Math.random(),
			y:Math.random()
		};

		methodProcessor = null;

		deadMethodProcessor.methods.sumClaimer.onAwait('message.pending', async (message) => {
			message = await message.load();
		}).on('error.async', (event, error) => done(error)).run().configure({
			claimerOptions:{
				messageTimeout:1000,
				maxRetries:2
			}
		}).claimer.run().once('drop', () => done());

		payloadIssuer.message.sumClaimer(payload).forward().catch(done);

	});

});