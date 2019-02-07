# Warship

Warship is a framework to build distributed systems (a.k.a microservices) aided by event sourcing and task streaming strategies using Redis as core engine. This package is the core to operate an endpoint as **payload issuer** or **method processor** or both (although is not recommended). But first let's introduce some terms and concepts adopted in Warship environment:

* **Payload Issuer** - an endpoint or system that issues named payloads (event sourcing) that can be handled or used by other systems and services, sometimes these payloads mean jobs/tasks. A **payload issuer** can be compared to event emitters or producers (as seen in Apache Kafka TM). Examples of **PIs**: **RESTful APIs**, **RPC APIs**.
* **Method Processor** - a service that can handle tasks/jobs or uses a payload issued by other endpoints as event source triggering business domain flows. A **method processor** can be compared to consumers (Apache Kafka TM), event listeners, and so on.

---------------------------------

##### How Warship uses Redis as endpoint for Event Sourcing?

Warship uses commons Redis data types like `Hashes`, `Strings`, `Streams`, `Pub/Sub` to achieve complete control of payload flow through a environment containing services that are able to resolve jobs or do any kind of data processing. Warship expects the following actors:

- **Client** - an outer system or human that create jobs or named payloads destinated to a Warship namespace.
- **Payload Issuer** - as the name denotes, a service that issues payloads, the importance here is that each payload is named with a method and identified by a message ID and a tracker ID.
- **Method Processor** - a service that knows something about a business domain or data processing logic and can reject, resolve or prepare (re-forward) payloads and/or jobs.
- **Duplex Service** - a service acting as **Payload Issuer** and **Method Processor** at the same time.

---------------------------------

##### The message flow

The basic message flow from **Client** to **Method Processor**. If you want to receive the feedback from the message processing in the **Payload Issuer** you just need to listen to the **out** channel of the message method.

```
+-------------------------------------------------------------------+
|                               Client                              |
+-------------------------------------------------------------------+
|                                                                   |
|    Requests through RESTful/RPC/* any protocol and interface      |
|                                                                   |
+---------+---------------------------------------------------------+
          |
          |
          |
+---------v----------+
|   Payload Issuer   |   Set the message cache
+--------------------+           (HMSET)           +----------------+
|                    +----------------------------->                |
|                    |    Adds the message to      |                |
|                    |     the method stream       |                |
|Generates Tracker ID+----------------------------->                |
|   and Message ID   |   Publishes the message     |                |
|                    |     into in:* channel       |                |
|                    +----------------------------->                |
+--------------------+                             |                |
                                                   |Redis Standalone|
+--------------------+                             |      or        |
|  Method Processor  |     Receives the message    | Redis Cluster  |
+--------------------+         from stream         |                |
|                    <-----------------------------+                |
|                    |   Acknowledge the message   |                |
|                    +----------------------------->                |
|Process the payload |     Drops the message       |                |
|(business logic or  |     cache or sets TTL       |                |
| data processing)   +----------------------------->                |
|                    |    Publish the resolved/    |                |
|                    |    rejected message into    |                |
|                    |        out:* channel        |                |
|                    +----------------------------->                |
+--------------------+                             +----------------+
```

---------------------------------

### v2.1.0 (2019-02-07)

Warship evolved as a project and now we're proud to announce some great features in version 2.1.0.

###### EventStore

By default Warship stores all messages and correlated values in Redis. This is great for performance, but depending on the case it will cost you a huge amount of memory. Warship by itself doesn't store a lot of data in Redis but the payload size of your message is up to your application.

To solve this and make the message data persistence layer flexible, we implemented the **EventStore** which let you create your custom store for message's data. And more, we're shipping a ready-to-use **EventStore** backed by Elasticsearch!

```javascript
const Warship = require('@warshipjs/core');
const elasticsearch = require('elasticsearch');

const {ElasticsearchEventStore} = Warship;

const esClient = elasticsearch.Client({host:'http://localhost:9200'});
const eventStore = new ElasticsearchEventStore(esClient, {indexName:'test-warship'});
const methodProcessor = new Warship({namespace:'test-warship', eventStore}, {port:6379, host:'127.0.0.1'});

methodProcessor.methods.sum.onAwait('message.pending', async (message) => {
	// Loaded from Elasticsearch!
	message = await message.load();
	message.payload = {z:message.payload.x+message.payload.y};
	await message.ack();
	await message.resolve();
}).on('error.async', (event, error) => done(error)).run();
```

###### Message Cryptography

Is really boring to deal with sensitive data on a event sourcing environment. To finally solve this problems the methods `Message.encrypt()` and `Message.decrypt()` were implemented making your life easier.

###### Performance improvement: EventEmitter3

As Warship heavily uses events to handle messages flow we changed all event emitters from native NodeJS EventEmitter to [EventEmitter3](https://github.com/primus/eventemitter3) package.