#!/bin/bash

# Responsible for running the agent and checking if there are new versions.


NEW_AGENT_FILE=/home/pi/adref/adref-agent/new-adref.txt

AGENT_SYMLINK=/home/pi/adref/adref-agent

AGENT_PID=start_agent()

while true
do
  if test -f "$NEW_AGENT_FILE"; then
    # New Update found, kill existing agent and replace symlink.
    kill -9 agent_pid

    # Delete symlink
    rm AGENT_SYMLINK

    ln -s `cat $NEW_AGENT_FILE` z
    AGENT_PID=start_agent()
  fi
  sleep 10
done

function start_agent() {
  sudo /usr/bin/node AGENT_SYMLINK > /home/pi/adref/adref.log 2>&1
  echo $!
}
