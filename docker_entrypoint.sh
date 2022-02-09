#!/usr/bin/env bash
# Script to start services after the container is started

cd /opt/scrumblr
nohup redis-server /etc/redis.conf &
npm start -- --baseurl /scrumblr
