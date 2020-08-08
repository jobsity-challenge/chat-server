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
    host: "127.0.0.1",
    port: 6379,
    key: "chat.adapter.io",
  },
};
