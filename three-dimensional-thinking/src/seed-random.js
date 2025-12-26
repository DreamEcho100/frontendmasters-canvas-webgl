/**
 * @file Seedable Random Library
 *
 * ⚠️ SECURITY WARNING ⚠️
 * This library uses deterministic PRNGs intended for:
 * - Games
 * - Simulations
 * - Procedural generation
 * - Testing
 *
 * DO NOT use for:
 * - Cryptography
 * - Security tokens
 * - Passwords
 * - Session IDs
 *
 * Use `crypto.getRandomValues()` or `crypto.randomUUID()` for security-sensitive use cases.
 */

/* -------------------------------------------------- */
/* Types (TypeScript via JSDoc)                       */
/* -------------------------------------------------- */

/**
 * @typedef {number | string} Seed
 */

/**
 * @typedef {Object} RNGState
 * @property {number[]} s - Internal state array (algorithm-specific)
 */

/**
 * @callback RNGNext
 * @returns {number} float in [0, 1)
 */

/* -------------------------------------------------- */
/* Seed hashing & entropy                             */
/* -------------------------------------------------- */

/**
 * Hash a string into four 32-bit integers.
 *
 * NOTE:
 * - This is NOT MurmurHash.
 * - This is NOT cryptographically secure.
 * - This hash algorithm is an internal detail and MAY CHANGE.
 * - Do NOT rely on it for cross-version determinism.
 *
 * @param {string} str
 * @returns {number[]} 4× uint32 values
 */
