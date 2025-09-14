// FILE: data-manager.js
// VERSION 2: This is updated to use 'supaClient'

/**
 * NOTE: The initializeUserDocument function was moved into auth-manager.js
 * because it is part of the core signup flow.
 */


/**
 * Fetches ALL data (logbook AND tacklebox) for the currently logged-in user.
 */
async function fetchUserData(userId) {
    if (!userId) {
         // Logged-out mode: Load from localStorage fallback
         console.log("No user ID, loading data from localStorage (guest mode).");
         const savedLog = localStorage.getItem('myFishingLog') || '[]';
         const savedTacklebox = localStorage.getItem('myTacklebag') || JSON.stringify([new Array(10).fill(null)]);
         
         return {
            fishingLog: JSON.parse(savedLog),
            tacklebagState: JSON.parse(savedTacklebox)
         };
    }
    
    console.log("Fetching user data from Supabase for user:", userId);
    try {
        // USES supaClient
        const { data, error } = await supaClient
            .from('profiles')
            .select('fishing_log, tacklebag_state') // Selects our two JSONB columns
            .eq('id', userId)
            .single(); 

        if (error) throw error;
        
        return {
            fishingLog: data.fishing_log || [],
            tacklebagState: data.tacklebag_state || [new Array(10).fill(null)]
        };

    } catch (error) {
        console.error("Error fetching user data:", error.message);
        return {
            fishingLog: [],
            tacklebagState: [new Array(10).fill(null)]
        };
    }
}


/**
 * Saves the entire tacklebag array to the 'tacklebag_state' jsonb column in Supabase.
 */
async function saveTacklebagToSupabase(userId, tacklebagState) {
    if (!userId) {
        localStorage.setItem('myTacklebag', JSON.stringify(tacklebagState));
        return;
    }
    
    // USES supaClient
    const { error } = await supaClient
        .from('profiles')
        .update({ tacklebag_state: tacklebagState })
        .eq('id', userId); 
        
    if (error) {
        console.error("Error saving tacklebox:", error.message);
    } else {
        console.log("Tacklebox saved to Supabase.");
    }
}

/**
 * Saves the entire logbook array to the 'fishing_log' jsonb column in Supabase.
 */
async function saveLogToSupabase(userId, fishingLog) {
     if (!userId) {
        localStorage.setItem('myFishingLog', JSON.stringify(fishingLog));
        return;
    }
    
    // USES supaClient
    const { error } = await supaClient
        .from('profiles')
        .update({ fishing_log: fishingLog })
        .eq('id', userId);
    
     if (error) {
        console.error("Error saving logbook:", error.message);
    } else {
        console.log("Logbook saved to Supabase.");
    }
}

/**
 * Creates a public social post.
 */
async function createPublicSocialPost(logEntryData, imageFile, userId, username) {
    if (!userId) throw new Error("You must be logged in to post.");
    if (!imageFile) throw new Error("An image is required for a social post.");

    console.log("Starting social post upload...");

    // 1. Upload Image to Supabase Storage (USES supaClient)
    const filePath = `${userId}/${Date.now()}-${imageFile.name}`;
    
    const { error: uploadError } = await supaClient.storage
        .from('fish-photos') // The public bucket you created
        .upload(filePath, imageFile);

    if (uploadError) throw uploadError;

    // 2. Get the Public URL (USES supaClient)
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

    // USES supaClient
    const { error: postError } = await supaClient
        .from('social_posts')
        .insert(newPostData);

    if (postError) throw postError;

    console.log("Public social post created!");
    return true;
}