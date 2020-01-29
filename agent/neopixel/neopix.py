#!/usr/bin/python

# Original Source
# Copyright 2013-2016 IBM Corp.
# Copyright 2016 JS Foundation and other contributors, https://js.foundation/
# https://github.com/node-red/node-red-nodes/tree/master/hardware/neopixel


# Import library functions we need
import sys
import getpass
import time
import threading
import json
try:
    from rpi_ws281x import __version__, PixelStrip, Adafruit_NeoPixel, Color
except ImportError:
    from neopixel import Adafruit_NeoPixel as PixelStrip, Color
    __version__ = "legacy"

try:
    raw_input          # Python 2
except NameError:
    raw_input = input  # Python 3

# LED strip configuration:
LED_COUNT      = 8      # Number of LED pixels.
LED_PIN        = 18      # GPIO pin connected to the pixels (must support PWM!).
LED_FREQ_HZ    = 800000  # LED signal frequency in hertz (usually 800khz)
LED_DMA        = 10      # DMA channel to use for generating signal (try 10)
LED_BRIGHTNESS = 10     # Set to 0 for darkest and 255 for brightest
LED_INVERT     = False   # True to invert the signal (when using NPN transistor level shift)
LED_CHANNEL    = 0       # PWM channel
LED_GAMMA = [
0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2,
2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5,
6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 11, 11,
11, 12, 12, 13, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18,
19, 19, 20, 21, 21, 22, 22, 23, 23, 24, 25, 25, 26, 27, 27, 28,
29, 29, 30, 31, 31, 32, 33, 34, 34, 35, 36, 37, 37, 38, 39, 40,
40, 41, 42, 43, 44, 45, 46, 46, 47, 48, 49, 50, 51, 52, 53, 54,
55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70,
71, 72, 73, 74, 76, 77, 78, 79, 80, 81, 83, 84, 85, 86, 88, 89,
90, 91, 93, 94, 95, 96, 98, 99,100,102,103,104,106,107,109,110,
111,113,114,116,117,119,120,121,123,124,126,128,129,131,132,134,
135,137,138,140,142,143,145,146,148,150,151,153,155,157,158,160,
162,163,165,167,169,170,172,174,176,178,179,181,183,185,187,189,
191,193,194,196,198,200,202,204,206,208,210,212,214,216,218,220,
222,224,227,229,231,233,235,237,239,241,244,246,248,250,252,255]

LED_COUNT = max(0,int(sys.argv[1]))
WAIT_MS = max(0,int(sys.argv[2]))
LED_BRIGHTNESS = min(255,int(max(0,float(sys.argv[3])) * 255 / 100))

# if (sys.argv[4].lower() != "true"):
#     LED_GAMMA = range(256)

blink_active = False
blink_targets = []
prev_state = 10

def blink_leds():
    global blink_active
    global blink_targets

    toggle = True
    bleep_time = 0.5
    while blink_active:
        if toggle:
            color = Color(0, 0, 0)
            toggle = False
        else:
            color = Color(255, 0, 0)
            toggle = True

        targetLeds = []
        for target in blink_targets:
                if target == "internet":
                    targetLeds.append(7)
                if target == "gateway":
                    targetLeds.append(3)
                if target == "local":
                    targetLeds.append(0)

        for targetLed in targetLeds:
            strip.setPixelColor(targetLed, color)

        strip.show()
        time.sleep(bleep_time)

def setBrightness(strip, brightness, wait_ms=30):
    """Set overall brighness"""
    strip.setBrightness(brightness)
    strip.show()

def colorWipe(strip, color, wait_ms = 0):
    """Wipe color across display a pixel at a time."""
    if (wait_ms > 0):
        for i in range(strip.numPixels()):
            strip.setPixelColor(i, color)
            strip.show()
            time.sleep(wait_ms/1000.0)
    else:
        for i in range(strip.numPixels()):
            strip.setPixelColor(i, color)
        strip.show()

def wheel(pos):
    """Generate rainbow colors across 0-255 positions."""
    if pos < 85:
        return Color(pos * 3, 255 - pos * 3, 0)
    elif pos < 170:
        pos -= 85
        return Color(255 - pos * 3, 0, pos * 3)
    else:
        pos -= 170
        return Color(0, pos * 3, 255 - pos * 3)

def rainbow(strip, wait_ms=20, iterations=2):
    """Draw rainbow that fades across all pixels at once."""
    for j in range(256*iterations):
        for i in range(strip.numPixels()):
            strip.setPixelColor(i, wheel((i+j) & 255))
        strip.show()
        time.sleep(wait_ms/1000.0)

def ping_fail(target):
    """
    Triggers when a ping fail happens.
    We will blink the lights fast
    """
    colorWipe(strip, Color(255, 0, 0))
    time.sleep(0.5)
    global prev_state
    orig_prev_state = prev_state
    prev_state = 10
    set_internet_state(orig_prev_state)

def get_color_from_state(state):
    color = Color(0, 0, 0)

    if state == 0:
        color = Color(0, 255, 0)
    if state == 1:
        color = Color(255, 255, 0)
    if state == 2:
        color = Color(255, 200, 0)
    if state == 3:
        color = Color(255, 0, 0)
    if state == 4:
        color = Color(255, 0, 0)

    return color

