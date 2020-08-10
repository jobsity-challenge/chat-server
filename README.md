# Text Based Chat Server

Chat Server is an small microservice developed to allow simple users communication using public chatrooms. User must be registered into account service and then can talk into differents chatrooms.

This solutions was developed using Socket.io tecnology for real time communication and express to trigger some actions on the server. Users must join to chat rooms to be allowed send messages to it.

Express actions are:

- Create chatroom
- Join chatroom
- Leave chatroom
- Send message

There are also actions called using socket.io:

- Event of client disconnect: Close all resources of the client active connection
- Event of chatroom switch: Swith to a chatroom returning all information of the chatroom users and historic messages
- Real time event of writting action: Event triggered by clients and server when a client is writting on a chatroom
- Event of chatroom history: Request chatroom historic messages

Each one of this actions can trigger other actions that are reflected in Socket.io events:

- Chatroom trigger: Trigger a notification on clients of new chatroom creation. Also notify the client about the server chatrooms.
- Join trigger: Send a notification to users that one user join to chatroom
- Leave trigger: Send a notification to users that one user leave to chatroom
- Message trigger: Send a notification to chatrooms of generated new

## Installation of the service

- Clone the repository

```
git clone https://gitlab.com/jobsity1/challenge/chat-server.git
```

- Install dependencies

```
cd chat-server
npm install
npm install --build-from-source farmhash
```

Note than `farmhash` dependency must be installed from source code because prebuilt binaries aren't compatible with all architectures.

- Build the project

```
npm run build
```

## Running the service

To run the service `redis` server and `rabbitmq` server must be runing (See next section). The service can be runned directly from the command line with:

```bash
npm start
```

or it can be build and runned watching for file changes

```
npm run dev
```

To run the service there are some environment variables that can be used to configure it:

- `LOG`: Set the vebose level of the service debugger, allowed values are: error, warn, info, http, verbose, debug, silly (Default: debug)
- `PORT`: Set the running port for the HTTP server (Default: 3000)
- `INTERFACE`: Set the HTTP server listening interface (Default: 127.0.0.1)
- `ENV`: Set the service running mode, allowd values are: dev, production (Default: dev)
- `INSTANCES`: Set the number o workers runing into the cluster (Default: 1)
- `MONGODB_URI`: Set the MongoDB database connection URI (Default: mongodb://127.0.0.1:27017/chat_srv)
- `AUTH_SERVER`: Set the base URL to call for accounts validation (Default: https://accounts.jobsity.ikoabo.com)
- `REDIS_SERVER`: Redis server (Default: 127.0.0.1)
- `REDIS_PORT`: Redis server port (Default: 6379)
- `REDIS_KEY`: Redis group key (Default: chat.adapter.io)
- `AMQP_PROTOCOL`: Rabbitmq server protocol (Default: amqp)
- `AMQP_SERVER`: Rabbitmq server address (Default: 127.0.0.1)
- `AMQP_PORT`: Rabbitmq server port (Default: 5672)
- `AMQP_USERNAME`: Rabbitmq server username to authenticate (Default: guest)
- `AMQP_PASSWORD`: Rabbitmq server password to authenticate (Default: guest)
- `AMQP_QUEUE`: Rabbitmq queue to receive message notifications from bots (Default: bot-jobsity-chat)
- `AMQP_BOT_QUEUE_BOT`: Rabbitmq queue to send command requests to bots (Default: bot-jobsity-bot)

## Deploy on server

### Install Redis server

Redis server is used by socket.io as adapter con connect sockets on running cluster schema. This solution don't use any special settings on redis. To install redis server you must run:

```
apt install redis redis-server
```

Automatically redis will start the server and it can be used with any other configuration. For Windows you must use the windows redis distribution.

### Install RabbitMQ server

RabbitMQ is a robust server of message queuing using AMQP protocol. In this solution RabbitMQ is used to comunicate the chat server with the bots server to send command requests and receive the responses from the bots. To install the RabbitMQ server you must run:

```
apt install rabbitmq-server
rabbitmqctl add_user challenge challenge*2020
rabbitmqctl set_user_tags challenge administrator
rabbitmqctl set_permissions -p / challenge ".*" ".*" ".*"
```

For Windows you must use the windows redis distribution.

Once the server is installed we must enable the administrative interface running:

```
sudo rabbitmq-plugins enable rabbitmq_management
```

Now the administrative interface its accesible from `http://<ip address>:15672`

To acces we must use the `challenge` credentials created and create new credentials for the bot and chat server. In this solution we use the same for both, but it can use differents. The connection to RabbitMQ is authenticated with credentials but for messages, the requests are authenticated internally with the accounts server.

Messages has the following fields:

- `chatroom`: Chatroom identifier that generate the message
- `token`: Access token of the account that generate the message
- `message`: Message generated

For message communication the solution use two queues, that can use the default name or custom names. Both queue must be created before running the services. Both queues must be transcient, in other words, without persistence.

- `bot-jobsity-chat`: Queue used to send command request from chat service to bots service
- `bot-jobsity-bot`: Queue used to send command responses from bot service to chat service

### Run as service

To allow the microservice to run as system service, first you must install `pm2`:

```
npm i -g pm2
```

After that, you must create the ecosystem file to launch the service:

```
nano ecosystem.config.js
```

The `ecosystem.config.js` file contains the following lines:

```
module.exports = {
  apps : [{
    name: 'CHAT-JOBSITY',
    script: 'dist/index.js',
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'development',
      ENV: 'dev',
      PORT: 8002,
      INSTANCES: 2,
      LOG: 'debug',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/srv_chat',
      AUTH_SERVER: 'https://accounts.jobsity,ikoabo.com',
      REDIS_SERVER: '127.0.0.1',
      REDIS_PORT: 6379,
      REDIS_KEY: 'chat.adapter.io',
      AMQP_PROTOCOL: 'amqp',
      AMQP_SERVER: '127.0.0.1',
      AMQP_PORT: 5672,
      AMQP_USERNAME: 'challenge',
      AMQP_PASSWORD: 'challenge*2020',
      AMQP_QUEUE: 'bot-jobsity-chat',
      AMQP_BOT_QUEUE_BOT: 'bot-jobsity-bot'
    },
  }],
};

```

To start the service run the folowing lines:

```
pm2 start ecosystem.config.js
pm2 save
```

Now the accounts microservice is running as system service.

### Configure Nginx web server

To allow access the service from external,you must configure a new virtual host in the Nginx server:

```
nano /etc/nginx/sites-availables/chat.jobsity.ikoabo.com
```

With the following code:

```
upstream mod-chat-jobsity {
  server localhost:8002;
}

server {
  listen 80;
  listen [::]:80;
  server_name chat.jobsity.ikoabo.com;

  location / {
    proxy_pass http://mod-chat-jobsity/;
    proxy_http_version 1.1;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 600s;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Caller-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

And then enable the virtual host:

```
ln -s /etc/nginx/sites-available/chat.jobsity.ikoabo.com /etc/nginx/sites-enabled/chat.jobsity.ikoabo.com
```

To allow secure access to the service, use Let's Encrypt certificates. Certificates can be installed with the `certbot` tool:

```
certbot --nginx -d chat.jobsity.ikoabo.com
```

Now you can restart the Nginx server and test the microservice.

## Documentation

The project its distributed with a `docs` folder. This folder contains the Postman Collection with examples for each request and the API Documentation generated with `apidoc`. To regenerate the documentation run the following command:

```bash
npm run apidoc
```

## Run environment

To test this microservice it was deployed on test server:

```
https://chat.jobsity.ikoabo.com
```
