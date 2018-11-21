'use strict';
const AsyncEventEmitter = require('../lib/async-event-emitter.js');
const {expect} = require('chai');

describe('AsyncEventEmitter', function () {

	it('Should handle onceAwait error', function (done) {

		const arg = Math.random();
		const emitter = new AsyncEventEmitter();

		emitter.onceAwait('event', async () => {
			throw new Error('error');
		}).once('error.async', (event, error, eventArg) => {
			try {
				expect(event).to.be.equal('event');
				expect(error).to.be.instanceOf(Error);
				expect(error.message).to.be.equal('error');
				expect(eventArg).to.be.equal(arg);
				done();
			} catch (error) {
				done(error);
			}
		}).emit('event', arg);

	});

	it('Should handle onAwait error', function (done) {

		const arg = Math.random();
		const emitter = new AsyncEventEmitter();

		emitter.onAwait('event', async () => {
			throw new Error('error');
		}).once('error.async', (event, error, eventArg) => {
			try {
				expect(event).to.be.equal('event');
				expect(error).to.be.instanceOf(Error);
				expect(error.message).to.be.equal('error');
				expect(eventArg).to.be.equal(arg);
				done();
			} catch (error) {
				done(error);
			}
		}).emit('event', arg);

	});

});