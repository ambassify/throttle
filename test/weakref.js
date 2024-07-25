/* globals describe, before, it */

const assert = require('assert');

describe('weakref', () => {

    let weak;

    before(() => {
        weak = require('../weakref');
    });

    it ('should have WeakRef when harmony flag is enabled', function() {
        const { HARMONY_OPTIONS = '' } = process.env;

        if (!/--harmony-weak-refs/.test(HARMONY_OPTIONS))
            return this.skip();

        assert.notEqual(typeof WeakRef, 'undefined');
        assert.notEqual(weak.isUnsupported, true, 'reported unsupported');
    });

    it ('should create a weak ref', () => {
        const a = { test: 'yes' };

        const ref = weak(a);

        assert(ref);

        assert.strictEqual(weak.get(ref), a);
    });

    it ('should create a weak ref', () => {
        const a = { test: 'yes' };

        const ref = weak(a);

        assert(ref);

        assert.strictEqual(weak.get(ref), a);
    });

    it ('should detect refs that are not dead yet', () => {
        const a = { test: 'yes' };
        const ref = weak(a);

        assert(!weak.isDead(ref), 'weakref is dead');
    });

    it ('should detect when refs become dead', function(done) {
        if (weak.isUnsupported)
            return this.skip();

        this.timeout(30000);

        const ref = (function() {
            const a = { test: 'yes' };
            return weak(a);
        }());

        function isDeadYet() {
            if (weak.isDead(ref))
                return done();

            setTimeout(isDeadYet, 250);
        }

        isDeadYet();
    });

});
