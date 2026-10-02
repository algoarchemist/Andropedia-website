import { copy } from '@andropedia/shared';

// Foundation placeholder. The landing page replaces this in phase 3.
export default function App() {
  return (
    <main className="px-4 py-8">
      <h1 className="font-display text-[clamp(3rem,14vw,7rem)] leading-[0.9] tracking-[-0.02em]">
        {copy.hero.l1}
      </h1>
    </main>
  );
}
