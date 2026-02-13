import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SpinnerOriginal from 'ink-spinner';
const Spinner = SpinnerOriginal;
import { api } from '../../services/api-service.js';
import KanbanBoard from './KanbanBoard.js';
export default function BoardList() {
    const [loading, setLoading] = useState(true);
    const [boards, setBoards] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedBoardId, setSelectedBoardId] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetchBoards = async () => {
            try {
                const results = await api.agileGet('/board');
                setBoards(results.values);
                setLoading(false);
            }
            catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };
        fetchBoards();
    }, []);
    useInput((input, key) => {
        if (selectedBoardId)
            return;
        if (key.upArrow) {
            setSelectedIndex((prev) => Math.max(0, prev - 1));
        }
        if (key.downArrow) {
            setSelectedIndex((prev) => Math.min(boards.length - 1, prev + 1));
        }
        if (key.return) {
            if (boards[selectedIndex]) {
                setSelectedBoardId(boards[selectedIndex].id);
            }
        }
    });
    if (selectedBoardId) {
        return _jsx(KanbanBoard, { boardId: selectedBoardId, onBack: () => setSelectedBoardId(null) });
    }
    if (loading) {
        return (_jsxs(Box, { children: [_jsx(Text, { color: "green", children: _jsx(Spinner, { type: "dots" }) }), _jsx(Text, { children: " Loading Boards..." })] }));
    }
    if (error) {
        return _jsxs(Text, { color: "red", children: ["Error: ", error] });
    }
    if (boards.length === 0) {
        return _jsx(Text, { children: "No boards found." });
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
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Box, { marginBottom: 1, children: _jsxs(Text, { bold: true, underline: true, children: ["Select a Board (", selectedIndex + 1, "/", boards.length, ")"] }) }), visibleBoards.map((board, index) => {
                const globalIndex = start + index;
                const isSelected = globalIndex === selectedIndex;
                return (_jsxs(Box, { children: [_jsx(Text, { color: isSelected ? 'green' : 'white', bold: isSelected, children: isSelected ? '> ' : '  ' }), _jsxs(Text, { color: isSelected ? 'green' : 'white', children: [board.name, " (", board.type, ")"] })] }, board.id));
            })] }));
}
//# sourceMappingURL=BoardList.js.map