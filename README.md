# Text Based Chat Server

Account Management Server is an small microservice developed to allow in a simple way register/login users and authenticate request on external services to solve the JobSity Challenge. 

The idea behind this microservice is the OAuth2 standard, but this isn't OAuth2 implementation. The service handle three type of users, and for each type of user handle a virtual role to allow external services restrict access by user type. In this implementation the generated access token don't have expiration time and its only relationed with the account.

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

The service can be runned directly from the command line with:
```bash
npm start
```
or it can be build and runned watching for file changes
```
npm run dev
```

To run the service there are some environment variables that can be used to configure it:

* `LOG`: Set the vebose level of the service debugger, allowed values are: error, warn, info, http, verbose, debug, silly (Default: debug)
* `PORT`: Set the running port for the HTTP server (Default: 3000)
* `INTERFACE`: Set the HTTP server listening interface (Default: 127.0.0.1)
* `ENV`: Set the service running mode, allowd values are: dev, production (Default: dev)
* `INSTANCES`: Set the number o workers runing into the cluster (Default: 1)
* `MONGODB_URI`: Set the MongoDB database connection URI (Default: mongodb://127.0.0.1:27017/chat_srv)
* `AUTH_SERVER`: Set the base URL to call for accounts validation (Default: https://accounts.jobsity.ikoabo.com)

## Deploy on server

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
