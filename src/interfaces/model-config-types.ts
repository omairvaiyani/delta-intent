import { ModelId } from "./base-types";
import { IFieldConfig } from "./field-config-types";
import { IIntentConfig } from "./intent-config-types";

interface IModelConfig {
  modelId: ModelId;
  fieldConfigList: IFieldConfig[];
  intentConfigList: IIntentConfig[];
}

export { IModelConfig };
