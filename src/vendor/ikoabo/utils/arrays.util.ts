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
 * Utility class to handle specific operations on arrays
 */
export class Arrays {
  /**
   * Force an string value to be an array
   *
   * @param value  String value to be forced to array
   * @param defaults  List of defaults values that array must contain
   * @param prevent  List of elements that array can't contain
   */
  public static force(value: string | string[] | null, defaults?: string[], prevent?: string[]): string[] {
    let array: string[];
    if (!value) {
      array = [];
    }

    if (typeof value === 'string') {
      array = value.split(' ');
    } else {
      array = Array.from(value || []);
    }

    /* Add default values */
    if (defaults && defaults.length > 0) {
      defaults.forEach((tmp: string) => {
        if (array.indexOf(tmp) < 0) {
          array.push(tmp);
        }
      });
    }

    /* Handle if there is values to be excluded */
    if (prevent && prevent.length > 0) {
      array = array.filter(tmp => prevent.indexOf(tmp) < 0);
    }

    return array;
  }

  /**
   * Sort the given array
   *
   * @param arr  Array to be sorted
   */
  public static sort(arr: string[]): string[] {
    return arr.sort((n1: string, n2: string): number => {
      if (n1 > n2) {
        return 1;
      }
      if (n1 < n2) {
        return -1;
      }
      return 0;
    });
  }

  /**
   * Binary search on the given array
   *
   * @param arr  Array of values
   * @param value  Value to search into the array
   */
  public static search(arr: string[], value: string): number {
    let start: number = 0, end: number = arr.length - 1;
    let mid: number;
    /* Iterate while start not meets end  */
    while (start <= end) {
      /* Find the mid index */
      mid = Math.floor((start + end) / 2);

      /* If element is present at mid */
      if (arr[mid] === value) {
        return mid;
      }

      /* Look in left or right half accordingly */
      if (arr[mid] < value) {
        start = mid + 1;
      } else {
        end = mid - 1;
      }
    }
    /* Element not found */
    return -1;
  }

  /**
   * Intersect all the array items
   *
   * @param arr  List of arrays to intersect
   */
  public static intersect(...arr: string[][]): string[] {
    /* Sort all the results */
    for (let i = 0; i < arr.length; ++i) {
      arr[i] = Arrays.sort(arr[i]);
    }

    /* Intersect all the sorted arrays */
    return [...arr].reduce((a1: string[], a2: string[]): string[] => a1.filter((value: string) => Arrays.search(a2, value) > -1));
  }
}
