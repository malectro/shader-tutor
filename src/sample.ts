export const SAMPLE_CODE = `// Welcome to VIM Instructor.
// Use the mouse as you normally would — every click and selection
// will produce a keyboard-command hint in the right panel.
//
// Try: click to move your cursor, double-click a word, drag to select.

function greet(name) {
  const greeting = "Hello, " + name + "!";
  console.log(greeting);
  return greeting;
}

const users = ["Ada", "Grace", "Margaret", "Hedy"];

for (const user of users) {
  greet(user);
}

// Some things to try with the mouse:
//   1. Click in the middle of "Margaret" to move your cursor there
//   2. Double-click "greeting" to select it
//   3. Click-drag across "Hello, " to select part of the string
//   4. Click at end of line, then click at start of next line
`;
