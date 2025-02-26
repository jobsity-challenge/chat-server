/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the JobSity Challenge.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */
import sio from "socket.io";
import {
  AuthenticationCtrl,
  IAuthentication,
} from "@/middlewares/authentication.middleware";
import { Objects } from "@/vendor/ikoabo/utils/objects.util";
import { Logger } from "@/vendor/ikoabo/controllers/logger.controller";
import { ChatroomCtrl } from "./chatrooms.controller";
import { ChatroomDocument } from "@/models/chatrooms.model";
import { USER_STATUS } from "@/models/chatrooms.enum";
import { MessageDocument, Message } from "@/models/messages.model";
import { MessageCtrl } from "@/controllers/messages.controller";
import { CHAT_ERRORS } from "@/models/errors.enum";
import { MESSAGE_TYPE } from "@/models/messages.enum";
import { mongoose } from "@typegoose/typegoose";
import sio_redis from "socket.io-redis";
import { ServiceSettings } from "@/settings/service.settings";
import { Server } from "http";
import { RedisClient } from "redis";

/**
 * Chat server controller
 */
class ChatServer {
  private static _instance: ChatServer;
  private _logger: Logger;

  /* Socket.io server */
  private _io: sio.Server;

  /* Socket.io namespace */
  private _nsp: sio.Namespace;

  /* Redis client connection */
  private _redis: RedisClient;

  /* Socket.io active user connections */
  private _activeConnections: any = {};

  /**
   * Private constructor to allow singleton class instance
   */
  private constructor() {
    this._logger = new Logger("ChatServer");
  }

  /**
   * Get the singleton class instance
   */
  public static get shared(): ChatServer {
    if (!ChatServer._instance) {
      ChatServer._instance = new ChatServer();
    }
    return ChatServer._instance;
  }

  public setupRedis(connection: RedisClient) {
    this._redis = connection;
  }

  public setup(server: Server) {
    /* Initialize the socket.io with REDIS bridge */
    this._io = sio(server);
    this._io.adapter(sio_redis(ServiceSettings.REDIS));

    /* Handle process message to use sticky session */
    process.on("message", (message, connection) => {
      if (message !== "sticky-session:connection") {
        return;
      }
      server.emit("connection", connection);
      connection.resume();
    });

    /* Initialize socket.io namespace */
    this._nsp = this._io.of("/v1/channel");

    /* Listen for user connection event */
    this._nsp.on("connection", (clientSocket: sio.Socket, cb: any) => {
      /* Check for the user authentication */
      const token: string = Objects.get(clientSocket, "handshake.query.token");
      AuthenticationCtrl.authenticate(token, ["user"])
        .then((authentication: IAuthentication) => {
          this._logger.debug("User connected", authentication);

          /* Store and emit the authentication information */
          (<any>clientSocket)["authentication"] = authentication;
          clientSocket.emit("authentication", authentication);

          /* Set the user active connection */
          if (!this._activeConnections[authentication.user]) {
            this._activeConnections[authentication.user] = [clientSocket];

            /* Notify user status online */
            this._statusChanged(authentication.user, USER_STATUS.US_ONLINE);
          } else {
            this._activeConnections[authentication.user].push(clientSocket);
          }

          /* Register socket events listeners */
          this._eventDisconnect(clientSocket, authentication.user);
          this._eventSwitch(clientSocket, authentication.user);
          this._eventWriting(clientSocket, authentication.user);
          this._eventHistory(clientSocket, authentication.user);

          /* Load all user chatrooms */
          this._getChatrooms(clientSocket, authentication.user);
        })
        .catch((err: any) => {
          this._logger.error("Error connection user account", err);
          clientSocket.disconnect(true);
        });
    });
  }

  private _getChatrooms(clientSocket: sio.Socket, user: string) {
    let myChatrooms: any[] = [];
    let otherChatrooms: any[] = [];
    ChatroomCtrl.fetchAll()
      .on('error', (err) => {
        /* Handle error */
        this._logger.error('There were an error getting al chatrooms', err);
      })
      .on('data', (chatroom: ChatroomDocument) => {
        /* Check if the target user is part of the chatroom or not */
        const idx = chatroom.users.indexOf(new mongoose.Types.ObjectId(user));

        /* Prepare the room information */
        let room: any = {
          id: chatroom.id,
          name: chatroom.name,
          topic: chatroom.topic,
          count: chatroom.users.length,
          isUser: idx >= 0
        };

        if (idx >= 0) {
          /* Register the user socket into the chatroom */
          clientSocket.join(chatroom.id);
        }

        /* Emit chatroom information to the user socket */
        clientSocket.emit('chatroom', room);
      });
  }

