// FILE: social.js
// VERSION 2: This is updated to use 'supaClient'

document.addEventListener('DOMContentLoaded', () => {
    
    const speciesFilterSelector = document.getElementById('speciesFilterSelector');
    const socialFeedDisplay = document.getElementById('socialFeedDisplay');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const noResults = document.getElementById('noResults');

    let currentFilter = 'all';

    function createFilterButtons() {
        speciesFilterSelector.innerHTML = ''; 
        const allBtn = document.createElement('button');
        allBtn.className = 'filter-btn active';
        allBtn.dataset.species = 'all';
        allBtn.innerHTML = `
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span class="text-sm font-medium mt-1">All Species</span>`;
        allBtn.addEventListener('click', () => setFilter('all'));
        speciesFilterSelector.appendChild(allBtn);

        for (const key in fishTypes) {
            const fish = fishTypes[key];
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.species = key;
            btn.innerHTML = `
                <img src="${fish.imageSrc}" alt="${fish.name}" class="w-16 h-16 object-contain" onerror="this.src='https://placehold.co/64x64/FFFFFF/000000?text=?';">
                <span class="text-sm font-medium truncate">${fish.name}</span>`;
            btn.addEventListener('click', () => setFilter(key));
            speciesFilterSelector.appendChild(btn);
        }
    }
    
    function setFilter(speciesKey) {
        currentFilter = speciesKey;
        speciesFilterSelector.querySelectorAll('.filter-btn').forEach(btn => {
            if(btn.dataset.species === speciesKey) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        fetchPosts();
    }

    async function fetchPosts() {
        loadingIndicator.classList.remove('hidden');
        socialFeedDisplay.classList.add('hidden');
        noResults.classList.add('hidden');
        socialFeedDisplay.innerHTML = '';

        try {
            // Create a query (USES supaClient)
            let query = supaClient
                .from('social_posts')
                .select('*') 
                .order('created_at', { ascending: false })
                .limit(30);
            
            if (currentFilter !== 'all') {
                query = query.eq('species', currentFilter); 
            }
            
            const { data: posts, error } = await query;
            if (error) throw error;

            if (!posts || posts.length === 0) {
                noResults.classList.remove('hidden');
            } else {
                posts.forEach(post => {
                    const card = createPostCard(post);
                    socialFeedDisplay.appendChild(card);
                });
                socialFeedDisplay.classList.remove('hidden');
            }

        } catch (err) {
            console.error("Error fetching posts:", err);
            socialFeedDisplay.innerHTML = `<p class="text-red-400 col-span-full">Error loading posts: ${err.message}</p>`;
            socialFeedDisplay.classList.remove('hidden');
        } finally {
             loadingIndicator.classList.add('hidden');
        }
    }

    function createPostCard(post) {
        const card = document.createElement('div');
        card.className = 'post-card rounded-lg overflow-hidden flex flex-col';
        
        let postDate = 'Just now';
        if (post.created_at) {
             postDate = new Date(post.created_at).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        }
        
        const speciesInfo = fishTypes[post.species] || { name: post.species, imageSrc: 'images/icon.ico' };
        const lureInfo = canonicalLureMap[post.lure] || { image: 'images/icon.ico' };
        const colorHex = baseColorHexMap[post.color] || '#808080';

        card.innerHTML = `
            <div class="w-full h-64 bg-black flex items-center justify-center">
                 <img src="${post.image_url}" alt="Catch by ${post.username}" class="object-contain w-full h-full" onerror="this.src='https://placehold.co/400x300/111827/FFFFFF?text=Image+Not+Found';">
            </div>
            
            <div class="p-4 flex flex-col flex-grow space-y-3">
                <div>
                    <p class="text-sm text-blue-300 font-semibold">Posted by: ${post.username || 'Unknown Angler'}</p>
                    <p class="text-xs text-gray-400">${postDate} at ${post.location || 'Unknown Location'}</p>
                </div>
                
                <p class="text-sm text-gray-200 flex-grow italic">"${post.notes || 'No caption added.'}"</p>

                <div class="space-y-2 pt-3 border-t border-gray-700">
                    <div class="flex items-center space-x-3">
                         <img src="${speciesInfo.imageSrc}" class="h-10 w-10 object-contain bg-white rounded-md flex-shrink-0" onerror="this.src='https://placehold.co/40x40/FFFFFF/000000?text=?';">
                         <div>
                            <span class="text-xs uppercase text-gray-400">Species</span>
                            <p class="font-semibold text-white">${speciesInfo.name}</p>
                         </div>
                    </div>
                     <div class="flex items-center space-x-3">
                         <img src="${lureInfo.image}" class="h-10 w-10 object-contain bg-white rounded-md flex-shrink-0" onerror="this.src='https://placehold.co/40x40/FFFFFF/000000?text=?';">
                         <div>
                            <span class="text-xs uppercase text-gray-400">Caught On</span>
                            <div class="flex items-center space-x-2">
                                <span class="w-3 h-3 rounded-full border border-gray-500" style="background-color: ${colorHex};"></span>
                                <span class="font-semibold text-white">${post.color} ${post.lure}</span>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        `;
        return card;
    }

    // --- Init Page ---
    // Listen for auth state changes to build the header (USES supaClient)
    supaClient.auth.onAuthStateChange((_event, session) => {
        createHeader('social', session); // Create header, highlighting 'social'
        if (!session) {
            injectAuthModal();
        }
    });

    createFilterButtons();
    fetchPosts(); 
});