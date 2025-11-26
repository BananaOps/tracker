# Contributing to Tracker

Thank you for your interest in contributing to Tracker! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Contribution Workflow](#contribution-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code:

- **Be respectful** and inclusive
- **Be collaborative** and constructive
- **Focus on what is best** for the community
- **Show empathy** towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title** and description
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment details** (OS, Go version, etc.)

**Use the bug report template:**
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Environment:**
- OS: [e.g. Ubuntu 22.04]
- Go version: [e.g. 1.23]
- Tracker version: [e.g. 1.0.0]
```

### Suggesting Features

Feature suggestions are welcome! Please:

- **Check existing feature requests** first
- **Provide clear use cases** for the feature
- **Explain why** this would be useful
- **Consider alternatives** you've thought about

### Pull Requests

We actively welcome pull requests:

1. Fork the repo and create your branch from `main`
2. Make your changes
3. Add tests for new functionality
4. Ensure tests pass
5. Update documentation
6. Submit a pull request

## Development Setup

See the [Development Guide](./docs/DEVELOPMENT.md) for detailed setup instructions.

**Quick start:**

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/tracker.git
cd tracker

# Install dependencies
go mod download
cd web && npm install

# Run tests
go test ./...
cd web && npm test

# Start development
go run main.go serv  # Backend
cd web && npm run dev  # Frontend
```

## Contribution Workflow

### 1. Find or Create an Issue

- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to let others know you're working on it
- If no issue exists, create one first to discuss the change

### 2. Fork and Branch

```bash
# Fork on GitHub, then:
git clone https://github.com/YOUR_USERNAME/tracker.git
cd tracker
git remote add upstream https://github.com/BananaOps/tracker.git

# Create a branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 3. Make Changes

- Write clear, concise commit messages
- Follow coding standards
- Add tests for new features
- Update documentation

### 4. Test Your Changes

```bash
# Run all tests
go test ./...
cd web && npm test

# Run linters
golangci-lint run
cd web && npm run lint

# Test manually
go run main.go serv
```

### 5. Commit

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>(<scope>): <description>

git commit -m "feat(api): add new endpoint for events"
git commit -m "fix(ui): correct date formatting in timeline"
git commit -m "docs: update installation guide"
git commit -m "test: add tests for catalog service"
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Tests
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### 6. Push and Create PR

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create PR on GitHub
# Fill in the PR template
# Link related issues with "Fixes #123"
```

### 7. Code Review

- Address review comments promptly
- Push additional commits to the same branch
- Be open to feedback
- Keep discussions professional

## Coding Standards

### Go

- Follow [Effective Go](https://go.dev/doc/effective_go)
- Use `gofmt` for formatting
- Run `golangci-lint` before committing
- Write clear comments for exported functions
- Keep functions small and focused
- Use meaningful variable names

**Example:**
```go
// GetEventByID retrieves an event by its unique identifier.
// Returns ErrNotFound if the event doesn't exist.
func (s *EventService) GetEventByID(ctx context.Context, id string) (*Event, error) {
    if id == "" {
        return nil, ErrInvalidID
    }
    
    event, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("failed to get event: %w", err)
    }
    
    return event, nil
}
```

### TypeScript/React

- Use TypeScript for type safety
- Follow React best practices
- Use functional components and hooks
- Keep components small and reusable
- Use Tailwind CSS for styling
- Run ESLint before committing

**Example:**
```typescript
interface EventCardProps {
  event: Event;
  onSelect?: (event: Event) => void;
}

export function EventCard({ event, onSelect }: EventCardProps) {
  const handleClick = () => {
    onSelect?.(event);
  };

  return (
    <div 
      onClick={handleClick}
      className="p-4 rounded-lg border hover:shadow-lg transition-shadow"
    >
      <h3 className="text-lg font-semibold">{event.title}</h3>
      <p className="text-gray-600">{event.message}</p>
    </div>
  );
}
```

### Protocol Buffers

- Use clear, descriptive field names
- Add comments for all messages and fields
- Follow protobuf style guide
- Version your APIs appropriately

## Testing Guidelines

### Backend Tests

```go
func TestEventService_CreateEvent(t *testing.T) {
    // Arrange
    ctx := context.Background()
    repo := &mockEventRepository{}
    service := NewEventService(repo)
    
    event := &Event{
        Title: "Test Event",
        Type:  EventTypeDeployment,
    }
    
    // Act
    result, err := service.CreateEvent(ctx, event)
    
    // Assert
    require.NoError(t, err)
    assert.NotEmpty(t, result.ID)
    assert.Equal(t, event.Title, result.Title)
}
```

### Frontend Tests

```typescript
describe('EventCard', () => {
  it('renders event title and message', () => {
    const event = {
      id: '1',
      title: 'Test Event',
      message: 'Test message',
    };

    render(<EventCard event={event} />);

    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn();
    const event = { id: '1', title: 'Test' };

    render(<EventCard event={event} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Test'));

    expect(onSelect).toHaveBeenCalledWith(event);
  });
});
```

### Test Coverage

- Aim for >80% code coverage
- Test edge cases and error conditions
- Write integration tests for critical paths
- Mock external dependencies

## Documentation

### Code Documentation

- Document all exported functions and types
- Use clear, concise comments
- Include examples where helpful
- Keep documentation up to date

### User Documentation

- Update relevant docs in `/docs`
- Add examples for new features
- Update README if needed
- Include screenshots for UI changes

### API Documentation

- Update OpenAPI/Swagger specs
- Document request/response formats
- Include example requests
- Note breaking changes

## Pull Request Checklist

Before submitting your PR, ensure:

- [ ] Code follows project style guidelines
- [ ] Tests pass locally (`go test ./...`, `npm test`)
- [ ] Linters pass (`golangci-lint run`, `npm run lint`)
- [ ] New code has tests
- [ ] Documentation is updated
- [ ] Commit messages follow conventional commits
- [ ] PR description explains the changes
- [ ] Related issues are linked

## Community

### Getting Help

- 🐛 [GitHub Issues](https://github.com/BananaOps/tracker/issues) - Bug reports and feature requests
- 💬 [GitHub Discussions](https://github.com/BananaOps/tracker/discussions) - Questions and ideas
- 📖 [Documentation](https://github.com/BananaOps/tracker/tree/main/docs) - Guides and references

### Recognition

Contributors are automatically recognized in this file and the README. Thank you for your contributions!

## Contributors

<!-- CONTRIBUTORS_START -->
<!-- This section is automatically updated by GitHub Actions -->
<!-- CONTRIBUTORS_END -->

---

## License

By contributing to Tracker, you agree that your contributions will be licensed under the Apache 2.0 License.

## Questions?

Feel free to ask questions in [GitHub Discussions](https://github.com/BananaOps/tracker/discussions) or open an issue.

Thank you for contributing to Tracker! 🚀
