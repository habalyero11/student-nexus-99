# CSU-ULS Management System

A comprehensive educational management system for ULS-CSU (University Laboratory School - Cotabato State University) designed to streamline academic performance tracking, grade management, and student analytics.

## Getting Started

### Prerequisites

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

Follow these steps to set up the project locally:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Development

### Editing the Code

There are several ways to edit this application:

**Use your preferred IDE**

Clone this repo and work locally using your own IDE. Make your changes and push them to the repository.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Technologies

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## Building for Production

To build the project for production:

```sh
npm run build
```

To preview the production build:

```sh
npm run preview
```

## Deployment

The project can be deployed to any static hosting service that supports Node.js applications, such as:

- Vercel
- Netlify
- AWS Amplify
- GitHub Pages (with proper configuration)

Make sure to set up your environment variables for Supabase and other services before deploying.
