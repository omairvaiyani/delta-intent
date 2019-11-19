import { IntentConfiguration } from "./apis/intent-configuration";
import { ModelConfiguration } from "./apis/model-configuration";

// TODO is this class necessary, or just use JSON like below
const updateDetails = new IntentConfiguration({
  intentId: "UpdateDetails",
  isCreate: true,
  matchConfig: {
    items: [
      {
        fieldMatch: ["name", "description", "icon"],
        deltaMatch: {
          delta: true
        }
      }
    ]
  }
});

const fooConfig = new ModelConfiguration({
  modelId: "Course",
  fieldConfigList: [
    {
      fieldId: "title",
      type: "string"
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
