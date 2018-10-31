'use strict';
const {encoding} = require('short-keys.object.js');

module.exports = (data = {}) => {
	
	return new Proxy(
		data,
		{
			set:(data, property, value) => {

				data[encoding[property]] = value;

				return true;

			}
			get:(data, property) => {

				if (property === 'raw')
					return data;

				return data[encoding[property]];

			},
			deleteProperty:(data, property) => {

				delete data[encoding[property]];

				return true;

			}
		}
	);

};