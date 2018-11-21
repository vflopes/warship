'use strict';
const RedisCollection = require('../lib/redis-collection.js');
const {expect} = require('chai');

describe('RedisCollection', function () {

	var redis;

	beforeEach(async function () {
		redis = new RedisCollection({port:6379, host:'127.0.0.1'});
	});

	afterEach(async function () {
		await redis.stop(true);
	});

	it('Should create a client', async function () {

		const dbsize = parseInt(await redis.clients.myClient.dbsize());
		expect(dbsize).to.be.a('number');
		expect(redis.hasClient('myClient')).to.be.equal(true);
		expect(redis.hasClient('otherClient')).to.be.equal(false);

	});

	it('Should stop without forcing', async function () {

		const dbsize = parseInt(await redis.clients.myClient.dbsize());
		expect(dbsize).to.be.a('number');
		await redis.stop();

	});

});