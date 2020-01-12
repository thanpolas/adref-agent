#!/bin/bash

### Set Operational Variables

## API VALUES

# API Endpoint
API_ENDPOINT="https://adref.projects.sirodoht.com/pings/"
# The API ID Field name
API_ID_FIELD="token"
# The API ID Value
API_ID_VALUE="value888"

# The API's timestamp field name
API_TS_FIELD="ping_timestamp"

# The API's pings Local field name
API_PING_LOCAL_FIELD="ping_local"

# The API's pings Gateway field name
API_PING_GATEWAY_FIELD="ping_gateway"

# The API's pings Google field name
API_PING_INTERNET_FIELD="ping_internet"

# Filenames with pings
FILE_PING_LOCAL="pings-local.txt"
FILE_PING_GATEWAY="pings-gateway.txt"
FILE_PING_INTERNET="pings-internet.txt"

# Time to sleep between sending report in seconds
SLEEP_TIME=2

# The local router's IP
LOCAL_IP="192.168.1.1"

# The Gateway IP (first IP on the internet)
GATEWAY_IP="100.96.185.33"

# The internet's IP
INTERNET_IP="8.8.8.8"

###########
###
### NO EDITING BEYOND THIS POINT
###
###########

# Reset Pings store
PINGS_STORE_LOCAL=""
API_TS_VALUE="z"

# Get the local IP

function get_local_ip() {
  local_ip=`ipconfig getifaddr en0`
  echo $local_ip
}

# Function that parses each line of the ping output.
# @param {string} filename The filename to parse.
# @return {string} Comma separated ping results.
function parse_ping_file() {
  file=$1
  store=""

  while IFS="" read -r line || [ -n "$line" ]
  do
    if [[ $line =~ ^[64|Request].+$ ]]; then
      store=$store,$line
    fi
  done < "$file"

  echo ${store:1}
}

# Parses All the ping ifles.
function master_parser() {
  # Reset variables
  API_TS_VALUE=`date -u +"%Y-%m-%dT%H:%M:%S%z"`

  PINGS_STORE_LOCAL=`parse_ping_file $FILE_PING_LOCAL`
  PINGS_STORE_GATEWAY=`parse_ping_file $FILE_PING_GATEWAY`
  PINGS_STORE_INTERNET=`parse_ping_file $FILE_PING_INTERNET`
}

# Runs the ping command in the background, waits and then kills it
function run_pings() {
  ping $LOCAL_IP > $FILE_PING_LOCAL &
  PID_PING_LOCAL=$!

  ping $GATEWAY_IP > $FILE_PING_GATEWAY &
  PID_PING_GATEWAY=$!

  ping $INTERNET_IP > $FILE_PING_INTERNET &
  PID_PING_INTERNET=$!

  sleep $SLEEP_TIME

  kill $PID_PING_LOCAL > /dev/null 2>&1
  kill $PID_PING_GATEWAY > /dev/null 2>&1
  kill $PID_PING_INTERNET > /dev/null 2>&1

  wait $PID_PING_LOCAL > /dev/null 2>&1
  wait $PID_PING_GATEWAY > /dev/null 2>&1
  wait $PID_PING_INTERNET > /dev/null 2>&1
}

# Posts the ping results to the API Endpoint
function post_results() {
  CURL_CMD='curl --header "Content-Type: application/json" --request POST'
  CURL_CMD="$CURL_CMD -s --data '{"
  CURL_CMD="$CURL_CMD \"$API_ID_FIELD\":\"$API_ID_VALUE\","
  CURL_CMD="$CURL_CMD \"$API_TS_FIELD\":\"$API_TS_VALUE\","
  CURL_CMD="$CURL_CMD \"$API_PING_LOCAL_FIELD\":\"$PINGS_STORE_LOCAL\","
  CURL_CMD="$CURL_CMD \"$API_PING_GATEWAY_FIELD\":\"$PINGS_STORE_GATEWAY\","
  CURL_CMD="$CURL_CMD \"$API_PING_INTERNET_FIELD\":\"$PINGS_STORE_INTERNET\""
  CURL_CMD="$CURL_CMD}' $API_ENDPOINT"

  # echo $CURL_CMD
  response=`eval $CURL_CMD`
  echo $response
}

# Kills all ping commands, ensures cleanup
function killall_ping() {
  killall -9 ping > /dev/null 2>&1
}

function core_loop() {
  while true
  do
    killall_ping
    run_pings
    master_parser
    post_results
    sleep 1
  done
}

core_loop

