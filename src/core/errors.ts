export const ErrorMessage = {
  RequiredFieldMissing: 'required field cannot be empty',
  ImmutableFieldChanged: 'immutable field cannot be changed',
  MultipleInvalidItems: (
    invalidItems: { key: string; reason: string }[]
  ): string => {
    return `${invalidItems.length} ${
      invalidItems.length === 1 ? 'item' : 'items'
    } in array failed validation; ${invalidItems
      .map(item => `item ${item.key} failed because '${item.reason}'`)
      .join('; ')}`;
  },
  InvalidModifiedState: 'One or more modified fields did not pass validation',
  UnexpectedType: (expected: string, value: any) => {
    return `unexpected type, expected ${expected}, but value is ${typeof value}`;
  }
};
