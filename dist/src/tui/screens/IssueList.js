import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SpinnerOriginal from 'ink-spinner';
const Spinner = SpinnerOriginal;
import { api } from '../../services/api-service.js';
import IssueDetail from './IssueDetail.js';
export default function IssueList() {
    const [loading, setLoading] = useState(true);
    const [issues, setIssues] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedIssueKey, setSelectedIssueKey] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetchIssues = async () => {
            try {
                // Default search: Assigned to me or reported by me, unresolved
                const results = await api.search('assignee = currentUser() OR reporter = currentUser() AND resolution = Unresolved order by updated DESC', 0, 20);
                setIssues(results.issues);
                setLoading(false);
            }
            catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };
        fetchIssues();
    }, []);
    useInput((input, key) => {
        if (selectedIssueKey)
            return; // Let Detail view handle input if active
        if (key.upArrow) {
            setSelectedIndex((prev) => Math.max(0, prev - 1));
        }
        if (key.downArrow) {
            setSelectedIndex((prev) => Math.min(issues.length - 1, prev + 1));
        }
        if (key.return) {
            if (issues[selectedIndex]) {
                setSelectedIssueKey(issues[selectedIndex].key);
            }
        }
    });
    if (selectedIssueKey) {
        return _jsx(IssueDetail, { issueKey: selectedIssueKey, onBack: () => setSelectedIssueKey(null) });
    }
    if (loading) {
        return (_jsxs(Box, { children: [_jsx(Text, { color: "green", children: _jsx(Spinner, { type: "dots" }) }), _jsx(Text, { children: " Loading Issues..." })] }));
    }
    // ... rest of the file ...
    if (error) {
        return _jsxs(Text, { color: "red", children: ["Error: ", error] });
    }
    if (issues.length === 0) {
        return _jsx(Text, { children: "No issues found." });
    }
    // Pagination/Windowing logic could go here, for now just slice a window around selected
    const windowSize = 10;
    const start = Math.max(0, selectedIndex - Math.floor(windowSize / 2));
    const end = Math.min(issues.length, start + windowSize);
    const visibleIssues = issues.slice(start, end);
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Box, { marginBottom: 1, children: _jsxs(Text, { bold: true, underline: true, children: ["Issue Navigator (", issues.length, ")"] }) }), visibleIssues.map((issue, index) => {
                const globalIndex = start + index;
                const isSelected = globalIndex === selectedIndex;
                const key = issue.key;
                const summary = issue.fields.summary;
                const status = issue.fields.status.name;
                const priority = issue.fields.priority.name;
                return (_jsxs(Box, { children: [_jsx(Text, { color: isSelected ? 'green' : 'white', bold: isSelected, children: isSelected ? '> ' : '  ' }), _jsx(Box, { width: 12, children: _jsx(Text, { color: "cyan", children: key }) }), _jsx(Box, { width: 12, children: _jsx(Text, { color: "yellow", children: status }) }), _jsx(Box, { width: 10, children: _jsx(Text, { color: "magenta", children: priority }) }), _jsx(Box, { flexGrow: 1, children: _jsx(Text, { wrap: "truncate-end", children: summary }) })] }, issue.id));
            }), _jsx(Box, { marginTop: 1, borderStyle: "single", borderColor: "gray", children: _jsxs(Text, { color: "gray", children: ["Selected: ", issues[selectedIndex]?.key, " - ", issues[selectedIndex]?.fields?.summary] }) })] }));
}
//# sourceMappingURL=IssueList.js.map