import { isRecord } from '../../shared/expeditionSave';

/** Save validation rules shared by archive decoders. Each rule accepts or rejects one decoded JSON value. */
export type Rule = (value: unknown) => boolean;
export const number: Rule = (v) =>
  typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e9;
export const positive: Rule = (v) => number(v) && (v as number) >= 0;
export const integer: Rule = (v) => positive(v) && Number.isInteger(v);
export const string: Rule = (v) => typeof v === 'string';
export const boolean: Rule = (v) => typeof v === 'boolean';
export const oneOf =
  (values: readonly unknown[]): Rule =>
  (v) =>
    values.includes(v);
export const list =
  (rule: Rule, maximum = 2000): Rule =>
  (v) =>
    Array.isArray(v) && v.length <= maximum && v.every(rule);
export const dictionary =
  (rule: Rule): Rule =>
  (v) =>
    isRecord(v) && Object.values(v).every(rule);
export function object(required: Record<string, Rule>, optional: Record<string, Rule> = {}): Rule {
  return (v) =>
    isRecord(v) &&
    Object.entries(required).every(([key, rule]) => rule(v[key])) &&
    Object.keys(v).every((key) => key in required || (key in optional && optional[key]!(v[key])));
}
