import Parser from 'rss-parser';

export default async function handler(req, res) {
    const parser = new Parser();
    const feedUrl = 'https://example.com/rss-feed.xml'; // Replace with your RSS feed URL

    try {
        const feed = await parser.parseURL(feedUrl);
        const latestEntry = feed.items[0]; // Get the most recent entry

        res.status(200).json({
            title: latestEntry.title,
            link: latestEntry.link,
            content: latestEntry.contentSnippet, // or latestEntry.content for full HTML
            date: latestEntry.pubDate
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch RSS feed' });
    }
}