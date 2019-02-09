#!/bin/bash
docker run -d -p 6379:6379 --name warship_redis redis:5
docker run -d -p 9200:9200 --name warship_elasticsearch docker.elastic.co/elasticsearch/elasticsearch:6.6.0
sleep 10
npm run lint
npm run test:integration
docker stop warship_redis && docker rm warship_redis
docker stop warship_elasticsearch && docker rm warship_elasticsearch