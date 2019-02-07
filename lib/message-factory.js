'use strict';
const {encoding, decoding} = require('./short-keys.js');
const shortid = require('shortid');
const crypto = require('crypto');
const AES_192_CBC_IV_SIZE = 16;

module.exports = (data = {}, isEncoded = true) => {

	let initialData = null;

	if (!isEncoded) {
		initialData = {
			[encoding.reply_to]:[]
		};
		for (const key in data)
			initialData[encoding[key]] = data[key];
	}

	const proxy = new Proxy(
		initialData || Object.assign({
			[encoding.reply_to]:[],
			[encoding.state]:encoding.pending
		}, data),
		{
			get:(target, property) => {
				switch (property) {
				case 'encrypt':
					return ({algorithm, iv, key} = {}) => {
						algorithm = algorithm || 'aes-192-cbc';
						iv = iv || Buffer.alloc(AES_192_CBC_IV_SIZE, 0);
						const cipher = crypto.createCipheriv(algorithm, key, iv);
						let encrypted = cipher.update(JSON.stringify(target[encoding.payload]), 'utf8', 'base64');
						encrypted += cipher.final('base64');
						target[encoding.payload] = {encrypted};
						return proxy;
					};
				case 'decrypt':
					return ({algorithm, iv, key} = {}) => {
						algorithm = algorithm || 'aes-192-cbc';
						iv = iv || Buffer.alloc(AES_192_CBC_IV_SIZE, 0);
						const decipher = crypto.createDecipheriv(algorithm, key, iv);
						let decrypted = decipher.update(target[encoding.payload].encrypted, 'base64', 'utf8');
						decrypted += decipher.final('utf8');
						target[encoding.payload] = JSON.parse(decrypted);
						return proxy;
					};
				case 'isRejected':
					return () => target[encoding.state] === encoding.rejected;
				case 'isResolved':
					return () => target[encoding.state] === encoding.resolved;
				case 'isAcknowledged':
					return () => target[encoding.acknowledged];
				case 'toShortened':
					return () => {
						const shortened = {};
						for (const key in target) {
							if (!Reflect.has(decoding, key))
								continue;
							shortened[key] = target[key];
						}
						return shortened;
					};
				case 'toExpanded':
					return () => {
						const expanded = {};
						for (const key in target) {
							if (!Reflect.has(decoding, key))
								continue;
							expanded[decoding[key]] = target[key];
						}
						return expanded;
					};
				case 'generateTrackerId':
					return () => {
						target[encoding.tracker_id] = shortid.generate();
						return proxy;
					};
				case 'unique_id':
					return target[encoding.tracker_id]+':'+target[encoding.message_id];
				default:
					return target[encoding[property] || property];
				}
			},
			set:(target, property, value) => {
				switch (property) {
				case 'stack':
					if (typeof value === 'string')
						value = value.split('\n').map((item) => item.trim());
					break;
				}
				target[encoding[property] || property] = value;
				return true;
			},
			has:(target, property) => Reflect.has(target, encoding[property] || property),
			deleteProperty:(target, property) => {
				Reflect.deleteProperty(target, encoding[property] || property);
				return true;
			}
		}
	);

	return proxy;

};