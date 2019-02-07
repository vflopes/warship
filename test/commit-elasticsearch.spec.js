'use strict';
const Warship = require('../');
const RedisCollection = require('../lib/redis-collection.js');
const {expect} = require('chai');
const elasticsearch = require('elasticsearch');
const {ElasticsearchEventStore} = Warship;

describe('Payload Issuer Commit (Elasticsearch EventStore)', function () {

	var methodProcessor;
	var payloadIssuer;
	var redis;

	const esClient = elasticsearch.Client({host:'http://localhost:9200'});
	const eventStore = new ElasticsearchEventStore(esClient, {indexName:'test-warship'});

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

		this.timeout(20000);

		methodProcessor.methods.sum.onAwait('message.pending', async (message) => {
			message = await message.load();
			message.payload = {z:message.payload.x+message.payload.y};
			await message.ack();
			await message.resolve();
		}).on('error.async', (event, error) => done(error)).run();

		let finishCount = 0;
		const finish = () => {
			finishCount++;
			if (finishCount === 10)
				done();
		};

		for (let i = 0; i < 10; i++) {

			let payload = {
				x:Math.random(),
				y:Math.random()
			};

			payloadIssuer.receivers.sum.commit(
				payloadIssuer.message.sum(payload)
			).then((message) => {
				expect(message.payload).to.be.an('object');
				expect(message.payload.z).to.be.a('number');
				expect(message.payload.z).to.be.equal(payload.x+payload.y);
				finish();
			}).catch(done);

		}

	});
	
	it('Should abort message', function (done) {

		this.timeout(20000);

		const payload = {
			x:Math.random(),
			y:Math.random()
		};

		payloadIssuer.receivers.sum.commit(
			payloadIssuer.message.sum(payload),
			false,
			3000
		).catch((message) => {
			expect(message.alpha_code).to.be.equal('ETIMEOUT');
			done();
		});

	});

});