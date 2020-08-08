/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the JobSity Challenge.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */
import {
  prop,
  getModelForClass,
  DocumentType,
  index,
  Ref,
} from "@typegoose/typegoose";
import mongoose from "mongoose";
import { BaseModel } from "@/vendor/ikoabo/models/base.model";
import { Chatroom } from "@/models/chatrooms.model";
import { MESSAGE_TYPE } from "@/models/messages.enum";

@index({ chatroom: 1 })
export class Message extends BaseModel {
  @prop({ required: true, ref: Chatroom })
  chatroom!: Ref<Chatroom>;

  @prop({ required: true })
  message!: string;

  @prop({ required: true, enum: MESSAGE_TYPE, default: MESSAGE_TYPE.MT_TEXT })
  type!: MESSAGE_TYPE;

  /**
   * Get the mongoose data model
   */
  static get shared() {
    return getModelForClass(Message, {
      schemaOptions: {
        collection: "messages",
        timestamps: true,
        toJSON: {
          virtuals: true,
          versionKey: false,
          transform: (_doc: any, ret: any) => {
            return {
              id: ret.id,
              chatroom: ret.chatroom,
              message: ret.message,
              type: ret.type,
              owner: ret.owner,
              createdAt: ret.createdAt,
            };
          },
        },
      },
      options: { automaticName: false },
    });
  }
}

/* Export Mongoose model */
export type MessageDocument = DocumentType<Message>;
export const MessageModel: mongoose.Model<MessageDocument> = Message.shared;
