#eventsd

Eventsd service

Supports publishing eventsd messages to the following messaging services:

* rabbitMQ (type: amqp)
* Google Cloud Pubsub (type: gcloud)

## Install

```bash
npm install -g sz-eventsd-server
```

##Config

Specify an optional JSON configuration file:

```bash
eventsd -c path/to/config.json
```
The configuration file should have the following format (defaults shown):

```javascript
{
    "udpServer": {
        "port": 8150,
        "host": "0.0.0.0"
    },
    "websocketServer": {
        "port": 8151
    },
    "publisher": {
        "type": "amqp",
        "options": {
            "host": "127.0.0.1",
            "port": 5672,
            "user": "guest",
            "password": "guest"
        }
    },
    "consumer": {
        "type": "amqp",
        "options": {
            "host": "127.0.0.1",
            "port": 5672,
            "user": "guest",
            "password": "guest"
        }
    },
    "publisherOnly": false,
    "consumerOnly": false
}
```

##Environment Variables

The following environment variables are also available:

```bash
# for firehose connection
SZ_AMQP_HOST
SZ_AMQP_PORT
SZ_AMQP_USER
SZ_AMQP_PASSWORD
SZ_AMQP_VHOST

# for UDP server
SZ_EVENTSD_SERVER_UDP_HOST   # default: all addresses
SZ_EVENTSD_SERVER_UDP_PORT   # default: 8150

# for extra logging
DEBUG   # default: "error,warn,info".  Use "debug" and/or "verbose" for more logs
```

##Testing

**gcloud**

Use the gcloud pubsub emulator to run tests on your local machine.

To start the emulator:

```bash
gcloud beta emulators pubsub start --host-port 127.0.0.1:8268
```

Set the environment for the eventsd server:

```bash
export PUBSUB_EMULATOR_HOST=127.0.0.1:8268
export GCLOUD_PROJECT=emulator
```

For more details, see [https://github.com/GoogleCloudPlatform/gcloud-common/issues/48](https://github.com/GoogleCloudPlatform/gcloud-common/issues/48)

**amqp**

Install and run rabbitMQ server on your local host.

Use Homebrew on OSx.  All other distros have packages for rabbitMQ (install with your favorite package manager).