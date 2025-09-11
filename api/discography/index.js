import { albums } from '../../config.js';
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(request, response) {
    try {
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

        const pageTitle = 'Discography | x08';
        const pageDescription = `Browse all ${albums.filter(a => !a.comingSoon).length} releases from x08.`;
        const pageUrl = `${siteDefaults.url}/discography`;
        
        const metaValues = {
            'title': pageTitle,
            'description': pageDescription,
            'og:title': pageTitle,
            'og:description': pageDescription,
            'og:url': pageUrl,
            'og:image': siteDefaults.image,
            'twitter:title': pageTitle,
            'twitter:description': pageDescription,
            'twitter:url': pageUrl,
            'twitter:image': siteDefaults.image,
        };

        for (const property in metaValues) {
            const content = metaValues[property];
            if (property === 'title') {
                html = html.replace(/<title>.*?<\/title>/, `<title>${content}</title>`);
            } else {
                const propRegex = new RegExp(`(<meta (?:property|name)="${property}" content=").*?(")`);
                html = html.replace(propRegex, `$1${content}$2`);
            }
        }
        
        response.setHeader('Content-Type', 'text/html');
        return response.status(200).send(html);

    } catch (error) {
        console.error(error);
        return response.status(500).send('Error generating page');
    }
}