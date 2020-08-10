/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the JobSity Challenge.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { AuthenticationCtrl } from '@/middlewares/authentication.middleware';
import { ResponseHandler } from '@/vendor/ikoabo/middlewares/response.middleware';
import { Objects } from '@/vendor/ikoabo/utils/objects.util';
import { Validator, ValidateObjectId } from '@/vendor/ikoabo/middlewares/validator.middleware';
import { ChatroomRegisterValidation } from '@/models/chatrooms.joi';
import { ChatroomCtrl } from '@/controllers/chatrooms.controller';
import { ChatroomDocument } from '@/models/chatrooms.model';
import { ChatServerCtrl } from '@/controllers/chat.server.controller';
import { mongoose } from '@typegoose/typegoose';
import { MESSAGE_TYPE } from '@/models/messages.enum';
import { Message, MessageDocument } from '@/models/messages.model';
import { MessageCtrl } from '@/controllers/messages.controller';
import { MessageRegisterValidation } from '@/models/messages.joi';

/* Create router object */
const router = Router();

/**
 * @api {post} /v1/chat/rooms Register new chatroom
 * @apiName RegisterChatroom
 * @apiGroup Chat
 * @apiPermission 'user'
 *
 * @apiDescription Register new chatroom into the chat server
 * 
 * @apiHeader {String} authorization  Bearer \<access token\>
 *
 * @apiParam (Body request fields) {String} name  Chatroom name (`REQUIRED`)
 * @apiParam (Body request fields) {String} [topic]  Chatroom topic
 *
 * @apiSuccess {String} id Chatroom unique ID
 * 
 * @apiError (Error status 401) {Number} error  Error number code
 * 
 * `1000` The access token isn't valid
 * 
 * `1001` The credentials used to authenticate are invalid
 * 
 * `1002` The authenticated account don't holds the required roles
 */
router.post('/rooms',
  Validator.joi(ChatroomRegisterValidation),
  AuthenticationCtrl.doAuthenticate(['user']),
  (req: any, res: Response, next: NextFunction) => {
    /* Create the new chatroom */
    ChatroomCtrl.create({
      name: Objects.get(req, 'body.name'),
      topic: Objects.get(req, 'body.topic'),
      owner: Objects.get(res, 'locals.authentication.user'),
      users: [Objects.get(res, 'locals.authentication.user')],
    }).then((chatroom: ChatroomDocument) => {
      /* Send the chatroom registration notification */
      ChatServerCtrl.triggerChatroom(chatroom);

      /* Set the response information */
      res.locals['response'] = {
        id: chatroom.id,
      };
      next();
    }).catch(next);
  },
  ResponseHandler.success,
  ResponseHandler.error
);

/**
 * @api {post} /v1/chat/rooms/join/:id Register user into chatroom
 * @apiName RegisterUserChatroom
 * @apiGroup Chat
 * @apiPermission 'user'
 *
 * @apiDescription Join the current user to the given chatroom
 * 
 * @apiHeader {String} authorization  Bearer \<access token\>
 *
 * @apiParam (URL parameter) {String} id  Chatroom identifier (`REQUIRED`)
  *
 * @apiSuccess {String} id Chatroom unique ID
 * 
 * @apiError (Error status 401) {Number} error  Error number code
 * 
 * `1000` The access token isn't valid
 * 
 * `1001` The credentials used to authenticate are invalid
 * 
 * `1002` The authenticated account don't holds the required roles
 */
router.post('/rooms/join/:id',
  Validator.joi(ValidateObjectId, 'params'),
  AuthenticationCtrl.doAuthenticate(['user']),
  (req: any, res: Response, next: NextFunction) => {
    const chatroomId = req.params['id'];
    const user = new mongoose.Types.ObjectId(Objects.get(res, 'locals.authentication.user'));

    /* Add the user to the chatroom */
    ChatroomCtrl.update(chatroomId, null, null, { $addToSet: { users: user } }).then((chatroom: ChatroomDocument) => {
      /* Send the chatroom registration notification */
      ChatServerCtrl.triggerJoin(chatroom, user.toString());

      /* Set the response information */
      res.locals['response'] = {
        id: chatroom.id,
      };
      next();
    }).catch(next);
  },
  ResponseHandler.success,
  ResponseHandler.error
);

