const sinon = require('sinon');
const assert = require('assert');
const sleep = require('sleep-promise');

describe('#cache/lru', function() {

    let sandbox = null;
    const LruCache = require('../../cache/lru');

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('should work like the default Map cache', function () {
        const cache = new LruCache();

        const k1 = 'foo';
        const k2 = Symbol('foo');
        const k3 = {};
        const v1 = Symbol('value1');
        const v2 = Symbol('value2');

        assert(!cache.has(k1));

        cache.set(k1, v1);

        assert(cache.has(k1));
        assert.strictEqual(cache.get(k1), v1);

        assert(!cache.has(k2));
        assert(!cache.has(k3));

        cache.set(k2, v2);
        cache.set(k3, v2);

        assert(cache.has(k1));
        assert(cache.has(k2));
        assert(cache.has(k3));

        assert.strictEqual(cache.get(k2), v2);
        assert.strictEqual(cache.get(k3), v2);

        cache.delete(k1);

        assert(!cache.has(k1));
        assert(cache.has(k2));
        assert(cache.has(k3));

        cache.clear();

        assert(!cache.has(k1));
        assert(!cache.has(k2));
        assert(!cache.has(k3));
    })

    it('should not keep more than `options.maxSize` values in cache', function() {
        const cache = new LruCache({ maxSize: 3 });

        cache.set(1, 1);
        cache.set(2, 2);
        cache.set(3, 3);
        cache.set(4, 4);

        assert(!cache.has(1));
        assert(cache.has(2));
        assert(cache.has(3));
        assert(cache.has(4));
    })

    it('should evict the least recently used item', function() {
        const cache = new LruCache({ maxSize: 3 });

        cache.set(1, 1);
        cache.set(2, 2);
        cache.set(3, 3);
        cache.get(1);

        cache.set(4, 4);

        assert(!cache.has(2));
        assert(cache.has(1));
        assert(cache.has(3));
        assert(cache.has(4));
    })

    it('should keep eviction in sync when items are deleted', function() {
        const cache = new LruCache({ maxSize: 3 });

        cache.set(1, 1);
        cache.set(2, 2);
        cache.set(3, 3);

        cache.delete(2);
        cache.set(4, 4);

        assert(cache.has(1));
        assert(cache.has(3));
        assert(cache.has(4));
    })
});
