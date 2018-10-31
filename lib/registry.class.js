'use strict';

class Registry {

	constructor () {

		this._registry = new Map();

	}

	register (service, method) {

		if (!this._registry.has(method))
			this._registry.set(method, {
				services:new Map(),
				iterator:(new Map()).values().next()
			});

		const registry = this._registry.get(method);

		registry.services.set(service.id, service);

		service.once('close' => {

			if (this._registry.has(method)) {
				
				registry.services.delete(service.id);

				if (registry.services.size === 0)
					this._registry.delete(method);

			}

		});

		return this;

	}

	getService (method) {

		if (!this._registry.has(method))
			return void 0;

		const registry = this._registry.get(method);

		if (registry.iterator.done) 
			registry.iterator = registry.services.values();

		registry.iterator.next();

		if (registry.iterator.done)
			return void 0;

		return registry.iterator.value;

	}

}

module.exports = Registry;