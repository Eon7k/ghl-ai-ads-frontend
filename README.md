This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Vercel + Render (GHL integration)

This app uses a **same-origin API proxy** (`/api/proxy`) so the frontend only talks to your Vercel domain. That avoids CORS when the app is embedded in a GoHighLevel iframe. The proxy forwards requests to your backend on Render.

**If you see a 502 error:**

1. **Set the backend URL in Vercel**  
   In [Vercel](https://vercel.com) → your project → **Settings** → **Environment Variables**, add:
   - **Name:** `BACKEND_URL`
   - **Value:** your Render backend URL, e.g. `https://your-app.onrender.com` (no trailing slash)

   Redeploy after adding the variable.

2. **If the URL is set and you still get 502**  
   - Check that your Render service is running and the URL is correct in the Render dashboard.
   - On Render’s free tier, the service may sleep; the first request can take 30–60 seconds. Wait and try again, or use a paid plan to avoid cold starts.
