# Contributing to Jira Pilot

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to Jira Pilot. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [I Have a Question](#i-have-a-question)
- [I Want To Contribute](#i-want-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
  - [Pull Requests](#pull-requests)
- [Styleguides](#styleguides)
  - [Git Commit Messages](#git-commit-messages)
  - [JavaScript Styleguide](#javascript-styleguide)

## Code of Conduct

This project and everyone participating in it is governed by the [Jira Pilot Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [INSERT EMAIL].

## I Have a Question

> If you want to ask a question, we assume that you have read the available [Documentation](README.md).

Before you ask a question, it is best to search for existing [Issues](https://github.com/yourusername/jira-pilot/issues) that might help you. In case you have found a suitable issue and still need clarification, you can write your question in this issue. It is also advisable to search the internet for answers first.

If you then still feel the need to ask a question and need clarification, we recommend the following:

- Open an [Issue](https://github.com/yourusername/jira-pilot/issues/new).
- Provide as much context as you can about what you're running into.
- Provide project and platform versions (nodejs, npm, etc), depending on what seems relevant.

## I Want To Contribute

### Reporting Bugs

This section guides you through submitting a bug report for Jira Pilot. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

**Before Submitting a Bug Report**

- **Check the [documentation](README.md)** for a list of common questions and problems.
- **Search the existing issues** to see if the problem has already been reported.

**How Do I Submit a (Good) Bug Report?**

- **Use a clear and descriptive title** for the issue to identify the problem.
- **Describe the exact steps to reproduce the problem** in as many details as possible.
- **Provide specific examples to demonstrate the steps**. Include links to files or GitHub projects, or copy/pasteable snippets, which you use in those examples.
- **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
- **Explain which behavior you expected to see instead and why.**
- **Include screenshots and animated GIFs** which show you following the described steps and clearly demonstrate the problem.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for Jira Pilot, including completely new features and minor improvements to existing functionality. Following these guidelines helps maintainers and the community understand your suggestion and find related suggestions.

**How Do I Submit a (Good) Enhancement Suggestion?**

- **Use a clear and descriptive title** for the issue to identify the suggestion.
- **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
- **Provide specific examples to demonstrate the steps**. Include copy/pasteable snippets which you use in those examples.
- **Describe the current behavior** and **explain which behavior you expected to see instead** and why.

### Your First Code Contribution

#### Development Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/jira-pilot.git
    cd jira-pilot
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Link locally** (optional):
    ```bash
    npm link
    ```

4.  **Run Tests**:
    ```bash
    npm test
    ```

### Pull Requests

The process is described here in several steps:

1.  Fork the repository and create your branch from `main`.
2.  If you've added code that should be tested, add tests.
3.  If you've changed APIs, update the documentation.
4.  Ensure the test suite passes (`npm test`).
5.  Make sure your code lints.
6.  Issue that pull request!

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### JavaScript Styleguide

- Use modern ES6+ syntax.
- Use `import`/`export` (ES Modules).
- Prefer `const` over `let`. Avoid `var`.
- Use `async`/`await` for asynchronous operations.
- Follow the existing code style (2 spaces indentation, single quotes).
