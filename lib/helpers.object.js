'use strict';
const fs = require('fs');
const path = require('path');

const getValueFromEnvOrPath = (envName) => {

	if (process.env[envName])
		return process.env[envName];

	if (process.env[envName+'_PATH']) {

		let filePath = process.env[envName+'_PATH'];

		if (!path.isAbsolute(filePath))
			filePath = path.join(path.dirname(require.main.filename), filePath);

		return fs.readFileSync(filePath).toString('utf8');
		
	}

	return void 0;

}

module.exports = {
	getValueFromEnvOrPath
};