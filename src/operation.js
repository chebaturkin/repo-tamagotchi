export function createOperationGate() {
  let current = 0;
  return {
    start() { current += 1; return current; },
    isCurrent(token) { return token === current; },
    finish(token) { if (token === current) current += 1; },
    cancel() { current += 1; },
  };
}
