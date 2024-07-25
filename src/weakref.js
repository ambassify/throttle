// Available since Node@14.9 or since Node@12 using --harmony-weak-refs flag
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
