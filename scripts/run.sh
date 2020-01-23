#!/bin/bash

# Responsible for running the agent and checking if there are new versions.


NEW_AGENT_FILE=/home/pi/adref/adref-agent/new-adref.txt

AGENT_SYMLINK=/home/pi/adref/adref-agent/adref-agent

sudo /usr/bin/node $AGENT_SYMLINK > /home/pi/adref/adref.log 2>&1 &
PID=$!

while true
do
  echo "In the loop, PID: $PID"
  if test -f "$NEW_AGENT_FILE"; then
    # New Update found, kill existing agent and replace symlink.
    sudo pkill -9 -P $PID

    # Delete symlink
    rm $AGENT_SYMLINK

    ln -s `cat $NEW_AGENT_FILE` $AGENT_SYMLINK

    rm $NEW_AGENT_FILE

    sudo /usr/bin/node $AGENT_SYMLINK > /home/pi/adref/adref.log 2>&1 &
    PID=$!
  fi
  sleep 10
done

function start_agent() {
  sudo /usr/bin/node $AGENT_SYMLINK > /home/pi/adref/adref.log 2>&1
  PID=$!

  echo "FOUND PID: $PID"
  echo $PID
}
