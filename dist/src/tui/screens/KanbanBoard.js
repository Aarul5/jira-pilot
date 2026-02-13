import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SpinnerOriginal from 'ink-spinner';
const Spinner = SpinnerOriginal;
import { api } from '../../services/api-service.js';
export default function KanbanBoard({ boardId, onBack }) {
    const [loading, setLoading] = useState(true);
    const [columns, setColumns] = useState([]);
    const [issues, setIssues] = useState({});
    const [activeColumnIndex, setActiveColumnIndex] = useState(0);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetchData = async () => {
            try {
                // parallel fetch
                const [config, boardIssues] = await Promise.all([
                    api.agileGet(`/board/${boardId}/configuration`),
                    api.agileGet(`/board/${boardId}/issue`)
                ]);
                const cols = config.columnConfig.columns;
                setColumns(cols);
                // Group issues by status/column
                // This is simplified mapping logic. Jira statuses map to columns.
                const issuesByStatus = {};
                cols.forEach((col) => {
                    issuesByStatus[col.name] = [];
                });
                boardIssues.issues.forEach((issue) => {
                    const statusName = issue.fields.status.name;
                    // Find which column this status belongs to involves checking config.columnConfig.columns[i].statuses
                    // For now, let's just try to match column name or push to 'Other'
                    let placed = false;
                    for (const col of cols) {
                        // Check if status in column statuses
                        // config.columnConfig.columns structure: { name: 'To Do', statuses: [ { id: '10000', self: '...' } ] }
                        if (col.statuses && col.statuses.some((s) => s.id === issue.fields.status.id)) {
                            if (!issuesByStatus[col.name])
                                issuesByStatus[col.name] = [];
                            issuesByStatus[col.name].push(issue);
                            placed = true;
                            break;
                        }
                    }
                    if (!placed) {
                        // fallback: try direct name match
                        if (issuesByStatus[statusName]) {
                            issuesByStatus[statusName].push(issue);
                        }
                    }
                });
                setIssues(issuesByStatus);
                setLoading(false);
            }
            catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };
        fetchData();
    }, [boardId]);
    useInput((input, key) => {
        if (key.escape || input === 'b') {
            onBack();
        }
        if (key.leftArrow) {
            setActiveColumnIndex((prev) => Math.max(0, prev - 1));
        }
        if (key.rightArrow) {
            setActiveColumnIndex((prev) => Math.min(columns.length - 1, prev + 1));
        }
    });
    if (loading) {
        return (_jsxs(Box, { children: [_jsx(Text, { color: "green", children: _jsx(Spinner, { type: "dots" }) }), _jsx(Text, { children: " Loading Board..." })] }));
    }
    if (error) {
        return _jsxs(Text, { color: "red", children: ["Error: ", error] });
    }
    return (_jsxs(Box, { flexDirection: "column", height: "100%", children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { children: "Board View (Use \u2190/\u2192 to switch columns, Esc to back)" }) }), _jsx(Box, { flexDirection: "row", flexGrow: 1, children: columns.map((col, index) => {
                    const isActive = index === activeColumnIndex;
                    const colIssues = issues[col.name] || [];
                    return (_jsxs(Box, { flexDirection: "column", width: 30, borderStyle: isActive ? 'double' : 'single', borderColor: isActive ? 'green' : 'gray', marginRight: 1, paddingX: 1, children: [_jsx(Box, { marginBottom: 1, borderStyle: "single", borderBottom: false, borderLeft: false, borderRight: false, borderTop: false, children: _jsxs(Text, { bold: true, underline: true, color: isActive ? 'green' : 'white', children: [col.name, " (", colIssues.length, ")"] }) }), colIssues.slice(0, 10).map((issue) => ( // Limit simplified list
                            _jsxs(Box, { marginBottom: 1, children: [_jsx(Text, { color: "cyan", children: issue.key }), _jsx(Text, { wrap: "truncate", children: issue.fields.summary })] }, issue.id)))] }, col.name));
                }) })] }));
}
//# sourceMappingURL=KanbanBoard.js.map