# Delta Intent

A strongly-typed framework and mental-model for APIs to assure a given change (_delta_) will result in acceptable outcome state (_intent_). In all, this framework enforces solid organisation, input sanitisation, validation and intent handling on model write (create/update) operations.

## Why

If the job of a back-end layer can be described in one line, it is to enforce business policies on all incoming and outgoing data. Enforcing these policies is tough and consists of many individual, and often co-mingled tasks: data sanitisation, validation, determining the changes, handling any side-effects, and finally, persisting the changes.  Of these tasks, what's often under-looked is the act of determining the changes received to create or update a record. This can sometimes be as simple as changing a user's name, but is often much more complex and requires very specific changes across a number of fields to fall into a certain expected state.

Many developers opt for the [`RPC`]([https://www.geeksforgeeks.org/remote-procedure-call-rpc-in-operating-system/) pattern to group complex changes into pre-defined available actions. If your entire back-end is constructed this way - I suggest you give delta-intent a pass. If however, you have a mixture of simple `CrUd` operations mixed with `RPC`s, or have noticed the struggles of maintaining complex actions in any of your domain models - at the very least, you will find some useful insights from this library.

## Quick jump

- [Getting Started](#getting-started)
- [Guide](#guide)
- - [Model](#model)
- - [Field](#field)
- - [Type](#type)
- - [Intent](#intent)
- - - [Match](#match)
-  - - [State](#state)
- - - [getIntentions](#get-intentions)
- - [Error handling](#error-handling)

## Advanced concepts
- [Sanitisation](#sanitisation)
- [Validation](#validation)
- [Object hashing](#object-hashing)
- [Advanced matching](#advanced-matching)
- [Type-safety](#type-safety)

## Getting Started

### Install
This is a run-time library, so make sure you save it in your non-development dependencies:

```
yarn add delta-intent
```
or
```
npm install delta-intent
```

### Basic usage example

View the following snippet as a pseudo-code overview of how delta-intent should be used. You'll understand the individual elements by reading the later section.

```typescript
// the file in which your handle create/update operations for your model(s)
import { Di } from 'delta-intent' 
import { ProfileConfig } from 'path-to-your-model-config';

export const handleProfileSave = function(profile, changes) {
	const { isIntent } = ProfileConfig.getIntentions({
		existingState: profile,
		modifiedState: changes
	});
	
	if(isIntent('register')) {
		// run your registration logic
	}
	if(isIntent('updateEmail')) {
		// run your update email logic
	}
	if(isIntent('upgrade')) {
		// run your upgrade logic
  }
  if(isIntent('updateBasicInfo')) {
		// run your upgrade logic
	}
};

// path-to-your-model-config.ts
export const ProfileConfig = Di.model('Profile')
	.types([
		Di.type('Email').validator(emailValidatorFunc)
	])
    .fields([
		Di.field('name').required(),
		Di.field('email').type('Email').immutable(),
		Di.field('bio'),
		Di.field('isPremiumUser')
	])
	.intentions([
		Di.intent('register').create().match([
			Di.match('name').present(),
			Di.match('email').present(),
			Di.match('bio')
			.present(Di.Match.Presence.Optional),
			Di.match('isPremiumUser').present(false)
		]),
		Di.intent('upgrade').update().match([
			Di.match('isPremiumUser').is(true).from(false)
		]),
		Di.intent('changeEmail').update().match([
			Di.match('email').changed()
		]),
		Di.intent('updateBasicInfo').update().match([
			Di.match(['name', 'bio']).changed()
		])
	]);

```

### Guide

The basic premise of delta-intent is to define _what_ changes can be made to a particular model _before_ it is saved to your database. Therefore, you'll likely invoke this library from within your route middlewares for `create` and `update` operations. There are a number of concepts to understand before you have a complete picture.

#### Preamble
Pretty much all applications have a _model_ to describe and store _domain_ objects. This _model_ is likely described in your database _schema_ as having a number of _fields_ of certain _types_. Depending on your database, the schema can provide an excellent layer of protection for data integrity. But the schema alone is rarely sufficient; complex business concerns where input must be validated against existing data, across multiple collections within the same database, or against external states across other data sources necessitates an _application_ layer to sit between your data, and your data _consumer_.  

This application layer is more commonly known as the _back-end_, which, in the javascript world is usually built on an express server on node.js. Here, developers can expose routes as endpoints to receive create and update requests for each of their _domain_ models. This layer is where business concerns that are too complex to enforce by schema alone take home. It is here where delta-intent enters the scene.

#### Model
You must define one `Di.model` for your domain model. This is also your entry point into delta-intent's API. 

For the domain model `User`:
```typescript
const UserConfiguration = Di.model('User');
```

We use a chaining-pattern to configure this model object:

```typescript
const UserConfiguration = Di.model('User')
	.types(/* model's Di types */)
	.fields(/* model's Di fields */)
	.intentions(/* model's Di intents */)
```

The model configuration object also exposes the execution method `getIntentions`, which is described in detail [here](#get-intentions).

```typescript
// `outcome` object is described later
const outcome = UserConfiguration.getIntentions({ 
	modifiedState: { email: "o.vaiyani@domain.ac" }, 
	existingState: { name: "Omair Vaiyani", email: "omair@domain.com" }
});
```

#### Field
Just as you define the fields that make up a model in your database, define these fields in your `Di.model`'s `fields` configuration:

```typescript
const UserConfiguration = Di.model('User')
	.fields([
		Di.field('name'),
		Di.field('email'),
		Di.field('bio'),
		Di.field('isEmailVerified')
	])
```

You must list *all* fields that delta-intent will come across when executed for a given model. This `Di.field` takes a `fieldId` as the only parameter and _must_ be unique within a given model. This `fieldId` must also match _exactly_ the property key (column name) when objects are passed through to delta-intent. 

You can further configure fields in a number of ways:

```typescript
// invalid if missing on create operations
Di.field('name').required()

// invalid if present on update operations
Di.field('name').immutable()

// if this property is modified, this method will be invoked
// to let you manually verify if the field value change is allowed
Di.field('name').validator(someValidatorFunc)

// if this property is modified, this method will be invoked
// to let you clean or modify its value prior to delta inspection
Di.field('name').sanitiser(someSanitiserFunc)

// if you have multiple fields that require the same
// validators/sanitisers, you can define a `Type` (described
// in a separate section) and enter the `typeId` here
Di.field('email').type('Email')

// if the field stores array values, define this
// to trigger smarter delta inspection; particularly
// important when combined with `type`
Di.field('name').array()

// diff checking between the existing and modified state
// is done using shallow value or referential checking;
// for complex objects, use this option to manually return
// the defining value, such as the nestedObject.id
Di.field('name').hasher(someHasherFunc)
```

#### Type
There are many occasions where two or more fields, even across multiple domain models, require the input sanitisation or validation. To avoid breaking the DRY principle, define a `Di.type` and make it available to the `Di.model`:

```typescript
Di.model('user').types([
	Di.type('Email').validator(emailValidatorFun)
]).fields([
	Di.field('email').type('Email'),
	Di.field('backupEmail').type('Email'),
	Di.field('name').validator(nameValidatorFunc),
]);
```

To re-use a type across multiple models, simple store the `Di.type` in a central location:

```typescript
const EMAIL_TYPE = 'Email'
const emailType = Di.type(EMAIL_TYPE).validator(emailValidatorFun);

Di.model('user').types([emailType]).fields([
	Di.field('email').type(EMAIL_TYPE)
]);

Di.model('card').types([emailType]).fields([
	Di.field('billingEmail').type(EMAIL_TYPE)
]);
```

#### Intent

Once you have defined the fields that describe your model, it's time to think about what _can_ be done to the model. At this point, you may need to adopt a more disciplined and explicit approach to state management. Let's take the `User` model again - start by listing what kind of requests the consumer of your API may send - here are some common examples:

- Register by email
- Register by Facebook
- Change name, profile picture or bio
- Validate email address
- Upgrade an account

At first, you do not have to be exhaustive, start by listing out a few, and add to it later once you've understood this concept by reading the rest of this section and building your own `Di.model`.

Before we begin adding the above-mentioned items to the `User` model _intents_, we need to understand a new concept: *match*.

##### Match
Each of your potential changes (_intents_) have to be described using the `Di.match` API. This matching occurs when a change is requested and `Di.model#getIntentions` is invoked with the modifications, therefore, it is those modifications that must _match_ for the _intent_ to be ascertained:

```typescript
Di.model('user').types(...types).fields(...fields).intentions([
	Di.intent('registerByEmail')
		.create()
		.match([
			// 'name' is present
			Di.match('name').present(),
			// 'email' is present
			Di.match('email').present(),
			// 'bio' can be present
			Di.match('bio').present(Di.Match.Presence.Optional),
			// 'facebookToken' should not be present
			Di.match('facebookToken').present(false)
	]),
	Di.intent('registerByFacebook')
		.create()
		.match([
			// 'name' is present
			Di.match('name').present(),
			// 'facebookToken' is present
			Di.match('facebookToken').present(),
			// 'bio' can be present
			Di.match('bio').present(Di.Match.Presence.Optional),
			// 'email' should not be present
			Di.match('email').present(false)
	]),
	Di.intent('verifyEmail')
		.update()
		.match([
			// 'isEmailVerified' has now been set to true
			Di.match('isEmailVerified').is(true).from(false)
	])
])
```

##### State

When a request is sent by an API consumer, they will implicitly have an intention to bring about a new state for the object in question; this implicit information is usually the body of a `POST` request. Assuming that only the _changes_ are sent rather than the entire updated state, we can match the model's defined intents against the _changes_ in comparison to the existing state of the object. This change state should be passed into delta-intent as the `modifiedState` along with the `existingState` (if present) - which you'll invoke using `getIntentions`. 

##### getIntentions

This is the primary run-time method which should be called when a create or update operation is received by your application. Assuming you have followed the above guide and created a `Di.model` for your domain object, you can run `getIntentions` in the following ways:

For a `create` operation where no `existingState` is available:
```typescript
const UserConfiguration = Di.model('User').fields(...).intentions(...);

const createUser = function(data) {
	const outcome = UserConfiguration.getIntentions({
		modifiedState: data
	});
}
```

For an `update` operation where you have an `existingState`:
```typescript
const UserConfiguration = Di.model('User').fields(...).intentions(...);

const updateUser = function(user, data) {
	const outcome = UserConfiguration.getIntentions({
	    existingState: user,
		modifiedState: data
	});
}
```

How to use the `outcome` object:
```typescript
enum Intent {
   RegisterByEmail = 'registerByEmail',
   RegisterByFacebook = 'registerByFacebook',
   ChangeEmail = 'changeEmail'
}
const UserConfiguration = Di.model('User').fields(...).intentions([
	Di.intent(Intent.RegisterByEmail).create().match(...)
	Di.intent(Intent.RegisterByFacebook).create().match(...),
	Di.intent(Intent.ChangeEmail).update().match(...)
]);
const updateUser = function(user, data) {
	const { error, intentIds, isIntent } = UserConfiguration.getIntentions({
	    existingState: user,
		modifiedState: data
	});
	if(error) {
		// View the Error handling section to learn more 
		throw Error(error.message);
	}

	// this will print all the matched `intentIds`
	console.log(intentIds);
    
    // use this convenience method to maintain a readable codebase
    if(isIntent(Intent.ChangeEmail)) {
		// for example: send a verification email to the new address
	}
}
```

#### Error handling
[TODO docs]

#### Sanitisation
```typescript
Di.field('foo').sanitise((input) => {
	const { modifiedValue, existingValue } = input;
	if(typeof modifiedValue === 'string') {
		const sanitisedValue = modifiedValue.trim();
		return {
			didSanitise: true,
			sanitisedValue
		}
	} else if (typeof modifiedValue !== 'undefined') {
		return {
			didSanitise: true,
			sanitisedValue: undefined
		}
	} else {
		return {
			didSanitise: false
		}
	}
});
```

#### Validation

```typescript
Di.field('foo').validate((input) => {
	const { modifiedValue, existingValue } = input;
	if(modifiedValue === 'baz' && existingValue === 'bar') {
		// this change is valid
		return true;
	} else {
		// return a message if invalid
		return 'foo cannot be "baz" after being "bar"'
	}
});
```

Validate a field by checking the state of another:
```typescript
Di.field('bio').validate((input) => {
	const { modifiedValue, postState } = input;
	if(modifiedValue && !postState['isEmailVerified']) {
		return 'you cannot set a bio until you have verified your email';
	}
	return true;
});
```

#### Object hashing
[TODO docs]

#### Advanced matching
[TODO docs]

#### Type safety
[TODO docs]

The remaining docs are still pending - in the meantime I recommend checking out the `spec/unit/fixtures/` folder to see example usage.

---
Built at [Synap](https://synap.ac) by [Omair Vaiyani](https://github.com/omairvaiyani)