const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

// Initialize authentication
const auth = new GoogleAuth({
  client_id: config.google.clientId,
  client_secret: config.google.clientSecret,
  redirect_uri: config.google.redirectUri
});

// Load saved tokens
let tokens = {};
try {
  tokens = require('./token.json');
} catch (e) {
  console.log('No existing token found');
}

// Authenticate
async function authenticate() {
  try {
    const tokens = await auth.getAccessToken();
    return tokens;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

// Get notes from Google Keep
async function getNotes() {
  const tokens = await authenticate();
  if (!tokens) return [];
  
  const keep = google.keep('v1');
  const res = await keep.notes.list({
    auth: tokens,
    maxResults: 10
  });
  
  return res.data.items || [];
}

// Add new note
async function addNote() {
  const title = document.getElementById('note-title').value;
  const content = document.getElementById('note-content').value;
  
  if (!title || !content) return;
  
  const tokens = await authenticate();
  if (!tokens) return;
  
  const keep = google.keep('v1');
  try {
    await keep.notes.insert({
      auth: tokens,
      resource: {
        title: title,
        content: content,
        color: 'DEFAULT'
      }
    });
    console.log('Note added successfully');
    document.getElementById('note-title').value = '';
    document.getElementById('note-content').value = '';
  } catch (error) {
    console.error('Error adding note:', error);
  }
}

// Display notes
async function displayNotes() {
  const notes = await getNotes();
  const container = document.getElementById('notes-container');
  container.innerHTML = '';
  
  notes.forEach(note => {
    const noteElement = document.createElement('div');
    noteElement.className = 'note';
    noteElement.innerHTML = `
      <div class="note-title">${note.title}</div>
      <div class="note-content">${note.content}</div>
    `;
    container.appendChild(noteElement);
  });
}

// Initial load
displayNotes();
