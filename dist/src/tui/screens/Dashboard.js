import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import SpinnerOriginal from 'ink-spinner';
const Spinner = SpinnerOriginal;
import { api } from '../../services/api-service.js';
export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [issueCount, setIssueCount] = useState(0);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch issue count (maxResults must be >= 1)
                const searchResults = await api.search(`assignee = currentUser() AND resolution = Unresolved`, 0, 1);
                const myself = await api.get('/myself');
                setUser(myself);
                setIssueCount(searchResults.total);
                setLoading(false);
            }
            catch (err) {
                // detailed error inspection
                const msg = err.response
                    ? `API Error ${err.response.status}: ${JSON.stringify(err.response.data)}`
                    : err.message || JSON.stringify(err);
                setError(msg);
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    if (loading) {
        return (_jsxs(Box, { children: [_jsx(Text, { color: "green", children: _jsx(Spinner, { type: "dots" }) }), _jsx(Text, { children: " Loading Dashboard..." })] }));
    }
    if (error) {
        return (_jsxs(Box, { flexDirection: "column", borderColor: "red", borderStyle: "round", padding: 1, children: [_jsx(Text, { color: "red", bold: true, children: "Error Loading Dashboard:" }), _jsx(Text, { color: "red", children: error }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { color: "gray", children: "Tip: Check your internet connection and run `jira config` to verify credentials." }) })] }));
    }
    return (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { bold: true, children: ["Welcome back, ", user?.displayName, "!"] }), _jsx(Box, { marginTop: 1, borderStyle: "single", padding: 1, borderColor: "yellow", children: _jsxs(Text, { children: ["You have ", _jsx(Text, { bold: true, color: "red", children: issueCount }), " unresolved issues assigned to you."] }) }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { color: "gray", children: "Press \u2190/\u2192 to navigate. Try the 'Issues' tab to see details." }) })] }));
}
//# sourceMappingURL=Dashboard.js.map