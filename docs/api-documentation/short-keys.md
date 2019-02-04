# Short Keys

Each time that we store or transfer something between two endpoints in Warship the keys used for values are encoded into short representation of the keys to reduce the overhead of the data structure transfered in the wire or stored in memory. There's a small tradeoff of CPU for memory and bandwidth in this process.

This page is a documentation of the 1x1 relation between the short and expanded representation of the data structure keys adopted by Warship:

| Short | Expanded           |
|-------|--------------------|
| m     | method             |
| p     | payload            |
| s     | state              |
| er    | error              |
| ac    | alpha_code         |
| nc    | numeric_code       |
| sk    | stack              |
| mi    | message_id         |
| si    | stream_id          |
| ti    | tracker_id         |
| ut    | update_timestamp   |
| ct    | creation_timestamp |
| sf    | forwarded          |
| sr    | resolved           |
| se    | rejected           |
| rs    | retries            |
| rt    | reply_to           |
| ex    | exclusive          |