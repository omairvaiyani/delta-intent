import {
  ModelId,
  ModelState,
  IntentId,
  InputValue
} from "../interfaces/base-types";
import { IIntentConfig } from "../interfaces/intent-config-types";
import { IFieldConfig } from "../interfaces/field-config-types";
import { IModelConfig } from "../interfaces/model-config-types";
import { FieldMatch, DeltaMatch } from "../interfaces/match-config-types";
import { DeltaValues } from "../interfaces/delta-types";

class ModelConfiguration implements IModelConfig {
  readonly modelId: ModelId;
  readonly fieldConfigList: IFieldConfig[];
  readonly intentConfigList: IIntentConfig[];

  constructor(modelConfig: IModelConfig) {
    this.modelId = modelConfig.modelId;
    this.fieldConfigList = modelConfig.fieldConfigList;
    this.intentConfigList = modelConfig.intentConfigList;
  }

  public getIntentions(
    input: ModelConfiguration.GetIntentionsInput
  ): ModelConfiguration.GetIntentionsResponse {
    const { existingState, modifiedState } = input;
    const { fieldConfigList, intentConfigList } = this;

    const modifiedFieldsToSanitize = fieldConfigList
      .filter(field => field.sanitizer)
      .filter(this.isFieldModified.bind(this, modifiedState));

    const sanitizedState: ModelState | null = this.getSanitizedInput(
      modifiedFieldsToSanitize,
      modifiedState,
      existingState
    );

    const intentIds = intentConfigList
      .filter(intentConfig =>
        intentConfig.isCreate ? !existingState : existingState
      )
      .filter(intentConfig =>
        intentConfig.matchConfig.items.every(matchConfigItem => {
          const { fieldMatch, deltaMatch } = matchConfigItem;
          const matchedFieldConfigList = this.matchFieldsToConfigList(
            fieldMatch,
            fieldConfigList
          );
          return matchedFieldConfigList.every(fieldConfig =>
            this.performDeltaCheck(fieldConfig, deltaMatch, {
              existingValue: existingState[fieldConfig.fieldId],
              modifiedValue:
                (sanitizedState && sanitizedState[fieldConfig.fieldId]) ||
                modifiedState[fieldConfig.fieldId]
            })
          );
        })
      )
      .map(intentConfig => intentConfig.intentId);
    return {
      intentIds
    };
  }

  private isFieldModified(
    modifiedState: ModelState,
    field: IFieldConfig
  ): boolean {
    return Object.prototype.hasOwnProperty.call(modifiedState, field.fieldId);
  }

  private getSanitizedInput(
    fields: IFieldConfig[],
    modifiedState: ModelState,
    existingState: ModelState
  ): ModelState | null {
    const sanitizedState: ModelState = {};
    let didSanitizeAny: boolean;
    fields.forEach(field => {
      if (field.sanitizer) {
        const fieldKey = field.fieldId;
        const deltaValues: DeltaValues = {
          modifiedValue: modifiedState[fieldKey]
        };
        if (existingState) {
          deltaValues.existingValue = modifiedState[field.fieldId];
        }
        const { didSanitize, sanitizedValue } = field.sanitizer(deltaValues);
        if (didSanitize) {
          sanitizedState[field.fieldId] = sanitizedValue;
          didSanitizeAny = true;
        }
      }
    });
    return didSanitizeAny ? sanitizedState : null;
  }

  private matchFieldsToConfigList(
    fieldMatch: FieldMatch,
    fieldConfigList: IFieldConfig[]
  ): IFieldConfig[] {
    let matchedFieldConfigList: IFieldConfig[];
    if (Array.isArray(fieldMatch)) {
      matchedFieldConfigList = fieldMatch.map(fieldKey =>
        fieldConfigList.find(fieldConfig => fieldConfig.fieldId === fieldKey)
      );
    } else {
      matchedFieldConfigList = [
        fieldConfigList.find(fieldConfig => fieldConfig.fieldId === fieldMatch)
      ];
    }
    return matchedFieldConfigList;
  }

  private performDeltaCheck(
    fieldConfig: IFieldConfig,
    deltaMatch: DeltaMatch,
    deltaValues: DeltaValues
  ): boolean {
    const { delta, existingState, modifiedState } = deltaMatch;
    const { existingValue, modifiedValue } = deltaValues;
    const { type } = fieldConfig;
    if (delta) {
      if (typeof delta === "function") {
        const didChange = delta(deltaValues);
        if (typeof didChange !== "boolean") {
          throw new Error("delta function should return a boolean");
        }
        return didChange;
      } else {
        switch (type) {
          case "string":
          case "number":
          case "boolean": {
            return existingValue !== modifiedValue;
          }
          case "date": {
            return existingValue instanceof Date;
          }
        }
      }
    }
  }
}

namespace ModelConfiguration {
  export interface GetIntentionsInput {
    modifiedState: ModelState;
    existingState?: ModelState;
  }
  export interface GetIntentionsResponse {
    intentIds: IntentId[];
    sanitisations?: Record<string, InputValue>;
  }
}

export { ModelConfiguration };
