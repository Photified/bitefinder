// FILE: data-manager.js
// FINAL VERSION (v5): This fixes the .single() hang bug and correctly handles both cloud and local data.

/**
 * Fetches ALL data (logbook AND tacklebox) for the currently logged-in user.
 * This function handles BOTH guest mode (localStorage) and logged-in mode (Supabase).
 */
async function fetchUserData(userId) {
    if (!userId) {
         // Guest mode user. Load from localStorage.
         console.log("No user ID, loading data from localStorage (guest mode).");
         return loadDataFromLocalStorage();
    }
    
    console.log("Fetching cloud data for user:", userId);
    try {
        // --- THIS IS THE CORRECTED QUERY ---
        // We use select('*') and DO NOT use .single() to prevent the app from hanging.
        // This query is stable and will not hang.
        const { data, error } = await supaClient
            .from('profiles')
            .select('*')
            .eq('id', userId); // WHERE id = our_user_id

        // If anything went wrong, throw the error to the catch block
        if (error) {
            throw error;
        }

        // The query worked! 'data' is now an ARRAY.
        // If it's a new user, 'data' will be an empty array [].
        // If it's an existing user, it will be an array with one object: [ {...} ]
        
        const profileRow = data?.[0]; // Get the first (and only) row, or undefined

        // Also update our local backup to match the cloud, just in case the user goes offline later.
        localStorage.setItem('myFishingLog', JSON.stringify(profileRow?.fishing_log || []));
        localStorage.setItem('myTacklebag', JSON.stringify(profileRow?.tacklebag_state || [new Array(10).fill(null)]));
        console.log("Cloud data fetched and local backup updated.");

        // Return the data from that row, OR our default empty values
        return {
            fishingLog: profileRow?.fishing_log || [],
            tacklebagState: profileRow?.tacklebag_state || [new Array(10).fill(null)]
        };

    } catch (error) {
        // --- FAILURE PATH ---
        // If the fetch fails (user is offline, etc), log it and fall back to the local backup.
        console.warn(`Supabase fetch failed (${error.message}). App is in OFFLINE MODE. Loading from local backup.`);
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
 * DUAL-SAVE: Saves the tacklebag to Supabase (if logged in) AND localStorage (always).
 */
async function saveTacklebagToSupabase(userId, tacklebagState) {
    // Always save to localStorage immediately.
    localStorage.setItem('myTacklebag', JSON.stringify(tacklebagState));

    if (!userId) {
        // Logged-out (guest) user. We're done.
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
 * DUAL-SAVE: Saves the logbook to Supabase (if logged in) AND localStorage (always).
 */
async function saveLogToSupabase(userId, fishingLog) {
     // Always save to localStorage immediately.
     localStorage.setItem('myFishingLog', JSON.stringify(fishingLog));

     if (!userId) {
        // Logged-out (guest) user. We're done.
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

    const filePath = `${userId}/${Date.now()}-${imageFile.name}`;
    
    const { error: uploadError } = await supaClient.storage
        .from('fish-photos') // The public bucket you created
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