# Throttle

[![CircleCI](https://circleci.com/gh/ambassify/throttle.svg?style=svg&circle-token=8907f8b5ae62aab17b3ee1a1077bd1528c0cecb6)](https://circleci.com/gh/ambassify/throttle)

Create a throttled version of a function.

## Installation

```shell
npm install --save @ambassify/throttle
```

## Usage

Creates a throttled version of `func`. `func` will only be invoked when its
result is not in the throttled function's cache or the time between the
current and last invocation is larger than what's specified by `delay`.

If `func` is async, the throttled function will immediately return a value
from cache (if available) while `func` is executing.

**Returns**: <code>ThrottledFunction</code> - The throttled version of "func"

| Param | Type | Description |
| --- | --- | --- |
| func | <code>function</code> | The function to throttle |
| options | <code>ThrottleOptions</code> |  |

**Example**
```js
const throttle = require('@ambassify/throttle');

const throttled = throttle(<function-to-throttle>, <options>);

throttled('hello');
throttled.clear(<...args>);
```

### ThrottleOptions : <code>Object</code>

| Name | Type | Description |
| --- | --- | --- |
| delay | <code>number</code> | How much time must have been elapsed for `func` to be invoked again when there's a chached result available. Defaults to `Infinity`. |
| maxAge | <code>number</code> | How long are items allowed to remain in cache. Unlimited by default. |
| maxSize | <code>number</code> | How long are items allowed to remain in cache. Unlimited by default. |
| cache | <code>Map</code> | Specify a custom cache for throttle to use. Must provide methods that match Map's equivalent: has, get, set, delete, clear |
| resolver | <code>function</code> | Given the same arguments used to invoke `func` return only what's important to build the cache key. |
| onUpdated | <code>function</code> | Invoked with the `cacheItem` whenever the item is updated. |
| onError | <code>&#x27;clear&#x27;</code> \| <code>&#x27;cached&#x27;</code> \| <code>&#x27;persist&#x27;</code> \| <code>function</code> | Error handler      to use when "func" throws or rejects.      - `clear`: The cache is cleared and the error is thrown      - `persist`: The error is saved into cache and thrown      - `cached`: If a previous value is in cache, it will be returned, if not the error will be thrown      - a custom function that receives the error as first param and cacheItem as the second, when specified        the throttled function won't touch the cache when an error occurs, it's up to this handler        to interact with cacheItem. |

<a name="module_@ambassify/throttle--throttle..ThrottledFunction"></a>

### ThrottledFunction : <code>function</code>
The throttled function.

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| clear | <code>function</code> | When invoked without any arguments the entire cache      is cleared, when **are** supplied they are passed, the item for those      arguments is removed from cache. |


### CacheItem

CacheItems are exposed through the `onUpdated` callback that can be specified in the throttle options.

- **cacheItem.initialized**: Whether or not the item has its initial value
- **cacheItem.pending**: The pending promise when throttle is currently running but already has
a previous value
- **cacheItem.key**: The key for this cache item
- **cacheItem.stale**: Whether or not the cache item&#x27;s value is considered stale based on the
last time it was updated and its &quot;delay&quot; option.
- **cacheItem.value**: Current value of the cache item. When this is set, all timers and the like
for the item are also reset
- **cacheItem.error**: Same as &quot;value&quot; but used to indicate the result of throttled is an error
- **cacheItem.clear()**: Clear the item from throttled&#x27;s cache
- **cacheItem.delay(delay)**: Update this specific item&#x27;s &quot;delay&quot;
- **cacheItem.maxAge(maxAge)**: Update this specific item&#x27;s &quot;maxAge&quot;

## Example

```javascript
const throttle = require('@ambassify/throttle');

let example = 0;

async function myFunction(input) {
    // Delay 500 ms to fake a slow operation
    await new Promise(resolve => setTimeout(resolve, 500));

    example += input;
    return example;
}

// Allow `myFunction` to be called once every 2 seconds for each different
//`input` and cache the value for max 5 seconds.
const throttled = throttle(myFunction, { delay: 2000, maxAge: 5000 });

throttled(1); // 1
throttled(1); // 1
throttled(1); // 1

// Wait for 2 seconds
// "myFunction" is called, but the old cached result is returned immediately

throttled(1); // 1

// Wait 500ms (the fake delay)
// "myFunction" isn't called (as delay hasn't been reached) but we do get the
// latest result

throttled(1); // 2

// Wait for 5 seconds
// "myFunction" is called but the old cached value has expired so it resolves
// with the new value once the function has run

throttled(1); // 3

const conditional = throttle(myFunction, {
    delay: 2000,
    maxAge: 5000
    onCached: function(item) {
        // Only cache results for large values of input
        if (item.key < 10)
            item.clear();
    }
}

conditional(1); // 1
conditional(1); // 2
conditional(1); // 3

conditional(20); // 23
conditional(20); // 23
```

## Contributing

If you have some issue or code you would like to add, feel free to open a Pull Request or Issue and we will look into it as soon as we can.

## License

We are releasing this under a MIT License.

## About us

If you would like to know more about us, be sure to have a look at [our website](https://www.ambassify.com), or our Twitter accounts [@Ambassify](https://twitter.com/Ambassify), [Sitebase](https://twitter.com/Sitebase), [JorgenEvens](https://twitter.com/JorgenEvens).
