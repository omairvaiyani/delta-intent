import { Validator } from '../interfaces/validator-types';
import { Sanitiser } from '../interfaces/sanitiser-types';
import { ObjectHasher } from '../interfaces/hasher-types';
import { FieldConfig } from '../interfaces/field-config-types';
import { TypeId, FieldId, InputValue } from '../interfaces/base-types';
import { DeltaIntentError } from '../utils/validator';
import { ErrorCode, ErrorMessage } from '../core/errors';

export class FieldApi<T extends InputValue = InputValue> {
  private _fieldId: FieldId;

  private _typeId?: TypeId;

  private _required?: boolean;

  private _immutable?: boolean;

  private _array?: boolean;

  private _validators?: Validator[];

  private _sanitiser?: Sanitiser;

  private _hasher?: ObjectHasher;

  constructor(fieldId: FieldId) {
    this._fieldId = fieldId;
  }

  public get fieldId() {
    return this._fieldId;
  }

  public type(typeId: TypeId): this {
    if (this._typeId) {
      throw new DeltaIntentError(
        ErrorCode.InvalidArgument,
        ErrorMessage.InvalidArgument(
          'typeId',
          typeId,
          `you cannot set more than one type per Field`
        )
      );
    }
    this._typeId = typeId;
    return this;
  }

  public required(): this {
    this._required = true;
    return this;
  }

  public immutable(): this {
    this._immutable = true;
    return this;
  }

  public array(): this {
    this._array = true;
    return this;
  }

  public validator(validator: Validator<T>): this {
    if (!this._validators) {
      this._validators = [];
    }
    this._validators.push(validator);
    return this;
  }

  public sanitiser(sanitiser: Sanitiser<T>): this {
    if (this._sanitiser) {
      throw new Error('You cannot set more than one sanitiser per Field');
    }
    this._sanitiser = sanitiser;
    return this;
  }

  public hasher(hasher: ObjectHasher<T>): this {
    if (this._hasher) {
      throw new Error('You cannot set more than one hasher per Field');
    }
    this._hasher = hasher;
    return this;
  }

  public toConfig(): FieldConfig {
    const fieldConfig: FieldConfig = {
      fieldId: this._fieldId
    };

    const {
      _typeId,
      _validators,
      _sanitiser,
      _hasher,
      _array,
      _required,
      _immutable
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
    if (typeof _immutable === 'boolean') {
      fieldConfig.isImmutable = _immutable;
    }
    if (typeof _array === 'boolean') {
      fieldConfig.isArray = _array;
    }
    return fieldConfig;
  }
}
