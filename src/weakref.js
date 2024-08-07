// Available since Node@14.9 and on almost all browsers (https://caniuse.com/mdn-javascript_builtins_weakref)
// We add a fallback without weakref just in case, it works but prevents cached
// values from being garbage-collected until their timers run out
const supportsWeakRef = (typeof WeakRef != 'undefined');

let weak;

if (supportsWeakRef) {
    weak = function(v) { return new WeakRef(v); };
    weak.get = function(v) { return v.deref(); };
    weak.isDead = function(v) {
        return (typeof v.deref() == 'undefined');
    };
} else {
    weak = function(v) { return v; };
    weak.get = function(v) { return v; };
    weak.isDead = function() { return false; };
    weak.isUnsupported = true;
}

module.exports = { weak };
