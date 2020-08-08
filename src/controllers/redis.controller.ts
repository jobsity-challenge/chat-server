/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the JobSity Challenge.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */
import { RedisClient, createClient } from "redis";

/**
 * Redis connection controller
 */
export class Redis {
  static _redis: RedisClient;
  public static isReady: boolean = false;

  /**
   * Initialize the redis connection
   * @param config
   */
  public static init(config: any) {
    return new Promise<RedisClient>((resolve, reject) => {
      Redis._redis = createClient(config);
      Redis.isReady = true;
      resolve(Redis._redis);
    });
  }

  /**
   * Get the redis client
   */
  public static get shared(): RedisClient {
    return Redis._redis;
  }
}
