import { albums } from '../../config.js';
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(request, response) {
    const { slug } = request.query;

    const createSlug = (title) => {
        return title
            .toLowerCase()
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            // Keep Unicode letters, numbers, hyphens, AND periods. Remove others.
            .replace(/[^\p{L}\p{N}.-]/gu, '')
            .replace(/--+/g, '-') // Replace multiple hyphens
            .replace(/^-+|-+$/g, '') // Trim leading/trailing hyphens
            .replace(/\.+$/, ''); // Trim trailing periods for safety
    };

    const escapeHtml = (unsafe) => {
    if (!unsafe) return "";
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

    try {
        const song = albums.find(album => createSlug(album.title) === slug);

        // Vercel compiles files into a different structure, so we need to navigate to the built file
        const indexPath = path.join(process.cwd(), '.vercel/output/static/index.html');
        let html;
        try {
            html = await fs.readFile(indexPath, 'utf-8');
        } catch (error) {
            // Fallback for local development `vercel dev`
            html = await fs.readFile(path.join(process.cwd(), 'index.html'), 'utf-8');
        }


        const siteDefaults = {
            title: 'x08 | Official Site',
            description: 'The official website and music portfolio for the artist x08.',
            url: 'https://x08.app',
            image: 'https://x08.app/icons/x08_x_512.png',
        };

        if (song) {
            const songTitle = song.title;
            const description = song.comingSoon 
                ? `Check out the upcoming release "${songTitle}" by x08.`
                : `Listen to "${songTitle}" by x08. Released on ${new Date(song.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`;
            const url = `${siteDefaults.url}/song/${slug}`;
            const image = song.img;
            const themeColor = '#8A2BE2'; // Brand color for embeds

            const metaValues = {
                'title': escapeHtml(`${songTitle} | x08`),
                'description': escapeHtml(description),
                'theme-color': themeColor,
                'og:title': escapeHtml(songTitle),
                'og:description': escapeHtml(description),
                'og:url': url,
                'og:image': image,
                'og:type': 'music.song',
                'og:site_name': 'x08',
                'twitter:title': escapeHtml(songTitle),
                'twitter:description': escapeHtml(description),
                'twitter:url': url,
                'twitter:image': image,
            };

            // Replace existing tags with dynamic content
            for (const property in metaValues) {
                const content = metaValues[property];
                if (property === 'title') {
                    html = html.replace(/<title>.*?<\/title>/, `<title>${content}</title>`);
                } else {
                    const propRegex = new RegExp(`(<meta (?:property|name)="${property}" content=").*?(")`);
                    html = html.replace(propRegex, `$1${content}$2`);
                }
            }

            // Inject new tags for rich music embeds
            let newTags = '';
            if (song.sampleUrl) {
                newTags += `\n    <meta property="og:audio" content="${song.sampleUrl}">\n    <meta property="og:audio:type" content="audio/mpeg">`;
            }
            newTags += `\n    <meta property="music:musician" content="${siteDefaults.url}">`;
            
            if (newTags) {
                html = html.replace('</head>', `${newTags}\n</head>`);
            }
        }
        
        response.setHeader('Content-Type', 'text/html');
        return response.status(200).send(html);

    } catch (error) {
        console.error(error);
        return response.status(500).send('Error generating page');
    }
}