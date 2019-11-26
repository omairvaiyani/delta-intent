import { TestFixture } from './interface';
import { ErrorCode } from '../../../src/interfaces/error-types';

export const fixture: TestFixture = {
  typeConfigList: [
    {
      typeId: 'CleanString',
      validator: input => ['undefined', 'string'].includes(typeof input.value),
      sanitizer: input =>
        input.modifiedValue ? input.modifiedValue.trim() : undefined
    },
    {
      typeId: 'Age',
      validator: input =>
        typeof input.value === 'number'
          ? input.value > 4 && input.value < 25
          : typeof input.value === 'undefined',
      sanitizer: input => Math.floor(input.modifiedValue)
    },
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
      typeId: 'File',
      validator: input =>
        typeof input.value === 'undefined' ||
        (Object.hasOwnProperty.call(input.value, 'url') &&
          Object.hasOwnProperty.call(input.value, 'name')),
      objectHasher: file => file.url
    },
    {
      typeId: 'Badge',
      validator: input =>
        typeof input.value === 'undefined' ||
        (Object.hasOwnProperty.call(input.value, 'icon') &&
          Object.hasOwnProperty.call(input.value, 'label')),
      objectHasher: badge => badge.label
    }
  ],
  modelConfiguration: {
    modelId: 'Profile',
    fieldConfigList: [
      {
        fieldId: 'name',
        typeId: 'CleanString'
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
        array: true
      }
    ],
    intentConfigList: [
      {
        intentId: 'Register',
        isCreate: true,
        matchConfig: {
          items: [
            {
              fieldMatch: ['name', 'age', 'email'],
              deltaMatch: {
                modifiedState: {
                  presence: 'required'
                }
              }
            },
            {
              fieldMatch: 'profilePicture',
              deltaMatch: {
                modifiedState: {
                  presence: 'optional'
                }
              }
            },
            {
              fieldMatch: 'badges',
              deltaMatch: {
                modifiedState: {
                  presence: 'forbidden'
                }
              }
            }
          ]
        }
      },
      {
        intentId: 'UpdateBio',
        isCreate: false,
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
        isCreate: false,
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
        isCreate: false,
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
        isCreate: false,
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
          email: 'scooby.doo@mysteries.cnn'
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
        error: {
          code: ErrorCode.InvalidModifiedState,
          message: null,
          info: {
            fieldIds: ['email', 'badgees']
          }
        }
      }
    ]
  ]
};
