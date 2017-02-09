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

const throttledFunction = throttle(<function-to-throttle>, <timeout>, <cache-key-resolver>);
```

- **function-to-throttle**: The function to which access should be throttled, will be called at most once during `timeout` period for the same `cache-key` (by default the first argument to this function).
- **timeout**: During this period only one call to `function-to-throttle` will be allowed with the same `cache-key`.
- **cache-key-resolver**: This function generates the `cache-key` used as index into the cache. The resolver receives all of the same arguments as `function-to-throttle`. Default: `The value of the first argument`.


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
```

## Contributing

If you have some issue or code you would like to add, feel free to open a Pull Request or Issue and we will look into it as soon as we can.

## License

We are releasing this under a MIT License.

## About us

If you would like to know more about us, be sure to have a look at [our website](https://www.ambassify.com), or our Twitter accounts [@Ambassify](https://twitter.com/Ambassify), [Sitebase](https://twitter.com/Sitebase), [JorgenEvens](https://twitter.com/JorgenEvens)
