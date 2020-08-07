/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the IKOA Business Opportunity Core Server.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */
import { Request, Response, NextFunction } from "express";
import { ErrorCtrl } from "../controllers/error.controller";

/**
 * HTTP response status codes
 */
export enum HTTP_STATUS {
  HTTP_OK = 200,
  HTTP_CREATED = 201,
  HTTP_PARTIAL_CONTENT = 206,
  HTTP_BAD_REQUEST = 400,
  HTTP_UNAUTHORIZED = 401,
  HTTP_FORBIDDEN = 403,
  HTTP_NOT_FOUND = 404,
  HTTP_NOT_ACCEPTABLE = 406,
  HTTP_CONFLICT = 409,
  HTTP_INTERNAL_SERVER_ERROR = 500,
}

/**
 * Base middlewares to handle express responses
 */
export class ResponseHandler {
  /**
   * Send a success response of the request
   * Success response send the JSON object contained into res.locals
   * 
   * @param _req  Express request parameter
   * @param res  Express response parameter
   * @param _next  Express next function parameter
   */
  public static success(_req: Request, res: Response, _next: NextFunction) {
    res.status(HTTP_STATUS.HTTP_OK).json(res.locals["response"]).end();
  }

  /**
   * Send an error response of the request
   * 
   * @param err  Express raised error parameter
   * @param _req  Express request parameter
   * @param res  Express response parameter
   * @param _next  Express next function parameter
   */
  public static error(
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) {
    const errObj = ErrorCtrl.parseError(err);
    res.status(errObj.status).json(errObj.response).end();
  }
}
