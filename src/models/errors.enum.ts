/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the JobSity Challenge.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */

 /**
 * Predefined account errors
 */
export enum ACCOUNT_ERRORS {
  ERR_UNKNOWN = 500,
  ERR_INVALID_ACCESS_TOKEN = 1000,
  ERR_INVALID_CREDENTIALS = 1001,
  ERR_INVALID_ROLE = 1002,
  ERR_INVALID_AUTH_SERVER = 1003,
  ERR_UNKNOWN_AUTH_SERVER_ERROR = 1004,
}

 /**
  * Chat server predefined errors
  */
export enum CHAT_ERRORS {
  NO_ERR = 0,
  ERR_INVALID_CHATROOM = 600,
  ERR_RECEIVER_REQUIRED = 601,
  ERR_MESSAGE_CANT_BE_SEND = 602,
  ERR_USER_NOT_CONNECTED = 603,
  ERR_HISTORY_CANT_BE_RETRIEVED = 604,
};
