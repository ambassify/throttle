const sinon = require('sinon');
const assert = require('assert');
const sleep = require('sleep-promise');

describe('#throttle', function() {

    let sandbox = null;
    const throttle = require('../index');

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

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

        const throttled = throttle(target, timeout);

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
});
