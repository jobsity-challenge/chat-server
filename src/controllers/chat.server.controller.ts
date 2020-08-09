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
    this._cleanupCache();
  }

  /**
   * Cleanup the client connection cache
   */
  private _cleanupCache() {
    this._redis.scan("0", "MATCH", "active-clients-*", (err, keys) => {
      keys.forEach((connection) => {
        if (connection instanceof Array) {
          connection.forEach((c) => {
            this._redis.del(c);
          });
        }
      });
    });
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

    let auth: IAuthentication;

    /* Base socket.io connection */
    this._io.on('connect', (client: SocketIO.Socket) => {
      let token = client.handshake.query.token;

      if (!token) {
        client.disconnect();
      }

      setTimeout(() => {
        console.log((<any>client)["authentication"]);
        console.log(auth);
        /*if (!this._activeConnections[deviceToken]) {
            client.disconnect();
        }*/
      }, 5000);
    });

    /* Initialize socket.io namespace */
    this._nsp = this._io.of("/v1/channel");

    /* Listen for user connection event */
    this._nsp.on("connection", (clientSocket: sio.Socket, cb: any) => {
      /* Check for the user authentication */
      const token: string = Objects.get(clientSocket, "handshake.query.token");
      AuthenticationCtrl.authenticate(token, ["user"])
        .then((authentication: IAuthentication) => {
          auth=authentication;
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
          this._eventChatroom(clientSocket, authentication.user);
          this._eventChatrooms(clientSocket, authentication.user);
          this._eventJoin(clientSocket, authentication.user);
          this._eventLeave(clientSocket, authentication.user);
          this._eventMessage(clientSocket, authentication.user);
          this._eventWriting(clientSocket, authentication.user);
          this._eventHistory(clientSocket, authentication.user);
        })
        .catch((err: any) => {
          this._logger.error("Error connection user account", err);
          clientSocket.disconnect(true);
        });
    });
  }

  /**
   * Notify the user status changed to the user related by conversations
   *
   * @param user  User account
   * @param status  Changed status
   */
  private _statusChanged(user: string, status: USER_STATUS) {
    /* Fetch all chatrooms related with the given user */
    ChatroomCtrl.fetchAll({ users: user })
      .on("data", (chatroom: ChatroomDocument) => {
        const statusObj: any = {
          user: user,
          status: status,
        };
        /* Send notification to the related chatroom */
        this._logger.debug("User status changed", statusObj);
        this._nsp.to(chatroom.id).emit("status", statusObj);
      })
      .on("error", (err: any) => {
        this._logger.error("Error on user status changed", err);
      });
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
        clientSocket.removeAllListeners("chatroom");
        clientSocket.removeAllListeners("chatrooms");
        clientSocket.removeAllListeners("join");
        clientSocket.removeAllListeners("leave");
        clientSocket.removeAllListeners("message");
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
   * Handler for chatroom event
   * Create new chatroom
   *
   * @param clientSocket  Client socket
   * @param user  Authenticated user
   */
  private _eventChatroom(clientSocket: sio.Socket, user: string) {
    /* Register the event listener */
    clientSocket.on("chatroom", (data, cb) => {
      /* Create a new chatroom */
      ChatroomCtrl.create({
        owner: user,
        name: data.name,
        topic: data.topic,
        users: [<any>user],
      })
        .then((chatroom: ChatroomDocument) => {
          /* Emit the chatroom creation for all users */
          this._nsp.emit("chatroom", chatroom.toJSON());
          cb({ error: CHAT_ERRORS.NO_ERR });
        })
        .catch((err: any) => {
          this._logger.error("Error creating the chatroom", {
            data: data,
            error: err,
          });
          cb({ error: CHAT_ERRORS.ERR_INVALID_CHATROOM });
        });
    });
  }

  /**
   * Handler for chatrooms event
   * Get a list of chatrooms
   *
   * @param clientSocket  Client socket
   * @param user  Authenticated user
   */
  private _eventChatrooms(clientSocket: sio.Socket, user: string) {
    /* Register the event listener */
    clientSocket.on("chatrooms", (data, cb) => {
      const rooms: any[] = [];
      /* Fetch all chatrooms */
      const cursor = ChatroomCtrl.fetchAll();
      cursor.next((err: any, chatroom: ChatroomDocument) => {
        if (err) {
          this._logger.error("Error fetching all chatrooms", err);
          return;
        }

        /* Check for the last one */
        if (!chatroom) {
          cb({ error: CHAT_ERRORS.NO_ERR, chatrooms: rooms });
          return;
        }

        /* Register the room into the stack */
        rooms.push({
          id: chatroom.id,
          name: chatroom.name,
          topic: chatroom.topic,
          owner: chatroom.owner,
          present: chatroom.users.indexOf(mongoose.Types.ObjectId(user)) >= 0,
        });
      });
    });
  }

  /**
   * Handler for join event
   * Join to a chatroom
   *
   * @param clientSocket  Client socket
   * @param user  Authenticated user
   */
  private _eventJoin(clientSocket: sio.Socket, user: string) {
    /* Register the event listener */
    clientSocket.on("join", (data, cb) => {
      /* Add the user to the chatroom */
      ChatroomCtrl.update(
        data.chatroom,
        null,
        {},
        { $addToSet: { users: mongoose.Types.ObjectId(user) } }
      )
        .then((chatroom: ChatroomDocument) => {
          /* Emit the chatroom creation for all users */
          this._nsp.to(chatroom.id).emit("join", user);
          cb({ error: CHAT_ERRORS.NO_ERR, chatroom: chatroom.toJSON() });
        })
        .catch((err: any) => {
          this._logger.error("Error join to the chatroom", {
            data: data,
            error: err,
          });
          cb({ error: CHAT_ERRORS.ERR_INVALID_CHATROOM });
        });
    });
  }

  /**
   * Handler for leave event
   * Leave a chatroom
   *
   * @param clientSocket  Client socket
   * @param user  Authenticated user
   */
  private _eventLeave(clientSocket: sio.Socket, user: string) {
    /* Register the event listener */
    clientSocket.on("leave", (data, cb) => {
      /* Remove the user from the chatroom */
      ChatroomCtrl.update(
        data.chatroom,
        null,
        {},
        { $pullAll: { users: [mongoose.Types.ObjectId(user)] } }
      )
        .then((chatroom: ChatroomDocument) => {
          /* Emit the chatroom user leave */
          this._nsp.to(chatroom.id).emit("leave", user);
          cb({ error: CHAT_ERRORS.NO_ERR, chatroom: chatroom.toJSON() });
        })
        .catch((err: any) => {
          this._logger.error("Error leaving the chatroom", {
            data: data,
            error: err,
          });
          cb({ error: CHAT_ERRORS.ERR_INVALID_CHATROOM });
        });
    });
  }

  /**
   * Handler for message event
   * Send a new message to a chatroom
   *
   * @param clientSocket  Client socket
   * @param user  Authenticated user
   */
  private _eventMessage(clientSocket: sio.Socket, user: string) {
    /* Register the event listener */
    clientSocket.on("message", (data: any, cb) => {
      /* Look for the target chatroom */
      ChatroomCtrl.fetch(data.chatroom, { users: user })
        .then((chatroom: ChatroomDocument) => {
          const msg: string = Objects.get(data, "message", "").toString();
          let msgType: MESSAGE_TYPE = MESSAGE_TYPE.MT_TEXT;

          /* Check if the received message is a command to handle it with a bot */
          if (msg.startsWith("/stock")) {
            /* Command messages are handled by Bots */
            // TODO XXX IMPLEMENT BOT INTEGRATION
            return;
          }

          /* Check if the message type is an URL link */
          if (
            msg.startsWith("http://") ||
            msg.startsWith("https://") ||
            msg.startsWith("ftp://")
          ) {
            msgType = MESSAGE_TYPE.MT_LINK;
          }

          /* Check if an image is sent into the message */
          if (!data.message && data.image) {
            msgType = MESSAGE_TYPE.MT_IMAGE;
          }

          /* Create the message */
          const message: Message = {
            owner: user,
            chatroom: chatroom.id,
            type: msgType,
            message: data.message || data.image,
          };

          /* Store the received message */
          MessageCtrl.create(message)
            .then((message: MessageDocument) => {
              /* Emit a notification for the new message */
              this._nsp.to(chatroom.id).emit("message", {
                error: 0,
                chatroom: chatroom.id,
                msg: message.toJSON(),
              });
              cb({ error: CHAT_ERRORS.NO_ERR, id: message.id });
            })
            .catch((err: any) => {
              this._logger.error("Error storing message", err);
              cb({ error: CHAT_ERRORS.ERR_MESSAGE_CANT_BE_SEND });
            });
        })
        .catch((err: any) => {
          this._logger.error("Error looking for chatroom", err);
          cb({ error: CHAT_ERRORS.ERR_INVALID_CHATROOM });
        });
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
            source: user,
            chatroom: chatroom.id,
            status: data.status,
          });
        })
        .catch((err: any) => {
          this._logger.error("Error looking for chatroom", err);
          cb({ error: CHAT_ERRORS.ERR_INVALID_CHATROOM });
        });
    });
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

      /* Prepare the raw query */
      let query = MessageCtrl.fetchRaw({}).sort({ createdAt: -1 });

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
          cb({
            error: CHAT_ERRORS.NO_ERR,
            messages: messages.map((value) => value.toJSON()),
          });
        })
        .catch((err: any) => {
          this._logger.error("Error getting messages history", {
            data: data,
            error: err,
          });
          cb({ error: CHAT_ERRORS.ERR_HISTORY_CANT_BE_RETRIEVED });
        });
    });
  }
}

export const ChatServerCtrl = ChatServer.shared;