/**
 * @api {delete} /v1/chat/rooms/leave/:id Remove user from chatroom
 * @apiName DeleteUserChatroom
 * @apiGroup Chat
 * @apiPermission 'user'
 *
 * @apiDescription Remove the current user from the given chatroom
 * 
 * @apiHeader {String} authorization  Bearer \<access token\>
 *
 * @apiParam (URL parameter) {String} id  Chatroom identifier (`REQUIRED`)
  *
 * @apiSuccess {String} id Chatroom unique ID
 * 
 * @apiError (Error status 401) {Number} error  Error number code
 * 
 * `1000` The access token isn't valid
 * 
 * `1001` The credentials used to authenticate are invalid
 * 
 * `1002` The authenticated account don't holds the required roles
 */
router.delete('/rooms/leave/:id',
  Validator.joi(ValidateObjectId, 'params'),
  AuthenticationCtrl.doAuthenticate(['user']),
  (req: any, res: Response, next: NextFunction) => {
    const chatroomId = req.params['id'];
    const user = new mongoose.Types.ObjectId(Objects.get(res, 'locals.authentication.user'));

    /* Add the user to the chatroom */
    ChatroomCtrl.update(chatroomId, null, null, { $pullAll: { users: [user] } }).then((chatroom: ChatroomDocument) => {
      /* Send the chatroom leave notification */
      ChatServerCtrl.triggerLeave(chatroom, user.toString());

      /* Set the response information */
      res.locals['response'] = {
        id: chatroom.id,
      };
      next();
    }).catch(next);
  },
  ResponseHandler.success,
  ResponseHandler.error
);


/**
 * @api {post} /v1/chat/rooms/message/:id Register new message into chatroom
 * @apiName RegisterMessageChatroom
 * @apiGroup Chat
 * @apiPermission 'user'
 *
 * @apiDescription Send new message to a chatroom
 * 
 * @apiHeader {String} authorization  Bearer \<access token\>
 *
 * @apiParam (URL parameter) {String} id  Chatroom identifier (`REQUIRED`)
 * 
 * @apiParam (Body request fields) {String} [message]  Message to send
 * @apiParam (Body request fields) {String} [image]  Base64 image to send as message
 *
 * @apiSuccess {String} id Chatroom unique ID
 * 
 * @apiError (Error status 401) {Number} error  Error number code
 * 
 * `1000` The access token isn't valid
 * 
 * `1001` The credentials used to authenticate are invalid
 * 
 * `1002` The authenticated account don't holds the required roles
 */
router.post('/rooms/message/:id',
  Validator.joi(ValidateObjectId, 'params'),
  Validator.joi(MessageRegisterValidation),
  AuthenticationCtrl.doAuthenticate(),
  (req: any, res: Response, next: NextFunction) => {
    const user = new mongoose.Types.ObjectId(Objects.get(res, 'locals.authentication.user'));
    let query = {};

    /* Check for bot user account */
    if (Objects.get(res, 'locals.authentication.type') !== 3) {
      /* If the user is not a bot, then must be registered */
      query = { users: user };
    }

    ChatroomCtrl.fetch(req.params['id'], query)
      .then((chatroom: ChatroomDocument) => {
        /* Get message */
        let msg: string = Objects.get(req, "body.message", "").toString();
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
        if (!Objects.get(req, "body.message") && Objects.get(req, "body.image")) {
          msgType = MESSAGE_TYPE.MT_IMAGE;
          msg = Objects.get(req, "body.image");
        }

        /* Create the message */
        const message: any = {
          owner: user,
          chatroom: chatroom.id,
          type: msgType,
          message: msg,
        };

        /* Store the received message */
        MessageCtrl.create(message)
          .then((message: MessageDocument) => {
            /* Emit a notification for the new message */
            ChatServerCtrl.triggerMessage(chatroom, message);

            /* Send response */
            res.locals['response'] = { id: message.id };
            next();
          })
          .catch(next);
      })
      .catch(next);
  },
  ResponseHandler.success,
  ResponseHandler.error
);

export default router;
