import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SpinnerOriginal from 'ink-spinner';
const Spinner = SpinnerOriginal;
import { api } from '../../services/api-service.js';
import { renderADF } from '../utils/adf-render.js';
export default function IssueDetail({ issueKey, onBack }) {
    const [loading, setLoading] = useState(true);
    const [issue, setIssue] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetchIssue = async () => {
            try {
                const results = await api.get(`/issue/${issueKey}`);
                setIssue(results);
                setLoading(false);
            }
            catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };
        fetchIssue();
    }, [issueKey]);
    useInput((input, key) => {
        if (key.escape || input === 'b') {
            onBack();
        }
    });
    if (loading) {
        return (_jsxs(Box, { children: [_jsx(Text, { color: "green", children: _jsx(Spinner, { type: "dots" }) }), _jsxs(Text, { children: [" Loading Issue ", issueKey, "..."] })] }));
    }
    if (error) {
        return _jsxs(Text, { color: "red", children: ["Error: ", error] });
    }
    const { summary, description, status, priority, assignee, reporter, comment } = issue.fields;
    return (_jsxs(Box, { flexDirection: "column", padding: 1, borderStyle: "single", children: [_jsx(Box, { marginBottom: 1, children: _jsxs(Text, { bold: true, color: "cyan", children: [issue.key, ": ", summary] }) }), _jsxs(Box, { flexDirection: "row", marginBottom: 1, children: [_jsxs(Box, { width: "50%", children: [_jsxs(Text, { children: [_jsx(Text, { bold: true, children: "Status:" }), " ", status.name] }), _jsxs(Text, { children: [_jsx(Text, { bold: true, children: "Priority:" }), " ", priority.name] })] }), _jsxs(Box, { width: "50%", children: [_jsxs(Text, { children: [_jsx(Text, { bold: true, children: "Assignee:" }), " ", assignee ? assignee.displayName : 'Unassigned'] }), _jsxs(Text, { children: [_jsx(Text, { bold: true, children: "Reporter:" }), " ", reporter ? reporter.displayName : 'Unknown'] })] })] }), _jsxs(Box, { marginBottom: 1, children: [_jsx(Text, { bold: true, underline: true, children: "Description:" }), _jsx(Text, { children: renderADF(description) || 'No description provided.' })] }), comment && comment.comments && comment.comments.length > 0 && (_jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsxs(Text, { bold: true, underline: true, children: ["Comments (", comment.total, "):"] }), comment.comments.slice(-3).map((c) => (_jsxs(Box, { borderStyle: "round", borderColor: "gray", padding: 1, marginTop: 1, children: [_jsxs(Text, { bold: true, color: "blue", children: [c.author.displayName, ":"] }), _jsx(Text, { children: renderADF(c.body) })] }, c.id)))] })), _jsx(Box, { marginTop: 1, children: _jsxs(Text, { color: "gray", children: ["Press ", _jsx(Text, { bold: true, children: "Esc" }), " or ", _jsx(Text, { bold: true, children: "b" }), " to go back."] }) })] }));
}
//# sourceMappingURL=IssueDetail.js.map