  /**
   * Notify the user status changed to the user related by conversations
   *
   * @param user  User account
   * @param status  Changed status
   */
  private _statusChanged(user: string, status: USER_STATUS) {
    const statusObj: any = {
      user: user,
      status: status,
    };
    /* Send notification to the related chatroom */
    this._logger.debug("User status changed", statusObj);
    this._nsp.emit("status", statusObj);
  }

  /**
   * Handler for disconnec event
   * User disconnected from the server
   *
   * @param clientSocket  Client socket
   * @param user  Authenticated user
   */
  private _eventDisconnect(clientSocket: sio.Socket, user: string) {
    /* Register the event listener */
    clientSocket.on("disconnect", () => {
      /* Get the user active connections */
      let remainingConnection = this._activeConnections[user];

      /* Check if there is any active connection */
      if (remainingConnection) {
        /* Remove the target active connection */
        let index = remainingConnection.indexOf(clientSocket);
        if (index >= 0) this._activeConnections[user].splice(index, 1);

        /* Clear the client socket listeners */
        clientSocket.removeAllListeners("disconnect");
        clientSocket.removeAllListeners("switch");
        clientSocket.removeAllListeners("writing");
        clientSocket.removeAllListeners("history");
        clientSocket.disconnect(true);

        /* Check if there is no more active connections for the given user */
        if (this._activeConnections[user].length == 0) {
          /* Notify if the user if offline */
          this._statusChanged(user, USER_STATUS.US_OFFLINE);

          /* Remove the user entry */
          delete this._activeConnections[user];
        }
      }
    });
  }

  /**
   * Handler for writing event
   * Send writing status
   *
   * @param clientSocket  Client socket
   * @param user  Authenticated user
   */
  private _eventWriting(clientSocket: sio.Socket, user: string) {
    /* Register the event listener */
    clientSocket.on("writing", (data, cb) => {
      /* Look for the target chatroom */
      ChatroomCtrl.fetch(data.chatroom)
        .then((chatroom: ChatroomDocument) => {
          /* Send the writting status notification to the chatroom members */
          this._nsp.to(chatroom.id).emit("writing", {
            chatroom: chatroom.id,
            status: data.status
          });
        })
        .catch((err: any) => {
          this._logger.error("Error looking for chatroom", err);
          cb({ error: CHAT_ERRORS.ERR_INVALID_CHATROOM });
        });
    });
  }

  /**
   * Handler for switch event
   * Switch to a chatroom
   *
   * @param clientSocket  Client socket
   * @param user  Authenticated user
   */
  private _eventSwitch(clientSocket: sio.Socket, user: string) {
    /* Register the event listener */
    clientSocket.on("switch", (data, cb) => {
      /* Look for the target chatroom */
      ChatroomCtrl.fetch(data.chatroom)
        .then((chatroom: ChatroomDocument) => {
          /* Fetch messages history */
          this._getHistory(chatroom, 0, 50)
            .then((msgs: any[]) => {
              /* Send the chatroom information with users and messages */
              cb({
                error: CHAT_ERRORS.NO_ERR, data: {
                  id: chatroom.id,
                  name: chatroom.name,
                  topic: chatroom.topic,
                  users: chatroom.users,
                  messages: msgs
                }
              });
            }).catch((err: any) => {
              this._logger.error("Error getting messages history", {
                data: data,
                error: err,
              });
              cb({ error: CHAT_ERRORS.ERR_HISTORY_CANT_BE_RETRIEVED });
            });
        })
        .catch((err: any) => {
          this._logger.error("Error looking for chatroom", err);
          cb({ error: CHAT_ERRORS.ERR_INVALID_CHATROOM });
        });
    });
  }

