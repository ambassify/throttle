/* globals WeakRef */

// https://github.com/tc39/proposal-weakrefs
// Can be enabled on node using --harmony-weak-refs flag
const supportsWeakRef = (typeof WeakRef != 'undefined');

if (supportsWeakRef) {
    module.exports = function(v) { return new WeakRef(v); }
    module.exports.get = function(v) { return v.deref(); }
    module.exports.isDead = function(v) {
        return (typeof v.deref() == 'undefined');
    }
} else {
    module.exports = function(v) { return v; }
    module.exports.get = function(v) { return v; }
    module.exports.isDead = function() { return false; }
    module.exports.isUnsupported = true;
}
