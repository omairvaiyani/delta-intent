import { TestFixture } from './interface';
import { ValueMatchPresence } from '../../../src/interfaces/match-config-types';
import {
  Operation,
  ExternalPolicy,
  InternalPolicy
} from '../../../src/interfaces/intent-config-types';
import { ErrorMessage, ErrorCode } from '../../../src/core/errors';

export const fixture: TestFixture = {
  typeConfigList: [
    {
      typeId: 'Email',
      validator: input =>
        typeof input.modifiedValue === 'string' &&
        /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i.test(
          input.modifiedValue
        ),
      sanitiser: input => {
        let sanitisedValue: string;
        if (typeof input.modifiedValue === 'string') {
          sanitisedValue = input.modifiedValue.toLowerCase();
        }
        return {
          didSanitise: sanitisedValue !== input.modifiedValue,
          sanitisedValue
        };
      }
    },
    {
      typeId: 'Card',
      validator: input =>
        typeof input.modifiedValue !== 'string' ||
        input.modifiedValue.split('-').join('').length !== 12
          ? 'card must be 12 digits long'
          : true
    }
  ],
  modelConfiguration: {
    modelId: 'AccidentClaim',
    fieldConfigList: [
      {
        fieldId: 'claimId',
        isImmutable: true,
        isRequired: true
      },
      {
        fieldId: 'injuredParty',
        isRequired: true,
        isImmutable: true
      },
      {
        fieldId: 'accidentType',
        isRequired: true
      },
      {
        fieldId: 'defendant',
        validator: params => {
          const injuredParty = params.postState['injuredParty'];
          const defendant = params.modifiedValue;
          if (injuredParty === defendant) {
            return 'injured party cannot make a claim against themselves';
          }
          return true;
        }
      },
      {
        fieldId: 'hasInsurance',
        isRequired: true
      },
      {
        fieldId: 'description'
      },
      {
        fieldId: 'claimStatus',
        validator: params => {
          if (params.existingValue !== params.modifiedValue) {
            if (
              !['filed', 'rejected', 'approved'].includes(params.modifiedValue)
            ) {
              return `unacceptable claim status: ${params.modifiedValue}`;
            }
            if (['approved', 'rejected'].includes(params.existingValue)) {
              return 'cannot change claim status after a decision has been made';
            }
            if (params.modifiedValue === 'approved') {
              if (!params.postState['hasInsurance']) {
                return 'cannot approve claim without insurance';
              }
            }
          }
          return true;
        }
      },
      {
        fieldId: 'closeDate'
      }
    ],
    intentConfigList: [
      {
        intentId: 'NewClaim',
        operation: Operation.Create,
        externalPolicy: ExternalPolicy.Inclusive,
        internalPolicy: InternalPolicy.Strict,
        matchConfig: {
          items: [
            {
              fieldMatch: [
                'claimId',
                'injuredParty',
                'defendant',
                'accidentType',
                'hasInsurance'
              ],
              deltaMatch: {
                modifiedState: {
                  presence: ValueMatchPresence.Required
                }
              }
            },
            {
              fieldMatch: 'description',
              deltaMatch: {
                modifiedState: {
                  presence: ValueMatchPresence.Optional
                }
              }
            },

            {
              fieldMatch: 'claimStatus',
              deltaMatch: {
                modifiedState: {
                  value: 'filed'
                }
              }
            }
          ]
        }
      },
      {
        intentId: 'AddInsurance',
        operation: Operation.Any,
        externalPolicy: ExternalPolicy.Inclusive,
        internalPolicy: InternalPolicy.Relaxed,
        matchConfig: {
          items: [
            {
              fieldMatch: 'hasInsurance',
              deltaMatch: {
                modifiedState: {
                  value: true
                }
              }
            }
          ]
        }
      },
      {
        intentId: 'ApproveClaim',
        operation: Operation.Update,
        externalPolicy: ExternalPolicy.Exclusive,
        internalPolicy: InternalPolicy.Strict,
        matchConfig: {
          items: [
            {
              fieldMatch: 'claimStatus',
              deltaMatch: {
                deltaCheck: true,
                modifiedState: {
                  value: 'approved'
                }
              }
            },
            {
              fieldMatch: 'hasInsurance',
              deltaMatch: {
                modifiedState: {
                  presence: ValueMatchPresence.Optional
                }
              }
            }
          ]
        }
      }
    ]
  },
  scenarios: [
    [
      ['NewClaim'],
      {
        modifiedState: {
          claimId: '1',
          injuredParty: 'Wile e Coyote',
          defendant: 'Road Runner',
          accidentType: 'PersonalInjury',
          hasInsurance: false,
          description: 'Ran into painted wall',
          claimStatus: 'filed'
        }
      }
    ],
    [
      ['ApproveClaim'],
      {
        existingState: {
          claimId: '1',
          injuredParty: 'Wile e Coyote',
          defendant: 'Road Runner',
          accidentType: 'PersonalInjury',
          hasInsurance: true,
          description: 'Ran into painted wall',
          claimStatus: 'filed'
        },
        modifiedState: {
          claimStatus: 'approved'
        }
      },
      {
        description: 'exclusive policy does not omit singly matched intent'
      }
    ],
    [
      ['ApproveClaim'],
      {
        existingState: {
          claimId: '1',
          injuredParty: 'Wile e Coyote',
          defendant: 'Road Runner',
          accidentType: 'PersonalInjury',
          hasInsurance: false,
          description: 'Ran into painted wall',
          claimStatus: 'filed'
        },
        modifiedState: {
          claimStatus: 'approved',
          hasInsurance: true
        }
      },
      {
        description: 'exclusive policy omits intent where others matched'
      }
    ],
    [
      ['NewClaim', 'AddInsurance'],
      {
        modifiedState: {
          claimId: '1',
          injuredParty: 'Wile e Coyote',
          defendant: 'Road Runner',
          accidentType: 'PersonalInjury',
          hasInsurance: true,
          description: 'Ran into painted wall',
          claimStatus: 'filed'
        }
      },
      {
        description: 'multiple mixed operation intents with inclusive policy'
      }
    ],
    [
      [],
      {
        modifiedState: {
          claimId: '1',
          injuredParty: 'Wile e Coyote',
          defendant: 'Road Runner',
          accidentType: 'PersonalInjury',
          hasInsurance: false,
          description: 'Ran into painted wall',
          claimStatus: 'filed',
          closeDate: new Date().toISOString()
        }
      },
      {
        description: 'fails strict intent when given unexpected field',
        error: {
          modelId: null,
          code: ErrorCode.InvalidModifiedState,
          message: ErrorMessage.UninterpretedIntention
        }
      }
    ],
    [
      ['NewClaim'],
      {
        modifiedState: {
          claimId: '1',
          injuredParty: 'Wile e Coyote',
          defendant: 'Road Runner',
          accidentType: 'PersonalInjury',
          hasInsurance: false,
          claimStatus: 'filed'
        }
      },
      {
        description: 'maintain strict intent when missing optional field'
      }
    ],
    [
      [],
      {
        modifiedState: {
          claimId: '1',
          injuredParty: 'Wile e Coyote',
          defendant: 'Road Runner',
          accidentType: 'PersonalInjury',
          claimStatus: 'filed'
        }
      },
      {
        description: 'required field missing',
        error: {
          modelId: null,
          code: ErrorCode.InvalidModifiedState,
          message: ErrorMessage.InvalidModifiedState,
          invalidFields: [
            {
              fieldId: 'hasInsurance',
              value: undefined,
              reason: ErrorMessage.RequiredFieldMissing
            }
          ]
        }
      }
    ],
    [
      [],
      {
        modifiedState: {
          claimId: '1',
          defendant: 'Road Runner',
          claimStatus: 'filed'
        }
      },
      {
        description: 'multiple required field missing',
        error: {
          modelId: null,
          code: ErrorCode.InvalidModifiedState,
          message: ErrorMessage.InvalidModifiedState,
          invalidFields: [
            {
              fieldId: 'injuredParty',
              value: undefined,
              reason: ErrorMessage.RequiredFieldMissing
            },
            {
              fieldId: 'accidentType',
              value: undefined,
              reason: ErrorMessage.RequiredFieldMissing
            },
            {
              fieldId: 'hasInsurance',
              value: undefined,
              reason: ErrorMessage.RequiredFieldMissing
            }
          ]
        }
      }
    ],
    [
      [],
      {
        existingState: {
          claimId: '1',
          injuredParty: 'Robber One',
          defendant: 'Home Alone Kid',
          hasInsurance: false,

          accidentType: 'Fall',
          claimStatus: 'filed'
        },
        modifiedState: {
          claimId: '2',
          hasInsurance: true
        }
      },
      {
        description: 'immutable field changed',
        error: {
          modelId: null,
          code: ErrorCode.InvalidModifiedState,
          message: ErrorMessage.InvalidModifiedState,
          invalidFields: [
            {
              fieldId: 'claimId',
              value: '2',
              reason: ErrorMessage.ImmutableFieldChanged
            }
          ]
        }
      }
    ],
    [
      [],
      {
        existingState: {
          claimId: '1',
          injuredParty: 'Robber One',
          defendant: 'Home Alone Kid',
          hasInsurance: false,

          accidentType: 'Fall',
          claimStatus: 'filed'
        },
        modifiedState: {
          claimId: '2',
          injuredParty: 'Robber Two'
        }
      },
      {
        description: 'multiple immutable fields changed',
        error: {
          modelId: null,
          code: ErrorCode.InvalidModifiedState,
          message: ErrorMessage.InvalidModifiedState,
          invalidFields: [
            {
              fieldId: 'claimId',
              value: '2',
              reason: ErrorMessage.ImmutableFieldChanged
            },
            {
              fieldId: 'injuredParty',
              value: 'Robber Two',
              reason: ErrorMessage.ImmutableFieldChanged
            }
          ]
        }
      }
    ],
    [
      [],
      {
        existingState: {
          claimId: '1',
          injuredParty: 'Robber One',
          defendant: 'Home Alone Kid',
          hasInsurance: true,

          accidentType: 'Fall',
          claimStatus: 'filed'
        },
        modifiedState: {
          hasInsurance: false,
          claimStatus: 'approved'
        }
      },
      {
        description: 'validation failure due to state of cross dependent field',
        error: {
          modelId: null,
          code: ErrorCode.InvalidModifiedState,
          message: ErrorMessage.InvalidModifiedState,
          invalidFields: [
            {
              fieldId: 'claimStatus',
              value: 'approved',
              reason: 'cannot approve claim without insurance'
            }
          ]
        }
      }
    ],
    [
      [],
      {
        existingState: {
          claimId: '1',
          injuredParty: 'Robber One',
          defendant: 'Home Alone Kid',
          hasInsurance: true,

          accidentType: 'Fall',
          claimStatus: 'filed'
        },
        modifiedState: {
          defendant: 'Robber One',
          claimStatus: 'approved'
        }
      },
      {
        description:
          'validation failure due to state of existing dependent field',
        error: {
          modelId: null,
          code: ErrorCode.InvalidModifiedState,
          message: ErrorMessage.InvalidModifiedState,
          invalidFields: [
            {
              fieldId: 'defendant',
              value: 'Robber One',
              reason: 'injured party cannot make a claim against themselves'
            }
          ]
        }
      }
    ]
  ]
};
