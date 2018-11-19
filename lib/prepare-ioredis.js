'use strict';
const IORedis = require('ioredis');

const parseObjectResponse = (reply, customParser = null) => {
	if (!Array.isArray(reply))
		return reply;
	const data = {};
	for (let i = 0; i < reply.length; i += 2) {
		if (customParser) {
			data[reply[i]] = customParser(reply[i], reply[i+1]);
			continue;
		}
		data[reply[i]] = reply[i+1];
	}
	return data;
};

const parseMessageResponse = (reply) => {
	if (!Array.isArray(reply))
		return [];
	return reply.map((message) => {
		return {id:message[0], data:parseObjectResponse(message[1])};
	});
};

const parseStreamResponse = (reply) => {
	if (!Array.isArray(reply))
		return reply;
	const object = {};
	for (const stream of reply)
		object[stream[0]] = parseMessageResponse(stream[1]);
	return object;
};

const addCommand = {
	xgroup:(target) => target.Command.setReplyTransformer('xgroup', (reply) => reply),
	xadd:(target) => target.Command.setReplyTransformer('xadd', (reply) => reply),
	xread:(target) => target.Command.setReplyTransformer('xread', parseStreamResponse),
	xreadgroup:(target) => target.Command.setReplyTransformer('xreadgroup', parseStreamResponse),
	xrange:(target) => target.Command.setReplyTransformer('xrange', parseMessageResponse),
	xrevrange:(target) => target.Command.setReplyTransformer('xrevrange', parseMessageResponse),
	xclaim:(target) => target.Command.setReplyTransformer('xclaim', parseMessageResponse),
	xinfo:(target) => target.Command.setReplyTransformer('xinfo', (reply) => parseObjectResponse(reply, (key, value) => {
		switch (key) {
		case 'first-entry':
		case 'last-entry':
			if (!Array.isArray(value))
				return value;
			return {
				id:value[0],
				data:parseObjectResponse(value[1])
			};
		default:
			return value;
		}
	})),
	xack:(target) => target.Command.setReplyTransformer('xack', (reply) => parseInt(reply)),
	xlen:(target) => target.Command.setReplyTransformer('xlen', (reply) => parseInt(reply)),
	xtrim:(target) => target.Command.setReplyTransformer('xtrim', (reply) => parseInt(reply)),
	xdel:(target) => target.Command.setReplyTransformer('xdel', (reply) => parseInt(reply))
};

let isPrepared = false;

module.exports = () => {

	if (isPrepared)
		return void 0;

	isPrepared = true;

	Object.keys(addCommand).forEach((command) => {
		const {string, buffer} = IORedis.prototype.createBuiltinCommand(command);
		IORedis.prototype[command] = string;
		IORedis.prototype[command+'Buffer'] = buffer;
		addCommand[command](IORedis);
	});

};