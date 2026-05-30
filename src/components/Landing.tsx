import { ArrowRight, Calendar, Target, BarChart3 } from 'lucide-react';

export function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <nav className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-primary">Day</span>Craft
          </h1>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-6">
        <section className="flex flex-col items-center justify-center text-center py-20 md:py-32">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Work in Progress
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Craft Your Days,
            <br />
            <span className="text-primary">Shape Your Life</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mb-10">
            A personal operating system for goal setting, habit tracking, and life management.
            Start with the 12 Week Year methodology to turn your annual goals into weekly actions.
          </p>
          <a
            href="#/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-lg font-medium"
          >
            Get Started
            <ArrowRight className="h-5 w-5" />
          </a>
        </section>

        {/* Features */}
        <section className="grid md:grid-cols-3 gap-8 py-20 max-w-4xl mx-auto">
          <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Goal Setting</h3>
            <p className="text-sm text-muted-foreground">
              Define clear goals with actionable tactics. Break down big visions into weekly tasks.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Daily Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Track daily todos and habits. Stay accountable with visual progress indicators.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Visualize your execution score. Predict outcomes and identify patterns.
            </p>
          </div>
        </section>

        {/* Coming Soon */}
        <section className="text-center py-16 border-t">
          <h3 className="text-xl font-semibold mb-4">Coming Soon</h3>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span className="px-4 py-2 rounded-full bg-muted">Resume Builder</span>
            <span className="px-4 py-2 rounded-full bg-muted">Project Portfolio</span>
            <span className="px-4 py-2 rounded-full bg-muted">Reading List</span>
            <span className="px-4 py-2 rounded-full bg-muted">Habit Tracker</span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 mt-20 border-t">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2026 DayCraft. Built with passion.</p>
          <div className="flex gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
