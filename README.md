#eventsd

Eventsd service

##Config

Must set the following environment variables:

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