import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Dashboard from './screens/Dashboard.js';
import IssueList from './screens/IssueList.js';
import BoardList from './screens/BoardList.js';

type View = 'dashboard' | 'issues' | 'boards';

export default function App() {
    const [view, setView] = useState<View>('dashboard');
    const [activeTab, setActiveTab] = useState(0);
    const tabs: View[] = ['dashboard', 'issues', 'boards'];

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

    return (
        <Box flexDirection="column" height="100%">
            {/* Header */}
            <Box borderStyle="classic" borderColor="blue" paddingX={1}>
                <Text bold color="blue">Jira Pilot</Text>
                <Box marginLeft={2} flexDirection="column" justifyContent="center">
                    <Text>Use <Text color="green">←/→</Text> to navigate tabs. Press <Text color="red">q</Text> to quit.</Text>
                </Box>
            </Box>

            {/* Tabs */}
            <Box paddingX={1} marginBottom={1}>
                {tabs.map((tab, index) => (
                    <Box key={tab} marginRight={2}>
                        <Text
                            color={activeTab === index ? 'green' : 'white'}
                            bold={activeTab === index}
                            underline={activeTab === index}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </Box>
                ))}
            </Box>

            {/* Content Area */}
            <Box flexGrow={1} borderStyle="round" padding={1} borderColor="gray">
                {view === 'dashboard' && <Dashboard />}
                {view === 'issues' && <IssueList />}
                {view === 'boards' && <BoardList />}
            </Box>
        </Box>
    );
}
