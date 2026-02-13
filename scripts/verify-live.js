"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var child_process_1 = require("child_process");
var util_1 = require("util");
var chalk_1 = __importDefault(require("chalk"));
var path_1 = __importDefault(require("path"));
var execAsync = (0, util_1.promisify)(child_process_1.exec);
var JIRA_BIN = path_1.default.resolve(__dirname, '../dist/bin/jira.js');
var PROJECT = 'ITP';
var EPIC_ID = '86620'; // ITP-86
var EPIC_KEY = 'ITP-86';
var successCount = 0;
var failCount = 0;
function runCommand(name, args, expectedOutput) {
    return __awaiter(this, void 0, void 0, function () {
        var command, _a, stdout, stderr, output, matched, e_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log(chalk_1.default.blue("\n[TEST] ".concat(name)));
                    command = "node \"".concat(JIRA_BIN, "\" ").concat(args);
                    console.log(chalk_1.default.grey("$ ".concat(command)));
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, execAsync(command)];
                case 2:
                    _a = _b.sent(), stdout = _a.stdout, stderr = _a.stderr;
                    // console.log(stdout); // Uncomment for verbose output
                    if (stderr && !stderr.includes('Updating') && !stderr.includes('Fetching')) {
                        console.warn(chalk_1.default.yellow('stderr:', stderr));
                    }
                    if (expectedOutput) {
                        output = stdout + stderr;
                        matched = typeof expectedOutput === 'string'
                            ? output.includes(expectedOutput)
                            : expectedOutput.test(output);
                        if (!matched) {
                            throw new Error("Expected output to contain: ".concat(expectedOutput, "\nGot: ").concat(output.substring(0, 200), "..."));
                        }
                    }
                    console.log(chalk_1.default.green('✔ PASS'));
                    successCount++;
                    return [2 /*return*/, stdout];
                case 3:
                    e_1 = _b.sent();
                    console.error(chalk_1.default.red('✖ FAIL'));
                    console.error(chalk_1.default.red(e_1.message));
                    failCount++;
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var summary, desc, createOutput, issueKey, match;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log(chalk_1.default.bold('🚀 Starting Real-world Jira CLI Verification'));
                    console.log("Target: Project ".concat(PROJECT, ", Epic ").concat(EPIC_KEY, " (").concat(EPIC_ID, ")\n"));
                    // 1. List Projects
                    return [4 /*yield*/, runCommand('List Projects', "project list", PROJECT)];
                case 1:
                    // 1. List Projects
                    _a.sent();
                    summary = "Auto-test Story ".concat(Date.now());
                    desc = "Created via automated verification script";
                    return [4 /*yield*/, runCommand('Create Story', "issue create -p ".concat(PROJECT, " -t Story -s \"").concat(summary, "\" -d \"").concat(desc, "\" --priority Medium -a me"), /Issue created: (ITP-\d+)/)];
                case 2:
                    createOutput = _a.sent();
                    issueKey = null;
                    if (createOutput) {
                        match = createOutput.match(/Issue created: (ITP-\d+)/);
                        if (match) {
                            issueKey = match[1];
                            console.log(chalk_1.default.cyan("Created Issue: ".concat(issueKey)));
                        }
                    }
                    if (!issueKey) {
                        console.error(chalk_1.default.red('Cannot proceed without a created issue. Aborting dependent tests.'));
                        process.exit(1);
                    }
                    // 3. View Issue
                    return [4 /*yield*/, runCommand('View Issue', "issue view ".concat(issueKey), summary)];
                case 3:
                    // 3. View Issue
                    _a.sent();
                    // 4. Edit Issue
                    return [4 /*yield*/, runCommand('Edit Issue', "issue edit ".concat(issueKey, " -s \"").concat(summary, " (Updated)\""), /updated successfully/)];
                case 4:
                    // 4. Edit Issue
                    _a.sent();
                    // 5. Add Comment
                    return [4 /*yield*/, runCommand('Add Comment', "issue comment ".concat(issueKey, " -m \"Automated verification comment\""), /Comment added/)];
                case 5:
                    // 5. Add Comment
                    _a.sent();
                    // 6. Assign Issue (to Unassigned then back to me)
                    return [4 /*yield*/, runCommand('Unassign', "issue assign ".concat(issueKey, " -a none"), /unassigned successfully/)];
                case 6:
                    // 6. Assign Issue (to Unassigned then back to me)
                    _a.sent();
                    return [4 /*yield*/, runCommand('Assign Me', "issue assign ".concat(issueKey, " -a me"), /assigned successfully/)];
                case 7:
                    _a.sent();
                    // 7. Create Subtask
                    // Note: We use the issue ID if possible, but the CLI takes Parent Key and looks up ID internally now
                    return [4 /*yield*/, runCommand('Create Subtask', "issue subtask ".concat(issueKey, " -s \"Subtask for ").concat(issueKey, "\""), /Subtask created/)];
                case 8:
                    // 7. Create Subtask
                    // Note: We use the issue ID if possible, but the CLI takes Parent Key and looks up ID internally now
                    _a.sent();
                    // 8. Link to Epic
                    // Using 'Relates' or similar type - assuming 'Relates' exists. If not, it might fail.
                    // Jira standard link types: "Relates", "Blocks", "Cloners", "Duplicate"
                    // Let's try to fetch link types first or just guess "Relates".
                    // Or link to Epic? Epics usually use "Epic Link" field, which is handled differently (custom field).
                    // The `issue link` command does "Issue Linking" (issuelink resource).
                    // Check if we can link using generic link
                    // await runCommand('Link to Epic', `issue link ${issueKey} ${EPIC_KEY} -t Relates`, /Linked/); 
                    // Skipping link test to avoid guessing link type names which vary by instance.
                    // 9. Transition (Interactive usually, skipping or need status name)
                    // await runCommand('Transition', `issue transition ${issueKey} -s "In Progress"`, /transitioned/);
                    // 10. Search
                    return [4 /*yield*/, runCommand('Search', "issue search \"Auto-test\" -p ".concat(PROJECT), issueKey)];
                case 9:
                    // 8. Link to Epic
                    // Using 'Relates' or similar type - assuming 'Relates' exists. If not, it might fail.
                    // Jira standard link types: "Relates", "Blocks", "Cloners", "Duplicate"
                    // Let's try to fetch link types first or just guess "Relates".
                    // Or link to Epic? Epics usually use "Epic Link" field, which is handled differently (custom field).
                    // The `issue link` command does "Issue Linking" (issuelink resource).
                    // Check if we can link using generic link
                    // await runCommand('Link to Epic', `issue link ${issueKey} ${EPIC_KEY} -t Relates`, /Linked/); 
                    // Skipping link test to avoid guessing link type names which vary by instance.
                    // 9. Transition (Interactive usually, skipping or need status name)
                    // await runCommand('Transition', `issue transition ${issueKey} -s "In Progress"`, /transitioned/);
                    // 10. Search
                    _a.sent();
                    // Summary
                    console.log(chalk_1.default.bold('\n📊 Verification Summary'));
                    console.log(chalk_1.default.green("Passing: ".concat(successCount)));
                    if (failCount > 0)
                        console.log(chalk_1.default.red("Failing: ".concat(failCount)));
                    else
                        console.log(chalk_1.default.blue('All tests passed! 🌟'));
                    process.exit(failCount > 0 ? 1 : 0);
                    return [2 /*return*/];
            }
        });
    });
}
main();
