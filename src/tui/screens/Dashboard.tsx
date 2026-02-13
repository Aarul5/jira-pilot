import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import SpinnerOriginal from 'ink-spinner';
const Spinner = SpinnerOriginal as any;
import { api } from '../../services/api-service.js';

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [issueCount, setIssueCount] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch issue count (maxResults must be >= 1)
                const searchResults = await api.search(
                    `assignee = currentUser() AND resolution = Unresolved`,
                    0,
                    1
                );
                const myself = await api.get('/myself');

                setUser(myself);
                setIssueCount(searchResults.total);
                setLoading(false);
            } catch (err: any) {
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
        return (
            <Box>
                <Text color="green"><Spinner type="dots" /></Text>
                <Text> Loading Dashboard...</Text>
            </Box>
        );
    }

    if (error) {
        return (
            <Box flexDirection="column" borderColor="red" borderStyle="round" padding={1}>
                <Text color="red" bold>Error Loading Dashboard:</Text>
                <Text color="red">{error}</Text>
                <Box marginTop={1}>
                    <Text color="gray">
                        Tip: Check your internet connection and run `jira config` to verify credentials.
                    </Text>
                </Box>
            </Box>
        );
    }

    return (
        <Box flexDirection="column">
            <Text bold>Welcome back, {user?.displayName}!</Text>
            <Box marginTop={1} borderStyle="single" padding={1} borderColor="yellow">
                <Text>You have <Text bold color="red">{issueCount}</Text> unresolved issues assigned to you.</Text>
            </Box>

            <Box marginTop={1}>
                <Text color="gray">Press ←/→ to navigate. Try the 'Issues' tab to see details.</Text>
            </Box>
        </Box>
    );
}
