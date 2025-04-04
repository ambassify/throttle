const sinon = require('sinon');
const assert = require('assert');
const mock = require('mock-require');
const { setTimeout } = require('timers/promises');

describe('#throttle', function() {

    const sandbox = sinon.createSandbox();
    let throttle;

    class MockLruCache {
        constructor(options) { this._constructorCalled(options); }
        _constructorCalled() {}
        get() {return { value: 1 }; }
        set() { }
        has() { return false; }
        delete() { }
        clear() { }
    }

    before(function() {
        mock('../src/cache/lru', MockLruCache);
        throttle = require('../src/index');
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('Should cache results', function() {
        const target = sandbox.spy();
        const throttled = throttle(target, { delay: 200, maxSize: Infinity });

        throttled(1);
        throttled(2);
        throttled(1);
        throttled(2);
        throttled(2);
        throttled(3);

        assert.equal(target.callCount, 3);
    });

    it('Should cache results when delay not set', function() {
        const target = sandbox.spy();
        const throttled = throttle(target, { maxSize: Infinity });

        throttled(1);
        throttled(2);
        throttled(2);

        assert.equal(target.callCount, 2);
    });

    it('Should allow delay to be set using options', async function() {
        const target = sandbox.spy();
        const throttled = throttle(target, { delay: 20, maxSize: Infinity });

        throttled(1);
        throttled(1);
        assert.equal(target.callCount, 1);

        await setTimeout(20);

        throttled(1);
        assert.equal(target.callCount, 2);
    });

    [ 0, -1, -200 ].forEach(function(delay) {
        it(`Should not cache results when delay < 1 (${delay})`, function() {
            const target = sandbox.spy();
            const throttled = throttle(target, { delay, maxSize: Infinity });

            throttled(1);
            throttled(2);
            throttled(2);

            assert.equal(target.callCount, 3);
        });
    });

    it('Should expire cache entries', function() {
        const delay = 20;
        const target = sandbox.spy();
        const throttled = throttle(target, { delay, maxSize: Infinity });

        throttled(1);
        throttled(2);
        throttled(2);

        assert.equal(target.callCount, 2);

        return setTimeout(delay)
            .then(() => {
                assert.equal(target.callCount, 2);

                throttled(2);
                assert.equal(target.callCount, 3);

                throttled(2);
                assert.equal(target.callCount, 3);
            });
    });

    it('Should clear cache on `.clear()`', function() {
        const delay = 20;
        const target = sandbox.spy();
        const throttled = throttle(target, { delay, maxSize: Infinity });

        throttled(1);
        throttled(2);
        throttled.clear();
        throttled(2);

        assert.equal(target.callCount, 3);
    });

    it('Should clear specific cache entries on `.clear()`', function() {
        const delay = 20;
        const target = sandbox.spy();
        const throttled = throttle(target, { delay, maxSize: Infinity });

        throttled(1);
        throttled(2);
        throttled.clear(1);
        throttled(2);

        assert.equal(target.callCount, 2);

        throttled.clear(2);
        throttled(2);
        assert.equal(target.callCount, 3);
    });

    it('Should call resolver', function() {
        const delay = 20;
        const target = sandbox.spy();
        const resolver = sandbox.stub();
        resolver.withArgs(1).onFirstCall().returns(1);
        resolver.withArgs(2)
            .onFirstCall().returns(2)
            .onSecondCall().returns(3);
        resolver.throws('Invalid resolver arguments');

        const throttled = throttle(target, { delay, maxSize: Infinity, resolver });

        throttled(1);
        throttled(2);
        throttled(2);

        assert.equal(target.callCount, 3);
    });

    it('Should allow resolver to return object', function() {
        const delay = 20;
        const target = sandbox.spy();
        const resolver = sandbox.stub().returns({ id: 1333 });

        const throttled = throttle(target, { delay, maxSize: Infinity, resolver });

        throttled(1);
        throttled(2);
        throttled(2);

        assert.equal(target.callCount, 1);
    });

    it('Should allow resolver to return number', function() {
        const delay = 20;
        const target = sandbox.spy();
        const resolver = sandbox.stub().returns(1333);

        const throttled = throttle(target, { delay, maxSize: Infinity, resolver });

        throttled(1);
        throttled(2);
        throttled(2);

        assert.equal(target.callCount, 1);
    });

    it('Should allow resolver to return Date', function() {
        const delay = 20;
        const target = sandbox.spy();
        const resolver = sandbox.stub().returns(new Date());

        const throttled = throttle(target, { delay, maxSize: Infinity, resolver });

        throttled(1);
        throttled(2);
        throttled(2);

        assert.equal(target.callCount, 1);
    });

    /**
     * This test was added due to a bug that caused uncaught errors to get thrown
     * when you used "persist" and only called the throttled function a single time.
     */
    it('Should not throw uncaught errors when "onError: persist"', async function() {
        const fail = sandbox.spy();

        const target = sandbox.spy(function() {
            return Promise.reject(new Error());
        });

        const throttled = throttle(target, {
            delay: 20,
            maxSize: Infinity,
            onError: 'persist'
        });

        await throttled(1).catch(fail);

        assert.equal(target.callCount, 1);
        assert.equal(fail.callCount, 1);
    });

    it('Should cache failed promises when "onError: persist"', async function() {
        const delay = 20;
        const fail = sandbox.spy();

        let hasRejected = false;

        const target = sandbox.spy(function() {
            if (hasRejected)
                return Promise.resolve();

            hasRejected = true;
            return Promise.reject(new Error('should throw'));
        });

        const throttled = throttle(target, { delay, maxSize: Infinity , onError: 'persist' });

        await throttled(1).catch(fail);
        await throttled(1).catch(fail);

        assert.equal(target.callCount, 1);
        assert.equal(fail.callCount, 2);

        await setTimeout(20);
        await throttled(1).catch(fail);
        assert.equal(target.callCount, 2);
        assert.equal(fail.callCount, 2);

    });

    it('Should always reject failed promises when "onError: clear"', function() {
        const delay = 20;
        let hasRejected = false;
        const fail = sandbox.spy();
        const target = function() {
            if (hasRejected)
                return;

            hasRejected = true;
            return Promise.reject(new Error('should throw'));
        };

        const throttled = throttle(target, { delay, maxSize: Infinity , onError: 'clear' });

        return throttled(1)
            .catch(fail)
            .then(() => throttled(1))
            .then(() => {
                assert.equal(fail.callCount, 1);
            });
    });

    it('Should return cached values on rejections by default', async function() {
        const delay = 20;
        const maxAge = 100;
        const fail = sandbox.spy();

        let hasReturned = false;

        const target = function() {
            if (hasReturned)
                return Promise.reject(new Error('should throw'));

            hasReturned = true;
            return Promise.resolve();
        };

        const throttled = throttle(target, { delay, maxAge });

        await throttled(1).catch(fail);

        await setTimeout(20);
        await throttled(1).catch(fail);

        await setTimeout(20);
        await throttled(1).catch(fail);

        // Value no longer cached, should fail now
        await setTimeout(80);
        await throttled(1).catch(fail);
        await throttled(1).catch(fail);

        assert.equal(fail.callCount, 2);
    });

    it('Should call onError for custom error handling', async function() {
        const delay = 20;
        const fail = sandbox.spy();

        const errors = [
            'ignore',
            'throw',
            'save',
        ];

        const target = sandbox.spy(function() {
            if (errors.length)
                return Promise.reject(errors.shift());

            return Promise.resolve();
        });

        const onError = sandbox.spy(function(err, cacheItem) {
            if (err === 'ignore')
                return;

            if (err === 'throw')
                throw err;

            if (err === 'save') {
                cacheItem.error = err;
                throw err;
            }
        });

        const throttled = throttle(target, { delay, maxSize: Infinity, onError });

        // "ignore" error
        await throttled(1).catch(fail);

        assert.equal(fail.callCount, 0);
        assert.equal(onError.callCount, 1);
        assert.equal(target.callCount, 1);

        await setTimeout(20);

        // "throw" error
        await throttled(1).catch(fail);

        assert.equal(fail.callCount, 1);
        assert.equal(onError.callCount, 2);
        assert.equal(target.callCount, 2);

        // "save" error
        await throttled(1).catch(fail);
        await throttled(1).catch(fail);
        await throttled(1).catch(fail);

        assert.equal(fail.callCount, 4);
        assert.equal(onError.callCount, 3);
        assert.equal(target.callCount, 3);
    });

    it('Should invoke onUpdated', function() {
        const delay = 20;
        const onUpdated = sandbox.spy();
        const target = sandbox.spy();

        const throttled = throttle(target, { delay, onUpdated, maxSize: Infinity });

        throttled(1);
        throttled(2);
        throttled(1);
        throttled(1);

        return setTimeout(delay)
            .then(() => {
                assert.equal(target.callCount, 2);
                assert.equal(onUpdated.callCount, 2);

                throttled(2);
                assert.equal(target.callCount, 3);
                assert.equal(onUpdated.callCount, 3);

                throttled(2);
                assert.equal(target.callCount, 3);
                assert.equal(onUpdated.callCount, 3);
            });
    });

    it('Should let you update the delay based on result', function() {
        const maxAge = 100;
        const delay = 10;
        const newDelay = 30;
        const target = sandbox.stub().returns(newDelay);

        const onUpdated = sandbox.spy(item => {
            assert.equal(item.value, newDelay);
            assert.equal(typeof item.delay, 'function');
            item.delay(newDelay);
        });

        const throttled = throttle(target, { delay, maxAge, onUpdated });

        throttled(1);
        throttled(1);
        assert.equal(target.callCount, 1);
        assert.equal(onUpdated.callCount, 1);

        return setTimeout(delay * 2)
            .then(() => {
                throttled(1);
                throttled(1);
                assert.equal(target.callCount, 1);
                assert.equal(onUpdated.callCount, 1);
            })
            .then(() => setTimeout(delay * 2))
            .then(() => {
                throttled(1);
                throttled(1);
                assert.equal(target.callCount, 2);
                assert.equal(onUpdated.callCount, 2);
            });
    });

    it('Should accept a cache option', function() {
        const delay = 50;

        const cache = {
            get: sandbox.stub().returns({ value: 1, stale: true }),
            set: sandbox.spy(),
            has: sandbox.stub().returns(false),
            delete: sandbox.spy(),
            clear: sandbox.spy(),
        };

        const target = sandbox.spy();

        const throttled = throttle(target, { delay, cache });

        throttled(1);
        throttled(2);
        throttled(1);
        throttled(1);

        // 4 because `has` always returns false
        assert.equal(target.callCount, 4);
        assert.equal(cache.has.callCount, 4);
        assert.equal(cache.set.callCount, 4);
        assert.equal(cache.get.callCount, 4);

        throttled.clear(1);
        assert.equal(cache.delete.callCount, 1);

        throttled.clear();
        assert.equal(cache.clear.callCount, 1);
    });

    it('Should use LruCache when maxSize option is set', function() {
        const delay = 50;
        const target = sandbox.spy();

        const constructor = sandbox.spy(MockLruCache.prototype, '_constructorCalled');
        const get = sandbox.spy(MockLruCache.prototype, 'get');

        const throttled = throttle(target, { delay, maxSize: 3 });
        throttled(1);

        sinon.assert.calledOnce(constructor);
        sinon.assert.calledWith(constructor, sinon.match({ maxSize: 3 }));
        sinon.assert.calledOnce(get);
    });
});
