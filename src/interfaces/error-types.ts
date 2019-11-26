enum ErrorCode {
  InvalidConfiguration = 'InvalidConfiguration',
  InvalidModifiedState = 'InvalidModifiedState',
  UnknownError = 'UnknownError'
}

interface IDeltaError {
  code: ErrorCode;
  message: string;
  info?: any;
}

export { ErrorCode, IDeltaError };
