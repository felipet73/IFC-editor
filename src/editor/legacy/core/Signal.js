class Signal {
	constructor() {
		this.listeners = [];
		this.active = true;
	}

	add(listener) {
		this.listeners.push(listener);
		return listener;
	}

	remove(listener) {
		this.listeners = this.listeners.filter((candidate) => candidate !== listener);
	}

	dispatch(...args) {
		if (!this.active) return;
		for (const listener of this.listeners) {
			listener(...args);
		}
	}
}

export { Signal };
