'use strict';
const messageFactory = require('../lib/message-factory.js');
const {encoding,decoding} = require('../lib/short-keys.js');
const {expect} = require('chai');

describe('messageFactory', function () {

	it('Should create a message from encoded object', function () {

		const object = {};

		for (const short in decoding)
			object[short] = Math.random();

		const message = messageFactory(object);

		for (const key in encoding)
			expect(message[key]).to.be.equal(object[encoding[key]]);

	});

	it('Should create a message from decoded object', function () {

		const object = {};

		for (const key in encoding)
			object[key] = Math.random();

		const message = messageFactory(object, false);

		for (const key in encoding)
			expect(message[key]).to.be.equal(object[key]);

	});

});