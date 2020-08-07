/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the IKOA Business Opportunity Core Server.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */
import { Logger } from "./logger.controller";
import { HTTP_STATUS } from "../middlewares/response.middleware";
import { ERRORS } from "../models/errors.enum";

/**
 * Errors controller
 * Parse generated errors to asign specific code error and response status
 */
class Errors {
  private static _instance: Errors;
  private _logger: Logger;

  /**
   * Private constructor to allow singleton class
   */
  private constructor() {
    this._logger = new Logger("ErrorHandler");
  }

  /**
   * Retrieve the singleton class instance
   */
  public static get shared(): Errors {
    if (!Errors._instance) {
      Errors._instance = new Errors();
    }
    return Errors._instance;
  }

  /**
   * Parse the error information to provide a response
   *
   * @param err
   */
  parseError(err: any) {
    let error = {
      status: err.boStatus ? err.boStatus : HTTP_STATUS.HTTP_BAD_REQUEST,
      response: {
        error: err.boError
          ? err.boError
          : HTTP_STATUS.HTTP_INTERNAL_SERVER_ERROR,
      },
    };
    if (err.boData) {
      (<any>error.response)["data"] = err.boData;
    }

    /* Check for MongoDB errors */
    if (err.name === "MongoError") {
      switch (err.code) {
        case 11000 /* Duplicated key error */:
          error.response.error = ERRORS.OBJECT_DUPLICATED;
          error.status = HTTP_STATUS.HTTP_CONFLICT;
          break;
        default:
          error.response.error = ERRORS.INVALID_OPERATION;
          error.status = HTTP_STATUS.HTTP_BAD_REQUEST;
      }
    } else {
      /* Check OAuth2 errors */
      if (err.code) {
        switch (err.code) {
          case 401:
            error.response.error = ERRORS.INVALID_OPERATION;
            error.status = HTTP_STATUS.HTTP_UNAUTHORIZED;
            break;

          default:
            error.response.error = ERRORS.INVALID_OPERATION;
            error.status = err.status || HTTP_STATUS.HTTP_FORBIDDEN;
        }
      }
    }

    this._logger.error("Request error", { error: err.stack, response: error });
    return error;
  }
}

export const ErrorCtrl = Errors.shared;
