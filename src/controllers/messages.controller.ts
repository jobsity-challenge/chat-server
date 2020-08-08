/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the JobSity Challenge.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */
import { CRUD } from "@/vendor/ikoabo/controllers/crud.controller";
import {
  Message,
  MessageDocument,
  MessageModel,
} from "@/models/messages.model";

/**
 * Messages controller
 */
class Messages extends CRUD<Message, MessageDocument> {
  private static _instance: Messages;

  /**
   * Private constructor to allow singleton class instance
   */
  private constructor() {
    super("Messages", MessageModel);
  }

  /**
   * Return singleton class instance
   */
  public static get shared(): Messages {
    if (!Messages._instance) {
      Messages._instance = new Messages();
    }
    return Messages._instance;
  }
}

export const MessageCtrl = Messages.shared;
