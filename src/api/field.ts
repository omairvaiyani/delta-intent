import { Validator } from '../interfaces/validator-types';
import { Sanitiser } from '../interfaces/sanitiser-types';
import { ObjectHasher } from '../interfaces/hasher-types';
import { FieldConfig } from '../interfaces/field-config-types';
import { TypeId, FieldId } from '../interfaces/base-types';

export class FieldApi {
  private fieldId: FieldId;
  private _typeId?: TypeId;
  private _required?: boolean;
  private _array?: boolean;
  private _validators?: Validator[];
  private _sanitiser?: Sanitiser;
  private _hasher?: ObjectHasher;

  constructor(fieldId: FieldId) {
    this.fieldId = fieldId;
  }

  public type(typeId: TypeId): FieldApi {
    if (this._typeId) {
      throw new Error('You cannot set more than one type on a Field');
    }
    this._typeId = typeId;
    return this;
  }

  public required(): FieldApi {
    this._required = true;
    return this;
  }

  public array(): FieldApi {
    this._array = true;
    return this;
  }

  public sanitiser(sanitiser: Sanitiser): FieldApi {
    if (this._sanitiser) {
      throw new Error('You cannot set more than one sanitiser per Field');
    }
    this._sanitiser = sanitiser;
    return this;
  }
  public hasher(hasher: ObjectHasher): FieldApi {
    if (this.hasher) {
      throw new Error('You cannot set more than one hasher per Field');
    }
    this._hasher = hasher;
    return this;
  }

  public toConfig(): FieldConfig {
    const fieldConfig: FieldConfig = {
      fieldId: this.fieldId
    };

    const {
      _typeId,
      _validators,
      _sanitiser,
      _hasher,
      _array,
      _required
    } = this;
    if (_typeId) {
      fieldConfig.typeId = _typeId;
    }
    if (_validators) {
      fieldConfig.validator =
        _validators.length === 1 ? _validators[0] : _validators;
    }
    if (_sanitiser) {
      fieldConfig.sanitiser = _sanitiser;
    }
    if (_hasher) {
      fieldConfig.objectHasher = _hasher;
    }
    if (typeof _required === 'boolean') {
      fieldConfig.isRequired = _required;
    }
    if (typeof _array === 'boolean') {
      fieldConfig.isArray = _array;
    }
    return fieldConfig;
  }
}
