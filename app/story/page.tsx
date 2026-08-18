import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import ProseBody from '@/components/ProseBody';
import { getStory } from '@/lib/store';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Story',
  description: 'Why Wintergarten exists.',
  alternates: { canonical: `${SITE_URL}/story` },
};

export default async function StoryPage() {
  const story = await getStory();
  const isPlaceholder = story.trim().startsWith('[Owner to supply');

  return (
    <>
      <div className="shell">
        <Nav current="/story" />
      </div>
      <main id="main">
        <div className="shell z">
          <header className="page-head">
            <span className="typed">Why</span>
            <h1>The Story</h1>
          </header>

          {isPlaceholder ? (
            <div className="placeholder-flag" style={{ maxWidth: '68ch' }}>
              <span className="typed">Awaiting content from owner</span>
              {story.replace(/^\[|\]$/g, '')}
            </div>
          ) : (
            <div className="prose">
              <ProseBody text={story} />
            </div>
          )}
        </div>
      </main>
      <div className="shell">
        <Footer />
      </div>
    </>
  );
}
