# Project Context: React Router Application

This project is a modern, full-stack React application built with **React Router 7**. It utilizes server-side rendering (SSR) by default and leverages a robust set of modern web technologies.

## Project Overview

- **Core Framework:** [React Router 7](https://reactrouter.com/) (formerly Remix)
- **Frontend Library:** React 19
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (v4)
- **UI Components:** Shadcn UI (Radix UI primitives)
- **Language:** TypeScript

### Architecture

- **SSR (Server-Side Rendering):** Enabled by default in `react-router.config.ts`.
- **Routing:** Centralized route configuration in `app/routes.ts`.
- **Layouts:** `app/root.tsx` serves as the root layout, handling HTML structure, metadata, and global styles.
- **Components:** UI components are located in `app/components/ui/`, following the Shadcn UI pattern.
- **Entry Points:**
    - `app/root.tsx`: The main application entry and root layout.
    - `app/routes.ts`: Defines the application's route tree.

## Building and Running

### Development

Start the development server with Hot Module Replacement (HMR):

```bash
bun run dev
```

### Production

1.  **Build the application:**
    ```bash
  bun run build
    ```
2.  **Start the production server:**
    ```bash
  bun run start
    ```

### Quality Assurance

- **Type Checking:** Run TypeScript and React Router type generation:
  ```bash
  bun run typecheck
  ```
- **Linting:** Run ESLint to check for code quality and style issues:
  ```bash
  bun run lint
  ```

## Development Conventions

- **Dependencies:** Never use deprecated methods or APIs of installed dependencies. Always verify library documentation or source code annotations (e.g., JSDoc `@deprecated`) and use the recommended modern approach.
- **Linting:** Follow the project's ESLint configuration. Ensure that your code passes linting before committing.
- **Routing:** Prefer defining routes in `app/routes.ts` using the `RouteConfig` API.
- **Components:** Use the established Shadcn UI components in `app/components/ui/`. When adding new UI components, follow the existing patterns using `radix-ui` and `class-variance-authority`.
- **Styling:** Use Tailwind CSS for all styling. Utility classes should be managed using `clsx` and `tailwind-merge` (via the `cn` utility in `app/lib/utils.ts`).
- **Data Loading:** Use React Router's `loader` and `action` functions for data fetching and mutations within route files.
- **Type Safety:** Leverage React Router's automatic type generation (`+types/...`) for loaders, actions, and component props.
- **Type Declarations (By Module):** Keep custom type declarations inside each feature/module folder using a local `types.ts` file. Example: for the auth module, place module-specific types in `app/routes/auth/types.ts`.

## Package management
- **Dependencies:** Managed via `package.json`. Use `bun add` to add new dependencies.

## Directory Structure Highlights

- `app/`: Main application source code.
    - `components/ui/`: Reusable UI components.
    - `lib/`: Utility functions and shared logic.
    - `routes/`: Page-level components and route-specific logic.
    - `welcome/`: Initial "Welcome" screen components.
- `public/`: Static assets.
- `react-router.config.ts`: React Router specific configuration.
- `vite.config.ts`: Vite configuration with Tailwind and React Router plugins.
