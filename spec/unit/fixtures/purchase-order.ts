import { TestFixture } from './interface';
import { ErrorCode } from '../../../src/interfaces/error-types';

export const fixture: TestFixture = {
  typeConfigList: [
    {
      typeId: 'Email',
      validator: input =>
        typeof input.value === 'string' &&
        /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i.test(
          input.value
        ),
      sanitizer: input =>
        typeof input.modifiedValue === 'string'
          ? input.modifiedValue.toLowerCase()
          : input.modifiedValue
    },
    {
      typeId: 'Card',
      validator: input =>
        typeof input.value === 'string' &&
        input.value.split('-').join('').length === 12
    }
  ],
  modelConfiguration: {
    modelId: 'PurchaseOrder',
    fieldConfigList: [
      {
        fieldId: 'productId'
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
        validator: ({ value }) =>
          ['pending', 'completed', 'canceled'].includes(value)
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
        error: {
          code: ErrorCode.InvalidModifiedState,
          message: null,
          info: { fieldIds: ['card'] }
        }
      }
    ]
  ]
};
