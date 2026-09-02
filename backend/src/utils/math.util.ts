import Decimal from 'decimal.js';

// Enforce precise financial math using decimal.js
export class MathUtility {
  static create(value: number | string | Decimal): Decimal {
    return new Decimal(value);
  }

  static add(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return new Decimal(a).plus(new Decimal(b));
  }

  static subtract(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return new Decimal(a).minus(new Decimal(b));
  }

  static isZeroSum(values: (number | string | Decimal)[]): boolean {
    const sum = values.reduce((acc: Decimal, val) => acc.plus(new Decimal(val)), new Decimal(0));
    return sum.isZero();
  }
}
