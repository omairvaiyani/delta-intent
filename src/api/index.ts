import { ModelId, TypeId, IntentId, FieldId } from '../interfaces/base-types';
import { TypeConfig } from '../interfaces/custom-types';
import { FieldConfig } from '../interfaces/field-config-types';
import { TypeApi } from './type';
import { IntentConfig } from '../interfaces/intent-config-types';
import { FieldApi } from './field';
import { IntentApi } from './intent';
import {
  ValueMatchPresence,
  FieldMatch
} from '../interfaces/match-config-types';
import { MatchApi } from './match';
import { getIntentions } from '../core/get-intentions';
import { ModelConfiguration } from '../core/model-configuration';
import {
  GetIntentionsInput,
  GetIntentionsOptions
} from '../interfaces/get-intentions-types';

class ModelApi {
  private modelId: ModelId;
  private typeConfigList: TypeConfig[];
  private fieldConfigList: FieldConfig[];
  private intentConfigList: IntentConfig[];

  constructor(modelId: ModelId) {
    this.modelId = modelId;
  }
  public types(types: TypeApi[]) {
    if (this.typeConfigList) {
      throw new Error('You have already set the types, add them all at once');
    }
    this.typeConfigList = types.map(type => type.toConfig());
    return this;
  }
  public fields(fields: FieldApi[]) {
    if (this.fieldConfigList) {
      throw new Error('You have already set the fields, add them all at once');
    }
    this.fieldConfigList = fields.map(field => field.toConfig());
    return this;
  }
  public intentions(intentions: IntentApi[]) {
    if (this.intentConfigList) {
      throw new Error(
        'You have already set the intentions, add them all at once'
      );
    }
    this.intentConfigList = intentions.map(intent => intent.toConfig());
    return this;
  }

  public getIntentions(
    input: GetIntentionsInput,
    options?: GetIntentionsOptions
  ) {
    const outcome = getIntentions(this.toConfig(), input, options);
    return {
      ...outcome,
      isIntent(intentId: IntentId): boolean {
        return outcome.intentIds.includes(intentId);
      }
    };
  }

  private toConfig(): ModelConfiguration {
    // TODO, any need to keep ModelConfiguration class over the json?
    return new ModelConfiguration({
      modelId: this.modelId,
      fieldConfigList: this.fieldConfigList,
      typeConfigList: this.typeConfigList,
      intentConfigList: this.intentConfigList
    });
  }
}

const Di = {
  model: (modelId: ModelId) => new ModelApi(modelId),
  type: (typeId: TypeId) => new TypeApi(typeId),
  field: (fieldId: FieldId) => new FieldApi(fieldId),
  intent: (intentId: IntentId) => new IntentApi(intentId),
  match: (fieldId?: FieldId | FieldMatch) => new MatchApi(fieldId),
  Match: {
    AnyField: (fieldIds: FieldId[]) => fieldIds.map(fieldId => [fieldId]),
    Presence: ValueMatchPresence
  }
};

const Course = Di.model('Courrse')
  .types([
    Di.type('TitleString').sanitiser(values => {
      if (typeof values.modifiedValue === 'string') {
        return {
          didSanitise: true,
          sanitisedValue: values.modifiedValue.trim()
        };
      }
    })
  ])
  .fields([
    Di.field('name')
      .type('TitleString')
      .required(),
    Di.field('description'),
    Di.field('isActive'),
    Di.field('isClone'),
    Di.field('creator')
  ])
  .intentions([
    Di.intent('create')
      .create()
      .match([
        Di.match('name').present(),
        Di.match('description').present(Di.Match.Presence.Optional),
        Di.match('isActive').is(false),
        Di.match('isClone').present(false)
      ])
      .exclusive()
      .strict(),
    Di.intent('activateCourse')
      .update()
      .match([
        Di.match('isActive')
          .is(true)
          .from(false)
      ])
  ]);

setTimeout(() => {
  try {
    const { intentIds, isIntent } = Course.getIntentions({
      modifiedState: {
        name: 'SomeName',
        isActive: false
      }
    });

    const didMatchIntent = isIntent('create');
    console.log({ intentIds, didMatchIntent });
  } catch (e) {
    console.error(e);
  }
  try {
    const { intentIds, isIntent } = Course.getIntentions({
      modifiedState: {
        isActive: true
      },
      existingState: {
        name: 'SomeName',
        isActive: false
      }
    });

    const didMatchIntent = isIntent('activateCourse');
   
    console.log(intentIds, didMatchIntent)
  } catch (e) {
    console.error(e);
  }
}, 5000);

export { Di };
