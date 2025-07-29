# AI SDK

## Overview

The AI SDK by IOSENSE (part of Faclon Labs) provides developers with powerful tools to integrate AI capabilities into their applications. This SDK supports Angular, React, and Python frameworks, allowing you to build intelligent applications with minimal effort.

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Framework Support](#framework-support)
- [Development Workflow](#development-workflow)
- [Production Readiness](#production-readiness)
- [Documentation](#documentation)
- [Support](#support)

## Quick Start

Run the setup wizard to quickly configure your development environment:

```bash
./setup_wizard.sh
```

## Installation

### Prerequisites

- Git
- Node.js and npm (for Angular/React)
- Python 3.x and pip (for Python)

### Setup Options

The setup wizard offers two connector types:
- **UserID-based connector**: Authentication using user IDs
- **Token-based connector**: Authentication using tokens

You can also choose to include demo applications to help you get started quickly.

## Framework Support

1. Angular
2. React
3. Python

## Development Workflow

1. **Setup Environment**: Run the setup wizard to configure your environment
   ```bash
   ./setup_wizard.sh
   ```

2. **Explore the Code**: Familiarize yourself with the repository structure

3. **Enter the demo app** (if installed):
   ```bash
   cd demo- {PressTab}
   ```
4. **Run Demo App** (if installed):
   ```bash
   ./run.sh
   ```
5. **Develop Your Application**: Integrate the SDK components into your app

6. **Test Your Integration**: Ensure all features work as expected

7. **Build for Production**: Create optimized production builds

## Production Readiness

### Important: Cookie Management for UserID Authentication

⚠️ **CRITICAL FOR PRODUCTION**: When using the UserID-based connector, you must properly configure cookie management to ensure secure authentication:

1. **Cookie Reading Implementation**: Applications must read the `userID` cookie to retrieve the authenticated user ID.

   ```javascript
   // Example code for reading cookies in JavaScript
   function getCookie(name) {
     const value = `; ${document.cookie}`;
     const parts = value.split(`; ${name}=`);
     if (parts.length === 2) return parts.pop().split(';').shift();
   }
   
   // Get the iosense user ID
   const userID = getCookie('userID');
   ```

2. **Cookie Expiration**: Ensure your application properly handles cookie expiration and refresh processes.

3. **Security Considerations**:
   - Use the `secure` and `httpOnly` flags for cookies in production
   - Implement proper CSRF protection
   - Consider using SameSite cookie attributes

4. **Testing**: Thoroughly test your cookie implementation in a staging environment before deploying to production.

For more details, refer to the Cookie Management section in the [official documentation](https://docs.iosense.dev/authentication/cookies).

### Pushing to Main

1. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

2. Push your changes to the remote repository:
   ```bash
   git push origin main
   ```

## Documentation

- **Official Website**: [IO-Sense](https://iosense.io/)
- **GitHub Repository**: [https://github.com/iosense/ai-sdk-wizard](https://github.com/iosense/ai-sdk-wizard)

## Support

- **Email**: henil@faclon.com