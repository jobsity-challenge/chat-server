/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the IKOA Business Opportunity Core Server.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */
import express from "express";
import bodyParser from "body-parser";
import logger from "morgan";
import methodOverride from "method-override";
import cors from "cors";
import Helmet from "helmet";
import onFinished from "on-finished";
import moment from "moment";
import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";
import { Server, createServer } from "http";
import { Logger } from "./logger.controller";
import { ISettings } from "../models/settings.model";
import { HTTP_STATUS } from "../middlewares/response.middleware";

/**
 * Standar Express Http Server handler
 */
export class HttpServer {
  private static _instance: HttpServer;
  private static _settings: ISettings;
  private _app: express.Application;
  private _http: Server;
  private _logger: Logger;
  private _worker: any;

  /**
   * Private constructor to allow singleton instance
   */
  private constructor() {
    this._logger = new Logger("HttpServer");
  }

  /**
   * Initialize the singleton server instance
   *
   * @param settings  Service predefined settings
   */
  public static setup(settings: ISettings): HttpServer {
    if (HttpServer._instance) {
      throw new Error("HttpServer its initialized");
    }

    this._settings = settings;
    HttpServer._instance = new HttpServer();
    return HttpServer._instance;
  }

  /**
   * Return the singleton server instance
   */
  public static get shared(): HttpServer {
    if (!HttpServer._instance) {
      throw new Error("HttpServer not initialized");
    }
    return HttpServer._instance;
  }

  /**
   * Return the cluster worker id
   */
  public get worker(): number {
    return this._worker ? this._worker.id : 0;
  }

  /**
   * Initialize the MongoDB connection
   */
  public initMongo(): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      /* Connect to the MongoDB server */
      mongoose.set("useFindAndModify", false);
      mongoose.set(
        "useCreateIndex",
        !HttpServer._settings.MONGODB.NOT_USE_CREATE_INDEX
      );
      mongoose
        .connect(HttpServer._settings.MONGODB.URI, {
          useNewUrlParser: !HttpServer._settings.MONGODB.NOT_USE_NEW_URL_PARSER,
          useCreateIndex: !HttpServer._settings.MONGODB.NOT_USE_CREATE_INDEX,
          autoIndex: !HttpServer._settings.MONGODB.NOT_AUTO_INDEX,
          poolSize: HttpServer._settings.MONGODB.POOL_SIZE || 10,
          useUnifiedTopology: !HttpServer._settings.MONGODB
            .NOT_USE_UNIFIED_TOPOLOGY,
        })
        .then(() => {
          this._logger.info("Connected to MongoDB", { worker: this.worker });
          resolve();
        });

