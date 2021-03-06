# DEPRECATION WARNING

Due to some design problems that would probably require rewriting, I started another project that is much more efficient and agnostic to payload: https://github.com/exocet-engineering/hfx-bus

----------------

# Warship

Warship is a framework to build distributed systems (a.k.a microservices) aided by event sourcing and task streaming strategies using Redis as core engine. This package is the core to operate an endpoint as **payload issuer** or **method processor** or both (although is not recommended). But first let's introduce some terms and concepts adopted in Warship environment:

* **Payload Issuer** - an endpoint or system that issues named payloads (event sourcing) that can be handled or used by other systems and services, sometimes these payloads mean jobs/tasks. A **payload issuer** can be compared to event emitters or producers (as seen in Apache Kafka TM). Examples of **PIs**: **RESTful APIs**, **RPC APIs**.
* **Method Processor** - a service that can handle tasks/jobs or uses a payload issued by other endpoints as event source triggering business domain flows. A **method processor** can be compared to consumers (Apache Kafka TM), event listeners, and so on.

----------------------

### Requirements

- NodeJS 10+
- Redis 5+

----------------------

### Install

```
npm install --save @warshipjs/core
```

----------------------

### Documentation

See [Warship](https://warship.js.org/)

----------------------

### The "fix" folder

Warship uses [ioredis](https://github.com/luin/ioredis) and I discovered a bug when it uses Redis Cluster. The issue is [here](https://github.com/luin/ioredis/issues/748) and the pull request [here](https://github.com/luin/ioredis/pull/749). **Until the fix is not merged in a minor version**, Warship will replace a file in **ioredis** applying the fix. So it's important to know:

- Warship will modify **ioredis** files.
- Warship will change the **ioredis** Redis class prototype to add Redis Streams commands.

**Update**

Fix merged into **ioredis** version **4.3.0**.

----------------------

### Testing

The tests use Docker, so be sure that your user can run `redis:5` and ` docker.elastic.co/elasticsearch/elasticsearch:6.6.0` image.

```
npm test
```
