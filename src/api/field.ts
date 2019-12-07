import { Validator } from '../interfaces/validator-types';
import { Sanitiser } from '../interfaces/sanitiser-types';
import { ObjectHasher } from '../interfaces/hasher-types';
import { TypeConfig } from '../interfaces/custom-types';
import { TypeId, FieldId } from '../interfaces/base-types';

export class FieldApi {
  private fieldId: FieldId;
  private typeId?: TypeId;
  private _validators?: Validator[];
  private _sanitiser?: Sanitiser;
  private _hasher?: ObjectHasher;

  constructor(fieldId: FieldId) {
    this.fieldId = fieldId;
  }

  public validator(validator: Validator): TypeApi {
    if (!this._validators) {
      this._validators = [];
    }
    this._validators.push(validator);
    return this;
  }
  public sanitiser(sanitiser: Sanitiser): TypeApi {
    if (this._sanitiser) {
      throw new Error('You cannot set more than one sanitiser per Type');
    }
    this._sanitiser = sanitiser;
    return this;
  }
  public hasher(hasher: ObjectHasher): TypeApi {
    if (this.hasher) {
      throw new Error('You cannot set more than one hasher per Type');
    }
    this._hasher = hasher;
    return this;
  }

  public toConfig(): TypeConfig {
    const typeConfig: TypeConfig = {
      typeId: this.typeId
    };
    const { _validators, _sanitiser, _hasher } = this;
    if (_validators) {
      typeConfig.validator =
        _validators.length === 1 ? _validators[0] : _validators;
    }
    if (_sanitiser) {
      typeConfig.sanitiser = _sanitiser;
    }
    if (_hasher) {
      typeConfig.objectHasher = _hasher;
    }

    return typeConfig;
  }
}
