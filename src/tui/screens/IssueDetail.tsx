import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SpinnerOriginal from 'ink-spinner';
const Spinner = SpinnerOriginal as any;
import { api } from '../../services/api-service.js';
import { renderADF } from '../utils/adf-render.js';

interface IssueDetailProps {
    issueKey: string;
    onBack: () => void;
}

export default function IssueDetail({ issueKey, onBack }: IssueDetailProps) {
    const [loading, setLoading] = useState(true);
    const [issue, setIssue] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchIssue = async () => {
            try {
                const results = await api.get(`/issue/${issueKey}`);
                setIssue(results);
                setLoading(false);
            } catch (err: any) {
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
        return (
            <Box>
                <Text color="green"><Spinner type="dots" /></Text>
                <Text> Loading Issue {issueKey}...</Text>
            </Box>
        );
    }

    if (error) {
        return <Text color="red">Error: {error}</Text>;
    }

    const { summary, description, status, priority, assignee, reporter, comment } = issue.fields;

    return (
        <Box flexDirection="column" padding={1} borderStyle="single">
            <Box marginBottom={1}>
                <Text bold color="cyan">{issue.key}: {summary}</Text>
            </Box>

            <Box flexDirection="row" marginBottom={1}>
                <Box width="50%">
                    <Text><Text bold>Status:</Text> {status.name}</Text>
                    <Text><Text bold>Priority:</Text> {priority.name}</Text>
                </Box>
                <Box width="50%">
                    <Text><Text bold>Assignee:</Text> {assignee ? assignee.displayName : 'Unassigned'}</Text>
                    <Text><Text bold>Reporter:</Text> {reporter ? reporter.displayName : 'Unknown'}</Text>
                </Box>
            </Box>


            <Box marginBottom={1}>
                <Text bold underline>Description:</Text>
                <Text>{renderADF(description) || 'No description provided.'}</Text>
            </Box>

            {comment && comment.comments && comment.comments.length > 0 && (
                <Box flexDirection="column" marginTop={1}>
                    <Text bold underline>Comments ({comment.total}):</Text>
                    {comment.comments.slice(-3).map((c: any) => (
                        <Box key={c.id} borderStyle="round" borderColor="gray" padding={1} marginTop={1}>
                            <Text bold color="blue">{c.author.displayName}:</Text>
                            <Text>{renderADF(c.body)}</Text>
                        </Box>
                    ))}
                </Box>
            )}

            <Box marginTop={1}>
                <Text color="gray">Press <Text bold>Esc</Text> or <Text bold>b</Text> to go back.</Text>
            </Box>
        </Box>
    );
}
