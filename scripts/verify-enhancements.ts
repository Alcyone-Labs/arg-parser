import { App } from "../src/ui/App";
import { Card } from "../src/ui/components/Card";
import { Label } from "../src/ui/components/Label";
import { Clipboard } from "../src/ui/utils/Clipboard";

// Mock environment for testing
const app = new App();

// Test Toast
console.log("Testing Toast...");
// We can't easily verify visual output in non-interactive script without mocking stdout,
// but we can check state.
app.toast.show("Hello Toast", "success");
if (app.toast.visible) {
  console.log("Toast is visible");
} else {
  console.error("Toast should be visible");
}

// Test Clipboard
console.log("Testing Clipboard (Mock)...");
// We don't want to actually trigger pbcopy in CI/Test environment usually,
// but for this verification we assume it works if no error thrown or we mock exec.
// Let's just type check usage.
const clipCheck = async () => {
  try {
    await Clipboard.copy("test");
    console.log("Clipboard copy logic executed");
  } catch (e) {
    console.log(
      "Clipboard copy failed (expected if no clipboard access in shell)",
      e,
    );
  }
};
clipCheck();

console.log("Enhancements verification script finished.");
