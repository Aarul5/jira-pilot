import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SpinnerOriginal from 'ink-spinner';
const Spinner = SpinnerOriginal as any;
import { api } from '../../services/api-service.js';
import KanbanBoard from './KanbanBoard.js';

export default function BoardList() {
    const [loading, setLoading] = useState(true);
    const [boards, setBoards] = useState<any[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBoards = async () => {
            try {
                const results = await api.agileGet('/board');
                setBoards(results.values);
                setLoading(false);
            } catch (err: any) {
                setError(err.message);
                setLoading(false);
            }
        };
        fetchBoards();
    }, []);

    useInput((input, key) => {
        if (selectedBoardId) return;

        if (key.upArrow) {
            setSelectedIndex((prev: number) => Math.max(0, prev - 1));
        }
        if (key.downArrow) {
            setSelectedIndex((prev: number) => Math.min(boards.length - 1, prev + 1));
        }
        if (key.return) {
            if (boards[selectedIndex]) {
                setSelectedBoardId(boards[selectedIndex].id);
            }
        }
    });

    if (selectedBoardId) {
        return <KanbanBoard boardId={selectedBoardId} onBack={() => setSelectedBoardId(null)} />;
    }

    if (loading) {
        return (
            <Box>
                <Text color="green"><Spinner type="dots" /></Text>
                <Text> Loading Boards...</Text>
            </Box>
        );
    }

    if (error) {
        return <Text color="red">Error: {error}</Text>;
    }

    if (boards.length === 0) {
        return <Text>No boards found.</Text>;
    }

    const windowSize = 15;
    const halfWindow = Math.floor(windowSize / 2);

    // Ensure the selected item is always visible
    let start = 0;
    if (selectedIndex > halfWindow) {
        start = Math.min(selectedIndex - halfWindow, boards.length - windowSize);
    }
    start = Math.max(0, start);
    const end = Math.min(boards.length, start + windowSize);

    const visibleBoards = boards.slice(start, end);

    return (
        <Box flexDirection="column">
            <Box marginBottom={1}>
                <Text bold underline>Select a Board ({selectedIndex + 1}/{boards.length})</Text>
            </Box>

            {visibleBoards.map((board: any, index: number) => {
                const globalIndex = start + index;
                const isSelected = globalIndex === selectedIndex;

                return (
                    <Box key={board.id}>
                        <Text color={isSelected ? 'green' : 'white'} bold={isSelected}>
                            {isSelected ? '> ' : '  '}
                        </Text>
                        <Text color={isSelected ? 'green' : 'white'}>
                            {board.name} ({board.type})
                        </Text>
                    </Box>
                );
            })}
        </Box>
    );
}
