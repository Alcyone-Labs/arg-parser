import { UI } from "../src";

// Setup
const app = new UI.App();

// Left Pane: A simple list
const list = new UI.List({
    items: [
        { label: "Item 1", value: "1" },
        { label: "Item 2", value: "2" },
        { label: "Item 3", value: "3" },
        { label: "Item 4", value: "4" },
        { label: "Item 5", value: "5" },
    ],
    onSelect: (item) => {
        // Update right pane content
        rightPane.setContent(`Selected: ${item.label}\nValue: ${item.value}\n\nTimestamp: ${new Date().toISOString()}`);
    }
});

// Right Pane: A scrollable area with lots of text
const loreIpsum = `
Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Section 2: The Scroll
---------------------
This text is long enough to trigger a vertical scrollbar if the terminal height is small.
Keep scrolling down to see more content.

1. Line one
2. Line two
3. Line three
4. Line four
5. Line five
6. Line six
7. Line seven
8. Line eight
9. Line nine
10. Line ten

End of text.
`;

const rightPane = new UI.ScrollArea({
    content: "Select an item from the left list to see details here.\n\n" + loreIpsum,
    wrapText: true
});

// Layout
const layout = new UI.SplitLayout({
    direction: "horizontal",
    first: list,
    second: rightPane,
    splitRatio: 0.3,
    gap: 1
});

// Run
console.log("Restoring Simple Split Demo...");
setTimeout(() => {
    app.run(layout);
}, 500);
