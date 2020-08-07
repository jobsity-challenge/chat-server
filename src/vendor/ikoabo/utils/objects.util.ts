/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the IKOA Business Opportunity Core Server.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */

/**
 * Utility class to handle object properties
 */
export class Objects {
  /**
   * Get an object value from the given path
   */
  public static get(obj: any, path?: string, value?: any): any {
    /* Check if the object is defined */
    if (!obj) {
      return value;
    }

    /* Check if the path is defined */
    if (!path) {
      return obj;
    }

    /* Get all path keys */
    const keys = path.split('.');
    let itr = 0;
    let tmp = obj;

    /* Iterate each path key */
    while (itr < keys.length) {
      tmp = tmp[keys[itr]];
      /* Check if the path don't exists */
      if (tmp === null || tmp === undefined) {
        return value;
      }
      itr++;
    }
    return tmp;
  }
}
