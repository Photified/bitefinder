// FILE: data-manager.js
// VERSION 3: This version adds the critical try...catch offline-fallback logic.

/**
 * NOTE: The initializeUserDocument function was moved into auth-manager.js
 * because it is part of the core signup flow.
 */


/**
 * Fetches ALL data (logbook AND tacklebox) for the currently logged-in user.
 * This function is now "offline-first". It tries the cloud, but falls back to local data.
 */
async function fetchUserData(userId) {
    if (!userId) {
         // Logged-out mode: Load from localStorage fallback (this is for guest mode)
         console.log("No user ID, loading data from localStorage (guest mode).");
         return loadDataFromLocalStorage();
    }
    
    console.log("Fetching user data from Supabase for user:", userId);
    try {
        // --- ONLINE PATH ---
        // We try to fetch the data from the cloud first.
        const { data, error } = await supaClient
            .from('profiles')
            .select('fishing_log, tacklebag_state') // Selects our two JSONB columns
            .eq('id', userId)
            .single(); 

        if (error && error.code !== 'PGRST116') { 
            // PGRST116 is the "row not found" error, which is not a failure, just an empty profile.
            // Any other error should be thrown.
            throw error; 
        }

        // SUCCESS: We are online. Data is either the user's data or null (if no profile row).
        
        // Ensure data exists, otherwise use defaults
        const fishingLogData = data?.fishing_log || [];
        const tacklebagData = data?.tacklebag_state || [new Array(10).fill(null)];

        // NOW, we update our local backup to match the cloud.
        localStorage.setItem('myFishingLog', JSON.stringify(fishingLogData));
        localStorage.setItem('myTacklebag', JSON.stringify(tacklebagData));
        console.log("Cloud data fetched and local backup updated.");

        // Return the fresh cloud data to the app.
        return {
            fishingLog: fishingLogData,
            tacklebagState: tacklebagData
        };

    } catch (error) {
        // --- OFFLINE PATH / FAILURE PATH ---
        // The fetch failed (either user is offline, or a real error like RLS/typo happened).
        console.warn(`Supabase fetch failed (${error.message}). App is in OFFLINE MODE. Loading from local backup.`);
        
        // We fall back to loading whatever data we have saved in localStorage.
        return loadDataFromLocalStorage();
    }
}

/**
 * A helper function to load data from localStorage (used by both guest mode and offline mode)
 */
function loadDataFromLocalStorage() {
    const savedLog = localStorage.getItem('myFishingLog') || '[]';
    const savedTacklebox = localStorage.getItem('myTacklebag') || JSON.stringify([new Array(10).fill(null)]);
    return {
        fishingLog: JSON.parse(savedLog),
        tacklebagState: JSON.parse(savedTacklebox)
    };
}


/**
 * DUAL-SAVE: Saves the tacklebag to Supabase AND localStorage.
 */
async function saveTacklebagToSupabase(userId, tacklebagState) {
    // Always save to localStorage immediately, so it works offline.
    localStorage.setItem('myTacklebag', JSON.stringify(tacklebagState));

    if (!userId) {
        // Logged-out user, only save to local.
        return;
    }
    
    // User is logged in, ALSO try to save to the cloud.
    const { error } = await supaClient
        .from('profiles')
        .update({ tacklebag_state: tacklebagState })
        .eq('id', userId); 
        
    if (error) {
        console.error("Error saving tacklebox to cloud:", error.message);
        alert("Error: Could not sync tacklebox to the cloud. Your changes are saved locally but not backed up.");
    } else {
        console.log("Tacklebox saved to Supabase (and local backup).");
    }
}

/**
 * DUAL-SAVE: Saves the logbook to Supabase AND localStorage.
 */
async function saveLogToSupabase(userId, fishingLog) {
     // Always save to localStorage immediately.
     localStorage.setItem('myFishingLog', JSON.stringify(fishingLog));

     if (!userId) {
        // Logged-out user, only save to local.
        return;
    }
    
    // User is logged in, ALSO try to save to the cloud.
    const { error } = await supaClient
        .from('profiles')
        .update({ fishing_log: fishingLog })
        .eq('id', userId);
    
     if (error) {
        console.error("Error saving logbook to cloud:", error.message);
        alert("Error: Could not sync logbook to the cloud. Your changes are saved locally but not backed up.");
    } else {
        console.log("Logbook saved to Supabase (and local backup).");
    }
}

/**
 * Creates a public social post (this function requires internet).
 */
async function createPublicSocialPost(logEntryData, imageFile, userId, username) {
    if (!userId) throw new Error("You must be logged in to post.");
    if (!imageFile) throw new Error("An image is required for a social post.");

    console.log("Starting social post upload...");

    // 1. Upload Image to Supabase Storage
    const filePath = `${userId}/${Date.now()}-${imageFile.name}`;
    
    const { error: uploadError } = await supaClient.storage
        .from('fish-photos') // The public bucket you created
        .upload(filePath, imageFile);

    if (uploadError) {
        console.error("Image upload failed:", uploadError);
        throw uploadError;
    }

    // 2. Get the Public URL
    const { data: urlData } = supaClient.storage
        .from('fish-photos')
        .getPublicUrl(filePath);

    const publicImageUrl = urlData.publicUrl;
    console.log("File uploaded, URL:", publicImageUrl);

    // 3. Create the public post row in the 'social_posts' table
    const newPostData = {
        user_id: userId,
        username: username,
        species: logEntryData.species,
        location: logEntryData.location,
        lure: logEntryData.lure,
        color: logEntryData.color,
        notes: logEntryData.notes,
        weather: logEntryData.weather,
        clarity: logEntryData.clarity,
        temp: logEntryData.temp,
        image_url: publicImageUrl
    };

    const { error: postError } = await supaClient
        .from('social_posts')
        .insert(newPostData);

    if (postError) {
         console.error("Failed to create post metadata:", postError);
        throw postError;
    }

    console.log("Public social post created!");
    return true;
}