function hashString(str) {
	let h1 = 1779033703,
		h2 = 3144134277,
		h3 = 1013904242,
		h4 = 2773480762;

	for (let i = 0; i < str.length; i++) {
		const k = str.charCodeAt(i);
		h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
		h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
		h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
		h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
	}

	return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/**
 * Get high-entropy seed from system sources.
 * @returns {number[]} 4× uint32 values
 */
function getEntropySeed() {
	if (typeof crypto !== "undefined" && crypto.getRandomValues) {
		const buf = new Uint32Array(4);
		crypto.getRandomValues(buf);
		return Array.from(buf);
	}

	try {
		// @ts-ignore
		const { randomBytes } = require("node:crypto");
		const buf = randomBytes(16);
		return [buf.readUInt32LE(0), buf.readUInt32LE(4), buf.readUInt32LE(8), buf.readUInt32LE(12)];
	} catch {
		throw new Error("No secure entropy source available.");
	}
}

/* -------------------------------------------------- */
/* PRNG algorithms                                   */
/* -------------------------------------------------- */

/**
 * Mulberry32 PRNG
 * Fast, simple, no state export
 *
 * @param {number} seed
 * @returns {RNGNext}
 */
function mulberry32(seed) {
	let t = seed >>> 0;
	return () => {
		t += 0x6d2b79f5;
		let r = Math.imul(t ^ (t >>> 15), t | 1);
		r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * xoshiro128** PRNG
 * High quality, supports state save/restore
 *
 * @param {number[]} seed
 * @returns {{ next: RNGNext, uint32: () => number, state: RNGState }}
 */
function xoshiro128(seed) {
	let s = seed.slice(0, 4);

	/**
	 * @param {number} x
	 * @param {number} k
	 */
	const rotl = (x, k) => (x << k) | (x >>> (32 - k));

	function nextUint32() {
		const result = Math.imul(rotl(s[1] * 5, 7), 9) >>> 0;
		const t = s[1] << 9;

		s[2] ^= s[0];
		s[3] ^= s[1];
		s[1] ^= s[2];
		s[0] ^= s[3];
		s[2] ^= t;
		s[3] = rotl(s[3], 11);

		return result;
	}

	return {
		next() {
			return nextUint32() / 4294967296;
		},
		uint32: nextUint32,
		get state() {
			return { s: s.slice() };
		},
		set state(v) {
			s = v.s.slice();
		},
	};
}

/* -------------------------------------------------- */
/* Main RNG class                                    */
/* -------------------------------------------------- */

export class SeedRandom {
	#next;
	#uint32;
	#xoshiro;
	#algo;
	#seed;

	/**
	 * @param {Seed | null | undefined} [seed]
	 * @param {"mulberry" | "xoshiro"} [algo="xoshiro"]
	 */
	constructor(seed, algo = "xoshiro") {
		this.#algo = algo;

		this.#seed =
			seed == null ? getEntropySeed() : typeof seed === "string" ? hashString(seed) : hashString(String(seed));

		if (algo === "mulberry") {
			this.#next = mulberry32(this.#seed[0]);
			this.#uint32 = () => (this.#next() * 4294967296) >>> 0;
			this.#xoshiro = null;
		} else {
			this.#xoshiro = xoshiro128(this.#seed);
			this.#next = this.#xoshiro.next;
			this.#uint32 = this.#xoshiro.uint32;
		}
	}

	/* ---------------------------------- */
	/* Core primitives                    */
	/* ---------------------------------- */

	/** @returns {number} float in [0, 1) */
	float() {
		return this.#next();
	}

	/** @returns {number} uint32 */
	uint32() {
		return this.#uint32();
	}

	/**
	 * Bias-free integer in [min, max]
	 * @param {number} min
	 * @param {number} max
	 */
	int(min, max) {
		if (min > max) {
			throw new Error(`Invalid range: ${min} > ${max}`);
		}

		const range = max - min + 1;
		const limit = Math.floor(4294967296 / range) * range;

		let x;
		do {
			x = this.uint32();
		} while (x >= limit);

		return min + (x % range);
	}

	/** @returns {boolean} */
	bool() {
		return (this.uint32() & 1) === 1;
	}

	/**
	 * Float in [min, max)
	 * @param {number} min
	 * @param {number} max
	 */
	between(min, max) {
		if (min >= max) {
			throw new Error(`Invalid range: ${min} >= ${max}`);
		}
		return min + (max - min) * this.float();
	}

	/* ---------------------------------- */
	/* Utility methods                    */
	/* ---------------------------------- */

	/**
	 * @template T
	 * @param {T[]} arr
	 * @returns {T}
	 */
	pick(arr) {
		if (arr.length === 0) {
			throw new Error("Cannot pick from empty array");
		}
		return arr[this.int(0, arr.length - 1)];
	}

	/**
	 * @template T
	 * @param {T[]} arr
	 * @returns {T[]}
	 */
	shuffle(arr) {
		const a = arr.slice();
		for (let i = a.length - 1; i > 0; i--) {
			const j = this.int(0, i);
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	/**
	 * @template T
	 * @param {T[]} arr
	 * @param {number} n
	 * @returns {T[]}
	 */
	sample(arr, n) {
		if (n < 0 || n > arr.length) {
			throw new Error("Invalid sample size");
		}
		return this.shuffle(arr).slice(0, n);
	}

	/**
	 * @template T
	 * @param {Array<[T, number]>} choices
	 * @returns {T}
	 *
	 * @todo support both of the following
	 * - `weighted(items, weights) { / * separate arrays * / }`
	 * - `weighted([[item, weight], ...]) { / * tuples * / }`
	 */
	weighted(choices) {
		if (choices.length === 0) {
			throw new Error("Empty choices");
		}

		let total = 0;
		for (const [, w] of choices) {
			if (w < 0) throw new Error("Negative weight");
			total += w;
		}
		if (total === 0) {
			throw new Error("Total weight must be positive");
		}

		let r = this.float() * total;
		for (const [v, w] of choices) {
			r -= w;
			if (r < 0) return v;
		}

		return choices[choices.length - 1][0];
	}

	/**
	 * Gaussian distribution (Box–Muller)
	 * @param {number} [mean=0]
	 * @param {number} [std=1]
	 */
	normal(mean = 0, std = 1) {
		let u = 0,
			v = 0;
		while (u === 0) u = this.float();
		while (v === 0) v = this.float();
		return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
	}

	/**
	 * Pseudo UUID v4 (NOT cryptographically secure)
	 * @returns {string}
	 */
	uuidLikeV4() {
		return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
			const r = this.int(0, 15);
			const v = c === "x" ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	}

	/**
	 * Generate random bytes
	 * @param {number} length
	 * @returns {Uint8Array}
	 */
	bytes(length) {
		const out = new Uint8Array(length);
		let i = 0;

		while (i + 4 <= length) {
			const v = this.uint32();
			out[i++] = v & 0xff;
			out[i++] = (v >>> 8) & 0xff;
			out[i++] = (v >>> 16) & 0xff;
			out[i++] = (v >>> 24) & 0xff;
		}

		while (i < length) {
			out[i++] = this.int(0, 255);
		}

		return out;
	}

	/**
	 * Generate a random string
	 * @param {number} length
	 * @param {string} [charset="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"]
	 * @returns {string}
	 */
	string(length, charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789") {
		return Array.from({ length }, () => charset[this.int(0, charset.length - 1)]).join("");
	}

	hexColor() {
		return "#" + this.uint32().toString(16).padStart(8, "0").slice(0, 6);
	}

	/**
	 * Exponential distribution
	 * @param {number} lambda
	 * @returns {number}
	 */
	exponential(lambda = 1) {
		return -Math.log(1 - this.float()) / lambda;
	}

	/**
	 * Chance/Probability helper
	 * @param {number} probability
	 * @returns {boolean}
	 */
	chance(probability) {
		if (probability < 0 || probability > 1) throw new Error("Probability must be in [0, 1]");
		return this.float() < probability;
	}

	/**
	 * Dice rolling
	 * @param {number} count
	 * @param {number} sides
	 * @returns {number[]}
	 */
	dice(count, sides) {
		return Array.from({ length: count }, () => this.int(1, sides));
	}
	/* ---------------------------------- */
	/* State management                   */
	/* ---------------------------------- */

	/**
	 * Get the seed used to initialize this RNG
	 * @returns {number[]}
	 */
	getSeed() {
		return this.#seed;
	}

	/**
	 * Set the seed used to initialize this RNG
	 * @param {number[]} seed
	 * @param {"mulberry" | "xoshiro"} [algo]
	 */
	setSeed(seed, algo) {
		this.#algo = algo ?? this.#algo;

		this.#seed =
			seed == null ? getEntropySeed() : typeof seed === "string" ? hashString(seed) : hashString(String(seed));

		if (algo === "mulberry") {
			this.#next = mulberry32(this.#seed[0]);
			this.#uint32 = () => (this.#next() * 4294967296) >>> 0;
			this.#xoshiro = null;
		} else {
			this.#xoshiro = xoshiro128(this.#seed);
			this.#next = this.#xoshiro.next;
			this.#uint32 = this.#xoshiro.uint32;
		}
	}

	/**
	 * Algorithm-specific state snapshot
	 * @returns {RNGState | null}
	 */
	getState() {
		return this.#xoshiro ? this.#xoshiro.state : null;
	}

	/**
	 * Restore previously saved state
	 * @param {RNGState} state
	 */
	setState(state) {
		if (!this.#xoshiro) {
			throw new Error("State management requires xoshiro algorithm");
		}
		this.#xoshiro.state = state;
	}

	/**
	 * Fork a deterministic child RNG
	 * @returns {SeedRandom}
	 */
	fork() {
		return new SeedRandom(this.uint32(), this.#algo);
	}
}

/* -------------------------------------------------- */
/* Convenience factory                               */
/* -------------------------------------------------- */

/**
 * @param {Seed | null | undefined} [seed]
 * @param {"mulberry" | "xoshiro"} [algo]
 */
export function createRandom(seed, algo) {
	return new SeedRandom(seed, algo);
}

export default SeedRandom;
