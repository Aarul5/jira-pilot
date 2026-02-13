import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SpinnerOriginal from 'ink-spinner';
const Spinner = SpinnerOriginal as any;
import { api } from '../../services/api-service.js';
import IssueDetail from './IssueDetail.js';

export default function IssueList() {
    const [loading, setLoading] = useState(true);
    const [issues, setIssues] = useState<any[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedIssueKey, setSelectedIssueKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchIssues = async () => {
            try {
                // Default search: Assigned to me or reported by me, unresolved
                const results = await api.search('assignee = currentUser() OR reporter = currentUser() AND resolution = Unresolved order by updated DESC', 0, 20);
                setIssues(results.issues);
                setLoading(false);
            } catch (err: any) {
                setError(err.message);
                setLoading(false);
            }
        };
        fetchIssues();
    }, []);

    useInput((input, key) => {
        if (selectedIssueKey) return; // Let Detail view handle input if active

        if (key.upArrow) {
            setSelectedIndex((prev: number) => Math.max(0, prev - 1));
        }
        if (key.downArrow) {
            setSelectedIndex((prev: number) => Math.min(issues.length - 1, prev + 1));
        }
        if (key.return) {
            if (issues[selectedIndex]) {
                setSelectedIssueKey(issues[selectedIndex].key);
            }
        }
    });

    if (selectedIssueKey) {
        return <IssueDetail issueKey={selectedIssueKey} onBack={() => setSelectedIssueKey(null)} />;
    }

    if (loading) {
        return (
            <Box>
                <Text color="green"><Spinner type="dots" /></Text>
                <Text> Loading Issues...</Text>
            </Box>
        );
    }
    // ... rest of the file ...

    if (error) {
        return <Text color="red">Error: {error}</Text>;
    }

    if (issues.length === 0) {
        return <Text>No issues found.</Text>;
    }

    // Pagination/Windowing logic could go here, for now just slice a window around selected
    const windowSize = 10;
    const start = Math.max(0, selectedIndex - Math.floor(windowSize / 2));
    const end = Math.min(issues.length, start + windowSize);
    const visibleIssues = issues.slice(start, end);

    return (
        <Box flexDirection="column">
            <Box marginBottom={1}>
                <Text bold underline>Issue Navigator ({issues.length})</Text>
            </Box>

            {visibleIssues.map((issue: any, index: number) => {
                const globalIndex = start + index;
                const isSelected = globalIndex === selectedIndex;
                const key = issue.key;
                const summary = issue.fields.summary;
                const status = issue.fields.status.name;
                const priority = issue.fields.priority.name;

                return (
                    <Box key={issue.id}>
                        <Text color={isSelected ? 'green' : 'white'} bold={isSelected}>
                            {isSelected ? '> ' : '  '}
                        </Text>
                        <Box width={12}>
                            <Text color="cyan">{key}</Text>
                        </Box>
                        <Box width={12}>
                            <Text color="yellow">{status}</Text>
                        </Box>
                        <Box width={10}>
                            <Text color="magenta">{priority}</Text>
                        </Box>
                        <Box flexGrow={1}>
                            <Text wrap="truncate-end">{summary}</Text>
                        </Box>
                    </Box>
                );
            })}

            <Box marginTop={1} borderStyle="single" borderColor="gray">
                <Text color="gray">
                    Selected: {issues[selectedIndex]?.key} - {issues[selectedIndex]?.fields?.summary}
                </Text>
            </Box>
        </Box>
    );
}
