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
  Chatroom,
  ChatroomDocument,
  ChatroomModel,
} from "@/models/chatrooms.model";

/**
 * Chatroom controller
 */
class Chatrooms extends CRUD<Chatroom, ChatroomDocument> {
  private static _instance: Chatrooms;

  /**
   * Private constructor to allow singleton class instance
   */
  private constructor() {
    super("Chatrooms", ChatroomModel);
  }

  /**
   * Return singleton class instance
   */
  public static get shared(): Chatrooms {
    if (!Chatrooms._instance) {
      Chatrooms._instance = new Chatrooms();
    }
    return Chatrooms._instance;
  }
}

export const ChatroomCtrl = Chatrooms.shared;