  /**
   * Perform database query to fetch history messages
   * 
   * @param skip 
   * @param limit 
   */
  private _getHistory(chatroom: ChatroomDocument, skip: number, limit: number): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
      /* Prepare the raw query */
      let query = MessageCtrl.fetchRaw({ chatroom: chatroom.id }).sort({ createdAt: -1 });

      /* Check for skip parameter */
      if (skip) {
        query = query.skip(skip);
      }

      /* Check for limit parameter */
      if (limit) {
        query = query.limit(limit);
      }

      /* Perform the history query */
      query
        .then((messages: MessageDocument[]) => {
          /* Send the history response */
          resolve(messages.map((value) => value.toJSON()))
        })
        .catch(reject);
    })
  }

  /**
   * Handler for history event
   * Retrieve chatroom history
   *
   * @param clientSocket  Client socket
   * @param user  Authenticated user
   */
  private _eventHistory(clientSocket: sio.Socket, user: string) {
    /* Register the event listener */
    clientSocket.on("history", (data, cb) => {
      /* Get query parameters */
      const skip = Objects.get(data, "skip");
      const limit = Objects.get(data, "limit");

      ChatroomCtrl.fetch(data.chatroom)
        .then((chatroom: ChatroomDocument) => {
          this._getHistory(chatroom, skip, limit)
            .then((msgs: any[]) => {
              cb({
                error: CHAT_ERRORS.NO_ERR,
                messages: msgs,
              });
            }).catch((err: any) => {
              this._logger.error("Error getting messages history", {
                data: data,
                error: err,
              });
              cb({ error: CHAT_ERRORS.ERR_HISTORY_CANT_BE_RETRIEVED });
            });
        })
        .catch((err: any) => {
          this._logger.error("Error looking for chatroom", err);
          cb({ error: CHAT_ERRORS.ERR_INVALID_CHATROOM });
        });
    });
  }

  /**
   * Send notification on new chatroom registered
   * 
   * @param chatroom Registered chatroom
   * @param isUser  Paramteter to handle is the authenticated user belongs to the chatroom
   */
  public triggerChatroom(chatroom: ChatroomDocument, isUser?: boolean) {
    this._nsp.emit("chatroom", {
      id: chatroom.id,
      name: chatroom.name,
      topic: chatroom.topic,
      owner: chatroom.owner,
      count: chatroom.users.length,
      isUser: isUser
    });
  }

  /**
   * Send notification about user joining the chatroom
   * 
   * @param chatroom  Target chatroom
   * @param user  User ID registered in the target chatroom
   */
  public triggerJoin(chatroom: ChatroomDocument, user: string) {
    /* Connect user to the chatroom */
    const sockets: sio.Socket[] = this._activeConnections[user];
    if (sockets && sockets.length > 0) {
      sockets.forEach((socket: sio.Socket) => {
        /* Join to the chatroom only if the socket is connected */
        if (socket.connected) {
          socket.join(chatroom.id);
        }
      });
    }

    /* Emit the chatroom join event for all users in the room */
    this._nsp.to(chatroom.id).emit("join", {
      user: user,
      chatroom: chatroom.id
    });
  }

  /**
   * Send notification about user leaving the chatroom
   * 
   * @param chatroom  Target chatroom
   * @param user  User ID inregistered from the target chatroom
   */
  public triggerLeave(chatroom: ChatroomDocument, user: string) {
    /* Emit the chatroom leave event for all users in the room */
    this._nsp.to(chatroom.id).emit("leave", {
      user: user,
      chatroom: chatroom.id
    });

    /* Unregister user from the chatroom */
    const sockets: sio.Socket[] = this._activeConnections[user];
    if (sockets && sockets.length > 0) {
      sockets.forEach((socket: sio.Socket) => {
        /* Leave from the chatroom only if the socket is connected */
        if (socket.connected) {
          socket.leave(chatroom.id);
        }
      });
    }
  }

  /**
   * Send notification about user leaving the chatroom
   * 
   * @param chatroom  Target chatroom
   * @param message  Message received
   */
  public triggerMessage(chatroom: ChatroomDocument, message: MessageDocument) {
    /* Emit the message to the chatroom */
    this._nsp.to(chatroom.id).emit("message", message);
  }
}

export const ChatServerCtrl = ChatServer.shared;
