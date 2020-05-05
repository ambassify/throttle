/* globals describe, before, afterEach, it */

const sinon = require('sinon');
const assert = require('assert');
const sleep = require('sleep-promise');
const mock = require('mock-require');

describe('#throttle', function() {

    const sandbox = sinon.createSandbox();
    let throttle;

    class MockLruCache {
        constructor(options) { this._constructorCalled(options); }
        _constructorCalled(options) {}
        get() {return { value: 1 } }
        set() { }
        has() { return false; }
        delete() { }
        clear() { }
    }

    before(function() {
        mock('../cache/lru', MockLruCache);
        throttle = require('../index');
    })

    afterEach(function() {
        sandbox.restore();
    });

    it('Should cache results', function() {
        const target = sandbox.spy();
        const throttled = throttle(target, 200);

        throttled(1);
        throttled(2);
        throttled(1);
        throttled(2);
        throttled(2);
        throttled(3);

        assert.equal(target.callCount, 3);
    });

    it('Should not cache results when timeout not set', function() {
        const target = sandbox.spy();
        const throttled = throttle(target);

        throttled(1);
        throttled(2);
        throttled(2);

        assert.equal(target.callCount, 3);
    });

    [0, -1, -200].forEach(function(timeout) {
        it(`Should not cache results when timeout < 1 (${timeout})`, function() {
            const target = sandbox.spy();
            const throttled = throttle(target, timeout);

            throttled(1);
            throttled(2);
            throttled(2);

            assert.equal(target.callCount, 3);
        });
    });

    it('Should expire cache entries', function() {
        const timeout = 20;
        const target = sandbox.spy();
        const throttled = throttle(target, timeout);

        throttled(1);
        throttled(2);
        throttled(2);

        assert.equal(target.callCount, 2);

        return sleep(timeout)
        .then(() => {
            assert.equal(target.callCount, 2);

            throttled(2);
            assert.equal(target.callCount, 3);

            throttled(2);
            assert.equal(target.callCount, 3);
        });
    });

    it('Should clear cache on `.clear()`', function() {
        const timeout = 20;
        const target = sandbox.spy();
        const throttled = throttle(target, timeout);

        throttled(1);
        throttled(2);
        throttled.clear();
        throttled(2);

        assert.equal(target.callCount, 3);
    });

    it('Should clear specific cache entries on `.clear()`', function() {
        const timeout = 20;
        const target = sandbox.spy();
        const throttled = throttle(target, timeout);

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
        const timeout = 20;
        const target = sandbox.spy();
        const resolver = sandbox.stub();
        resolver.withArgs(1).onFirstCall().returns(1);
        resolver.withArgs(2)
            .onFirstCall().returns(2)
            .onSecondCall().returns(3);
        resolver.throws('Invalid resolver arguments');

        const throttled = throttle(target, timeout, resolver);

        throttled(1);
        throttled(2);
        throttled(2);

        assert.equal(target.callCount, 3);
    });

    it('Should allow resolver to return object', function() {
        const timeout = 20;
        const target = sandbox.spy();
        const resolver = sandbox.stub().returns({ id: 1333 });

        const throttled = throttle(target, timeout, resolver);

        throttled(1);
        throttled(2);
        throttled(2);

        assert.equal(target.callCount, 1);
    });

    it('Should allow resolver to return number', function() {
        const timeout = 20;
        const target = sandbox.spy();
        const resolver = sandbox.stub().returns(1333);

        const throttled = throttle(target, timeout, resolver);

        throttled(1);
        throttled(2);
        throttled(2);

        assert.equal(target.callCount, 1);
    });

    it('Should allow resolver to return Date', function() {
        const timeout = 20;
        const target = sandbox.spy();
        const resolver = sandbox.stub().returns(new Date());

        const throttled = throttle(target, timeout, resolver);

        throttled(1);
        throttled(2);
        throttled(2);

        assert.equal(target.callCount, 1);
    });

    it('Should cache failed promises', function() {
        const timeout = 20;
        let hasRejected = false;
        const fail = sandbox.spy();
        const target = function() {
            if (hasRejected)
                return;

            hasRejected = true;
            return Promise.reject(new Error('should throw'));
        };

        const throttled = throttle(target, timeout, {
            rejectFailedPromise: false
        });

        return throttled(1)
            .catch(fail)
            .then(() => throttled(1))
            .then(
                () => { throw new Error('should not resolve'); },
                () => {
                    assert.equal(fail.callCount, 1);
                }
            );
    });

    it('Should not cache failed promises', function() {
        const timeout = 20;
        let hasRejected = false;
        const fail = sandbox.spy();
        const target = function() {
            if (hasRejected)
                return;

            hasRejected = true;
            return Promise.reject(new Error('should throw'));
        };

        const throttled = throttle(target, timeout, { rejectFailedPromise: true });

        return throttled(1)
            .catch(fail)
            .then(() => throttled(1))
            .then(() => {
                assert.equal(fail.callCount, 1);
            });
    });

    it('Should not cache failed promises by default', function() {
        const timeout = 20;
        let hasRejected = false;
        const fail = sandbox.spy();
        const target = function() {
            if (hasRejected)
                return;

            hasRejected = true;
            return Promise.reject(new Error('should throw'));
        };

        const throttled = throttle(target, timeout);

        return throttled(1)
            .catch(fail)
            .then(() => throttled(1))
            .then(() => {
                assert.equal(fail.callCount, 1);
            });
    });

    it('Should not cache failed promises and invoke onCached', function() {
        const timeout = 20;
        let hasRejected = false;
        const fail = sandbox.spy();
        const onCached = sandbox.spy();
        const target = function() {
            if (hasRejected)
                return;

            hasRejected = true;
            return Promise.reject(new Error('should throw'));
        };

        const throttled = throttle(target, timeout, {
            rejectFailedPromise: true,
            onCached
        });

        return throttled(1)
            .catch(fail)
            .then(() => throttled(1))
            .then(() => {
                assert.equal(fail.callCount, 1);
                assert.equal(onCached.callCount, 2);
            });
    });

    it('Should invoke onCached', function() {
        const timeout = 20;
        const onCached = sandbox.spy();
        const target = sandbox.spy();

        const throttled = throttle(target, timeout, { onCached });

        throttled(1);
        throttled(2);
        throttled(1);
        throttled(1);

        return sleep(timeout)
        .then(() => {
            assert.equal(target.callCount, 2);
            assert.equal(onCached.callCount, 2);

            throttled(2);
            assert.equal(target.callCount, 3);
            assert.equal(onCached.callCount, 3);

            throttled(2);
            assert.equal(target.callCount, 3);
            assert.equal(onCached.callCount, 3);
        });
    });

    it('Should let you update the timeout based on result', function() {
        const timeout = 10;
        const newTimeout = timeout * 3;
        const target = sandbox.stub().returns(newTimeout);

        const onCached = sandbox.spy(item => {
            assert.equal(item.value, newTimeout);
            assert.equal(typeof item.ttl, 'function');
            item.ttl(newTimeout);
        });

        const throttled = throttle(target, timeout, { onCached });

        throttled(1);
        throttled(1);
        assert.equal(target.callCount, 1);
        assert.equal(onCached.callCount, 1);

        return sleep(timeout * 2)
            .then(() => {
                throttled(1);
                throttled(1);
                assert.equal(target.callCount, 1);
                assert.equal(onCached.callCount, 1);
            })
            .then(() => sleep(timeout * 2))
            .then(() => {
                throttled(1);
                throttled(1);
                assert.equal(target.callCount, 2);
                assert.equal(onCached.callCount, 2);
            });
    });

    it('Should accept a cache option', function () {
        const timeout = 50;

        const cache = {
            get: sandbox.stub().returns({ value: 1 }),
            set: sandbox.spy(),
            has: sandbox.stub().returns(false),
            delete: sandbox.spy(),
            clear: sandbox.spy(),
        };

        const target = sandbox.spy();

        const throttled = throttle(target, timeout, { cache });

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

    it('Should use LruCache when maxSize option is set', function () {
        const timeout = 50;
        const target = sandbox.spy();

        const constructor = sandbox.spy(MockLruCache.prototype, '_constructorCalled');
        const get = sandbox.spy(MockLruCache.prototype, 'get');

        const throttled = throttle(target, timeout, { maxSize: 3 });
        throttled(1);

        sinon.assert.calledOnce(constructor);
        sinon.assert.calledWith(constructor, sinon.match({ maxSize: 3 }));
        sinon.assert.calledOnce(get);
    });
});
