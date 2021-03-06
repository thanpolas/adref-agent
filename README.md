# Adref Ping Agent

A ping agent for Raspberry Pi and Neopixel LEDs.

This agent will start ICMP pings to various targets (explained bellow),
measure and display the quality of your internet connection using the LEDs
and periodically send your ping times to the AdrefPing Service (still WIP).

## Install

### 1. Prerequisites

#### System Dependencies for the Neopixel LED

The Neopixel python driver need to be pre-installed... The easiest way to get
the driver installed is to use the Unicorn HAT drivers install script... see the
[Pimoroni Getting Started with Unicorn HAT][HAT] page.

You may skip this step if you want to install the agent locally for development.

```
curl -sS get.pimoroni.com/unicornhat | bash
```

#### Prepare the Folders on Your Pi

For everything to function correctly (auto-updates and all) you need the
following folder structure:

* `~/adref/` The main working folder, this can be anything really, what matters
  are the folders bellow.
* `~/adref/adref-agent/` This is where the adref-agent package will be installed.

### 2. Download the Agent

Enter the directory `~/adref/adref-agent/` and download the agent.

```
git clone https://github.com/thanpolas/adref-agent.git adref-agent-first
```

### 3. Create a Symlink to the Agent

You are still in the directory `~/adref/adref-agent/`.

This step is important for auto-update to work, you have to create a symbolic
link from the name `adref-agent` to the downloaded package:

```
ln -s adref-agent-first adref-agent
```

### 4. Build The Agent

Enter the downloaded package and type:

```
npm ci
```

### 5. Setup your config file

You will need to copy the two files that exist in the package's `copyfiles/`
folder to the directory `~/adref/`. Which, if you did everything right should
be two directories behind the adref downloaded package folder, so:

```
cp copyfiles/* ../../
```

That should create two files:

* `~/adref/adref-config.yml` Which you need to edit.
* `~/adref/run.sh` Which you should make sure is executable.

#### Adref Config File Options

For the `~/adref/adref-config.yml` config file you may define the following
options:

* `token` **{string}** Token to be used when submitting your ping times to
  the Adref service.
* `apiEndpoint` **{string}** Override the endpoint to submit the results.
* `brightness` **{number}** From 0 to 100.
* `apiSubmitPingsInterval` **{integer}** Default: 300, Every how many pings 
    to submit to the API.
* `localWatcherInterval` **{integer}** Default: 5000, Local watcher that 
    controls the LEDs calculation interval in milliseconds.

## LED Control

The Adref-Agent uses the [Adafruit NeoPixel Stick 8x][neopixel], which as the
name suggessts, has 8 RGB LEDs.

### LED Signals

Adref-Agent uses the following patterns to signal the internet status.

| Status | LED State | Description |
|--------|-----------|-------------|
|All Good| 8 pixels Green | All is good with your internet. |
|Minor Issues| 6 pixels Yellow | Less than 30% variance in ping times.|
|Moderate Issues| 4 pixels Orange | More than 30%, less than 60% variance.|
|Severe Issues| 2 pixels Red | More than 60% variance.|
|Ping Timeout| 8 pixels go red for 500ms  | When a ping timeout happens LEDs blink.|
|Spike in last ping| 8 pixels go blue for 500ms | When a spike is observed on the last ping.|

#### LED Internet Outage Representation

When an internet outage happens, the LEDs split into three columns:

* 2 LEDs Represent the ping quality to your local router.
* 2 LEDs Represent the ping quality to your internet gateway (first hop).
* 2 LEDs Blink red as they represent your internet connection that is down.

### Testing the LEDs

Make sure you have stopped any background processes of the agent, and then 
invoke the agent with the "test" argument like so:

```
sudo npm start test
```

This will put the agent into LED test mode and will test all the possible 
states, check your console output to see what is happening.

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

## Setting up Adref to Run Continuously

Create the Adref Service on your Linux:

```
sudo vi /lib/systemd/system/adref.service
```

Paste the following:

```
[Unit]
Description=Adref Ping Service

[Service]
ExecStart=/home/pi/adref/run.sh
StandardOutput=null

[Install]
WantedBy=multi-user.target
Alias=adref.service
```

### Controlling the Adref Service

```
sudo systemctl start adref.service
sudo systemctl restart adref.service
sudo systemctl stop adref.service
```

## Wiring the NeoPixel to Raspberry

* Pi 5V to NeoPixel 5V
* Pi GND to NeoPixel GND
* Pi GPIO18 to NeoPixel Din

![Neopixel Wiring](https://cdn-learn.adafruit.com/assets/assets/000/063/929/medium640/led_strips_raspi_NeoPixel_bb.jpg?1539981142)

[Photo Curtesy of Adafruit's article on Neopixel wiring](https://learn.adafruit.com/neopixels-on-raspberry-pi/raspberry-pi-wiring).

## What Does the Adref Agent Actually Do

### Ping Targets

Adref will discover and ping three targets for you:

* **Local** Your local model, typically found in `192.168.1.1`.
* **Gateway** Your internet gateway IP, this would be the second hop when
  you perform a traceroute, right after your local router.
* **Internet** An internet IP close to you.

### API Submission

In frequent ocassions (currently every 300 pings) the Adref Agent will submit 
your ping times to the Adref Service where they are stored so you can access 
them at a later time.

### How Pings Are Performed

The Adref Agent launches 3 separate Child Processes running the unix ping 
command indefinetely. The stdout of each ping command is streamed to the
agent who then processes and emits them for the rest of the local agent's
services to digest.

### Neopixel LED Control

Adafruit has only released low-leverl libraries for the Neopixel on Python.
Therefore a Child Process is launched with the python library that manages
the LEDs. Communication is one-way by exchanging JSON packets through stdin.

### Keep Alive Operation

Every 2 minutes a keep-alive effect happens on the LEDs to indicate the agent is
alive. Today there is only one effect, the "ping-pong" which performs a 
ping-pong like movement of a darker LED across the 8 leds and back.

### Auto Updates

The agent will query Github every hour for a new version based on Git Tags
pushed to the main repository. When a new version is found it will be 
downloaded, extracted and built before it will get launched by the bash script
that controls the launch of the adref-agent (`~/adref/run.sh`).

## Release History

- **v1.0.2**, *12 Feb 2020*
    - Fixed case when there is internet outage, how the LEDs render.
- **v1.0.1**, *29 Jan 2020*
    - Fixed keep-alive pingpong fx.
    - New API endpoing.
- **v1.0.0**, *23 Jan 2020* :: It works.
- **v0.0.7**, *23 Jan 2020* :: Auto Updat done
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

[HAT]: http://learn.pimoroni.com/tutorial/unicorn-hat/getting-started-with-unicorn-hat
[neopixel]: https://www.adafruit.com/product/1426
