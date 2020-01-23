# Adref Ping Agent

A ping agent written in node.js for the Adref service.

## Still Work In Progress

This is actively being worked on, don't this at home (yet).

## Install

## Documentation

### 1. Get the Agent

```
git clone https://github.com/thanpolas/adref-agent.git
```

### 2. Build The Agent

Enter the directory and type:

```
npm install
```

### 3. Setup your config file

Create an `adref-config.yml` file one folder outside of where adref is installed, with the following contents:

```yaml
# The unique identifier of the agent
token: thanpolas-raspberry-2
```

You may additionally define the following keys for more advanced control:

* `apiEndpoint` **{string}** Override the endpoint to submit the results.
* `brightness` **{number}** From 0 to 100.
* `apiSubmitPingsInterval` **{integer}** Default: 300, Every how many pings 
    to submit to the API.
* `localWatcherInterval` **{integer}** Default: 5000, Local watcher that 
    controls the LEDs calculation interval in milliseconds.

### 4. Install System Dependencies

The Neopixel python driver need to be pre-installed... The easiest way to get
the driver installed is to use the Unicorn HAT drivers install script... see the
<a href="http://learn.pimoroni.com/tutorial/unicorn-hat/getting-started-with-unicorn-hat" target="_new">
Pimoroni Getting Started with Unicorn HAT</a> page.

    curl -sS get.pimoroni.com/unicornhat | bash

## LED Control

### Testing the LEDs

Make sure you have stopped any background processes of the agent, and then invoke the agent with the "test" argument like so:

```
sudo npm start test
```

This will put the agent into LED test mode and will test all the possible states.

### Running Without LEDs

For testing on your local you may not want to actually launch the LED library, you can do that with:

```
npm start noled
```

## Releasing

Type on CLI:

```
release-it
```

Install the [release-it package from this link](https://github.com/release-it/release-it).

## Release History

- **v0.0.5**, *23 Jan 2020* :: Auto Updated done
    - Will now auto-update based on github tag releases.
    - Cleaned up directory structure.
- **v0.0.3**, *21 Jan 2020* :: LED Complete
    - All neopixel LED States implemented and tested.
    - Handles ping timeouts and spikes.
    - Handles internet outages.
    - Clean shutdown.
    - Fixes and tweaks.
- **v0.0.2**, *17 Jan 2020* :: First working version of node.js agent.

## License

Copyright Thanasis Polychronakis. [Licensed under the MIT license](/LICENSE)
