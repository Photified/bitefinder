// FILE: data-manager.js
// VERSION 4: SIMPLIFIED CLOUD-ONLY LOGIC. This removes all localStorage backups to fix the loading hang.

/**
 * NOTE: The initializeUserDocument function was moved into auth-manager.js
 */

/**
 * Fetches ALL data (logbook AND tacklebox) for the currently logged-in user.
 * This is a cloud-only version.
 */
async function fetchUserData(userId) {
    if (!userId) {
         // Guest mode user. They have no cloud data. Return empty state.
         return {
            fishingLog: [],
            tacklebagState: [new Array(10).fill(null)]
         };
    }
    
    console.log("Fetching cloud data for user:", userId);
    try {
        // --- ONLINE PATH ---
        const { data, error } = await supaClient
            .from('profiles')
            .select('fishing_log, tacklebag_state') // Selects our two JSONB columns
            .eq('id', userId)
            .single(); 

        if (error && error.code !== 'PGRST116') { 
            // PGRST116 just means "no row was found", which is fine (it's a new user).
            // Any other error should be thrown.
            throw error; 
        }

        // Return the cloud data (or empty defaults if no profile row was found)
        return {
            fishingLog: data?.fishing_log || [],
            tacklebagState: data?.tacklebag_state || [new Array(10).fill(null)]
        };

    } catch (error) {
        // --- FAILURE PATH ---
        // If anything goes wrong, log the error and return an empty state so the app doesn't crash.
        console.error("CRITICAL FETCH ERROR:", error.message);
        return {
            fishingLog: [],
            tacklebagState: [new Array(10).fill(null)]
        };
    }
}


/**
 * CLOUD-ONLY SAVE: Saves the tacklebag ONLY to Supabase.
 */
async function saveTacklebagToSupabase(userId, tacklebagState) {
    if (!userId) return; // Not logged in, do nothing.
    
    const { error } = await supaClient
        .from('profiles')
        .update({ tacklebag_state: tacklebagState })
        .eq('id', userId); 
        
    if (error) {
        console.error("Error saving tacklebox to Supabase:", error.message);
        alert("Error: Could not sync tacklebox to the cloud.");
    } else {
        console.log("Tacklebox saved to Supabase.");
    }
}

/**
 * CLOUD-ONLY SAVE: Saves the logbook ONLY to Supabase.
 */
async function saveLogToSupabase(userId, fishingLog) {
     if (!userId) return; // Not logged in, do nothing.
    
    const { error } = await supaClient
        .from('profiles')
        .update({ fishing_log: fishingLog })
        .eq('id', userId);
    
     if (error) {
        console.error("Error saving logbook to Supabase:", error.message);
        alert("Error: Could not sync logbook to the cloud.");
    } else {
        console.log("Logbook saved to Supabase.");
    }
}

/**
 * Creates a public social post (this function requires internet).
 * (This function is unchanged)
 */
async function createPublicSocialPost(logEntryData, imageFile, userId, username) {
    if (!userId) throw new Error("You must be logged in to post.");
    if (!imageFile) throw new Error("An image is required for a social post.");

    console.log("Starting social post upload...");

    const filePath = `${userId}/${Date.now()}-${imageFile.name}`;
    
    const { error: uploadError } = await supaClient.storage
        .from('fish-photos')
        .upload(filePath, imageFile);

    if (uploadError) {
        console.error("Image upload failed:", uploadError);
        throw uploadError;
    }

    const { data: urlData } = supaClient.storage
        .from('fish-photos')
        .getPublicUrl(filePath);

    const publicImageUrl = urlData.publicUrl;
    console.log("File uploaded, URL:", publicImageUrl);

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
