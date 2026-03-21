
import { validateAndParse } from './src/ai/client-dispatcher';
import { AIGeneratedMindMapSchema } from './src/ai/mind-map-schema';

async function testSalvage() {
    console.log("--- Testing Salvage Logic ---");

    // Case 1: Root-level categories (The failure mode reported)
    const malformedOutput = {
        topic: "Test Topic",
        shortTitle: "Test",
        icon: "brain",
        categories: [
            {
                name: "Salvaged Category",
                icon: "folder",
                subCategories: [
                    { name: "Item 1", description: "This should be saved.", icon: "circle" }
                ]
            }
        ]
    };

    console.log("\nCase 1: Root-level categories instead of subTopics");
    try {
        const result = validateAndParse(malformedOutput, AIGeneratedMindMapSchema);
        console.log("Result subTopics count:", result.subTopics?.length);
        console.log("First subTopic name:", result.subTopics?.[0]?.name);
        console.log("First category name:", result.subTopics?.[0]?.categories?.[0]?.name);
        
        if (result.subTopics?.[0]?.categories?.[0]?.name === "Salvaged Category") {
            console.log("✅ SUCCESS: Root-level categories salvaged correctly.");
        } else {
            console.log("❌ FAILURE: Categories not found in salvaged output.");
        }
    } catch (e) {
        console.error("❌ FAILURE: Salvage threw an error:", e);
    }

    // Case 2: Incomplete subCategories (Missing required fields)
    const incompleteNodes = {
        topic: "Minimal Topic",
        subTopics: [{
            name: "Subtopic 1",
            categories: [{
                name: "Cat 1",
                subCategories: [
                    { name: "Node without description" }
                ]
            }]
        }]
    };

    console.log("\nCase 2: Nodes missing description and icon");
    try {
        const result = validateAndParse(incompleteNodes, AIGeneratedMindMapSchema);
        const node = result.subTopics[0].categories[0].subCategories[0];
        console.log("Node name:", node.name);
        console.log("Node description:", node.description);
        console.log("Node icon:", node.icon);

        if (node.description && node.icon) {
            console.log("✅ SUCCESS: Missing fields filled by salvage logic.");
        } else {
            console.log("❌ FAILURE: Fields still missing.");
        }
    } catch (e) {
        console.error("❌ FAILURE: Salvage threw an error:", e);
    }
}

testSalvage();
