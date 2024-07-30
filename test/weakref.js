const assert = require('assert');

describe('weakref', () => {

    let weak;

    before(() => {
        weak = require('../src/weakref').weak;
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
