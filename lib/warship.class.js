'use strict';
const shortid = require('shortid');
const Redis = require('./redis.class.js');

class Warship {

	constructor () {

		this._id = process.env.WARSHIP_ID || shortid.generate();
		this._redis = new Redis();

	}

	get id () {
		return this._id;
	}

	async addEvent (event) {

		await this._redis.command('hset')(`warship:${this._id}`, event.id, JSON.stringify(event.raw));

		return void 0;

	}

}

module.exports = Warship;