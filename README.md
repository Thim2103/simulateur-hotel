# Getting Started with Create React App

## Supabase

Restaurant Simulator and PMS reservations require a Supabase project configured with:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

Run every file under `supabase/migrations/` in order (oldest first) in the Supabase SQL editor before starting the app. The first migration creates and seeds the restaurant, staff, menu, finance, operations, and reservation schema.

### Row Level Security (user-scoped, anonymous auth)

`202609070006_rls_user_scoping.sql` replaces the old fully-public `using (true)` policies with real per-user RLS: every table gets a `user_id` column, and a signed-in user can only see/write their own rows (mono-tenant: one hotel and one restaurant per user). The app has no login screen -- each browser transparently gets its own identity via Supabase's **anonymous auth**, so after running this migration you must also:

1. In the Supabase dashboard, go to **Authentication → Sign In / Providers → Anonymous Sign-Ins** and enable it. Without this, `supabase.auth.signInAnonymously()` fails and the app falls back to its offline mock/local-storage data instead of Supabase.
2. Reload the app once as the first user: it will automatically claim the pre-migration seed data (the rows that still have `user_id IS NULL`) for that browser's identity. Any other browser/user starts with a fresh hotel and restaurant.

`.env` is committed to this repo for convenience in this simulator context, but note that Create React App loads it in every environment including `test` -- `.env.test` (also committed) blanks both variables so `npm test` never depends on network access to the live project.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
