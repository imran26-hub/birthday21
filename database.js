// ═══════════════════════════════════════════
// 🔥 DATABASE CONNECTION MODULE
// ═══════════════════════════════════════════

console.log('🚀 database.js loading...');

// SUPABASE CONFIGURATION
const SUPABASE_URL = 'https://xfudvpspcfhycnaamtsr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdWR2cHNwY2ZoeWNuYWFtdHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MjI3NzQsImV4cCI6MjA4Njk5ODc3NH0.8RBcjjs001B9wmbSWnZVl6o2JNlhugRq1NEGatDV-gc';

// Initialize Supabase client
console.log('🔧 Creating Supabase client...');
console.log('window.supabase available:', !!window.supabase);

let supabaseClient = null;

if (!window.supabase) {
  console.error('❌ Supabase not available - script not loaded');
} else {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('✅ Supabase client created:', !!supabaseClient);
}

// Global state
let currentPasswords = { admin: '', viewer: '', adminEmail: 'imrank32646@gmail.com' };
let photos = [];

// ══════════════════════════════════════════
// DATABASE FUNCTIONS
// ══════════════════════════════════════════

async function loadPasswords() {
  try {
    console.log('🔍 Loading passwords from database...');
    console.log('Supabase client available:', !!supabaseClient);
    console.log('Supabase URL:', SUPABASE_URL);
    
    const { data, error } = await supabaseClient.from('passwords').select('*').eq('id', 'main').single();
    
    if (error) {
      console.error('❌ Database query error:', error);
      throw error;
    }
    
    if (data) {
      currentPasswords = { 
        admin: data.admin_password, 
        viewer: data.viewer_password,
        adminEmail: data.admin_email || 'imrank32646@gmail.com'
      };
      console.log('✅ Passwords loaded:', currentPasswords);
      return currentPasswords;
    } else {
      console.warn('⚠️ No password data found');
    }
  } catch (e) {
    console.error('❌ Error loading passwords:', e);
    return currentPasswords;
  }
}

async function loadPhotos() {
  try {
    console.log('🔍 Loading photos from database...');
    const { data, error } = await supabaseClient.from('photos').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    photos = data || [];
    console.log('✅ Photos loaded:', photos.length, 'items');
    
    // Only trigger gallery refresh if user is already logged in
    if (typeof window !== 'undefined' && window.renderGallery && document.getElementById('main-site').style.display === 'block') {
      console.log('🎨 Triggering immediate gallery refresh...');
      window.renderGallery();
    } else {
      console.log('🎨 User not logged in yet, will render after login');
    }
  } catch (e) {
    console.error('Error loading photos:', e);
    photos = [];
  }
}

async function addPhotoToDB(photo) {
  try {
    console.log('📤 Adding photo to database:', photo);
    
    // Check if photo data is valid
    if (!photo.src || !photo.id) {
      console.error('❌ Invalid photo data:', photo);
      return false;
    }
    
    // Check if supabase client is available
    if (!supabaseClient) {
      console.error('❌ Supabase client not available');
      return false;
    }
    
    console.log('🔍 Attempting database insert...');
    
    // Insert photo without timeout (since photos are actually being saved)
    const { data, error } = await supabaseClient.from('photos').insert([photo]).select();
    
    if (error) {
      console.error('❌ Database insert error:', error);
      console.error('Error details:', error.message, error.code, error.hint);
      throw error;
    }
    
    console.log('✅ Photo added to database successfully:', data);
    console.log('🔄 Reloading photos...');
    await loadPhotos();
    console.log('✅ Photos reloaded, new count:', photos.length);
    return true;
  } catch (e) {
    console.error('❌ Error adding photo:', e);
    console.error('Full error:', e.message, e.stack);
    return false;
  }
}

async function deletePhotoFromDB(id) {
  try {
    const { error } = await supabaseClient.from('photos').delete().eq('id', id);
    if (error) throw error;
    await loadPhotos();
    return true;
  } catch (e) {
    console.error('Error deleting photo:', e);
    return false;
  }
}

