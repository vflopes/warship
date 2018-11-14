'use strict';

const KEY_PAIRS = [
	['m', 'method'],
	['p', 'payload'],
	['s', 'state'],
	['er', 'error'],
	['ac', 'alpha_code'],
	['nc', 'numeric_code'],
	['sk', 'stack'],
	['mi', 'message_id'],
	['si', 'stream_id'],
	['ti', 'tracker_id'],
	['ut', 'update_timestamp'],
	['ct', 'creation_timestamp'],
	['sf', 'forwarded'],
	['sr', 'resolved'],
	['se', 'rejected'],
	['rs', 'retries']
];

const encoding = {};
const decoding = {};

for (const [short, key] of KEY_PAIRS) {
	encoding[key] = short;
	decoding[short] = key;
}

module.exports = {encoding,decoding};