/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the JobSity Challenge.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */
import { Joi } from "@/vendor/ikoabo/middlewares/validator.middleware";

/**
 * Body schema validation for chatroom creation
 */
export const ChatroomRegisterValidation = Joi.object().keys({
  name: Joi.string().required(),
  topic: Joi.string().allow("").optional(),
});
