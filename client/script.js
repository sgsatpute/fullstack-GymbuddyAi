
// State
let currentUser = null;
let currentChatTarget = null;
let chatInterval = null;

// Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
    document.getElementById(`${pageId}-page`).classList.remove('hidden');

    // Update Nav
    const navLinks = document.getElementById('nav-links');
    if (currentUser) {
        navLinks.classList.remove('hidden');
    } else {
        navLinks.classList.add('hidden');
    }

    // Page Load Actions
    if (pageId === 'dashboard') loadDashboard();
    if (pageId === 'matches') loadMatches();
    if (pageId !== 'chat') clearInterval(chatInterval);
}

function logout() {
    currentUser = null;
    showPage('home');
}

// Registration - SQLite backend
async function handleRegister(e) {
    e.preventDefault();
    
    const data = {
        name: document.getElementById('reg-name').value,
        age: parseInt(document.getElementById('reg-age').value),
        gender: document.getElementById('reg-gender').value,
        email: document.getElementById('reg-name').value + '@gymbuddy.local',
        goal: document.getElementById('reg-goal').value,
        experience: document.getElementById('reg-exp').value,
        preferredTime: document.getElementById('reg-time').value,
        gym: document.getElementById('reg-gym').value
    };

    try {
        const res = await fetch('/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Registration failed");
        }
        
        const user = await res.json();
        currentUser = user;
        showPage('dashboard');
        alert('Welcome to GymBuddy! Your data is now persistent.');
    } catch (err) {
        alert(err.message);
    }
}

// Dashboard
function loadDashboard() {
    if (!currentUser) return;
    document.getElementById('user-name-display').innerText = currentUser.name;
    document.getElementById('streak-display').innerText = `${currentUser.streak || 0} 🔥`;
    document.getElementById('consistency-display').innerText = `${currentUser.consistency || 0}/100`;
    document.getElementById('cluster-info').innerText = `You are in Cluster #${currentUser.clusterId || 0}. Data persisted in SQLite!`;
}

async function handleCheckIn() {
    if (!currentUser) return;
    const res = await fetch(`/api/checkin/${currentUser.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    
    if (data.success) {
        currentUser.streak = data.streak;
        currentUser.consistency = data.consistency;
        loadDashboard();
        alert(data.message);
    } else {
        alert(data.message || 'Already checked in today');
    }
}

// Matches
async function loadMatches() {
    if (!currentUser) return;
    const list = document.getElementById('matches-list');
    list.innerHTML = 'Loading...';

    try {
        const res = await fetch(`/api/matches/${currentUser.id}`);
        const matches = await res.json();
        
        list.innerHTML = '';
        if (matches.length === 0) {
            list.innerHTML = '<p>No matches found yet (requires score >= 70%). Invite friends!</p>';
            return;
        }

        matches.forEach(m => {
            const div = document.createElement('div');
            div.className = 'match-card';
            
            let tagsHtml = m.tags.map(t => `<span class="tag">${t}</span>`).join('');
            
            div.innerHTML = `
                <div class="match-info">
                    <h4>${m.user.name} (${m.user.age})</h4>
                    <p>${m.user.gym} • ${m.user.preferredTime}</p>
                    <div class="match-tags">
                        <span class="match-score">${m.score}% Match</span>
                        ${tagsHtml}
                    </div>
                </div>
                <button class="btn-chat" onclick="openChat(${m.user.id}, '${m.user.name}')">Chat</button>
            `;
            list.appendChild(div);
        });
    } catch (err) {
        list.innerHTML = 'Error loading matches.';
    }
}

// Chat
function openChat(targetId, targetName) {
    currentChatTarget = targetId;
    document.getElementById('chat-target-name').innerText = `Chat with ${targetName}`;
    showPage('chat');
    loadMessages();
    chatInterval = setInterval(loadMessages, 3000); // Poll every 3s
}

async function loadMessages() {
    if (!currentUser || !currentChatTarget) return;
    
    const res = await fetch(`/api/chat/${currentUser.id}/${currentChatTarget}`);
    if (res.status === 403) {
        alert("Cannot chat with this user.");
        showPage('matches');
        return;
    }
    const msgs = await res.json();
    
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';
    
    msgs.forEach(m => {
        const div = document.createElement('div');
        div.className = `msg ${m.fromId === currentUser.id ? 'msg-sent' : 'msg-received'}`;
        div.innerText = m.content;
        container.appendChild(div);
    });
}

async function sendMessage() {
    const input = document.getElementById('msg-input');
    const content = input.value.trim();
    if (!content) return;
    
    await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fromId: currentUser.id,
            toId: currentChatTarget,
            content: content
        })
    });
    
    input.value = '';
    loadMessages();
}

async function blockUser() {
    if (!confirm("Are you sure you want to block this user?")) return;
    
    await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            accuserId: currentUser.id,
            accusedId: currentChatTarget,
            type: 'block'
        })
    });
    
    alert("User blocked.");
    showPage('matches');
}