      /* Listen for MongoDB error connection */
      mongoose.connection.on("error", (err: any) => {
        this._logger.error("MongoDB cannot establish the connection", err);
        reject(err);
      });
    });
  }

  /**
   * Initialize the Express application server
   *
   * @param worker  Cluster worker instance
   * @param routes  Initial Express routes
   */
  public initExpress(worker?: any, routes?: any): Promise<void> {
    return new Promise<void>((resolve) => {
      this._worker = worker;
      this._app = express();
      this._http = createServer(this._app);

      /* Check to enable body parser */
      if (!HttpServer._settings.SERVICE.NOT_BODY_PARSER) {
        this._app.use(bodyParser.json());
        this._app.use(bodyParser.urlencoded({ extended: true }));
      }

      /* Check to enable method override */
      if (!HttpServer._settings.SERVICE.NOT_METHOD_OVERRIDE) {
        this._app.use(methodOverride("X-HTTP-Method")); // Microsoft
        this._app.use(methodOverride("X-HTTP-Method-Override")); // Google/GData
        this._app.use(methodOverride("X-Method-Override")); // IBM
      }

      /* Check to enable CORS */
      if (!HttpServer._settings.SERVICE.NOT_CORS) {
        this._app.use(cors());
      }

      /**
       * Security mechanism
       */
      this._app.use(Helmet.xssFilter());
      this._app.disable("x-powered-by");
      this._app.use(Helmet.hidePoweredBy());
      this._app.use(Helmet.frameguard({ action: "deny" }));
      this._app.use(Helmet.noSniff());
      this._app.use(Helmet.referrerPolicy());
      this._app.use(Helmet.ieNoOpen());
      this._app.use(
        Helmet.hsts({
          maxAge: 5184000,
        })
      );

      /* Set trust proxy */
      this._app.set(
        "trust proxy",
        !HttpServer._settings.SERVICE.NOT_TRUST_PROXY
      );

      // Express configuration
      this._app.set(
        "interface",
        HttpServer._settings.SERVICE.INTERFACE || "127.0.0.1"
      );
      this._app.set("port", HttpServer._settings.SERVICE.PORT);
      this._app.set("env", HttpServer._settings.SERVICE.ENV);

      /* Increment debug output on offline development platforms */
      if (HttpServer._settings.SERVICE.ENV !== "production") {
        this._app.use(logger("dev"));
        this._app.all(
          "/*",
          (req: Request, res: Response, next: NextFunction) => {
            onFinished(res, (err: any, resp: any) => {
              let requestTrace: any = {
                stamp: moment.utc().toDate().getTime(),
                err: err,
                req: {
                  method: req.method,
                  url: req.originalUrl,
                  body: req.body,
                  headers: req.headers,
                },
                res: {
                  status: resp.statusCode,
                  message: resp.statusMessage,
                },
                worker: this.worker,
              };
              this._logger.debug(" Request trace", requestTrace);
            });
            next();
          }
        );
      } else {
        this._app.use(logger("tiny"));
      }

      /* Check to retrieve the real IP address of the request */
      if (!HttpServer._settings.SERVICE.NOT_REAL_IP) {
        this._app.use((req: any, res: Response, next: NextFunction) => {
          /* Look for request IP address */
          res.locals["ipAddr"] =
            req.headers["x-caller-ip"] ||
            req.headers["x-forwarded-for"] ||
            req.ips[0] ||
            req.connection.remoteAddress;
          next();
        });
      }

      /* Register the Express routes */
      this._registerRoutes(routes);
      resolve();
    });
  }

  /**
   * Retrieve the current express application
   */
  public get app(): express.Application {
    return this._app;
  }

  /**
   * Add new middleware to the Express application
   *
   * @param middleware  Express middleware to be registered
   * @param route  Router or array of routers to handle the given middleware
   */
  public use(middleware: any, route?: any) {
    if (!route) {
      this._app.use(middleware);
    } else {
      this._app.use(middleware, route);
    }
  }

  /**
   * Start listening on the HTTP server
   */
  public listen(port?: number): Promise<Server> {
    return new Promise<Server>((resolve) => {
      const server: Server = this._http.listen(
        port === null ? this._app.get("port") : port,
        this._app.get("interface"),
        () => {
          let meta: any = {
            interface: this._app.get("interface"),
            port: this._app.get("port"),
            env: this._app.get("env"),
            version: `${HttpServer._settings.VERSION.MAIN}.${HttpServer._settings.VERSION.MINOR}.${HttpServer._settings.VERSION.REVISION}`,
            pid: process.pid,
            worker: this.worker,
          };

          this._logger.info("Service instance is running", meta);
          resolve(server);
        }
      );
    });
  }

  /**
   * Register Express initial routes
   *
   * @param routes  Routes to be added to Express
   */
  private _registerRoutes(routes?: any) {
    /* Check if default routes must be set */
    if (routes) {
      const keys = Object.keys(routes);
      keys.forEach((key) => {
        /* Check if the route is an array of routers or not */
        if (Array.isArray(routes[key])) {
          routes[key].forEach((value: any) => {
            this.use(key, value);
          });
        } else {
          this.use(key, routes[key]);
        }
      });
    }

    /* Other routes give 404 error */
    this._app.use(function (_req, res, _next) {
      res
        .status(HTTP_STATUS.HTTP_NOT_FOUND)
        .json({ error: HTTP_STATUS.HTTP_NOT_FOUND })
        .end();
    });
  }
}
