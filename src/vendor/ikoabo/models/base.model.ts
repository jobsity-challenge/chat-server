/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the IKOA Business Opportunity Core Server.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */
import { prop } from "@typegoose/typegoose";
import mongoose from "mongoose";
import { BASE_STATUS } from "./status.enum";

export class BaseModel {
  @prop({ required: true, default: BASE_STATUS.BS_ENABLED })
  status?: number;

  @prop({ type: mongoose.Types.ObjectId })
  owner?: string;

  @prop()
  createdAt?: Date;

  @prop()
  updatedAt?: Date;

  @prop({ type: mongoose.Types.ObjectId })
  modifiedBy?: string;
}
