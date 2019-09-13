# Throttle

[![CircleCI](https://circleci.com/gh/ambassify/throttle.svg?style=svg&circle-token=8907f8b5ae62aab17b3ee1a1077bd1528c0cecb6)](https://circleci.com/gh/ambassify/throttle)

Throttle depending on function arguments.

## Installation

```shell
npm install --save @ambassify/throttle
```

## Usage

```javascript
const throttle = require('@ambassify/throttle');

const throttledFunction = throttle(<function-to-throttle>, <timeout>, [<cache-key-resolver> | <options>]);

throttledFunction.clear(<...args>);
```

#### throttle

- **function-to-throttle**: The function to which access should be throttled, will be called at most once during `timeout` period for the same `cache-key` (by default the first argument to this function).
- **timeout**: During this period only one call to `function-to-throttle` will be allowed with the same `cache-key` (in miliseconds).
- **cache-key-resolver**: This function generates the `cache-key` used as index into the cache. The resolver receives all of the same arguments as `function-to-throttle`. Default: `The value of the first argument`.
- **options**:
  - **resolver**: See `cache-key-resolver` argument
  - **cache**: A custom cache instance. It should implement the `Map` method interface of `clear`, `delete`, `get`, `has`, and `set`.
  - **onCached**: A callback that gets passed the cache item when a new item is cached.
  - **maxSize**: Shortcut to using [LruCache](#lrucache) with this `maxSize` value.
  - **rejectFailedPromise**: If `true` will not cache promises resulting in rejection.

#### .clear

- When invoked without any arguments the entire result cache is cleared.
- When arguments **are** supplied they are passed to `cache-key-resolver` to resolve the cache key to remove from cache.


#### CacheItem

CacheItems are exposed through the `onCached` callback that can be specified in the throttle options.

- **key**: The cache key for this item
- **value**: The cached value for this item
- **clear**: A method to clear this item from cache.

## Example

```javascript
const throttle = require('@ambassify/throttle');

let example = 0;
function myFunction(input) {
    // Do some slow operation with a different result based on input
    example += input;
    return example;
}

// Allow `myFunction` to be called once every 2 seconds for each different `input`.
const myThrottledFunction = throttle(myFunction, 2000);


myThrottledFunction(1); // 1
myThrottledFunction(1); // 1
myThrottledFunction(1); // 1

// Wait for 2 seconds

myThrottledFunction(1); // 2
myThrottledFunction(1); // 2
myThrottledFunction(1); // 2

const conditionalThrottleFunction = throttle(myFunction, 2000, {
    onCached: function(item) {
        // Only cache results for large values of input
        if (item.key < 10)
            item.clear();
    }
}

conditionalThrottleFunction(1); // 1
conditionalThrottleFunction(1); // 2
conditionalThrottleFunction(1); // 3

conditionalThrottleFunction(20); // 23
conditionalThrottleFunction(20); // 23
```

## Caches

This library currently provides one custom caching implementation you can use for the `cache` option.

### LruCache

This cache implementation lets you specifiy a maximum size and will evict the least recently used items in cache when the cache overflows.

#### new LruCache(options)

- **options**:
   - **maxSize**: The maximum amount of items to keep in cache

#### Example

```js
const throttle = require('@ambassify/throttle');
const LruCache = require('@ambassify/throttle/cache/lru');

function myFunction(input) {}

/**
 * Allow `myFunction` to be called once every 2 seconds for each different `input`
 * unless it is called more than 20 times with different `input` values. In that
 * case, it drops the cache item for the least recently used `input`
 */
const myThrottledFunction = throttle(myFunction, 2000, {
    cache: new LruCache({ maxSize: 20 })
});
```

## Contributing

If you have some issue or code you would like to add, feel free to open a Pull Request or Issue and we will look into it as soon as we can.

## License

We are releasing this under a MIT License.

## About us

If you would like to know more about us, be sure to have a look at [our website](https://www.ambassify.com), or our Twitter accounts [@Ambassify](https://twitter.com/Ambassify), [Sitebase](https://twitter.com/Sitebase), [JorgenEvens](https://twitter.com/JorgenEvens)
