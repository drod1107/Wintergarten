// Owner-editable body copy is stored as plain text so it stays editable
// through /admin. A line beginning with '## ' is a section heading; every
// other block is a paragraph. That is the whole grammar — deliberately
// small, so nobody has to learn markdown to change a page.

export default function ProseBody({ text, headingLevel = 2 }: { text: string; headingLevel?: 2 | 3 }) {
  const blocks = text
    .trim()
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <>
      {blocks.map((block, i) =>
        block.startsWith('## ') ? (
          <Heading key={i} className="prose-head">
            {block.slice(3).trim()}
          </Heading>
        ) : (
          <p key={i}>{block}</p>
        )
      )}
    </>
  );
}
