'use strict';
const http = require('http');
const https = require('https');
const {getValueFromEnvOrPath} = require('./helpers.object.js');

class Httpx {

	constructor () {

		this._createServer();

	}

	get server () {
		return this._server;
	}

	_createServer () {

		if (process.env.HTTPX_SECURE === 'true') {
			this._server = https.createServer({
				key:getValueFromEnvOrPath('HTTPX_TLS_KEY'),
				cert:getValueFromEnvOrPath('HTTPX_TLS_CERT'),
				pfx:getValueFromEnvOrPath('HTTPX_TLS_PFX'),
				passphrase:process.env.HTTPX_TLS_PASSPHRASE
			});
			return this;
		}

		this._server = http.createServer();
		return this;

	}

	open (options = {}) {

		options = Object.assign({
			host:process.env.HTTPX_HOST || '0.0.0.0',
			port:process.env.HTTPX_PORT
		}, options);

		this._server.listen(options);
		return this;

	}

}

module.exports = Httpx;