async function updatePasswordsInDB(adminPw, viewerPw) {
  try {
    const updates = {};
    if (adminPw) updates.admin_password = adminPw;
    if (viewerPw) updates.viewer_password = viewerPw;
    if (adminPw || viewerPw) updates.updated_at = new Date().toISOString();

    const { error } = await supabaseClient.from('passwords').update(updates).eq('id', 'main');
    if (error) throw error;
    await loadPasswords();
    return true;
  } catch (e) {
    console.error('Error updating passwords:', e);
    return false;
  }
}

// ══════════════════════════════════════════
// EMAIL FUNCTIONS (Password Reset)
// ══════════════════════════════════════════

async function sendResetCode(email, code) {
  try {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { data, error } = await supabaseClient.from('reset_codes').insert([{
      email: email,
      code: code,
      expires_at: expiresAt,
      used: false
    }]).select().single();
    
    if (error) throw error;
    
    // Send email using Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer re_4YcoGWs6_89kmXFPgM8qWUMtQLogrtzoZ',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: [email],
        subject: 'Password Reset Code - For You ♡',
        html: `
          <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 40px; background: #fdf6f0; border-radius: 16px;">
            <h1 style="color: #c9506a; font-size: 28px; margin-bottom: 16px; text-align: center;">Password Reset ♡</h1>
            <p style="color: #2c1a1f; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Your password reset code is:</p>
            <div style="background: white; border: 2px solid #c9506a; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #c9506a;">${code}</span>
            </div>
            <p style="color: #9a7b82; font-size: 14px; line-height: 1.5;">This code expires in 15 minutes. If you didn't request this, please ignore this email.</p>
          </div>
        `
      })
    });
    
    if (!response.ok) throw new Error('Failed to send email');
    return data;
  } catch (e) {
    console.error('Error sending reset code:', e);
    throw e;
  }
}

async function verifyResetCode(code) {
  try {
    const { data, error } = await supabase
      .from('reset_codes')
      .select('*')
      .eq('code', code)
      .eq('used', false)
      .single();
    
    if (error) throw error;
    
    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      throw new Error('Code expired');
    }
    
    return data;
  } catch (e) {
    console.error('Error verifying reset code:', e);
    throw e;
  }
}

async function updatePassword(newPassword, codeId) {
  try {
    // Update password
    const { error: pwError } = await supabase
      .from('passwords')
      .update({ admin_password: newPassword, updated_at: new Date().toISOString() })
      .eq('id', 'main');
    
    if (pwError) throw pwError;
    
    // Mark code as used
    await supabase
      .from('reset_codes')
      .update({ used: true })
      .eq('id', codeId);
    
    await loadPasswords();
    return true;
  } catch (e) {
    console.error('Error updating password:', e);
    return false;
  }
}

async function markCodeAsUsed(codeId) {
  try {
    await supabase
      .from('reset_codes')
      .update({ used: true })
      .eq('id', codeId);
  } catch (e) {
    console.error('Error marking code as used:', e);
  }
}

// ══════════════════════════════════════════
// GLOBAL API
// ══════════════════════════════════════════

// Make functions available globally
window.Database = {
  // Core functions
  loadPasswords,
  loadPhotos,
  addPhotoToDB,
  deletePhotoFromDB,
  updatePasswordsInDB,
  
  // Password reset
  sendResetCode,
  verifyResetCode,
  updatePassword,
  markCodeAsUsed,
  
  // Getters
  getCurrentPasswords: () => currentPasswords,
  getPhotos: () => photos,
  
  // Initialize
  init: async () => {
    console.log('🚀 Database initialization starting...');
    try {
      if (!supabaseClient) {
        console.error('❌ Cannot initialize - Supabase client not available');
        return;
      }
      console.log('🔄 Loading passwords...');
      await loadPasswords();
      console.log('🔄 Loading photos...');
      await loadPhotos();
      console.log('✅ Database initialized successfully');
      console.log('📸 Total photos loaded:', photos.length);
    } catch (e) {
      console.error('❌ Database initialization failed:', e);
    }
  }
};

console.log('✅ Database module loaded:', !!window.Database);

// Initialize immediately - don't wait for login
window.Database.init();
