'use strict';
const {encoding, decoding} = require('./short-keys.js');

module.exports = (data = {}, isEncoded = true) => {

	let initialData = null;

	if (!isEncoded) {
		initialData = {};
		for (const key in data)
			initialData[encoding[key]] = data[key];
	}

	return new Proxy(
		initialData || Object.assign({
			[encoding.state]:encoding.pending
		}, data),
		{
			get:(target, property) => {
				switch (property) {
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

};