// Allowed status transitions. Anything not listed is rejected.
export const TRANSITIONS = {
  "New": ["In Progress"],
  "In Progress": ["Resolved"],
  "Resolved": ["In Progress"], // reopen allowed
};

export function canTransition(from, to) {
  return TRANSITIONS[from]?.includes(to) ?? false;
}