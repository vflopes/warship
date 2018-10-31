'use strict';

const KEY_PAIRS = [
	['i', 'id'],
	['p', 'payload'],
	['t', 'timestamp'],
	['m', 'method']
];

const encoding = {};
const decoding = {};

for (const [short, key] of KEY_PAIRS) {
	encoding[key] = short;
	decoding[short] = key;
}

module.exports = {encoding, decoding};