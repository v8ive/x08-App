import { social_links, albums } from '/config.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    if (history.scrollRestoration) {
        history.scrollRestoration = 'manual';
    }

    const preloader = document.getElementById('preloader');
    window.addEventListener('load', () => {
        preloader.classList.add('preloader-hidden');
        preloader.addEventListener('transitionend', () => {
            preloader.remove();
        }, { once: true });
    });

    const updateThemeColor = (theme) => {
        const themeColor = theme === 'light' ? '#F0F0F0' : '#000000';
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', themeColor);
        }
    };

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
    
    // DOM Elements
    const featuredGalleryContainer = document.getElementById('featured-gallery-container');
    const featuredGalleryBackground = document.getElementById('featured-gallery-background');
    const featuredPrevBtn = document.getElementById('featured-prev-btn');
    const featuredNextBtn = document.getElementById('featured-next-btn');
    const upcomingReleasesContainer = document.getElementById('upcoming-releases-container');

    const albumList = document.getElementById('album-list');
    const songPage = document.getElementById('song-page');
    const songPageBackground = document.getElementById('song-page-background');
    const searchBar = document.getElementById('search-bar');
    const videoSearchBar = document.getElementById('video-search-bar');
    const discographyCount = document.getElementById('discography-count');
    const videoCount = document.getElementById('video-count');
    const musicFiltersContainer = document.getElementById('music-active-filters');
    const videoFiltersContainer = document.getElementById('video-active-filters');

    const linksModal = document.getElementById('links-modal');
    const socialModal = document.getElementById('social-modal');
    const socialsToggleBtn = document.querySelector('.socials-toggle-btn');
    const socialsDropdown = document.getElementById('socials-dropdown');
    const modalCloseBtns = document.querySelectorAll('.modal-close-btn');
    const themeToggle = document.getElementById('theme-toggle-checkbox');
    const body = document.body;
    const mainContent = document.querySelector('.main-content');
    const mainNav = document.querySelector('.main-nav');
    const logoLink = document.querySelector('.logo-container a');

    const globalPlayer = document.getElementById('global-player');
    const playerAlbumArt = document.getElementById('player-album-art');
    const playerSongTitle = document.getElementById('player-song-title');
    const playerPlayPauseBtn = document.getElementById('player-play-pause-btn');
    const playerPrevBtn = document.getElementById('player-prev-btn');
    const playerNextBtn = document.getElementById('player-next-btn');
    const playerInfoBtn = document.getElementById('player-info-btn');
    const playerCloseBtn = document.getElementById('player-close-btn');
    const playerProgressBar = document.getElementById('player-progress-bar');
    const playerCurrentTimeEl = document.getElementById('player-current-time');
    const playerDurationEl = document.getElementById('player-duration');
    const progressBarBg = document.querySelector('.progress-bar-bg');

    const audioPlayer = new Audio();
    audioPlayer.crossOrigin = "anonymous";
    let currentSongIndex = -1;
    let isPlaying = false;
    let isSeeking = false;
    const colorThief = new ColorThief();
    let currentPalette = [];

    const visualizerCanvas = document.getElementById('audio-visualizer');
    const visualizerCtx = visualizerCanvas.getContext('2d');
    const faviconLink = document.getElementById('favicon');
    const originalFavicon = faviconLink.href;
    const faviconCanvas = document.createElement('canvas');
    faviconCanvas.width = 64;
    faviconCanvas.height = 64;
    const faviconCtx = faviconCanvas.getContext('2d');
    const baseFaviconImg = new Image();
    baseFaviconImg.src = '/icons/x08_x_64.png';
    let audioContext, analyser, sourceNode, dataArray, bufferLength;
    let faviconAnimationActive = false;

    const videoGalleryContainer = document.getElementById('video-gallery');
    const videoTheater = document.getElementById('video-theater');
    const videoCloseBtn = document.getElementById('video-close-btn');
    let ytPlayer;

    const playIcon = '<i class="fas fa-play play-pause-icon"></i>';
    const pauseIcon = '<i class="fas fa-pause play-pause-icon"></i>';
    const nowPlayingIndicator = `
        <div class="now-playing-indicator">
            <span></span><span></span><span></span>
        </div>`;

    const siteDefaults = {
        title: 'x08 | Official Site',
        description: 'The official website and music portfolio for the artist x08.',
        url: 'https://x08.app/',
        image: 'https://x08.app/icons/x08_x_512.png',
        type: 'website'
    };
    
    let activeMusicFilters = [];
    let activeVideoFilters = [];
    let featuredAlbums = [];
    let currentFeatureIndex = 0;
    let isTransitioning = false;
    let galleryInterval;
    const GALLERY_INTERVAL_TIME = 5000; // 5 seconds


    const ITEM_LIMIT = 8;
    const savedTheme = localStorage.getItem('theme') || 'dark';
    body.setAttribute('data-theme', savedTheme);
    themeToggle.checked = savedTheme === 'light';
    updateThemeColor(savedTheme);

    themeToggle.addEventListener('change', () => {
        const newTheme = themeToggle.checked ? 'light' : 'dark';
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeColor(newTheme);
    });

    const debounce = (func, delay) => {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    };

    const updateURL = (type, searchTerm, filters) => {
        const currentPath = window.location.pathname;
        const params = new URLSearchParams();
        if (searchTerm) {
            params.set('search', searchTerm);
        }
        if (filters && filters.length > 0) {
            params.set('filter', filters.join(','));
        }
        const newUrl = `${currentPath}${params.toString() ? `?${params.toString()}` : ''}`;
        history.pushState({ page: type, search: searchTerm, filter: filters }, '', newUrl);
    };

    const debouncedUpdateURL = debounce(updateURL, 300);

    const createSocialLinkElement = (url, iconClass, text, platformClass) => {
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.target = '_blank';
        linkElement.classList.add('social-link', platformClass);
        linkElement.ariaLabel = text;

        const icon = document.createElement('i');
        icon.className = iconClass + ' social-icon';
        linkElement.appendChild(icon);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'platform-name';
        nameSpan.textContent = text;
        linkElement.appendChild(nameSpan);

        return linkElement;
    };

    const populateHeaderSocials = () => {
        socialsDropdown.innerHTML = '';
        const platforms = {
            'Spotify': { url: social_links.spotify, icon: 'fab fa-spotify', class: 'spotify' },
            'SoundCloud': { url: social_links.soundcloud, icon: 'fab fa-soundcloud', class: 'soundcloud' },
            'YouTube': { url: social_links.youtube, icon: 'fab fa-youtube', class: 'youtube' },
            'Apple Music': { url: social_links.apple, icon: 'fa-brands fa-itunes-note', class: 'apple' },
            'Tidal': { url: social_links.tidal, icon: 'fa-brands fa-tidal', class: 'tidal' },
            'Amazon Music': { url: social_links.amazon, icon: 'fab fa-amazon', class: 'iheart' },
            'iHeartRadio': { url: social_links.iheart, icon: 'fa-solid fa-radio', class: 'iheart' },
            'Pandora': { url: social_links.pandora, icon: 'fab fa-pandora', class: 'pandora' }
        };

        let delay = 0;
        for (const [platform, data] of Object.entries(platforms)) {
            if (data.url) {
                const linkElement = createSocialLinkElement(data.url, data.icon, platform, data.class);
                linkElement.style.setProperty('--animation-delay', `${delay}s`);
                socialsDropdown.appendChild(linkElement);
                delay += 0.05;
            }
        }

        socialsToggleBtn.addEventListener('click', () => {
            const isActive = socialsDropdown.classList.contains('active');
            socialsToggleBtn.classList.toggle('active', !isActive);
            socialsDropdown.classList.toggle('active', !isActive);
            socialsToggleBtn.setAttribute('aria-expanded', !isActive);

            if (window.innerWidth <= 768) {
                document.body.style.overflow = !isActive ? 'hidden' : '';
            }
        });
    };

    const formatRelativeDate = (dateString, isSongPage = false) => {
        if (!dateString) {
            return "Releasing Soon";
        }
        const parts = dateString.split('-');
        const releaseDate = new Date(parts[0], parts[1] - 1, parts[2]);

        if (isSongPage) {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return new Intl.DateTimeFormat('en-US', options).format(releaseDate);
        }

        const now = new Date();
        releaseDate.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);

        const diffTime = releaseDate - now;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
            const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
            if (diffDays <= 7) return `Releases ${rtf.format(diffDays, 'day')}`;
            const weeks = Math.round(diffDays / 7);
            return `Releases in ${weeks} week${weeks > 1 ? 's' : ''}`;
        } else if (diffDays === 0) {
            return "Releases today";
        } else {
            const daysAgo = Math.abs(diffDays);
            const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
            if (daysAgo <= 7) return `Released ${rtf.format(-daysAgo, 'day')}`;
            const weeksAgo = Math.floor(daysAgo / 7);
            if (weeksAgo <= 4) return `Released ${weeksAgo} week${weeksAgo > 1 ? 's' : ''} ago`;
            const monthsAgo = Math.floor(daysAgo / 30.44);
            if (monthsAgo < 12) return `Released ${monthsAgo} month${monthsAgo > 1 ? 's' : ''} ago`;
            const yearsAgo = Math.floor(daysAgo / 365.25);
            return `Released ${yearsAgo} year${yearsAgo > 1 ? 's' : ''} ago`;
        }
    };
    
    const createTagElement = (tagText, type, delay) => {
        const tagEl = document.createElement('div');
        tagEl.className = `song-tag ${type}-tag`;
        tagEl.textContent = tagText;
        tagEl.dataset.tag = tagText.toLowerCase();
        tagEl.dataset.type = type;
        tagEl.style.setProperty('--tag-delay', `${delay}s`);
        return tagEl;
    };

    const preloadImage = (src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = src;
    });
    
    const updateCarouselState = (newIndex) => {
        if (isTransitioning || newIndex === currentFeatureIndex) return;
        isTransitioning = true;
    
        const slides = featuredGalleryContainer.querySelectorAll('.featured-slide');
        const oldIndex = currentFeatureIndex;
        currentFeatureIndex = (newIndex + featuredAlbums.length) % featuredAlbums.length;
    
        const currentSlide = slides[oldIndex];
        const nextSlide = slides[currentFeatureIndex];
        const nextAlbum = featuredAlbums[currentFeatureIndex];
    
        const currentBg = featuredGalleryBackground.querySelector('.active');
    
        let newBg;
        if (nextAlbum.canvasUrl) {
            newBg = document.createElement('video');
            newBg.className = 'bg-video';
            newBg.autoplay = true;
            newBg.loop = true;
            newBg.muted = true;
            newBg.playsInline = true;
            newBg.src = nextAlbum.canvasUrl;
        } else {
            newBg = document.createElement('div');
            newBg.className = 'bg-image';
            newBg.style.backgroundImage = `url(${nextAlbum.img})`;
        }
        
        featuredGalleryBackground.appendChild(newBg);
    
        requestAnimationFrame(() => {
            newBg.classList.add('active');
            if (currentBg) {
                currentBg.classList.remove('active');
            }
        });
    
        if (currentSlide) currentSlide.classList.add('is-leaving');
        nextSlide.classList.remove('is-leaving');
        nextSlide.classList.add('is-active');
    
        setTimeout(() => {
            if (currentBg) {
                currentBg.remove();
            }
            if (currentSlide) {
                currentSlide.classList.remove('is-active', 'is-leaving');
            }
            isTransitioning = false;
        }, 600);
    };
    
    const startGalleryInterval = () => {
        clearInterval(galleryInterval);
        galleryInterval = setInterval(() => {
            updateCarouselState(currentFeatureIndex + 1);
        }, GALLERY_INTERVAL_TIME);
    };

    const resetGalleryInterval = () => {
        clearInterval(galleryInterval);
        startGalleryInterval();
    };

    const renderFeaturedGallery = () => {
        featuredAlbums = albums.filter(album => album.featured);
        featuredGalleryContainer.innerHTML = '';
        featuredGalleryBackground.innerHTML = ''; 
    
        if (featuredAlbums.length === 0) {
            document.getElementById('featured-gallery-section').style.display = 'none';
            return;
        }
    
        const firstAlbum = featuredAlbums[0];
        let bg1;
        if (firstAlbum.canvasUrl) {
            bg1 = document.createElement('video');
            bg1.className = 'bg-video active';
            bg1.autoplay = true;
            bg1.loop = true;
            bg1.muted = true;
            bg1.playsInline = true;
            bg1.src = firstAlbum.canvasUrl;
        } else {
            bg1 = document.createElement('div');
            bg1.className = 'bg-image active';
            bg1.style.backgroundImage = `url(${firstAlbum.img})`;
        }
        featuredGalleryBackground.appendChild(bg1);
    
        featuredAlbums.forEach((album, index) => {
            const originalIndex = albums.indexOf(album);
            const slide = document.createElement('div');
            slide.className = 'featured-slide';
            if (index === 0) {
                slide.classList.add('is-active');
            }
            slide.dataset.index = originalIndex;
            slide.innerHTML = `
                <img src="${album.img}" alt="${album.title}" class="featured-img">
                <div class="featured-info">
                    <div class="featured-info-text">
                        <h3>${album.title}</h3>
                    </div>
                    <div class="featured-controls">
                        <button class="album-play-btn control-btn" data-index="${originalIndex}" ${!album.sampleUrl ? 'disabled' : ''} aria-label="Play Sample">
                            ${playIcon}${nowPlayingIndicator}
                        </button>
                        <button class="album-info-btn control-btn" data-index="${originalIndex}" aria-label="More Info"><i class="fas fa-info-circle"></i></button>
                    </div>
                </div>
            `;
            featuredGalleryContainer.appendChild(slide);
        });
    
        startGalleryInterval();
    };

    const renderUpcomingReleases = () => {
        const upcoming = albums.filter(album => album.comingSoon);
        const upcomingSection = document.getElementById('upcoming-releases-section');
        upcomingReleasesContainer.innerHTML = '';
    
        if (upcoming.length === 0) {
            upcomingSection.style.display = 'none';
            return;
        }
        
        upcomingSection.style.display = 'block';
    
        upcoming.forEach((album, index) => {
            const originalIndex = albums.indexOf(album);
            const item = document.createElement('div');
            item.className = 'upcoming-item reveal-on-scroll';
            item.dataset.index = originalIndex;
            item.style.setProperty('--stagger-index', index);
            item.innerHTML = `
                <img src="${album.img}" alt="${album.title}" class="upcoming-img">
                <div class="upcoming-info">
                    <div>
                        <h3 class="upcoming-title">${album.title}</h3>
                        <p class="upcoming-release-date">${formatRelativeDate(album.releaseDate)}</p>
                    </div>
                    <div class="upcoming-controls">
                        <button class="album-play-btn control-btn" data-index="${originalIndex}" ${!album.sampleUrl ? 'disabled' : ''}>
                            ${playIcon}${nowPlayingIndicator}
                        </button>
                        <button class="album-info-btn control-btn" data-index="${originalIndex}"><i class="fas fa-info-circle"></i></button>
                    </div>
                </div>
            `;
            upcomingReleasesContainer.appendChild(item);
        });
        setupScrollAnimations();
    };

    
    const renderAlbums = (isFullPage = false) => {
        const searchTerm = searchBar.value.toLowerCase();
        let filteredAlbums = albums.filter(album => !album.comingSoon);
    
        if (searchTerm) {
            filteredAlbums = filteredAlbums.filter(album => album.title.toLowerCase().includes(searchTerm));
        }
    
        if (activeMusicFilters.length > 0) {
            filteredAlbums = filteredAlbums.filter(album => {
                const albumTags = [...(album.tags || []), ...(album.languages || [])].map(t => t.toLowerCase());
                return activeMusicFilters.every(filter => albumTags.includes(filter));
            });
        }
        
        albumList.innerHTML = '';
        discographyCount.textContent = `(${filteredAlbums.length})`;
    
        const sortedAlbums = filteredAlbums.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
        const albumsToRender = isFullPage ? sortedAlbums : sortedAlbums.slice(0, ITEM_LIMIT);
    
        albumsToRender.forEach((album, index) => {
            const originalIndex = albums.indexOf(album);
            const albumItem = document.createElement('div');
            albumItem.classList.add('album-item', 'reveal-on-scroll');
            albumItem.dataset.index = originalIndex;
            albumItem.style.setProperty('--stagger-index', index);
    
            const tagsHtml = `
                <div class="song-tags-container">
                    ${(album.languages || []).map((lang, i) => `<div class="song-tag language-tag" data-tag="${lang.toLowerCase()}" data-type="language" style="--tag-delay: ${i * 0.1}s">${lang}</div>`).join('')}
                    ${(album.tags || []).slice(0, 3).map((tag, i) => `<div class="song-tag genre-tag" data-tag="${tag.toLowerCase()}" data-type="genre" style="--tag-delay: ${(i + (album.languages || []).length) * 0.1}s">${tag}</div>`).join('')}
                </div>
            `;
    
            albumItem.innerHTML = `
                <img src="${album.img}" alt="${album.title}" class="album-item-img">
                <div class="album-info">
                    <div class="album-title">${album.title}</div>
                    <div class="album-status">${formatRelativeDate(album.releaseDate)}</div>
                    ${tagsHtml}
                </div>
                <div class="album-controls">
                    <button class="album-play-btn" data-index="${originalIndex}" ${!album.sampleUrl ? 'disabled' : ''}>
                        ${playIcon}
                        ${nowPlayingIndicator}
                    </button>
                    <button class="album-info-btn" data-index="${originalIndex}"><i class="fas fa-info-circle"></i></button>
                </div>
            `;
            albumList.appendChild(albumItem);
        });
    
        const viewAllContainer = document.getElementById('discography-view-all-container');
        viewAllContainer.innerHTML = '';
        if (sortedAlbums.length > ITEM_LIMIT && !isFullPage) {
            const remaining = sortedAlbums.length - ITEM_LIMIT;
            const viewAllBtn = document.createElement('a');
            viewAllBtn.href = '/discography';
            viewAllBtn.className = 'view-all-btn';
            viewAllBtn.innerHTML = `<span>View All (${remaining} more) <i class="fas fa-arrow-right arrow-icon"></i></span>`;
            viewAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                history.pushState({ page: 'discography', search: searchTerm, filter: activeMusicFilters }, '', '/discography');
                handleRouting(true);
            });
            viewAllContainer.appendChild(viewAllBtn);
        }
        setupScrollAnimations();
    };

    const renderVideoGallery = (isFullPage = false) => {
        const searchTerm = videoSearchBar.value.toLowerCase();
        const videoSection = document.getElementById('video-gallery-section');
        let filteredVideos = albums.filter(song => song.musicVideoId);
    
        if (searchTerm) {
            filteredVideos = filteredVideos.filter(video => video.title.toLowerCase().includes(searchTerm));
        }
    
        if (activeVideoFilters.length > 0) {
            filteredVideos = filteredVideos.filter(video => {
                const videoTags = [...(video.tags || []), ...(video.languages || [])].map(t => t.toLowerCase());
                return activeVideoFilters.every(filter => videoTags.includes(filter));
            });
        }
    
        videoGalleryContainer.innerHTML = '';
        videoCount.textContent = `(${filteredVideos.length})`;
    
        if (filteredVideos.length === 0 && !isFullPage) {
            videoSection.style.display = 'none';
            return;
        }
        videoSection.style.display = 'block';
    
        const videosToRender = isFullPage ? filteredVideos : filteredVideos.slice(0, ITEM_LIMIT);
    
        videosToRender.forEach((video, index) => {
            const videoItem = document.createElement('div');
            videoItem.className = 'video-item reveal-on-scroll';
            videoItem.dataset.videoId = video.musicVideoId;
            videoItem.style.setProperty('--stagger-index', index);
            videoItem.innerHTML = `
                <img src="https://i3.ytimg.com/vi/${video.musicVideoId}/maxresdefault.jpg" alt="${video.title} video thumbnail" class="video-thumbnail">
                <div class="play-icon-overlay"><i class="fas fa-play"></i></div>
                <div class="video-info">
                    <h3 class="video-title">${video.title}</h3>
                </div>
            `;
            videoGalleryContainer.appendChild(videoItem);
        });
    
        const viewAllContainer = document.getElementById('video-view-all-container');
        viewAllContainer.innerHTML = '';
        if (filteredVideos.length > ITEM_LIMIT && !isFullPage) {
            const remaining = filteredVideos.length - ITEM_LIMIT;
            const viewAllBtn = document.createElement('a');
            viewAllBtn.href = '/videos';
            viewAllBtn.className = 'view-all-btn';
            viewAllBtn.innerHTML = `<span>View All (${remaining} more) <i class="fas fa-arrow-right arrow-icon"></i></span>`;
            viewAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                history.pushState({ page: 'videos', search: searchTerm, filter: activeVideoFilters }, '', '/videos');
                handleRouting(true);
            });
            viewAllContainer.appendChild(viewAllBtn);
        }
        setupScrollAnimations();
    };

    const setupVideoPlayer = () => {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
            ytPlayer = new YT.Player('youtube-player', {
                height: '100%',
                width: '100%',
                playerVars: {
                    'playsinline': 1,
                    'autoplay': 1,
                    'controls': 1,
                    'rel': 0,
                    'modestbranding': 1
                }
            });
        };

        videoGalleryContainer.addEventListener('click', e => {
            const videoItem = e.target.closest('.video-item');
            if (videoItem) {
                const videoId = videoItem.dataset.videoId;
                if (isPlaying) {
                    audioPlayer.pause();
                }
                videoTheater.classList.add('active');
                if (ytPlayer && ytPlayer.loadVideoById) {
                    ytPlayer.loadVideoById(videoId);
                }
            }
        });

        const closeVideo = () => {
            videoTheater.classList.remove('active');
            if (ytPlayer && ytPlayer.stopVideo) {
                ytPlayer.stopVideo();
            }
        };

        videoCloseBtn.addEventListener('click', closeVideo);
        videoTheater.addEventListener('click', e => {
            if (e.target === videoTheater) {
                closeVideo();
            }
        });
    };


    const updatePlayingUI = () => {
        const allSongElements = document.querySelectorAll('[data-index]');

        allSongElements.forEach(el => {
            const elIndex = parseInt(el.dataset.index, 10);
            const playBtn = el.querySelector('.album-play-btn');

            if (elIndex === currentSongIndex && isPlaying) {
                el.classList.add('playing');
                if (playBtn) {
                    playBtn.classList.add('playing');
                    playBtn.innerHTML = `${pauseIcon}${nowPlayingIndicator}`;
                }
            } else {
                el.classList.remove('playing');
                if (playBtn) {
                    playBtn.classList.remove('playing');
                    playBtn.innerHTML = `${playIcon}${nowPlayingIndicator}`;
                }
            }
        });

        const songPagePlayBtns = songPage.querySelectorAll('.song-page-play-btn');
        songPagePlayBtns.forEach(btn => {
            const btnIndex = parseInt(btn.dataset.index, 10);
            if (btnIndex === currentSongIndex && isPlaying) {
                btn.innerHTML = pauseIcon;
            } else {
                btn.innerHTML = playIcon;
            }
        });
    };


    const updateAlbumArtGlow = () => {
        if (playerAlbumArt.complete) {
            try {
                const dominantColor = colorThief.getColor(playerAlbumArt);
                if (dominantColor) {
                    playerAlbumArt.style.boxShadow = `0 0 15px rgba(${dominantColor.join(',')}, 0.7)`;
                }
            } catch (e) {
                console.error("Could not get color from image.", e);
                playerAlbumArt.style.boxShadow = `0 0 15px var(--primary-color)`;
            }
        } else {
            playerAlbumArt.addEventListener('load', () => {
                try {
                    const dominantColor = colorThief.getColor(playerAlbumArt);
                    if (dominantColor) {
                        playerAlbumArt.style.boxShadow = `0 0 15px rgba(${dominantColor.join(',')}, 0.7)`;
                    }
                } catch (e) {
                    console.error("Could not get color from image.", e);
                    playerAlbumArt.style.boxShadow = `0 0 15px var(--primary-color)`;
                }
            }, { once: true });
        }
    };

    const componentToHex = (c) => {
        const hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

    const rgbToHex = (r, g, b) => {
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

    const getVibrantPalette = (palette) => {
        if (!palette || palette.length === 0) return null;

        const scoredPalette = palette.map(color => {
            const [r, g, b] = color;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const sat = (max === 0) ? 0 : (max - min) / max;
            const brightness = max / 255;
            const score = sat * 0.7 + brightness * 0.3;
            return { color, score };
        });

        scoredPalette.sort((a, b) => b.score - a.score);

        const topColors = scoredPalette.slice(0, 3).map(item => item.color);

        while (topColors.length < 3) {
            topColors.push(topColors[0] || [138, 43, 226]);
        }

        return topColors;
    };

    const setupAudioContext = () => {
        if (audioContext) return;
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        sourceNode = audioContext.createMediaElementSource(audioPlayer);

        sourceNode.connect(analyser);
        analyser.connect(audioContext.destination);

        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
    };

    const playSong = (index) => {
        if (index < 0 || index >= albums.length) return;

        if (!audioContext) {
            setupAudioContext();
        }

        const song = albums[index];
        if (song.sampleUrl) {
            currentSongIndex = index;
            audioPlayer.src = song.sampleUrl;
            audioPlayer.play();
            isPlaying = true;

            playerAlbumArt.src = song.img;
            playerSongTitle.textContent = song.title;
            globalPlayer.classList.add('active');
            playerInfoBtn.disabled = false;

            const tempImg = new Image();
            tempImg.crossOrigin = "Anonymous";
            tempImg.src = song.img;
            tempImg.onload = () => {
                try {
                    const palette = colorThief.getPalette(tempImg, 8);
                    currentPalette = getVibrantPalette(palette);

                    if (currentPalette && currentPalette.length >= 3) {
                        document.body.style.setProperty('--aurora-color-1', `rgb(${currentPalette[0].join(',')})`);
                        document.body.style.setProperty('--aurora-color-2', `rgb(${currentPalette[1].join(',')})`);
                        document.body.style.setProperty('--aurora-color-3', `rgb(${currentPalette[2].join(',')})`);
                        document.body.style.setProperty('--primary-color', rgbToHex(currentPalette[0][0], currentPalette[0][1], currentPalette[0][2]));
                    }

                } catch (e) {
                    console.error("Could not get color from image.", e);
                    document.body.style.removeProperty('--aurora-color-1');
                    document.body.style.removeProperty('--aurora-color-2');
                    document.body.style.removeProperty('--aurora-color-3');
                    document.body.style.removeProperty('--primary-color');
                    currentPalette = [];
                }
            };
            updateAlbumArtGlow();
        }
        updatePlayingUI();
        playerPlayPauseBtn.innerHTML = pauseIcon;
    };


    const togglePlayPause = () => {
        if (audioPlayer.src) {
            if (isPlaying) {
                audioPlayer.pause();
            } else {
                if (!audioContext) setupAudioContext();
                audioPlayer.play();
            }
        } else if (albums.length > 0) {
            const firstPlayable = albums.findIndex(song => song.sampleUrl);
            if (firstPlayable > -1) playSong(firstPlayable);
        }
    };

    const closePlayer = () => {
        audioPlayer.pause();
        audioPlayer.src = '';
        currentSongIndex = -1;
        isPlaying = false;
        globalPlayer.classList.remove('active');
        playerInfoBtn.disabled = true;
        updatePlayingUI();

        document.body.style.removeProperty('--primary-color');
        document.body.style.removeProperty('--aurora-color-1');
        document.body.style.removeProperty('--aurora-color-2');
        document.body.style.removeProperty('--aurora-color-3');
    };


    const handleAlbumControlsClick = (e) => {
        const playBtn = e.target.closest('.album-play-btn');
        const infoBtn = e.target.closest('.album-info-btn');
        const container = e.target.closest('[data-index]');

        if (!container) return;

        if (playBtn) {
            e.stopPropagation();
            const index = parseInt(container.dataset.index, 10);
            if (!albums[index].sampleUrl) return;
            if (index === currentSongIndex) {
                togglePlayPause();
            } else {
                playSong(index);
            }
        }
        if (infoBtn) {
            e.stopPropagation();
            const index = parseInt(container.dataset.index, 10);
            const songTitle = albums[index].title.toLowerCase().replace(/\s+/g, '-');
            history.pushState({ songIndex: index }, '', `/song/${encodeURIComponent(songTitle)}`);
            handleRouting(true);
        }
    }


    albumList.addEventListener('click', handleAlbumControlsClick);
    upcomingReleasesContainer.addEventListener('click', handleAlbumControlsClick);
    featuredGalleryContainer.addEventListener('click', handleAlbumControlsClick);

    const handleSearch = (e, type) => {
        const isFullPage = window.location.pathname.startsWith(`/${type}`);
        if (type === 'discography') {
            renderAlbums(isFullPage);
            debouncedUpdateURL(type, e.target.value, activeMusicFilters);
        } else if (type === 'videos') {
            renderVideoGallery(isFullPage);
            debouncedUpdateURL(type, e.target.value, activeVideoFilters);
        }
    };

    searchBar.addEventListener('input', (e) => handleSearch(e, 'discography'));
    videoSearchBar.addEventListener('input', (e) => handleSearch(e, 'videos'));


    const updateMetaTags = (data) => {
        document.title = data.title;
        document.querySelector('meta[name="description"]').setAttribute('content', data.description);

        document.querySelector('meta[property="og:title"]').setAttribute('content', data.title);
        document.querySelector('meta[property="og:description"]').setAttribute('content', data.description);
        document.querySelector('meta[property="og:url"]').setAttribute('content', data.url);
        document.querySelector('meta[property="og:image"]').setAttribute('content', data.image);
        document.querySelector('meta[property="og:type"]').setAttribute('content', data.type);

        document.querySelector('meta[property="twitter:title"]').setAttribute('content', data.title);
        document.querySelector('meta[property="twitter:description"]').setAttribute('content', data.description);
        document.querySelector('meta[property="twitter:url"]').setAttribute('content', data.url);
        document.querySelector('meta[property="twitter:image"]').setAttribute('content', data.image);
    };

    const resetMetaTags = () => updateMetaTags(siteDefaults);

    const renderSongPage = (index) => {
        const song = albums[index];
        if (!song) {
            mainContent.style.display = 'flex';
            songPage.classList.remove('active');
            resetMetaTags();
            return;
        }
    
        const songMeta = {
            title: `${song.title} | x08`,
            description: song.comingSoon
                ? `Listen to "${song.title}" by x08. Releasing soon.`
                : `Listen to "${song.title}" by x08. Released on ${formatRelativeDate(song.releaseDate, true)}.`,
            url: `${siteDefaults.url}song/${encodeURIComponent(song.title.toLowerCase().replace(/\s+/g, '-'))}`,
            image: song.img,
            type: 'music.song'
        };
        updateMetaTags(songMeta);
    
        const isComingSoon = song.comingSoon;
    
        const linksHtml = isComingSoon ?
            Object.entries(social_links).map(([platform, url]) => {
                if (!url) return '';
                const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
                const iconMap = {
                    'spotify': 'fab fa-spotify',
                    'youtube': 'fab fa-youtube',
                    'soundcloud': 'fab fa-soundcloud',
                    'tidal': 'fa-brands fa-tidal',
                    'apple': 'fa-brands fa-itunes-note',
                    'amazon': 'fab fa-amazon',
                    'iheart': 'fa-solid fa-radio',
                    'pandora': 'fab fa-pandora'
                };
                const icon = iconMap[platform] || 'fas fa-music';
    
                return `
                    <a href="${url}" target="_blank" class="social-link coming-soon-link">
                        <i class="${icon} social-icon"></i> ${platformName}
                    </a>`;
            }).join('') :
            song.links.map(link => `
                <a href="${link.url}" target="_blank" class="social-link">
                    <i class="${link.icon} social-icon"></i> ${link.platform}
                </a>
            `).join('');
    
        const videoSectionHtml = song.musicVideoId ? `
            <div class="song-page-video-section reveal-on-scroll">
                <h3>Official Video</h3>
                <div class="song-page-video-wrapper">
                    <iframe 
                        src="https://www.youtube.com/embed/${song.musicVideoId}?rel=0" 
                        title="YouTube video player" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>
            </div>
        ` : '';
    
        const pageContent = `
            <div class="song-page-header">
                <div class="sticky-header-content">
                    <button class="song-page-back-btn"><i class="fas fa-arrow-left"></i></button>
                    <img src="${song.img}" alt="${song.title}" class="sticky-img" crossorigin="anonymous">
                    <h3 class="sticky-title">${song.title}</h3>
                    <div class="sticky-controls">
                        <button class="song-page-play-btn sticky-play-btn" data-index="${index}" ${!song.sampleUrl ? 'disabled' : ''}>${(currentSongIndex === index && isPlaying) ? pauseIcon : playIcon}</button>
                        <button class="song-page-share-btn sticky-share-btn" aria-label="Share song">
                            <i class="fas fa-share-alt share-icon"></i>
                            <i class="fas fa-check check-icon"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="song-page-container">
                <div class="song-page-hero">
                    <img src="${song.img}" alt="${song.title}" class="song-page-img" crossorigin="anonymous">
                    <div class="song-page-hero-info">
                        <h2 class="song-page-title">${song.title}</h2>
                        <p class="song-page-release-date">${formatRelativeDate(song.releaseDate, true)}</p>
                        <div class="song-page-hero-controls">
                            <button class="song-page-play-btn" data-index="${index}" ${!song.sampleUrl ? 'disabled' : ''}>${(currentSongIndex === index && isPlaying) ? pauseIcon : playIcon}</button>
                            <button class="song-page-share-btn" aria-label="Share song">
                                <i class="fas fa-share-alt share-icon"></i>
                                <i class="fas fa-check check-icon"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="song-page-content">
                    ${videoSectionHtml}
                    <div class="song-page-details reveal-on-scroll">
                        <div class="tab-nav">
                            <button class="tab-btn active" data-tab="links">${isComingSoon ? 'Available Soon On' : 'Listen On'}</button>
                            <button class="tab-btn" data-tab="lyrics">Lyrics</button>
                        </div>
                        <div class="tab-content">
                            <div class="tab-pane active" id="tab-links">
                                <div class="modal-links">${linksHtml}</div>
                            </div>
                            <div class="tab-pane" id="tab-lyrics">
                                <pre>${song.lyrics || 'Lyrics not available yet.'}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        songPage.innerHTML = pageContent;
        songPageBackground.innerHTML = ''; // Clear previous background

        if (song.canvasUrl) {
            const videoBg = document.createElement('video');
            videoBg.className = 'bg-video';
            videoBg.src = song.canvasUrl;
            videoBg.autoplay = true;
            videoBg.loop = true;
            videoBg.muted = true;
            videoBg.playsInline = true;
            songPageBackground.appendChild(videoBg);
        } else {
            const imageBg = document.createElement('div');
            imageBg.className = 'bg-image';
            imageBg.style.backgroundImage = `url(${song.img})`;
            songPageBackground.appendChild(imageBg);
        }
    
        mainContent.style.display = 'none';
        songPage.classList.add('active');
    
        const tabNav = songPage.querySelector('.tab-nav');
        tabNav.addEventListener('click', e => {
            if (e.target.classList.contains('tab-btn')) {
                const targetTab = e.target.dataset.tab;
    
                tabNav.querySelector('.active').classList.remove('active');
                e.target.classList.add('active');
    
                const content = songPage.querySelector('.tab-content');
                content.querySelector('.active').classList.remove('active');
                content.querySelector(`#tab-${targetTab}`).classList.add('active');
            }
        });
    
        setupScrollAnimations();
    
        const songPageImg = songPage.querySelector('.song-page-img');
        const applyGlow = () => {
            try {
                const dominantColor = colorThief.getColor(songPageImg);
                if (dominantColor) {
                    songPageImg.style.setProperty('--glow-color', `rgba(${dominantColor.join(',')}, 0.7)`);
                }
            } catch (e) {
                console.error("Could not get color from image.", e);
                songPageImg.style.setProperty('--glow-color', 'var(--primary-color)');
            }
        };
    
        if (songPageImg.complete) {
            applyGlow();
        } else {
            songPageImg.addEventListener('load', applyGlow, { once: true });
        }
    
        if (songPage.observer) {
            songPage.observer.disconnect();
        }
    
        const headerEl = songPage.querySelector('.song-page-header');
        const heroEl = songPage.querySelector('.song-page-hero');
        const observer = new IntersectionObserver(
            ([entry]) => {
                headerEl.classList.toggle('scrolled', !entry.isIntersecting);
            },
            { rootMargin: "0px", threshold: 0.1 }
        );
        observer.observe(heroEl);
        songPage.observer = observer;
    
        songPage.querySelector('.song-page-back-btn').addEventListener('click', () => {
            if (songPage.observer) {
                songPage.observer.disconnect();
            }
            history.pushState(null, '', '/');
            handleRouting(true);
        });
    
        songPage.querySelectorAll('.song-page-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index, 10);
                if (!albums[index].sampleUrl) return;
                if (index === currentSongIndex) {
                    togglePlayPause();
                } else {
                    playSong(index);
                }
            });
        });
    
        songPage.querySelectorAll('.song-page-share-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const songTitle = song.title;
                const url = window.location.href;
                const shareData = {
                    title: `x08 - ${songTitle}`,
                    text: `Check out "${songTitle}" by x08!`,
                    url: url,
                };
    
                if (navigator.share) {
                    try {
                        await navigator.share(shareData);
                    } catch (err) {
                        console.error("Error sharing:", err);
                    }
                } else {
                    try {
                        await navigator.clipboard.writeText(url);
                        btn.classList.add('copied');
                        setTimeout(() => {
                            btn.classList.remove('copied');
                        }, 2000);
                    } catch (err) {
                        console.error('Failed to copy: ', err);
                        alert('Failed to copy link.');
                    }
                }
            });
        });
    };

    const closeModal = (modal) => {
        modal.classList.remove('active');
    };

    const getNextPlayableSong = (startIndex, direction) => {
        let nextIndex = (startIndex + direction + albums.length) % albums.length;
        let checked = 0;
        while (!albums[nextIndex].sampleUrl && checked < albums.length) {
            nextIndex = (nextIndex + direction + albums.length) % albums.length;
            checked++;
        }
        return albums[nextIndex].sampleUrl ? nextIndex : -1;
    }

    playerPlayPauseBtn.addEventListener('click', togglePlayPause);
    playerNextBtn.addEventListener('click', () => {
        const nextIndex = getNextPlayableSong(currentSongIndex, 1);
        if (nextIndex > -1) playSong(nextIndex);
    });
    playerPrevBtn.addEventListener('click', () => {
        const prevIndex = getNextPlayableSong(currentSongIndex, -1);
        if (prevIndex > -1) playSong(prevIndex);
    });
    playerInfoBtn.addEventListener('click', () => {
        if (currentSongIndex !== -1) {
            const song = albums[currentSongIndex];
            const songTitle = song.title.toLowerCase().replace(/\s+/g, '-');
            history.pushState({ songIndex: currentSongIndex }, '', `/song/${encodeURIComponent(songTitle)}`);
            handleRouting(true);
        }
    });
    playerCloseBtn.addEventListener('click', closePlayer);


    audioPlayer.addEventListener('play', () => {
        isPlaying = true;
        faviconAnimationActive = true;
        playerPlayPauseBtn.innerHTML = pauseIcon;
        updatePlayingUI();
        requestAnimationFrame(animationLoop);
    });

    audioPlayer.addEventListener('pause', () => {
        isPlaying = false;
        faviconAnimationActive = false;
        faviconLink.href = originalFavicon;
        playerPlayPauseBtn.innerHTML = playIcon;
        updatePlayingUI();
        visualizerCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    });

    audioPlayer.addEventListener('ended', () => {
        const nextIndex = getNextPlayableSong(currentSongIndex, 1);
        if (nextIndex > -1) playSong(nextIndex);
    });

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const updateProgress = () => {
        if (!isSeeking && !isNaN(audioPlayer.duration)) {
            const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            playerProgressBar.style.width = `${progress}%`;
            playerCurrentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        }
    };

    const animationLoop = () => {
        if (!isPlaying && !faviconAnimationActive) return;

        updateProgress();

        if (audioContext && isPlaying) {
            analyser.getByteFrequencyData(dataArray);
            drawVisualizer();
            if (faviconAnimationActive) {
                drawFavicon();
            }
        }

        requestAnimationFrame(animationLoop);
    };

    const drawVisualizer = () => {
        visualizerCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

        const barWidth = 3;
        const gap = 2;
        const numBars = Math.floor(visualizerCanvas.width / (barWidth + gap));
        let x = 0;

        const gradient = visualizerCtx.createLinearGradient(0, 0, 0, visualizerCanvas.height);
        if (currentPalette && currentPalette.length >= 2) {
            gradient.addColorStop(0, `rgb(${currentPalette[0].join(',')})`);
            gradient.addColorStop(1, `rgb(${currentPalette[1].join(',')})`);
        } else {
            const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
            const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color');
            gradient.addColorStop(0, primaryColor);
            gradient.addColorStop(1, secondaryColor);
        }
        visualizerCtx.fillStyle = gradient;

        for (let i = 0; i < numBars; i++) {
            const dataIndex = Math.floor(i * (bufferLength / numBars));
            const barHeight = (dataArray[dataIndex] / 255) * visualizerCanvas.height;

            visualizerCtx.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight);
            x += barWidth + gap;
        }
    };

    const drawFavicon = () => {
        faviconCtx.clearRect(0, 0, 64, 64);

        if (baseFaviconImg.complete) {
            faviconCtx.drawImage(baseFaviconImg, 0, 0, 64, 64);
        }

        const primaryColor = (currentPalette && currentPalette.length > 0)
            ? `rgb(${currentPalette[0].join(',')})`
            : getComputedStyle(document.documentElement).getPropertyValue('--primary-color');

        faviconCtx.fillStyle = primaryColor;

        const barWidth = 8;
        const spacing = 4;
        const totalBarsWidth = (3 * barWidth) + (2 * spacing);
        let x = 64 - totalBarsWidth - 4;

        for (let i = 0; i < 3; i++) {
            const dataIndex = Math.floor(i * (bufferLength / 4));
            const barHeight = (dataArray[dataIndex] / 255) * 24 + 4;
            faviconCtx.fillRect(x, 64 - barHeight - 4, barWidth, barHeight);
            x += barWidth + spacing;
        }

        faviconLink.href = faviconCanvas.toDataURL('image/png');
    };

    audioPlayer.addEventListener('loadedmetadata', () => {
        playerDurationEl.textContent = formatTime(audioPlayer.duration);
    });

    const setSongPosition = (e) => {
        if (!isNaN(audioPlayer.duration)) {
            const rect = progressBarBg.getBoundingClientRect();
            const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
            let newPosition = (clientX - rect.left) / rect.width;

            newPosition = Math.max(0, Math.min(1, newPosition));

            const newTime = newPosition * audioPlayer.duration;
            audioPlayer.currentTime = newTime;

            playerProgressBar.style.width = `${newPosition * 100}%`;
            playerCurrentTimeEl.textContent = formatTime(newTime);
        }
    };

    const startSeeking = (e) => {
        e.preventDefault();
        isSeeking = true;
        setSongPosition(e);
        document.addEventListener('mousemove', setSongPosition);
        document.addEventListener('touchmove', setSongPosition);
        document.addEventListener('mouseup', stopSeeking);
        document.addEventListener('touchend', stopSeeking);
    };

    const stopSeeking = () => {
        isSeeking = false;
        document.removeEventListener('mousemove', setSongPosition);
        document.removeEventListener('touchmove', setSongPosition);
        document.removeEventListener('mouseup', stopSeeking);
        document.removeEventListener('touchend', stopSeeking);
    };

    progressBarBg.addEventListener('mousedown', startSeeking);
    progressBarBg.addEventListener('touchstart', startSeeking, { passive: false });

    modalCloseBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(linksModal);
            closeModal(socialModal);
        });
    });

    document.addEventListener('click', (e) => {
        if (e.target === linksModal) closeModal(linksModal);
        if (e.target === socialModal) closeModal(socialModal);

        if (window.innerWidth > 768) {
            const isSocialsToggle = e.target.closest('.socials-toggle-btn');
            const isDropdown = e.target.closest('.socials-dropdown-container');
            if (!isSocialsToggle && !isDropdown && socialsDropdown.classList.contains('active')) {
                socialsToggleBtn.classList.remove('active');
                socialsDropdown.classList.remove('active');
                socialsToggleBtn.setAttribute('aria-expanded', 'false');
            }
        }
    });
    
    const handleRouting = (isPushState = false) => {
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 0);
    
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        const searchTerm = params.get('search') || '';
        const filterTerm = params.get('filter') || '';
    
        document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
        songPage.classList.remove('active');
        mainContent.style.display = 'flex';
    
        if (path.startsWith('/song/')) {
            const songTitleSlug = decodeURIComponent(path.split('/song/')[1]);
            const songIndex = albums.findIndex(album => album.title.toLowerCase().replace(/\s+/g, '-') === songTitleSlug);
            if (songIndex !== -1) {
                renderSongPage(songIndex);
            } else {
                history.replaceState(null, '', '/');
                handleRouting();
            }
        } else if (path.startsWith('/discography')) {
            const discographySection = document.getElementById('discography-section');
            discographySection.style.display = 'block';
            searchBar.value = searchTerm;
            activeMusicFilters = filterTerm ? filterTerm.split(',') : [];
            renderActiveFilters('music');
            renderAlbums(true);
            updateMetaTags({
                title: `Discography | x08`,
                description: `Browse all ${albums.filter(a => !a.comingSoon).length} releases from x08.`,
                url: `${siteDefaults.url}discography`,
                image: siteDefaults.image,
                type: 'website'
            });
        } else if (path.startsWith('/videos')) {
            const videoSection = document.getElementById('video-gallery-section');
            videoSection.style.display = 'block';
            videoSearchBar.value = searchTerm;
            activeVideoFilters = filterTerm ? filterTerm.split(',') : [];
            renderActiveFilters('video');
            renderVideoGallery(true);
            updateMetaTags({
                title: `Videos | x08`,
                description: `Watch all official music videos from x08.`,
                url: `${siteDefaults.url}videos`,
                image: siteDefaults.image,
                type: 'website'
            });
        } else {
            document.querySelectorAll('.content-section').forEach(s => s.style.display = 'block');
            searchBar.value = '';
            videoSearchBar.value = '';
            activeMusicFilters = [];
            activeVideoFilters = [];
            renderActiveFilters('music');
            renderActiveFilters('video');
            renderFeaturedGallery();
            renderUpcomingReleases();
            renderVideoGallery();
            renderAlbums();
            resetMetaTags();
        }
    };
    
    const renderActiveFilters = (type) => {
        const container = type === 'music' ? musicFiltersContainer : videoFiltersContainer;
        const filters = type === 'music' ? activeMusicFilters : activeVideoFilters;
        container.innerHTML = '';
        filters.forEach(filter => {
            const tagEl = document.createElement('div');
            const originalTag = albums.flatMap(a => [...(a.tags || []), ...(a.languages || [])]).find(t => t.toLowerCase() === filter);
            const tagType = albums.some(a => (a.languages || []).map(l=>l.toLowerCase()).includes(filter)) ? 'language' : 'genre';
            tagEl.className = `filter-tag ${tagType}-tag`;
            tagEl.innerHTML = `
                <span>${originalTag}</span>
                <button class="remove-filter-btn" data-tag="${filter}">×</button>
            `;
            container.appendChild(tagEl);
        });
    }

    const handleTagClick = (e) => {
        const tagEl = e.target.closest('.song-tag');
        if (tagEl) {
            e.preventDefault();
            const tag = tagEl.dataset.tag;
            const type = e.target.closest('#video-gallery-section') ? 'video' : 'music';
            let activeFilters = type === 'music' ? activeMusicFilters : activeVideoFilters;
    
            if (!activeFilters.includes(tag)) {
                activeFilters.push(tag);
            }
    
            const page = type === 'music' ? 'discography' : 'videos';
            const search = type === 'music' ? searchBar.value : videoSearchBar.value;
            
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (activeFilters.length > 0) params.set('filter', activeFilters.join(','));
            
            const url = `/${page}${params.toString() ? `?${params.toString()}` : ''}`;
    
            history.pushState({ page, search, filter: activeFilters }, '', url);
            handleRouting(true);
        }
    };
    
    const handleFilterRemove = (e) => {
        const removeBtn = e.target.closest('.remove-filter-btn');
        if (removeBtn) {
            const tag = removeBtn.dataset.tag;
            const type = e.target.closest('#video-gallery-section') ? 'video' : 'music';
            if (type === 'music') {
                activeMusicFilters = activeMusicFilters.filter(f => f !== tag);
                renderAlbums(window.location.pathname.startsWith('/discography'));
                renderActiveFilters('music');
                 debouncedUpdateURL('discography', searchBar.value, activeMusicFilters);
            } else {
                activeVideoFilters = activeVideoFilters.filter(f => f !== tag);
                renderVideoGallery(window.location.pathname.startsWith('/videos'));
                renderActiveFilters('video');
                debouncedUpdateURL('videos', videoSearchBar.value, activeVideoFilters);
            }
        }
    };
    
    document.body.addEventListener('click', handleTagClick);
    musicFiltersContainer.addEventListener('click', handleFilterRemove);
    videoFiltersContainer.addEventListener('click', handleFilterRemove);

    logoLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.location.pathname !== '/') {
            history.pushState({ page: 'home' }, '', '/');
            handleRouting(true);
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    mainNav.addEventListener('click', (e) => {
        const navLink = e.target.closest('.nav-link');
        if (navLink) {
            e.preventDefault();
            const href = navLink.getAttribute('href');

            if (window.location.pathname === href) return;

            if (window.innerWidth <= 768 && socialsDropdown.classList.contains('active')) {
                socialsToggleBtn.classList.remove('active');
                socialsDropdown.classList.remove('active');
                socialsToggleBtn.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            }

            history.pushState({ page: href.substring(1) }, '', href);
            handleRouting(true);
        }
    });

    window.addEventListener('popstate', (e) => {
        handleRouting();
    });

    const setupCursorFollower = () => {
        const cursorDot = document.querySelector('.cursor-dot');
        const cursorOutline = document.querySelector('.cursor-outline');

        window.addEventListener('mousemove', e => {
            const posX = e.clientX;
            const posY = e.clientY;

            cursorDot.style.left = `${posX}px`;
            cursorDot.style.top = `${posY}px`;

            const isHovered = cursorOutline.classList.contains('hovered');
            const animationDuration = isHovered ? 200 : 500;

            cursorOutline.animate({
                left: `${posX}px`,
                top: `${posY}px`
            }, { duration: animationDuration, fill: "forwards" });
        });

        const interactiveElements = document.querySelectorAll('a, button, .album-item, .toggle-label, .slider-btn, .pagination-dot, .progress-bar-bg, .video-item, .artist-pick-item, .song-tag, .featured-slide, .featured-nav-btn, .upcoming-item');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursorDot.classList.add('hovered');
                cursorOutline.classList.add('hovered');
            });
            el.addEventListener('mouseleave', () => {
                cursorDot.classList.remove('hovered');
                cursorOutline.classList.remove('hovered');
            });
        });

        document.body.addEventListener('mouseenter', () => {
            document.body.classList.add('cursor-visible');
        });
        document.body.addEventListener('mouseleave', () => {
            document.body.classList.remove('cursor-visible');
        });
    };

    const setupScrollAnimations = () => {
        const observer = new IntersectionObserver((entries, observerInstance) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('is-visible');
                    }, 200);
                    observerInstance.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        const elementsToReveal = document.querySelectorAll('.reveal-on-scroll');
        elementsToReveal.forEach(el => {
            if (el.getBoundingClientRect().top < window.innerHeight) {
                 setTimeout(() => {
                        el.classList.add('is-visible');
                    }, 200 * (parseInt(el.style.getPropertyValue('--stagger-index')) || 0));
                observer.unobserve(el);
            } else {
                observer.observe(el);
            }
        });
    };

    featuredNextBtn.addEventListener('click', () => {
        updateCarouselState(currentFeatureIndex + 1);
        resetGalleryInterval();
    });
    
    featuredPrevBtn.addEventListener('click', () => {
        updateCarouselState(currentFeatureIndex - 1);
        resetGalleryInterval();
    });
    
    featuredGalleryContainer.addEventListener('click', e => {
        const slide = e.target.closest('.featured-slide');
        if (slide && slide.classList.contains('is-active') && !e.target.closest('.control-btn')) {
            const index = parseInt(slide.dataset.index, 10);
            const songTitle = albums[index].title.toLowerCase().replace(/\s+/g, '-');
            history.pushState({ songIndex: index }, '', `/song/${encodeURIComponent(songTitle)}`);
            handleRouting(true);
        }
    });

    populateHeaderSocials();
    handleRouting();
    playerInfoBtn.disabled = true;

    setupCursorFollower();
    setupVideoPlayer();

    document.querySelectorAll('.section-header').forEach(el => el.classList.add('reveal-on-scroll'));
    setupScrollAnimations();
}