import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SpinnerOriginal from 'ink-spinner';
const Spinner = SpinnerOriginal as any;
import { api } from '../../services/api-service.js';

interface KanbanBoardProps {
    boardId: string;
    onBack: () => void;
}

export default function KanbanBoard({ boardId, onBack }: KanbanBoardProps) {
    const [loading, setLoading] = useState(true);
    const [columns, setColumns] = useState<any[]>([]);
    const [issues, setIssues] = useState<Record<string, any[]>>({});
    const [activeColumnIndex, setActiveColumnIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);

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
                const issuesByStatus: Record<string, any[]> = {};
                cols.forEach((col: any) => {
                    issuesByStatus[col.name] = [];
                });

                boardIssues.issues.forEach((issue: any) => {
                    const statusName = issue.fields.status.name;
                    // Find which column this status belongs to involves checking config.columnConfig.columns[i].statuses
                    // For now, let's just try to match column name or push to 'Other'
                    let placed = false;
                    for (const col of cols) {
                        // Check if status in column statuses
                        // config.columnConfig.columns structure: { name: 'To Do', statuses: [ { id: '10000', self: '...' } ] }
                        if (col.statuses && col.statuses.some((s: any) => s.id === issue.fields.status.id)) {
                            if (!issuesByStatus[col.name]) issuesByStatus[col.name] = [];
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
            } catch (err: any) {
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
            setActiveColumnIndex((prev: number) => Math.max(0, prev - 1));
        }
        if (key.rightArrow) {
            setActiveColumnIndex((prev: number) => Math.min(columns.length - 1, prev + 1));
        }
    });

    if (loading) {
        return (
            <Box>
                <Text color="green"><Spinner type="dots" /></Text>
                <Text> Loading Board...</Text>
            </Box>
        );
    }

    if (error) {
        return <Text color="red">Error: {error}</Text>;
    }

    return (
        <Box flexDirection="column" height="100%">
            <Box marginBottom={1}>
                <Text>Board View (Use ←/→ to switch columns, Esc to back)</Text>
            </Box>

            <Box flexDirection="row" flexGrow={1}>
                {columns.map((col: any, index: number) => {
                    const isActive = index === activeColumnIndex;
                    const colIssues = issues[col.name] || [];

                    return (
                        <Box
                            key={col.name}
                            flexDirection="column"
                            width={30}
                            borderStyle={isActive ? 'double' : 'single'}
                            borderColor={isActive ? 'green' : 'gray'}
                            marginRight={1}
                            paddingX={1}
                        >
                            <Box marginBottom={1} borderStyle="single" borderBottom={false} borderLeft={false} borderRight={false} borderTop={false}>
                                <Text bold underline color={isActive ? 'green' : 'white'}>{col.name} ({colIssues.length})</Text>
                            </Box>

                            {colIssues.slice(0, 10).map((issue: any) => ( // Limit simplified list
                                <Box key={issue.id} marginBottom={1}>
                                    <Text color="cyan">{issue.key}</Text>
                                    <Text wrap="truncate">{issue.fields.summary}</Text>
                                </Box>
                            ))}
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}
