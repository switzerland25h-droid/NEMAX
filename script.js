// ==================== ПРОСТАЯ БАЗА ДАННЫХ ====================
class SimpleDB {
    constructor() {
        this.initDB();
    }
    
    initDB() {
        // Создаем демо-данные при первом запуске
        if (!localStorage.getItem('messenger_users')) {
            const demoUsers = [
                { 
                    id: 'user1',
                    username: 'user1', 
                    password: 'pass123'
                },
                { 
                    id: 'user2',
                    username: 'user2', 
                    password: 'pass123'
                },
                { 
                    id: 'user3',
                    username: 'user3', 
                    password: 'pass123'
                }
            ];
            localStorage.setItem('messenger_users', JSON.stringify(demoUsers));
            localStorage.setItem('messenger_friendships', JSON.stringify([]));
            localStorage.setItem('messenger_groups', JSON.stringify([]));
            localStorage.setItem('messenger_messages', JSON.stringify([]));
        }
    }
    
    // Пользователи
    getUsers() {
        return JSON.parse(localStorage.getItem('messenger_users') || '[]');
    }
    
    getUserByUsername(username) {
        const users = this.getUsers();
        return users.find(user => user.username === username);
    }
    
    getUserById(id) {
        const users = this.getUsers();
        return users.find(user => user.id === id);
    }
    
    addUser(username, password) {
        const users = this.getUsers();
        
        if (users.some(user => user.username === username)) {
            return { success: false, message: 'Пользователь уже существует' };
        }
        
        const newUser = {
            id: 'user_' + Date.now(),
            username,
            password
        };
        
        users.push(newUser);
        localStorage.setItem('messenger_users', JSON.stringify(users));
        
        return { success: true, user: newUser };
    }
    
    validateUser(username, password) {
        const user = this.getUserByUsername(username);
        if (!user) {
            return { success: false, message: 'Пользователь не найден' };
        }
        
        if (user.password !== password) {
            return { success: false, message: 'Неверный пароль' };
        }
        
        return { success: true, user };
    }
    
    // Друзья
    getFriendships() {
        return JSON.parse(localStorage.getItem('messenger_friendships') || '[]');
    }
    
    getFriends(userId) {
        const friendships = this.getFriendships();
        const users = this.getUsers();
        
        const friendIds = friendships
            .filter(f => (f.userId === userId || f.friendId === userId) && f.accepted)
            .map(f => f.userId === userId ? f.friendId : f.friendId === userId ? f.userId : null)
            .filter(id => id !== null);
        
        return friendIds.map(id => users.find(user => user.id === id)).filter(user => user);
    }
    
    addFriend(userId, friendUsername) {
        const friendUser = this.getUserByUsername(friendUsername);
        
        if (!friendUser) {
            return { success: false, message: 'Пользователь не найден' };
        }
        
        if (friendUser.id === userId) {
            return { success: false, message: 'Нельзя добавить себя' };
        }
        
        const friendships = this.getFriendships();
        
        const existing = friendships.find(f => 
            (f.userId === userId && f.friendId === friendUser.id) || 
            (f.userId === friendUser.id && f.friendId === userId)
        );
        
        if (existing) {
            if (existing.accepted) {
                return { success: false, message: 'Уже в друзьях' };
            }
            if (existing.userId === userId) {
                return { success: false, message: 'Запрос уже отправлен' };
            }
            // Принимаем запрос
            existing.accepted = true;
            localStorage.setItem('messenger_friendships', JSON.stringify(friendships));
            return { success: true, message: 'Запрос принят' };
        }
        
        friendships.push({
            id: 'f_' + Date.now(),
            userId,
            friendId: friendUser.id,
            accepted: false
        });
        
        localStorage.setItem('messenger_friendships', JSON.stringify(friendships));
        return { success: true, message: 'Запрос отправлен' };
    }
    
    // Группы
    getGroups() {
        return JSON.parse(localStorage.getItem('messenger_groups') || '[]');
    }
    
    getGroupById(id) {
        const groups = this.getGroups();
        return groups.find(group => group.id === id);
    }
    
    getUserGroups(userId) {
        const groups = this.getGroups();
        return groups.filter(group => group.members.includes(userId));
    }
    
    createGroup(name, creatorId, memberIds) {
        if (!memberIds.includes(creatorId)) {
            memberIds.push(creatorId);
        }
        
        const groups = this.getGroups();
        const newGroup = {
            id: 'group_' + Date.now(),
            name,
            creatorId,
            members: memberIds
        };
        
        groups.push(newGroup);
        localStorage.setItem('messenger_groups', JSON.stringify(groups));
        
        return { success: true, group: newGroup };
    }
    
