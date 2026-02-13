
import { api } from '../src/services/api-service.js';

async function main() {
    console.log("Debugging Jira Search API...");

    const payloads = [
        { name: "With StartAt (Legacy)", body: { jql: "assignee = currentUser()", startAt: 0 } },
        { name: "Bounded + No Validation", body: { jql: "assignee = currentUser()", maxResults: 1, fields: ["summary"] } },
        { name: "Minimal", body: { jql: "order by created DESC" } },
        { name: "With MaxResults", body: { jql: "order by created DESC", maxResults: 1 } },
        { name: "With Fields", body: { jql: "order by created DESC", maxResults: 1, fields: ["summary"] } },
        { name: "With ValidateQuery", body: { jql: "order by created DESC", validateQuery: "warn" } },
        { name: "With Validation (Old)", body: { jql: "order by created DESC", validation: "warn" } },
        { name: "Query Key", body: { query: "order by created DESC" } },
    ];

    for (const p of payloads) {
        console.log(`\nTesting: ${p.name}`);
        try {
            const res = await api.post('/search/jql', p.body);
            console.log(`✅ Success! Keys: ${Object.keys(res).join(', ')}`);
        } catch (e: any) {
            const msg = e.response?.data ? JSON.stringify(e.response.data) : e.message;
            console.log(`❌ Failed: ${msg}`);
            if (e.response?.status) console.log(`   Status: ${e.response.status}`);
        }
    }

    console.log(`\nTesting: api.search wrapper`);
    try {
        const res = await api.search("assignee = currentUser()", 0, 1);
        console.log(`✅ Success! Total: ${res.total}`);
    } catch (e: any) {
        const msg = e.response?.data ? JSON.stringify(e.response.data) : e.message;
        console.log(`❌ Failed: ${msg}`);
    }
}

main();
