/** Form types ingested by the Form 3/4/5 ownership pipeline. */
const FORM345_PATTERN = /^(3|4|5)(\/A)?$/i;

export function isForm345Filing(formType: string): boolean {
  return FORM345_PATTERN.test(formType.trim());
}
