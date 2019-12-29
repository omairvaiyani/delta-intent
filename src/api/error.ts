const IncompatibleConfigError = (a: string, b: string): never => {
  throw new Error(`You cannot set ${a} and ${b}, these are opposing configs`);
};

export { IncompatibleConfigError };
