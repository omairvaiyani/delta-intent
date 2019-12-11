import { TestFixture } from './interface';
import { ValueMatchPresence } from '../../../src/interfaces/match-config-types';
import { Operation } from '../../../src/interfaces/intent-config-types';
import { ErrorCode, ErrorMessage } from '../../../src/core/errors';

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
      },
      {
        fieldId: 'refund',
        validator: params => {
          const { context, modifiedValue, existingState } = params;
          if (modifiedValue) {
            if (context.role !== 'admin') {
              return `${context.role} role is not permitted to perform this action`;
            }
            return (
              existingState.status === 'completed' ||
              'you cannot refund an incomplete order'
            );
          }
        }
      }
    ],
    intentConfigList: [
      {
        intentId: 'CreateOrder',
        operation: Operation.Create,
        matchConfig: {
          items: [
            {
              fieldMatch: ['productId', 'email', 'card'],
              deltaMatch: {
                modifiedState: {
                  presence: ValueMatchPresence.Required
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
        operation: Operation.Update,
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
        operation: Operation.Update,
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
      },
      {
        intentId: 'RefundOrder',
        operation: Operation.Update,
        matchConfig: {
          items: [
            {
              fieldMatch: 'refund',
              deltaMatch: {
                modifiedState: {
                  value: true
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
    ],
    [
      [],
      {
        modifiedState: {
          refund: true
        },
        existingState: {
          productId: 'SomeWidget',
          email: 'shopper.mcgee@domain.com',
          card: '0000-0000-0000',
          status: 'completed'
        },
        context: {
          role: 'buyer'
        }
      },
      {
        description: 'context is available to validator',
        error: {
          modelId: null,
          code: ErrorCode.InvalidModifiedState,
          message: ErrorMessage.InvalidModifiedState,
          invalidFields: [
            {
              fieldId: 'refund',
              value: true,
              reason: 'buyer role is not permitted to perform this action'
            }
          ]
        }
      }
    ]
  ]
};
