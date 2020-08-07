/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the IKOA Business Opportunity Core Server.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */
import sha256 from 'sha256';
import uniqid from 'uniqid';

/**
 * Utility class to generate random tokens
 */
export class Token {
  /**
   * Generate short pseudounique token based on current timestamp
   */
  public static get shortToken(): string {
    return uniqid.time();
  }

  /**
   * Generate sha256 long token based on pseudounique value
   */
  public static get longToken(): string {
    return sha256(uniqid());
  }
}
