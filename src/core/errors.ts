enum ErrorCode {
  InvalidConfiguration = 'InvalidConfiguration',
  InvalidModifiedState = 'InvalidModifiedState',
  InvalidArgument = 'InvalidArgument',
  UnknownError = 'UnknownError'
}

const ErrorMessage = {
  MultipleInvalidItems: (
    invalidItems: { key: string; reason: string }[]
  ): string => {
    return `${invalidItems.length} ${
      invalidItems.length === 1 ? 'item' : 'items'
    } in array failed validation; ${invalidItems
      .map(item => `item ${item.key} failed because '${item.reason}'`)
      .join('; ')}`;
  },
  ImmutableFieldChanged: 'immutable field cannot be changed',
  InvalidArgument: (key: string, value: any, reason: string) => {
    return `the argument ${key} given ${value} is invalid because ${reason}`;
  },
  InvalidModifiedState: 'one or more modified fields did not pass validation',
  RequiredFieldMissing: 'required field cannot be empty',
  UnexpectedType: (expected: string, value: any) => {
    return `unexpected type, expected ${expected}, but value is ${typeof value}`;
  },
  UninterpretedIntention: 'no intention interpreted',
  UnmatchedFieldInModifiedState:
    'modified state contains fields not matched by any intent',
  UnknownFieldInState: 'input state cannot contain unknown fields'
};

export { ErrorCode, ErrorMessage };
