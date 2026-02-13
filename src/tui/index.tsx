import React from 'react';
import { render } from 'ink';
import App from './App.js';

export function startTui() {
    console.clear();
    render(<App />);
}
