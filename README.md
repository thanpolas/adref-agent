# Adref Ping Agent

A ping agent written in node.js for the Adref service.

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
* `apiSubmitPingsInterval` **{integer}** Default: 300, Every how many pings 
    to submit to the API.
* `localWatcherInterval` **{integer}** Default: 5000, Local watcher that 
    controls the LEDs calculation interval in milliseconds.
    
## Releasing

Just push to master for now ¯\_(ツ)_/¯.


## Release History

- **v0.0.2**, *17 Jan 2020* :: First working version of node.js agent.

## Authors

* [Thanasis Polychronakis](https://github.com/thanpolas)

## License

Copyright Thanasis Polychronakis. [Licensed under the MIT license](/LICENSE)