def handle_keep_alive(alive_type):
    """
    Performs a nice FX to indicate the agent is alive
    """
    global prev_state

    # Wait time in seconds
    wait_time = 0.04

    # Only work when state is all green
    if (prev_state != 0):
        return

    if alive_type == "pingpong":
        color_green = get_color_from_state(0)
        color_wave = Color(0, 80, 0)
        num_pixels = strip.numPixels()
        for i in range(num_pixels):
            strip.setPixelColor(i, color_wave)
            if i > 0:
                strip.setPixelColor(i - 1, color_green)
            strip.show()
            time.sleep(wait_time)
        for i in range(num_pixels, 0, -1):
            index_use = i - 1
            strip.setPixelColor(index_use, color_wave)
            if index_use < num_pixels:
                strip.setPixelColor(index_use + 1, color_green)
            strip.show()
            time.sleep(wait_time)

        colorWipe(strip, color_green)

def set_target_led(target, state):
    if target == "local":
        leds = [0]
    if target == "gateway":
        leds = [3]
    if target == "internet":
        leds = [7]

    color = get_color_from_state(state)

    for i in leds:
        strip.setPixelColor(i, color)

def process_spike(percent_diff):
    """
    Handles a spike on the last ping that happened
    Will flash with blue for 1 second
    """
    global prev_state

    colorWipe(strip, Color(0, 0, 255))
    time.sleep(1)

    cur_state = prev_state
    prev_state = 10
    set_internet_state(cur_state)

def handle_internet_outage(state):
    """
    Handles the LEDs when internet is out (Sev: 4)
    """
    global prev_state
    global blink_targets
    global blink_active

    internet_state = int(state["internet"])
    if internet_state != prev_state:
        colorWipe(strip, Color(0, 0, 0))
        prev_state = internet_state

    blink_targets.clear()

    # To be here, means internet is out
    blink_targets.append("internet")

    gw_state = int(state["gateway"])
    if (gw_state == 4):
        blink_targets.append("gateway")
    else:
        set_target_led("gateway", gw_state)

    local_state = int(state["local"])
    if (local_state == 4):
        blink_targets.append("local")
    else:
        set_target_led("local", local_state)

    blink_active = True
    blink_thread = threading.Thread(target=blink_leds)
    blink_thread.start()

def set_internet_state(internet_state):
    """
    Sets the LED state based on the internet's state
    """
    global prev_state
    global blink_active
    color = get_color_from_state(internet_state)

    if internet_state != prev_state:
        colorWipe(strip, Color(0, 0, 0))

    blink_active = False

    rangeNum = 8
    if internet_state == 1:
        rangeNum = 6
    if internet_state == 2:
        rangeNum = 4
    if internet_state == 3:
        rangeNum = 2

    if internet_state != prev_state:
        for i in range(rangeNum):
            strip.setPixelColor(i, color)
        strip.show()

    prev_state = internet_state

# Main loop:
if __name__ == '__main__':
    # Create NeoPixel object with appropriate configuration.
    #strip = Adafruit_NeoPixel(LED_COUNT, LED_PIN, LED_FREQ_HZ, LED_DMA, LED_INVERT, LED_BRIGHTNESS)
    if __version__ == "legacy":
        strip = PixelStrip(LED_COUNT, LED_PIN, LED_FREQ_HZ, LED_DMA, LED_INVERT, LED_BRIGHTNESS, LED_CHANNEL)
    else:
        strip = PixelStrip(LED_COUNT, LED_PIN, LED_FREQ_HZ, LED_DMA, LED_INVERT, LED_BRIGHTNESS, LED_CHANNEL, LED_GAMMA)# Intialize the library (must be called once before other functions).

    strip.begin()
    print("Python Init. Running as user:" + str(getpass.getuser()))

    ## Color wipe animations.
    colorWipe(strip, Color(127, 0, 0), WAIT_MS)  # Red wipe
    colorWipe(strip, Color(0, 127, 0), WAIT_MS)  # Green wipe
    colorWipe(strip, Color(0, 0, 127), WAIT_MS)  # Blue wipe
    colorWipe(strip, Color(0, 0, 0), WAIT_MS)  # Off wipe

    while True:
        """
        Monitors stdin for messages from the node agent. The messages are JSON serialized and have the schema:
        {
          # The type of the message, can be one of "set_led", "ping_timeout"
          type: "set_led",

          # State defined when "set_led" type, 0 for green to 4 for outage.
          state: {
            local: 0,
            gateway: 0,
            internet: 1,
          }
        }
        """
        try:
            data = raw_input()
            message = json.loads(data)

            if message['type'] == "set_led":
                internetState = int(message["state"]["internet"])

                if (internetState == 4):
                    handle_internet_outage(message["state"])
                else:
                    set_internet_state(internetState)

            if message['type'] == "ping_fail":
                ping_fail(message["target"])

            if message["type"] == "spike":
                process_spike(message["percent_diff"])

            if message["type"] == "keep-alive":
                handle_keep_alive(message["keep_alive_type"])

        except (EOFError, SystemExit):  # hopefully always caused by us sigint'ing the program
            sys.exit(0)
        except Exception as ex:
            print("bad data: "+data)
            print(ex)
