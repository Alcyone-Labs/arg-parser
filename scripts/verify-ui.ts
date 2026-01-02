
import { Label } from "../src/ui/components/Label";
import { Button } from "../src/ui/components/Button";
import { Card } from "../src/ui/components/Card";
import { ThemeManager } from "../src/ui/Theme";

// Mock resize for testing
function mockResize(comp: any, width: number, height: number) {
    comp.resize(0, 0, width, height);
}

console.log("--- Label Verification ---");
const label = new Label({ text: "Hello World", align: "center" });
mockResize(label, 20, 1);
console.log(label.render().join("\n"));

console.log("\n--- Button Verification ---");
const btn = new Button({ label: "Click Me" });
mockResize(btn, 16, 1);
console.log(btn.render().join("\n"));

console.log("\n--- Card Verification ---");
const card = new Card({ title: "My Card", id: "card1" });
mockResize(card, 20, 5);
console.log(card.render().join("\n"));
