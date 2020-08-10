/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the JobSity Challenge.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */
import "module-alias/register";
import { ClusterServer } from "@/vendor/ikoabo/controllers/cluster.controller";
import { ServiceSettings } from "@/settings/service.settings";
import farmhash from "farmhash";
import net from "net";
import { Redis } from "@/controllers/redis.controller";
import { Logger, LOG_LEVEL } from "@/vendor/ikoabo/controllers/logger.controller";
import { HttpServer } from "@/vendor/ikoabo/controllers/server.controller";
import { RedisClient } from "redis";
import { ChatServerCtrl } from "@/controllers/chat.server.controller";
import { Server } from "http";
import ChatroomsRouter from "@/routers/v1/chat.router";
import { AmqpCtrl } from "./controllers/amqp.controller";

/* Initialize cluster server */
const clusterServer = ClusterServer.setup(ServiceSettings);
Logger.setLogLevel(ServiceSettings.SERVICE.LOG);
const _logger: Logger = new Logger("Chat service");
const workers: any[] = [];

/**
 * Entry point for cluster master process
 */
function runMaster() {
  _logger.info("Cluster master process is running", { pid: process.pid });

  /* Initialize the number of required workers */
  const instances = ServiceSettings.SERVICE.INSTANCES;

  /* Helper function for spawning worker at index i */
  const createWorker = (i: number) => {
    workers[i] = ClusterServer.cluster.fork();

    /* Restart worker on exit */
    workers[i].on("exit", function (code: any, signal: any) {
      _logger.error("Cluster worker died", { code: code, signal: signal });
      createWorker(i);
    });
  };

  /* Initialize the workers */
  for (let i = 0; i < instances; i++) {
    createWorker(i);
  }

  /* Compute worker index */
  let getWorkerIndex = (ip: string, len: number) => {
    return farmhash.fingerprint32(ip) % len; // Farmhash is the fastest and works with IPv6, too
  };

  /* Create main server */
  net
    .createServer({ pauseOnConnect: true }, (connection: net.Socket) => {
      let worker =
        workers[
        getWorkerIndex(connection.remoteAddress, instances)
        ];
      worker.send("sticky-session:connection", connection);
    })
    .listen(ServiceSettings.SERVICE.PORT);
}

/**
 * Entry point for cluster slave process
 */
function runSlave(server: HttpServer, routes?: any) {
  /* Try to connect to redis server */
  Redis.init({
    host: ServiceSettings.REDIS.SERVER,
    port: ServiceSettings.REDIS.PORT,
    key: ServiceSettings.REDIS.KEY
  }).then((connection: RedisClient) => {
    ChatServerCtrl.setupRedis(connection);

    /* Initialize service mongo connection */
    server.initMongo().then(() => {
      /* Initialize service express application */
      server.initExpress(ClusterServer.cluster.worker, routes).then(() => {
        /* Start listen the service and socket.io chat server */
        server.listen(0).then((server: Server) => {
          /* Initialize chat server */
          ChatServerCtrl.setup(server);

          /* Initialize AMQP server */
          AmqpCtrl.connect().then(() => {
            AmqpCtrl.listen();
          }).catch(() => {
            process.exit(-1);
          });
        }).catch(() => {
          process.exit(-1);
        });
      }).catch(() => {
        process.exit(-1);
      });
    }).catch(() => {
      process.exit(-1);
    });
  }).catch(() => {
    process.exit(-1);
  });
}

/* Run cluster with base routes */
clusterServer.run({
  '/v1/chat': ChatroomsRouter
}, runMaster, runSlave);
