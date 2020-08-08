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
} from "@typegoose/typegoose";
import mongoose from "mongoose";
import { BaseModel } from "@/vendor/ikoabo/models/base.model";

@index({ name: 1 }, { unique: true })
export class Chatroom extends BaseModel {
  @prop({ required: true })
  name!: string;

  @prop()
  topic?: string;

  @prop({ required: true, type: mongoose.Types.ObjectId })
  users!: mongoose.Types.ObjectId[];

  /**
   * Get the mongoose data model
   */
  static get shared() {
    return getModelForClass(Chatroom, {
      schemaOptions: {
        collection: "chatrooms",
        timestamps: true,
        toJSON: {
          virtuals: true,
          versionKey: false,
          transform: (_doc: any, ret: any) => {
            return {
              id: ret.id,
              name: ret.name,
              topic: ret.topic,
              users: ret.users,
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
export type ChatroomDocument = DocumentType<Chatroom>;
export const ChatroomModel: mongoose.Model<ChatroomDocument> = Chatroom.shared;
