import { ModelConfiguration } from "./apis/model-configuration";
import { DefaultValueType } from "./interfaces/base-types";

const fooConfig = new ModelConfiguration({
  modelId: "Course",
  fieldConfigList: [
    {
      fieldId: "title",
      type: DefaultValueType.String
    }
  ],
  intentConfigList: [
    {
      intentId: "UpdateTitle",
      isCreate: false,
      matchConfig: {
        items: [
          {
            fieldMatch: "title",
            deltaMatch: {
              delta: true
            }
          }
        ]
      }
    }
  ]
});

setTimeout(() => {
  try {
    const outcome = fooConfig.getIntentions({
      modifiedState: {
        title: "Something New"
      },
      existingState: {
        title: "Something Old"
      }
    });

    console.log("outcome", outcome);
  } catch (e) {
    console.error(e);
  }
}, 5000);
