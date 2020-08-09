/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the JobSity Challenge.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */
import { Logger } from "@/vendor/ikoabo/controllers/logger.controller";
import { ServiceSettings } from "@/settings/service.settings";
import { Objects } from "@/vendor/ikoabo/utils/objects.util";
import { ACCOUNT_ERRORS } from "@/models/errors.enum";
import { HTTP_STATUS } from "@/vendor/ikoabo/middlewares/response.middleware";
import request from "request";
import { Request, Response, NextFunction } from "express";

/**
 * Authentication interface
 * Handle account information on authentication validation
 */
export interface IAuthentication {
  user: string;
  type: number;
  name: string;
  roles: string[];
}

/**
 * Authentication controller middleware
 */
class Authentication {
  private static _instance: Authentication;
  private _logger: Logger;

  /**
   * Private constructor to allow singleton class instance
   */
  private constructor() {
    this._logger = new Logger("Authentication");
  }

  /**
   * Get singleton class instance
   */
  public static get shared(): Authentication {
    if (!Authentication._instance) {
      Authentication._instance = new Authentication();
    }
    return Authentication._instance;
  }

  /**
   * Authenticate against the auth server using the given token and validate the roles
   *
   * @param token  Token to authenticate agains auth server
   * @param roles  Roles to validate
   */
  authenticate(token: string, roles?: string[]): Promise<IAuthentication> {
    return new Promise<IAuthentication>((resolve, reject) => {
      /* Check for valid authentication server configuration */
      if (!Objects.get(ServiceSettings, "AUTH.SERVER")) {
        this._logger.error("Invalid authentication service configuration");
        return reject({
          boError: ACCOUNT_ERRORS.ERR_INVALID_AUTH_SERVER,
          boStatus: HTTP_STATUS.HTTP_NOT_ACCEPTABLE,
        });
      }

      /* Check for valid access token */
      if (!token) {
        return reject({
          boError: ACCOUNT_ERRORS.ERR_INVALID_ACCESS_TOKEN,
          boStatus: HTTP_STATUS.HTTP_UNAUTHORIZED,
        });
      }

      /* Prepare the request options with the given token */
      let opts = {
        auth: { bearer: token },
      };

      /* Validate the token against the auth service */
      request.get(
        `${ServiceSettings.AUTH.SERVER}/v1/accounts/validate`,
        opts,
        (error: any, response: request.Response, body: any) => {
          if (error) {
            this._logger.error(
              "Invalid authentication server response ",
              error
            );
            return reject({
              boError: ACCOUNT_ERRORS.ERR_UNKNOWN_AUTH_SERVER_ERROR,
              boStatus: HTTP_STATUS.HTTP_INTERNAL_SERVER_ERROR,
            });
          }

          try {
            /* Try to convert response body to JSON */
            body = JSON.parse(body);
          } catch {
            return reject({
              boError: ACCOUNT_ERRORS.ERR_UNKNOWN_AUTH_SERVER_ERROR,
              boStatus: HTTP_STATUS.HTTP_INTERNAL_SERVER_ERROR,
            });
          }

          /* Check for success/error response */
          if (body["error"]) {
            /* Redirect the error */
            return reject({
              boStatus: response.statusCode,
              boError: body["error"],
              boData: body["data"],
            });
          }

          /* On success prepare the response information */
          let auth: IAuthentication = {
            user: Objects.get(body, "user"),
            name: Objects.get(body, "name"),
            type: Objects.get(body, "type"),
            roles: Objects.get(body, "roles", []),
          };

          /* Check for valid response data */
          if (!auth.user || !auth.type) {
            reject({
              boError: ACCOUNT_ERRORS.ERR_INVALID_ACCESS_TOKEN,
              boStatus: HTTP_STATUS.HTTP_UNAUTHORIZED,
            });
            return;
          }

          /* Validate the user roles */
          this._validateRoles(auth, roles).then(resolve).catch(reject);
        }
      );
    });
  }

  /**
   * Express middleware to authenticate a request
   *
   * @param roles Roles to be validated
   */
  doAuthenticate(roles?: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      /* Validate the authorization access token */
      const authorization: string[] = Objects.get(
        req,
        "headers.authorization",
        ""
      )
        .toString()
        .split(" ");
      if (authorization.length !== 2 || authorization[0] !== "Bearer") {
        return next({
          boError: ACCOUNT_ERRORS.ERR_INVALID_ACCESS_TOKEN,
          boStatus: HTTP_STATUS.HTTP_UNAUTHORIZED,
        });
      }

      /* Validate the authentication agains account server */
      this.authenticate(authorization[1], roles)
        .then((authentication: IAuthentication) => {
          /* Store authentication information to the next middleware */
          res.locals["authentication"] = authentication;
          next();
        })
        .catch(next);
    };
  }

  /**
   * Validate the roles with the authentication information
   *
   * @param auth  Authentication information
   * @param roles  Roles to be validated
   */
  private _validateRoles(
    auth: IAuthentication,
    roles?: string[]
  ): Promise<IAuthentication> {
    return new Promise<IAuthentication>((resolve, reject) => {
      /* Check if roles are valid array */
      if (roles && Array.isArray(roles)) {
        /* Account must hold all of the given roles */
        if (
          roles.filter((value) => auth.roles.indexOf(value) >= 0).length !==
          roles.length
        ) {
          return reject({
            boError: ACCOUNT_ERRORS.ERR_INVALID_ROLE,
            boStatus: HTTP_STATUS.HTTP_FORBIDDEN,
          });
        }
      }

      /* Return the authentication information */
      resolve(auth);
    });
  }
}

export const AuthenticationCtrl = Authentication.shared;
