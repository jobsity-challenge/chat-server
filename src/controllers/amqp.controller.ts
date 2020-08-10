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
import amqp from "amqplib/callback_api";
import { ServiceSettings } from "@/settings/service.settings";
import { MESSAGE_TYPE } from "@/models/messages.enum";
import { ChatroomCtrl } from "./chatrooms.controller";
import { Chatroom, ChatroomDocument } from "@/models/chatrooms.model";
import { AuthenticationCtrl, IAuthentication } from "@/middlewares/authentication.middleware";
import { MessageCtrl } from "./messages.controller";
import { MessageDocument } from "@/models/messages.model";
import { ChatServerCtrl } from "./chat.server.controller";

/**
 * Rabbitmq Amqp controller
 */
class Amqp {
  private static _instance: Amqp;
  private _logger: Logger;
  private _amqpConn: amqp.Connection;
  private _amqpChannel: amqp.Channel;

  /**
   * Allow singleton class instance
   */
  private constructor() {
    this._logger = new Logger('Amqp');
  }

  /**
   * Get the singleton class instance
   */
  public static get shared(): Amqp {
    if (!Amqp._instance) {
      Amqp._instance = new Amqp();
    }
    return Amqp._instance;
  }

  /**
   * Connect to AMQP server
   */
  public connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._logger.debug('Connecting to AMQP server', ServiceSettings.AMQP);

      /* Check if the server seems to be connected */
      if (this._amqpConn || this._amqpChannel) {
        /* Disconnect from old server */
        this.disconnect();
      }

      /* Connect to the amqp Rabbitmq server */
      amqp.connect({
        protocol: ServiceSettings.AMQP.PROTOCOL,
        hostname: ServiceSettings.AMQP.SERVER,
        port: ServiceSettings.AMQP.PORT,
        username: ServiceSettings.AMQP.USERNAME,
        password: ServiceSettings.AMQP.PASSWORD,
      }, {}, (err: any, conn: amqp.Connection) => {
        if (err) {
          this._logger.error('There were some error connecting to Rabbitmq wity amqp library', err);
          return reject();
        }

        /* Create the channel */
        this._amqpConn = conn;
        conn.createChannel((err: any, channel: amqp.Channel) => {
          if (err) {
            this._logger.error('There were some error connecting to Rabbitmq wity amqp library', err);
            return reject();
          }

          this._amqpChannel = channel;
          channel.assertQueue(ServiceSettings.AMQP.QUEUE, { durable: false }, (err: any) => {
            if (err) {
              this._logger.error('There were some error checking the queue', err);
              return reject();
            }
            resolve();
          });
        })
      });
    });
  }

  /**
   * Listen for message notification
   */
  public listen() {
    this._logger.debug('Waiting AMQP messages', { queue: ServiceSettings.AMQP.QUEUE });
    this._amqpChannel.consume(ServiceSettings.AMQP.QUEUE, function (msg) {
      try {
        /* Parse the bot message */
        const messageResponse: any = JSON.parse(msg.content.toString());
        this._logger.debug('Processing Bot messages', messageResponse);

        /* Validate the message chatroom */
        ChatroomCtrl.fetch(messageResponse.chatroom)
          .then((chatroom: ChatroomDocument) => {

            /* Validate the message user */
            AuthenticationCtrl.authenticate(messageResponse.token, ['bot'])
              .then((auth: IAuthentication) => {
                /* Create the message */
                const message: any = {
                  owner: auth.user,
                  chatroom: chatroom.id,
                  type: MESSAGE_TYPE.MT_TEXT,
                  message: messageResponse.message || "",
                };

                /* Store the received message */
                MessageCtrl.create(message)
                  .then((message: MessageDocument) => {
                    /* Emit a notification for the new message */
                    ChatServerCtrl.triggerMessage(chatroom, message);

                    this._logger.debug('Message emitted', message);
                  }).catch((err) => {
                    this._logger.error('Error storing the message', {
                      message: message,
                      error: err
                    });
                  });
              }).catch((err) => {
                this._logger.error('Invalid bot credentials', {
                  message: messageResponse,
                  error: err
                });
              });
          }).catch((err) => {
            this._logger.error('Invalid message chatroom', {
              message: messageResponse,
              error: err
            });
          });
      } catch (err) {
        this._logger.error('Invalid message from AMQP', {
          message: msg,
          error: err,
        });
      }
    }, { noAck: true });
  }

  /**
   * 
   * @param msg Send message to the bot queue
   */
  public send(msg: any) {
    this._logger.debug('Send AMQP messages', { queue: ServiceSettings.AMQP.BOT_QUEUE, message: msg });

    /* Send the message to the queue */
    if (!this._amqpChannel.sendToQueue(ServiceSettings.AMQP.BOT_QUEUE, Buffer.from(JSON.stringify(msg)), { persistent: false })) {
      this._logger.error('There were error sending the message');
    }
  }

  /**
   * Disconnect from AMQP server
   */
  public disconnect() {
    this._logger.debug('Disconnecting from AMQP server');

    /* Check if channel is valid */
    if (!this._amqpChannel) {

      /* Check if connection is valid */
      if (!this._amqpConn) {
        return;
      }

      /* Close the connection */
      this._amqpConn.close((err) => {
        if (err) {
          this._logger.error('There were error closing the active connection', err);
        }
        this._amqpConn = null;
      });
      return;
    }

    /* Close the channel */
    this._amqpChannel.close((err) => {
      if (err) {
        this._logger.error('There were error closing the active channel', err);
      }
      this._amqpChannel = null;

      /* Check if the connection is valid */
      if (!this._amqpConn) {
        return;
      }

      /* Close the connection */
      this._amqpConn.close((err) => {
        if (err) {
          this._logger.error('There were error closing the active connection', err);
        }
        this._amqpConn = null;
      });
    });
  }
}
export const AmqpCtrl = Amqp.shared;
