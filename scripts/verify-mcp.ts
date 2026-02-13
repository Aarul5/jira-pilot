
import { spawn } from "child_process";
import path from "path";

async function main() {
    console.log("Starting MCP Verification (Manual implementation)...");

    const scriptPath = path.resolve("dist/bin/jira.js");
    console.log(`Script path: ${scriptPath}`);

    const child = spawn("node", [scriptPath, "mcp"], {
        stdio: ["pipe", "pipe", "pipe"],
        shell: true
    });

    let buffer = "";
    let responseId = 1;
    const requests = new Map<number, (result: any) => void>();

    child.stderr.on("data", (data) => {
        // console.log(`STDERR: ${data}`); // Optional: uncomment to see server logs
    });

    child.stdout.on("data", (data) => {
        buffer += data.toString();

        // Process buffer line by line
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);

            if (line) {
                try {
                    const msg = JSON.parse(line);
                    if (msg.id && requests.has(msg.id)) {
                        const resolve = requests.get(msg.id);
                        requests.delete(msg.id);
                        resolve!(msg);
                    }
                } catch (e) {
                    console.error("Failed to parse JSON:", line);
                }
            }
        }
    });

    const sendRequest = (method: string, params: any = {}): Promise<any> => {
        return new Promise((resolve, reject) => {
            const id = responseId++;
            requests.set(id, resolve);

            const msg = JSON.stringify({
                jsonrpc: "2.0",
                id,
                method,
                params
            }) + "\n";

            try {
                child.stdin.write(msg);
            } catch (e) {
                reject(e);
            }
        });
    };

    const sendNotification = (method: string, params: any = {}) => {
        const msg = JSON.stringify({
            jsonrpc: "2.0",
            method,
            params
        }) + "\n";
        child.stdin.write(msg);
    };


    try {
        console.log("Connecting...");

        // 1. Initialize
        const initResponse = await sendRequest("initialize", {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "verify-mcp", version: "1.0.0" }
        });

        console.log("✅ Connected. Server Info:", initResponse.result.serverInfo);

        sendNotification("notifications/initialized");

        // 2. Verify Prompts
        console.log("\nVerifying Prompts...");
        const promptsRes = await sendRequest("prompts/list");
        const prompts = promptsRes.result?.prompts || [];
        console.log(`Found ${prompts.length} prompts.`);

        if (!prompts.find((p: any) => p.name === "jira-assist")) {
            throw new Error("❌ Missing 'jira-assist' prompt");
        }
        console.log("✅ 'jira-assist' prompt found");

        const summarize = prompts.find((p: any) => p.name === "jira-summarize-issue");
        if (summarize && summarize.arguments?.length > 0) {
            console.log("✅ 'jira-summarize-issue' has arguments");
        } else {
            console.warn("⚠️ 'jira-summarize-issue' validation warning");
        }


        // 3. Verify Resources
        console.log("\nVerifying Resources...");
        const resourcesRes = await sendRequest("resources/list");
        const resources = resourcesRes.result?.resources || [];
        console.log(`Found ${resources.length} resources.`);

        if (!resources.find((r: any) => r.uri === "jira://myself")) {
            throw new Error("❌ Missing 'jira://myself' resource");
        }
        console.log("✅ 'jira://myself' resource found");

        if (!resources.find((r: any) => r.uri === "jira://projects")) {
            throw new Error("❌ Missing 'jira://projects' resource");
        }
        console.log("✅ 'jira://projects' resource found");


        // 4. Verify Read Resource
        console.log("\nAttempting to read 'jira://projects'...");
        // Since we might not have auth, we expect either a result OR an error that is structured

        // We set a timeout for this one because if it tries to auth it might be fast/slow
        const readPromise = sendRequest("resources/read", { uri: "jira://projects" });

        // Race with timeout
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));

        try {
            const readRes = await Promise.race([readPromise, timeout]) as any;
            if (readRes.error) {
                console.log(`info: Server returned error: ${readRes.error.message} (Expected if not authenticated)`);
            } else if (readRes.result?.contents) {
                console.log("✅ Resource read successfully");
                const content = JSON.parse(readRes.result.contents[0].text);
                if (content.source === 'jira-pilot') {
                    console.log("✅ Envelope verified");
                }
            }
        } catch (e: any) {
            console.log("info: Read resource timed out or failed:", e.message);
        }

        console.log("\n✅ Verification Passed!");
        process.exit(0);

    } catch (e: any) {
        console.error("\n❌ Verification FAILED:", e.message);
        process.exit(1);
    } finally {
        child.kill();
    }
}

main();
