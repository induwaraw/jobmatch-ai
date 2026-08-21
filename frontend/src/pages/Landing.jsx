// Placeholder landing page, just to check the app and Tailwind are working.
export default function Landing() {
  return (
    <div className="flex min-h-full flex-col bg-white text-slate-900">
      <main className="mx-auto w-full max-w-3xl grow px-6 py-20">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
          BSc Software Engineering final year project
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight">JobMatch AI</h1>

        <hr className="mt-6 border-slate-200" />

        <p className="mt-6 max-w-prose text-base leading-7 text-slate-700">
          An AI powered CV and job matching system with job market forecasting for the
          Sri Lankan IT industry.
        </p>

        <p className="mt-4 text-sm text-slate-500">
          Project scaffold. The application interface is not built yet.
        </p>
      </main>

      <footer className="border-t border-slate-200 px-6 py-5">
        <p className="mx-auto max-w-3xl text-sm text-slate-600">
          Developed by Induwara Weerarathna
        </p>
      </footer>
    </div>
  )
}
