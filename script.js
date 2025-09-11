document.addEventListener('DOMContentLoaded', () => {
    const configScript = document.createElement('script');
    configScript.src = `/config.js?v=${new Date().getTime()}`;
    
    configScript.onload = () => {
        initializeApp();
    };
    
    document.head.appendChild(configScript);
});

function initializeApp() {
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

    const albumList = document.getElementById('album-list');
    const featuredSongsContainer = document.getElementById('featured-songs');
    const upcomingReleasesContainer = document.getElementById('upcoming-releases');
    const latestReleaseContainer = document.getElementById('latest-release');
    const songPage = document.getElementById('song-page');
    const searchBar = document.getElementById('search-bar');

    const linksModal = document.getElementById('links-modal');
    const socialModal = document.getElementById('social-modal');
    const shareButton = document.querySelector('.share-button');
    const modalTitle = document.getElementById('modal-title');
    const modalLinksContainer = document.getElementById('modal-links');
    const socialModalLinksContainer = socialModal.querySelector('.modal-links');
    const headerSocialLinksContainer = document.querySelector('.header .social-links');
    const modalCloseBtns = document.querySelectorAll('.modal-close-btn');
    const themeToggle = document.getElementById('theme-toggle-checkbox');
    const body = document.body;
    const mainContent = document.querySelector('.main-content');

    // Global Player Elements
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

    // Theme toggle functionality
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

    const createSocialLinkElement = (url, iconClass, text) => {
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.target = '_blank';
        linkElement.classList.add('social-link');

        const icon = document.createElement('i');
        icon.className = iconClass + ' social-icon';

        linkElement.appendChild(icon);
        linkElement.appendChild(document.createTextNode(` ${text}`));
        return linkElement;
    };

    const populateHeaderSocialLinks = () => {
        const moreBtn = headerSocialLinksContainer.querySelector('.social-links-more-btn');
        headerSocialLinksContainer.innerHTML = '';
        headerSocialLinksContainer.appendChild(moreBtn);

        const platforms = {
            'Spotify': { url: social_links.spotify, icon: 'fab fa-spotify' },
            'SoundCloud': { url: social_links.soundcloud, icon: 'fab fa-soundcloud' },
            'YouTube Music': { url: social_links.youtube, icon: 'fab fa-youtube' },
            'Apple Music': { url: social_links.apple, icon: 'fa-brands fa-itunes-note' },
            'Tidal': { url: social_links.tidal, icon: 'fa-brands fa-tidal' },
            'Amazon Music': { url: social_links.amazon, icon: 'fab fa-amazon' },
            'iHeartRadio': { url: social_links.iheart, icon: 'fa-solid fa-radio' },
            'Pandora': { url: social_links.pandora, icon: 'fab fa-pandora' }
        };

        let count = 0;
        for (const [platform, data] of Object.entries(platforms)) {
            if (data.url) {
                const linkElement = createSocialLinkElement(data.url, data.icon, platform);
                if (count >= 4) {
                    linkElement.classList.add('social-link-hidden');
                }
                headerSocialLinksContainer.insertBefore(linkElement, moreBtn);
                count++;
            }
        }
        
        moreBtn.addEventListener('click', () => {
            headerSocialLinksContainer.classList.toggle('expanded');
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
    
    const renderAlbums = (filteredAlbums) => {
        albumList.innerHTML = '';
        const albumsToRender = filteredAlbums || albums;
        
        const sortedAlbums = albumsToRender
            .filter(album => !album.comingSoon)
            .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
        
        sortedAlbums.forEach((album) => {
            const originalIndex = albums.indexOf(album);
            const albumItem = document.createElement('div');
            albumItem.classList.add('album-item');
            albumItem.dataset.index = originalIndex;

            albumItem.innerHTML = `
                <img src="${album.img}" alt="${album.title}" class="album-item-img">
                <div class="album-info">
                    <div class="album-title">${album.title}</div>
                    <div class="album-status">${formatRelativeDate(album.releaseDate)}</div>
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
    };

    const renderFeaturedSongs = () => {
        const featuredSongsSection = document.getElementById('featured-songs-section');
        const container = document.getElementById('featured-songs');
        container.innerHTML = '';
        const featuredSongs = albums.filter(song => song.featured);

        if (featuredSongs.length === 0) {
            featuredSongsSection.style.display = 'none';
            return;
        }
        
        featuredSongsSection.style.display = 'block';

        featuredSongs.forEach(song => {
            const originalIndex = albums.indexOf(song);
            const featuredItem = document.createElement('div');
            featuredItem.classList.add('featured-song');
            featuredItem.dataset.index = originalIndex;
            
            const tagIcon = song.comingSoon ? 'fa-clock' : 'fa-star';
            const tagTitle = song.comingSoon ? 'Coming Soon' : 'Featured Release';

            featuredItem.innerHTML = `
                <div class="featured-song-art">
                    <img src="${song.img}" alt="${song.title}" class="featured-song-img">
                    <div class="featured-tag" title="${tagTitle}">
                        <i class="fas ${tagIcon}"></i>
                    </div>
                </div>
                <div class="featured-song-info">
                    <h2>${song.title}</h2>
                    <p class="release-date">${formatRelativeDate(song.releaseDate)}</p>
                    <div class="featured-song-controls">
                        <button class="album-play-btn control-btn" data-index="${originalIndex}" ${!song.sampleUrl ? 'disabled' : ''}>
                            ${playIcon}
                            ${nowPlayingIndicator}
                        </button>
                        <button class="album-info-btn control-btn" data-index="${originalIndex}"><i class="fas fa-info-circle"></i></button>
                    </div>
                </div>
            `;
            container.appendChild(featuredItem);
        });
        
        setupFeaturedSlider();
    };

    const setupFeaturedSlider = () => {
        const slider = document.querySelector('.featured-songs-slider');
        const container = slider.querySelector('.featured-songs-container');
        const prevBtn = slider.querySelector('.prev-btn');
        const nextBtn = slider.querySelector('.next-btn');
        const paginationContainer = slider.querySelector('.slider-pagination');
        
        let songs = Array.from(container.children);
        const songCount = songs.length;
        
        if (songCount <= 1) {
            prevBtn.classList.add('hidden');
            nextBtn.classList.add('hidden');
            songs[0]?.classList.add('active');
            container.style.justifyContent = 'center';
            return;
        }

        const cloneFirst = songs[0].cloneNode(true);
        const cloneLast = songs[songCount - 1].cloneNode(true);
        container.appendChild(cloneFirst);
        container.insertBefore(cloneLast, songs[0]);
    
        songs = Array.from(container.children);
        let currentIndex = 1;
        let isTransitioning = false;
        let autoplayInterval;
    
        const updateSliderPosition = (instant = false) => {
            const itemWidth = songs[0].offsetWidth;
            const offset = (slider.clientWidth / 2) - (itemWidth / 2) - (currentIndex * itemWidth);
            
            container.style.transition = instant ? 'none' : 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            container.style.transform = `translateX(${offset}px)`;
            
            updateActiveStates();
        };
    
        const updateActiveStates = () => {
            const activeIndex = (currentIndex - 1 + songCount) % songCount;
            songs.forEach((song, index) => {
                let originalIndex = (index - 1 + songCount) % songCount;
                if (index === 0) originalIndex = songCount - 1;
                if (index === songs.length - 1) originalIndex = 0;
    
                song.classList.toggle('active', originalIndex === activeIndex);
            });
            updatePagination(activeIndex);
        };
        
        const updatePagination = (activeIndex) => {
            paginationContainer.innerHTML = '';
            for (let i = 0; i < songCount; i++) {
                const dot = document.createElement('div');
                dot.classList.add('pagination-dot');
                dot.classList.toggle('active', i === activeIndex);
                dot.addEventListener('click', () => {
                    if (isTransitioning) return;
                    currentIndex = i + 1;
                    updateSliderPosition();
                    resetAutoplay();
                });
                paginationContainer.appendChild(dot);
            }
        };
    
        const handleTransitionEnd = () => {
            isTransitioning = false;
            if (currentIndex === 0) {
                currentIndex = songCount;
                updateSliderPosition(true);
            } else if (currentIndex === songs.length - 1) {
                currentIndex = 1;
                updateSliderPosition(true);
            }
        };
    
        const moveTo = (direction) => {
            if (isTransitioning) return;
            isTransitioning = true;
            currentIndex += direction;
            updateSliderPosition();
            resetAutoplay();
        };
    
        const startAutoplay = () => {
            stopAutoplay();
            autoplayInterval = setInterval(() => moveTo(1), 5000);
        };
        const stopAutoplay = () => clearInterval(autoplayInterval);
        const resetAutoplay = () => {
            stopAutoplay();
            startAutoplay();
        };
        
        prevBtn.addEventListener('click', () => moveTo(-1));
        nextBtn.addEventListener('click', () => moveTo(1));
        container.addEventListener('transitionend', handleTransitionEnd);
        slider.addEventListener('mouseenter', stopAutoplay);
        slider.addEventListener('mouseleave', startAutoplay);
        window.addEventListener('resize', () => updateSliderPosition(true));
    
        updateSliderPosition(true);
        startAutoplay();
    };

    const renderUpcomingReleases = () => {
        const upcomingReleasesSection = document.getElementById('upcoming-releases-section');
        upcomingReleasesContainer.innerHTML = '';
        const upcoming = albums.filter(song => song.comingSoon);

        if (upcoming.length === 0) {
            upcomingReleasesSection.style.display = 'none';
            return;
        }
        
        upcomingReleasesSection.style.display = 'block';
        upcoming.sort((a,b) => new Date(a.releaseDate) - new Date(b.releaseDate));

        upcoming.forEach(song => {
            const originalIndex = albums.indexOf(song);
            const upcomingItem = document.createElement('div');
            upcomingItem.classList.add('album-item', 'coming-soon-item');
            upcomingItem.dataset.index = originalIndex;

            upcomingItem.innerHTML = `
                <img src="${song.img}" alt="${song.title}" class="album-item-img">
                <div class="album-info">
                    <div class="album-title">${song.title}</div>
                    <div class="album-status">${formatRelativeDate(song.releaseDate)}</div>
                </div>
                <div class="album-controls">
                    <button class="album-play-btn" data-index="${originalIndex}" ${!song.sampleUrl ? 'disabled' : ''}>
                        ${playIcon}
                        ${nowPlayingIndicator}
                    </button>
                    <button class="album-info-btn" data-index="${originalIndex}"><i class="fas fa-info-circle"></i></button>
                </div>
            `;
             upcomingReleasesContainer.appendChild(upcomingItem);
        });
    };

    const renderLatestRelease = () => {
        latestReleaseContainer.innerHTML = '';
        const latestRelease = albums
            .filter(album => !album.comingSoon && album.releaseDate)
            .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))[0];

        if (!latestRelease) {
            document.getElementById('latest-release-section').style.display = 'none';
            return;
        }

        const originalIndex = albums.indexOf(latestRelease);
        latestReleaseContainer.dataset.index = originalIndex;

        latestReleaseContainer.innerHTML = `
            <div class="latest-release-art">
                <img src="${latestRelease.img}" alt="${latestRelease.title}" class="latest-release-img" crossorigin="anonymous">
            </div>
            <div class="latest-release-info">
                <h2>${latestRelease.title}</h2>
                <p class="release-date">${formatRelativeDate(latestRelease.releaseDate)}</p>
                <div class="latest-release-controls">
                    <button class="album-play-btn control-btn" data-index="${originalIndex}" ${!latestRelease.sampleUrl ? 'disabled' : ''}>
                        ${playIcon}
                        ${nowPlayingIndicator}
                    </button>
                    <button class="album-info-btn control-btn" data-index="${originalIndex}"><i class="fas fa-info-circle"></i></button>
                </div>
            </div>
        `;
        
        const latestImg = latestReleaseContainer.querySelector('.latest-release-img');
        const setAnimationColor = () => {
            try {
                const dominantColor = colorThief.getColor(latestImg);
                if (dominantColor) {
                    latestReleaseContainer.style.setProperty('--animation-color', `rgba(${dominantColor.join(',')}, 0.7)`);
                }
            } catch(e) {
                console.error("Could not get color from image.", e);
            }
        };

        if (latestImg.complete) {
            setAnimationColor();
        } else {
            latestImg.addEventListener('load', setAnimationColor, { once: true });
        }
    };

    const updatePlayingUI = () => {
        const allSongElements = document.querySelectorAll('[data-index]');
        
        allSongElements.forEach(el => {
            const elIndex = parseInt(el.dataset.index, 10);
            const playBtn = el.querySelector('.album-play-btn');

            if (elIndex === currentSongIndex && isPlaying) {
                el.classList.add('playing');
                if(playBtn) {
                    playBtn.classList.add('playing');
                    playBtn.innerHTML = `${pauseIcon}${nowPlayingIndicator}`;
                }
            } else {
                el.classList.remove('playing');
                if(playBtn) {
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


    const playSong = (index) => {
        if (index < 0 || index >= albums.length) return;
        
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
                    const vibrantPalette = getVibrantPalette(palette);

                    if (vibrantPalette && vibrantPalette.length >= 3) {
                        document.body.style.setProperty('--aurora-color-1', `rgb(${vibrantPalette[0].join(',')})`);
                        document.body.style.setProperty('--aurora-color-2', `rgb(${vibrantPalette[1].join(',')})`);
                        document.body.style.setProperty('--aurora-color-3', `rgb(${vibrantPalette[2].join(',')})`);
                        document.body.style.setProperty('--primary-color', rgbToHex(vibrantPalette[0][0], vibrantPalette[0][1], vibrantPalette[0][2]));
                    }

                } catch (e) {
                    console.error("Could not get color from image.", e);
                    document.body.style.removeProperty('--aurora-color-1');
                    document.body.style.removeProperty('--aurora-color-2');
                    document.body.style.removeProperty('--aurora-color-3');
                    document.body.style.removeProperty('--primary-color');
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
                audioPlayer.play();
            }
        } else if (albums.length > 0) {
            const firstPlayable = albums.findIndex(song => song.sampleUrl);
            if(firstPlayable > -1) playSong(firstPlayable);
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

        if(playBtn) {
             const index = parseInt(container.dataset.index, 10);
            if (!albums[index].sampleUrl) return;
            if (index === currentSongIndex) {
                togglePlayPause();
            } else {
                playSong(index);
            }
        }
        if (infoBtn) {
            const index = parseInt(container.dataset.index, 10);
            const songTitle = albums[index].title.toLowerCase().replace(/\s+/g, '-');
            history.pushState({ songIndex: index }, '', `/song/${encodeURIComponent(songTitle)}`);
            renderSongPage(index);
        }
    }


    albumList.addEventListener('click', handleAlbumControlsClick);
    featuredSongsContainer.addEventListener('click', handleAlbumControlsClick);
    upcomingReleasesContainer.addEventListener('click', handleAlbumControlsClick);
    latestReleaseContainer.addEventListener('click', handleAlbumControlsClick);
    
    searchBar.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredAlbums = albums.filter(album => album.title.toLowerCase().includes(searchTerm));
        renderAlbums(filteredAlbums);
    });

    const updateMetaTags = (song) => {
        if (!song) return;

        const title = `${song.title} | x08`;
        const description = song.comingSoon 
            ? `Listen to "${song.title}" by x08. Releasing soon.`
            : `Listen to "${song.title}" by x08. Released on ${formatRelativeDate(song.releaseDate, true)}.`;
        const url = `${siteDefaults.url}song/${encodeURIComponent(song.title.toLowerCase().replace(/\s+/g, '-'))}`;
        const image = song.img;

        document.title = title;
        document.querySelector('meta[name="description"]').setAttribute('content', description);
        
        document.querySelector('meta[property="og:title"]').setAttribute('content', title);
        document.querySelector('meta[property="og:description"]').setAttribute('content', description);
        document.querySelector('meta[property="og:url"]').setAttribute('content', url);
        document.querySelector('meta[property="og:image"]').setAttribute('content', image);
        document.querySelector('meta[property="og:type"]').setAttribute('content', 'music.song');

        document.querySelector('meta[property="twitter:title"]').setAttribute('content', title);
        document.querySelector('meta[property="twitter:description"]').setAttribute('content', description);
        document.querySelector('meta[property="twitter:url"]').setAttribute('content', url);
        document.querySelector('meta[property="twitter:image"]').setAttribute('content', image);
    };

    const resetMetaTags = () => {
        document.title = siteDefaults.title;
        document.querySelector('meta[name="description"]').setAttribute('content', siteDefaults.description);
        
        document.querySelector('meta[property="og:title"]').setAttribute('content', siteDefaults.title);
        document.querySelector('meta[property="og:description"]').setAttribute('content', siteDefaults.description);
        document.querySelector('meta[property="og:url"]').setAttribute('content', siteDefaults.url);
        document.querySelector('meta[property="og:image"]').setAttribute('content', siteDefaults.image);
        document.querySelector('meta[property="og:type"]').setAttribute('content', siteDefaults.type);

        document.querySelector('meta[property="twitter:title"]').setAttribute('content', siteDefaults.title);
        document.querySelector('meta[property="twitter:description"]').setAttribute('content', siteDefaults.description);
        document.querySelector('meta[property="twitter:url"]').setAttribute('content', siteDefaults.url);
        document.querySelector('meta[property="twitter:image"]').setAttribute('content', siteDefaults.image);
    };

    const renderSongPage = (index) => {
        const song = albums[index];
        if (!song) {
            mainContent.style.display = 'flex';
            songPage.classList.remove('active');
            resetMetaTags();
            return;
        }

        updateMetaTags(song);

        const isComingSoon = song.comingSoon;
        
        const linksHtml = isComingSoon ?
            Object.entries(social_links).map(([platform, url]) => {
                if(!url) return '';
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
        
        songPage.style.setProperty('--song-bg-image', `url(${song.img})`);

        songPage.innerHTML = `
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
                    <div class="song-page-lyrics">
                        <h3>Lyrics</h3>
                        <pre>${song.lyrics || 'Lyrics not available yet.'}</pre>
                    </div>
                    <div class="song-page-links">
                        <h3>${isComingSoon ? 'Available Soon On' : 'Listen On'}</h3>
                        <div class="modal-links">
                            ${linksHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;

        mainContent.style.display = 'none';
        songPage.classList.add('active');
        songPage.scrollTop = 0;

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
            mainContent.style.display = 'flex';
            songPage.classList.remove('active');
            songPage.style.removeProperty('--song-bg-image');
            resetMetaTags();
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
        if(nextIndex > -1) playSong(nextIndex);
    });
    playerPrevBtn.addEventListener('click', () => {
        const prevIndex = getNextPlayableSong(currentSongIndex, -1);
        if(prevIndex > -1) playSong(prevIndex);
    });
    playerInfoBtn.addEventListener('click', () => {
        if (currentSongIndex !== -1) {
            const song = albums[currentSongIndex];
            const songTitle = song.title.toLowerCase().replace(/\s+/g, '-');
            history.pushState({ songIndex: currentSongIndex }, '', `/song/${encodeURIComponent(songTitle)}`);
            renderSongPage(currentSongIndex);
        }
    });
    playerCloseBtn.addEventListener('click', closePlayer);


    audioPlayer.addEventListener('play', () => {
        isPlaying = true;
        playerPlayPauseBtn.innerHTML = pauseIcon;
        updatePlayingUI();
        requestAnimationFrame(updateProgress);
    });

    audioPlayer.addEventListener('pause', () => {
        isPlaying = false;
        playerPlayPauseBtn.innerHTML = playIcon;
        updatePlayingUI();
    });
    
    audioPlayer.addEventListener('ended', () => {
        const nextIndex = getNextPlayableSong(currentSongIndex, 1);
        if(nextIndex > -1) playSong(nextIndex);
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
    
        if (isPlaying) {
            requestAnimationFrame(updateProgress);
        }
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

    const openSocialModal = () => {
        socialModalLinksContainer.innerHTML = '';
        const allPlatforms = {
            'Spotify': { url: social_links.spotify, icon: 'fab fa-spotify' },
            'YouTube Music': { url: social_links.youtube, icon: 'fab fa-youtube' },
            'SoundCloud': { url: social_links.soundcloud, icon: 'fab fa-soundcloud' },
            'Tidal': { url: social_links.tidal, icon: 'fa-brands fa-tidal' },
            'Apple Music': { url: social_links.apple, icon: 'fa-brands fa-itunes-note' },
            'Amazon Music': { url: social_links.amazon, icon: 'fab fa-amazon' },
            'iHeartRadio': { url: social_links.iheart, icon: 'fa-solid fa-radio' },
            'Pandora': { url: social_links.pandora, icon: 'fab fa-pandora' }
        };
        for (const [platform, data] of Object.entries(allPlatforms)) {
             if (data.url) {
                const linkElement = createSocialLinkElement(data.url, data.icon, platform);
                socialModalLinksContainer.appendChild(linkElement);
             }
        }
        socialModal.classList.add('active');
    };

    modalCloseBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(linksModal);
            closeModal(socialModal);
        });
    });

    document.addEventListener('click', (e) => {
        if (e.target === linksModal) closeModal(linksModal);
        if (e.target === socialModal) closeModal(socialModal);
    });

    shareButton.addEventListener('click', openSocialModal);
    const handleRouting = () => {
        const path = window.location.pathname;
        if (path.startsWith('/song/')) {
            const songTitleSlug = decodeURIComponent(path.split('/song/')[1]);
            const songIndex = albums.findIndex(album => album.title.toLowerCase().replace(/\s+/g, '-') === songTitleSlug);
            if (songIndex !== -1) {
                renderSongPage(songIndex);
            } else {
                history.replaceState(null, '', '/');
                mainContent.style.display = 'flex';
                songPage.classList.remove('active');
                resetMetaTags();
            }
        } else {
            mainContent.style.display = 'flex';
            songPage.classList.remove('active');
            resetMetaTags();
        }
    };

    window.addEventListener('popstate', (e) => {
        handleRouting();
    });

    populateHeaderSocialLinks();
    renderLatestRelease();
    renderFeaturedSongs();
    renderUpcomingReleases();
    renderAlbums();
    handleRouting();
    playerInfoBtn.disabled = true;
}