# Contributing to BulkEmailTool

Thank you for your interest in contributing to BulkEmailTool! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/jrobinson242/BulkEmailTool/issues)
2. If not, create a new issue using the bug report template
3. Include detailed steps to reproduce, expected behavior, and actual behavior
4. Add screenshots if applicable

### Suggesting Features

1. Check if the feature has already been suggested
2. Create a new issue using the feature request template
3. Clearly describe the feature and its benefits
4. Discuss implementation approach if applicable

### Pull Requests

1. Fork the repository
2. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes following our coding standards
4. Test your changes thoroughly
5. Commit with clear, descriptive messages
6. Push to your fork
7. Create a Pull Request with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots for UI changes

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/jrobinson242/BulkEmailTool.git
   cd BulkEmailTool
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

4. Set up environment variables:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   # Edit .env files with your configuration
   ```

5. Set up database:
   - Follow instructions in `database/README.md`

## Coding Standards

### JavaScript/Node.js
- Use ES6+ syntax
- Follow existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Handle errors appropriately

### React
- Use functional components with hooks
- Keep components small and focused
- Use PropTypes or TypeScript for type checking
- Follow React best practices

### Git Commits
- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Reference issues and pull requests when applicable
- Keep commits focused and atomic

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Include both unit and integration tests where appropriate

### Running Tests

Backend:
```bash
cd backend
npm test
```

Frontend:
```bash
cd frontend
npm test
```

## Documentation

- Update README.md if you change functionality
- Update API documentation for endpoint changes
- Add JSDoc comments for new functions
- Update CHANGELOG.md

## Questions?

Feel free to open an issue for any questions about contributing.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
