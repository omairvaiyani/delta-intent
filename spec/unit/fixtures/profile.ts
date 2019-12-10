import { TestFixture } from './interface';
import { ErrorCode } from '../../../src/interfaces/error-types';
import { DefaultInvalidValueMessage } from '../../../src/interfaces/validator-types';
import { ValueMatchPresence } from '../../../src/interfaces/match-config-types';
import { Operation } from '../../../src/interfaces/intent-config-types';

export const fixture: TestFixture = {
  typeConfigList: [
    {
      typeId: 'Age',
      validator: input =>
        typeof input.modifiedValue === 'number'
          ? input.modifiedValue > 4 && input.modifiedValue < 25
          : typeof input.modifiedValue === 'undefined'
    },
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
      typeId: 'File',
      validator: input =>
        typeof input.modifiedValue === 'undefined' ||
        (Object.hasOwnProperty.call(input.modifiedValue, 'url') &&
          Object.hasOwnProperty.call(input.modifiedValue, 'name')),
      objectHasher: file => file.url
    },
    {
      typeId: 'Badge',
      validator: input =>
        typeof input.modifiedValue === 'undefined' ||
        (Object.hasOwnProperty.call(input.modifiedValue, 'icon') &&
          Object.hasOwnProperty.call(input.modifiedValue, 'label')),
      objectHasher: badge => badge.label
    }
  ],
  modelConfiguration: {
    modelId: 'Profile',
    fieldConfigList: [
      {
        fieldId: 'name'
      },
      {
        fieldId: 'age',
        typeId: 'Age'
      },
      {
        fieldId: 'email',
        typeId: 'Email'
      },
      {
        fieldId: 'profilePicture',
        typeId: 'File'
      },
      {
        fieldId: 'badges',
        typeId: 'Badge',
        isArray: true
      }
    ],
    intentConfigList: [
      {
        intentId: 'Register',
        operation: Operation.Create,
        matchConfig: {
          items: [
            {
              fieldMatch: ['name', 'age', 'email'],
              deltaMatch: {
                modifiedState: {
                  presence: ValueMatchPresence.Required
                }
              }
            },
            {
              fieldMatch: 'profilePicture',
              deltaMatch: {
                modifiedState: {
                  presence: ValueMatchPresence.Optional
                }
              }
            },
            {
              fieldMatch: 'badges',
              deltaMatch: {
                modifiedState: {
                  presence: ValueMatchPresence.Forbidden
                }
              }
            }
          ]
        }
      },
      {
        intentId: 'UpdateBio',
        operation: Operation.Update,
        matchConfig: {
          items: [
            {
              fieldMatch: [['name', 'age', 'profilePicture']],
              deltaMatch: {
                deltaCheck: true
              }
            }
          ]
        }
      },
      {
        intentId: 'UpdateEmail',
        operation: Operation.Update,
        matchConfig: {
          items: [
            {
              fieldMatch: 'email',
              deltaMatch: {
                deltaCheck: true
              }
            }
          ]
        }
      },
      {
        intentId: 'AddBadges',
        operation: Operation.Update,
        matchConfig: {
          items: [
            {
              fieldMatch: 'badges',
              deltaMatch: {
                deltaCheck: {
                  arrayChanges: {
                    added: true
                  }
                }
              }
            }
          ]
        }
      },
      {
        intentId: 'RemoveBadges',
        operation: Operation.Update,
        matchConfig: {
          items: [
            {
              fieldMatch: 'badges',
              deltaMatch: {
                deltaCheck: {
                  arrayChanges: {
                    removed: true
                  }
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
      ['Register'],
      {
        modifiedState: {
          name: 'Scooby Doo',
          age: 10,
          email: 'scooby.doo@mysteries.cnn',
          foO: 'baz'
        }
      }
    ],
    [
      [],
      {
        modifiedState: {
          name: 'Scooby Doo',
          age: 10,
          email: 'scooby.doo@mysteries.cnn',
          badges: [
            {
              icon: 'star',
              label: 'premium'
            }
          ]
        }
      }
    ],
    [
      ['UpdateBio'],
      {
        existingState: {
          name: 'Scooby Doo',
          age: 10,
          email: 'scooby.doo@mysteries.cnn'
        },
        modifiedState: {
          name: 'Shaggy'
        }
      }
    ],
    [
      ['UpdateBio'],
      {
        existingState: {
          name: 'Scooby Doo',
          age: 10,
          email: 'scooby.doo@mysteries.cnn'
        },
        modifiedState: {
          age: 21
        }
      }
    ],
    [
      ['UpdateEmail'],
      {
        existingState: {
          name: 'Scooby Doo',
          age: 10,
          email: 'scooby.doo@mysteries.cnn'
        },
        modifiedState: {
          email: 'support@mysteries.cnnn'
        }
      }
    ],
    [
      ['AddBadges'],
      {
        existingState: {
          name: 'Scooby Doo',
          age: 10,
          email: 'scooby.doo@mysteries.cnn'
        },
        modifiedState: {
          badges: [{ icon: 'star', label: 'Premium' }]
        }
      }
    ],
    [
      ['RemoveBadges'],
      {
        existingState: {
          name: 'Scooby Doo',
          age: 10,
          email: 'scooby.doo@mysteries.cnn',
          badges: [
            { icon: 'bolt', label: 'Power' },
            { icon: 'star', label: 'Premium' }
          ]
        },
        modifiedState: {
          badges: [{ icon: 'star', label: 'Premium' }]
        }
      }
    ],
    [
      [],
      {
        existingState: {
          name: 'Scooby Doo',
          age: 10,
          email: 'scooby.doo@mysteries.cnn',
          badges: [
            { icon: 'bolt', label: 'Power' },
            { icon: 'star', label: 'Premium' }
          ]
        },
        modifiedState: {
          badges: [
            { icon: 'star', label: 'Premium' },
            { icon: 'bolt', label: 'Power' }
          ]
        }
      }
    ],
    [
      [],
      {
        modifiedState: {
          name: 'Scooby Doo',
          email: 'invalid-email@',
          badges: [{ _icon: 'hi' }]
        }
      },
      {
        description: 'invalid field',
        error: {
          modelId: null,
          message: null,
          code: ErrorCode.InvalidModifiedState,
          invalidFields: [
            {
              fieldId: 'email',
              value: 'invalid-email@',
              reason: DefaultInvalidValueMessage
            },
            {
              fieldId: 'badges',
              value: [{ _icon: 'hi' }],
              reason: `1 item in array failed validation; item 0 failed because '${DefaultInvalidValueMessage}'`
            }
          ]
        }
      }
    ],
    [
      [],
      {
        modifiedState: {
          email: 'Scooby.Doo@mysteries.CNN'
        },
        existingState: {
          name: 'Scooby Doo',
          email: 'scooby.doo@mysteries.cnn'
        }
      },
      {
        description: 'sanitised field should be unmodifed'
      }
    ]
  ]
};