    // Сообщения
    getMessages() {
        return JSON.parse(localStorage.getItem('messenger_messages') || '[]');
    }
    
    getPrivateMessages(user1Id, user2Id) {
        const messages = this.getMessages();
        return messages.filter(msg => 
            (msg.senderId === user1Id && msg.receiverId === user2Id) ||
            (msg.senderId === user2Id && msg.receiverId === user1Id)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
    
    getGroupMessages(groupId) {
        const messages = this.getMessages();
        return messages.filter(msg => msg.groupId === groupId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
    
    addMessage(senderId, receiverId, groupId, text) {
        const messages = this.getMessages();
        const newMessage = {
            id: 'msg_' + Date.now(),
            senderId,
            receiverId: groupId ? null : receiverId,
            groupId: groupId || null,
            text,
            timestamp: new Date().toISOString()
        };
        
        messages.push(newMessage);
        localStorage.setItem('messenger_messages', JSON.stringify(messages));
        
        return newMessage;
    }
    
    // Экспорт/импорт данных
    exportData() {
        const data = {
            users: this.getUsers(),
            friendships: this.getFriendships(),
            groups: this.getGroups(),
            messages: this.getMessages()
        };
        
        return JSON.stringify(data, null, 2);
    }
    
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (!data.users || !data.friendships || !data.groups || !data.messages) {
                return { success: false, message: 'Неправильный формат' };
            }
            
            localStorage.setItem('messenger_users', JSON.stringify(data.users));
            localStorage.setItem('messenger_friendships', JSON.stringify(data.friendships));
            localStorage.setItem('messenger_groups', JSON.stringify(data.groups));
            localStorage.setItem('messenger_messages', JSON.stringify(data.messages));
            
            return { success: true, message: 'Данные импортированы' };
        } catch (error) {
            return { success: false, message: 'Ошибка импорта' };
        }
    }
}

// ==================== ОСНОВНОЕ ПРИЛОЖЕНИЕ ====================
class MessengerApp {
    constructor() {
        this.db = new SimpleDB();
        this.currentUser = null;
        this.currentChat = null;
        
        this.init();
    }
    
    init() {
        const savedUser = localStorage.getItem('messenger_currentUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.showMainScreen();
            } catch (e) {
                localStorage.removeItem('messenger_currentUser');
                this.showAuthScreen();
            }
        } else {
            this.showAuthScreen();
        }
        
        this.setupEventListeners();
        this.setupModals();
    }
    
    showAuthScreen() {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('main-screen').classList.add('hidden');
    }
    
    showMainScreen() {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
        
        document.getElementById('current-username').textContent = this.currentUser.username;
        
        this.loadFriends();
        this.loadGroups();
        this.loadChats();
    }
    
    setupEventListeners() {
        // Авторизация
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('register-btn').addEventListener('click', () => this.register());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        
        // Вкладки авторизации
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchAuthTab(tab);
            });
        });
        
        // Вкладки боковой панели
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.closest('.sidebar-tab').dataset.tab;
                this.switchSidebarTab(tabName);
            });
        });
        
        // Кнопки действий
        document.getElementById('add-friend-btn').addEventListener('click', () => this.showAddFriendModal());
        document.getElementById('create-group-btn').addEventListener('click', () => this.showCreateGroupModal());
        document.getElementById('new-chat-btn').addEventListener('click', () => this.showNewChatModal());
        
        // Отправка сообщений
        document.getElementById('send-message-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }
    
    setupModals() {
        // Добавление друга
        document.getElementById('confirm-add-friend').addEventListener('click', () => this.addFriend());
        document.getElementById('cancel-add-friend').addEventListener('click', () => this.closeModal('add-friend-modal'));
        
        // Создание группы
        document.getElementById('confirm-create-group').addEventListener('click', () => this.createGroup());
        document.getElementById('cancel-create-group').addEventListener('click', () => this.closeModal('create-group-modal'));
        
        // Новый чат
        document.getElementById('confirm-new-chat').addEventListener('click', () => this.startNewChat());
        document.getElementById('cancel-new-chat').addEventListener('click', () => this.closeModal('new-chat-modal'));
        
        // Закрытие модальных окон
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }
    
    switchAuthTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        document.getElementById('login-form').classList.toggle('active', tab === 'login');
        document.getElementById('register-form').classList.toggle('active', tab === 'register');
        
        document.getElementById('login-error').textContent = '';
        document.getElementById('register-error').textContent = '';
    }
    
    switchSidebarTab(tab) {
        document.querySelectorAll('.sidebar-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        document.querySelectorAll('.sidebar-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}-list`);
        });
    }
    
    login() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errorElement = document.getElementById('login-error');
        
        if (!username || !password) {
            errorElement.textContent = 'Заполните все поля';
            return;
        }
        
        const result = this.db.validateUser(username, password);
        
        if (result.success) {
            this.currentUser = result.user;
            localStorage.setItem('messenger_currentUser', JSON.stringify(this.currentUser));
            this.showMainScreen();
            this.showNotification('Вход выполнен!');
        } else {
            errorElement.textContent = result.message;
        }
    }
    
    register() {
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;
        const errorElement = document.getElementById('register-error');
        
        if (!username || !password || !confirmPassword) {
            errorElement.textContent = 'Заполните все поля';
            return;
        }
        
        if (password !== confirmPassword) {
            errorElement.textContent = 'Пароли не совпадают';
            return;
        }
        
        if (password.length < 6) {
            errorElement.textContent = 'Пароль минимум 6 символов';
            return;
        }
        
        const result = this.db.addUser(username, password);
        
        if (result.success) {
            this.currentUser = result.user;
            localStorage.setItem('messenger_currentUser', JSON.stringify(this.currentUser));
            this.showMainScreen();
            this.showNotification('Регистрация успешна!');
        } else {
            errorElement.textContent = result.message;
        }
    }
    
    logout() {
        this.currentUser = null;
        this.currentChat = null;
        localStorage.removeItem('messenger_currentUser');
        this.showAuthScreen();
        this.showNotification('Вы вышли');
    }
    
    showAddFriendModal() {
        document.getElementById('add-friend-error').textContent = '';
        document.getElementById('friend-username').value = '';
        this.openModal('add-friend-modal');
    }
    
    addFriend() {
        const friendUsername = document.getElementById('friend-username').value.trim();
        const errorElement = document.getElementById('add-friend-error');
        
        if (!friendUsername) {
            errorElement.textContent = 'Введите никнейм';
            return;
        }
        
        const result = this.db.addFriend(this.currentUser.id, friendUsername);
        
        if (result.success) {
            this.closeModal('add-friend-modal');
            this.loadFriends();
            this.showNotification(result.message);
        } else {
            errorElement.textContent = result.message;
        }
    }
    
    showCreateGroupModal() {
        document.getElementById('create-group-error').textContent = '';
        document.getElementById('group-name').value = '';
        
        const friends = this.db.getFriends(this.currentUser.id);
        const membersList = document.getElementById('group-members-list');
        membersList.innerHTML = '';
        
        if (friends.length === 0) {
            membersList.innerHTML = '<p>Нет друзей для группы</p>';
        } else {
            friends.forEach(friend => {
                const checkbox = document.createElement('div');
                checkbox.className = 'checkbox-item';
                checkbox.innerHTML = `
                    <input type="checkbox" id="member-${friend.id}" value="${friend.id}">
                    <label for="member-${friend.id}">${friend.username}</label>
                `;
                membersList.appendChild(checkbox);
            });
        }
        
        this.openModal('create-group-modal');
    }
    
    createGroup() {
        const groupName = document.getElementById('group-name').value.trim();
        const errorElement = document.getElementById('create-group-error');
        
        if (!groupName) {
            errorElement.textContent = 'Введите название';
            return;
        }
        
        const checkboxes = document.querySelectorAll('#group-members-list input[type="checkbox"]:checked');
        const memberIds = Array.from(checkboxes).map(cb => cb.value);
        
        if (memberIds.length === 0) {
            errorElement.textContent = 'Выберите участников';
            return;
        }
        
        const result = this.db.createGroup(groupName, this.currentUser.id, memberIds);
        
        if (result.success) {
            this.closeModal('create-group-modal');
            this.loadGroups();
            this.showNotification('Группа создана!');
            this.openChat('group', result.group.id);
        } else {
            errorElement.textContent = result.message;
        }
    }
    
    showNewChatModal() {
        document.getElementById('new-chat-error').textContent = '';
        
        const friends = this.db.getFriends(this.currentUser.id);
        const usersList = document.getElementById('new-chat-users-list');
        usersList.innerHTML = '';
        
        if (friends.length === 0) {
            usersList.innerHTML = '<p>Нет друзей для чата</p>';
        } else {
            friends.forEach(friend => {
                const item = document.createElement('div');
                item.className = 'checkbox-item';
                item.innerHTML = `
                    <input type="radio" id="chat-user-${friend.id}" name="chat-user" value="${friend.id}">
                    <label for="chat-user-${friend.id}">${friend.username}</label>
                `;
                usersList.appendChild(item);
            });
        }
        
        this.openModal('new-chat-modal');
    }
    
    startNewChat() {
        const selectedUser = document.querySelector('input[name="chat-user"]:checked');
        const errorElement = document.getElementById('new-chat-error');
        
        if (!selectedUser) {
            errorElement.textContent = 'Выберите пользователя';
            return;
        }
        
        this.closeModal('new-chat-modal');
        this.openChat('private', selectedUser.value);
    }
    
    loadFriends() {
        const friends = this.db.getFriends(this.currentUser.id);
        const container = document.getElementById('friends-container');
        
        if (friends.length === 0) {
            container.innerHTML = '<div class="contact-item"><p>Нет друзей</p></div>';
            return;
        }
        
        container.innerHTML = '';
        friends.forEach(friend => {
            const friendElement = document.createElement('div');
            friendElement.className = 'contact-item';
            friendElement.dataset.userId = friend.id;
            friendElement.innerHTML = `
                <div class="avatar small">
                    <i class="fas fa-user"></i>
                </div>
                <div class="contact-info">
                    <h4>${friend.username}</h4>
                </div>
            `;
            
            friendElement.addEventListener('click', () => {
                this.openChat('private', friend.id);
            });
            
            container.appendChild(friendElement);
        });
    }
    
    loadGroups() {
        const groups = this.db.getUserGroups(this.currentUser.id);
        const container = document.getElementById('groups-container');
        
        if (groups.length === 0) {
            container.innerHTML = '<div class="contact-item"><p>Нет групп</p></div>';
            return;
        }
        
        container.innerHTML = '';
        groups.forEach(group => {
            const groupElement = document.createElement('div');
            groupElement.className = 'contact-item';
            groupElement.dataset.groupId = group.id;
            groupElement.innerHTML = `
                <div class="avatar small">
                    <i class="fas fa-users"></i>
                </div>
                <div class="contact-info">
                    <h4>${group.name}</h4>
                    <p>${group.members.length} участников</p>
                </div>
            `;
            
            groupElement.addEventListener('click', () => {
                this.openChat('group', group.id);
            });
            
            container.appendChild(groupElement);
        });
    }
    
    loadChats() {
        const friends = this.db.getFriends(this.currentUser.id);
        const groups = this.db.getUserGroups(this.currentUser.id);
        const container = document.getElementById('chats-container');
        
        if (friends.length === 0 && groups.length === 0) {
            container.innerHTML = '<div class="contact-item"><p>Нет чатов</p></div>';
            return;
        }
        
        container.innerHTML = '';
        
        friends.forEach(friend => {
            const messages = this.db.getPrivateMessages(this.currentUser.id, friend.id);
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            
            const chatElement = document.createElement('div');
            chatElement.className = 'contact-item';
            chatElement.dataset.userId = friend.id;
            chatElement.dataset.chatType = 'private';
            chatElement.innerHTML = `
                <div class="avatar small">
                    <i class="fas fa-user"></i>
                </div>
                <div class="contact-info">
                    <h4>${friend.username}</h4>
                    <p>${lastMessage ? (lastMessage.senderId === this.currentUser.id ? 'Вы: ' : '') + this.truncateText(lastMessage.text, 20) : 'Нет сообщений'}</p>
                </div>
                <div class="contact-meta">
                    ${lastMessage ? this.formatTime(lastMessage.timestamp) : ''}
                </div>
            `;
            
            chatElement.addEventListener('click', () => {
                this.openChat('private', friend.id);
            });
            
            container.appendChild(chatElement);
        });
        
        groups.forEach(group => {
            const messages = this.db.getGroupMessages(group.id);
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            const lastSender = lastMessage ? this.db.getUserById(lastMessage.senderId) : null;
            
            const chatElement = document.createElement('div');
            chatElement.className = 'contact-item';
            chatElement.dataset.groupId = group.id;
            chatElement.dataset.chatType = 'group';
            chatElement.innerHTML = `
                <div class="avatar small">
                    <i class="fas fa-users"></i>
                </div>
                <div class="contact-info">
                    <h4>${group.name}</h4>
                    <p>${lastMessage ? (lastSender ? lastSender.username + ': ' : '') + this.truncateText(lastMessage.text, 20) : 'Нет сообщений'}</p>
                </div>
                <div class="contact-meta">
                    ${lastMessage ? this.formatTime(lastMessage.timestamp) : ''}
                </div>
            `;
            
            chatElement.addEventListener('click', () => {
                this.openChat('group', group.id);
            });
            
            container.appendChild(chatElement);
        });
    }
    
    openChat(type, id) {
        this.currentChat = { type, id };
        
        document.getElementById('chat-placeholder').classList.add('hidden');
        document.getElementById('chat-header').classList.remove('hidden');
        document.getElementById('messages-container').classList.remove('hidden');
        document.getElementById('message-input-container').classList.remove('hidden');
        
        if (type === 'private') {
            const user = this.db.getUserById(id);
            if (user) {
                document.getElementById('chat-title').textContent = user.username;
                document.getElementById('chat-subtitle').textContent = 'В сети';
                document.getElementById('chat-avatar-icon').className = 'fas fa-user';
            }
        } else if (type === 'group') {
            const group = this.db.getGroupById(id);
            if (group) {
                document.getElementById('chat-title').textContent = group.name;
                document.getElementById('chat-subtitle').textContent = `${group.members.length} участников`;
                document.getElementById('chat-avatar-icon').className = 'fas fa-users';
            }
        }
        
        this.loadMessages();
        this.highlightActiveChat();
        
        setTimeout(() => {
            document.getElementById('message-input').focus();
        }, 100);
    }
    
    loadMessages() {
        if (!this.currentChat) return;
        
        const container = document.getElementById('messages-container');
        container.innerHTML = '';
        
        let messages = [];
        
        if (this.currentChat.type === 'private') {
            messages = this.db.getPrivateMessages(this.currentUser.id, this.currentChat.id);
        } else if (this.currentChat.type === 'group') {
            messages = this.db.getGroupMessages(this.currentChat.id);
        }
        
        if (messages.length === 0) {
            container.innerHTML = '<div class="no-messages"><p>Нет сообщений</p></div>';
            return;
        }
        
        messages.forEach(message => {
            const isSent = message.senderId === this.currentUser.id;
            const sender = this.db.getUserById(message.senderId);
            const messageElement = document.createElement('div');
            messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
            
            let senderName = '';
            if (!isSent && this.currentChat.type === 'group' && sender) {
                senderName = `<div class="sender-name">${sender.username}</div>`;
            }
            
            messageElement.innerHTML = `
                ${senderName}
                <div class="message-bubble">${this.escapeHtml(message.text)}</div>
                <div class="message-info">${this.formatTime(message.timestamp)}</div>
            `;
            
            container.appendChild(messageElement);
        });
        
        container.scrollTop = container.scrollHeight;
    }
    
    sendMessage() {
        if (!this.currentChat) {
            this.showNotification('Выберите чат');
            return;
        }
        
        const input = document.getElementById('message-input');
        const text = input.value.trim();
        
        if (!text) return;
        
        if (this.currentChat.type === 'private') {
            this.db.addMessage(this.currentUser.id, this.currentChat.id, null, text);
        } else if (this.currentChat.type === 'group') {
            this.db.addMessage(this.currentUser.id, null, this.currentChat.id, text);
        }
        
        input.value = '';
        this.loadMessages();
        this.loadChats();
    }
    
    highlightActiveChat() {
        document.querySelectorAll('.contact-item').forEach(item => {
            item.classList.remove('active');
        });
        
        if (this.currentChat.type === 'private') {
            const chatElement = document.querySelector(`.contact-item[data-user-id="${this.currentChat.id}"]`);
            if (chatElement) chatElement.classList.add('active');
        } else if (this.currentChat.type === 'group') {
            const chatElement = document.querySelector(`.contact-item[data-group-id="${this.currentChat.id}"]`);
            if (chatElement) chatElement.classList.add('active');
        }
    }
    
    openModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }
    
    showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'только что';
        if (diffMins < 60) return `${diffMins} мин назад`;
        
        const diffHours = Math.floor(diffMs / 3600000);
        if (diffHours < 24) return `${diffHours} ч назад`;
        
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffDays === 1) return 'вчера';
        if (diffDays < 7) return `${diffDays} дн назад`;
        
        return date.toLocaleDateString();
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MessengerApp();
});

// Функции для консоли
window.exportData = function() {
    const db = new SimpleDB();
    const data = db.exportData();
    console.log('Данные для экспорта:');
    console.log(data);
    alert('Данные скопированы в консоль (F12)');
    return data;
};

window.importData = function(jsonString) {
    const db = new SimpleDB();
    const result = db.importData(jsonString);
    alert(result.message);
    location.reload();
};
