/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the JobSity Challenge.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */
import { ISettings } from "@/vendor/ikoabo/models/settings.model";

/**
 * Predefined service settings
 */
export const ServiceSettings: ISettings = {
  /* Service information */
  SERVICE: {
    NAME: "CHAT-SERVER",
    LOG: process.env.LOG || "debug",
    PORT: parseInt(process.env.PORT || "3000"),
    INTERFACE: process.env.INTERFACE || "127.0.0.1",
    ENV: process.env.ENV || "dev",
    INSTANCES: parseInt(process.env.INSTANCES || "1"),
  },

  /* Service version */
  VERSION: {
    MAIN: 1,
    MINOR: 0,
    REVISION: 0,
  },

  /* Database connection */
  MONGODB: {
    URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/chat_srv",
  },

  AUTH: {
    SERVER: process.env.AUTH_SERVER || "https://accounts.jobsity.ikoabo.com",
    ID: "",
    SECRET: ""
  },

  /* Redis service configuration */
  REDIS: {
    SERVER: process.env.REDIS_SERVER || "127.0.0.1",
    PORT: parseInt(process.env.REDIS_PORT) || 6379,
    KEY: process.env.REDIS_KEY || "chat.adapter.io",
  },

  /* Amqp Rabbitmq configuration */
  AMQP: {
    PROTOCOL: process.env.AMQP_PROTOCOL || 'amqp',
    SERVER: process.env.AMQP_SERVER || '127.0.0.1',
    PORT: parseInt(process.env.AMQP_PORT) || 5672,
    USERNAME: process.env.AMQP_USERNAME || 'guest',
    PASSWORD: process.env.AMQP_PASSWORD || 'guest',
    QUEUE: process.env.AMQP_QUEUE || 'bot-jobsity-chat',
    BOT_QUEUE: process.env.AMQP_BOT_QUEUE || 'bot-jobsity-bot',
  }
};
