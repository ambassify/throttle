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
});
