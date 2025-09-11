import { albums } from '../../config.js';
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(request, response) {
    const { slug } = request.query;

    try {
        const song = albums.find(album => album.title.toLowerCase().replace(/\s+/g, '-') === slug);

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
            url: 'https://x08.app', // Your actual domain
            image: 'https://x08.app/icons/x08_x_512.png',
        };

        let title, description, url, image;

        if (song) {
            title = `${song.title} | x08`;
            description = song.comingSoon 
                ? `Listen to "${song.title}" by x08. Releasing soon.`
                : `Listen to "${song.title}" by x08.`;
            url = `${siteDefaults.url}/song/${slug}`;
            image = song.img;
        } else {
            ({ title, description, url, image } = siteDefaults);
            url = siteDefaults.url;
        }

        // Use regex to replace the content of the meta tags
        html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
        html = html.replace(/(<meta name="description" content=").*?(")/, `$1${description}$2`);
        html = html.replace(/(<meta property="og:title" content=").*?(")/, `$1${title}$2`);
        html = html.replace(/(<meta property="og:description" content=").*?(")/, `$1${description}$2`);
        html = html.replace(/(<meta property="og:url" content=").*?(")/, `$1${url}$2`);
        html = html.replace(/(<meta property="og:image" content=").*?(")/, `$1${image}$2`);
        html = html.replace(/(<meta property="twitter:title" content=").*?(")/, `$1${title}$2`);
        html = html.replace(/(<meta property="twitter:description" content=").*?(")/, `$1${description}$2`);
        html = html.replace(/(<meta property="twitter:url" content=").*?(")/, `$1${url}$2`);
        html = html.replace(/(<meta property="twitter:image" content=").*?(")/, `$1${image}$2`);
        

        response.setHeader('Content-Type', 'text/html');
        return response.status(200).send(html);

    } catch (error) {
        console.error(error);
        return response.status(500).send('Error generating page');
    }
}