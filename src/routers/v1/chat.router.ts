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
import { Validator } from '@/vendor/ikoabo/middlewares/validator.middleware';
import { ChatroomRegisterValidation } from '@/models/chatrooms.joi';
import { ChatroomCtrl } from '@/controllers/chatrooms.controller';
import { ChatroomDocument } from '@/models/chatrooms.model';

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
      owner: Objects.get(res, 'locals.token.account.id'),
      users: [Objects.get(res, 'locals.token.account.id')],
    }).then((chatroom: ChatroomDocument) => {
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

export default router;
