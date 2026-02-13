import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Dashboard from './screens/Dashboard.js';
import IssueList from './screens/IssueList.js';
import BoardList from './screens/BoardList.js';
export default function App() {
    const [view, setView] = useState('dashboard');
    const [activeTab, setActiveTab] = useState(0);
    const tabs = ['dashboard', 'issues', 'boards'];
    useInput((input, key) => {
        if (key.leftArrow) {
            setActiveTab(prev => Math.max(0, prev - 1));
            setView(tabs[Math.max(0, activeTab - 1)]);
        }
        if (key.rightArrow) {
            setActiveTab(prev => Math.min(tabs.length - 1, prev + 1));
            setView(tabs[Math.min(tabs.length - 1, activeTab + 1)]);
        }
        if (input === 'q') {
            process.exit(0);
        }
    });
    return (_jsxs(Box, { flexDirection: "column", height: "100%", children: [_jsxs(Box, { borderStyle: "classic", borderColor: "blue", paddingX: 1, children: [_jsx(Text, { bold: true, color: "blue", children: "Jira Pilot" }), _jsx(Box, { marginLeft: 2, flexDirection: "column", justifyContent: "center", children: _jsxs(Text, { children: ["Use ", _jsx(Text, { color: "green", children: "\u2190/\u2192" }), " to navigate tabs. Press ", _jsx(Text, { color: "red", children: "q" }), " to quit."] }) })] }), _jsx(Box, { paddingX: 1, marginBottom: 1, children: tabs.map((tab, index) => (_jsx(Box, { marginRight: 2, children: _jsx(Text, { color: activeTab === index ? 'green' : 'white', bold: activeTab === index, underline: activeTab === index, children: tab.charAt(0).toUpperCase() + tab.slice(1) }) }, tab))) }), _jsxs(Box, { flexGrow: 1, borderStyle: "round", padding: 1, borderColor: "gray", children: [view === 'dashboard' && _jsx(Dashboard, {}), view === 'issues' && _jsx(IssueList, {}), view === 'boards' && _jsx(BoardList, {})] })] }));
}
//# sourceMappingURL=App.js.map