import 'joi-extract-type';
import { ModelConfiguration } from './api/model-configuration';
import { DefaultValueType } from './interfaces/base-types';

const fooConfig = new ModelConfiguration({
  modelId: 'Course',
  typeConfigList: [
    {
      typeId: 'ParseObject',
      objectHasher: (obj: any) => obj.id
    }
  ],

  fieldConfigList: [
    {
      fieldId: 'title',
      typeId: DefaultValueType.String
    },
    {
      fieldId: 'author',
      typeId: 'ParseObject'
    },
    {
      fieldId: 'courseItems',
      typeId: 'ParseObject[]',
      objectHasher: (obj: any) => obj.id
    }
  ],
  intentConfigList: [
    {
      intentId: 'AddedCourseItem',
      isCreate: false,
      matchConfig: {
        items: [
          {
            fieldMatch: 'courseItems',
            deltaMatch: {
              deltaCheck: {
                arrayChanges: {
                  added: 2,
                  moved: true
                }
              }
            }
          }
        ]
      }
    }
  ]
});

/* setTimeout(() => {
  try {
    const didUpdateCourseItems = fooConfig.getIntentions({
      modifiedState: {
        title: 'Something new',
        author: {
          id: 1,
          name: 'John'
        },
        courseItems: [
          {
            id: 3,
            title: 'Moved'
          },
          {
            id: 2,
            title: 'Unchanged'
          },
          {
            id: 4,
            title: 'New item'
          },
          {
            id: 6,
            title: 'New item 2'
          }
        ]
      },
      existingState: {
        author: {
          id: 1,
          name: 'Jane'
        },
        title: 'Something old',
        courseItems: [
          {
            id: 1,
            title: 'Removed'
          },
          {
            id: 2,
            title: 'Unchanged'
          },
          {
            id: 3,
            title: 'Moved'
          }
        ]
      }
    });

    console.log(
      JSON.stringify({
        didUpdateCourseItems
      })
    );

    console.log('done');
  } catch (e) {
    console.error(e);
  }
}, 8000); */

export { ModelConfiguration };
