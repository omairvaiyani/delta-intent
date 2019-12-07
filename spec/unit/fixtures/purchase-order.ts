import { TestFixture } from './interface';
import { ErrorCode } from '../../../src/interfaces/error-types';

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
    modelId: 'PurchaseOrder',
    fieldConfigList: [
      {
        fieldId: 'productId',
        // enforce type string with min lengt 1
        // and immutability
        validator: params =>
          params.isCreate
            ? typeof params.modifiedValue === 'string' &&
              !!params.modifiedValue.trim().length
            : params.modifiedValue === params.existingValue
            ? true
            : 'cannot update productId'
      },
      {
        fieldId: 'email',
        typeId: 'Email'
      },
      {
        fieldId: 'card',
        typeId: 'Card'
      },
      {
        fieldId: 'status',
        validator: [
          ({ isCreate, modifiedValue }) =>
            isCreate
              ? modifiedValue === 'pending'
                ? true
                : 'new orders must have status pending'
              : true,
          ({ modifiedValue }) =>
            ['pending', 'completed', 'canceled'].includes(modifiedValue)
              ? true
              : 'unknown status'
        ]
      }
    ],
    intentConfigList: [
      {
        intentId: 'CreateOrder',
        isCreate: true,
        matchConfig: {
          items: [
            {
              fieldMatch: ['productId', 'email', 'card'],
              deltaMatch: {
                modifiedState: {
                  presence: 'required'
                }
              }
            },
            {
              fieldMatch: 'status',
              deltaMatch: {
                modifiedState: {
                  value: 'pending'
                }
              }
            }
          ]
        }
      },
      {
        intentId: 'CompleteOrder',
        isCreate: false,
        matchConfig: {
          items: [
            {
              fieldMatch: 'status',
              deltaMatch: {
                existingState: {
                  value: 'pending'
                },
                modifiedState: {
                  value: 'completed'
                }
              }
            }
          ]
        }
      },
      {
        intentId: 'CancelOrder',
        isCreate: false,
        matchConfig: {
          items: [
            {
              fieldMatch: 'status',
              deltaMatch: {
                existingState: {
                  value: 'completed'
                },
                modifiedState: {
                  value: 'canceled'
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
      ['CreateOrder'],
      {
        modifiedState: {
          productId: 'SomeWidget',
          email: 'shopper.mcgee@domain.com',
          card: '0000-0000-0000',
          status: 'pending'
        }
      }
    ],
    [
      [],
      {
        modifiedState: {
          productId: 'SomeWidget',
          email: 'shopper.mcgee@domain.com',
          card: 'foo-bar',
          status: 'pending'
        }
      },
      {
        description: 'invalid value',
        error: {
          modelId: 'PurchaseOrder',
          code: ErrorCode.InvalidModifiedState,
          message: null,
          invalidFields: [
            {
              fieldId: 'card',
              value: 'foo-bar',
              reason: 'card must be 12 digits long'
            }
          ]
        }
      }
    ],
    [
      ['CompleteOrder'],
      {
        modifiedState: {
          status: 'completed'
        },
        existingState: {
          productId: 'SomeWidget',
          email: 'shopper.mcgee@domain.com',
          card: '0000-0000-0000',
          status: 'pending'
        }
      }
    ],
    [
      ['CancelOrder'],
      {
        modifiedState: {
          status: 'canceled'
        },
        existingState: {
          productId: 'SomeWidget',
          email: 'shopper.mcgee@domain.com',
          card: '0000-0000-0000',
          status: 'completed'
        }
      }
    ],
    [
      [],
      {
        modifiedState: {
          productId: 'some-other-id'
        },
        existingState: {
          productId: 'SomeWidget',
          email: 'shopper.mcgee@domain.com',
          card: '0000-0000-0000',
          status: 'completed'
        }
      },
      {
        description: 'modify immutable field',
        error: {
          modelId: null,
          code: ErrorCode.InvalidModifiedState,
          message: null,
          invalidFields: [
            {
              fieldId: 'productId',
              value: 'some-other-id',
              reason: 'cannot update productId'
            }
          ]
        }
      }
    ],
    [
      [],
      {
        modifiedState: {
          productId: 'SomeWidget',
          email: 'shopper.mcgee@domain.com',
          card: '0000-0000-0000',
          status: 'foobar'
        }
      },
      {
        description: 'multiple validators, multiple failed',
        error: {
          modelId: null,
          message: null,
          code: ErrorCode.InvalidModifiedState,
          invalidFields: [
            {
              fieldId: 'status',
              value: 'foobar',
              reason: ['new orders must have status pending', 'unknown status']
            }
          ]
        }
      }
    ],
    [
      [],
      {
        modifiedState: {
          productId: 'SomeWidget',
          email: 'shopper.mcgee@domain.com',
          card: '0000-0000-0000',
          status: 'completed'
        }
      },
      {
        description: 'multiple validators, single failed',
        error: {
          modelId: null,
          message: null,
          code: ErrorCode.InvalidModifiedState,
          invalidFields: [
            {
              fieldId: 'status',
              value: 'completed',
              reason: 'new orders must have status pending'
            }
          ]
        }
      }
    ]
  ]
};
