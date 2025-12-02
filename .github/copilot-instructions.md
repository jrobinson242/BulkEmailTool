# BulkEmailTool - Copilot Instructions

## Project Overview
Full-stack application for bulk email campaigns with Microsoft 365/Outlook integration.

## Tech Stack
- **Backend**: Node.js with Express, Microsoft Graph SDK
- **Frontend**: React with modern hooks and components
- **Database**: Azure SQL for metadata and templates
- **Authentication**: Azure AD OAuth2
- **Queue**: Azure Queue Storage for bulk sending

## Project Structure
- `/backend` - Node.js Express API server
- `/frontend` - React web application
- `/database` - SQL schema and migrations
- `/docs` - Documentation and API specs

## Development Guidelines
- Follow REST API best practices
- Use environment variables for all secrets
- Implement proper error handling and logging
- Respect Microsoft Graph API rate limits
- Batch email sends (50-100 per batch)
- Include GDPR/CCPA compliance features

## Key Features to Implement
1. Microsoft Graph API integration for Outlook
2. Contact management with CSV import/export
3. Template engine with placeholder support
4. Bulk sending with queue management
5. Tracking and analytics dashboard
6. Compliance and audit logging

## Security Requirements
- OAuth2 authentication via Azure AD
- Secure token storage
- Input validation and sanitization
- Rate limiting on API endpoints
- Audit trail for all email sends

## Status
✅ Workspace structure created
🔄 Setting up backend and frontend scaffolding
⏳ Pending: Database setup, authentication, and deployment configuration
